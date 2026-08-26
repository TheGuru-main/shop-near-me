"""Checkout calc (free) + premium calc (VAT / FX / discount)."""

from __future__ import annotations

from typing import Any


def checkout_calc(
    items: list[dict[str, Any]],
    discount_amount: float = 0.0,
    currency: str = "NGN",
) -> dict[str, Any]:
    lines = []
    subtotal = 0.0
    for it in items or []:
        qty = float(it.get("qty") or it.get("quantity") or 0)
        unit = float(it.get("unit_price") or it.get("price") or 0)
        name = it.get("name") or "item"
        line = round(qty * unit, 2)
        subtotal += line
        lines.append(
            {"name": name, "qty": qty, "unit_price": unit, "line_total": line}
        )
    discount_amount = max(0.0, float(discount_amount or 0))
    total = max(0.0, round(subtotal - discount_amount, 2))
    return {
        "currency": currency,
        "lines": lines,
        "subtotal": round(subtotal, 2),
        "discount_amount": discount_amount,
        "total": total,
        "calculator": "checkout",
    }


def premium_calc(
    items: list[dict[str, Any]],
    discount_amount: float = 0.0,
    discount_percent: float = 0.0,
    vat_percent: float = 0.0,
    fx_rate: float = 1.0,
    currency: str = "NGN",
    target_currency: str | None = None,
) -> dict[str, Any]:
    base = checkout_calc(items, discount_amount=0.0, currency=currency)
    subtotal = float(base["subtotal"])
    d_amt = max(0.0, float(discount_amount or 0))
    d_pct = max(0.0, float(discount_percent or 0))
    if d_pct:
        d_amt = max(d_amt, round(subtotal * (d_pct / 100.0), 2))
    after_discount = max(0.0, subtotal - d_amt)
    vat = round(after_discount * (float(vat_percent or 0) / 100.0), 2)
    total = round(after_discount + vat, 2)
    fx_rate = float(fx_rate or 1.0)
    converted = None
    if target_currency and target_currency != currency and fx_rate > 0:
        converted = {
            "currency": target_currency,
            "fx_rate": fx_rate,
            "total": round(total * fx_rate, 2),
        }
    return {
        "currency": currency,
        "lines": base["lines"],
        "subtotal": subtotal,
        "discount_amount": d_amt,
        "discount_percent": d_pct,
        "vat_percent": float(vat_percent or 0),
        "vat_amount": vat,
        "total": total,
        "converted": converted,
        "calculator": "premium",
    }
