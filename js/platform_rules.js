window.SNM = window.SNM || {};

SNM.PLATFORM_RULES_HTML =
  "<h3>Community guidelines</h3>" +
  "<ul class='rules-list'>" +
  "<li>Keep deals, chat, and calls <strong>in-app</strong> for accountability.</li>" +
  "<li>Accurate listings, prices, and availability. No bait-and-switch.</li>" +
  "<li>Respect buyers, sellers, drivers, and emergency units.</li>" +
  "<li>No fraud, harassment, or illegal goods/services.</li>" +
  "<li>Reports are reviewed by Shop Near Me admin.</li>" +
  "<li>PoD / inspection OTP is optional protection for goods handover.</li>" +
  "</ul>";

SNM.renderPlatformRules = function () {
  var el = document.getElementById("platformRulesBody");
  if (el) el.innerHTML = SNM.PLATFORM_RULES_HTML;
};

SNM.acceptRules = function () {
  try {
    localStorage.setItem("snm_rules_accepted", "1");
  } catch (e) {}
  alert("Rules accepted.");
  var u = SNM.getUser();
  if (u) SNM.showScreen("home");
  else SNM.showScreen("role-select");
};

SNM.submitReport = async function () {
  var body = ((document.getElementById("report-body") || {}).value || "").trim();
  if (!body) {
    alert("Describe the issue.");
    return;
  }
  try {
    await SNM.api("/reports", {
      method: "POST",
      body: { body: body, text: body, reason: body }
    });
    alert("Report submitted.");
    var ta = document.getElementById("report-body");
    if (ta) ta.value = "";
  } catch (e) {
    alert("Report failed: " + ((e && e.message) || ""));
  }
};

SNM.messageAdmin = async function () {
  var body = ((document.getElementById("admin-msg-body") || {}).value || "").trim();
  if (!body) {
    alert("Write a message to admin.");
    return;
  }
  try {
    await SNM.api("/admin/contact", {
      method: "POST",
      body: { body: body, text: body, message: body }
    });
    alert("Message sent to Shop Near Me admin.");
    var ta = document.getElementById("admin-msg-body");
    if (ta) ta.value = "";
  } catch (e) {
    try {
      await SNM.api("/admin-contact", {
        method: "POST",
        body: { body: body, message: body }
      });
      alert("Message sent to admin.");
    } catch (e2) {
      alert("Admin message failed: " + ((e2 && e2.message) || ""));
    }
  }
};

SNM.bindPlatformRules = function () {
  SNM.renderPlatformRules();

  var acc = document.getElementById("btnAcceptRules");
  if (acc) acc.onclick = function () { SNM.acceptRules(); };

  var rulesBtn = document.getElementById("btnRules");
  if (rulesBtn) {
    rulesBtn.onclick = function () {
      SNM.showScreen("rules");
      SNM.renderPlatformRules();
    };
  }

  var rep = document.getElementById("btnSubmitReport");
  if (rep) rep.onclick = function () { SNM.submitReport(); };

  var adm = document.getElementById("btnAdminMessage");
  if (adm) adm.onclick = function () { SNM.messageAdmin(); };
};

SNM.onRulesEnter = function () {
  SNM.renderPlatformRules();
};
