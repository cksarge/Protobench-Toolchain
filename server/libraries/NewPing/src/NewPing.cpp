// NewPing — independent implementation for Protobench. MIT License.
#include "NewPing.h"

NewPing::NewPing(uint8_t trigger_pin, uint8_t echo_pin, unsigned int max_cm_distance)
    : _trigger(trigger_pin), _echo(echo_pin), _maxCm(min(max_cm_distance, (unsigned int)MAX_SENSOR_DISTANCE)) {
  pinMode(_trigger, OUTPUT);
  if (_echo != _trigger) pinMode(_echo, INPUT);
}

unsigned int NewPing::ping(unsigned int max_cm_distance) {
  unsigned int maxCm = max_cm_distance ? min(max_cm_distance, (unsigned int)MAX_SENSOR_DISTANCE) : _maxCm;
  unsigned long timeout = (unsigned long)maxCm * US_ROUNDTRIP_CM + US_ROUNDTRIP_CM;
  // one-pin mode: the trigger pin doubles as the echo input
  if (_echo == _trigger) pinMode(_trigger, OUTPUT);
  digitalWrite(_trigger, LOW);
  delayMicroseconds(4);
  digitalWrite(_trigger, HIGH);
  delayMicroseconds(10);
  digitalWrite(_trigger, LOW);
  if (_echo == _trigger) pinMode(_echo, INPUT);
  unsigned long us = pulseIn(_echo, HIGH, timeout + 2000);
  if (us == 0 || us > timeout) return NO_ECHO;
  return (unsigned int)us;
}

unsigned long NewPing::ping_cm(unsigned int max_cm_distance) { return convert_cm(ping(max_cm_distance)); }

unsigned long NewPing::ping_in(unsigned int max_cm_distance) { return convert_in(ping(max_cm_distance)); }

unsigned long NewPing::ping_median(uint8_t it, unsigned int max_cm_distance) {
  if (it == 0) it = 1;
  if (it > 25) it = 25;
  unsigned int samples[25];
  uint8_t n = 0;
  for (uint8_t i = 0; i < it; i++) {
    unsigned int t = ping(max_cm_distance);
    if (t != NO_ECHO) {
      // insertion sort as we go
      uint8_t j = n++;
      while (j > 0 && samples[j - 1] > t) {
        samples[j] = samples[j - 1];
        j--;
      }
      samples[j] = t;
    }
    if (i + 1 < it) delay(30);  // let echoes die down between pings
  }
  return n ? samples[n >> 1] : NO_ECHO;
}
