window.SNM = window.SNM || {};

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

SNM.renderProfile = function () {
  var body = document.getElementById("profileBody");
  if (!body) return;
  var u = (typeof SNM.getUser === "function" && SNM.getUser()) || {};
  body.innerHTML =
    "<p><strong>" +
    SNM.esc(u.name || "User") +
    "</strong></p>" +
    "<p class='muted'>" +
    SNM.esc(u.role || "") +
    "</p>" +
    "<p>" +
    SNM.esc(u.phone || "") +
    "</p>" +
    "<p class='muted small'>" +
    SNM.esc(
      [u.primary_location, u.community, u.city, u.region, u.country]
        .filter(Boolean)
        .join(" · ")
    ) +
    "</p>";
};

SNM.closeProfile = function () {
  var sheet = document.getElementById("profileSheet");
  if (!sheet) return;
  sheet.classList.remove("open");
  sheet.setAttribute("aria-hidden", "true");
};

SNM.openProfile = function () {
  SNM.renderProfile();
  var sheet = document.getElementById("profileSheet");
  if (sheet) {
    sheet.classList.add("open");
    sheet.setAttribute("aria-hidden", "false");
  }
};

SNM.bindProfile = function () {
  if (SNM._profileBound) return;
  SNM._profileBound = true;

  var btn = document.getElementById("btnProfile");
  if (btn) {
    btn.onclick = function (e) {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      SNM.openProfile();
    };
  }

  var closeBtn =
    document.getElementById("btnCloseProfile") ||
    document.querySelector("#profileSheet [data-close]");
  if (closeBtn) {
    closeBtn.onclick = function (e) {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      SNM.closeProfile();
    };
  }

  var logout = document.getElementById("btnLogoutProfile");
  if (logout) {
    logout.onclick = function (e) {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      if (typeof SNM.clearSession === "function") SNM.clearSession();
      SNM.closeProfile();
      if (typeof SNM.showScreen === "function") {
        SNM.showScreen("role-select");
      }
    };
  }

  /* tap backdrop / handle to close */
  var sheet = document.getElementById("profileSheet");
  if (sheet) {
    sheet.addEventListener("click", function (e) {
      if (e.target === sheet) SNM.closeProfile();
    });
  }
};

/* auto-bind when script loads (DOM may already be ready) */
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", function () {
    SNM.bindProfile();
  });
} else {
  SNM.bindProfile();
}