#!/usr/bin/env bash
set -euo pipefail
# Run only against the disposable AVD owned by this job; never clear app data.
mkdir -p test-results/android-smoke
export PATH="$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator:$PATH"
test -r /dev/kvm && test -w /dev/kvm
sdkmanager 'emulator' 'system-images;android-35;google_apis;x86_64'
adb start-server
if adb devices | awk 'NR>1 && NF { found=1 } END { exit !found }'; then
  echo 'Refusing to use a host with an existing connected device or emulator.' >&2
  exit 1
fi
CUARTOS_AVD_ROOT=$(mktemp -d)
export ANDROID_USER_HOME="$CUARTOS_AVD_ROOT/user"
export ANDROID_EMULATOR_HOME="$ANDROID_USER_HOME"
export ANDROID_AVD_HOME="$CUARTOS_AVD_ROOT/avd"
mkdir -p "$ANDROID_USER_HOME" "$ANDROID_AVD_HOME"
CUARTOS_AVD_NAME="cuartos-qa-${GITHUB_RUN_ID:-local}-$$"
echo no | avdmanager create avd --name "$CUARTOS_AVD_NAME" --package 'system-images;android-35;google_apis;x86_64' --device pixel_7 --path "$CUARTOS_AVD_ROOT/$CUARTOS_AVD_NAME.avd"
avdmanager list avd
test -s "$ANDROID_AVD_HOME/$CUARTOS_AVD_NAME.ini"
emulator -list-avds
emulator -avd "$CUARTOS_AVD_NAME" -port 5554 -no-window -no-audio -no-snapshot -no-boot-anim -gpu swiftshader -memory 2048 >test-results/android-smoke/emulator.log 2>&1 &
CUARTOS_EMULATOR_PID=$!
trap 'adb -s emulator-5554 emu kill >/dev/null 2>&1 || true; kill "$CUARTOS_EMULATOR_PID" 2>/dev/null || true' EXIT
export CUARTOS_EMULATOR_PID
timeout 300 bash -c 'until [[ "$(adb -s emulator-5554 shell getprop sys.boot_completed 2>/dev/null | tr -d "\r")" == 1 ]]; do kill -0 "$CUARTOS_EMULATOR_PID" 2>/dev/null || { cat test-results/android-smoke/emulator.log; exit 1; }; sleep 2; done'
adb -s emulator-5554 shell input keyevent 82
adb -s emulator-5554 shell settings put global stay_on_while_plugged_in 3
adb -s emulator-5554 install -r test-results/apk/app-debug.apk
npm run test:android:smoke
