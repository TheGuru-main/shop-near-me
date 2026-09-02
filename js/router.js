window.SNM = window.SNM || {};

SNM.currentScreen = "splash";

SNM.showScreen = function (id) {
  var target = id || "role-select";
  if (target.charAt(0) === "#") target = target.slice(1);

  document.querySelectorAll(".screen").forEach(function (s) {
    s.classList.remove("active");
  });

  var el = document.getElementById(target);
  if (!el) {
    target = SNM.getToken() && SNM.getUser() ? "home" : "role-select";
    el = document.getElementById(target);
  }
  if (el) el.classList.add("active");
  SNM.currentScreen = target;

  if (typeof SNM.renderTabbars === "function") {
    SNM.renderTabbars(target);
  }

  if (target === "home" && typeof SNM.refreshHome === "function") {
    SNM.refreshHome();
  }
  if (target === "profile" && typeof SNM.renderProfile === "function") {
    SNM.renderProfile();
  }
  if (target === "news" && typeof SNM.loadNews === "function") {
    SNM.loadNews();
  }
  if (target === "shop" && typeof SNM.loadMyProducts === "function") {
    SNM.loadMyProducts();
  }
  if (target === "messages" && typeof SNM.loadInbox === "function") {
    SNM.loadInbox();
  }
};

SNM.go = function (hash) {
  var h = hash || "#role-select";
  if (h.charAt(0) !== "#") h = "#" + h;
  if (location.hash === h) {
    SNM.showScreen(h.slice(1));
  } else {
    location.hash = h;
  }
};

SNM.renderTabbars = function (activeId) {
  var tabs = SNM.tabsFor(SNM.getUser());
  document.querySelectorAll(".tabbar").forEach(function (nav) {
    nav.innerHTML = tabs
      .map(function (t) {
        var active = t.id === activeId ? " active" : "";
        return (
          '<a href="#' +
          t.id +
          '" class="' +
          active +
          '"><i class="fas ' +
          t.icon +
          '"></i><span>' +
          t.label +
          "</span></a>"
        );
      })
      .join("");
  });
};

SNM.bindRouter = function () {
  window.addEventListener("hashchange", function () {
    var id = (location.hash || "#role-select").replace(/^#/, "");
    if (id === "splash") id = "role-select";
    SNM.showScreen(id);
  });

  document.querySelectorAll(".choice-card[data-role]").forEach(function (card) {
    card.addEventListener("click", function () {
      var role = card.getAttribute("data-role") || "buyer";
      SNM.setRole(role);
      var label = document.getElementById("regRoleLabel");
      if (label) label.textContent = role;
      if (typeof SNM.applyRoleExtras === "function") SNM.applyRoleExtras(role);
    });
  });
};

SNM.startSplash = function () {
  var splash = document.getElementById("splash");
  var done = function () {
    if (splash) splash.classList.add("hidden");
    if (splash) splash.classList.remove("active");

    if (SNM.getToken() && SNM.getUser()) {
      SNM.go("#home");
    } else {
      var hash = (location.hash || "").replace(/^#/, "");
      if (hash && hash !== "splash") SNM.go("#" + hash);
      else SNM.go("#role-select");
    }
  };

  setTimeout(done, 2200);
};
