/**
 * Protobench compile server: POST /compile { board, files } → { ok, hex, diagnostics, … }.
 * The backup for the in-browser compiler; also used during local development.
 *
 * Env: PORT (default 7860), ALLOWED_ORIGINS (comma list,
 * default "*"), MAX_CONCURRENT (default 2), ARDUINO_CLI (path to arduino-cli).
 */
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { BOARDS, RequestError, cacheKey, compile, validate, type CompileResult } from "./compile.ts";

const PORT = Number(process.env.PORT ?? 7860);
const ORIGINS = (process.env.ALLOWED_ORIGINS ?? "*").split(",").map((s) => s.trim());
const MAX_CONCURRENT = Number(process.env.MAX_CONCURRENT ?? 2);
const MAX_QUEUE = 20;
const CACHE_SIZE = 500;

const cache = new Map<string, CompileResult>();
let active = 0;
const queue: (() => void)[] = [];

async function withSlot<T>(fn: () => Promise<T>): Promise<T> {
  if (active >= MAX_CONCURRENT) {
    if (queue.length >= MAX_QUEUE) throw new RequestError("The compile server is busy. Try again in a moment.");
    await new Promise<void>((r) => queue.push(r));
  }
  active++;
  try {
    return await fn();
  } finally {
    active--;
    queue.shift()?.();
  }
}

function cors(req: IncomingMessage, res: ServerResponse) {
  const origin = req.headers.origin ?? "";
  if (ORIGINS.includes("*")) res.setHeader("Access-Control-Allow-Origin", "*");
  else if (ORIGINS.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "content-type");
  res.setHeader("Access-Control-Max-Age", "86400");
}

function send(res: ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify(body));
}

async function readBody(req: IncomingMessage, limit = 400 * 1024): Promise<string> {
  let size = 0;
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > limit) throw new RequestError("Request too large.");
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString("utf8");
}

const server = createServer(async (req, res) => {
  cors(req, res);
  if (req.method === "OPTIONS") return void res.writeHead(204).end();
  const url = new URL(req.url ?? "/", "http://x");
  try {
    if (req.method === "GET" && (url.pathname === "/" || url.pathname === "/health")) {
      return send(res, 200, { ok: true, service: "protobench-compile", boards: Object.keys(BOARDS), active, queued: queue.length });
    }
    if (req.method === "POST" && url.pathname === "/compile") {
      let parsed: unknown;
      try {
        parsed = JSON.parse(await readBody(req));
      } catch (e) {
        throw e instanceof RequestError ? e : new RequestError("Body must be JSON.");
      }
      const job = validate(parsed);
      const key = cacheKey(job);
      const hit = cache.get(key);
      if (hit) {
        cache.delete(key);
        cache.set(key, hit); // refresh LRU position
        return send(res, 200, { ...hit, cached: true });
      }
      const result = await withSlot(() => compile(job, { cli: process.env.ARDUINO_CLI }));
      cache.set(key, result);
      if (cache.size > CACHE_SIZE) cache.delete(cache.keys().next().value!);
      return send(res, 200, result);
    }
    send(res, 404, { error: "Not found" });
  } catch (e) {
    if (e instanceof RequestError) send(res, 400, { error: e.message });
    else {
      console.error(e);
      send(res, 500, { error: "Internal error" });
    }
  }
});

server.on("error", (e: NodeJS.ErrnoException) => {
  if (e.code === "EADDRINUSE") {
    console.error(`Port ${PORT} is already in use — another compile server is probably running. Stop it, or set PORT to use a different one.`);
    process.exit(1);
  }
  throw e;
});
server.listen(PORT, () => console.log(`protobench-compile listening on :${PORT}`));
