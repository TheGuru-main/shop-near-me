window.SNM = window.SNM || {};

SNM.PLATFORM_RULES = {
  title: "Shop Near Me · Community guidelines",
  sections: [
    {
      h: "In-app protection",
      p: "Keep chat, voice, and video inside Shop Near Me for protected deals. Off-platform deals are at your own risk."
    },
    {
      h: "Honest listings",
      p: "Merchants and sellers must describe goods and services accurately. Perishables should be tagged. Fairly used posts must not misrepresent condition."
    },
    {
      h: "Pay on delivery",
      p: "v1 uses pay-on-delivery / walk-in. Inspect goods before final acceptance. Optional handover OTP may be used when both parties agree."
    },
    {
      h: "Drivers & bulky goods",
      p: "Drivers and carriers should only accept jobs they can complete. Buyers may book nearby carriers for bulky checkout items."
    },
    {
      h: "Emergency & banqueue",
      p: "Emergency contacts and queue points are community tools — not a substitute for official emergency numbers when seconds matter."
    },
    {
      h: "Reports",
      p: "Anyone may report abuse. False reports harm the network and may limit your account."
    }
  ]
};

SNM.renderPlatformRules = function () {
  var el = document.getElementById("platformRulesBody");
  if (!el) return;
  var r = SNM.PLATFORM_RULES;
  el.innerHTML =
    "<h2>" +
    r.title +
    "</h2>" +
    r.sections
      .map(function (s) {
        return (
          '<article class="card"><div class="title">' +
          s.h +
          "</div><p class='muted'>" +
          s.p +
          "</p></article>"
        );
      })
      .join("");
};

SNM.bindPlatformRules = function () {
  document.getElementById("btnAcceptRules")?.addEventListener("click", function () {
    try {
      localStorage.setItem("snm_rules_ok", "1");
    } catch (e) {}
    if (SNM.getToken() && SNM.getUser()) SNM.showScreen("home");
    else SNM.showScreen("role-select");
  });
};
