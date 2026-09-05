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

SNM.loadPremium = async function () {
  var el = document.getElementById("premiumList") || document.getElementById("premiumPlans");
  if (el) el.innerHTML = "<p class='muted'>Loading plans…</p>";
  try {
    var data = await SNM.api("/premium/plans");
    var plans =
      (data && (data.plans || data.items || data.results)) ||
      (Array.isArray(data) ? data : []);
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
        "<p class='muted'>Premium: " + SNM.esc((e && e.message) || "error") + "</p>";
    }
  }
};

SNM.subscribePremium = async function (code) {
  if (!code) return;
  if (SNM.PREMIUM_COMING_SOON[code]) {
    alert("This plan is coming soon.");
    return;
  }
  try {
    await SNM.api("/premium/subscribe", {
      method: "POST",
      body: { code: code, plan_code: code }
    });
    alert("Subscription recorded. Activation follows payment confirmation on backend.");
    await SNM.loadPremium();
  } catch (e) {
    alert("Subscribe failed: " + ((e && e.message) || ""));
  }
};

SNM.bindPremium = function () {
  document.body.addEventListener("click", function (e) {
    var btn = e.target.closest("[data-premium-code]");
    if (!btn) return;
    SNM.subscribePremium(btn.getAttribute("data-premium-code"));
  });
};

SNM.onPremiumEnter = function () {
  SNM.loadPremium();
};
