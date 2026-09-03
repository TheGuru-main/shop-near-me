window.SNM = window.SNM || {};

SNM.currentRole = null;

function showErr(id, msg) {
  var el = document.getElementById(id);
  if (!el) return;
  el.textContent = msg || "";
  if (msg) el.classList.add("show");
  else el.classList.remove("show");
}

SNM.onAuthed = function () {
  SNM.showScreen("home");
  if (typeof SNM.refreshHome === "function") SNM.refreshHome();
};

SNM.logout = function () {
  SNM.clearSession();
  SNM.showScreen("role-select");
};

SNM.bindAuth = function () {
  var grid = document.getElementById("roleGrid");
  if (grid && !grid.children.length) {
    grid.innerHTML = (SNM.ROLES || [])
      .map(function (r) {
        return (
          '<button type="button" class="role-card" data-role="' +
          r.id +
          '">' +
          r.icon +
          "<br>" +
          r.label +
          "</button>"
        );
      })
      .join("");
  }

  var cont = document.getElementById("reg-continent");
  if (cont && !cont.options.length) {
    cont.innerHTML =
      '<option value="">Select continent</option>' +
      (SNM.CONTINENTS || [])
        .map(function (c) {
          return (
            '<option value="' +
            c.id +
            '">' +
            c.name +
            "</option>"
          );
        })
        .join("");
  }

  document.getElementById("roleGrid")?.addEventListener("click", function (e) {
    var btn = e.target.closest("[data-role]");
    if (!btn) return;
    SNM.currentRole = btn.getAttribute("data-role");
    SNM.setRole(SNM.currentRole);
    var lab = document.getElementById("regRoleLabel");
    if (lab) lab.textContent = SNM.currentRole;
    SNM.showScreen("register");
  });

  document.getElementById("btnGoLogin")?.addEventListener("click", function (e) {
    e.preventDefault();
    SNM.showScreen("login");
  });

  document.getElementById("btnRegister")?.addEventListener("click", async function () {
    showErr("regError", "");
    var name = (document.getElementById("reg-name")?.value || "").trim();
    var continent = document.getElementById("reg-continent")?.value || "";
    var country = (document.getElementById("reg-country")?.value || "").trim();
    var region = (document.getElementById("reg-region")?.value || "").trim();
    var city = (document.getElementById("reg-city")?.value || "").trim();
    var community = (document.getElementById("reg-community")?.value || "").trim();
    var primary = (document.getElementById("reg-primary")?.value || "").trim();
    var phone = (document.getElementById("reg-phone")?.value || "").trim();
    var password = document.getElementById("reg-password")?.value || "";

    if (!name) return showErr("regError", "Enter name");
    if (!continent) return showErr("regError", "Select continent");
    if (!country) return showErr("regError", "Enter country");
    if (!primary) return showErr("regError", "Enter primary location");
    if (!phone || phone.charAt(0) !== "+")
      return showErr("regError", "Phone must start with + (E.164)");
    if (!password) return showErr("regError", "Create password");

    var cmeta = (SNM.CONTINENTS || []).find(function (c) {
      return c.id === continent;
    });

    var body = {
      name: name,
      phone: phone,
      password: password,
      role: SNM.currentRole || SNM.getRole() || "buyer",
      continent_id: continent,
      continent_name: cmeta ? cmeta.name : "",
      country: country,
      region: region,
      city: city,
      community: community,
      primary_location: primary
    };

    try {
      var data = await SNM.api("/auth/otp/request", { method: "POST", body: body });
      SNM.setPending({
        pending_id: data.pending_id || data.id,
        phone: phone,
        name: name
      });
      if (data.otp_dev) {
        SNM.toast("Beta OTP: " + data.otp_dev);
        var otpInput = document.getElementById("otp-code");
        if (otpInput) otpInput.value = data.otp_dev;
      }
      SNM.showScreen("otp");
    } catch (err) {
      showErr("regError", err.message || "OTP request failed");
    }
  });

  document.getElementById("btnVerifyOtp")?.addEventListener("click", async function () {
    showErr("otpError", "");
    var pending = SNM.getPending() || {};
    var otp = (document.getElementById("otp-code")?.value || "").trim();
    if (!otp || otp.length < 4) return showErr("otpError", "Enter OTP");
    try {
      var data = await SNM.api("/auth/otp/verify", {
        method: "POST",
        body: {
          pending_id: pending.pending_id,
          otp: otp
        }
      });
      SNM.setToken(data.access_token || data.token || "");
      SNM.setUser(data.user || data);
      SNM.setPending(null);
      SNM.onAuthed();
    } catch (err) {
      showErr("otpError", err.message || "Invalid OTP");
    }
  });

  document.getElementById("btnResendOtp")?.addEventListener("click", async function () {
    var pending = SNM.getPending() || {};
    if (!pending.pending_id) return showErr("otpError", "No pending signup");
    try {
      var data = await SNM.api(
        "/auth/otp/resend?pending_id=" + encodeURIComponent(pending.pending_id),
        { method: "POST" }
      );
      if (data && data.otp_dev) {
        SNM.toast("Beta OTP: " + data.otp_dev);
        var otpInput = document.getElementById("otp-code");
        if (otpInput) otpInput.value = data.otp_dev;
      } else {
        SNM.toast("OTP resent");
      }
    } catch (err) {
      showErr("otpError", err.message || "Resend failed");
    }
  });

  document.getElementById("btnLogin")?.addEventListener("click", async function () {
    showErr("loginError", "");
    var phone = (document.getElementById("login-phone")?.value || "").trim();
    var password = document.getElementById("login-password")?.value || "";
    if (!phone || phone.charAt(0) !== "+")
      return showErr("loginError", "Phone must start with +");
    if (!password) return showErr("loginError", "Enter password");
    try {
      var data = await SNM.api("/auth/login", {
        method: "POST",
        body: { phone: phone, password: password }
      });
      SNM.setToken(data.access_token || data.token || "");
      SNM.setUser(data.user || data);
      SNM.onAuthed();
    } catch (err) {
      showErr("loginError", err.message || "Login failed");
    }
  });

  document.getElementById("btnLogoutProfile")?.addEventListener("click", SNM.logout);
  document.getElementById("btnCloseProfile")?.addEventListener("click", function () {
    document.getElementById("profileSheet")?.classList.remove("open");
  });

  document.getElementById("btnMenu")?.addEventListener("click", function () {
    document.getElementById("menuSheet")?.classList.toggle("hidden");
  });

  document.getElementById("menuSheet")?.addEventListener("click", function (e) {
    var btn = e.target.closest("[data-menu]");
    if (!btn) return;
    var act = btn.getAttribute("data-menu");
    document.getElementById("menuSheet")?.classList.add("hidden");
    if (act === "logout") return SNM.logout();
    if (document.getElementById(act)) SNM.showScreen(act);
  });

  var ver = document.getElementById("aboutVersion");
  if (ver) ver.textContent = SNM.APP_VERSION || "1.0.0.1p";
};
