(function () {
  var currentRole = null;
  var pendingId = null;
  var pendingPhone = null;

  function showScreen(id) {
    document.querySelectorAll(".screen").forEach(function (s) {
      s.classList.remove("active");
    });
    var el = document.getElementById(id);
    if (el) el.classList.add("active");
  }

  function showError(id, msg) {
    var el = document.getElementById(id);
    if (!el) return;
    if (!msg) {
      el.textContent = "";
      el.classList.remove("show");
      return;
    }
    el.textContent = typeof msg === "string" ? msg : JSON.stringify(msg);
    el.classList.add("show");
  }

  function navForRole(role) {
    if (role === "buyer") {
      return [
        { id: "home", label: "Home" },
        { id: "search", label: "Search" },
        { id: "saved", label: "Saved" },
        { id: "messages", label: "Msg" },
        { id: "news", label: "News" },
        { id: "profile", label: "Profile" }
      ];
    }
    return [
      { id: "home", label: "Home" },
      { id: "search", label: "Search" },
      { id: "shop", label: "Shop" },
      { id: "messages", label: "Msg" },
      { id: "news", label: "News" },
      { id: "profile", label: "Profile" }
    ];
  }

  function renderBottomNav(active) {
    var user = SNM.getUser() || {};
    var items = navForRole(user.role || "buyer");
    document.querySelectorAll(".bottom-nav").forEach(function (nav) {
      nav.innerHTML = items
        .map(function (it) {
          return (
            '<button type="button" data-nav="' +
            it.id +
            '" class="' +
            (it.id === active ? "active" : "") +
            '">' +
            it.label +
            "</button>"
          );
        })
        .join("");
    });
  }

  function enterHome() {
    var user = SNM.getUser();
    if (!user) {
      showScreen("role-select");
      return;
    }
    showScreen("home");
    renderBottomNav("home");
    document.getElementById("homeStatus").textContent =
      "Signed in as " + (user.name || "") + " · " + (user.role || "");
    loadFeed();
  }

  async function loadFeed() {
    var box = document.getElementById("homeFeed");
    box.innerHTML = "<p class='muted'>Loading feed…</p>";
    try {
      var data = await SNM.api("/feed");
      var results = (data && data.results) || [];
      if (!results.length) {
        box.innerHTML =
          "<div class='list-card'><p>No feed items yet.</p><p class='muted'>Search or add catalogue items as a merchant.</p></div>";
        return;
      }
      box.innerHTML = results
        .map(function (r) {
          var p = r.product || {};
          var s = r.seller || {};
          var price =
            p.price != null
              ? (p.currency || "") + " " + p.price
              : "Price on request";
          return (
            '<div class="feed-card">' +
            '<div class="title">' +
            (p.name || "Item") +
            "</div>" +
            '<div class="meta">' +
            price +
            " · " +
            (s.name || "") +
            (r.km != null ? " · " + r.km + " km" : "") +
            (s.live ? " · Live" : "") +
            "</div>" +
            '<div class="meta">' +
            (s.primary_location || s.city || "") +
            "</div>" +
            "</div>"
          );
        })
        .join("");
    } catch (e) {
      box.innerHTML =
        "<div class='list-card'><p class='muted'>Feed unavailable (" +
        (e.message || "error") +
        "). Try Search.</p></div>";
    }
  }

  async function doSearch() {
    var q = document.getElementById("searchInput").value.trim();
    var box = document.getElementById("searchResults");
    box.innerHTML = "<p class='muted'>Searching…</p>";
    try {
      var data = await SNM.api("/search/products?q=" + encodeURIComponent(q));
      var results = (data && data.results) || [];
      if (!results.length) {
        box.innerHTML = "<p class='muted'>No results</p>";
        return;
      }
      box.innerHTML = results
        .map(function (r) {
          var p = r.product || {};
          var s = r.seller || {};
          return (
            '<div class="list-card"><strong>' +
            (p.name || "") +
            "</strong><div class='meta'>" +
            (s.name || "") +
            (r.km != null ? " · " + r.km + " km" : "") +
            "</div></div>"
          );
        })
        .join("");
    } catch (e) {
      box.innerHTML = "<p class='muted'>" + (e.message || "Search failed") + "</p>";
    }
  }

  function bootRoles() {
    var grid = document.getElementById("roleGrid");
    grid.innerHTML = SNM.ROLES.map(function (r) {
      return (
        '<button type="button" class="role-card" data-role="' +
        r.id +
        '"><strong>' +
        r.label +
        "</strong><span>" +
        r.blurb +
        "</span></button>"
      );
    }).join("");

    var sel = document.getElementById("regContinent");
    sel.innerHTML = SNM.CONTINENTS.map(function (c) {
      return '<option value="' + c.id + '">' + c.name + "</option>";
    }).join("");
  }

  document.getElementById("roleGrid").addEventListener("click", function (e) {
    var btn = e.target.closest("[data-role]");
    if (!btn) return;
    currentRole = btn.getAttribute("data-role");
    document.getElementById("regTitle").textContent =
      "Register · " + currentRole;
    document.getElementById("prefsBlock").style.display =
      currentRole === "buyer" ? "block" : "none";
    showScreen("register");
  });

  document.getElementById("btnGoLogin").onclick = function () {
    showScreen("login");
  };
  document.getElementById("btnAbout").onclick = function () {
    showScreen("about");
  };

  document.querySelectorAll("[data-back]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      showScreen(btn.getAttribute("data-back"));
    });
  });

  document.getElementById("btnRegister").onclick = async function () {
    showError("regError", "");
    var continentId = document.getElementById("regContinent").value;
    var continent = SNM.CONTINENTS.find(function (c) {
      return c.id === continentId;
    });
    var phone = document.getElementById("regPhone").value.trim();
    if (!phone.startsWith("+")) {
      showError("regError", "Phone must start with + (E.164)");
      return;
    }
    var body = {
      role: currentRole || "buyer",
      name: document.getElementById("regName").value.trim(),
      continent_id: continentId,
      continent_name: continent ? continent.name : "",
      country: document.getElementById("regCountry").value.trim(),
      region: document.getElementById("regRegion").value.trim(),
      city: document.getElementById("regCity").value.trim(),
      community: document.getElementById("regCommunity").value.trim(),
      primary_location: document.getElementById("regPrimary").value.trim(),
      lat: 4.85,
      lng: 7.05,
      phone: phone,
      password: document.getElementById("regPassword").value,
      prefs: []
    };
    if (!body.name || !body.country || !body.primary_location || !body.password) {
      showError("regError", "Name, country, primary location, and password are required");
      return;
    }
    try {
      var data = await SNM.api("/auth/otp/request", { method: "POST", body: body });
      pendingId = data.pending_id;
      pendingPhone = data.phone;
      document.getElementById("otpHint").textContent =
        "Code sent toward " + (data.phone || phone) + ". Enter OTP to finish.";
      showScreen("otp");
    } catch (e) {
      var msg = e.message;
      if (e.data && e.data.detail) msg = typeof e.data.detail === "string" ? e.data.detail : JSON.stringify(e.data.detail);
      showError("regError", msg || "Register failed");
    }
  };

  document.getElementById("btnVerifyOtp").onclick = async function () {
    showError("otpError", "");
    try {
      var data = await SNM.api("/auth/otp/verify", {
        method: "POST",
        body: {
          pending_id: pendingId,
          otp: document.getElementById("otpCode").value.trim()
        }
      });
      SNM.setSession(data.access_token, data.user);
      enterHome();
    } catch (e) {
      showError("otpError", e.message || "Invalid OTP");
    }
  };

  document.getElementById("btnResendOtp").onclick = async function () {
    showError("otpError", "");
    try {
      await SNM.api(
        "/auth/otp/resend?pending_id=" + encodeURIComponent(pendingId || ""),
        { method: "POST" }
      );
      showError("otpError", "Resend requested (wait 5 minutes between resends).");
    } catch (e) {
      showError("otpError", e.message || "Resend failed");
    }
  };

  document.getElementById("btnLogin").onclick = async function () {
    showError("loginError", "");
    try {
      var data = await SNM.api("/auth/login", {
        method: "POST",
        body: {
          phone: document.getElementById("loginPhone").value.trim(),
          password: document.getElementById("loginPassword").value
        }
      });
      SNM.setSession(data.access_token, data.user);
      enterHome();
    } catch (e) {
      showError("loginError", e.message || "Login failed");
    }
  };

  function logout() {
    SNM.clearSession();
    showScreen("role-select");
  }

  document.getElementById("btnMenu").onclick = function () {
    document.getElementById("menuSheet").classList.add("open");
  };
  document.getElementById("menuSheet").onclick = function (e) {
    if (e.target.id === "menuSheet") {
      document.getElementById("menuSheet").classList.remove("open");
      return;
    }
    var b = e.target.closest("[data-menu]");
    if (!b) return;
    var act = b.getAttribute("data-menu");
    document.getElementById("menuSheet").classList.remove("open");
    if (act === "logout") logout();
    else if (act === "about") showScreen("about");
    else if (act === "close") return;
    else alert(act + " — coming in next UI slice");
  };

  document.getElementById("btnLogoutProfile").onclick = logout;
  document.getElementById("btnCloseProfile").onclick = function () {
    document.getElementById("profileSheet").classList.remove("open");
  };

  document.getElementById("btnSearchTop").onclick = function () {
    showScreen("search");
    renderBottomNav("search");
  };
  document.getElementById("btnDoSearch").onclick = doSearch;

  document.getElementById("btnFab").onclick = function () {
    alert("Banqueue & Emergency modules — next UI slice\nAPI: /banqueue/locations · /emergency/nearby");
  };

  document.body.addEventListener("click", function (e) {
    var nav = e.target.closest("[data-nav]");
    if (!nav) return;
    var id = nav.getAttribute("data-nav");
    if (id === "home") enterHome();
    else if (id === "search") {
      showScreen("search");
      renderBottomNav("search");
    } else if (id === "profile") {
      var u = SNM.getUser() || {};
      document.getElementById("profileBody").innerHTML =
        "<p><strong>" +
        (u.name || "") +
        "</strong></p><p class='muted'>" +
        (u.role || "") +
        "</p><p class='muted'>" +
        (u.primary_location || "") +
        "</p><p class='muted'>" +
        (u.phone || "") +
        "</p>";
      document.getElementById("profileSheet").classList.add("open");
    } else {
      alert(id + " — next UI slice");
    }
  });

  bootRoles();
  if (SNM.getToken() && SNM.getUser()) enterHome();
  else showScreen("role-select");
})();
