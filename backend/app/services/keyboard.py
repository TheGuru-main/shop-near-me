"""
Shop Near Me – GSP Keyboard / Input Mapping
===========================================

Language-aware key maps + GSP placement inputs.

Owns:
    - multi-language keyboard layouts
    - character -> (row, col)
    - Lsum / keyboard Ssum
    - first-letter column c
    - phone UID digit-sum S (user / message / object owner)
    - gsp_place / start_row
    - elastic_cloud
    - user / message-box / full-text parameter packs

Does NOT own:
    - tokenization (token_grids)
    - ranking / crawler / feed
    - DB models
    - on-screen UI (frontend later)
"""

from __future__ import annotations

import hashlib
import secrets
import unicodedata
from typing import Any, Dict, List, Optional, Tuple


# =============================================================================
# GRID CONSTANTS
# =============================================================================

ENGLISH_COLUMNS = 26
KEYBOARD_COLUMNS = 36
GRID_ROWS = 64

DEFAULT_K = 5
DEFAULT_D = 8


# =============================================================================
# KEYMAPS (layout rows → sequential columns; digits on row 3, cols 26–35)
# =============================================================================

_KEYMAPS: Dict[str, List[str]] = {
    "en": [
        "qwertyuiop",
        "asdfghjkl",
        "zxcvbnm",
    ],
    "fr": [
        "azertyuiop",
        "qsdfghjklm",
        "wxcvbn",
    ],
    "de": [
        "qwertzuiop",
        "asdfghjkl",
        "yxcvbnm",
        "äöüß",
    ],
    "es": [
        "qwertyuiop",
        "asdfghjkl",
        "zxcvbnm",
        "ñáéíóúü",
    ],
    "pt": [
        "qwertyuiop",
        "asdfghjkl",
        "zxcvbnm",
        "áàãâçéêíóôõúü",
    ],
    "ar": [
        "ضصثقفغعهخح",
        "شسيبلاتنمك",
        "ئءؤرلاىةوز",
    ],
    "zh": [
        "bpmfdtnlgkhjqxz",
        "aoeiuü",
        "nenangengong",
    ],
    "yo": [
        "qwertyuiop",
        "asdfghjkl",
        "zxcvbnm",
        "ẹọṣń",
    ],
    "ig": [
        "qwertyuiop",
        "asdfghjkl",
        "zxcvbnm",
        "ịọụñ",
    ],
    "ha": [
        "qwertyuiop",
        "asdfghjkl",
        "zxcvbnm",
        "ɓɗƙƴ",
    ],
    "sw": [
        "qwertyuiop",
        "asdfghjkl",
        "zxcvbnm",
    ],
    "tr": [
        "qwertyuiopğü",
        "asdfghjklşi",
        "zxcvbnmöç",
    ],
    "id": [
        "qwertyuiop",
        "asdfghjkl",
        "zxcvbnm",
    ],
    "it": [
        "qwertyuiop",
        "asdfghjkl",
        "zxcvbnm",
        "àèéìíîòóùú",
    ],
    "hi": [
        "कखगघङचछजझञ",
        "टठडढणतथदधन",
        "पफबभमयरलवशषसह",
    ],
}

_DIGITS_ROW = "0123456789"

_LANGUAGE_ALIASES = {
    "english": "en",
    "eng": "en",
    "french": "fr",
    "fra": "fr",
    "fre": "fr",
    "german": "de",
    "deu": "de",
    "ger": "de",
    "arabic": "ar",
    "ara": "ar",
    "chinese": "zh",
    "zho": "zh",
    "cmn": "zh",
    "yoruba": "yo",
    "yor": "yo",
    "igbo": "ig",
    "ibo": "ig",
    "hausa": "ha",
    "hau": "ha",
    "spanish": "es",
    "spa": "es",
    "portuguese": "pt",
    "por": "pt",
    "swahili": "sw",
    "swa": "sw",
    "turkish": "tr",
    "tur": "tr",
    "indonesian": "id",
    "ind": "id",
    "malay": "id",
    "msa": "id",
    "ms": "id",
    "italian": "it",
    "ita": "it",
    "hindi": "hi",
    "hin": "hi",
    "pcm": "en",  # Nigerian Pidgin → English keys
}


def resolve_language(lang: str | None = "en") -> str:
    if not lang:
        return "en"
    value = lang.strip().lower().replace("_", "-").split("-")[0]
    value = _LANGUAGE_ALIASES.get(value, value)
    if value in _KEYMAPS:
        return value
    return "en"


# =============================================================================
# KEYMAP BUILDERS
# =============================================================================

def get_keymap(lang: str = "en") -> Dict[str, Tuple[int, int]]:
    """
    character -> (keyboard_row, column)

    Letters fill columns in layout order.
    Digits: row=3, columns=26..35 (36-col board).
    """
    lang = resolve_language(lang)
    rows = _KEYMAPS.get(lang, _KEYMAPS["en"])
    keymap: Dict[str, Tuple[int, int]] = {}
    column = 0

    for row_index, row in enumerate(rows):
        for char in row:
            char = char.lower()
            if char in keymap:
                continue
            keymap[char] = (row_index, column)
            column += 1

    for offset, digit in enumerate(_DIGITS_ROW):
        keymap[digit] = (3, 26 + offset)

    return keymap


def get_language_alphabet(lang: str = "en") -> List[str]:
    lang = resolve_language(lang)
    rows = _KEYMAPS.get(lang, _KEYMAPS["en"])
    alphabet: List[str] = []
    for row in rows:
        for char in row:
            char = char.lower()
            if char not in alphabet:
                alphabet.append(char)
    return alphabet


def get_language_column_count(lang: str = "en") -> int:
    return len(get_language_alphabet(lang))


def supported_keyboard_languages() -> List[dict[str, Any]]:
    out = []
    for code in _KEYMAPS:
        alpha = get_language_alphabet(code)
        out.append({
            "code": code,
            "A": len(alpha),
            "keyboard_columns": KEYBOARD_COLUMNS,
            "gsp_english_columns": ENGLISH_COLUMNS,
        })
    return out


# =============================================================================
# NORMALISE (keyboard-side; tokenizer still owns full stem pipeline)
# =============================================================================

def normalise(text: str, lang: str = "en") -> str:
    lang = resolve_language(lang)
    text = (text or "").lower()
    if lang == "en":
        text = "".join(
            ch
            for ch in unicodedata.normalize("NFKD", text)
            if not unicodedata.combining(ch)
        )
        for suffix in ("ing", "ed", "s", "ly", "ment", "ness"):
            if text.endswith(suffix) and len(text) > len(suffix) + 2:
                text = text[: -len(suffix)]
                break
    return text


def character_position(char: str, lang: str = "en") -> Optional[Tuple[int, int]]:
    if not char:
        return None
    return get_keymap(lang).get(char.lower())


# =============================================================================
# Lsum / Ssum / c
# =============================================================================

def calculate_lsum(word: str, lang: str = "en") -> int:
    """Sum of keyboard *row* indices of mapped characters."""
    keymap = get_keymap(lang)
    return sum(
        keymap[ch][0]
        for ch in (word or "").lower()
        if ch in keymap
    )


def calculate_ssum(word: str, lang: str = "en") -> int:
    """
    Sum of keyboard *column* indices.
    For word/key math only — NOT full-text S and NOT phone UID S.
    """
    keymap = get_keymap(lang)
    return sum(
        keymap[ch][1]
        for ch in (word or "").lower()
        if ch in keymap
    )


def first_letter_index(word: str, lang: str = "en") -> int:
    """
    c = keyboard column of first mapped character.
    Not modulo-reduced here (caller may % C for English GSP).
    """
    if not word:
        return 0
    keymap = get_keymap(lang)
    first = word[0].lower()
    if first in keymap:
        return keymap[first][1]
    return 0


# =============================================================================
# PHONE / UID  (Shop Near Me: phone is the only UID)
# =============================================================================

def normalise_uid(uid: str | int | None) -> str:
    """Strip to digits only (+234... → 234...)."""
    return "".join(ch for ch in str(uid or "") if ch.isdigit())


def calculate_uid_ssum(uid: str | int | None) -> int:
    """
    Canonical Shop Near Me S for users / merchants / message boxes / objects:

        S = sum of decimal digits of phone UID
    """
    numeric = normalise_uid(uid)
    if not numeric:
        return 0
    return sum(int(d) for d in numeric)


def generate_randomized_uid(uid: str | int | None, length: int = 32) -> str:
    """Placement-only material for full-text mode (does not replace phone identity)."""
    uid_string = normalise_uid(uid)
    nonce = secrets.token_hex(16)
    material = f"{uid_string}:{nonce}".encode("utf-8")
    digest = hashlib.sha256(material).hexdigest()
    if length <= 0:
        return digest
    return digest[:length]


def calculate_full_text_s(uid: str | int | None) -> int:
    """S from randomized hex UID (full-text path only)."""
    randomized = generate_randomized_uid(uid)
    return sum(int(ch, 16) for ch in randomized if ch in "0123456789abcdef")


def calculate_placement_s(uid: str | int | None, mode: str = "user") -> int:
    mode = (mode or "user").strip().lower()
    if mode in {"user", "message", "message_box", "object", "product", "merchant"}:
        return calculate_uid_ssum(uid)
    if mode == "full_text":
        return calculate_full_text_s(uid)
    raise ValueError(f"Unsupported placement mode: {mode}")


# =============================================================================
# GSP CORE
# =============================================================================

def start_row(Lsum: int, Ssum: int, R: int = GRID_ROWS) -> int:
    """start_row = ((L + S - 1) % R) + 1"""
    return ((int(Lsum) + int(Ssum) - 1) % R) + 1


def gsp_place(
    Lsum: int,
    Ssum: int,
    c: int,
    K: int = DEFAULT_K,
    D: int = DEFAULT_D,
    C: int = ENGLISH_COLUMNS,
    R: int = GRID_ROWS,
) -> dict[str, Any]:
    """
    Standard GSP:

        start_row = ((L + S - 1) % R) + 1
        row_k     = ((start_row - 1 + k*D) % R) + 1
        col_k     = (c + k) % C
    """
    sr = start_row(Lsum, Ssum, R)
    cells = []
    for k in range(K):
        row = ((sr - 1 + k * D) % R) + 1
        col = (int(c) + k) % C
        cells.append({"col": col, "row": row, "k": k})
    return {
        "start_row": sr,
        "primary_cell": cells[0] if cells else None,
        "cells": cells,
        "L": int(Lsum),
        "S": int(Ssum),
        "c": int(c),
        "K": K,
        "D": D,
        "C": C,
        "R": R,
    }


def elastic_cloud(
    L: int,
    S: int,
    c: int,
    radius: int = 1,
    first_letter_radius: int = 1,
    C: int = ENGLISH_COLUMNS,
    R: int = GRID_ROWS,
) -> list[dict[str, int]]:
    """Neighbour cells for typo-tolerant lookup."""
    cloud: set[tuple[int, int]] = set()
    for dc in range(-first_letter_radius, first_letter_radius + 1):
        c2 = (c + dc) % C
        for dL in range(-radius, radius + 1):
            for dS in range(-radius, radius + 1):
                if dL == 0 and dS == 0 and dc == 0:
                    continue
                sr = start_row(L + dL, S + dS, R)
                cloud.add((c2, sr))
    cloud.add((c % C, start_row(L, S, R)))
    return [{"col": col, "row": row} for col, row in cloud]


# =============================================================================
# PARAMETER PACKS (Shop Near Me entities)
# =============================================================================

def user_placement_parameters(
    name: str,
    phone_uid: str | int,
    lang: str = "en",
) -> dict[str, Any]:
    """
    Buyer / merchant / driver / emergency identity on the grid.

    L = keyboard row-sum of normalised name
    S = digit sum of phone UID
    c = first-letter keyboard column
    """
    lang = resolve_language(lang)
    n = normalise(name, lang)
    L = calculate_lsum(n, lang)
    S = calculate_uid_ssum(phone_uid)
    c = first_letter_index(n, lang)
    place = gsp_place(L, S, c)
    return {
        "mode": "user",
        "name": name,
        "phone_uid": normalise_uid(phone_uid),
        "language": lang,
        "L": L,
        "S": S,
        "c": c,
        "placement": place,
    }


def message_box_parameters(
    name: str,
    phone_uid: str | int,
    lang: str = "en",
) -> dict[str, Any]:
    """Inbox / thread anchor — same S rule as user (phone digit sum)."""
    params = user_placement_parameters(name, phone_uid, lang)
    params["mode"] = "message_box"
    return params


def object_placement_parameters(
    object_name: str,
    owner_phone_uid: str | int,
    lang: str = "en",
) -> dict[str, Any]:
    """
    Product / service / listing object (search major spine).

    L, c from object title; S from owner phone UID.
    """
    lang = resolve_language(lang)
    n = normalise(object_name, lang)
    L = calculate_lsum(n, lang)
    S = calculate_uid_ssum(owner_phone_uid)
    c = first_letter_index(n, lang)
    place = gsp_place(L, S, c)
    return {
        "mode": "object",
        "object_name": object_name,
        "owner_phone_uid": normalise_uid(owner_phone_uid),
        "language": lang,
        "L": L,
        "S": S,
        "c": c,
        "placement": place,
    }


def full_text_parameters(
    text: str,
    phone_uid: str | int,
    lang: str = "en",
) -> dict[str, Any]:
    """Optional full-text pack; S from randomized UID, not word counts."""
    lang = resolve_language(lang)
    n = normalise(text, lang)
    L = calculate_lsum(n, lang)
    S = calculate_full_text_s(phone_uid)
    c = first_letter_index(n, lang)
    place = gsp_place(L, S, c)
    return {
        "mode": "full_text",
        "language": lang,
        "L": L,
        "S": S,
        "c": c,
        "placement": place,
        "randomized_uid": generate_randomized_uid(phone_uid),
    }


# =============================================================================
# BRIDGE HELPERS FOR token_grids / search
# =============================================================================

def gsp_inputs_from_text(token: str, lang: str = "en") -> dict[str, int]:
    """What the upgraded tokenizer expects via keyboard.calculate_lsum/ssum + c."""
    lang = resolve_language(lang)
    n = normalise(token, lang)
    return {
        "Lsum": calculate_lsum(n, lang),
        "Ssum": calculate_ssum(n, lang),
        "c": first_letter_index(n, lang),
    }


def place_user(name: str, phone: str, lang: str = "en") -> dict[str, Any]:
    return user_placement_parameters(name, phone, lang)


def place_object(title: str, owner_phone: str, lang: str = "en") -> dict[str, Any]:
    return object_placement_parameters(title, owner_phone, lang)
