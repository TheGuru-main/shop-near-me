window.SNM = window.SNM || {};

SNM.loadRules = function () {
  var el = document.getElementById("platformRulesBody");
  if (!el) return;
  el.innerHTML =
    "<div class='card'><p><strong>In-app protection</strong></p>" +
    "<p class='muted'>Keep chat, calls, and payments signals inside Shop Near Me for dispute trails.</p></div>" +
    "<div class='card'><p><strong>Fair dealing</strong></p>" +
    "<p class='muted'>Accurate prices, stock, and availability. Heartbeat shops rank higher when live.</p></div>" +
    "<div class='card'><p><strong>Pay on delivery</strong></p>" +
    "<p class='muted'>Inspect goods before final acceptance. Report issues via in-app report tools.</p></div>" +
    "<div class='card'><p><strong>Community</strong></p>" +
    "<p class='muted'>No harassment. Emergency misuse is prohibited.</p></div>";
};

SNM.bindPlatformRules = function () {
  var btn = document.getElementById("btnAcceptRules");
  if (btn) btn.onclick = function () {
    try { localStorage.setItem("snm_rules_ok", "1"); } catch (e) {}
    SNM.showScreen("role-select");
  };
};
