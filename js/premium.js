// js/premium.js
window.SNM = window.SNM || {};
SNM.loadPremium = async function () {
  var el = document.getElementById("premiumPlans");
  if (!el) return;
  el.innerHTML = "<p class='muted'>Loading plans…</p>";
  try {
    var data = await SNM.api("/premium/plans");
    var plans = data.plans || data.items || data || [];
    if (!Array.isArray(plans) || !plans.length) {
      el.innerHTML = "<p class='muted'>Plans will appear here.</p>";
      return;
    }
    el.innerHTML = plans.map(function (p) {
      return (
        '<div class="product-card"><div class="title">' + (p.name || p.code) +
        '</div><div class="meta">' + (p.price != null ? "₦" + p.price : "") +
        " · " + (p.type || "") + "</div><p class='muted'>" + (p.description || "") +
        "</p></div>"
      );
    }).join("");
  } catch (e) {
    el.innerHTML = "<p class='error'>" + (e.message || "Premium error") + "</p>";
  }
};
SNM.bindPremium = function () {};
