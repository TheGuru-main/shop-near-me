"""Directive vocabulary: focus crawler / ranker on request type."""



DIRECTIVES = {
    "who": "entity_identity",
    "what": "definition_object",
    "where": "location",
    "when": "time",
    "why": "cause_purpose",
    "how": "method_process",
    "which": "selection_comparison",
    "whose": "ownership",
    "whom": "relationship_recipient",
    "how many": "quantity_count",
    "how much": "value_price",
    "how long": "duration",
    "how far": "distance",
    "how often": "frequency",
    "what kind of": "classification",
    "is": "verification",
    "are": "verification",
    "can": "capability",
    "does": "behaviour",
    "do": "behaviour",
    "did": "historical_action",
    "will": "scheduled_action",
    "and": "composition_multi_query",
    "or": "alternative",
    "not": "exclusion",
}


def detect_directive(query: str) -> str:
    q = (query or "").lower().strip()
    for phrase, intent in sorted(
        DIRECTIVES.items(), key=lambda x: len(x[0]), reverse=True
    ):
        if q == phrase or q.startswith(phrase + " "):
            return intent
    return "general"


def location_intent(directive: str) -> bool:
    """True when search should boost place / brotherhood."""
    return directive in {"location", "distance"}


def object_intent(directive: str) -> bool:
    return directive in {
        "definition_object",
        "classification",
        "value_price",
        "quantity_count",
        "general",
        "selection_comparison",
    }
