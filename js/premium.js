window.SNM = window.SNM || {};

SNM.loadPremium = async function () {
  var plans = document.getElementById("premiumPlans");
  var mine = document.getElementById("myPremium");
  if (plans) plans.innerHTML = "<p class='muted'>Loading plans…</p>";
  try {
    var data = await SNM.api("/premium/plans");
    var rows = data.plans || data.items || data || [];
    if (!Array.isArray(rows)) rows = [];
    if (plans) {
      plans.innerHTML = rows.length
        ? rows
            .map(function (p) {
              var code = p.code || p.id;
              var soon = p.coming_soon ? " · Coming soon" : "";
              return (
                '<div class="product-card"><div class="title">' +
                SNM.escapeHtml(p.name || code) +
                "</div><div class='meta'>₦" +
                SNM.escapeHtml(String(p.price != null ? p.price : "")) +
                " · " +
                SNM.escapeHtml(p.type || "") +
                soon +
                "</div>" +
                (p.coming_soon
                  ? ""
                  : '<button type="button" class="btn small" data-sub="' +
                    SNM.escapeHtml(code) +
                    '">Activate</button>') +
                "</div>"
              );
            })
            .join("")
        : "<p class='muted'>No plans.</p>";
      plans.querySelectorAll("[data-sub]").forEach(function (b) {
        b.onclick = async function () {
          try {
            await SNM.api("/premium/subscribe", {
              method: "POST",
              body: { code: b.getAttribute("data-sub") }
            });
            SNM.toast("Subscription recorded");
            SNM.loadPremium();
          } catch (e) {
            SNM.toast(e.message || "Subscribe failed");
          }
        };
      });
    }
  } catch (e) {
    if (plans) plans.innerHTML = "<p class='muted'>" + SNM.escapeHtml(e.message) + "</p>";
  }
  if (mine) {
    try {
      var data2 = await SNM.api("/premium/me");
      var rows2 = data2.items || data2.subscriptions || [];
      mine.innerHTML = rows2.length
        ? rows2
            .map(function (s) {
              return (
                '<div class="product-card"><div class="title">' +
                SNM.escapeHtml(s.code || s.name || "Plan") +
                "</div></div>"
              );
            })
            .join("")
        : "<p class='muted'>No active premium.</p>";
    } catch (e2) {
      mine.innerHTML = "<p class='muted'>" + SNM.escapeHtml(e2.message) + "</p>";
    }
  }
};

SNM.bindPremium = function () {
  var reload = document.getElementById("btnReloadPremium");
  if (reload) reload.onclick = function () {
    SNM.loadPremium();
  };
  var docs = document.getElementById("btnOpenDocuments");
  if (docs) {
    docs.onclick = function () {
      SNM.showScreen("documents");
      if (typeof SNM.loadDocuments === "function") SNM.loadDocuments();
    };
  }
};
