#!/usr/bin/env python3
"""Flag 8-plus-word sentences that are a 0.8 or higher match to another page.

Scope: visible text inside <main> on the target page, compared with visible
text on every other HTML page in the repo (script, style, and svg removed).
Similarity is difflib.SequenceMatcher.ratio on lowercase alphanumeric text.

Exceptions, matched on the full normalized sentence:
- programs start from $2,000 a month
- target up to 25,000 new contacts a month
"""

from __future__ import annotations

import argparse
import re
import sys
from difflib import SequenceMatcher
from pathlib import Path

def normalize(text: str) -> str:
    text = text.lower().replace("\u2019", "'").replace("\u2018", "'")
    text = re.sub(r"[^a-z0-9$%+\s]", " ", text)
    return re.sub(r"\s+", " ", text).strip()


EXCEPTIONS = {
    normalize(line)
    for line in (
        "Programs start from $2,000 a month",
        "Target up to 25,000 new contacts a month",
    )
}


def visible_chunks(html: str) -> str:
    html = re.sub(r"<script\b[\s\S]*?</script>", " ", html, flags=re.I)
    html = re.sub(r"<style\b[\s\S]*?</style>", " ", html, flags=re.I)
    html = re.sub(r"<svg\b[\s\S]*?</svg>", " ", html, flags=re.I)
    # Block elements are sentence boundaries. Buttons and email lines
    # that sit side by side are separate lines, not one sentence.
    html = re.sub(
        r"</?(?:p|li|h[1-6]|td|th|caption|dt|dd|summary|div|tr|blockquote|figcaption|button)\b[^>]*>",
        ". ",
        html,
        flags=re.I,
    )
    html = re.sub(r"<[^>]+>", " ", html)
    html = html.replace("&amp;", "&").replace("&nbsp;", " ")
    return re.sub(r"\s+", " ", html)


def sentences(text: str) -> list[str]:
    parts = re.split(r"(?<=[.!?])\s+", text.strip())
    out = []
    for part in parts:
        part = part.strip()
        if not part:
            continue
        norm = normalize(part)
        if len(norm.split()) >= 8 and norm not in EXCEPTIONS:
            out.append(norm)
    return out


def main_text(html: str) -> str:
    match = re.search(r"<main\b[\s\S]*?</main>", html, flags=re.I)
    return visible_chunks(match.group(0) if match else html)


def collect(root: Path, skip: Path) -> list[tuple[str, str]]:
    corpus: list[tuple[str, str]] = []
    for path in root.rglob("*.html"):
        if path.resolve() == skip.resolve():
            continue
        text = visible_chunks(path.read_text(errors="replace"))
        for sentence in sentences(text):
            corpus.append((str(path.relative_to(root)), sentence))
    return corpus


def check(target: Path, root: Path) -> list[str]:
    html = target.read_text(errors="replace")
    own = sentences(main_text(html))
    corpus = collect(root, target)
    failures = []
    for sentence in own:
        words = set(sentence.split())
        best = 0.0
        where = ""
        other = ""
        for path, candidate in corpus:
            shared = words & set(candidate.split())
            if len(shared) < 5:
                continue
            union = words | set(candidate.split())
            if len(shared) / len(union) < 0.45:
                continue
            ratio = SequenceMatcher(None, sentence, candidate).ratio()
            if ratio > best:
                best = ratio
                where = path
                other = candidate
        if best >= 0.8:
            failures.append(
                f"{best:.3f}\n  NEW: {sentence}\n  HIT: {where}\n  WAS: {other}"
            )
    return failures


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("target", type=Path)
    parser.add_argument("--root", type=Path, default=Path("."))
    args = parser.parse_args()
    target = args.target.resolve()
    root = args.root.resolve()
    failures = check(target, root)
    own_count = len(sentences(main_text(target.read_text(errors="replace"))))
    print(f"Target: {target.relative_to(root)}")
    print(f"Sentences checked (8 or more words, exceptions removed): {own_count}")
    print("Method: SequenceMatcher.ratio >= 0.8 against every other HTML page")
    print("Exceptions: the two approved Be Leaded lines")
    if not failures:
        print("RESULT: PASS")
        return 0
    print(f"RESULT: FAIL ({len(failures)})")
    print("\n\n".join(failures))
    return 1


if __name__ == "__main__":
    sys.exit(main())
