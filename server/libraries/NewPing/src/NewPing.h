// NewPing — HC-SR04 / SR04-style ultrasonic distance sensors.
// Independent implementation for Protobench, source-compatible with the common
// NewPing blocking API (ping, ping_cm, ping_in, ping_median, convert_*).
// MIT License, (c) 2026 Protobench.
#pragma once

#include <Arduino.h>

#ifndef MAX_SENSOR_DISTANCE
#define MAX_SENSOR_DISTANCE 500  // cm
#endif
#ifndef US_ROUNDTRIP_CM
#define US_ROUNDTRIP_CM 57  // µs for sound to travel 1 cm and back
#endif
#ifndef US_ROUNDTRIP_IN
#define US_ROUNDTRIP_IN 146
#endif
#define NO_ECHO 0
#define NewPingConvert(echoTime, conversionFactor) (max(((unsigned int)echoTime + conversionFactor / 2) / conversionFactor, (echoTime ? 1 : 0)))

class NewPing {
 public:
  NewPing(uint8_t trigger_pin, uint8_t echo_pin, unsigned int max_cm_distance = MAX_SENSOR_DISTANCE);

  /** Echo time in µs, or NO_ECHO when nothing is in range. */
  unsigned int ping(unsigned int max_cm_distance = 0);
  unsigned long ping_cm(unsigned int max_cm_distance = 0);
  unsigned long ping_in(unsigned int max_cm_distance = 0);
  /** Median echo time of `it` pings, ignoring misses. */
  unsigned long ping_median(uint8_t it = 5, unsigned int max_cm_distance = 0);

  static unsigned int convert_cm(unsigned int echoTime) { return NewPingConvert(echoTime, US_ROUNDTRIP_CM); }
  static unsigned int convert_in(unsigned int echoTime) { return NewPingConvert(echoTime, US_ROUNDTRIP_IN); }

 private:
  uint8_t _trigger, _echo;
  unsigned int _maxCm;
};
