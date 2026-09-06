window.SNM = window.SNM || {};

/* Screens that need a token. Pre-auth screens are NOT listed. */
SNM.AUTHED = {
  home: 1,
  search: 1,
  saved: 1,
  shop: 1,
  messages: 1,
  news: 1,
  profile: 1,
  menu: 1,
  "fairly-used": 1,
  premium: 1,
  documents: 1,
  banqueue: 1,
  emergency: 1,
  checkout: 1,
  "checkout-assist": 1,
  trust: 1,
  "admin-contact": 1,
  calculator: 1,
  invoice: 1,
  setup: 1,
  dashboard: 1
};

SNM.hideSplash = function () {
  var el = document.getElementById("splash");
  if (!el) return;
  el.classList.remove("active");
  el.classList.add("hidden");
  el.style.display = "none";
};

SNM.showScreen = function (id) {
  if (!id) return;
  id = String(id).replace(/^#/, "");

  if (SNM.AUTHED[id] && typeof SNM.getToken === "function" && !SNM.getToken()) {
    id = "role-select";
  }

  SNM.hideSplash();

  document.querySelectorAll(".screen").forEach(function (s) {
    s.classList.remove("active");
    s.style.display = "none";
  });

  var target = document.getElementById(id);
  if (!target) {
    id = "role-select";
    target = document.getElementById("role-select");
  }
  if (target) {
    target.classList.add("active");
    target.style.display = "flex";
  }

  if (SNM.AUTHED[id]) {
    document.body.classList.add("has-nav");
    if (typeof SNM.renderTabbar === "function") SNM.renderTabbar(id);
  } else {
    document.body.classList.remove("has-nav");
  }

  try {
    window.scrollTo(0, 0);
  } catch (e) {}

  if (id === "register") {
    if (typeof SNM.bindCascade === "function") SNM.bindCascade();
    if (typeof SNM.initRegisterCascade === "function") SNM.initRegisterCascade();
  }
  if (id === "home" && typeof SNM.enterHome === "function") SNM.enterHome(false);
  if (id === "shop" && typeof SNM.loadMyProducts === "function") SNM.loadMyProducts();
  if (id === "shop" && typeof SNM.loadShop === "function") SNM.loadShop();
  if (id === "messages" && typeof SNM.loadInbox === "function") SNM.loadInbox();
  if (id === "news" && typeof SNM.loadNews === "function") SNM.loadNews("local");
  if (id === "fairly-used" && typeof SNM.loadFairlyUsed === "function") SNM.loadFairlyUsed();
  if (id === "premium" && typeof SNM.loadPremium === "function") SNM.loadPremium();
  if (id === "documents" && typeof SNM.loadDocuments === "function") SNM.loadDocuments();
  if (id === "banqueue" && typeof SNM.loadBanqueue === "function") SNM.loadBanqueue();
  if (id === "emergency" && typeof SNM.loadEmergency === "function") SNM.loadEmergency();

  try {
    if (location.hash !== "#" + id) history.replaceState(null, "", "#" + id);
  } catch (e) {}
};

SNM.go = function (id) {
  SNM.showScreen(id);
};

SNM.bindRouter = function () {
  if (SNM._routerBound) return;
  SNM._routerBound = true;

  document.addEventListener(
    "click",
    function (e) {
      /* Role pick → register */
      var roleBtn = e.target.closest("[data-role]");
      if (roleBtn && roleBtn.getAttribute("data-role")) {
        e.preventDefault();
        e.stopPropagation();
        var role = roleBtn.getAttribute("data-role");
        SNM.selectedRole = role;
        try {
          sessionStorage.setItem("snm_role", role);
          sessionStorage.setItem("snm_reg_role", role);
        } catch (err) {}
        if (typeof SNM.setRolePick === "function") SNM.setRolePick(role);
        var label = document.getElementById("regRoleLabel");
        if (label) label.textContent = role;
        SNM.showScreen("register");
        return;
      }

      /* data-back */
      var backEl = e.target.closest("[data-back]");
      if (backEl) {
        e.preventDefault();
        e.stopPropagation();
        SNM.showScreen(backEl.getAttribute("data-back"));
        return;
      }

      /* data-go */
      var goEl = e.target.closest("[data-go]");
      if (goEl) {
        e.preventDefault();
        e.stopPropagation();
        SNM.showScreen(goEl.getAttribute("data-go"));
        return;
      }

      /* hash links (fallback) */
      var a = e.target.closest("a[href^='#']");
      if (a) {
        var href = a.getAttribute("href") || "";
        if (href.length >= 2) {
          e.preventDefault();
          e.stopPropagation();
          SNM.showScreen(href.slice(1));
        }
      }
    },
    true
  );

  window.addEventListener("hashchange", function () {
    var id = (location.hash || "").replace(/^#/, "");
    if (id) SNM.showScreen(id);
  });
};
