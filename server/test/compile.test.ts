import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { RequestError, cacheKey, compile, parseDiagnostics, validate } from "../src/compile.ts";

const hasCli = (() => {
  try {
    execFileSync("arduino-cli", ["version"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
})();

describe("validate", () => {
  const ok = { board: "uno", files: { "sketch.ino": "void setup(){} void loop(){}" } };
  it("accepts a plain sketch", () => expect(validate(ok).board).toBe("uno"));
  it("rejects unknown boards and bad names", () => {
    expect(() => validate({ ...ok, board: "pdp11" })).toThrow(RequestError);
    expect(() => validate({ board: "uno", files: { "../x.ino": "" } })).toThrow(RequestError);
    expect(() => validate({ board: "uno", files: { "a.h": "" } })).toThrow(/\.ino/);
  });
  it("blocks includes that escape the sketch", () => {
    for (const evil of ['#include "/etc/passwd"', "#include <../../secret.h>", '  #  include "C:\\\\x.h"', 'asm(".incbin \\"/etc/hosts\\"");']) {
      expect(() => validate({ board: "uno", files: { "s.ino": evil } }), evil).toThrow(/outside the sketch/);
    }
    expect(() => validate({ board: "uno", files: { "s.ino": '#include <Servo.h>\n#include "util.h"', "util.h": "" } })).not.toThrow();
  });
  it("hashes deterministically regardless of key order", () => {
    expect(cacheKey({ board: "uno", files: { "a.ino": "1", "b.h": "2" } })).toBe(cacheKey({ board: "uno", files: { "b.h": "2", "a.ino": "1" } }));
  });
});

describe("parseDiagnostics", () => {
  it("keeps sketch diagnostics and strips paths", () => {
    const log = "/tmp/pb-compile-x/s/s.ino:3:5: error: 'foo' was not declared in this scope\n/opt/lib/Servo.cpp:1:1: warning: lib noise";
    expect(parseDiagnostics(log, "/tmp/pb-compile-x/s")).toEqual([{ file: "s.ino", line: 3, column: 5, severity: "error", message: "'foo' was not declared in this scope" }]);
  });
});

describe.skipIf(!hasCli)("compile (arduino-cli)", () => {
  it("builds a sketch using bundled libraries", async () => {
    const r = await compile({ board: "uno", files: { "blink.ino": "#include <Servo.h>\nServo s;\nvoid setup(){ pinMode(13, OUTPUT); s.attach(9); }\nvoid loop(){ digitalWrite(13, !digitalRead(13)); delay(100); }" } });
    expect(r.ok).toBe(true);
    expect(r.hex).toMatch(/^:10000000/);
    expect(r.size!.flash).toBeGreaterThan(500);
  }, 60_000);
  it("builds every bundled library", async () => {
    const sketch = [
      "#include <Wire.h>", "#include <SPI.h>", "#include <EEPROM.h>", "#include <SoftwareSerial.h>",
      "#include <Servo.h>", "#include <LiquidCrystal.h>", "#include <Stepper.h>",
      "#include <LiquidCrystal_I2C.h>", "#include <Adafruit_GFX.h>", "#include <Adafruit_SSD1306.h>", "#include <TM1637Display.h>", "#include <LedControl.h>",
      "#include <DHT.h>", "#include <Adafruit_NeoPixel.h>", "#include <OneWire.h>", "#include <DallasTemperature.h>", "#include <NewPing.h>",
      "LiquidCrystal_I2C lcd(0x27, 16, 2);", "NewPing sonar(7, 8, 200);", "Adafruit_SSD1306 oled(128, 64, &Wire, -1);", "TM1637Display seg(2, 3);",
      "LedControl lc(12, 11, 10, 1);", "DHT dht(4, DHT22);", "Adafruit_NeoPixel strip(8, 6, NEO_GRB + NEO_KHZ800);", "OneWire ow(5);", "DallasTemperature temps(&ow);",
      "void setup(){ lcd.init(); lcd.backlight(); lcd.print(sonar.ping_cm()); oled.begin(SSD1306_SWITCHCAPVCC, 0x3C); seg.setBrightness(7); dht.begin(); strip.begin(); temps.begin(); }",
      "void loop(){ lcd.setCursor(0, 1); lcd.print(dht.readTemperature()); delay(500); }",
    ].join("\n");
    const r = await compile({ board: "uno", files: { "all.ino": sketch } });
    expect(r.diagnostics.filter((d) => d.severity === "error")).toEqual([]);
    expect(r.ok).toBe(true);
  }, 120_000);
  it("builds an ATtiny85 sketch with ATTinyCore", async () => {
    const r = await compile({ board: "attiny85", files: { "tiny.ino": "void setup(){ pinMode(0, OUTPUT); }\nvoid loop(){ digitalWrite(0, !digitalRead(0)); delay(50); analogWrite(1, analogRead(A1) / 4); }" } });
    expect(r.ok).toBe(true);
    expect(r.size!.flashMax).toBe(8192);
  }, 120_000);
  it("reports errors with line numbers", async () => {
    const r = await compile({ board: "nano", files: { "bad.ino": "void setup(){\n  undefinedThing();\n}\nvoid loop(){}" } });
    expect(r.ok).toBe(false);
    expect(r.diagnostics[0]).toMatchObject({ file: "bad.ino", line: 2, severity: "error" });
  }, 60_000);
});
