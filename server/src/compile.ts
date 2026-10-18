/**
 * Arduino sketch compilation with arduino-cli: input validation, a per-job temp
 * directory, a timeout, and GCC diagnostics parsed into structured form.
 */
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/** Protobench's own MIT-licensed libraries (used in place of libraries whose licenses don't allow redistribution). */
const OWN_LIBRARIES = process.env.LIBRARIES_DIR ?? join(dirname(fileURLToPath(import.meta.url)), "..", "libraries");

export const BOARDS = {
  uno: { fqbn: "arduino:avr:uno", name: "Arduino UNO" },
  nano: { fqbn: "arduino:avr:nano:cpu=atmega328", name: "Arduino Nano" },
  atmega328p: { fqbn: "arduino:avr:uno", name: "ATmega328P (16 MHz)" },
} as const;
export type BoardId = keyof typeof BOARDS;

export interface CompileRequest {
  board: BoardId;
  /** File name → contents. Exactly one .ino file is required. */
  files: Record<string, string>;
}

export interface Diagnostic {
  file: string;
  line: number;
  column: number;
  severity: "error" | "warning" | "note";
  message: string;
}

export interface CompileResult {
  ok: boolean;
  hex?: string;
  /** Bytes of flash and RAM used, as reported by avr-size. */
  size?: { flash: number; flashMax: number; ram: number; ramMax: number };
  diagnostics: Diagnostic[];
  /** Raw compiler output (trimmed), for the console. */
  log: string;
  cached?: boolean;
  ms?: number;
}

export class RequestError extends Error {}

const MAX_FILES = 16;
const MAX_BYTES = 256 * 1024;
const NAME_RE = /^[A-Za-z0-9_][A-Za-z0-9_.-]{0,63}\.(ino|h|hpp|c|cpp)$/;
// directives that could read files outside the sketch (absolute paths, parent dirs, raw binary includes)
const ESCAPE_RE = /#\s*include\s*[<"]\s*(\/|\\|[A-Za-z]:|[^>"]*\.\.)|\.incbin|#\s*embed|__has_include\s*\(\s*[<"]\s*(\/|[^>"]*\.\.)/;

export function validate(req: unknown): CompileRequest {
  if (!req || typeof req !== "object") throw new RequestError("Expected a JSON object.");
  const { board, files } = req as Record<string, unknown>;
  if (typeof board !== "string" || !(board in BOARDS)) throw new RequestError(`Unknown board. Use one of: ${Object.keys(BOARDS).join(", ")}.`);
  if (!files || typeof files !== "object") throw new RequestError("Missing files.");
  const entries = Object.entries(files as Record<string, unknown>);
  if (!entries.length || entries.length > MAX_FILES) throw new RequestError(`Send between 1 and ${MAX_FILES} files.`);
  let total = 0;
  let inos = 0;
  for (const [name, body] of entries) {
    if (!NAME_RE.test(name)) throw new RequestError(`Invalid file name "${name}".`);
    if (typeof body !== "string") throw new RequestError(`File "${name}" must be text.`);
    total += body.length;
    if (name.endsWith(".ino")) inos++;
    if (ESCAPE_RE.test(body)) throw new RequestError(`"${name}" includes a file outside the sketch, which isn't allowed.`);
  }
  if (inos !== 1) throw new RequestError("Exactly one .ino file is required.");
  if (total > MAX_BYTES) throw new RequestError("Sketch is too large.");
  return { board: board as BoardId, files: files as Record<string, string> };
}

export function cacheKey(req: CompileRequest): string {
  const h = createHash("sha256").update(req.board);
  for (const name of Object.keys(req.files).sort()) h.update("\0" + name + "\0" + req.files[name]);
  return h.digest("hex");
}

const DIAG_RE = /^(.*?):(\d+):(?:(\d+):)?\s+(fatal error|error|warning|note):\s+(.*)$/;

/** Parses GCC-style diagnostics, mapping temp paths back to the user's file names. */
export function parseDiagnostics(log: string, sketchDir: string): Diagnostic[] {
  const out: Diagnostic[] = [];
  for (const line of log.split("\n")) {
    const m = DIAG_RE.exec(line.trim());
    if (!m) continue;
    const path = m[1];
    if (!path.includes(sketchDir)) continue; // skip diagnostics inside libraries and the core
    const file = path.split(/[\\/]/).pop()!;
    out.push({ file, line: Number(m[2]), column: Number(m[3] ?? 1), severity: m[4] === "warning" ? "warning" : m[4] === "note" ? "note" : "error", message: m[5] });
  }
  return out;
}

function run(cmd: string, args: string[], timeoutMs: number): Promise<{ code: number; out: string }> {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { stdio: ["ignore", "pipe", "pipe"], env: { ...process.env, ARDUINO_UPDATER_ENABLE_NOTIFICATION: "false" } });
    let out = "";
    const add = (b: Buffer) => {
      if (out.length < 200_000) out += b.toString();
    };
    child.stdout.on("data", add);
    child.stderr.on("data", add);
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      out += "\nCompilation timed out.";
    }, timeoutMs);
    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({ code: code ?? 1, out });
    });
    child.on("error", (e) => {
      clearTimeout(timer);
      resolve({ code: 1, out: String(e) });
    });
  });
}

const SIZE_RE = /Sketch uses (\d+) bytes .*Maximum is (\d+) bytes[\s\S]*?Global variables use (\d+) bytes[\s\S]*?Maximum is (\d+) bytes/;

export async function compile(req: CompileRequest, opts: { cli?: string; timeoutMs?: number } = {}): Promise<CompileResult> {
  const started = Date.now();
  const root = await mkdtemp(join(tmpdir(), "pb-compile-"));
  // arduino-cli requires the sketch folder name to match the .ino name
  const ino = Object.keys(req.files).find((n) => n.endsWith(".ino"))!;
  const sketchDir = join(root, ino.slice(0, -4));
  const outDir = join(root, "out");
  try {
    await mkdir(sketchDir);
    for (const [name, body] of Object.entries(req.files)) await writeFile(join(sketchDir, name), body);
    const { code, out } = await run(opts.cli ?? "arduino-cli", ["compile", "--no-color", "-b", BOARDS[req.board].fqbn, "--libraries", OWN_LIBRARIES, "--output-dir", outDir, "--warnings", "default", sketchDir], opts.timeoutMs ?? 45_000);
    const log = out.split(root).join("").trim();
    const diagnostics = parseDiagnostics(out, sketchDir);
    if (code !== 0) return { ok: false, diagnostics, log, ms: Date.now() - started };
    const hex = await readFile(join(outDir, `${ino}.hex`), "utf8");
    const m = SIZE_RE.exec(out);
    const size = m ? { flash: +m[1], flashMax: +m[2], ram: +m[3], ramMax: +m[4] } : undefined;
    return { ok: true, hex, size, diagnostics, log, ms: Date.now() - started };
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}
