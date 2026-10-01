#!/usr/bin/env python3
"""Post changed beleaded.com URLs to IndexNow after a push to main."""
import json
import os
import re
import subprocess
import sys
import urllib.error
import urllib.request

HOST = "www.beleaded.com"
ROOT = os.environ.get("GITHUB_WORKSPACE") or "."
KEY_RE = re.compile(r"^[A-Za-z0-9-]{8,128}$")


def find_key():
    for name in os.listdir(ROOT):
        if not name.endswith(".txt"):
            continue
        key = name[:-4]
        if not KEY_RE.match(key):
            continue
        path = os.path.join(ROOT, name)
        with open(path, encoding="utf-8") as fh:
            body = fh.read().strip()
        if body == key:
            return key
    sys.exit("IndexNow key file not found at repo root. Expected <key>.txt whose body equals the key.")


def changed_files():
    before = os.environ.get("GITHUB_EVENT_BEFORE") or ""
    sha = os.environ.get("GITHUB_SHA") or "HEAD"
    if before and set(before) != {"0"}:
        spec = [before, sha]
    else:
        spec = ["HEAD~1", "HEAD"]
    out = subprocess.check_output(["git", "diff", "--name-only", *spec], cwd=ROOT, text=True)
    return [line.strip() for line in out.splitlines() if line.strip()]


def to_url(path):
    if not path.endswith(".html"):
        return None
    if path.startswith("assets/"):
        return None
    if path == "index.html":
        return f"https://{HOST}/"
    if path.endswith("/index.html"):
        slug = path[: -len("index.html")]
        return f"https://{HOST}/{slug}"
    if path == "404.html":
        return None
    return f"https://{HOST}/{path}"


def main():
    key = find_key()
    urls = []
    for path in changed_files():
        url = to_url(path)
        if url and url not in urls:
            urls.append(url)
    if not urls:
        print("No HTML URLs changed. Skipping IndexNow.")
        return
    payload = {
        "host": HOST,
        "key": key,
        "keyLocation": f"https://{HOST}/{key}.txt",
        "urlList": urls[:10000],
    }
    data = json.dumps(payload).encode()
    req = urllib.request.Request(
        "https://api.indexnow.org/indexnow",
        data=data,
        headers={"Content-Type": "application/json; charset=utf-8"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            print(f"IndexNow {resp.status} for {len(payload['urlList'])} URLs")
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", "replace")
        sys.exit(f"IndexNow failed: {exc.code} {detail}")


if __name__ == "__main__":
    main()
