"""Validate foundation files and relative Markdown links without dependencies."""

from pathlib import Path
import re
import sys
from urllib.parse import unquote, urlsplit


ROOT = Path(__file__).resolve().parents[1]
REQUIRED = (
    "README.md",
    "AGENTS.md",
    "CONTRIBUTING.md",
    "docs/ARCHITECTURE.md",
    "docs/ROADMAP.md",
    "docs/STATUS.md",
    "docs/REPOSITORY_SETUP.md",
    "docs/decisions/0001-platform.md",
    ".github/pull_request_template.md",
    ".github/ISSUE_TEMPLATE/feature.yml",
    ".github/ISSUE_TEMPLATE/bug.yml",
    ".github/ISSUE_TEMPLATE/config.yml",
    ".github/workflows/foundation.yml",
)


def main() -> int:
    errors = []
    for relative in REQUIRED:
        path = ROOT / relative
        if not path.is_file() or not path.read_text(encoding="utf-8").strip():
            errors.append(f"Missing or empty foundation file: {relative}")

    # Only inspect project Markdown, never installed packages or build outputs.
    markdown = list(ROOT.glob("*.md")) + list((ROOT / "docs").rglob("*.md"))
    markdown += list((ROOT / ".github").rglob("*.md"))
    for path in markdown:
        source = path.read_text(encoding="utf-8")
        source = re.sub(r"```.*?```", "", source, flags=re.S)
        for target in re.findall(r"\[[^\]]*\]\(([^\s)]+)\)", source):
            url = urlsplit(target)
            if url.scheme or url.netloc or not url.path:
                continue
            destination = (path.parent / unquote(url.path)).resolve()
            if not destination.is_relative_to(ROOT) or not destination.exists():
                errors.append(f"Broken local link in {path.relative_to(ROOT)}: {target}")

    if errors:
        print("\n".join(errors), file=sys.stderr)
        return 1
    print(f"Foundation OK: {len(REQUIRED)} required files; {len(markdown)} Markdown files checked.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
