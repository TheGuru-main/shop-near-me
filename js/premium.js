window.SNM = window.SNM || {};

SNM.loadPremium = async function () {
  var box = document.getElementById("premiumPlans");
  if (!box) return;
  box.innerHTML = "<p class='muted'>Loading plans…</p>";
  try {
    var data = await SNM.api("/premium/plans");
    var plans = data.plans || data.items || data || [];
    if (!Array.isArray(plans)) plans = [];
    if (!plans.length) {
      box.innerHTML =
        "<div class='card'><p>Premium catalogue unavailable.</p></div>";
      return;
    }
    box.innerHTML = plans
      .map(function (p) {
        var code = p.code || p.id || "";
        var name = p.name || code;
        var price = p.price != null ? "₦" + Number(p.price).toLocaleString() : "";
        var type = p.type || p.billing || "";
        var desc = p.description || "";
        var soon =
          p.coming_soon || p.status === "coming_soon"
            ? " · Coming soon"
            : "";
        return (
          '<article class="product-card">' +
          '<div class="title">' +
          name +
          "</div>" +
          '<div class="meta">' +
          [price, type].filter(Boolean).join(" · ") +
          soon +
          "</div>" +
          (desc ? "<p class='muted'>" + desc + "</p>" : "") +
          (soon
            ? ""
            : '<button type="button" class="btn small" data-prem="' +
              code +
              '">Select</button>') +
          "</article>"
        );
      })
      .join("");
  } catch (err) {
    box.innerHTML =
      "<div class='card'><p class='error show'>" +
      (err.message || "Premium failed") +
      "</p></div>";
  }
};

SNM.bindPremium = function () {
  document.getElementById("premiumPlans")?.addEventListener("click", function (e) {
    var btn = e.target.closest("[data-prem]");
    if (!btn) return;
    SNM.toast(
      "Premium activation: Zenith transfer flow next · code " +
        btn.getAttribute("data-prem")
    );
  });
};
