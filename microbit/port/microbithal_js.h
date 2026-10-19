void microbit_hal_init(void);
void microbit_hal_deinit(void);
void microbit_hal_background_processing(void);
// Sleeps until the deadline tick (microseconds) or the next timer tick, whichever is first.
void microbit_hal_idle_until_us(uint32_t deadline_us);
