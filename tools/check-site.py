#!/usr/bin/env python3
"""Pre-push check for notanothermonday.com.

Run from the repo root before pushing:

    python3 tools/check-site.py

1. Scans every page for broken HTML attributes (e.g. a missing closing quote
   that merges alt text into an image URL) and missing image dimensions.
2. Rewrites sitemap.xml so each <lastmod> is the date that page last changed
   (today if it has uncommitted edits, otherwise its last git commit).

Exits with status 1 if any page has a problem.
"""
import datetime
import pathlib
import subprocess
import sys
from html.parser import HTMLParser

ROOT = pathlib.Path(__file__).resolve().parent.parent
SITE = "https://notanothermonday.com/"
PAGES = {  # sitemap URL path -> file
    "": "index.html",
    "support/": "support/index.html",
    "privacy/": "privacy/index.html",
    "terms/": "terms/index.html",
    "delete-account/": "delete-account/index.html",
}
CHECK = list(PAGES.values()) + ["404.html"]


class Checker(HTMLParser):
    def __init__(self):
        super().__init__()
        self.problems = []

    def handle_starttag(self, tag, attrs):
        line = self.getpos()[0]
        names = [k for k, _ in attrs]
        for key, value in attrs:
            if value and any(f" {a}=" in value for a in ("alt", "src", "href", "class", "width", "height")):
                self.problems.append(f"line {line}: <{tag} {key}=…> swallowed another attribute: {value[:70]!r}")
        if tag == "img":
            if "alt" not in names:
                self.problems.append(f"line {line}: <img> has no alt attribute")
            if "width" not in names or "height" not in names:
                self.problems.append(f"line {line}: <img> is missing width/height")


def last_changed(path):
    dirty = subprocess.run(["git", "status", "--porcelain", "--", path], cwd=ROOT,
                           capture_output=True, text=True).stdout.strip()
    if dirty:
        return datetime.date.today().isoformat()
    out = subprocess.run(["git", "log", "-1", "--format=%cs", "--", path], cwd=ROOT,
                         capture_output=True, text=True).stdout.strip()
    return out or datetime.date.today().isoformat()


def main():
    failed = False
    for rel in CHECK:
        checker = Checker()
        checker.feed((ROOT / rel).read_text(encoding="utf-8"))
        if checker.problems:
            failed = True
            print(f"✗ {rel}")
            for p in checker.problems:
                print(f"    {p}")
        else:
            print(f"✓ {rel}")

    urls = "\n".join(
        f"  <url><loc>{SITE}{path}</loc><lastmod>{last_changed(rel)}</lastmod></url>"
        for path, rel in PAGES.items()
    )
    (ROOT / "sitemap.xml").write_text(
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
        f"{urls}\n</urlset>\n",
        encoding="utf-8",
    )
    print("✓ sitemap.xml updated")
    sys.exit(1 if failed else 0)


if __name__ == "__main__":
    main()
