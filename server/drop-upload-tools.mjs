// Removes upload-tool dependencies (micronucleus) from ATTinyCore's board index, so installing the
// core only needs the compiler toolchain. The compilers never upload, and the tool's host
// (azduino.com) is not always reachable.
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const data = execFileSync("arduino-cli", ["config", "get", "directories.data"], { encoding: "utf8" }).trim();
const file = join(data, "package_drazzy.com_index.json");
const index = JSON.parse(readFileSync(file, "utf8"));
for (const pkg of index.packages ?? []) {
  for (const platform of pkg.platforms ?? []) {
    platform.toolsDependencies = (platform.toolsDependencies ?? []).filter((t) => t.name !== "micronucleus");
  }
}
writeFileSync(file, JSON.stringify(index));
console.log("ATTinyCore index: upload tools removed");
