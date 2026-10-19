/*
 * This file is part of the MicroPython project, http://micropython.org/
 *
 * The MIT License (MIT)
 *
 * Copyright (c) 2020 Damien P. George
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

// Replaces codal_port/mphalport.c. Simulated time only advances when the program
// yields to the host, so delays sleep until their deadline instead of polling ticks.

#include "py/runtime.h"
#include "py/mphal.h"
#include "microbithal_js.h"

static void delay_until_us(uint32_t start, uint32_t us) {
    while (mp_hal_ticks_us() - start < us) {
        mp_handle_pending(true);
        microbit_hal_idle_until_us(start + us);
    }
}

void mp_hal_delay_us(mp_uint_t us) {
    if (us <= 0) {
        return;
    }
    delay_until_us(mp_hal_ticks_us(), us);
}

void mp_hal_delay_ms(mp_uint_t ms) {
    if (ms <= 0) {
        return;
    }
    // long delays in chunks so the microsecond tick difference never wraps
    uint32_t start_ms = mp_hal_ticks_ms();
    while (mp_hal_ticks_ms() - start_ms < ms) {
        uint32_t left = ms - (mp_hal_ticks_ms() - start_ms);
        delay_until_us(mp_hal_ticks_us(), (left > 1000000 ? 1000000 : left) * 1000);
    }
}
