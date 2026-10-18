# Protobench Toolchain

Open-source build infrastructure behind the Protobench breadboard simulator's
Arduino support:

| Folder | What it is |
|---|---|
| [`server/`](server) | The compile server: a small Node service around `arduino-cli` that turns sketches into firmware. Deployed to a Hugging Face Space as the backup for the in-browser compiler. |
| `wasm/` *(in progress)* | Build scripts that compile avr-gcc and GNU binutils to WebAssembly so sketches compile entirely in the browser. |

## Licenses

Protobench's own code in this repository (the compile server, build scripts, and the
`LiquidCrystal_I2C` and `NewPing` reimplementations) is released under the MIT License.

Third-party components keep their own licenses. GCC and binutils are GPL-3.0; compiled sketches
are not covered by it, thanks to the GCC Runtime Library Exception. avr-libc is BSD-licensed. The
Arduino core and several libraries are LGPL. See [`server/LICENSES.md`](server/LICENSES.md) for the
complete list. Corresponding source for every GPL/LGPL component we distribute is published here or
linked from the build scripts, with exact versions.

## Deploying the compile server

The `deploy-space` workflow uploads `server/` to the Hugging Face Space named in the repository
variable `HF_SPACE` (for example `your-name/protobench-compile`), using the `HF_TOKEN` secret.
