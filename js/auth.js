window.SNM = window.SNM || {};

SNM.selectedRole = "buyer";

SNM.fillContinents = function () {
  var sel = document.getElementById("reg-continent");
  if (!sel) return;
  sel.innerHTML = SNM.CONTINENTS.map(function (c) {
    return "<option value=\"" + c.id + "\">" + c.name + "</option>";
  }).join("");
};

SNM.toggleRoleExtras = function (role) {
  var buyer = document.getElementById("buyerPrefsBlock");
  var merch = document.getElementById("merchantExtras");
  var driver = document.getElementById("driverExtras");
  var emerg = document.getElementById("emergencyExtras");
  if (buyer) buyer.classList.toggle("hidden", role !== "buyer");
  if (merch) merch.classList.toggle("hidden", role !== "merchant" && role !== "service_provider");
  if (driver) driver.classList.toggle("hidden", role !== "driver");
  if (emerg) emerg.classList.toggle("hidden", role !== "emergency");
};

SNM.buildRoleGrid = function () {
  var grid = document.getElementById("roleGrid");
  if (!grid) return;
  grid.innerHTML = SNM.ROLES.map(function (r) {
    return (
      "<div class=\"role-card\" data-role=\"" + r.id + "\">" +
      "<div class=\"icon\">" + r.icon + "</div>" +
      "<div>" + r.label + "</div></div>"
    );
  }).join("");

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
  var contId = document.getElementById("reg-continent").value;
  var cont = SNM.CONTINENTS.find(function (c) { return c.id === contId; });
  var phone = (document.getElementById("reg-phone").value || "").trim();
  var prefsRaw = (document.getElementById("reg-prefs") && document.getElementById("reg-prefs").value) || "";

  return {
    role: SNM.selectedRole,
    name: (document.getElementById("reg-name").value || "").trim(),
    continent_id: cont ? cont.id : "003",
    continent_name: cont ? cont.name : "Africa",
    country: (document.getElementById("reg-country").value || "").trim(),
    region: (document.getElementById("reg-region").value || "").trim() || null,
    city: (document.getElementById("reg-city").value || "").trim() || null,
    community: (document.getElementById("reg-community").value || "").trim() || null,
    primary_location: (document.getElementById("reg-primary").value || "").trim(),
    lat: null,
    lng: null,
    phone: phone,
    password: document.getElementById("reg-password").value || "",
    prefs: prefsRaw.split(",").map(function (s) { return s.trim(); }).filter(Boolean)
  };
};

SNM.bindAuth = function () {
  SNM.fillContinents();
  SNM.buildRoleGrid();

  var aboutBtn = document.getElementById("btnAboutFromRole");
  if (aboutBtn) aboutBtn.onclick = function () { SNM.showScreen("about"); };

  var goLogin = document.getElementById("btnGoLogin");
  if (goLogin) goLogin.onclick = function () { SNM.showScreen("login"); };

  document.querySelectorAll("[data-back]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      SNM.showScreen(btn.getAttribute("data-back"));
    });
  });

  var backOtp = document.getElementById("btnBackFromOtp");
  if (backOtp) {
    backOtp.onclick = function () {
      SNM.showScreen("register");
    };
  }

  var regBtn = document.getElementById("btnRegister");
  if (regBtn) {
    regBtn.onclick = async function () {
      var body = SNM.collectRegisterBody();
      if (!body.name) return SNM.toast("Enter full name");
      if (!body.phone.startsWith("+")) return SNM.toast("Phone must start with +");
      if (!body.password || body.password.length < 6) return SNM.toast("Password min 6 chars");
      if (!body.primary_location) return SNM.toast("Primary location required");
      try {
        regBtn.disabled = true;
        var data = await SNM.api("/auth/otp/request", { method: "POST", body: body });
        SNM.setPending(data.pending_id || "");
        var hint = document.getElementById("otpHint");
        var code = document.getElementById("otp-code");
        if (data.otp_dev && code) {
          code.value = data.otp_dev;
          if (hint) hint.textContent = "Sandbox OTP filled (otp_dev). Verify to enter.";
        } else if (hint) {
          hint.textContent = "Enter the 6-digit OTP sent to your phone.";
        }
        SNM.showScreen("otp");
        SNM.toast("OTP requested");
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
      try {
        verifyBtn.disabled = true;
        var data = await SNM.api("/auth/otp/verify", {
          method: "POST",
          body: {
            pending_id: SNM.getPending(),
            otp: (document.getElementById("otp-code").value || "").trim()
          }
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
      try {
        var pid = SNM.getPending();
        await SNM.api("/auth/otp/resend?pending_id=" + encodeURIComponent(pid), {
          method: "POST",
          body: {}
        });
        SNM.toast("OTP resent");
      } catch (e) {
        SNM.toast(e.message || "Resend failed");
      }
    };
  }

  var loginBtn = document.getElementById("btnLogin");
  if (loginBtn) {
    loginBtn.onclick = async function () {
      try {
        loginBtn.disabled = true;
        var data = await SNM.api("/auth/login", {
          method: "POST",
          body: {
            phone: (document.getElementById("login-phone").value || "").trim(),
            password: document.getElementById("login-password").value || ""
          }
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
