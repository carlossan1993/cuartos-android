"""Convert opaque Chromium PNGs to RGB PNG and verify Play image dimensions."""
from pathlib import Path
import struct
import zlib
import json
import hashlib

ROOT = Path("play-output")
def chunk(kind, data):
    return struct.pack(">I", len(data)) + kind + data + struct.pack(">I", zlib.crc32(kind + data) & 0xffffffff)
def normalize(path):
    source = path.read_bytes()
    if source[:8] != b"\x89PNG\r\n\x1a\n":
        raise ValueError(f"Not PNG: {path}")
    pos, compressed, header = 8, bytearray(), None
    while pos < len(source):
        size = struct.unpack(">I", source[pos:pos+4])[0]
        kind, data = source[pos+4:pos+8], source[pos+8:pos+8+size]
        if kind == b"IHDR": header = data
        if kind == b"IDAT": compressed.extend(data)
        pos += 12 + size
    width, height, depth, color, compression, filtering, interlace = struct.unpack(">IIBBBBB", header)
    if depth != 8 or color not in (2, 6) or compression or filtering or interlace:
        raise ValueError(f"Unsupported PNG encoding: {path}")
    channels, rows = (3 if color == 2 else 4), zlib.decompress(compressed)
    stride, previous, rgb = width * channels, bytearray(width * channels), bytearray()
    for y in range(height):
        offset = y * (stride + 1)
        method, row = rows[offset], bytearray(rows[offset+1:offset+stride+1])
        for x in range(stride):
            a = row[x-channels] if x >= channels else 0
            b = previous[x]
            c = previous[x-channels] if x >= channels else 0
            if method == 0: predictor = 0
            elif method == 1: predictor = a
            elif method == 2: predictor = b
            elif method == 3: predictor = (a+b)//2
            elif method == 4:
                p = a+b-c
                pa, pb, pc = abs(p-a), abs(p-b), abs(p-c)
                predictor = a if pa <= pb and pa <= pc else (b if pb <= pc else c)
            else: raise ValueError("Unknown PNG row filter")
            row[x] = (row[x] + predictor) & 255
        rgb.append(0)
        if channels == 4:
            for x in range(0, stride, 4):
                if row[x+3] != 255: raise ValueError(f"Unexpected transparency: {path}")
                rgb.extend(row[x:x+3])
        else: rgb.extend(row)
        previous = row
    if path.name == "icon-512.png":
        assert (width, height) == (512, 512)
    elif path.name.startswith("feature-"):
        assert (width, height) == (1024, 500)
    else:
        assert min(width, height) >= 320 and max(width, height) <= 3840 and max(width, height) <= min(width, height)*2
        assert height >= 1080
    result = b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0))
    result += chunk(b"IDAT", zlib.compress(bytes(rgb), 9)) + chunk(b"IEND", b"")
    path.write_bytes(result)
    return {"path": str(path.relative_to(ROOT)), "width": width, "height": height, "color": "RGB", "bytes": len(result), "sha256": hashlib.sha256(result).hexdigest()}
images = [normalize(path) for path in sorted(ROOT.rglob("*.png"))]
assert len(images) == 19, f"Expected 16 UI captures and 3 graphics, got {len(images)}"
(ROOT / "images.json").write_text(json.dumps(images, indent=2) + "\n")
print(json.dumps({"images": len(images), "format": "opaque RGB PNG", "dimensions": "validated"}))
