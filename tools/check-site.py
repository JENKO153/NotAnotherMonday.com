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
import json
import re
import pathlib
from urllib.parse import urlsplit, unquote
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
CHECK = list(PAGES.values()) + ["404.html", "recipe/index.html", "tools/og-card.html"]


class Checker(HTMLParser):
    def __init__(self):
        super().__init__()
        self.problems = []
        self.ids = set()
        self.refs = []
        self.h1_count = 0

    def handle_starttag(self, tag, attrs):
        line = self.getpos()[0]
        names = [k for k, _ in attrs]
        values = dict(attrs)
        if values.get("id"):
            if values["id"] in self.ids:
                self.problems.append(f"line {line}: duplicate id {values['id']}")
            self.ids.add(values["id"])
        if tag == "h1":
            self.h1_count += 1
        for key in ("href", "src", "poster"):
            if values.get(key):
                self.refs.append((line, values[key]))
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
    parsed = {}
    for rel in CHECK:
        checker = Checker()
        checker.feed((ROOT / rel).read_text(encoding="utf-8"))
        parsed[rel] = checker

    def check_ref(source, reference):
        url = urlsplit(reference)
        if url.scheme or url.netloc or not reference or reference.startswith("data:"):
            return None
        target = (ROOT / unquote(url.path).lstrip("/")) if url.path.startswith("/") else ROOT / source.parent / unquote(url.path)
        if not url.path:
            target = ROOT / source
        if target.is_dir():
            target /= "index.html"
        if not target.exists():
            return f"missing local target: {reference}"
        if url.fragment and target.suffix == ".html":
            relative = str(target.resolve().relative_to(ROOT))
            if relative not in parsed:
                other = Checker()
                other.feed(target.read_text(encoding="utf-8"))
                parsed[relative] = other
            if unquote(url.fragment) not in parsed[relative].ids:
                return f"missing anchor: {reference}"
        return None

    for rel in CHECK:
        checker = parsed[rel]
        html = (ROOT / rel).read_text(encoding="utf-8")
        if rel != "tools/og-card.html":
            if checker.h1_count != 1:
                checker.problems.append(f"expected one h1, found {checker.h1_count}")
            if not re.search(r'<link[^>]+rel="canonical"', html):
                checker.problems.append("missing canonical URL")
        for line, reference in checker.refs:
            problem = check_ref(pathlib.Path(rel), reference)
            if problem:
                checker.problems.append(f"line {line}: {problem}")
        for block in re.findall(r'<script[^>]+type="application/ld\+json"[^>]*>(.*?)</script>', html, re.S):
            try:
                json.loads(block)
            except json.JSONDecodeError as error:
                checker.problems.append(f"invalid JSON-LD: {error}")
        if checker.problems:
            failed = True
            print(f"✗ {rel}")
            for p in checker.problems:
                print(f"    {p}")
        else:
            print(f"✓ {rel}")

    for css in (ROOT / "assets").rglob("*.css"):
        for reference in re.findall(r"url\(\s*['\"]?([^)'\"]+)['\"]?\s*\)", css.read_text()):
            problem = check_ref(css.relative_to(ROOT), reference)
            if problem:
                failed = True
                print(f"✗ {css.relative_to(ROOT)}: {problem}")
    manifest = json.loads((ROOT / "site.webmanifest").read_text())
    for icon in manifest.get("icons", []):
        problem = check_ref(pathlib.Path("site.webmanifest"), icon["src"])
        if problem:
            failed = True
            print(f"✗ site.webmanifest: {problem}")
    if f"Sitemap: {SITE}sitemap.xml" not in (ROOT / "robots.txt").read_text():
        failed = True
        print("✗ robots.txt: missing sitemap reference")
    print("✓ Local HTML/CSS/manifest references and JSON-LD checked" if not failed else "✗ Fix the issues above")

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
