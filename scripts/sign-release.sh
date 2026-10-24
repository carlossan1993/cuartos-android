#!/usr/bin/env bash
# Used only by the manual, main-only workflow. Never generate or upload a key.
set -euo pipefail
set +x
task_key_dir="$(mktemp -d "${RUNNER_TEMP:-/tmp}/cuartos-upload.XXXXXX")"
trap 'rm -rf "$task_key_dir"' EXIT
export CUARTOS_KEYSTORE_PATH="$task_key_dir/upload.jks"
python3 - <<'PY'
import os, base64, hashlib, subprocess, re
from pathlib import Path
required = ["ANDROID_UPLOAD_KEYSTORE_BASE64", "CUARTOS_STORE_PASSWORD", "CUARTOS_KEY_ALIAS", "CUARTOS_KEY_PASSWORD", "ANDROID_UPLOAD_CERT_SHA256"]
if any(not os.environ.get(name) for name in required):
    raise SystemExit("Missing upload signing secrets or expected public certificate fingerprint.")
key = Path(os.environ["CUARTOS_KEYSTORE_PATH"])
key.write_bytes(base64.b64decode(os.environ["ANDROID_UPLOAD_KEYSTORE_BASE64"], validate=True))
key.chmod(0o600)
expected = os.environ["ANDROID_UPLOAD_CERT_SHA256"].replace(":", "").lower()
if not re.fullmatch("[0-9a-f]{64}", expected):
    raise SystemExit("Expected certificate fingerprint must be SHA-256.")
args = ["keytool", "-exportcert", "-keystore", str(key), "-alias", os.environ["CUARTOS_KEY_ALIAS"], "-storepass:env", "CUARTOS_STORE_PASSWORD"]
cert = subprocess.run(args, check=True, capture_output=True).stdout
if hashlib.sha256(cert).hexdigest() != expected:
    raise SystemExit("Upload key does not match the expected public certificate.")
PY
(cd android && ./gradlew --no-daemon lintRelease testReleaseUnitTest bundleRelease)
jarsigner -verify -strict -keystore "$CUARTOS_KEYSTORE_PATH" -storepass:env CUARTOS_STORE_PASSWORD android/app/build/outputs/bundle/release/app-release.aab > "$task_key_dir/verification.txt" 2>&1 || {
  echo "Signed bundle verification failed; no artifact should be uploaded."
  exit 1
}
python3 scripts/check-aab.py --signed
