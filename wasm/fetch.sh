#!/bin/sh
# Downloads the GPL/LGPL sources we build (and later publish alongside each release).
set -e
HERE="$(cd "$(dirname "$0")" && pwd)"
. "$HERE/versions.sh"
SRC="${SRC:-$HERE/build/src}"
mkdir -p "$SRC" && cd "$SRC"
get() { [ -f "$2" ] || curl -fsSL --retry 3 -o "$2" "$1"; }
get "https://ftp.gnu.org/gnu/binutils/binutils-$BINUTILS_VERSION.tar.xz" "binutils-$BINUTILS_VERSION.tar.xz"
get "https://ftp.gnu.org/gnu/gcc/gcc-$GCC_VERSION/gcc-$GCC_VERSION.tar.xz" "gcc-$GCC_VERSION.tar.xz"
get "https://gcc.gnu.org/pub/gcc/infrastructure/gmp-$GMP_VERSION.tar.bz2" "gmp-$GMP_VERSION.tar.bz2"
get "https://gcc.gnu.org/pub/gcc/infrastructure/mpfr-$MPFR_VERSION.tar.bz2" "mpfr-$MPFR_VERSION.tar.bz2"
get "https://gcc.gnu.org/pub/gcc/infrastructure/mpc-$MPC_VERSION.tar.gz" "mpc-$MPC_VERSION.tar.gz"
# verify every tarball against the pinned checksums
printf "%s" "$SHA256_SUMS" | grep . > SHA256SUMS
if command -v sha256sum >/dev/null; then sha256sum -c SHA256SUMS; else shasum -a 256 -c SHA256SUMS; fi
for f in *.tar.*; do d="${f%.tar.*}"; [ -d "$d" ] || tar xf "$f"; done
# GCC builds GMP/MPFR/MPC in-tree when they sit inside its source directory
cd "gcc-$GCC_VERSION"
for p in gmp mpfr mpc; do
  v=$(eval echo \$$(echo $p | tr a-z A-Z)_VERSION)
  [ -e "$p" ] || ln -s "../$p-$v" "$p"
done
echo "sources ready in $SRC"
