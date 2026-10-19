# Protobench compile server. Listens on 7860 as an unprivileged user (uid 1000).
FROM node:24-slim

ARG ARDUINO_CLI_VERSION=1.5.1
RUN apt-get update && apt-get install -y --no-install-recommends curl ca-certificates \
 && curl -fsSL https://raw.githubusercontent.com/arduino/arduino-cli/v${ARDUINO_CLI_VERSION}/install.sh | BINDIR=/usr/local/bin sh -s ${ARDUINO_CLI_VERSION} \
 && apt-get purge -y curl && apt-get autoremove -y && rm -rf /var/lib/apt/lists/*

# the node image already has a uid-1000 "node" user, which is what Spaces runs as
USER node
ENV HOME=/home/node ARDUINO_UPDATER_ENABLE_NOTIFICATION=false
WORKDIR /home/node/app

# toolchain + bundled libraries (exact versions; see LICENSES.md)
RUN arduino-cli core update-index --additional-urls http://drazzy.com/package_drazzy.com_index.json \
 && arduino-cli core install arduino:avr@1.8.8 \
 && arduino-cli core install ATTinyCore:avr@1.5.2 --additional-urls http://drazzy.com/package_drazzy.com_index.json \
 && arduino-cli lib install \
    "Servo@1.3.0" "LiquidCrystal@1.0.7" "Stepper@1.1.3" \
    "Adafruit GFX Library@1.12.6" "Adafruit BusIO@1.17.4" "Adafruit SSD1306@2.5.17" "TM1637@1.2.0" "LedControl@1.0.6" \
    "DHT sensor library@1.4.7" "Adafruit Unified Sensor@1.1.15" "Adafruit NeoPixel@1.15.5" "OneWire@2.3.8" "DallasTemperature@4.0.6" \
    "Adafruit MPU6050@2.2.9" "Adafruit BMP280 Library@3.0.0" "RTClib@2.1.4"

COPY --chown=node libraries ./libraries
COPY --chown=node src ./src
COPY --chown=node package.json ./

# warm the core cache so the first real compile is fast
RUN mkdir -p /tmp/warm/warm && printf 'void setup(){}\nvoid loop(){}\n' > /tmp/warm/warm/warm.ino \
 && arduino-cli compile -b arduino:avr:uno --libraries ./libraries /tmp/warm/warm >/dev/null && rm -rf /tmp/warm

ENV PORT=7860 MAX_CONCURRENT=2
EXPOSE 7860
CMD ["node", "src/server.ts"]
