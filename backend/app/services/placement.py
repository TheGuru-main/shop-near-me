def digit_sum(n: int | str) -> int:
    return sum(int(ch) for ch in str(n) if ch.isdigit())


def norm_name(s: str) -> str:
    return "".join((s or "").split()).lower()


def name_len(s: str) -> int:
    return len(norm_name(s)) or 1


def first_letter_index(s: str) -> int:
    n = norm_name(s)
    if not n:
        return 0
    ch = n[0]
    if "a" <= ch <= "z":
        return ord(ch) - ord("a")
    return 0


def start_row(L: int, S: int, R: int = 64) -> int:
    return ((L + S - 1) % R) + 1


def build_location_ladder(
    continent_name: str,
    continent_id: str,
    country: str,
    region: str,
    city: str,
    community: str,
    primary_location: str,
) -> dict:
    """
    Hierarchy: L = entity name length; S = digit sum of parent-derived UID.
    Continent UID = continent_id (001-007).
    """
    cont_L = name_len(continent_name)
    cont_uid = continent_id or "000"
    cont_S = digit_sum(cont_uid)

    country_L = name_len(country)
    country_S = digit_sum(cont_L)  # UID = continent name length count
    country_row = start_row(country_L, country_S, R=15)
    country_c = first_letter_index(country)

    region_L = name_len(region)
    region_S = digit_sum(country_L)
    region_row = start_row(region_L, region_S, R=21)
    region_c = first_letter_index(region)

    city_L = name_len(city)
    city_S = digit_sum(region_L)
    city_row = start_row(city_L, city_S, R=15)
    city_c = first_letter_index(city)

    community_L = name_len(community)
    community_S = digit_sum(city_L)
    community_row = start_row(community_L, community_S, R=10)
    community_c = first_letter_index(community)

    # Primary: c from street letter; L from city
    primary_c = _street_letter_index(primary_location)
    primary_L = city_L
    primary_S = digit_sum(city_L)
    primary_row = start_row(primary_L, primary_S, R=2)

    return {
        "continent": {
            "id": continent_id,
            "name": continent_name,
            "uid": cont_uid,
            "L": cont_L,
            "S": cont_S,
        },
        "country": {
            "name": country,
            "L": country_L,
            "S": country_S,
            "c": country_c,
            "row": country_row,
            "grid": "26x15",
        },
        "region": {
            "name": region,
            "L": region_L,
            "S": region_S,
            "c": region_c,
            "row": region_row,
            "grid": "26x21",
        },
        "city": {
            "name": city,
            "L": city_L,
            "S": city_S,
            "c": city_c,
            "row": city_row,
            "grid": "26x15",
        },
        "community": {
            "name": community,
            "L": community_L,
            "S": community_S,
            "c": community_c,
            "row": community_row,
            "grid": "26x10",
        },
        "primary": {
            "text": primary_location,
            "L": primary_L,
            "S": primary_S,
            "c": primary_c,
            "row": primary_row,
            "grid": "2x2_local",
        },
    }


def _street_letter_index(primary: str) -> int:
    """e.g. '27, Dabu street, Eneka' -> D -> 3"""
    parts = (primary or "").replace(",", " ").split()
    for p in parts:
        if p and p[0].isalpha():
            return first_letter_index(p)
    return first_letter_index(primary)


def messaging_start_row(name: str, phone: str) -> int:
    """Inbox anchor: L=name length, S=digit sum of phone digits, R=64."""
    from app.services.phone import digit_sum as ds
    from app.services.phone import phone_digits

    L = name_len(name)
    S = ds(phone_digits(phone))
    return start_row(L, S, R=64)
