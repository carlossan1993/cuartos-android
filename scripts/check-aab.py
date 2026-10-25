"""Inspect release payload and merged manifest; never print credentials."""
from pathlib import Path
import zipfile
import hashlib
import json
import xml.etree.ElementTree as ET
import sys

bundle = Path("android/app/build/outputs/bundle/release/app-release.aab")
with zipfile.ZipFile(bundle) as archive:
    names = archive.namelist()
    assert "base/manifest/AndroidManifest.xml" in names
    assert "base/assets/public/index.html" in names
    assert "base/assets/public/privacy/es.html" in names and "base/assets/public/privacy/en.html" in names
    for name in names:
        if not name.startswith("base/") or name.endswith("/"): continue
        payload = archive.read(name)
        assert "carlossan1993" not in name.lower(), "Personal identifier in bundle path"
        for encoding in ("utf-8", "utf-16le", "utf-16be"):
            assert "carlossan1993".encode(encoding) not in payload.lower(), "Personal identifier in bundle payload: " + name
    natives = [name for name in names if name.endswith(".so")]
    assert not natives, "Native libraries appeared; audit ELF/16 KB alignment before accepting this release."
    signature = [name for name in names if name.upper().startswith("META-INF/") and name.upper().endswith((".RSA", ".DSA", ".EC"))]
    signed = "--signed" in sys.argv
    assert bool(signature) == signed, "Unexpected bundle signature state"
ns = "{http://schemas.android.com/apk/res/android}"
candidates = sorted(Path("android/app/build/intermediates").glob("**/release/**/AndroidManifest.xml"))
manifest = None
for path in candidates:
    try:
        root = ET.parse(path).getroot()
    except ET.ParseError:
        continue
    if root.tag == "manifest" and root.attrib.get("package") == "com.odamus.app" and root.find("application") is not None and root.find("uses-sdk") is not None:
        manifest = root
        break
assert manifest is not None, "Missing merged release manifest"
app, sdk = manifest.find("application"), manifest.find("uses-sdk")
assert app.attrib.get(ns+"debuggable", "false") == "false"
assert app.attrib.get(ns+"allowBackup") == "false"
assert sdk.attrib.get(ns+"targetSdkVersion") == "36" and sdk.attrib.get(ns+"minSdkVersion") == "24"
permissions = sorted(p.attrib[ns+"name"] for p in manifest.findall("uses-permission"))
internal = "com.odamus.app.DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION"
assert permissions == ["android.permission.INTERNET", internal], permissions
declarations = {p.attrib[ns+"name"]: p for p in manifest.findall("permission")}
assert internal in declarations and declarations[internal].attrib.get(ns+"protectionLevel") == "signature", "AndroidX internal receiver permission must remain signature-protected"
assert manifest.attrib.get(ns+"versionCode") == "1" and manifest.attrib.get(ns+"versionName") == "0.1.0"
report = {"sha256": hashlib.sha256(bundle.read_bytes()).hexdigest(), "bytes": bundle.stat().st_size, "signed": signed,
          "applicationId": manifest.attrib["package"], "versionCode": manifest.attrib.get(ns+"versionCode"),
          "versionName": manifest.attrib.get(ns+"versionName"), "targetSdk": 36, "minSdk": 24,
          "debuggable": False, "allowBackup": False, "permissions": permissions, "nativeLibraries": natives,
          "pageSize": "No native .so in this AAB; no app-owned ELF alignment to check. WebView is supplied by Android."}
output = Path("play-output/release")
output.mkdir(parents=True, exist_ok=True)
(output / "aab-report.json").write_text(json.dumps(report, indent=2)+"\n")
(output / "SHA256SUMS.txt").write_text(report["sha256"]+"  app-release.aab\n")
print(json.dumps(report))
