window.SNM = window.SNM || {};

SNM.esc =
  SNM.esc ||
  SNM.escapeHtml ||
  function (s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  };

SNM.renderProfile = function () {
  var body = document.getElementById("profileBody");
  if (!body) return;
  var u = (typeof SNM.getUser === "function" && SNM.getUser()) || {};
  var esc = SNM.esc;
  var avatar = u.avatar_url || u.image_url || "";
  if (avatar && typeof SNM.mediaDisplayUrl === "function") {
    try {
      avatar = SNM.mediaDisplayUrl(avatar);
    } catch (e0) {}
  }
  var place = [u.primary_location, u.community, u.city, u.region, u.country]
    .filter(Boolean)
    .join(" · ");
  var bio = (u.bio || "").trim();
  var avHtml = avatar
    ? '<img class="profile-avatar-lg" src="' +
      esc(avatar) +
      '" alt="" />'
    : '<div class="profile-avatar-lg profile-avatar-placeholder"><i class="fa-solid fa-user"></i></div>';
  body.innerHTML =
    '<div class="profile-card-head">' +
    avHtml +
    "<div>" +
    "<p><strong>" +
    esc(u.name || "User") +
    "</strong></p>" +
    "<p class='muted'>" +
    esc(u.role || "") +
    "</p>" +
    "<p>" +
    esc(u.phone || "") +
    "</p>" +
    (place ? "<p class='muted small'>" + esc(place) + "</p>" : "") +
    "</div></div>" +
    (bio
      ? '<div class="profile-bio-block"><p class="muted small">Bio</p><p class="profile-bio-text">' +
        esc(bio) +
        "</p></div>"
      : '<p class="muted small">No bio yet — add one below.</p>');

  var ta = document.getElementById("profileBioInput");
  if (ta && document.activeElement !== ta) ta.value = bio;
  var prevEl = document.getElementById("profile-image-preview");
  if (prevEl && avatar) {
    prevEl.classList.remove("hidden");
    prevEl.innerHTML = '<img src="' + esc(avatar) + '" alt="" />';
  }
};

SNM.closeProfile = function () {
  var sheet = document.getElementById("profileSheet");
  if (!sheet) return;
  sheet.classList.remove("open");
  sheet.setAttribute("aria-hidden", "true");
};

SNM.openProfile = function () {
  SNM.renderProfile();
  var sheet = document.getElementById("profileSheet");
  if (sheet) {
    sheet.classList.add("open");
    sheet.setAttribute("aria-hidden", "false");
  }
};

SNM.bindProfile = function () {
  if (SNM._profileBound) return;
  SNM._profileBound = true;

  var btn = document.getElementById("btnProfile");
  if (btn) {
    btn.onclick = function (e) {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      SNM.openProfile();
    };
  }

  var closeBtn =
    document.getElementById("btnCloseProfile") ||
    document.querySelector("#profileSheet [data-close]");
  if (closeBtn) {
    closeBtn.onclick = function (e) {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      SNM.closeProfile();
    };
  }

  var logout = document.getElementById("btnLogoutProfile");
  if (logout) {
    logout.onclick = function (e) {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      if (typeof SNM.clearSession === "function") SNM.clearSession();
      SNM.closeProfile();
      if (typeof SNM.showScreen === "function") {
        SNM.showScreen("role-select");
      }
    };
  }

  /* tap backdrop / handle to close */
  var sheet = document.getElementById("profileSheet");
  if (sheet) {
    sheet.addEventListener("click", function (e) {
      if (e.target === sheet) SNM.closeProfile();
    });
  }
};

/* auto-bind when script loads (DOM may already be ready) */
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", function () {
    SNM.bindProfile();
    if (typeof SNM.bindUserProfile === "function") SNM.bindUserProfile();
  });
} else {
  SNM.bindProfile();
  if (typeof SNM.bindUserProfile === "function") SNM.bindUserProfile();
}

SNM._profileTargetPhone = null;

SNM.closeUserProfile = function () {
  var sheet = document.getElementById("userProfileSheet");
  if (!sheet) return;
  sheet.classList.remove("open");
  sheet.setAttribute("aria-hidden", "true");
  sheet.style.display = "none";
};

SNM.openUserProfile = async function (phone) {
  phone = String(phone || "").trim();
  if (!phone) {
    alert("No user phone");
    return;
  }
  SNM._profileTargetPhone = phone;
  var sheet = document.getElementById("userProfileSheet");
  var body = document.getElementById("userProfileBody");
  var list = document.getElementById("userProfileListings");
  if (sheet) {
    sheet.classList.add("open");
    sheet.setAttribute("aria-hidden", "false");
    sheet.style.display = "flex";
  }
  if (body) body.innerHTML = "<p class='muted'>Loading profile…</p>";
  if (list) list.innerHTML = "";

  var user = { phone: phone, name: "User" };
  try {
    var looked = await SNM.api(
      "/messages/lookup?phone=" + encodeURIComponent(phone)
    );
    if (looked) user = looked;
  } catch (e) {}

  if (body) {
    body.innerHTML =
      "<p><strong>" +
      SNM.esc(user.name || "User") +
      "</strong></p>" +
      "<p class='muted'>" +
      SNM.esc(user.role || "") +
      "</p>" +
      "<p>" +
      SNM.esc(user.phone || phone) +
      "</p>" +
      "<p class='muted small'>" +
      SNM.esc(
        [user.primary_location, user.community, user.city]
          .filter(Boolean)
          .join(" · ")
      ) +
      "</p>";
  }

  if (list) {
    list.innerHTML = "<p class='muted'>Loading listings…</p>";
    try {
      var u = (typeof SNM.getUser === "function" && SNM.getUser()) || {};
      var data = await SNM.api(
        "/search/products" +
          SNM.qs({
            q: "",
            max_km: 500,
            limit: 50,
            lat: u.lat,
            lng: u.lng,
            community: u.community || "",
            city: u.city || "",
            region: u.region || "",
            country: u.country || "Nigeria"
          })
      );
      var rows = data.results || data.items || [];
      rows = rows.filter(function (r) {
        var o = r.owner || r.seller || r.merchant || {};
        var ph = o.phone || r.phone || r.owner_phone || "";
        return String(ph) === String(phone) || String(ph) === String(user.phone || "");
      });
      if (!rows.length) {
        list.innerHTML = "<p class='muted'>No listings for this user in range.</p>";
      } else if (typeof SNM.cardHtml === "function") {
        list.innerHTML = rows
          .map(function (r) {
            return SNM.cardHtml(r);
          })
          .join("");
        if (typeof SNM.bindCardActions === "function") SNM.bindCardActions(list);
      } else {
        list.innerHTML = "<p class='muted'>" + rows.length + " listing(s)</p>";
      }
    } catch (e2) {
      list.innerHTML =
        "<p class='muted'>Listings unavailable.</p>";
    }
  }
};

SNM.reactToUser = function (kind) {
  var phone = SNM._profileTargetPhone;
  if (!phone) return;
  try {
    var key = "snm_react_" + phone;
    var o = JSON.parse(localStorage.getItem(key) || "{}");
    o[kind] = (o[kind] || 0) + 1;
    localStorage.setItem(key, JSON.stringify(o));
  } catch (e) {}
  // best-effort API
  if (typeof SNM.api === "function") {
    SNM.api("/ratings", {
      method: "POST",
      body: { target_phone: phone, kind: kind, value: 1 }
    }).catch(function () {});
  }
  alert("Recorded: " + kind);
};

SNM.bindUserProfile = function () {
  if (SNM._userProfileBound) return;
  SNM._userProfileBound = true;
  var close1 = document.getElementById("btnCloseUserProfile");
  var close2 = document.getElementById("btnCloseUserProfile2");
  function clo(e) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    SNM.closeUserProfile();
  }
  if (close1) close1.onclick = clo;
  if (close2) close2.onclick = clo;
  var row = document.getElementById("userProfileReact");
  if (row) {
    row.addEventListener("click", function (e) {
      var b = e.target.closest("[data-react]");
      if (!b) return;
      SNM.reactToUser(b.getAttribute("data-react"));
    });
  }
};

/* override profile upgrade */

SNM._profileTargetPhone = null;

SNM.closeUserProfile = function () {
  var sheet = document.getElementById("userProfileSheet");
  if (!sheet) return;
  sheet.classList.remove("open");
  sheet.setAttribute("aria-hidden", "true");
  sheet.style.display = "none";
};

SNM.openUserProfile = async function (phone) {
  phone = String(phone || "").trim();
  if (!phone) {
    alert("No seller phone on this listing");
    return;
  }
  SNM._profileTargetPhone = phone;
  var sheet = document.getElementById("userProfileSheet");
  var body = document.getElementById("userProfileBody");
  var bioEl = document.getElementById("userProfileBio");
  var list = document.getElementById("userProfileListings");
  var av = document.getElementById("userProfileAvatar");
  if (sheet) {
    sheet.classList.add("open");
    sheet.setAttribute("aria-hidden", "false");
    sheet.style.display = "flex";
  }
  if (body) body.innerHTML = "<p class='muted'>Loading…</p>";
  if (list) list.innerHTML = "";
  if (bioEl) bioEl.textContent = "";

  var user = { phone: phone, name: "User" };
  try {
    var looked = await SNM.api(
      "/messages/lookup?phone=" + encodeURIComponent(phone)
    );
    if (looked) user = Object.assign(user, looked);
  } catch (e) {}

  // local bio/photo cache by phone
  var local = {};
  try {
    local = JSON.parse(localStorage.getItem("snm_pub_profile_" + phone) || "{}");
  } catch (e2) {}

  if (av) {
    var src = local.avatar || user.avatar_url || user.image_url || "";
    av.style.display = src ? "inline-block" : "none";
    av.src = src || "";
  }
  if (body) {
    body.innerHTML =
      "<p><strong>" +
      SNM.esc(user.name || "User") +
      "</strong></p>" +
      "<p class='muted'>" +
      SNM.esc(user.role || "") +
      "</p>" +
      "<p>" +
      SNM.esc(user.phone || phone) +
      "</p>" +
      "<p class='muted small'>" +
      SNM.esc(
        [user.primary_location, user.community, user.city]
          .filter(Boolean)
          .join(" · ")
      ) +
      "</p>";
  }
  if (bioEl) {
    bioEl.textContent = local.bio || user.bio || "";
  }

  if (list) {
    list.innerHTML = "<p class='muted'>Loading listings…</p>";
    try {
      function digits(p) {
        return String(p || "").replace(/\D/g, "");
      }
      function phoneMatch(a, b) {
        var da = digits(a);
        var db = digits(b);
        if (!da || !db) return false;
        if (da === db) return true;
        /* last 10 digits (NG local) */
        if (da.length >= 10 && db.length >= 10) {
          return da.slice(-10) === db.slice(-10);
        }
        return da.indexOf(db) >= 0 || db.indexOf(da) >= 0;
      }
      function rowPhone(r) {
        r = r || {};
        var o = r.owner || r.seller || r.merchant || r.author || {};
        return (
          o.phone ||
          r.phone ||
          r.owner_phone ||
          r.seller_phone ||
          (r.raw && (r.raw.phone || (r.raw.owner && r.raw.owner.phone))) ||
          ""
        );
      }
      function isThisSeller(r) {
        var ph = rowPhone(r);
        return phoneMatch(ph, phone) || phoneMatch(ph, user.phone);
      }

      var me = (typeof SNM.getUser === "function" && SNM.getUser()) || {};
      var rows = [];
      var seen = {};

      function addRows(arr) {
        (arr || []).forEach(function (r) {
          if (!r || !isThisSeller(r)) return;
          var id = String(r.id || r.product_id || rowPhone(r) + (r.name || r.title || ""));
          if (seen[id]) return;
          seen[id] = 1;
          rows.push(r);
        });
      }

      /* 1) Already-loaded feed / search cards */
      if (SNM._listingsById) {
        Object.keys(SNM._listingsById).forEach(function (k) {
          addRows([SNM._listingsById[k]]);
        });
      }
      if (Array.isArray(SNM._lastFeedRows)) addRows(SNM._lastFeedRows);
      if (Array.isArray(SNM._lastSearchRows)) addRows(SNM._lastSearchRows);

      /* 2) Own profile → /products/me */
      var myDigits = digits(me.phone);
      if (myDigits && phoneMatch(me.phone, phone)) {
        try {
          var mine = await SNM.api("/products/me");
          addRows(mine.items || mine.products || mine.results || (Array.isArray(mine) ? mine : []));
        } catch (eMe) {}
      }

      /* 3) Search API — phone digits + empty q, wide radius */
      var geoLat = me.lat != null ? me.lat : SNM._lastLat;
      var geoLng = me.lng != null ? me.lng : SNM._lastLng;
      var qPhone = digits(user.phone || phone);
      var tries = [qPhone, (user.name || "").trim(), ""];
      for (var ti = 0; ti < tries.length; ti++) {
        try {
          var data = await SNM.api(
            "/search/products" +
              SNM.qs({
                q: tries[ti] || undefined,
                max_km: 2000,
                limit: 80,
                lat: geoLat,
                lng: geoLng,
                community: me.community || "",
                city: me.city || "",
                region: me.region || "",
                country: me.country || "Nigeria"
              })
          );
          addRows(data.results || data.items || []);
          if (rows.length) break;
        } catch (eSearch) {}
      }

      if (!rows.length) {
        list.innerHTML =
          "<p class='muted'>No listings found for this seller yet. If they just posted, open Home/Search once so listings cache, then reopen profile.</p>";
      } else if (typeof SNM.cardHtml === "function") {
        list.innerHTML = rows
          .map(function (r) {
            return SNM.cardHtml(r);
          })
          .join("");
        if (typeof SNM.bindCardActions === "function") SNM.bindCardActions(list);
      } else {
        list.innerHTML = "<p class='muted'>" + rows.length + " listing(s)</p>";
      }
    } catch (err) {
      list.innerHTML =
        "<p class='muted'>Listings unavailable. " +
        SNM.esc((err && err.message) || "") +
        "</p>";
    }
  }
};

SNM.saveMyProfile = async function () {
  var bio = ((document.getElementById("profileBioInput") || {}).value || "").trim();
  var msg = document.getElementById("profileSaveMsg");
  var imageUrl = null;
  try {
    if (typeof SNM.readCompressedItemImage === "function") {
      imageUrl = await SNM.readCompressedItemImage(
        "profile-image-cam",
        "profile-image-file"
      );
    }
  } catch (e) {
    alert("Photo: " + (e.message || "failed"));
    return;
  }
  var u = (typeof SNM.getUser === "function" && SNM.getUser()) || {};
  u.bio = bio;
  if (imageUrl) u.avatar_url = imageUrl;
  if (typeof SNM.setUser === "function") SNM.setUser(u);

  // public cache so others can see when lookup has no bio yet
  try {
    var key = "snm_pub_profile_" + (u.phone || "");
    localStorage.setItem(
      key,
      JSON.stringify({ bio: bio, avatar: imageUrl || u.avatar_url || "" })
    );
  } catch (e2) {}

  // best-effort API (ignore if route missing)
  try {
    await SNM.api("/auth/me", {
      method: "PATCH",
      body: { bio: bio, avatar_url: imageUrl || u.avatar_url || null }
    });
  } catch (e3) {
    try {
      await SNM.api("/users/me", {
        method: "PATCH",
        body: { bio: bio, avatar_url: imageUrl || null }
      });
    } catch (e4) {}
  }
  if (msg) msg.textContent = "Profile saved.";
  if (typeof SNM.renderProfile === "function") SNM.renderProfile();
};

SNM.bindUserProfile = function () {
  if (SNM._userProfileBound) return;
  SNM._userProfileBound = true;

  function clo(e) {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    SNM.closeUserProfile();
  }
  var c1 = document.getElementById("btnCloseUserProfile");
  var c2 = document.getElementById("btnCloseUserProfile2");
  if (c1) c1.onclick = clo;
  if (c2) c2.onclick = clo;

  var row = document.getElementById("userProfileReact");
  if (row && !row._snmWired) {
    row._snmWired = true;
    row.addEventListener("click", function (e) {
      var b = e.target.closest("[data-react]");
      if (!b) return;
      if (typeof SNM.reactToUser === "function") SNM.reactToUser(b.getAttribute("data-react"));
    });
  }

  if (typeof SNM.wirePhotoButtons === "function") {
    SNM.wirePhotoButtons(
      "btnProfileCam",
      "btnProfileGallery",
      "profile-image-cam",
      "profile-image-file",
      "profile-image-preview"
    );
  } else {
    var cam = document.getElementById("btnProfileCam");
    var gal = document.getElementById("btnProfileGallery");
    if (cam) cam.onclick = function () {
      var i = document.getElementById("profile-image-cam");
      if (i) i.click();
    };
    if (gal) gal.onclick = function () {
      var i = document.getElementById("profile-image-file");
      if (i) i.click();
    };
  }

  var save = document.getElementById("btnProfileSave");
  if (save && !save._snmWired) {
    save._snmWired = true;
    save.onclick = function () { SNM.saveMyProfile(); };
  }

  // when opening own profile sheet, fill bio
  var btn = document.getElementById("btnProfile");
  if (btn && !btn._snmBioFill) {
    btn._snmBioFill = true;
    var prev = btn.onclick;
    btn.onclick = function (e) {
      if (prev) prev.call(this, e);
      var u = (typeof SNM.getUser === "function" && SNM.getUser()) || {};
      var ta = document.getElementById("profileBioInput");
      if (ta) ta.value = u.bio || "";
      var prevEl = document.getElementById("profile-image-preview");
      if (prevEl && u.avatar_url) {
        prevEl.classList.remove("hidden");
        prevEl.innerHTML = "<img src=\"" + u.avatar_url + "\" alt=\"\" />";
      }
    };
  }
};

SNM.reactToUser = function (kind) {
  var phone = SNM._profileTargetPhone;
  if (!phone) return;
  try {
    var key = "snm_react_" + phone;
    var o = JSON.parse(localStorage.getItem(key) || "{}");
    o[kind] = (o[kind] || 0) + 1;
    localStorage.setItem(key, JSON.stringify(o));
  } catch (e) {}
  alert("Recorded: " + kind);
};
