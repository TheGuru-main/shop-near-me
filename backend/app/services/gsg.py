import math


def gsg_at(lat: float, lon: float, cell: float = 0.001) -> dict:
    gsg_x = math.floor((lon + 180.0) / cell)
    gsg_y = math.floor((lat + 90.0) / cell)
    L = int(gsg_y % 100000)
    S = int(gsg_x % 100000)
    c = int((gsg_x + gsg_y) % 26)
    letter = chr(ord("A") + c) if 0 <= c < 26 else "?"
    return {
        "cell": cell,
        "gsg_x": gsg_x,
        "gsg_y": gsg_y,
        "L": L,
        "S": S,
        "c": c,
        "letter": letter,
    }
