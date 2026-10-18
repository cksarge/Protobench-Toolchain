# Protobench Toolchain

Open-source build infrastructure behind the Protobench breadboard simulator's
Arduino support:

| Folder | What it is |
|---|---|
| [`server/`](server) | The compile server: a small Node service around `arduino-cli` that turns sketches into firmware. The backup for the in-browser compiler (used on phones and slow devices). |
| [`wasm/`](wasm) | Build scripts that compile GCC 7.3 (`cc1`, `cc1plus`) and GNU binutils 2.42 (`as`, `ld`) to WebAssembly with Emscripten, plus the sysroot (avr-libc, the Arduino core and libraries, precompiled). Sketches then compile entirely in the browser. |

## Licenses

Protobench's own code in this repository (the compile server, build scripts, and the
`LiquidCrystal_I2C` and `NewPing` reimplementations) is released under the MIT License.

Third-party components keep their own licenses. GCC and binutils are GPL-3.0; compiled sketches
are not covered by it, thanks to the GCC Runtime Library Exception. avr-libc is BSD-licensed. The
Arduino core and several libraries are LGPL. See [`server/LICENSES.md`](server/LICENSES.md) for the
complete list. Corresponding source for every GPL/LGPL component we distribute is published here or
linked from the build scripts, with exact versions.


## Building the WebAssembly toolchain

```sh
wasm/fetch.sh          # GNU sources, SHA-256 verified
wasm/patch-sources.sh  # two small, documented build fixes for Emscripten
. ~/emsdk/emsdk_env.sh && wasm/build-tools.sh     # ~5 minutes on a modern machine
wasm/build-sysroot.sh  # needs arduino-cli with arduino:avr and the bundled libraries
```

Releases (tags `avr-*`) are built by the `build-wasm` workflow and include the complete
corresponding source alongside the binaries.
