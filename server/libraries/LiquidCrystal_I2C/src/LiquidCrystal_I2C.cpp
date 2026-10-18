// LiquidCrystal_I2C — independent implementation for Protobench. MIT License.
// Written from the HD44780U and PCF8574 datasheets.
#include "LiquidCrystal_I2C.h"

// PCF8574 pin mapping used by the common blue backpacks:
// P0 = RS, P1 = RW, P2 = EN, P3 = backlight, P4..P7 = D4..D7
static const uint8_t RS = 0x01;
static const uint8_t EN = 0x04;
static const uint8_t BL = 0x08;

// HD44780 instructions
static const uint8_t CMD_CLEAR = 0x01;
static const uint8_t CMD_HOME = 0x02;
static const uint8_t CMD_ENTRY = 0x04;
static const uint8_t CMD_CONTROL = 0x08;
static const uint8_t CMD_SHIFT = 0x10;
static const uint8_t CMD_FUNCTION = 0x20;
static const uint8_t CMD_CGRAM = 0x40;
static const uint8_t CMD_DDRAM = 0x80;

// entry mode bits
static const uint8_t ENTRY_LEFT = 0x02;
static const uint8_t ENTRY_SHIFT = 0x01;
// display control bits
static const uint8_t DISPLAY_ON = 0x04;
static const uint8_t CURSOR_ON = 0x02;
static const uint8_t BLINK_ON = 0x01;
// shift bits
static const uint8_t SHIFT_DISPLAY = 0x08;
static const uint8_t SHIFT_RIGHT = 0x04;
// function set bits
static const uint8_t TWO_LINES = 0x08;
static const uint8_t FONT_5X10 = 0x04;

LiquidCrystal_I2C::LiquidCrystal_I2C(uint8_t addr, uint8_t cols, uint8_t rows, uint8_t charsize)
    : _addr(addr), _cols(cols), _rows(rows), _charsize(charsize), _function(0), _control(0), _mode(0), _backlight(BL) {}

void LiquidCrystal_I2C::init() { begin(); }

void LiquidCrystal_I2C::begin(uint8_t cols, uint8_t rows, uint8_t charsize) {
  _cols = cols;
  _rows = rows;
  _charsize = charsize;
  begin();
}

void LiquidCrystal_I2C::begin() {
  Wire.begin();
  _function = (_rows > 1 ? TWO_LINES : 0) | (_charsize && _rows == 1 ? FONT_5X10 : 0);
  delay(50);  // power-on settling
  expanderWrite(_backlight);
  delay(100);
  // datasheet "initialization by instruction" sequence into 4-bit mode
  write4(0x30);
  delayMicroseconds(4500);
  write4(0x30);
  delayMicroseconds(4500);
  write4(0x30);
  delayMicroseconds(150);
  write4(0x20);
  command(CMD_FUNCTION | _function);
  _control = DISPLAY_ON;
  command(CMD_CONTROL | _control);
  clear();
  _mode = ENTRY_LEFT;
  command(CMD_ENTRY | _mode);
  home();
}

void LiquidCrystal_I2C::clear() {
  command(CMD_CLEAR);
  delayMicroseconds(2000);
}

void LiquidCrystal_I2C::home() {
  command(CMD_HOME);
  delayMicroseconds(2000);
}

void LiquidCrystal_I2C::setCursor(uint8_t col, uint8_t row) {
  static const uint8_t offsets[] = {0x00, 0x40, 0x14, 0x54};
  if (row >= _rows) row = _rows ? _rows - 1 : 0;
  if (row > 3) row = 3;
  command(CMD_DDRAM | (col + offsets[row]));
}

void LiquidCrystal_I2C::noDisplay() { _control &= ~DISPLAY_ON; command(CMD_CONTROL | _control); }
void LiquidCrystal_I2C::display() { _control |= DISPLAY_ON; command(CMD_CONTROL | _control); }
void LiquidCrystal_I2C::noCursor() { _control &= ~CURSOR_ON; command(CMD_CONTROL | _control); }
void LiquidCrystal_I2C::cursor() { _control |= CURSOR_ON; command(CMD_CONTROL | _control); }
void LiquidCrystal_I2C::noBlink() { _control &= ~BLINK_ON; command(CMD_CONTROL | _control); }
void LiquidCrystal_I2C::blink() { _control |= BLINK_ON; command(CMD_CONTROL | _control); }
void LiquidCrystal_I2C::scrollDisplayLeft() { command(CMD_SHIFT | SHIFT_DISPLAY); }
void LiquidCrystal_I2C::scrollDisplayRight() { command(CMD_SHIFT | SHIFT_DISPLAY | SHIFT_RIGHT); }
void LiquidCrystal_I2C::leftToRight() { _mode |= ENTRY_LEFT; command(CMD_ENTRY | _mode); }
void LiquidCrystal_I2C::rightToLeft() { _mode &= ~ENTRY_LEFT; command(CMD_ENTRY | _mode); }
void LiquidCrystal_I2C::autoscroll() { _mode |= ENTRY_SHIFT; command(CMD_ENTRY | _mode); }
void LiquidCrystal_I2C::noAutoscroll() { _mode &= ~ENTRY_SHIFT; command(CMD_ENTRY | _mode); }

void LiquidCrystal_I2C::noBacklight() { _backlight = 0; expanderWrite(0); }
void LiquidCrystal_I2C::backlight() { _backlight = BL; expanderWrite(0); }
void LiquidCrystal_I2C::setBacklight(uint8_t on) { on ? backlight() : noBacklight(); }

void LiquidCrystal_I2C::createChar(uint8_t location, const uint8_t charmap[]) {
  command(CMD_CGRAM | ((location & 0x7) << 3));
  for (uint8_t i = 0; i < 8; i++) write(charmap[i]);
}

void LiquidCrystal_I2C::command(uint8_t value) { send(value, 0); }

size_t LiquidCrystal_I2C::write(uint8_t value) {
  send(value, RS);
  return 1;
}

void LiquidCrystal_I2C::send(uint8_t value, uint8_t mode) {
  write4((value & 0xF0) | mode);
  write4(((value << 4) & 0xF0) | mode);
}

void LiquidCrystal_I2C::write4(uint8_t nibble) {
  expanderWrite(nibble);
  pulseEnable(nibble);
}

void LiquidCrystal_I2C::expanderWrite(uint8_t data) {
  Wire.beginTransmission(_addr);
  Wire.write(data | _backlight);
  Wire.endTransmission();
}

void LiquidCrystal_I2C::pulseEnable(uint8_t data) {
  expanderWrite(data | EN);
  delayMicroseconds(1);
  expanderWrite(data & ~EN);
  delayMicroseconds(50);
}
