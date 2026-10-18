#!/bin/sh
# Builds avr binutils (as, ld) and GCC's compilers (cc1, cc1plus) to WebAssembly with
# Emscripten. Requires: emsdk activated (emcc on PATH), a native C/C++ compiler, make.
#
#   wasm/fetch.sh && wasm/patch-sources.sh && wasm/build-tools.sh
#
# Output: $OUT/{as,ld,cc1,cc1plus}.{mjs,wasm} — ES modules for browsers/workers (and Node).
set -e
HERE="$(cd "$(dirname "$0")" && pwd)"
. "$HERE/versions.sh"
SRC="${SRC:-$HERE/build/src}"
BUILD="${BUILD:-$HERE/build}"
OUT="${OUT:-$HERE/build/dist}"
JOBS="${JOBS:-$(getconf _NPROCESSORS_ONLN 2>/dev/null || echo 4)}"
mkdir -p "$BUILD" "$OUT"

# Each tool runs once per Module instance (the GNU tools keep global state), reads and
# writes an in-memory filesystem, and needs a deep stack for C++ parsing.
EM_LDFLAGS="-sMODULARIZE=1 -sEXPORT_ES6=1 -sENVIRONMENT=web,worker,node -sFORCE_FILESYSTEM=1 \
-sEXPORTED_RUNTIME_METHODS=FS,callMain -sINVOKE_RUN=0 -sEXIT_RUNTIME=1 \
-sALLOW_MEMORY_GROWTH=1 -sINITIAL_MEMORY=64MB -sSTACK_SIZE=8MB"

# libiberty would define psignal() with a signature that clashes with Emscripten's libc
export ac_cv_func_psignal=yes

# --- binutils: as + ld -------------------------------------------------------
mkdir -p "$BUILD/binutils" && cd "$BUILD/binutils"
[ -f Makefile ] || emconfigure "$SRC/binutils-$BINUTILS_VERSION/configure" \
  --target=avr --host=wasm32-unknown-emscripten --build="$("$SRC/binutils-$BINUTILS_VERSION/config.guess")" \
  --disable-nls --disable-werror --disable-gdb --disable-gdbserver --disable-sim --disable-readline \
  --disable-gprof --disable-gprofng --disable-plugins --disable-shared --enable-static \
  --without-zstd --without-debuginfod --disable-libctf \
  MAKEINFO=true CFLAGS="-O2" LDFLAGS="$EM_LDFLAGS"
emmake make -j"$JOBS" all-gas all-ld MAKEINFO=true
cp gas/as-new "$OUT/as.mjs" && cp gas/as-new.wasm "$OUT/as.wasm"
cp ld/ld-new "$OUT/ld.mjs" && cp ld/ld-new.wasm "$OUT/ld.wasm"
# this ld reads its default linker scripts from the library search path (ldscripts/avrN.x*)
rm -rf "$OUT/ldscripts" && mkdir -p "$OUT/ldscripts" && cp ld/ldscripts/avr5.* ld/ldscripts/avr25.* "$OUT/ldscripts/"

# --- GCC: cc1 + cc1plus (Canadian cross: build=native, host=wasm32, target=avr) -----
mkdir -p "$BUILD/gcc" && cd "$BUILD/gcc"
export CC_FOR_BUILD="${CC_FOR_BUILD:-cc}" CXX_FOR_BUILD="${CXX_FOR_BUILD:-c++} -std=gnu++98"
export CFLAGS_FOR_BUILD="-O1" CXXFLAGS_FOR_BUILD="-O1 -std=gnu++98 -Wno-register"
[ -f Makefile ] || emconfigure "$SRC/gcc-$GCC_VERSION/configure" \
  --target=avr --host=wasm32-unknown-emscripten --build="$("$SRC/gcc-$GCC_VERSION/config.guess")" \
  --enable-languages=c,c++ --disable-nls --disable-libssp --disable-lto --disable-plugin \
  --disable-shared --enable-static --disable-bootstrap --disable-libcc1 --without-isl \
  --with-gnu-as --with-gnu-ld --with-avrlibc=yes --disable-multilib \
  MAKEINFO=true CFLAGS="-O2" CXXFLAGS="-O2 -std=gnu++98 -Wno-register" LDFLAGS="$EM_LDFLAGS"
# all-gcc also tries to link gcov-tool (needs ftw(), not in Emscripten); we only want the compilers
emmake make -j"$JOBS" all-gcc MAKEINFO=true || true
emmake make -C gcc -j"$JOBS" cc1 cc1plus MAKEINFO=true
cp gcc/cc1 "$OUT/cc1.mjs" && cp gcc/cc1.wasm "$OUT/cc1.wasm"
cp gcc/cc1plus "$OUT/cc1plus.mjs" && cp gcc/cc1plus.wasm "$OUT/cc1plus.wasm"
ls -la "$OUT"
