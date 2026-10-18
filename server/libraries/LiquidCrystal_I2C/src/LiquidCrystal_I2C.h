// LiquidCrystal_I2C — HD44780 character LCD on a PCF8574 I2C backpack.
// Independent implementation for Protobench, source-compatible with the common
// LiquidCrystal_I2C API. MIT License, (c) 2026 Protobench.
#pragma once

#include <Arduino.h>
#include <Print.h>
#include <Wire.h>

class LiquidCrystal_I2C : public Print {
 public:
  LiquidCrystal_I2C(uint8_t addr, uint8_t cols, uint8_t rows, uint8_t charsize = 0);

  void begin();
  void begin(uint8_t cols, uint8_t rows, uint8_t charsize = 0);
  void init();
  void clear();
  void home();
  void setCursor(uint8_t col, uint8_t row);
  void noDisplay();
  void display();
  void noCursor();
  void cursor();
  void noBlink();
  void blink();
  void scrollDisplayLeft();
  void scrollDisplayRight();
  void leftToRight();
  void rightToLeft();
  void autoscroll();
  void noAutoscroll();
  void noBacklight();
  void backlight();
  void setBacklight(uint8_t on);
  bool getBacklight() const { return _backlight != 0; }
  void createChar(uint8_t location, const uint8_t charmap[]);
  void command(uint8_t value);

  // aliases found in sketches written for older versions
  void cursor_on() { cursor(); }
  void cursor_off() { noCursor(); }
  void blink_on() { blink(); }
  void blink_off() { noBlink(); }
  void load_custom_character(uint8_t n, const uint8_t rows[]) { createChar(n, rows); }
  void printstr(const char* s) { print(s); }

  virtual size_t write(uint8_t value);
  using Print::write;

 private:
  void send(uint8_t value, uint8_t mode);
  void write4(uint8_t nibble);
  void expanderWrite(uint8_t data);
  void pulseEnable(uint8_t data);

  uint8_t _addr, _cols, _rows, _charsize;
  uint8_t _function, _control, _mode, _backlight;
};
