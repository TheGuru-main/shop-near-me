window.SNM = window.SNM || {};

/* Coming-soon codes — UI shows badge; subscribe blocked client-side */
SNM.PREMIUM_COMING_SOON = {
  pdf_export: true,
  cloud_backup: true,
  company_branding: true,
  multi_branch: true,
  staff_accounts: true,
  analytics: true,
  ai_media: true
};

/* Pay-to account (shown on premium-pay screen) */
SNM.PAY_BANK = {
  bank: "ZENITH BANK",
  account_name: "Idris Akeem",
  account_number: "2391716485"
};

SNM._pendingPlan = null;
SNM._premiumPlansCache = [];

SNM.esc =
  SNM.esc ||
  SNM.escapeHtml ||
  function (s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  };

SNM.loadPremium = async function () {
  var el =
    document.getElementById("premiumList") ||
    document.getElementById("premiumPlans");
  if (el) el.innerHTML = "<p class='muted'>Loading plans…</p>";
  try {
    var data = await SNM.api("/premium/plans");
    var plans =
      (data && (data.plans || data.items || data.results)) ||
      (Array.isArray(data) ? data : []);
    SNM._premiumPlansCache = plans;
    if (!el) return;
    if (!plans.length) {
      el.innerHTML = "<p class='muted'>No plans returned.</p>";
      return;
    }
    el.innerHTML = plans
      .map(function (p) {
        var code = p.code || p.id || "";
        var soon = !!SNM.PREMIUM_COMING_SOON[code];
        return (
          '<article class="card">' +
          "<strong>" +
          SNM.esc(p.name || code) +
          "</strong>" +
          (soon ? " <span class='chip'>Coming soon</span>" : "") +
          "<p class='muted small'>" +
          SNM.esc(p.description || "") +
          "</p>" +
          "<p><strong>₦" +
          SNM.esc(String(p.price != null ? p.price : "")) +
          "</strong> · " +
          SNM.esc(p.type || p.billing || "") +
          "</p>" +
          (soon
            ? "<button type='button' class='btn secondary' disabled>Coming soon</button>"
            : '<button type="button" class="btn" data-premium-code="' +
              SNM.esc(code) +
              '">Subscribe</button>') +
          "</article>"
        );
      })
      .join("");
  } catch (e) {
    if (el) {
      el.innerHTML =
        "<p class='muted'>Premium: " +
        SNM.esc((e && e.message) || "error") +
        "</p>";
    }
  }
};

/** Open payment screen — does not activate premium */
SNM.openPremiumPay = function (plan) {
  plan = plan || {};
  SNM._pendingPlan = plan;

  var name = plan.name || plan.code || "Premium";
  var price = plan.price != null ? plan.price : "";
  var elN = document.getElementById("payPlanName");
  var elP = document.getElementById("payPlanPrice");
  if (elN) elN.textContent = name;
  if (elP) elP.textContent = price !== "" ? "₦" + price : "";

  var b = SNM.PAY_BANK || {};
  var bankEl = document.getElementById("payBank");
  var nameEl = document.getElementById("payAcctName");
  var noEl = document.getElementById("payAcctNo");
  if (bankEl) bankEl.textContent = b.bank || "ZENITH BANK";
  if (nameEl) nameEl.textContent = b.account_name || "Idris Akeem";
  if (noEl) noEl.textContent = b.account_number || "2391716485";

  var ref = document.getElementById("payRef");
  if (ref) ref.value = "";
  var msg = document.getElementById("payMsg");
  if (msg) msg.textContent = "";

  if (typeof SNM.showScreen === "function") SNM.showScreen("premium-pay");
};

/** Subscribe → payment screen only */
SNM.subscribePremium = async function (code) {
  if (!code) return;
  if (SNM.PREMIUM_COMING_SOON[code]) {
    alert("This plan is coming soon.");
    return;
  }

  var plan = { code: code, name: code, price: "" };
  var list = SNM._premiumPlansCache || [];
  if (!list.length) {
    try {
      var data = await SNM.api("/premium/plans");
      list =
        (data && (data.plans || data.items || data.results)) ||
        (Array.isArray(data) ? data : []);
      SNM._premiumPlansCache = list;
    } catch (e) {}
  }
  list.forEach(function (p) {
    if ((p.code || p.id) === code) plan = p;
  });
  if (!plan.code) plan.code = code;

  SNM.openPremiumPay(plan);
};

/**
 * User paid → record pending subscribe + notify admin mailbox
 * Admin activates later (verification badge / other classes)
 */
SNM.confirmPremiumPayment = async function () {
  var plan = SNM._pendingPlan || {};
  var code = plan.code || plan.id || "";
  var ref = ((document.getElementById("payRef") || {}).value || "").trim();
  var u = (typeof SNM.getUser === "function" && SNM.getUser()) || {};
  var msgEl = document.getElementById("payMsg");
  var btn = document.getElementById("btnPayConfirm");

  if (!code) {
    alert("No plan selected.");
    return;
  }

  var bodyText = [
    "[PREMIUM_PAYMENT]",
    "plan=" + code,
    "name=" + (plan.name || code),
    "price=" + (plan.price != null ? plan.price : ""),
    "user_phone=" + (u.phone || ""),
    "user_name=" + (u.name || ""),
    "bank=" + (SNM.PAY_BANK.bank || ""),
    "account=" + (SNM.PAY_BANK.account_number || ""),
    "ref=" + (ref || "none"),
    "status=pending_verification"
  ].join("\n");

  if (btn) btn.disabled = true;
  if (msgEl) msgEl.textContent = "Sending to admin…";

  try {
    await SNM.api("/premium/subscribe", {
      method: "POST",
      body: {
        code: code,
        plan_code: code,
        status: "pending_payment",
        payment_ref: ref || null
      }
    });

    await SNM.api("/admin/message", {
      method: "POST",
      body: {
        body: bodyText,
        context: "premium_payment"
      }
    });

    if (msgEl) {
      msgEl.textContent =
        "Notice sent. Admin will activate after confirming your transfer.";
    }
    alert(
      "Payment notice sent to admin. You will be activated after verification."
    );
    if (typeof SNM.showScreen === "function") SNM.showScreen("premium");
    await SNM.loadPremium();
  } catch (e) {
    if (msgEl) msgEl.textContent = "";
    alert("Failed: " + ((e && e.message) || "try again"));
  }
  if (btn) btn.disabled = false;
};

SNM.bindPremium = function () {
  if (SNM._premiumBound) return;
  SNM._premiumBound = true;

  document.body.addEventListener("click", function (e) {
    var btn = e.target.closest("[data-premium-code]");
    if (!btn) return;
    e.preventDefault();
    SNM.subscribePremium(btn.getAttribute("data-premium-code"));
  });

  var conf = document.getElementById("btnPayConfirm");
  if (conf && !conf._snmWired) {
    conf._snmWired = true;
    conf.onclick = function () {
      SNM.confirmPremiumPayment();
    };
  }
};

SNM.onPremiumEnter = function () {
  SNM.bindPremium();
  SNM.loadPremium();
};