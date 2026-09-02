/* Shop Near Me — platform_rules.js
   Terms, community guidelines, in-app deal protection, report entry
   Keep chats/calls in-app for protected deals (Byflint escrow = v2)
*/
(function () {
  function el(id) {
    return document.getElementById(id);
  }

  function escapeHtml(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  SNM.PLATFORM_RULES = {
    version: "1.0.0.1p",
    title: "Shop Near Me · Community & Deal Rules",
    sections: [
      {
        id: "in_app",
        title: "Keep deals in-app",
        body:
          "For buyer–seller protection, keep text, voice, and video about a deal inside Shop Near Me. Off-app payments and chats are not covered by platform dispute tools.",
      },
      {
        id: "pod",
        title: "Pay on delivery (beta)",
        body:
          "v1 checkout is Pay on Delivery / walk-in oriented. Inspect goods before final acceptance. Optional delivery OTP at handoff may be offered — not forced.",
      },
      {
        id: "listings",
        title: "Honest listings",
        body:
          "Prices, quantity, and condition must be accurate. Fairly used posts must not impersonate brands or misrepresent condition. Duplicate scam listings may be removed.",
      },
      {
        id: "heartbeat",
        title: "Availability",
        body:
          "Merchants, drivers, and service providers should keep hours and heartbeat honest. Fake “open” status harms ranking trust.",
      },
      {
        id: "emergency",
        title: "Emergency & banqueue",
        body:
          "Emergency pins and queue info are community aids, not a substitute for official  emergency services where those exist.",
      },
      {
        id: "reports",
        title: "Reports & ratings",
        body:
          "Anyone may report abuse. False reports can lead to limits. Ratings on fairly used and merchants must reflect real transactions.",
      },
      {
        id: "data",
        title: "Phone identity",
        body:
          "Phone number is the account UID. Do not share OTPs. Location is used for discovery and proximity; primary location stays on your profile.",
      },
    ],
  };

  SNM.renderPlatformRules = function (containerId) {
    var box = el(containerId || "platformRulesBody") || el("rulesBody");
    if (!box) return;
    var r = SNM.PLATFORM_RULES;
    box.innerHTML =
      "<h2>" +
      escapeHtml(r.title) +
      '</h2><p class="muted">Version ' +
      escapeHtml(r.version) +
      "</p>" +
      r.sections
        .map(function (s) {
          return (
            '<article class="feed-card rules-card" id="rule-' +
            escapeHtml(s.id) +
            '">' +
            "<strong>" +
            escapeHtml(s.title) +
            "</strong>" +
            "<p>" +
            escapeHtml(s.body) +
            "</p></article>"
          );
        })
        .join("");
  };

  SNM.acceptPlatformRules = function () {
    try {
      localStorage.setItem(
        "snm_rules_accepted",
        JSON.stringify({
          v: SNM.PLATFORM_RULES.version,
          at: new Date().toISOString(),
        })
      );
    } catch (e) {}
    SNM.toast("Rules accepted");
    if (typeof SNM.showScreen === "function") {
      SNM.showScreen("home");
    }
  };

  SNM.hasAcceptedRules = function () {
    try {
      var raw = localStorage.getItem("snm_rules_accepted");
      if (!raw) return false;
      var o = JSON.parse(raw);
      return o && o.v === SNM.PLATFORM_RULES.version;
    } catch (e) {
      return false;
    }
  };

  SNM.openReport = async function () {
    var subject =
      (el("report-subject") && el("report-subject").value.trim()) || "";
    var body = (el("report-body") && el("report-body").value.trim()) || "";
    var target =
      (el("report-target") && el("report-target").value.trim()) || "";
    if (!body) {
      SNM.toast("Describe the issue");
      return;
    }
    try {
      await SNM.api("/reports", {
        method: "POST",
        body: {
          subject: subject || "User report",
          body: body,
          target_id: target || null,
        },
      });
      SNM.toast("Report submitted");
      if (el("report-body")) el("report-body").value = "";
    } catch (e) {
      SNM.toast(e.message || "Report failed");
    }
  };

  SNM.messageAdmin = async function () {
    var body =
      (el("admin-msg-body") && el("admin-msg-body").value.trim()) || "";
    if (!body) {
      SNM.toast("Write a message to admin");
      return;
    }
    try {
      await SNM.api("/admin-contact/message", {
        method: "POST",
        body: { body: body },
      });
      SNM.toast("Sent to Shop Near Me admin");
      if (el("admin-msg-body")) el("admin-msg-body").value = "";
    } catch (e) {
      SNM.toast(e.message || "Could not reach admin");
    }
  };

  SNM.bindPlatformRules = function () {
    var open = el("btnRules") || el("btnPlatformRules") || el("btnGuidelines");
    if (open) {
      open.onclick = function () {
        if (typeof SNM.showScreen === "function") {
          SNM.showScreen("rules");
        }
        SNM.renderPlatformRules();
      };
    }
    var accept = el("btnAcceptRules");
    if (accept) {
      accept.onclick = function () {
        SNM.acceptPlatformRules();
      };
    }
    var reportBtn = el("btnSubmitReport");
    if (reportBtn) {
      reportBtn.onclick = function () {
        SNM.openReport();
      };
    }
    var adminBtn = el("btnAdminMessage");
    if (adminBtn) {
      adminBtn.onclick = function () {
        SNM.messageAdmin();
      };
    }
    // Optional: render if rules screen is already in DOM
    if (el("platformRulesBody") || el("rulesBody")) {
      SNM.renderPlatformRules();
    }
  };
})();
