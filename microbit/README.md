# micro:bit V2 firmware

MicroPython for micro:bit (v2.1.1) compiled to WebAssembly for Protobench's simulator.

- Upstream: the micro:bit Educational Foundation's
  [MicroPython simulator](https://github.com/microbit-foundation/micropython-microbit-v2-simulator)
  (MIT), which builds [micropython-microbit-v2](https://github.com/microbit-foundation/micropython-microbit-v2)
  (MIT) with Emscripten. Exact commits are in `versions.sh`.
- `port/` replaces files in the simulator's `src/`:
  - `microbithal_js.c`, `jshal.h`, `jshal.js`: the hardware layer. Every hardware call goes
    to a JavaScript `board` object supplied by the host. Pins, I²C, SPI, UART, NeoPixel output,
    display enable and the audio pin are wired through (upstream stubs them).
  - `mphalport.c`, `delay.c`: time comes from the host and only advances when the program
    yields (every 32 bytecodes, or when it sleeps), so delays sleep in simulated time.
  - `mpconfigport.h`, `Makefile`: no `speech` module (its SAM synthesizer is an unlicensed
    reverse-engineered port), ES-module output for browsers, workers and Node.
- `build.sh` clones the pinned upstream, copies `port/` over it and builds
  `microbit-<version>.mjs` / `.wasm` plus a source tarball of exactly what was built.
