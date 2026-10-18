# Protobench compile server

Compiles Arduino sketches for the [Protobench](https://github.com/cksarge/Protobench-Toolchain) breadboard simulator.
It is the backup for the in-browser compiler, used on phones and slow devices, and the compiler
during local development.

```
POST /compile   { "board": "uno" | "nano" | "atmega328p", "files": { "sketch.ino": "…" } }
→ { ok, hex, size: { flash, flashMax, ram, ramMax }, diagnostics: [{ file, line, column, severity, message }], log, ms }
GET  /health
```

Run locally (needs arduino-cli with the arduino:avr core): `npm start` (port 7860), or build the
Docker image (`docker build -t protobench-compile .`), which installs everything.
Env: `PORT`, `ALLOWED_ORIGINS` (comma list), `MAX_CONCURRENT`, `ARDUINO_CLI`, `LIBRARIES_DIR`.

Bundled libraries and their licenses: see [LICENSES.md](LICENSES.md).
