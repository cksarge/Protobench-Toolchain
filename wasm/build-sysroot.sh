#!/bin/sh
# Builds the sysroot the in-browser compiler links against, from the official Arduino
# toolchain installed by arduino-cli (arduino:avr core + the bundled libraries):
#
#   include/            avr-libc, GCC and Arduino core/variant/library headers
#   lib/avr5/           libgcc.a, libc.a, libm.a, libatmega328p.a, crtatmega328p.o
#   prebuilt/<variant>/ core.a and lib<Library>.a compiled without LTO (our wasm ld has no plugin)
#
# Packed as $OUT/sysroot-avr.tar.gz. Requires arduino-cli with arduino:avr and the libraries
# from ../server/Dockerfile, plus ../server/libraries (our MIT libraries).
set -e
HERE="$(cd "$(dirname "$0")" && pwd)"
OUT="${OUT:-$HERE/build/dist}"
WORK="${WORK:-$HERE/build/sysroot-work}"
ROOT="$WORK/sysroot"
DATA="$(arduino-cli config get directories.data)"
USER_DIR="$(arduino-cli config get directories.user)"
CORE_VER="$(arduino-cli core list | awk '$1=="arduino:avr"{print $2}')"
HW="$DATA/packages/arduino/hardware/avr/$CORE_VER"
TC="$(ls -d "$DATA"/packages/arduino/tools/avr-gcc/7.3.0-* | head -1)"
rm -rf "$WORK" && mkdir -p "$ROOT/include" "$ROOT/lib/avr5" "$OUT"

# --- headers -----------------------------------------------------------------------
cp -R "$TC/avr/include" "$ROOT/include/avr-libc"
# avr-libc ships an io header for every AVR ever made; keep the ones our chips use
find "$ROOT/include/avr-libc/avr" -name 'io*.h' ! -name io.h ! -name iom328p.h ! -name iotn85.h ! -name iotnx5.h -delete
cp -R "$TC/lib/gcc/avr/7.3.0/include" "$ROOT/include/gcc"
cp -R "$TC/lib/gcc/avr/7.3.0/include-fixed" "$ROOT/include/gcc-fixed"
mkdir -p "$ROOT/include/core" "$ROOT/include/variants"
cp "$HW"/cores/arduino/*.h "$ROOT/include/core/"
for v in standard eightanaloginputs; do mkdir -p "$ROOT/include/variants/$v" && cp "$HW/variants/$v/"*.h "$ROOT/include/variants/$v/"; done

# --- AVR system libraries (ATmega328P = avr5) ------------------------------------------
cp "$TC/lib/gcc/avr/7.3.0/avr5/libgcc.a" "$ROOT/lib/avr5/"
for f in libc.a libm.a libatmega328p.a crtatmega328p.o; do cp "$TC/avr/lib/avr5/$f" "$ROOT/lib/avr5/"; done
# default linker scripts matching our wasm ld (written by build-tools.sh)
[ -d "$OUT/ldscripts" ] || { echo "run build-tools.sh first (needs $OUT/ldscripts)"; exit 1; }
mkdir -p "$ROOT/lib/avr5/ldscripts" && cp "$OUT"/ldscripts/avr5.* "$ROOT/lib/avr5/ldscripts/"

# --- core + libraries, compiled without LTO, per board variant -------------------------
NOLTO_C='-c -g -Os {compiler.warning_flags} -std=gnu11 -ffunction-sections -fdata-sections -MMD'
NOLTO_CPP='-c -g -Os {compiler.warning_flags} -std=gnu++11 -fpermissive -fno-exceptions -ffunction-sections -fdata-sections -fno-threadsafe-statics -Wno-error=narrowing -MMD'
INCLUDES=""
for h in Wire.h SPI.h EEPROM.h SoftwareSerial.h Servo.h LiquidCrystal.h Stepper.h LiquidCrystal_I2C.h Adafruit_GFX.h Adafruit_SSD1306.h TM1637Display.h LedControl.h DHT.h Adafruit_NeoPixel.h OneWire.h DallasTemperature.h NewPing.h; do INCLUDES="$INCLUDES#include <$h>\n"; done
mkdir -p "$WORK/all" && printf "$INCLUDES\nvoid setup(){}\nvoid loop(){}\n" > "$WORK/all/all.ino"
for pair in "standard arduino:avr:uno" "eightanaloginputs arduino:avr:nano:cpu=atmega328"; do
  set -- $pair
  variant=$1; fqbn=$2
  bp="$WORK/build-$variant"
  arduino-cli compile -b "$fqbn" --libraries "$HERE/../server/libraries" --build-path "$bp" \
    --build-property "compiler.c.flags=$NOLTO_C" --build-property "compiler.cpp.flags=$NOLTO_CPP" \
    --build-property "compiler.c.elf.flags={compiler.warning_flags} -Os -g -Wl,--gc-sections" \
    --build-property "compiler.S.flags=-c -g -x assembler-with-cpp -MMD" "$WORK/all" >/dev/null
  dest="$ROOT/prebuilt/$variant"
  mkdir -p "$dest"
  cp "$bp/core/core.a" "$dest/core.a"
  for libdir in "$bp"/libraries/*/; do
    name="$(basename "$libdir")"
    objs="$(find "$libdir" -name '*.o')"
    [ -n "$objs" ] && "$TC/bin/avr-ar" rcs "$dest/lib$name.a" $objs
  done
done

# library headers (every .h under each library's source tree, flattened per library)
for libroot in "$USER_DIR/libraries" "$HW/libraries" "$HERE/../server/libraries"; do
  for lib in "$libroot"/*/; do
    name="$(basename "$lib")"
    src="$lib/src"; [ -d "$src" ] || src="$lib"
    mkdir -p "$ROOT/include/libraries/$name"
    (cd "$src" && find . -name '*.h' -not -path '*/examples/*' -not -path '*/sam/*' -not -path '*/samd/*' -not -path '*/stm32*' -not -path '*/esp*' -not -path '*/mbed*' -not -path '*/nrf52/*' -not -path '*/megaavr/*' -not -path '*/renesas*' | while read -r h; do mkdir -p "$ROOT/include/libraries/$name/$(dirname "$h")" && cp "$h" "$ROOT/include/libraries/$name/$h"; done)
  done
done

cat > "$ROOT/VERSION.json" <<EOF
{ "core": "arduino:avr@$CORE_VER", "toolchain": "$(basename "$TC")", "built": "$(date -u +%Y-%m-%dT%H:%M:%SZ)" }
EOF
(cd "$ROOT" && COPYFILE_DISABLE=1 tar czf "$OUT/sysroot-avr.tar.gz" .)
ls -la "$OUT/sysroot-avr.tar.gz"
