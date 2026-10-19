#!/bin/sh
# Builds the Protobench micro:bit V2 firmware: MicroPython for micro:bit (micro:bit
# Foundation, MIT) compiled to WebAssembly, with Protobench's hardware layer from port/.
#
#   OUT=dist sh microbit/build.sh      (needs emsdk activated: emcc on PATH)
#
# Writes $OUT/microbit-<version>.mjs, .wasm and microbit-<version>-source.tar.gz.
set -e
HERE="$(cd "$(dirname "$0")" && pwd)"
. "$HERE/versions.sh"
OUT="${OUT:-$HERE/build/dist}"
WORK="${WORK:-$HERE/build/work}"
mkdir -p "$OUT" "$WORK"
command -v emcc >/dev/null || { echo "emcc not found: activate emsdk first"; exit 1; }

SIM="$WORK/sim"
if [ ! -d "$SIM/.git" ]; then
  git clone -q "$SIM_REPO" "$SIM"
fi
git -C "$SIM" checkout -q --detach "$SIM_COMMIT"
git -C "$SIM" submodule update -q --init lib/micropython-microbit-v2
git -C "$SIM/lib/micropython-microbit-v2" submodule update -q --init lib/micropython
[ "$(git -C "$SIM/lib/micropython-microbit-v2" rev-parse HEAD)" = "$MBIT_COMMIT" ] || { echo "unexpected micropython-microbit-v2 commit"; exit 1; }
[ "$(git -C "$SIM/lib/micropython-microbit-v2/lib/micropython" rev-parse HEAD)" = "$MICROPYTHON_COMMIT" ] || { echo "unexpected micropython commit"; exit 1; }

# Protobench's hardware layer replaces the simulator's
git -C "$SIM" checkout -q -- src
git -C "$SIM" tag -d "$BANNER_VERSION" >/dev/null 2>&1 || true
cp "$HERE"/port/* "$SIM/src/"
# commit the overlay locally so the firmware banner shows our version, not "<hash>-dirty"
git -C "$SIM" add -A src
git -C "$SIM" -c user.name=protobench -c user.email=build@protobench.invalid commit -q -m "Protobench hardware layer" --allow-empty
git -C "$SIM" tag "$BANNER_VERSION"

make -s -C "$SIM/lib/micropython-microbit-v2/lib/micropython/mpy-cross" CFLAGS_EXTRA=-Wno-error >/dev/null
make -C "$SIM/src" -j"$(getconf _NPROCESSORS_ONLN 2>/dev/null || echo 4)" >/dev/null

cp "$SIM/src/build/firmware.mjs" "$OUT/microbit-$FIRMWARE_VERSION.mjs"
cp "$SIM/src/build/firmware.wasm" "$OUT/microbit-$FIRMWARE_VERSION.wasm"
# the firmware module loads its .wasm by its own name
sed -i.bak "s/firmware\.wasm/microbit-$FIRMWARE_VERSION.wasm/g" "$OUT/microbit-$FIRMWARE_VERSION.mjs" && rm "$OUT/microbit-$FIRMWARE_VERSION.mjs.bak"

# complete corresponding source (upstream at the pinned commits + port/), without build output
(cd "$WORK" && COPYFILE_DISABLE=1 tar czf "$OUT/microbit-$FIRMWARE_VERSION-source.tar.gz" \
  --exclude='*/build' --exclude='*/build-*' --exclude='*/node_modules' --exclude='.git' sim)
ls -la "$OUT"/microbit-*
