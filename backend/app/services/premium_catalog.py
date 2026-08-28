"""Locked Shop Near Me premium catalog (₦). Coming-soon flags respected."""

from __future__ import annotations

from typing import Any

# type: one_time | monthly | yearly
# status: active | coming_soon
PLANS: list[dict[str, Any]] = [
    {
        "code": "verified_badge",
        "name": "Verified Merchant Badge",
        "price": 4000,
        "currency": "NGN",
        "type": "one_time",
        "status": "active",
        "description": "Verified badge",
    },
    {
        "code": "priority_support",
        "name": "Priority Support",
        "price": 5500,
        "currency": "NGN",
        "type": "monthly",
        "status": "active",
        "description": "Community/city morning front-row boost (1x2 FIFO grid)",
    },
    {
        "code": "premium_calculator",
        "name": "Premium Calculator",
        "price": 10000,
        "currency": "NGN",
        "type": "yearly",
        "status": "active",
        "description": "VAT, exchange rate, discount before checkout",
    },
    {
        "code": "einvoice_300",
        "name": "E-Invoice 300/mo",
        "price": 3000,
        "currency": "NGN",
        "type": "monthly",
        "status": "active",
        "capacity": 300,
        "family": "einvoice",
    },
    {
        "code": "einvoice_500",
        "name": "E-Invoice 500/mo",
        "price": 5000,
        "currency": "NGN",
        "type": "monthly",
        "status": "active",
        "capacity": 500,
        "family": "einvoice",
    },
    {
        "code": "einvoice_1000",
        "name": "E-Invoice 1000/mo",
        "price": 12000,
        "currency": "NGN",
        "type": "monthly",
        "status": "active",
        "capacity": 1000,
        "family": "einvoice",
    },
    {
        "code": "einvoice_1500",
        "name": "E-Invoice 1500/mo",
        "price": 15000,
        "currency": "NGN",
        "type": "monthly",
        "status": "active",
        "capacity": 1500,
        "family": "einvoice",
    },
    {
        "code": "einvoice_2000",
        "name": "E-Invoice 2000/mo",
        "price": 18000,
        "currency": "NGN",
        "type": "monthly",
        "status": "active",
        "capacity": 2000,
        "family": "einvoice",
    },
    {
        "code": "einvoice_2500",
        "name": "E-Invoice 2500/mo",
        "price": 20500,
        "currency": "NGN",
        "type": "monthly",
        "status": "active",
        "capacity": 2500,
        "family": "einvoice",
    },
    {
        "code": "einvoice_4000",
        "name": "E-Invoice 4000/mo",
        "price": 25000,
        "currency": "NGN",
        "type": "monthly",
        "status": "active",
        "capacity": 4000,
        "family": "einvoice",
    },
    {
        "code": "einvoice_pp_400",
        "name": "E-Invoice++ 400/mo",
        "price": 4000,
        "currency": "NGN",
        "type": "monthly",
        "status": "active",
        "capacity": 400,
        "family": "einvoice_pp",
    },
    {
        "code": "einvoice_pp_700",
        "name": "E-Invoice++ 700/mo",
        "price": 8000,
        "currency": "NGN",
        "type": "monthly",
        "status": "active",
        "capacity": 700,
        "family": "einvoice_pp",
    },
    {
        "code": "einvoice_pp_1000",
        "name": "E-Invoice++ Business 1000/mo",
        "price": 15000,
        "currency": "NGN",
        "type": "monthly",
        "status": "active",
        "capacity": 1000,
        "family": "einvoice_pp",
    },
    {
        "code": "einvoice_pp_1500",
        "name": "E-Invoice++ 1500/mo",
        "price": 20000,
        "currency": "NGN",
        "type": "monthly",
        "status": "active",
        "capacity": 1500,
        "family": "einvoice_pp",
    },
    {
        "code": "einvoice_pp_2500",
        "name": "E-Invoice++ Enterprise 2500/mo",
        "price": 25000,
        "currency": "NGN",
        "type": "monthly",
        "status": "active",
        "capacity": 2500,
        "family": "einvoice_pp",
    },
    {
        "code": "einvoice_pp_3000",
        "name": "E-Invoice++ 3000/mo",
        "price": 27000,
        "currency": "NGN",
        "type": "monthly",
        "status": "active",
        "capacity": 3000,
        "family": "einvoice_pp",
    },
    {
        "code": "einvoice_pp_5000",
        "name": "E-Invoice++ 5000/mo",
        "price": 30000,
        "currency": "NGN",
        "type": "monthly",
        "status": "active",
        "capacity": 5000,
        "family": "einvoice_pp",
    },
    # Coming soon (listed, not activatable)
    {
        "code": "ai_media",
        "name": "AI Image + Voice Upload",
        "price": 30000,
        "currency": "NGN",
        "type": "monthly",
        "status": "coming_soon",
    },
    {
        "code": "pdf_export",
        "name": "PDF Export",
        "price": 7000,
        "currency": "NGN",
        "type": "one_time",
        "status": "coming_soon",
    },
    {
        "code": "cloud_backup",
        "name": "Cloud Backup",
        "price": 5000,
        "currency": "NGN",
        "type": "monthly",
        "status": "coming_soon",
    },
    {
        "code": "company_branding",
        "name": "Company Branding",
        "price": 5000,
        "currency": "NGN",
        "type": "yearly",
        "status": "coming_soon",
    },
    {
        "code": "multi_branch",
        "name": "Multi-Branch Support",
        "price": 30000,
        "currency": "NGN",
        "type": "yearly",
        "status": "coming_soon",
    },
    {
        "code": "staff_accounts",
        "name": "Staff / Worker Accounts",
        "price": 15000,
        "currency": "NGN",
        "type": "yearly",
        "status": "coming_soon",
    },
    {
        "code": "analytics",
        "name": "Analytics Dashboard",
        "price": 7000,
        "currency": "NGN",
        "type": "monthly",
        "status": "coming_soon",
    },
]

RECEIPT_MONTHLY_LIMIT = 3000  # free

# Invoice studio tokens (aftereffect UI)
PALETTE_RECEIPT = [
    "classic_white",
    "soft_gray",
    "mint",
    "dark_basic",
]
PALETTE_INVOICE = [
    "linear-gradient(160deg, #ffffff32 40%, lightgreen 60%)",
    "linear-gradient(337deg, #060926 2%, #ffffff33 7%, #111827 91%)",
    "linear-gradient(352deg, lightgreen 3%, #ffffff33 23%, lightgreen 74%)",
    "linear-gradient(260deg, #ffffff33 30%, #060926 70%)",
    "linear-gradient(340deg, #ffffff33 20%, whitesmoke 80%)",
    "linear-gradient(160deg, #ffffff33 0%, white 100%)",
   "linear-gradient(347deg, #6b7280 15%, #16a34a 50%, #a5f3fc 80%)",

]
SURFACES = ["Stacked", "Split", "Compact", "Wide"]
LAYOUTS = ["Standard", "Modern", "Centered", "Minimal"]


def get_plan(code: str) -> dict[str, Any] | None:
    for p in PLANS:
        if p["code"] == code:
            return p
    return None


def list_plans() -> list[dict[str, Any]]:
    return list(PLANS)


def aftereffect_for_codes(codes: list[str]) -> dict[str, Any]:
    """What UI unlocks after activation."""
    tools: list[str] = ["receipt"]  # receipts always available (free, capped)
    family = set()
    for c in codes:
        p = get_plan(c)
        if not p or p.get("status") != "active":
            continue
        if p["code"] == "premium_calculator":
            tools.append("premium_calc")
        if p["code"] == "priority_support":
            tools.append("priority_boost")
        if p["code"] == "verified_badge":
            tools.append("verified_badge")
        if p.get("family") == "einvoice":
            family.add("einvoice")
            tools.append("einvoice")
        if p.get("family") == "einvoice_pp":
            family.add("einvoice_pp")
            tools.append("einvoice_pp")
    return {
        "tools": sorted(set(tools)),
        "receipt_monthly_limit": RECEIPT_MONTHLY_LIMIT,
        "palette_receipt": PALETTE_RECEIPT,
        "palette_invoice": PALETTE_INVOICE if "einvoice" in family or "einvoice_pp" in family else [],
        "surfaces": SURFACES if family else [],
        "layouts": LAYOUTS if family else [],
        "payment_note": "Activate only after payment confirmed (Zenith / bank ref). Beta may use PREMIUM_ACTIVATE_STUB.",
    }
