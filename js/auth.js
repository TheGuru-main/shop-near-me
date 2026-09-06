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

SNM.showSetupForRole = function (role) {
  role = role || SNM.getRole() || "buyer";
  var label = document.getElementById("setupRoleLabel");
  if (label) label.textContent = role;

  ["buyer", "merchant", "service", "driver", "emergency"].forEach(function (r) {
    var panel = document.getElementById("setup-" + r);
    if (panel) {
      if (r === role) panel.classList.remove("hidden");
      else panel.classList.add("hidden");
    }
  });

  if (role === "buyer") {
    var box = document.getElementById("buyerPrefs");
    if (box && !box.dataset.ready) {
      box.innerHTML = (SNM.BUYER_PREFS || [])
        .map(function (p) {
          return (
            '<label class="check-row"><input type="checkbox" class="pref-cb" value="' +
            p +
            '"/> ' +
            p +
            "</label>"
          );
        })
        .join("");
      box.dataset.ready = "1";
    }
  }
};

SNM.bindAuth = function () {
  var btnRegister = document.getElementById("btnRegister");
  if (btnRegister) {
    btnRegister.onclick = async function () {
      SNM._showErr("regError", "");
      var role =
        SNM.getRole() ||
        sessionStorage.getItem("snm_role") ||
        sessionStorage.getItem("snm_reg_role") ||
        "buyer";
      var name = (document.getElementById("reg-name").value || "").trim();
      var continentEl = document.getElementById("reg-continent");
      var continentId = continentEl ? continentEl.value : "";
      var continentName = "";
      if (continentEl && continentEl.selectedIndex >= 0) {
        continentName =
          continentEl.options[continentEl.selectedIndex].textContent;
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
          : (document.getElementById("reg-phone") || {}).value || "";

      if (!name) return SNM._showErr("regError", "Enter your full name.");
      if (!continentId) return SNM._showErr("regError", "Select continent.");
      if (!country) return SNM._showErr("regError", "Select country.");
      if (!region) return SNM._showErr("regError", "Select state / region.");
      if (!city) return SNM._showErr("regError", "Select city / town / LGA.");
      if (!community) return SNM._showErr("regError", "Select community.");
      if (!primary) return SNM._showErr("regError", "Enter primary location.");
      if (!phone || phone.charAt(0) !== "+") {
        return SNM._showErr("regError", "Phone must be international (+…).");
      }
      if (!password || password.length < 4) {
        return SNM._showErr("regError", "Password too short.");
      }

      if (typeof SNM.countryByName === "function") {
        var cmeta = SNM.countryByName(country);
        if (cmeta && cmeta.localLen) {
          var local = (
            document.getElementById("reg-local").value || ""
          ).replace(/\D/g, "");
          while (local.charAt(0) === "0") local = local.slice(1);
          if (local.length !== cmeta.localLen) {
            return SNM._showErr(
              "regError",
              "Local number for " +
                country +
                " should be " +
                cmeta.localLen +
                " digits (no leading 0)."
            );
          }
        }
      }

      btnRegister.disabled = true;
      try {
        var geo = await SNM._geo();
        if (geo.lat == null || geo.lng == null) {
          geo = {
            lat: SNM._lastLat != null ? SNM._lastLat : 4.8156,
            lng: SNM._lastLng != null ? SNM._lastLng : 7.0498
          };
        }
        SNM._lastLat = geo.lat;
        SNM._lastLng = geo.lng;

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
          primary_location: primary,
          lat: geo.lat,
          lng: geo.lng
        };

        SNM._showErr("regError", "Requesting OTP… (server may take \~30s cold start)");
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
        SNM._showErr(
          "regError",
          SNM._errText(err) || "OTP request failed"
        );
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
        if (user) SNM.setUser(user);
        SNM.setPending(null);
        SNM.setSetupDone(false);
        SNM.showSetupForRole((user && user.role) || pending.role || "buyer");
        SNM.showScreen("setup");
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
        SNM._showErr("loginError", "");
        if (!SNM.setupDone()) {
          SNM.showSetupForRole((user && user.role) || "buyer");
          SNM.showScreen("setup");
        } else {
          SNM.showScreen("home");
        }
      } catch (err) {
        SNM._showErr("loginError", SNM._errText(err) || "Login failed");
      }
      btnLogin.disabled = false;
    };
  }

  var btnSetupDone = document.getElementById("btnSetupDone");
  if (btnSetupDone) {
    btnSetupDone.onclick = function () {
      var role = SNM.getRole();
      var extra = { role: role };
      if (role === "buyer") {
        extra.prefs = [];
        document.querySelectorAll(".pref-cb:checked").forEach(function (cb) {
          extra.prefs.push(cb.value);
        });
      }
      if (role === "merchant") {
        extra.business_name =
          (document.getElementById("setup-biz-name") || {}).value || "";
        extra.category =
          (document.getElementById("setup-biz-category") || {}).value || "";
        extra.walkin = !!(document.getElementById("setup-walkin") || {}).checked;
        extra.pod = !!(document.getElementById("setup-pod") || {}).checked;
        extra.delivery = !!(document.getElementById("setup-delivery") || {})
          .checked;
        extra.hours =
          (document.getElementById("setup-hours") || {}).value || "";
      }
      if (role === "service") {
        extra.service_type =
          (document.getElementById("setup-service-type") || {}).value || "";
        extra.home_service = !!(
          document.getElementById("setup-home-service") || {}
        ).checked;
        extra.hours =
          (document.getElementById("setup-service-hours") || {}).value || "";
      }
      if (role === "driver") {
        extra.coverage =
          (document.getElementById("setup-driver-coverage") || {}).value || "";
        extra.active = !!(document.getElementById("setup-driver-active") || {})
          .checked;
      }
      if (role === "emergency") {
        extra.unit_type =
          (document.getElementById("setup-emerg-type") || {}).value || "";
        extra.public_contact =
          (document.getElementById("setup-emerg-contact") || {}).value || "";
        extra.active = !!(document.getElementById("setup-emerg-active") || {})
          .checked;
      }
      try {
        localStorage.setItem("snm_setup_meta", JSON.stringify(extra));
      } catch (e) {}
      SNM.setSetupDone(true);
      SNM.showScreen("home");
    };
  }
};
