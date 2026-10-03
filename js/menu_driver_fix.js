
window.SNM = window.SNM || {};

SNM.closeMenuSheet = function () {
  var m = document.getElementById("menuSheet");
  if (!m) return;
  m.classList.add("hidden");
  m.setAttribute("aria-hidden", "true");
};

SNM.openMenuSheet = function () {
  var m = document.getElementById("menuSheet");
  if (!m) return;
  m.classList.remove("hidden");
  m.setAttribute("aria-hidden", "false");
};

SNM.bindMenuFixed = function () {
  if (window._snmMenuFixed) return;
  window._snmMenuFixed = true;
  document.addEventListener(
    "click",
    function (e) {
      if (e.target.closest("#btnMenuClose")) {
        e.preventDefault();
        e.stopPropagation();
        SNM.closeMenuSheet();
        return;
      }
      if (e.target.closest("#btnMenu")) {
        e.preventDefault();
        e.stopPropagation();
        var m = document.getElementById("menuSheet");
        if (!m) return;
        if (m.classList.contains("hidden")) SNM.openMenuSheet();
        else SNM.closeMenuSheet();
        return;
      }
      var item = e.target.closest("#menuSheet [data-go], #menuSheet [data-menu]");
      if (item) {
        e.preventDefault();
        e.stopPropagation();
        var act = item.getAttribute("data-menu") || item.getAttribute("data-go");
        SNM.closeMenuSheet();
        if (act === "logout") {
          if (typeof SNM.clearSession === "function") SNM.clearSession();
          if (typeof SNM.showScreen === "function") SNM.showScreen("role-select");
          return;
        }
        if (act && typeof SNM.showScreen === "function") SNM.showScreen(act);
        return;
      }
      var m2 = document.getElementById("menuSheet");
      if (
        m2 &&
        !m2.classList.contains("hidden") &&
        !e.target.closest("#menuSheet") &&
        !e.target.closest("#btnMenu")
      ) {
        SNM.closeMenuSheet();
      }
    },
    true
  );
};

SNM.showDriverWorkspace = function () {
  ["shop-merchant", "shop-service", "shop-emergency"].forEach(function (id) {
    var el = document.getElementById(id);
    if (!el) return;
    el.classList.add("hidden");
    el.style.display = "none";
  });
  var d = document.getElementById("shop-driver");
  if (!d) {
    console.warn("shop-driver missing");
    return;
  }
  d.classList.remove("hidden");
  d.removeAttribute("hidden");
  d.style.display = "block";
  d.style.visibility = "visible";
  d.style.opacity = "1";
  d.style.minHeight = "200px";
};

SNM.onShopEnter = function () {
  var u = (typeof SNM.getUser === "function" && SNM.getUser()) || {};
  var role = String(
    (u && u.role) ||
      (typeof SNM.getRole === "function" && SNM.getRole()) ||
      sessionStorage.getItem("snm_role") ||
      ""
  ).toLowerCase().trim();
  if (role === "logistics") role = "driver";

  if (role === "driver") {
    SNM.showDriverWorkspace();
    if (typeof SNM.wireDriverWorkspace === "function") {
      try {
        SNM.wireDriverWorkspace();
      } catch (e) {}
    }
    return;
  }
  if (role === "merchant") {
    var m = document.getElementById("shop-merchant");
    if (m) {
      m.classList.remove("hidden");
      m.style.display = "block";
    }
    if (typeof SNM.loadShop === "function") SNM.loadShop();
    return;
  }
  if (role === "service") {
    var s = document.getElementById("shop-service");
    if (s) {
      s.classList.remove("hidden");
      s.style.display = "block";
    }
    if (typeof SNM.loadShop === "function") SNM.loadShop();
    return;
  }
  if (role === "emergency") {
    var em = document.getElementById("shop-emergency");
    if (em) {
      em.classList.remove("hidden");
      em.style.display = "block";
    }
    return;
  }
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", function () {
    SNM.bindMenuFixed();
  });
} else {
  SNM.bindMenuFixed();
}
