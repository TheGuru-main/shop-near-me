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

/** File selected for status (uploaded to B2 on post) */
SNM._statusFile = null;

/**
 * Production media: multipart to /media/upload → public HTTPS URL.
 * Never send data: URLs to /status.
 */
SNM.uploadStatusMedia = async function (file) {
  if (!file) return null;
  var base = SNM.API_BASE || "";
  var token = typeof SNM.getToken === "function" ? SNM.getToken() : "";
  var fd = new FormData();
  fd.append("file", file);

  var res = await fetch(base + "/media/upload?kind=status", {
    method: "POST",
    headers: token ? { Authorization: "Bearer " + token } : {},
    body: fd
  });

  var data = null;
  try {
    data = await res.json();
  } catch (e) {
    data = {};
  }
  if (!res.ok) {
    var detail = (data && (data.detail || data.message)) || res.statusText || "Upload failed";
    if (typeof detail === "object") {
      try {
        detail = JSON.stringify(detail);
      } catch (e2) {
        detail = "Upload failed";
      }
    }
    throw new Error(String(detail));
  }
  return data;
};

SNM.loadStatusFeed = async function () {
  var rail = document.getElementById("statusRail");
  if (!rail) return;
  rail.innerHTML = "<span class='muted small'>Loading status…</span>";

  try {
    var data = await SNM.api("/status/feed");
    var items = (data && (data.items || data.results)) || [];
    if (!items.length) {
      rail.innerHTML =
        "<span class='muted small'>No status in your network yet. Post one or follow sellers.</span>";
      return;
    }
    rail.innerHTML = items
      .map(function (s) {
        var name = s.name || s.author_name || s.phone || "User";
        var img = s.media_url || s.image_url || "";
        var phone = s.phone || s.author_phone || "";
        var body = s.body || "";
        return (
          '<button type="button" class="status-pill" data-status-phone="' +
          SNM.esc(phone) +
          '" data-status-body="' +
          SNM.esc(body) +
          '" data-status-media="' +
          SNM.esc(img) +
          '">' +
          (img
            ? '<img src="' + SNM.esc(img) + '" alt="" class="status-thumb" />'
            : '<span class="status-avatar">' +
              SNM.esc((name || "?").charAt(0).toUpperCase()) +
              "</span>") +
          '<span class="status-name">' +
          SNM.esc((name || "").split(" ")[0] || name) +
          "</span></button>"
        );
      })
      .join("");
  } catch (e) {
    rail.innerHTML =
      "<span class='muted small'>Status feed unavailable. " +
      SNM.esc((e && e.message) || "") +
      "</span>";
  }
};

SNM.postStatus = async function () {
  var bodyEl = document.getElementById("statusBody");
  var expEl = document.getElementById("statusExpiry");
  var msg = document.getElementById("statusMsg");
  var body = ((bodyEl && bodyEl.value) || "").trim();
  var exp = (expEl && expEl.value) || "24h";

  if (!body && !SNM._statusFile) {
    if (msg) msg.textContent = "Add text or a photo.";
    return;
  }
  if (msg) msg.textContent = "Posting…";

  try {
    var mediaUrl = null;
    var mediaType = null;
    if (SNM._statusFile) {
      if (msg) msg.textContent = "Uploading photo…";
      var up = await SNM.uploadStatusMedia(SNM._statusFile);
      mediaUrl = up.url || up.media_url || null;
      mediaType = up.media_type || "image";
      if (!mediaUrl) throw new Error("Upload returned no URL");
    }

    if (msg) msg.textContent = "Saving status…";
    await SNM.api("/status", {
      method: "POST",
      body: {
        body: body || "Status",
        expiry: exp,
        media_url: mediaUrl,
        media_type: mediaType
      }
    });

    if (bodyEl) bodyEl.value = "";
    SNM._statusFile = null;
    var cam = document.getElementById("status-image-cam");
    var gal = document.getElementById("status-image-file");
    if (cam) cam.value = "";
    if (gal) gal.value = "";
    var prev = document.getElementById("status-preview");
    if (prev) {
      prev.innerHTML = "";
      prev.classList.add("hidden");
    }
    var comp = document.getElementById("statusComposer");
    if (comp) comp.classList.add("hidden");
    if (msg) msg.textContent = "";
    await SNM.loadStatusFeed();
  } catch (e) {
    if (msg) msg.textContent = (e && e.message) || "Post failed";
  }
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

  function wirePick(btnId, inputId) {
    var b = document.getElementById(btnId);
    var inp = document.getElementById(inputId);
    if (!b || !inp) return;
    b.onclick = function () {
      inp.click();
    };
    inp.onchange = function () {
      var f = inp.files && inp.files[0];
      if (!f) return;
      SNM._statusFile = f;
      var prev = document.getElementById("status-preview");
      if (prev) {
        try {
          prev.innerHTML = '<img src="' + URL.createObjectURL(f) + '" alt="" />';
        } catch (e) {
          prev.innerHTML = "<span class='muted'>Photo selected</span>";
        }
        prev.classList.remove("hidden");
      }
    };
  }
  wirePick("btnStatusCam", "status-image-cam");
  wirePick("btnStatusGallery", "status-image-file");

  var rail = document.getElementById("statusRail");
  if (rail && !rail._snmStatusTap) {
    rail._snmStatusTap = true;
    rail.addEventListener("click", function (e) {
      var pill = e.target.closest("[data-status-phone]");
      if (!pill) return;
      var body = pill.getAttribute("data-status-body") || "";
      var media = pill.getAttribute("data-status-media") || "";
      alert((body || "Status") + (media ? "\n\n(photo attached)" : ""));
    });
  }
};

SNM.onStatusEnter = function () {
  SNM.bindStatus();
  SNM.loadStatusFeed();
};
