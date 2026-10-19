/*
 * This file is part of the MicroPython project, http://micropython.org/
 *
 * The MIT License (MIT)
 *
 * Copyright (c) 2022 Damien P. George
 * Copyright (c) 2026 Protobench contributors
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

// The firmware's view of the hardware. Every call goes to `Module.board`, an object the
// host passes in when it creates the module (see Protobench's packages/mcu micro:bit
// host). Memory is converted here so the host only sees plain values and byte arrays.
//
// Asynchronous calls receive a `resume(value?)` callback: the host calls it right away to
// continue without pausing, or keeps it and calls it later (from plain JavaScript) to
// resume a paused program, e.g. once the circuit has caught up with the program's time.

mergeInto(LibraryManager.library, {
  mp_js_hal_init: function () {
    Module.board.init();
  },

  mp_js_hal_deinit: function () {
    Module.board.deinit();
  },

  mp_js_rng_generate_random_word: function () {
    return Module.board.randomWord() >>> 0;
  },

  // --- time -----------------------------------------------------------------------

  mp_js_hal_ticks_ms: function () {
    return Module.board.ticksMs() >>> 0;
  },

  mp_js_hal_ticks_us: function () {
    return Module.board.ticksUs() >>> 0;
  },

  mp_js_hal_background__async: true,
  mp_js_hal_background: function () {
    return Asyncify.handleSleep((resume) => Module.board.background(resume));
  },

  mp_js_hal_idle_until_us__async: true,
  mp_js_hal_idle_until_us: function (wake_us) {
    return Asyncify.handleSleep((resume) => Module.board.idleUntilUs(wake_us >>> 0, resume));
  },

  // --- serial and filesystem ---------------------------------------------------------

  mp_js_hal_stdin_pop_char: function () {
    return Module.board.stdinPop();
  },

  mp_js_hal_stdout_tx_strn: function (ptr, len) {
    Module.board.stdout(HEAPU8.slice(ptr, ptr + len));
  },

  mp_js_hal_filesystem_find: function (name, len) {
    return Module.board.fs.find(UTF8ToString(name, len));
  },

  mp_js_hal_filesystem_create: function (name, len) {
    return Module.board.fs.create(UTF8ToString(name, len));
  },

  mp_js_hal_filesystem_name: function (idx, buf) {
    const name = Module.board.fs.name(idx);
    if (name === undefined) {
      return -1;
    }
    const len = lengthBytesUTF8(name);
    stringToUTF8(name, buf, len + 1);
    return len;
  },

  mp_js_hal_filesystem_size: function (idx) {
    return Module.board.fs.size(idx);
  },

  mp_js_hal_filesystem_remove: function (idx) {
    Module.board.fs.remove(idx);
  },

  mp_js_hal_filesystem_readbyte: function (idx, offset) {
    return Module.board.fs.readbyte(idx, offset);
  },

  mp_js_hal_filesystem_write: function (idx, buf, len) {
    return Module.board.fs.write(idx, HEAPU8.slice(buf, buf + len));
  },

  mp_js_hal_reset: function () {
    Module.board.reset();
  },

  mp_js_hal_panic: function (code) {
    Module.board.panic(code);
  },

  // --- sensors and buttons -------------------------------------------------------------

  mp_js_hal_temperature: function () {
    return Module.board.temperature();
  },

  mp_js_hal_button_get_presses: function (button) {
    return Module.board.buttonPresses(button);
  },

  mp_js_hal_button_is_pressed: function (button) {
    return Module.board.buttonIsPressed(button);
  },

  mp_js_hal_display_enable: function (value) {
    Module.board.displayEnable(!!value);
  },

  mp_js_hal_display_get_pixel: function (x, y) {
    return Module.board.displayGetPixel(x, y);
  },

  mp_js_hal_display_set_pixel: function (x, y, value) {
    Module.board.displaySetPixel(x, y, value);
  },

  mp_js_hal_display_clear: function () {
    Module.board.displayClear();
  },

  mp_js_hal_display_read_light_level: function () {
    return Module.board.lightLevel();
  },

  mp_js_hal_accelerometer_get_x: function () {
    return Module.board.accelerometer(0);
  },

  mp_js_hal_accelerometer_get_y: function () {
    return Module.board.accelerometer(1);
  },

  mp_js_hal_accelerometer_get_z: function () {
    return Module.board.accelerometer(2);
  },

  mp_js_hal_accelerometer_get_gesture: function () {
    return Module.board.gesture();
  },

  mp_js_hal_accelerometer_set_range: function (r) {
    Module.board.accelerometerRange(r);
  },

  mp_js_hal_compass_get_x: function () {
    return Module.board.compass(0);
  },

  mp_js_hal_compass_get_y: function () {
    return Module.board.compass(1);
  },

  mp_js_hal_compass_get_z: function () {
    return Module.board.compass(2);
  },

  mp_js_hal_compass_get_field_strength: function () {
    return Module.board.compassFieldStrength();
  },

  mp_js_hal_compass_get_heading: function () {
    return Module.board.compassHeading();
  },

  mp_js_hal_microphone_init: function () {
    Module.board.microphoneInit();
  },

  mp_js_hal_microphone_set_threshold: function (kind, value) {
    Module.board.microphoneThreshold(kind, value);
  },

  mp_js_hal_microphone_get_level: function () {
    return Module.board.soundLevel();
  },

  // --- pins ------------------------------------------------------------------------------

  mp_js_hal_pin_write__async: true,
  mp_js_hal_pin_write: function (pin, value) {
    return Asyncify.handleSleep((resume) => Module.board.pinWrite(pin, value, resume));
  },

  mp_js_hal_pin_read__async: true,
  mp_js_hal_pin_read: function (pin) {
    return Asyncify.handleSleep((resume) => Module.board.pinRead(pin, resume));
  },

  mp_js_hal_pin_set_pull__async: true,
  mp_js_hal_pin_set_pull: function (pin, pull) {
    return Asyncify.handleSleep((resume) => Module.board.pinSetPull(pin, pull, resume));
  },

  mp_js_hal_pin_get_pull: function (pin) {
    return Module.board.pinGetPull(pin);
  },

  mp_js_hal_pin_read_analog_u10__async: true,
  mp_js_hal_pin_read_analog_u10: function (pin) {
    return Asyncify.handleSleep((resume) => Module.board.pinReadAnalog(pin, resume));
  },

  mp_js_hal_pin_write_analog_u10__async: true,
  mp_js_hal_pin_write_analog_u10: function (pin, value) {
    return Asyncify.handleSleep((resume) => Module.board.pinWriteAnalog(pin, value, resume));
  },

  mp_js_hal_pin_is_touched__async: true,
  mp_js_hal_pin_is_touched: function (pin) {
    return Asyncify.handleSleep((resume) => Module.board.pinIsTouched(pin, resume));
  },

  mp_js_hal_pin_set_touch_mode: function (pin, mode) {
    Module.board.pinSetTouchMode(pin, mode);
  },

  mp_js_hal_pin_get_analog_period_us: function (pin) {
    return Module.board.pinGetPeriodUs(pin);
  },

  mp_js_hal_pin_set_analog_period_us: function (pin, period) {
    return Module.board.pinSetPeriodUs(pin, period);
  },

  mp_js_hal_pin_write_ws2812: function (pin, buf, len) {
    Module.board.neopixelWrite(pin, HEAPU8.slice(buf, buf + len));
  },

  // --- buses -----------------------------------------------------------------------------

  mp_js_hal_i2c_init: function (scl, sda, freq) {
    return Module.board.i2cInit(scl, sda, freq);
  },

  mp_js_hal_i2c_readfrom: function (addr, buf, len, stop) {
    const data = new Uint8Array(len);
    const ret = Module.board.i2cRead(addr, data, !!stop);
    if (ret === 0) {
      HEAPU8.set(data, buf);
    }
    return ret;
  },

  mp_js_hal_i2c_writeto: function (addr, buf, len, stop) {
    return Module.board.i2cWrite(addr, HEAPU8.slice(buf, buf + len), !!stop);
  },

  mp_js_hal_spi_init: function (sclk, mosi, miso, frequency, bits, mode) {
    return Module.board.spiInit(sclk, mosi, miso, frequency, bits, mode);
  },

  mp_js_hal_spi_transfer: function (len, src, dest) {
    const rx = new Uint8Array(len);
    const ret = Module.board.spiTransfer(HEAPU8.slice(src, src + len), rx);
    if (ret === 0 && dest) {
      HEAPU8.set(rx, dest);
    }
    return ret;
  },

  mp_js_hal_uart_init: function (tx, rx, baudrate, bits, parity, stop) {
    return Module.board.uartInit(tx, rx, baudrate, bits, parity, stop);
  },

  // --- audio -----------------------------------------------------------------------------

  mp_js_hal_audio_set_volume: function (value) {
    Module.board.audioVolume(value);
  },

  mp_js_hal_audio_init: function (sample_rate) {
    Module.board.audioInit(sample_rate);
  },

  mp_js_hal_audio_write_data: function (buf, num_samples) {
    Module.board.audioWrite(HEAPU8.slice(buf, buf + num_samples));
  },

  mp_js_hal_audio_period_us: function (period_us) {
    Module.board.audioPeriodUs(period_us);
  },

  mp_js_hal_audio_amplitude_u10: function (amplitude_u10) {
    Module.board.audioAmplitude(amplitude_u10);
  },

  mp_js_hal_audio_select_pin: function (pin) {
    Module.board.audioSelectPin(pin);
  },

  mp_js_hal_audio_select_speaker: function (enable) {
    Module.board.audioSelectSpeaker(!!enable);
  },

  mp_js_hal_audio_play_expression: function (expr) {
    Module.board.audioPlayExpression(UTF8ToString(expr));
  },

  mp_js_hal_audio_stop_expression: function () {
    Module.board.audioStopExpression();
  },

  mp_js_hal_audio_is_expression_active: function () {
    return Module.board.audioExpressionActive();
  },

  // --- radio -----------------------------------------------------------------------------

  mp_js_radio_enable: function (group, max_payload, queue) {
    Module.board.radioEnable(group, max_payload, queue);
  },

  mp_js_radio_disable: function () {
    Module.board.radioDisable();
  },

  mp_js_radio_update_config: function (group, max_payload, queue) {
    Module.board.radioConfig(group, max_payload, queue);
  },

  mp_js_radio_send: function (buf, len, buf2, len2) {
    const data = new Uint8Array(len + len2);
    data.set(HEAPU8.subarray(buf, buf + len));
    data.set(HEAPU8.subarray(buf2, buf2 + len2), len);
    Module.board.radioSend(data);
  },

  // Copies the next queued packet into the firmware's receive buffer and returns its
  // address (or 0 when the queue is empty). Layout: length, payload, RSSI (as negative
  // dBm), then the 32-bit microsecond timestamp.
  mp_js_radio_peek: function () {
    const packet = Module.board.radioPeek();
    if (!packet) {
      return 0;
    }
    const ptr = Module._microbit_radio_rx_buffer();
    HEAPU8[ptr] = packet.data.length;
    HEAPU8.set(packet.data, ptr + 1);
    HEAPU8[ptr + 1 + packet.data.length] = -packet.rssi & 0xff;
    new DataView(HEAPU8.buffer).setUint32(ptr + 2 + packet.data.length, packet.timeUs >>> 0, true);
    return ptr;
  },

  mp_js_radio_pop: function () {
    Module.board.radioPop();
  },

  // --- data logging ------------------------------------------------------------------------

  mp_js_hal_log_delete: function (full_erase) {
    Module.board.logDelete(!!full_erase);
  },

  mp_js_hal_log_set_mirroring: function (serial) {
    Module.board.logMirroring(!!serial);
  },

  mp_js_hal_log_set_timestamp: function (period) {
    Module.board.logTimestamp(period);
  },

  mp_js_hal_log_begin_row: function () {
    return Module.board.logBeginRow();
  },

  mp_js_hal_log_end_row: function () {
    return Module.board.logEndRow();
  },

  mp_js_hal_log_data: function (key, value) {
    return Module.board.logData(UTF8ToString(key), UTF8ToString(value));
  },
});
