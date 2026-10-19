#!/bin/sh
# Builds the sysroot the in-browser compiler links against, from the official toolchain
# installed by arduino-cli (arduino:avr and ATTinyCore:avr, plus the bundled libraries):
#
#   include/avr-libc, include/gcc, include/gcc-fixed   system headers
#   include/cores/<core>/, include/variants/<variant>/  Arduino core + pin variant headers
#   include/libs/<platform>/<Library>/                  library headers per platform
#   lib/<arch>/                                         libgcc, libc, libm, device lib, crt, ldscripts
#   prebuilt/<variant>/                                 core.a + lib<Library>.a, compiled WITHOUT LTO
#
# Packed as $OUT/sysroot-avr.tar.gz. Run build-tools.sh first (it writes $OUT/ldscripts).
set -e
HERE="$(cd "$(dirname "$0")" && pwd)"
OUT="${OUT:-$HERE/build/dist}"
WORK="${WORK:-$HERE/build/sysroot-work}"
ROOT="$WORK/sysroot"
DATA="$(arduino-cli config get directories.data)"
USER_DIR="$(arduino-cli config get directories.user)"
ARDUINO_HW="$DATA/packages/arduino/hardware/avr/$(arduino-cli core list | awk '$1=="arduino:avr"{print $2}')"
TINY_HW="$DATA/packages/ATTinyCore/hardware/avr/$(arduino-cli core list | awk '$1=="ATTinyCore:avr"{print $2}')"
TC="$(ls -d "$DATA"/packages/arduino/tools/avr-gcc/7.3.0-* | head -1)"
[ -d "$OUT/ldscripts" ] || { echo "run build-tools.sh first (needs $OUT/ldscripts)"; exit 1; }
rm -rf "$WORK" && mkdir -p "$ROOT/include" "$OUT"

# --- system headers -------------------------------------------------------------------
cp -R "$TC/avr/include" "$ROOT/include/avr-libc"
# avr-libc ships an io header for every AVR ever made; keep the ones our chips use
find "$ROOT/include/avr-libc/avr" -name 'io*.h' ! -name io.h ! -name iom328p.h ! -name iotn85.h ! -name iotnx5.h -delete
cp -R "$TC/lib/gcc/avr/7.3.0/include" "$ROOT/include/gcc"
cp -R "$TC/lib/gcc/avr/7.3.0/include-fixed" "$ROOT/include/gcc-fixed"

# --- device libraries per architecture --------------------------------------------------
for spec in "avr5 atmega328p" "avr25 attiny85"; do
  set -- $spec
  arch=$1; dev=$2
  mkdir -p "$ROOT/lib/$arch/ldscripts"
  cp "$TC/lib/gcc/avr/7.3.0/$arch/libgcc.a" "$ROOT/lib/$arch/"
  for f in libc.a libm.a "lib$dev.a" "crt$dev.o"; do cp "$TC/avr/lib/$arch/$f" "$ROOT/lib/$arch/"; done
  cp "$OUT"/ldscripts/"$arch".* "$ROOT/lib/$arch/ldscripts/"
done

# --- cores, variants and library headers -----------------------------------------------
copy_headers() { # src-dir dest-dir
  mkdir -p "$2"
  (cd "$1" && find . -name '*.h' -not -path '*/examples/*' -not -path '*/extras/*' -not -path '*/sam/*' -not -path '*/samd/*' -not -path '*/stm32*' -not -path '*/esp*' -not -path '*/mbed*' -not -path '*/nrf52/*' -not -path '*/megaavr/*' -not -path '*/renesas*' | while read -r h; do mkdir -p "$2/$(dirname "$h")" && cp "$h" "$2/$h"; done)
}
copy_headers "$ARDUINO_HW/cores/arduino" "$ROOT/include/cores/arduino"
copy_headers "$TINY_HW/cores/tiny" "$ROOT/include/cores/tiny"
for v in standard eightanaloginputs; do copy_headers "$ARDUINO_HW/variants/$v" "$ROOT/include/variants/$v"; done
copy_headers "$TINY_HW/variants/tinyX5" "$ROOT/include/variants/tinyX5"
lib_headers() { # platform-key platform-library-dir
  for libroot in "$USER_DIR/libraries" "$2" "$HERE/../server/libraries"; do
    for lib in "$libroot"/*/; do
      name="$(basename "$lib")"; src="$lib/src"; [ -d "$src" ] || src="$lib"
      rm -rf "$ROOT/include/libs/$1/$name"   # later roots (platform, ours) take precedence
      copy_headers "$src" "$ROOT/include/libs/$1/$name"
    done
  done
}
lib_headers arduino-avr "$ARDUINO_HW/libraries"
lib_headers attinycore "$TINY_HW/libraries"

# --- core + libraries compiled without LTO, per variant -----------------------------------
NOLTO_C='-c -g -Os {compiler.warning_flags} -std=gnu11 -ffunction-sections -fdata-sections -MMD'
NOLTO_CPP='-c -g -Os {compiler.warning_flags} -std=gnu++11 -fpermissive -fno-exceptions -ffunction-sections -fdata-sections -fno-threadsafe-statics -Wno-error=narrowing -MMD'
HEADERS="Wire.h SPI.h EEPROM.h SoftwareSerial.h Servo.h LiquidCrystal.h Stepper.h LiquidCrystal_I2C.h Adafruit_GFX.h Adafruit_SSD1306.h TM1637Display.h LedControl.h DHT.h Adafruit_NeoPixel.h OneWire.h DallasTemperature.h NewPing.h Adafruit_MPU6050.h Adafruit_BMP280.h RTClib.h"
build_variant() { # variant fqbn
  variant=$1; fqbn=$2; dest="$ROOT/prebuilt/$variant"; mkdir -p "$dest"
  for h in core $HEADERS; do
    key="$variant-$(echo "${h%.h}" | tr -c 'A-Za-z0-9\n' '_')"
    sk="$WORK/sk/$key"; mkdir -p "$sk"
    if [ "$h" = core ]; then printf 'void setup(){}\nvoid loop(){}\n' > "$sk/$key.ino"; else printf "#include <$h>\nvoid setup(){}\nvoid loop(){}\n" > "$sk/$key.ino"; fi
    bp="$WORK/bp/$key"
    if arduino-cli compile -b "$fqbn" --libraries "$HERE/../server/libraries" --build-path "$bp" \
        --build-property "compiler.c.flags=$NOLTO_C" --build-property "compiler.cpp.flags=$NOLTO_CPP" \
        --build-property "compiler.c.elf.flags={compiler.warning_flags} -Os -g -Wl,--gc-sections" \
        --build-property "compiler.S.flags=-c -g -x assembler-with-cpp -MMD" "$sk" >/dev/null 2>&1; then
      [ -f "$dest/core.a" ] || cp "$bp/core/core.a" "$dest/core.a"
      for libdir in "$bp"/libraries/*/; do
        [ -d "$libdir" ] || continue
        lname="$(basename "$libdir")"; objs="$(find "$libdir" -name '*.o')"
        [ -n "$objs" ] && [ ! -f "$dest/lib$lname.a" ] && "$TC/bin/avr-ar" rcs "$dest/lib$lname.a" $objs
      done
    else
      echo "  $variant: skipping $h (not supported on this board)"
    fi
  done
}
build_variant standard arduino:avr:uno
build_variant eightanaloginputs arduino:avr:nano:cpu=atmega328
build_variant tinyX5 "ATTinyCore:avr:attinyx5:chip=85,clock=8internal"

cat > "$ROOT/VERSION.json" <<EOF
{ "cores": ["arduino:avr@$(basename "$ARDUINO_HW")", "ATTinyCore:avr@$(basename "$TINY_HW")"], "toolchain": "$(basename "$TC")", "built": "$(date -u +%Y-%m-%dT%H:%M:%SZ)" }
EOF
(cd "$ROOT" && COPYFILE_DISABLE=1 tar czf "$OUT/sysroot-avr.tar.gz" .)
ls -la "$OUT/sysroot-avr.tar.gz"
ls "$ROOT/prebuilt"/*
