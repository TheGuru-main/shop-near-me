PLANS = [
    {"code": "premium_calculator", "name": "Premium Calculator", "price": 10000, "currency": "NGN", "type": "yearly", "status": "build"},
    {"code": "priority_support", "name": "Priority Support", "price": 5500, "currency": "NGN", "type": "monthly", "status": "build"},
    {"code": "verified_badge", "name": "Verified Merchant Badge", "price": 4000, "currency": "NGN", "type": "one_time", "status": "build"},
    {"code": "e_invoice", "name": "e-Invoice", "price": None, "currency": "NGN", "type": "monthly", "status": "build", "capacity_table": [
        {"capacity": 300, "price": 3000},
        {"capacity": 500, "price": 5000},
        {"capacity": 1000, "price": 12000},
        {"capacity": 1500, "price": 15000},
        {"capacity": 2000, "price": 18000},
        {"capacity": 2500, "price": 20500},
        {"capacity": 4000, "price": 25000},
    ]},
    {"code": "e_invoice_pp", "name": "e-Invoice++", "price": None, "currency": "NGN", "type": "monthly", "status": "build", "capacity_table": [
        {"capacity": 400, "price": 4000},
        {"capacity": 700, "price": 8000},
        {"capacity": 1000, "price": 15000},
        {"capacity": 1500, "price": 20000},
        {"capacity": 2500, "price": 25000},
        {"capacity": 3000, "price": 27000},
        {"capacity": 5000, "price": 30000},
    ]},
    {"code": "ai_media", "name": "AI Image + Voice", "price": 30000, "currency": "NGN", "type": "monthly", "status": "coming_soon"},
    {"code": "pdf_export", "name": "PDF Export", "price": 7000, "currency": "NGN", "type": "one_time", "status": "coming_soon"},
    {"code": "cloud_backup", "name": "Cloud Backup", "price": 7000, "currency": "NGN", "type": "monthly", "status": "coming_soon"},
    {"code": "company_branding", "name": "Company Branding", "price": 5000, "currency": "NGN", "type": "yearly", "status": "coming_soon"},
    {"code": "multi_branch", "name": "Multi-Branch", "price": 30000, "currency": "NGN", "type": "yearly", "status": "coming_soon"},
    {"code": "staff_accounts", "name": "Staff Accounts", "price": 15000, "currency": "NGN", "type": "yearly", "status": "coming_soon"},
    {"code": "analytics", "name": "Analytics", "price": 7000, "currency": "NGN", "type": "monthly", "status": "coming_soon"},
]

RECEIPT_MONTHLY_LIMIT = 3000


def run_calculator(lines: list, vat_rate: float = 0.0, fx_rate: float = 1.0, discount: float = 0.0) -> dict:
    """Premium calculator: not PoD checkout."""
    subtotal = 0.0
    detail = []
    for line in lines or []:
        qty = float(line.get("qty") or line.get("quantity") or 1)
        unit = float(line.get("unit_price") or line.get("price") or 0)
        row = qty * unit
        subtotal += row
        detail.append({"name": line.get("name", ""), "qty": qty, "unit_price": unit, "line_total": round(row, 2)})
    after_discount = max(0.0, subtotal - float(discount or 0))
    vat = after_discount * float(vat_rate or 0)
    total_local = after_discount + vat
    total_fx = total_local * float(fx_rate or 1)
    return {
        "lines": detail,
        "subtotal": round(subtotal, 2),
        "discount": float(discount or 0),
        "vat_rate": float(vat_rate or 0),
        "vat": round(vat, 2),
        "fx_rate": float(fx_rate or 1),
        "total": round(total_local, 2),
        "total_fx": round(total_fx, 2),
    }
