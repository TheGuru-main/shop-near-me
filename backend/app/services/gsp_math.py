"""
GSP placement family + elastic cloud + progressive / cumulative jump.
R default 64, C default 26 for classic letter grid; relationship uses 220 cols separately.
"""

from __future__ import annotations


def digit_sum(n: int | str) -> int:
    return sum(int(ch) for ch in str(n) if ch.isdigit())


def norm_name(s: str) -> str:
    return "".join((s or "").split()).lower()


def name_len(s: str) -> int:
    return len(norm_name(s)) or 1


def first_letter_index(s: str) -> int:
    n = norm_name(s)
    if not n or not ("a" <= n[0] <= "z"):
        return 0
    return ord(n[0]) - ord("a")


def start_row(L: int, S: int, R: int = 64) -> int:
    return ((L + S - 1) % R) + 1


# --- Standard GSP (rows from original start; cols cumulative +1) ---

def standard_gsp(L: int, S: int, c: int, K: int = 5, D: int = 8, C: int = 26, R: int = 64) -> list[dict]:
    sr = start_row(L, S, R)
    cells = []
    col = c % C
    for k in range(K):
        row = ((sr - 1 + k * D) % R) + 1
        if k > 0:
            col = (col + 1) % C
        cells.append({"k": k, "col": col if k > 0 else c % C, "row": row})
    # fix col0
    if cells:
        cells[0]["col"] = c % C
        prev = c % C
        for k in range(1, K):
            prev = (prev + 1) % C
            cells[k]["col"] = prev
    return cells


# --- Progressive GSP (rows and cols cumulative) ---

def progressive_gsp(L: int, S: int, c: int, K: int = 5, D: int = 8, C: int = 26, R: int = 64) -> list[dict]:
    sr = start_row(L, S, R)
    cells = []
    row = sr
    col = c % C
    for k in range(K):
        if k == 0:
            cells.append({"k": 0, "col": col, "row": row})
        else:
            row = ((row - 1 + D) % R) + 1
            col = (col + 1) % C
            cells.append({"k": k, "col": col, "row": row})
    return cells


# --- Cumulative jump 0,2,4,6,8 ---

def cumulative_jump_gsp(L: int, S: int, c: int, K: int = 5, D: int = 8, C: int = 26, R: int = 64) -> list[dict]:
    sr = start_row(L, S, R)
    cells = []
    row = sr
    col = c % C
    for k in range(K):
        if k == 0:
            cells.append({"k": 0, "col": col, "row": row})
        else:
            jump = 2 * k
            row = ((row - 1 + jump * D) % R) + 1
            col = (col + jump) % C
            cells.append({"k": k, "col": col, "row": row})
    return cells


# --- Backward perturbation (D=1, K=5): walk back from primary ---

def backward_perturb(
    L: int,
    S: int,
    c: int,
    K: int = 5,
    D: int = 1,
    C: int = 26,
    R: int = 64,
) -> list[dict]:
    sr = start_row(L, S, R)
    cells = []
    for k in range(K):
        row = ((sr - 1 - k * D) % R) + 1
        col = (c - k) % C
        cells.append({"k": k, "col": col, "row": row, "mode": "backward_perturb"})
    return cells


# --- Elastic cloud (typo neighbor cells) ---

def elastic_cloud(
    L: int,
    S: int,
    c: int,
    radius: int = 1,
    first_letter_radius: int = 1,
    C: int = 26,
    R: int = 64,
) -> list[dict]:
    cloud: set[tuple[int, int]] = set()
    for dc in range(-first_letter_radius, first_letter_radius + 1):
        c2 = (c + dc + C) % C
        for dL in range(-radius, radius + 1):
            for dS in range(-radius, radius + 1):
                if dL == 0 and dS == 0 and dc == 0:
                    continue
                L2 = L + dL
                S2 = S + dS
                sr = start_row(L2, S2, R)
                cloud.add((c2, sr))
    base_sr = start_row(L, S, R)
    cloud.add((c % C, base_sr))
    return [{"col": col, "row": row} for col, row in cloud]


# --- Relationship walk params (locked) ---
# Forward relationship walk: D=5, large K for crawl budget
# Perturbation: D=1, K=5

REL_WALK_D = 5
REL_WALK_K = 250
PERTURB_D = 1
PERTURB_K = 5
