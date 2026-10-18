#!/bin/sh
# Small, documented source adjustments needed to build with Emscripten.
set -e
HERE="$(cd "$(dirname "$0")" && pwd)"
. "$HERE/versions.sh"
SRC="${SRC:-$HERE/build/src}"

# GCC_PLUGIN_OPTION (config/gcc-plugin.m4) treats an *empty* answer from
# `$CC --print-file-name liblto_plugin.so` as "plugin found"; emcc prints nothing there,
# which produced a bogus `--plugin` flag for ar. Skip empty answers.
for f in $(grep -rl 'test x$plugin_so != x$plugin; then' "$SRC/binutils-$BINUTILS_VERSION" "$SRC/gcc-$GCC_VERSION" --include=configure 2>/dev/null); do
  sed -i.orig 's/if test x$plugin_so != x$plugin; then/if test -n "$plugin_so" \&\& test x$plugin_so != x$plugin; then/' "$f" && rm -f "$f.orig"
done
# GCC 7.3 (2017) and its in-tree GMP/MPFR/MPC predate the wasm32-*-emscripten triplet:
# give them the current config.sub / config.guess from binutils.
for d in "$SRC/gcc-$GCC_VERSION" "$SRC/gmp-$GMP_VERSION" "$SRC/mpfr-$MPFR_VERSION" "$SRC/mpc-$MPC_VERSION"; do
  for f in $(find "$d" -name config.sub -o -name config.guess); do
    chmod u+w "$f" && cp "$SRC/binutils-$BINUTILS_VERSION/$(basename "$f")" "$f"
  done
done
echo "patched"
