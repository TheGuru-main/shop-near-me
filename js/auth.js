window.SNM = window.SNM || {};

SNM.selectedRole = "buyer";
SNM._lastLat = 4.85;
SNM._lastLng = 7.05;

SNM.toggleRoleExtras = function (role) {
  var buyer = document.getElementById("buyerPrefsBlock");
  var merch = document.getElementById("merchantExtras");
  var driver = document.getElementById("driverExtras");
  var emerg = document.getElementById("emergencyExtras");
  if (buyer) buyer.classList.toggle("hidden", role !== "buyer");
  if (merch) {
    merch.classList.toggle(
      "hidden",
      role !== "merchant" && role !== "service_provider"
    );
  }
  if (driver) driver.classList.toggle("hidden", role !== "driver");
  if (emerg) emerg.classList.toggle("hidden", role !== "emergency");
};

SNM.buildRoleGrid = function () {
  var grid = document.getElementById("roleGrid");
  if (!grid) return;
  grid.innerHTML = (SNM.ROLES || [])
    .map(function (r) {
      return (
        '<div class="role-card" data-role="' +
        r.id +
        '"><div class="icon"><i class="fas ' +
        r.icon +
        '"></i></div><div>' +
        r.label +
        "</div></div>"
      );
    })
    .join("");

  grid.querySelectorAll(".role-card").forEach(function (el) {
    el.addEventListener("click", function () {
      SNM.selectedRole = el.getAttribute("data-role") || "buyer";
      grid.querySelectorAll(".role-card").forEach(function (c) {
        c.classList.remove("selected");
      });
      el.classList.add("selected");
      var label = document.getElementById("regRoleLabel");
      if (label) label.textContent = SNM.selectedRole;
      SNM.toggleRoleExtras(SNM.selectedRole);
      SNM.showScreen("register");
    });
  });
};

SNM.collectRegisterBody = function () {
  function val(id) {
    var el = document.getElementById(id);
    return el ? (el.value || "").trim() : "";
  }
  var contId = val("reg-continent") || "003";
  var cont = (SNM.CONTINENTS || []).find(function (c) {
    return c.id === contId;
  });
  var prefsRaw = val("reg-prefs");
  var lat = typeof SNM._lastLat === "number" ? SNM._lastLat : 4.85;
  var lng = typeof SNM._lastLng === "number" ? SNM._lastLng : 7.05;

  return {
    role: SNM.selectedRole || "buyer",
    name: val("reg-name"),
    continent_id: cont ? cont.id : "003",
    continent_name: cont ? cont.name : "Africa",
    country: val("reg-country"),
    region: val("reg-region") || null,
    city: val("reg-city") || null,
    community: val("reg-community") || null,
    primary_location: val("reg-primary"),
    lat: lat,
    lng: lng,
    phone: val("reg-phone"),
    password: val("reg-password"),
    prefs: prefsRaw
      .split(",")
      .map(function (s) {
        return s.trim();
      })
      .filter(Boolean)
  };
};

SNM.bindAuth = function () {
  if (typeof SNM.bindCascade === "function") SNM.bindCascade();
  SNM.buildRoleGrid();

  var ver = document.getElementById("aboutVersion");
  if (ver) ver.textContent = SNM.APP_VERSION || "1.0.0.1p";

  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      function (pos) {
        SNM._lastLat = pos.coords.latitude;
        SNM._lastLng = pos.coords.longitude;
      },
      function () {},
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 }
    );
  }

  var aboutBtn = document.getElementById("btnAboutFromRole");
  if (aboutBtn) {
    aboutBtn.onclick = function (e) {
      e.preventDefault();
      SNM.showScreen("about");
    };
  }

  var goLogin = document.getElementById("btnGoLogin");
  if (goLogin) {
    goLogin.onclick = function (e) {
      e.preventDefault();
      SNM.showScreen("login");
    };
  }

  document.querySelectorAll("[data-back]").forEach(function (el) {
    el.addEventListener("click", function (e) {
      e.preventDefault();
      var t = el.getAttribute("data-back");
      if (t) SNM.showScreen(t);
    });
  });

  var backOtp = document.getElementById("btnBackFromOtp");
  if (backOtp) {
    backOtp.onclick = function (e) {
      e.preventDefault();
      SNM.showScreen("register");
    };
  }

  var regBtn = document.getElementById("btnRegister");
  if (regBtn) {
    regBtn.onclick = async function () {
      var body = SNM.collectRegisterBody();
      if (!body.name) return SNM.toast("Enter full name");
      if (!body.country) return SNM.toast("Select country");
      if (!body.primary_location) return SNM.toast("Primary location required");
      if (!body.phone || body.phone.charAt(0) !== "+") {
        return SNM.toast("Phone must start with +");
      }
      if (!body.password || body.password.length < 6) {
        return SNM.toast("Password min 6 characters");
      }
      try {
        regBtn.disabled = true;
        SNM.toast("Requesting OTP…");
        var data = await SNM.api("/auth/otp/request", {
          method: "POST",
          body: body
        });
        SNM.setPending(data.pending_id || "");
        var hint = document.getElementById("otpHint");
        var code = document.getElementById("otp-code");
        if (data.otp_dev && code) {
          code.value = String(data.otp_dev);
          if (hint) {
            hint.textContent =
              "Sandbox OTP filled · " + (data.phone || body.phone);
          }
        } else if (hint) {
          hint.textContent = "Enter code for " + (data.phone || body.phone);
        }
        SNM.showScreen("otp");
        SNM.toast("OTP ready");
      } catch (e) {
        SNM.toast(e.message || "OTP request failed");
      } finally {
        regBtn.disabled = false;
      }
    };
  }

  var verifyBtn = document.getElementById("btnVerifyOtp");
  if (verifyBtn) {
    verifyBtn.onclick = async function () {
      var otpEl = document.getElementById("otp-code");
      var otp = otpEl ? (otpEl.value || "").trim() : "";
      if (!otp) return SNM.toast("Enter OTP");
      try {
        verifyBtn.disabled = true;
        var data = await SNM.api("/auth/otp/verify", {
          method: "POST",
          body: { pending_id: SNM.getPending(), otp: otp }
        });
        SNM.setSession(data.access_token, data.user);
        SNM.toast("Welcome");
        if (typeof SNM.onAuthed === "function") SNM.onAuthed();
        else SNM.showScreen("home");
      } catch (e) {
        SNM.toast(e.message || "Invalid OTP");
      } finally {
        verifyBtn.disabled = false;
      }
    };
  }

  var resendBtn = document.getElementById("btnResendOtp");
  if (resendBtn) {
    resendBtn.onclick = async function () {
      var pid = SNM.getPending();
      if (!pid) return SNM.toast("No pending OTP");
      try {
        resendBtn.disabled = true;
        var data = await SNM.api(
          "/auth/otp/resend?pending_id=" + encodeURIComponent(pid),
          { method: "POST", body: {} }
        );
        var code = document.getElementById("otp-code");
        if (data && data.otp_dev && code) code.value = String(data.otp_dev);
        SNM.toast("OTP resent");
      } catch (e) {
        SNM.toast(e.message || "Resend failed");
      } finally {
        resendBtn.disabled = false;
      }
    };
  }

  var loginBtn = document.getElementById("btnLogin");
  if (loginBtn) {
    loginBtn.onclick = async function () {
      var phone = (document.getElementById("login-phone").value || "").trim();
      var password = document.getElementById("login-password").value || "";
      if (!phone) return SNM.toast("Enter phone");
      if (!password) return SNM.toast("Enter password");
      try {
        loginBtn.disabled = true;
        var data = await SNM.api("/auth/login", {
          method: "POST",
          body: { phone: phone, password: password }
        });
        SNM.setSession(data.access_token, data.user);
        SNM.toast("Logged in");
        if (typeof SNM.onAuthed === "function") SNM.onAuthed();
        else SNM.showScreen("home");
      } catch (e) {
        SNM.toast(e.message || "Login failed");
      } finally {
        loginBtn.disabled = false;
      }
    };
  }

  var logoutBtn = document.getElementById("btnLogout");
  if (logoutBtn) {
    logoutBtn.onclick = function () {
      SNM.clearSession();
      SNM.showScreen("role-select");
    };
  }
};
