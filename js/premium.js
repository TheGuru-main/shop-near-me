window.SNM = window.SNM || {};

SNM.COMING_SOON_PREMIUM = {
  pdf_export: true,
  cloud_backup: true,
  company_branding: true,
  multi_branch: true,
  staff_accounts: true,
  analytics: true,
  ai_media: true
};

SNM.planCardHtml = function (p) {
  var code = p.code || p.id || "";
  var soon = !!SNM.COMING_SOON_PREMIUM[code];
  var price = p.price != null ? "₦" + Number(p.price).toLocaleString() : "";
  var type = p.type || p.billing || "";
  var desc = p.description || p.desc || "";
  return (
    "<div class=\"card\">" +
    "<strong>" + SNM.escapeHtml(p.name || code) + "</strong>" +
    "<div class=\"muted\">" + SNM.escapeHtml(price + (type ? " · " + type : "")) + "</div>" +
    "<p class=\"muted\">" + SNM.escapeHtml(desc) + "</p>" +
    (soon
      ? "<span class=\"chip\">coming soon</span>"
      : "<button type=\"button\" class=\"btn small\" data-sub=\"" +
        SNM.escapeHtml(code) +
        "\">Activate</button>") +
    "</div>"
  );
};

SNM.loadPremium = async function () {
  var plansBox = document.getElementById("premiumPlans");
  var mineBox = document.getElementById("myPremium");
  if (plansBox) plansBox.innerHTML = "<p class=\"muted\">Loading plans…</p>";
  if (mineBox) mineBox.innerHTML = "<p class=\"muted\">Loading…</p>";

  try {
    var plans = await SNM.api("/premium/plans");
    var list = plans.plans || plans.items || plans || [];
    if (!Array.isArray(list)) list = [];
    if (plansBox) {
      plansBox.innerHTML = list.length
        ? list.map(SNM.planCardHtml).join("")
        : "<p class=\"muted\">No plans returned</p>";
      plansBox.querySelectorAll("[data-sub]").forEach(function (btn) {
        btn.onclick = function () {
          SNM.subscribePremium(btn.getAttribute("data-sub"));
        };
      });
    }
  } catch (e) {
    if (plansBox) {
      plansBox.innerHTML =
        "<p class=\"muted\">" + SNM.escapeHtml(e.message || "Plans failed") + "</p>";
    }
  }

  try {
    var mine = await SNM.api("/premium/me");
    var subs = mine.subscriptions || mine.items || mine || [];
    if (!Array.isArray(subs)) subs = [];
    if (mineBox) {
      if (!subs.length) {
        mineBox.innerHTML = "<p class=\"muted\">No active premium yet</p>";
      } else {
        mineBox.innerHTML = subs
          .map(function (s) {
            return (
              "<div class=\"card\">" +
              "<strong>" +
              SNM.escapeHtml(s.code || s.plan_code || s.name || "Plan") +
              "</strong>" +
              "<div class=\"muted\">status: " +
              SNM.escapeHtml(s.status || "active") +
              "</div></div>"
            );
          })
          .join("");
      }
    }
  } catch (e) {
    if (mineBox) {
      mineBox.innerHTML =
        "<p class=\"muted\">" + SNM.escapeHtml(e.message || "Subscription load failed") + "</p>";
    }
  }
};

SNM.subscribePremium = async function (code) {
  if (!code) return;
  if (SNM.COMING_SOON_PREMIUM[code]) {
    SNM.toast("Coming soon");
    return;
  }
  try {
    await SNM.api("/premium/subscribe", {
      method: "POST",
      body: { code: code, plan_code: code }
    });
    SNM.toast("Subscription recorded");
    SNM.loadPremium();
  } catch (e) {
    SNM.toast(e.message || "Subscribe failed");
  }
};

SNM.bindPremium = function () {
  var reload = document.getElementById("btnReloadPremium");
  if (reload) {
    reload.onclick = function () {
      SNM.loadPremium();
    };
  }
  var docs = document.getElementById("btnOpenDocuments");
  if (docs) {
    docs.onclick = function () {
      SNM.showScreen("documents");
      if (typeof SNM.loadDocuments === "function") SNM.loadDocuments();
    };
  }
};
