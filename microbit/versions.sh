# Upstream sources for the micro:bit firmware, pinned by commit. The simulator repository
# pins micropython-microbit-v2 and MicroPython itself as git submodules.
SIM_REPO=https://github.com/microbit-foundation/micropython-microbit-v2-simulator.git
SIM_COMMIT=5ce97d205c83b8ed47eb2d71e919bf5db297833b
# expected submodule commits (checked after checkout)
MBIT_COMMIT=8aaa36b8d50211f5902d50e050632a88358d369f
MICROPYTHON_COMMIT=da4b38e7562dfa451917f9d7f344a7f26de8c7bd
# Protobench firmware version (bump when port/ changes)
FIRMWARE_VERSION=mbv2-2.1.1-pb1
# version shown in the MicroPython banner
BANNER_VERSION=v2.1.1-pb1
