# Bundled toolchain and library licenses

The compile server and the in-browser compiler ship these components. Source for every
component is published in https://github.com/cksarge/Protobench-Toolchain (GPL/LGPL
components unmodified, with their license texts).

| Component | Version | License | Notes |
|---|---|---|---|
| arduino-cli | 1.5.1 | GPL-3.0 | Run as a separate program (server only) |
| avr-gcc / binutils | 7.3.0 / 2.26 (arduino:avr 1.8.8) | GPL-3.0 (+ GCC runtime exception) | Runtime exception: compiled sketches are not GPL |
| avr-libc | 2.0.0 | BSD-3-Clause | |
| Arduino AVR core | 1.8.8 | LGPL-2.1 | Includes Wire, SPI, EEPROM, SoftwareSerial |
| ATTinyCore (Spence Konde) | 1.5.2 | LGPL-2.1 | ATtiny85 core, with its own Wire/SPI/Servo |
| Servo | 1.3.0 | LGPL-2.1 | |
| LiquidCrystal | 1.0.7 | LGPL-2.1 | |
| Stepper | 1.1.3 | LGPL-2.1 | |
| Adafruit GFX Library | 1.12.6 | BSD-2-Clause | |
| Adafruit BusIO | 1.17.4 | MIT | |
| Adafruit SSD1306 | 2.5.17 | BSD | |
| TM1637 (avishorp) | 1.2.0 | LGPL-3.0 | |
| LedControl | 1.0.6 | MIT | |
| DHT sensor library | 1.4.7 | MIT | |
| Adafruit Unified Sensor | 1.1.15 | Apache-2.0 | |
| Adafruit NeoPixel | 1.15.5 | LGPL-3.0 | |
| OneWire | 2.3.8 | MIT-style | |
| DallasTemperature | 4.0.6 | MIT | |
| **LiquidCrystal_I2C** | Protobench 1.0.0 | MIT | Our own implementation. The popular library has no license, so it can't be redistributed |
| **NewPing** | Protobench 1.0.0 | MIT | Our own implementation. NewPing 1.9.x forbids derivative works |
