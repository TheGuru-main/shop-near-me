"""
Shop Near Me – Tokenizer (port)
================================

Letter grid A×1 · Word grid row %26 · c = first letter (unreduced).
Does not own ranking, DB, or crawler walk.
"""

from __future__ import annotations

import re
from typing import Any

try:
    from app.services import keyboard as kb
except ImportError:
    kb = None

ALPHABETS: dict[str, str] = {
    "en": "abcdefghijklmnopqrstuvwxyz",
    "fr": "abcdefghijklmnopqrstuvwxyzàâäéèêëïîôùûüç",
    "de": "abcdefghijklmnopqrstuvwxyzäöüß",
    "es": "abcdefghijklmnopqrstuvwxyzñáéíóúü",
    "pt": "abcdefghijklmnopqrstuvwxyzáàãâçéêíóôõúü",
    "ar": "ابتثجحخدذرزسشصضطظعغفقكلمنهويءآأؤإئىة",
    "zh": "abcdefghijklmnopqrstuvwxyz",
    "yo": "abcdefghijklmnopqrstuvwxyzáàéèẹíìóòọúùṣń",
    "ha": "abcdefghijklmnopqrstuvwxyzɓɗƙƴ",
    "ig": "abcdefghijklmnopqrstuvwxyzịñọụ",
    "sw": "abcdefghijklmnopqrstuvwxyz",
    "tr": "abcdefghijklmnopqrstuvwxyzçğıöşü",
    "id": "abcdefghijklmnopqrstuvwxyz",
    "it": "abcdefghijklmnopqrstuvwxyzàèéìíîòóùú",
    "hi": "अआइईउऊऋएऐओऔकखगघचछजझटठडढणतथदधनपफबभमयरलवशषसह",
    "default": "abcdefghijklmnopqrstuvwxyz",
}

LANG_ALIASES = {
    "eng": "en", "fra": "fr", "fre": "fr", "deu": "de", "ger": "de",
    "spa": "es", "por": "pt", "ara": "ar", "zho": "zh", "cmn": "zh",
    "yor": "yo", "ibo": "ig", "hau": "ha", "swa": "sw", "tur": "tr",
    "ind": "id", "msa": "id", "ms": "id", "ita": "it", "hin": "hi",
    "pcm": "en",
}

PREFIXES = ("un", "re", "pre", "mis", "dis", "over", "under", "out")
SUFFIXES = (
    "tions", "tion", "ings", "ing", "edly", "ed", "es", "s",
    "ly", "ness", "ment", "able", "ible", "ers", "er", "ors", "or",
)

LETTER_GRID_R = 1
WORD_GRID_R = 26
NAME_OBJECT_COLS = 46  # local-letter room on relationship name/object bands
PLACE_COLS = 26

_FOLD = str.maketrans({
    "á": "a", "à": "a", "â": "a", "ä": "a", "ã": "a",
    "é": "e", "è": "e", "ê": "e", "ë": "e",
    "í": "i", "ì": "i", "î": "i", "ï": "i",
    "ó": "o", "ò": "o", "ô": "o", "ö": "o", "õ": "o",
    "ú": "u", "ù": "u", "û": "u", "ü": "u",
    "ç": "c", "ñ": "n", "ş": "s", "ș": "s", "ț": "t",
    "ğ": "g", "ı": "i", "ß": "ss",
})


def normalize_lang(lang: str | None) -> str:
    if not lang:
        return "en"
    code = str(lang).strip().lower().replace("_", "-").split("-")[0]
    code = LANG_ALIASES.get(code, code)
    if code in ALPHABETS and code != "default":
        return code
    return "en"


def alphabet_for(lang: str | None) -> str:
    return ALPHABETS.get(normalize_lang(lang), ALPHABETS["default"])


def fold_ascii(s: str) -> str:
    return (s or "").lower().translate(_FOLD)


def stem_token(token: str, lang: str = "en") -> str:
    lang = normalize_lang(lang)
    alpha = alphabet_for(lang)
    w = "".join(ch for ch in (token or "").lower() if ch.isalnum() or ch in alpha)
    if len(w) < 4:
        return w
    for pref in sorted(PREFIXES, key=len, reverse=True):
        if w.startswith(pref) and len(w) - len(pref) >= 3:
            w = w[len(pref):]
            break
    for suf in sorted(SUFFIXES, key=len, reverse=True):
        if w.endswith(suf) and len(w) - len(suf) >= 3:
            w = w[: -len(suf)]
            break
    return w or (token or "").lower()


def alphabet_index(ch: str, lang: str = "en") -> int | None:
    alpha = alphabet_for(lang)
    ch = (ch or "").lower()
    if ch in alpha:
        return alpha.index(ch)
    en = ALPHABETS["en"]
    folded = fold_ascii(ch)
    if folded and folded[0] in en:
        return en.index(folded[0])
    return None


def letter_index(ch: str, lang: str = "en") -> int | None:
    """A×1 column; row is always 0 (LETTER_GRID_R = 1)."""
    return alphabet_index(ch, lang)


def first_letter_index(token: str, lang: str = "en") -> int:
    """c — constant first-letter index (not word-row reduced)."""
    for ch in (token or "").lower():
        idx = alphabet_index(ch, lang)
        if idx is not None:
            return idx
    return 0


def letter_cells(token: str, lang: str = "en") -> list[int]:
    out = []
    for ch in (token or "").lower():
        i = letter_index(ch, lang)
        if i is not None:
            out.append(i)
    return out


def _local_lsum(stem: str) -> int:
    return sum(ord(ch) for ch in stem) if stem else 0


def _local_ssum(stem: str) -> int:
    return sum(ord(ch) for ch in stem) % 997 if stem else 0


def word_cell(token: str, lang: str = "en") -> dict[str, Any]:
    lang = normalize_lang(lang)
    stem = stem_token(token, lang)
    A = len(alphabet_for(lang))
    L = max(len(stem), 1)
    c = first_letter_index(stem or token, lang)

    if kb is not None:
        try:
            Lsum = kb.calculate_lsum(stem or token, lang)
            Ssum = kb.calculate_ssum(stem or token, lang)
        except Exception:
            Lsum, Ssum = _local_lsum(stem), _local_ssum(stem)
    else:
        Lsum, Ssum = _local_lsum(stem), _local_ssum(stem)

    # Operational word row always %26; metadata keeps linguistic A
    row = (L + L) % WORD_GRID_R
    # Name/object relationship column room: map into 0..45
    col46 = c % NAME_OBJECT_COLS

    return {
        "stem": stem,
        "L": L,
        "uID": L,
        "word_S": L,
        "Lsum": Lsum,
        "Ssum": Ssum,
        "c": c,
        "col": col46,
        "row": row,
        "grid": f"{A}x{A}",
        "word_grid_r": WORD_GRID_R,
        "name_object_cols": NAME_OBJECT_COLS,
    }


def gsp_inputs(token: str, lang: str = "en") -> dict[str, int]:
    cell = word_cell(token, lang)
    return {"Lsum": cell["Lsum"], "Ssum": cell["Ssum"], "c": cell["c"]}


def gsp_start_row(token: str, lang: str = "en", R: int = 64) -> int:
    g = gsp_inputs(token, lang)
    if kb is not None and hasattr(kb, "start_row"):
        return kb.start_row(g["Lsum"], g["Ssum"], R)
    return ((g["Lsum"] + g["Ssum"] - 1) % R) + 1


def tokenize(text: str, lang: str = "en") -> list[dict[str, Any]]:
    lang = normalize_lang(lang)
    parts = re.findall(r"\w+", (text or "").lower(), flags=re.UNICODE)
    tokens = []
    for part in parts:
        stem = stem_token(part, lang)
        letters = letter_cells(stem or part, lang)
        w = word_cell(stem or part, lang)
        tokens.append({
            "original": part,
            "stem": stem,
            "lang": lang,
            "letter": letters,
            "letter_grid": [{"col": i, "row": 0} for i in letters],
            "word": w,
            "c": w["c"],
            "gsp_start_row": gsp_start_row(stem or part, lang),
        })
    return tokens


def letter_score(query_tokens: list[dict], doc_text: str, lang: str = "en") -> float:
    doc_toks = tokenize(doc_text, lang)
    if not query_tokens or not doc_toks:
        return 0.0
    score = 0.0
    for qt in query_tokens:
        q_letters = qt.get("letter") or []
        if not q_letters:
            continue
        for dt in doc_toks:
            d_letters = dt.get("letter") or []
            i = j = matches = 0
            while i < len(q_letters) and j < len(d_letters):
                if q_letters[i] == d_letters[j]:
                    matches += 1
                    i += 1
                j += 1
            score += (matches / max(len(q_letters), 1)) * 10
    return score


def word_score(query_tokens: list[dict], doc_text: str, lang: str = "en") -> float:
    doc_toks = tokenize(doc_text, lang)
    if not query_tokens or not doc_toks:
        return 0.0
    score = 0.0
    doc_cells = {(t["word"]["col"], t["word"]["row"], t["stem"]) for t in doc_toks}
    for qt in query_tokens:
        w, stem = qt["word"], qt["stem"]
        for col, row, d_stem in doc_cells:
            if stem == d_stem:
                score += 25
            elif (w["col"], w["row"]) == (col, row):
                score += 15
            elif w["col"] == col or w["row"] == row:
                score += 5
    return score


def full_text_placement_config() -> dict[str, int]:
    return {"forward_d": 5, "backward_d": 1, "K": 5, "R": 64, "C_name_object": 46, "C_place": 26}


def supported_languages() -> list[dict[str, Any]]:
    out = []
    for code, alpha in ALPHABETS.items():
        if code == "default":
            continue
        A = len(alpha)
        out.append({
            "code": code,
            "A": A,
            "letter_grid": f"{A}x1",
            "word_grid": f"{A}x{A}",
            "word_row_mod": WORD_GRID_R,
            "name_object_cols": NAME_OBJECT_COLS,
        })
    return out
