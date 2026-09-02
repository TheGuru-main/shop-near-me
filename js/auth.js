window.SNM = window.SNM || {};

SNM.applyRoleExtras = function (role) {
  role = role || SNM.getRole();
  var label = document.getElementById("regRoleLabel");
  if (label) label.textContent = role;

  function show(id, on) {
    var el = document.getElementById(id);
    if (!el) return;
    if (on) el.classList.remove("hidden");
    else el.classList.add("hidden");
  }

  show("buyerPrefsBlock", role === "buyer");
  show("merchantExtras", role === "merchant" || role === "service_provider");
  show("driverExtras", role === "driver");
  show("emergencyExtras", role === "emergency");
};

SNM.fillContinents = function () {
  var sel = document.getElementById("reg-continent");
  if (!sel) return;
  sel.innerHTML = '<option value="">Select continent</option>';
  (SNM.CONTINENTS || []).forEach(function (c) {
    var opt = document.createElement("option");
    opt.value = c.id;
    opt.textContent = c.name;
    sel.appendChild(opt);
  });
};

SNM.onAuthed = function (data) {
  if (data && data.access_token) SNM.setToken(data.access_token);
  if (data && data.user) SNM.setUser(data.user);
  SNM.go("#home");
};

SNM.logout = function () {
  SNM.clearSession();
  SNM.go("#role-select");
  SNM.toast("Logged out");
};

SNM.bindAuth = function () {
  SNM.fillContinents();
  SNM.applyRoleExtras(SNM.getRole());

  if (typeof SNM.initCascade === "function") {
    try {
      SNM.initCascade();
    } catch (e) {
      console.warn("cascade init", e);
    }
  }

  var ver = document.getElementById("aboutVersion");
  if (ver) ver.textContent = SNM.APP_VERSION || "1.0.0.1p";

  var btnReg = document.getElementById("btnRegister");
  if (btnReg) {
    btnReg.onclick = async function () {
      SNM.showError("regError", "");
      var role = SNM.getRole() || "buyer";
      var name = SNM.val("reg-name");
      var continent = SNM.val("reg-continent");
      var country = SNM.val("reg-country");
      var region = SNM.val("reg-region");
      var city = SNM.val("reg-city");
      var community = SNM.val("reg-community");
      var primary = SNM.val("reg-primary");
      var phone = SNM.val("reg-phone");
      var password = SNM.val("reg-password");

      if (!name) return SNM.showError("regError", "Name is required.");
      if (!continent) return SNM.showError("regError", "Select continent.");
      if (!country) return SNM.showError("regError", "Select or enter country.");
      if (!primary) return SNM.showError("regError", "Primary location is required.");
      var phoneErr = SNM.requirePhonePlus(phone);
      if (phoneErr) return SNM.showError("regError", phoneErr);
      if (!password || password.length < 6) {
        return SNM.showError("regError", "Password must be at least 6 characters.");
      }

      var contObj = (SNM.CONTINENTS || []).find(function (c) {
        return c.id === continent;
      });

      var body = {
        role: role,
        name: name,
        phone: phone,
        password: password,
        continent_id: continent,
        continent_name: contObj ? contObj.name : continent,
        country: country,
        region: region || null,
        city: city || null,
        community: community || null,
        primary_location: primary
      };

      if (role === "buyer") {
        var prefs = SNM.val("reg-prefs");
        body.prefs = prefs
          ? prefs.split(",").map(function (s) {
              return s.trim();
            }).filter(Boolean)
          : [];
      }
      if (role === "merchant" || role === "service_provider") {
        body.business_name = SNM.val("reg-business-name") || name;
        body.walk_in = !!(document.getElementById("reg-walkin") || {}).checked;
        body.home_delivery = !!(document.getElementById("reg-delivery") || {}).checked;
      }
      if (role === "driver") body.vehicle = SNM.val("reg-vehicle") || null;
      if (role === "emergency") body.unit_type = SNM.val("reg-emergency-type") || null;

      btnReg.disabled = true;
      try {
        var data = await SNM.api("/auth/otp/request", {
          method: "POST",
          body: body
        });
        SNM.setPending({
          pending_id: data.pending_id,
          phone: phone,
          name: name
        });
        var hint = document.getElementById("otpHint");
        if (hint) {
          hint.textContent = data.otp_dev
            ? "Dev OTP: " + data.otp_dev + " (sandbox)"
            : "We sent a 6-digit code to " + phone;
        }
        SNM.go("#otp");
        SNM.toast("OTP ready");
      } catch (e) {
        SNM.showError("regError", e.message || "OTP request failed");
      } finally {
        btnReg.disabled = false;
      }
    };
  }

  var btnVerify = document.getElementById("btnVerifyOtp");
  if (btnVerify) {
    btnVerify.onclick = async function () {
      SNM.showError("otpError", "");
      var pending = SNM.getPending() || {};
      var otp = SNM.val("otp-code");
      if (!pending.pending_id) {
        return SNM.showError("otpError", "No pending signup. Register again.");
      }
      if (!otp || otp.length !== 6) {
        return SNM.showError("otpError", "Enter the 6-digit OTP.");
      }
      btnVerify.disabled = true;
      try {
        var data = await SNM.api("/auth/otp/verify", {
          method: "POST",
          body: { pending_id: pending.pending_id, otp: otp }
        });
        localStorage.removeItem(SNM.STORAGE.pending);
        SNM.onAuthed(data);
        SNM.toast("Welcome");
      } catch (e) {
        SNM.showError("otpError", e.message || "Invalid OTP");
      } finally {
        btnVerify.disabled = false;
      }
    };
  }

  var btnResend = document.getElementById("btnResendOtp");
  if (btnResend) {
    btnResend.onclick = async function () {
      var pending = SNM.getPending() || {};
      if (!pending.pending_id) {
        SNM.toast("No pending signup");
        return;
      }
      try {
        var data = await SNM.api(
          "/auth/otp/resend?pending_id=" + encodeURIComponent(pending.pending_id),
          { method: "POST" }
        );
        var hint = document.getElementById("otpHint");
        if (hint && data && data.otp_dev) {
          hint.textContent = "Dev OTP: " + data.otp_dev + " (sandbox)";
        }
        SNM.toast("OTP resent");
      } catch (e) {
        SNM.toast(e.message || "Resend failed");
      }
    };
  }

  var btnLogin = document.getElementById("btnLogin");
  if (btnLogin) {
    btnLogin.onclick = async function () {
      SNM.showError("loginError", "");
      var phone = SNM.val("login-phone");
      var password = SNM.val("login-password");
      var phoneErr = SNM.requirePhonePlus(phone);
      if (phoneErr) return SNM.showError("loginError", phoneErr);
      if (!password) return SNM.showError("loginError", "Password required.");
      btnLogin.disabled = true;
      try {
        var data = await SNM.api("/auth/login", {
          method: "POST",
          body: { phone: phone, password: password }
        });
        SNM.onAuthed(data);
        SNM.toast("Logged in");
      } catch (e) {
        SNM.showError("loginError", e.message || "Login failed");
      } finally {
        btnLogin.disabled = false;
      }
    };
  }

  var btnLogout = document.getElementById("btnLogout");
  if (btnLogout) btnLogout.onclick = SNM.logout;
  var btnLogoutMenu = document.getElementById("btnLogoutMenu");
  if (btnLogoutMenu) btnLogoutMenu.onclick = SNM.logout;
};
