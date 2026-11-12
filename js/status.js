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

SNM._statusMedia = null;

SNM._statusExpiryMs = function (code) {
  var map = {
    "3h": 3 * 3600e3,
    "7h": 7 * 3600e3,
    "24h": 24 * 3600e3,
    "3d": 3 * 24 * 3600e3,
    "7d": 7 * 24 * 3600e3
  };
  return map[code] || map["24h"];
};

SNM._localStatuses = function () {
  try {
    return JSON.parse(localStorage.getItem("snm_statuses") || "[]");
  } catch (e) {
    return [];
  }
};

SNM._saveLocalStatuses = function (list) {
  try {
    localStorage.setItem("snm_statuses", JSON.stringify(list || []));
  } catch (e) {}
};

SNM._pruneStatuses = function (list) {
  var now = Date.now();
  return (list || []).filter(function (s) {
    return !s.expires_at || s.expires_at > now;
  });
};

SNM._myPhone = function () {
  var u = (typeof SNM.getUser === "function" && SNM.getUser()) || {};
  return (u.phone || "").toString();
};

SNM._myName = function () {
  var u = (typeof SNM.getUser === "function" && SNM.getUser()) || {};
  return (u.name || "You").toString();
};

/** Contacted phones from inbox cards / local hints */
SNM._contactedPhones = function () {
  var set = {};
  document.querySelectorAll("#inboxList [data-phone], #threadList [data-phone]").forEach(function (el) {
    var p = (el.getAttribute("data-phone") || "").trim();
    if (p) set[p] = 1;
  });
  try {
    var raw = localStorage.getItem("snm_contacted") || "[]";
    JSON.parse(raw).forEach(function (p) {
      if (p) set[String(p)] = 1;
    });
  } catch (e) {}
  return Object.keys(set);
};

SNM.rememberContacted = function (phone) {
  phone = String(phone || "").trim();
  if (!phone) return;
  try {
    var list = JSON.parse(localStorage.getItem("snm_contacted") || "[]");
    if (list.indexOf(phone) < 0) {
      list.unshift(phone);
      localStorage.setItem("snm_contacted", JSON.stringify(list.slice(0, 80)));
    }
  } catch (e) {}
};

SNM.loadStatusFeed = async function () {
  var rail = document.getElementById("statusRail");
  if (!rail) return;
  rail.innerHTML = "<span class='muted small'>Loading status…</span>";

  var items = [];
  try {
    if (typeof SNM.api === "function" && SNM.getToken && SNM.getToken()) {
      var data = await SNM.api("/status/feed");
      items = (data && (data.items || data.results)) || [];
    }
  } catch (e) {}

  if (!items.length) {
    var local = SNM._pruneStatuses(SNM._localStatuses());
    SNM._saveLocalStatuses(local);
    var contacted = SNM._contactedPhones();
    var me = SNM._myPhone();
    items = local.filter(function (s) {
      if (s.phone === me) return true;
      if (contacted.indexOf(s.phone) >= 0) return true;
      return true; /* local demo: show all non-expired on device */
    });
  }

  if (!items.length) {
    rail.innerHTML =
      "<span class='muted small'>No status yet. Post yours or open chats with sellers.</span>";
    return;
  }

  rail.innerHTML = items
    .map(function (s) {
      var name = s.name || s.author_name || s.phone || "User";
      var body = s.body || s.text || "";
      var img = s.media_url || s.image_url || "";
      var phone = s.phone || s.author_phone || "";
      return (
        '<button type="button" class="status-pill" data-status-phone="' +
        SNM.esc(phone) +
        '" title="' +
        SNM.esc(body) +
        '">' +
        (img
          ? '<img src="' + SNM.esc(img) + '" alt="" class="status-thumb" />'
          : '<span class="status-avatar">' +
            SNM.esc((name || "?").charAt(0).toUpperCase()) +
            "</span>") +
        '<span class="status-name">' +
        SNM.esc(name.split(" ")[0] || name) +
        "</span>" +
        "</button>"
      );
    })
    .join("");
};

SNM.openStatusViewer = function (phone) {
  var local = SNM._pruneStatuses(SNM._localStatuses());
  var mine = local.filter(function (s) {
    return !phone || s.phone === phone;
  });
  if (!mine.length) {
    alert("No active status for this contact.");
    return;
  }
  var s = mine[0];
  var lines = [s.name || s.phone, s.body || ""];
  if (s.expires_at) {
    lines.push("Until " + new Date(s.expires_at).toLocaleString());
  }
  alert(lines.filter(Boolean).join("\n\n"));
};

SNM._readStatusImage = async function () {
  var cam = document.getElementById("status-image-cam");
  var gal = document.getElementById("status-image-file");
  var file =
    (cam && cam.files && cam.files[0]) ||
    (gal && gal.files && gal.files[0]) ||
    null;
  if (!file) return null;
  if (typeof SNM.compressImageFile === "function") {
    var dataUrl = await SNM.compressImageFile(file, 480, 0.55);
    if (dataUrl.length > 120000) {
      dataUrl = await SNM.compressImageFile(file, 320, 0.45);
    }
    return dataUrl;
  }
  return await new Promise(function (resolve, reject) {
    var r = new FileReader();
    r.onload = function () {
      resolve(r.result);
    };
    r.onerror = reject;
    r.readAsDataURL(file);
  });
};

SNM.postStatus = async function () {
  var bodyEl = document.getElementById("statusBody");
  var expEl = document.getElementById("statusExpiry");
  var msg = document.getElementById("statusMsg");
  var body = ((bodyEl && bodyEl.value) || "").trim();
  var exp = (expEl && expEl.value) || "24h";
  if (!body && !SNM._statusMedia) {
    if (msg) msg.textContent = "Add text or a photo.";
    return;
  }
  if (msg) msg.textContent = "Posting…";

  var media = SNM._statusMedia;
  if (!media) {
    try {
      media = await SNM._readStatusImage();
    } catch (e) {
      media = null;
    }
  }

  var payload = {
    body: body || "Status",
    expiry: exp,
    media_url: media || null
  };

  try {
    if (typeof SNM.api === "function" && SNM.getToken && SNM.getToken()) {
      await SNM.api("/status", { method: "POST", body: payload });
    } else {
      throw new Error("no api");
    }
  } catch (e) {
    /* local fallback until /status API is live */
    var list = SNM._pruneStatuses(SNM._localStatuses());
    list.unshift({
      id: "local-" + Date.now(),
      phone: SNM._myPhone(),
      name: SNM._myName(),
      body: payload.body,
      media_url: payload.media_url,
      expires_at: Date.now() + SNM._statusExpiryMs(exp),
      created_at: Date.now()
    });
    SNM._saveLocalStatuses(list.slice(0, 40));
  }

  if (bodyEl) bodyEl.value = "";
  SNM._statusMedia = null;
  var prev = document.getElementById("status-preview");
  if (prev) {
    prev.innerHTML = "";
    prev.classList.add("hidden");
  }
  var cam = document.getElementById("status-image-cam");
  var gal = document.getElementById("status-image-file");
  if (cam) cam.value = "";
  if (gal) gal.value = "";
  var comp = document.getElementById("statusComposer");
  if (comp) comp.classList.add("hidden");
  if (msg) msg.textContent = "";
  await SNM.loadStatusFeed();
};

SNM.bindStatus = function () {
  if (SNM._statusBound) return;
  SNM._statusBound = true;

  var postBtn = document.getElementById("btnStatusPost");
  if (postBtn) {
    postBtn.onclick = function () {
      var c = document.getElementById("statusComposer");
      if (c) c.classList.toggle("hidden");
    };
  }
  var send = document.getElementById("btnStatusSend");
  if (send) {
    send.onclick = function () {
      SNM.postStatus();
    };
  }
  var cancel = document.getElementById("btnStatusCancel");
  if (cancel) {
    cancel.onclick = function () {
      var c = document.getElementById("statusComposer");
      if (c) c.classList.add("hidden");
    };
  }

  function wireFile(btnId, inputId) {
    var b = document.getElementById(btnId);
    var inp = document.getElementById(inputId);
    if (!b || !inp) return;
    b.onclick = function () {
      inp.click();
    };
    inp.onchange = async function () {
      try {
        var url = await SNM._readStatusImage();
        SNM._statusMedia = url;
        var prev = document.getElementById("status-preview");
        if (prev && url) {
          prev.innerHTML = '<img src="' + url + '" alt="" />';
          prev.classList.remove("hidden");
        }
      } catch (e) {
        alert("Could not load image");
      }
    };
  }
  wireFile("btnStatusCam", "status-image-cam");
  wireFile("btnStatusGallery", "status-image-file");

  var rail = document.getElementById("statusRail");
  if (rail) {
    rail.addEventListener("click", function (e) {
      var pill = e.target.closest("[data-status-phone]");
      if (!pill) return;
      SNM.openStatusViewer(pill.getAttribute("data-status-phone"));
    });
  }
};

SNM.onStatusEnter = function () {
  SNM.bindStatus();
  SNM.loadStatusFeed();
};
