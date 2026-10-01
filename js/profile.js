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

SNM._profileTargetPhone = null;

SNM.closeUserProfile = function () {
  var sheet = document.getElementById("userProfileSheet");
  if (!sheet) return;
  sheet.classList.remove("open");
  sheet.setAttribute("aria-hidden", "true");
  sheet.style.display = "none";
};

SNM.openUserProfile = async function (phone) {
  phone = String(phone || "").trim();
  if (!phone) {
    alert("No user phone");
    return;
  }
  SNM._profileTargetPhone = phone;
  var sheet = document.getElementById("userProfileSheet");
  var body = document.getElementById("userProfileBody");
  var list = document.getElementById("userProfileListings");
  if (sheet) {
    sheet.classList.add("open");
    sheet.setAttribute("aria-hidden", "false");
    sheet.style.display = "flex";
  }
  if (body) body.innerHTML = "<p class='muted'>Loading profile…</p>";
  if (list) list.innerHTML = "";

  var user = { phone: phone, name: "User" };
  try {
    var looked = await SNM.api(
      "/messages/lookup?phone=" + encodeURIComponent(phone)
    );
    if (looked) user = looked;
  } catch (e) {}

  if (body) {
    body.innerHTML =
      "<p><strong>" +
      SNM.esc(user.name || "User") +
      "</strong></p>" +
      "<p class='muted'>" +
      SNM.esc(user.role || "") +
      "</p>" +
      "<p>" +
      SNM.esc(user.phone || phone) +
      "</p>" +
      "<p class='muted small'>" +
      SNM.esc(
        [user.primary_location, user.community, user.city]
          .filter(Boolean)
          .join(" · ")
      ) +
      "</p>";
  }

  if (list) {
    list.innerHTML = "<p class='muted'>Loading listings…</p>";
    try {
      var u = (typeof SNM.getUser === "function" && SNM.getUser()) || {};
      var data = await SNM.api(
        "/search/products" +
          SNM.qs({
            q: "",
            max_km: 500,
            limit: 50,
            lat: u.lat,
            lng: u.lng,
            community: u.community || "",
            city: u.city || "",
            region: u.region || "",
            country: u.country || "Nigeria"
          })
      );
      var rows = data.results || data.items || [];
      rows = rows.filter(function (r) {
        var o = r.owner || r.seller || r.merchant || {};
        var ph = o.phone || r.phone || r.owner_phone || "";
        return String(ph) === String(phone) || String(ph) === String(user.phone || "");
      });
      if (!rows.length) {
        list.innerHTML = "<p class='muted'>No listings for this user in range.</p>";
      } else if (typeof SNM.cardHtml === "function") {
        list.innerHTML = rows
          .map(function (r) {
            return SNM.cardHtml(r);
          })
          .join("");
        if (typeof SNM.bindCardActions === "function") SNM.bindCardActions(list);
      } else {
        list.innerHTML = "<p class='muted'>" + rows.length + " listing(s)</p>";
      }
    } catch (e2) {
      list.innerHTML =
        "<p class='muted'>Listings unavailable.</p>";
    }
  }
};

SNM.reactToUser = function (kind) {
  var phone = SNM._profileTargetPhone;
  if (!phone) return;
  try {
    var key = "snm_react_" + phone;
    var o = JSON.parse(localStorage.getItem(key) || "{}");
    o[kind] = (o[kind] || 0) + 1;
    localStorage.setItem(key, JSON.stringify(o));
  } catch (e) {}
  // best-effort API
  if (typeof SNM.api === "function") {
    SNM.api("/ratings", {
      method: "POST",
      body: { target_phone: phone, kind: kind, value: 1 }
    }).catch(function () {});
  }
  alert("Recorded: " + kind);
};

SNM.bindUserProfile = function () {
  if (SNM._userProfileBound) return;
  SNM._userProfileBound = true;
  var close1 = document.getElementById("btnCloseUserProfile");
  var close2 = document.getElementById("btnCloseUserProfile2");
  function clo(e) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    SNM.closeUserProfile();
  }
  if (close1) close1.onclick = clo;
  if (close2) close2.onclick = clo;
  var row = document.getElementById("userProfileReact");
  if (row) {
    row.addEventListener("click", function (e) {
      var b = e.target.closest("[data-react]");
      if (!b) return;
      SNM.reactToUser(b.getAttribute("data-react"));
    });
  }
};
