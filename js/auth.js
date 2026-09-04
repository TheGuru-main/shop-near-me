window.SNM = window.SNM || {};

function showErr(id, msg) {
  var el = document.getElementById(id);
  if (!el) return;
  el.textContent = msg || "";
}

function getGeo() {
  return new Promise(function (resolve) {
    if (!navigator.geolocation) {
      resolve({ lat: 4.85, lng: 7.05 }); // PH fallback soft
      return;
    }
    navigator.geolocation.getCurrentPosition(
      function (pos) {
        resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      function () {
        resolve({ lat: 4.85, lng: 7.05 });
      },
      { timeout: 12000, maximumAge: 60000 }
    );
  });
}

SNM.onAuthed = function () {
  SNM.applyRoleChrome();
  if (!SNM.isSetupDone()) {
    var role = SNM.getRole();
    var map = {
      buyer: "setup-buyer",
      merchant: "setup-merchant",
      service_provider: "setup-service",
      driver: "setup-driver",
      emergency: "setup-emergency"
    };
    SNM.showScreen(map[role] || "setup-buyer");
    if (typeof SNM.initSetupScreens === "function") SNM.initSetupScreens();
    return;
  }
  SNM.go("home");
};

SNM.bindAuth = function () {
  if (typeof SNM.bindCascade === "function") SNM.bindCascade();

  document.querySelectorAll(".role-card").forEach(function (btn) {
    btn.onclick = function () {
      var role = btn.getAttribute("data-role");
      SNM.setRole(role);
      var lab = document.getElementById("regRoleLabel");
      if (lab) lab.textContent = role;
      SNM.showScreen("register");
    };
  });

  var goLogin = document.getElementById("btnGoLogin");
  if (goLogin) goLogin.onclick = function () { SNM.showScreen("login"); };

  var btnReg = document.getElementById("btnRegister");
  if (btnReg) btnReg.onclick = async function () {
    showErr("regError", "");
    try {
      var name = (document.getElementById("reg-name").value || "").trim();
      var continentId = document.getElementById("reg-continent").value;
      var continent = (SNM.CONTINENTS || []).find(function (c) { return c.id === continentId; });
      var country = document.getElementById("reg-country").value;
      var region = document.getElementById("reg-region").value;
      var city = document.getElementById("reg-city").value;
      var community = document.getElementById("reg-community").value;
      var primary = (document.getElementById("reg-primary").value || "").trim();
      var password = document.getElementById("reg-password").value || "";
      var phone = SNM.composePhone();
      var role = SNM.getRole() || "buyer";

      if (!name || !continentId || !country || !primary || !password) {
        showErr("regError", "Fill name, continent, country, primary location, password.");
        return;
      }
      if (!phone || phone.length < 10) {
        showErr("regError", "Enter a valid local number (no leading 0).");
        return;
      }

      var geo = await getGeo();
      var body = {
        name: name,
        phone: phone,
        password: password,
        role: role,
        continent_id: continentId,
        continent_name: (continent && continent.name) || "",
        country: country,
        region: region || "",
        city: city || "",
        community: community || "",
        primary_location: primary,
        lat: geo.lat,
        lng: geo.lng
      };

      var data = await SNM.api("/auth/otp/request", { method: "POST", body: body });
      SNM.setPending({
        pending_id: data.pending_id || data.id,
        phone: phone,
        name: name
      });
      if (data.otp_dev) SNM.toast("Dev OTP: " + data.otp_dev);
      SNM.showScreen("otp");
    } catch (e) {
      showErr("regError", e.message || String(e));
    }
  };

  var btnOtp = document.getElementById("btnVerifyOtp");
  if (btnOtp) btnOtp.onclick = async function () {
    showErr("otpError", "");
    try {
      var pending = SNM.getPending() || {};
      var otp = (document.getElementById("otp-code").value || "").trim();
      if (!otp || otp.length < 4) {
        showErr("otpError", "Enter OTP");
        return;
      }
      var data = await SNM.api("/auth/otp/verify", {
        method: "POST",
        body: { pending_id: pending.pending_id, otp: otp }
      });
      if (data.access_token) SNM.setToken(data.access_token);
      if (data.user) {
        SNM.setUser(data.user);
        if (data.user.role) SNM.setRole(data.user.role);
      }
      SNM.setPending(null);
      SNM.onAuthed();
    } catch (e) {
      showErr("otpError", e.message || String(e));
    }
  };

  var btnResend = document.getElementById("btnResendOtp");
  if (btnResend) btnResend.onclick = async function () {
    try {
      var pending = SNM.getPending() || {};
      var data = await SNM.api("/auth/otp/resend?pending_id=" + encodeURIComponent(pending.pending_id || ""), {
        method: "POST"
      });
      if (data && data.otp_dev) SNM.toast("Dev OTP: " + data.otp_dev);
      else SNM.toast("OTP resent");
    } catch (e) {
      showErr("otpError", e.message || String(e));
    }
  };

  var btnLogin = document.getElementById("btnLogin");
  if (btnLogin) btnLogin.onclick = async function () {
    showErr("loginError", "");
    try {
      var phone = (document.getElementById("login-phone").value || "").trim();
      var password = document.getElementById("login-password").value || "";
      var data = await SNM.api("/auth/login", {
        method: "POST",
        body: { phone: phone, password: password }
      });
      if (data.access_token) SNM.setToken(data.access_token);
      if (data.user) {
        SNM.setUser(data.user);
        if (data.user.role) SNM.setRole(data.user.role);
      }
      SNM.onAuthed();
    } catch (e) {
      showErr("loginError", e.message || String(e));
    }
  };
};
