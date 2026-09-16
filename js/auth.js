window.SNM = window.SNM || {};

SNM._geo = function () {
  return new Promise(function (resolve) {
    if (!navigator.geolocation) {
      resolve({ lat: null, lng: null });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      function (pos) {
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude
        });
      },
      function () {
        resolve({ lat: null, lng: null });
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 120000 }
    );
  });
};

SNM._errText = function (err) {
  if (!err) return "Request failed";
  if (typeof err === "string") return err;
  var d = err.data != null ? err.data : err;
  if (typeof d === "string") return d;
  if (d && typeof d.detail === "string") return d.detail;
  if (d && Array.isArray(d.detail)) {
    return d.detail
      .map(function (x) {
        return x.msg || JSON.stringify(x);
      })
      .join("; ");
  }
  if (d && d.message) return d.message;
  if (err.message) return err.message;
  try {
    return JSON.stringify(d);
  } catch (e) {
    return "Request failed";
  }
};

SNM._showErr = function (id, msg) {
  var el = document.getElementById(id);
  if (!el) return;
  if (!msg) {
    el.textContent = "";
    el.classList.remove("show");
    return;
  }
  el.textContent = SNM._errText(msg);
  el.classList.add("show");
};

SNM._profileLooksComplete = function (user) {
  if (typeof SNM.setupDone === "function" && SNM.setupDone()) return true;
  try {
    if (localStorage.getItem("snm_setup_done") === "1") return true;
  } catch (e) {}
  user = user || (typeof SNM.getUser === "function" && SNM.getUser()) || {};
  if (!user || !user.role) return false;
  if (user.primary_location || user.community || user.city) return true;
  try {
    var setup = JSON.parse(localStorage.getItem("snm_setup_data") || "null");
    if (setup && (setup.prefs || setup.shop_name || setup.coverage)) return true;
  } catch (e2) {}
  return false;
};

SNM._openSetup = function (role) {
  role = String(role || "buyer")
    .toLowerCase()
    .trim();
  if (role === "logistics") role = "driver";
  try {
    sessionStorage.setItem("snm_role", role);
  } catch (e) {}

  if (typeof SNM.showScreen === "function") SNM.showScreen("setup");

  if (typeof SNM.showSetupForRole === "function") {
    SNM.showSetupForRole(role);
  } else {
    var label = document.getElementById("setupRoleLabel");
    if (label) label.textContent = role;
    ["buyer", "merchant", "service", "driver", "emergency"].forEach(function (
      r
    ) {
      var panel = document.getElementById("setup-" + r);
      if (!panel) return;
      if (r === role) {
        panel.classList.remove("hidden");
        panel.style.display = "";
      } else {
        panel.classList.add("hidden");
      }
    });
    if (role === "buyer" && typeof SNM.renderBuyerPrefs === "function") {
      SNM.renderBuyerPrefs();
    }
  }

  function rewire() {
    if (typeof SNM.wireSetupDoneButton === "function") {
      SNM.wireSetupDoneButton();
    }
    if (role === "buyer" && typeof SNM.renderBuyerPrefs === "function") {
      SNM.renderBuyerPrefs();
    }
  }
  rewire();
  setTimeout(rewire, 0);
  setTimeout(rewire, 80);
};

SNM._goHomeAfterAuth = function () {
  if (typeof SNM.markSetupDone === "function") SNM.markSetupDone();
  else {
    try {
      localStorage.setItem("snm_setup_done", "1");
    } catch (e) {}
  }
  if (typeof SNM.goHomeNow === "function") {
    SNM.goHomeNow();
    return;
  }
  if (typeof SNM.showScreen === "function") {
    SNM.showScreen("home");
    return;
  }
  try {
    location.hash = "#home";
  } catch (e2) {}
};

SNM.bindAuth = function () {
  if (SNM._authBound) return;
  SNM._authBound = true;

  var btnRegister = document.getElementById("btnRegister");
  if (btnRegister) {
    btnRegister.onclick = async function () {
      SNM._showErr("regError", "");
      var role =
        (typeof SNM.getRole === "function" && SNM.getRole()) ||
        sessionStorage.getItem("snm_role") ||
        sessionStorage.getItem("snm_reg_role") ||
        "buyer";
      role = String(role).toLowerCase().trim();

      var name = (document.getElementById("reg-name").value || "").trim();
      var continentEl = document.getElementById("reg-continent");
      var continentId = continentEl ? continentEl.value : "";
      var continentName = "";
      if (continentEl && continentEl.selectedIndex >= 0) {
        continentName =
          continentEl.options[continentEl.selectedIndex].textContent || "";
      }
      var country = (document.getElementById("reg-country").value || "").trim();
      var region = (document.getElementById("reg-region").value || "").trim();
      var city = (document.getElementById("reg-city").value || "").trim();
      var community = (
        document.getElementById("reg-community").value || ""
      ).trim();
      var primary = (document.getElementById("reg-primary").value || "").trim();
      var password = document.getElementById("reg-password").value || "";
      var phone =
        typeof SNM.composePhone === "function"
          ? SNM.composePhone()
          : ((document.getElementById("reg-phone") || {}).value || "").trim();

      if (!name) return SNM._showErr("regError", "Enter your full name.");
      if (!continentId) return SNM._showErr("regError", "Select continent.");
      if (!country) return SNM._showErr("regError", "Select country.");
      if (!region) return SNM._showErr("regError", "Select state / region.");
      if (!city) return SNM._showErr("regError", "Select city / town / LGA.");
      if (!community) return SNM._showErr("regError", "Select community.");
      if (!primary) return SNM._showErr("regError", "Enter primary location.");
      if (!phone || phone.charAt(0) !== "+" || phone.length < 11) {
        return SNM._showErr(
          "regError",
          "Select country (dial code) and enter a full mobile number."
        );
      }
      if (phone.indexOf("+234") === 0 && phone.length !== 14) {
        return SNM._showErr(
          "regError",
          "Nigeria: +234 + 10 digits (e.g. 708…), no leading 0."
        );
      }
      if (!password || password.length < 6) {
        return SNM._showErr("regError", "Password min 6 characters.");
      }

      btnRegister.disabled = true;
      try {
        var geo = await SNM._geo();
        if (geo.lat != null) SNM._lastLat = geo.lat;
        if (geo.lng != null) SNM._lastLng = geo.lng;

        var body = {
          name: name,
          phone: phone,
          password: password,
          role: role,
          continent_id: continentId,
          continent_name: continentName,
          country: country,
          region: region,
          city: city,
          community: community,
          primary_location: primary
        };
        if (geo.lat != null && !isNaN(geo.lat)) body.lat = geo.lat;
        if (geo.lng != null && !isNaN(geo.lng)) body.lng = geo.lng;
        if (body.lat == null && SNM._lastLat != null) body.lat = SNM._lastLat;
        if (body.lng == null && SNM._lastLng != null) body.lng = SNM._lastLng;

        SNM._showErr(
          "regError",
          "Requesting OTP… (server may take \~30s on cold start)"
        );
        var data = await SNM.api("/auth/otp/request", {
          method: "POST",
          body: body
        });
        SNM.setPending({
          pending_id: data.pending_id || data.pendingId,
          phone: phone,
          role: role,
          otp_dev: data.otp_dev || null
        });

        var hint = document.getElementById("otpHint");
        if (hint) {
          hint.textContent = data.otp_dev
            ? "Dev OTP: " + data.otp_dev + " (sandbox)"
            : "Enter the 6-digit code for " + phone;
        }
        var codeEl = document.getElementById("otp-code");
        if (data.otp_dev && codeEl) codeEl.value = String(data.otp_dev);

        SNM._showErr("regError", "");
        SNM.showScreen("otp");
      } catch (err) {
        SNM._showErr("regError", SNM._errText(err) || "OTP request failed");
      }
      btnRegister.disabled = false;
    };
  }

  var btnVerify = document.getElementById("btnVerifyOtp");
  if (btnVerify) {
    btnVerify.onclick = async function () {
      SNM._showErr("otpError", "");
      var pending = SNM.getPending() || {};
      var otp = (document.getElementById("otp-code").value || "").trim();
      if (!pending.pending_id) {
        return SNM._showErr("otpError", "Session expired. Register again.");
      }
      if (otp.length !== 6) {
        return SNM._showErr("otpError", "OTP must be 6 digits.");
      }
      btnVerify.disabled = true;
      try {
        var data = await SNM.api("/auth/otp/verify", {
          method: "POST",
          body: { pending_id: pending.pending_id, otp: otp }
        });
        var token = data.access_token || data.token;
        var user = data.user || data;
        if (token) SNM.setToken(token);
        if (user) {
          if (!user.role && pending.role) user.role = pending.role;
          SNM.setUser(user);
        }
        try {
          sessionStorage.setItem(
            "snm_role",
            (user && user.role) || pending.role || "buyer"
          );
        } catch (e) {}
        SNM.setPending(null);
        if (typeof SNM.setSetupDone === "function") SNM.setSetupDone(false);
        try {
          localStorage.removeItem("snm_setup_done");
        } catch (e2) {}
        SNM._openSetup((user && user.role) || pending.role || "buyer");
      } catch (err) {
        SNM._showErr("otpError", SNM._errText(err) || "Invalid OTP");
      }
      btnVerify.disabled = false;
    };
  }

  var btnResend = document.getElementById("btnResendOtp");
  if (btnResend) {
    btnResend.onclick = async function () {
      SNM._showErr("otpError", "");
      var pending = SNM.getPending() || {};
      if (!pending.pending_id) {
        return SNM._showErr("otpError", "No pending OTP.");
      }
      try {
        var data = await SNM.api(
          "/auth/otp/resend" + SNM.qs({ pending_id: pending.pending_id }),
          { method: "POST", body: { pending_id: pending.pending_id } }
        );
        if (data && data.otp_dev) {
          var hint = document.getElementById("otpHint");
          if (hint) hint.textContent = "Dev OTP: " + data.otp_dev;
          var codeEl = document.getElementById("otp-code");
          if (codeEl) codeEl.value = String(data.otp_dev);
        }
      } catch (err) {
        SNM._showErr("otpError", SNM._errText(err) || "Resend failed");
      }
    };
  }

  var btnLogin = document.getElementById("btnLogin");
  if (btnLogin) {
    btnLogin.onclick = async function () {
      SNM._showErr("loginError", "");
      var phone = (document.getElementById("login-phone").value || "").trim();
      var password = document.getElementById("login-password").value || "";
      if (!phone || phone.charAt(0) !== "+") {
        return SNM._showErr("loginError", "Use E.164 phone (+234…).");
      }
      if (!password) return SNM._showErr("loginError", "Enter password.");
      btnLogin.disabled = true;
      try {
        SNM._showErr("loginError", "Signing in…");
        var data = await SNM.api("/auth/login", {
          method: "POST",
          body: { phone: phone, password: password }
        });
        var token = data.access_token || data.token;
        var user = data.user || data;
        if (token) SNM.setToken(token);
        if (user) SNM.setUser(user);
        try {
          if (user && user.role) sessionStorage.setItem("snm_role", user.role);
        } catch (e) {}
        SNM._showErr("loginError", "");

        if (SNM._profileLooksComplete(user)) {
          SNM._goHomeAfterAuth();
        } else if (typeof SNM.setupDone === "function" && SNM.setupDone()) {
          SNM._goHomeAfterAuth();
        } else {
          SNM._openSetup((user && user.role) || "buyer");
        }
      } catch (err) {
        SNM._showErr("loginError", SNM._errText(err) || "Login failed");
      }
      btnLogin.disabled = false;
    };
  }
};