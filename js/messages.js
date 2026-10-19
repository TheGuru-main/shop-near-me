window.SNM = window.SNM || {};

SNM._threadId = null;
SNM._threadPeer = null;
SNM._threadPeerId = null;
SNM._voiceRec = null;
SNM._voiceChunks = [];

SNM.escapeHtml =
  SNM.escapeHtml ||
  SNM.esc ||
  function (s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  };
SNM.esc = SNM.esc || SNM.escapeHtml;

SNM._msgErr = function (err) {
  if (!err) return "Request failed";
  if (typeof err === "string") return err;
  if (err.data) {
    var d = err.data.detail != null ? err.data.detail : err.data.message;
    if (d == null) d = err.data;
    if (typeof d === "string") return d;
    if (Array.isArray(d)) {
      return d
        .map(function (x) {
          return (x && (x.msg || x.message)) || JSON.stringify(x);
        })
        .join("; ");
    }
    if (typeof d === "object") {
      try {
        return JSON.stringify(d);
      } catch (e) {}
    }
  }
  if (typeof err.message === "string" && err.message !== "[object Object]") {
    return err.message;
  }
  try {
    return JSON.stringify(err);
  } catch (e2) {
    return "Request failed";
  }
};

SNM._normPhone = function (phone) {
  phone = String(phone || "").trim().replace(/\s/g, "");
  if (!phone) return "";
  if (phone.charAt(0) === "+") {
    return "+" + phone.slice(1).replace(/\D/g, "");
  }
  var digits = phone.replace(/\D/g, "");
  if (digits.indexOf("234") === 0) return "+" + digits;
  return digits ? "+" + digits : "";
};

SNM._validThreadId = function (id) {
  if (id == null) return false;
  id = String(id).trim();
  if (!id || id === "undefined" || id === "null") return false;
  if (/^thread$/i.test(id)) return false;
  return true;
};

SNM._cleanTitle = function (title, fallback) {
  var t = (title && String(title).trim()) || "";
  if (!t || /^thread$/i.test(t)) return fallback || "Chat";
  return t;
};

SNM._rowThreadId = function (t) {
  if (!t) return null;
  if (t.thread && t.thread.id != null) return t.thread.id;
  if (t.id != null) return t.id;
  if (t.thread_id != null) return t.thread_id;
  return null;
};

SNM._rowPeerPhone = function (t) {
  if (!t) return "";
  return (
    t.peer_phone ||
    t.phone ||
    (t.thread &&
      (t.thread.participant_b_phone || t.thread.participant_a_phone)) ||
    ""
  );
};

SNM._showThreadUi = function (title) {
  if (typeof SNM.showScreen === "function") SNM.showScreen("messages");

  var tv = document.getElementById("threadView");
  var inbox = document.getElementById("inboxList");
  var list = document.getElementById("threadList");
  if (tv) {
    tv.classList.remove("hidden");
    tv.style.display = "";
  }
  if (inbox) {
    inbox.classList.add("hidden");
    inbox.style.display = "none";
  }
  if (list) {
    list.classList.add("hidden");
    list.style.display = "none";
  }
  var tt = document.getElementById("threadTitle");
  if (tt) tt.textContent = SNM._cleanTitle(title, "Chat");

  var box =
    document.getElementById("msgList") ||
    document.getElementById("threadMessages");
  if (box && !box.innerHTML) {
    box.innerHTML = "<p class='soft'>Loading chat…</p>";
  }

  var input =
    document.getElementById("msgInput") ||
    document.getElementById("threadInput");
  if (input) {
    try {
      input.focus();
    } catch (e) {}
  }
};

SNM.closeThread = function () {
  var listPhase = document.getElementById("msgListPhase");
  if (listPhase) listPhase.style.display = "";
  var msgScreen = document.getElementById("messages");
  if (msgScreen) msgScreen.classList.remove("thread-open");

  SNM._threadId = null;
  SNM._threadPeer = null;
  SNM._threadPeerId = null;
  var tv = document.getElementById("threadView");
  var inbox = document.getElementById("inboxList");
  var list = document.getElementById("threadList");
  if (tv) {
    tv.classList.add("hidden");
    tv.style.display = "none";
  }
  if (inbox) {
    inbox.classList.remove("hidden");
    inbox.style.display = "";
  }
  if (list) {
    list.classList.remove("hidden");
    list.style.display = "";
  }
  var box =
    document.getElementById("threadMessages") ||
    document.getElementById("msgList");
  if (box) box.innerHTML = "";
  var input =
    document.getElementById("threadInput") ||
    document.getElementById("msgInput");
  if (input) input.value = "";
  var tt = document.getElementById("threadTitle");
  if (tt) tt.textContent = "Chat";
};

SNM.renderMessageBubble = function (m, me) {
  me = me || {};
  var mine =
    (m.sender_id && me.id && String(m.sender_id) === String(me.id)) ||
    (m.from_phone && me.phone && m.from_phone === me.phone) ||
    !!m.mine;
  var type = (m.msg_type || m.type || "text").toLowerCase();
  var media = m.media_url || m.image_url || m.audio_url || m.video_url || "";
  var body = m.body || m.text || "";
  var who = mine ? "" : m.from_name || m.sender_name || "";
  var inner = "";
  if (type === "image" && media) {
    inner =
      '<img class="msg-media" src="' +
      SNM.escapeHtml(media) +
      '" alt="Photo" loading="lazy" />' +
      (body && body !== "📷 Photo"
        ? '<div class="msg-caption">' + SNM.escapeHtml(body) + "</div>"
        : "");
  } else if ((type === "voice" || type === "audio") && media) {
    inner =
      '<div class="msg-caption">🎤 Voice note</div>' +
      '<audio class="msg-audio" controls preload="metadata" src="' +
      SNM.escapeHtml(media) +
      '"></audio>' +
      (body && body !== "🎤 Voice note"
        ? '<div class="msg-caption">' + SNM.escapeHtml(body) + "</div>"
        : "");
  } else if (type === "video" && media) {
    inner =
      '<video class="msg-video" controls playsinline preload="metadata" src="' +
      SNM.escapeHtml(media) +
      '"></video>' +
      (body && body !== "🎬 Video"
        ? '<div class="msg-caption">' + SNM.escapeHtml(body) + "</div>"
        : "");
  } else {
    inner = SNM.escapeHtml(body || "");
  }
  return (
    '<div class="msg-bubble ' +
    (mine ? "me" : "them") +
    '">' +
    (who ? '<div class="msg-who">' + SNM.escapeHtml(String(who)) + "</div>" : "") +
    '<div class="msg-payload">' +
    inner +
    "</div></div>"
  );
};


SNM.dropMessagePayload = async function (payload) {
  payload = payload || {};
  var text = "";
  if (payload.body != null) text = String(payload.body).trim();
  if (!text && payload.text != null) text = String(payload.text).trim();
  var msgType = (payload.msg_type || payload.type || "text").toLowerCase();
  var media = payload.media_url || payload.image_url || payload.audio_url || null;
  if (media) media = String(media).trim() || null;

  if (!text && media) {
    if (msgType === "image") text = "📷 Photo";
    else if (msgType === "voice" || msgType === "audio") text = "🎤 Voice note";
    else if (msgType === "video") text = "🎬 Video";
    else text = "Attachment";
  }
  if (!text) throw new Error("Type a message first");

  if (!SNM._validThreadId(SNM._threadId) && SNM._threadPeer) {
    var title =
      ((document.getElementById("threadTitle") || {}).textContent || "").trim() ||
      SNM._threadPeer;
    await SNM._ensureThreadWithPhone(SNM._threadPeer, title);
  }
  if (!SNM._validThreadId(SNM._threadId)) {
    throw new Error("Open a chat first");
  }

  return SNM.api(
    "/messages/threads/" + encodeURIComponent(String(SNM._threadId)),
    {
      method: "POST",
      body: {
        body: text,
        msg_type: msgType,
        media_url: media
      }
    }
  );
};

SNM.reloadOpenThread = async function () {
  if (!SNM._validThreadId(SNM._threadId)) return;
  var titleEl = document.getElementById("threadTitle");
  await SNM.openThread(
    SNM._threadId,
    titleEl ? titleEl.textContent : "Chat",
    { phone: SNM._threadPeer }
  );
};

/* call UI lives in calls.js — UID→UID startCall */

SNM.loadInbox = async function (opts) {
  opts = opts || {};
  var box =
    document.getElementById("inboxList") ||
    document.getElementById("threadList");
  if (!box) return;

  if (opts.closeThread !== false && !opts.keepThread) {
    SNM.closeThread();
  }

  box.innerHTML = "<p class='soft'>Loading inbox…</p>";
  try {
    var data = await SNM.api("/messages/inbox");
    var rows =
      data.threads ||
      data.items ||
      data.results ||
      (Array.isArray(data) ? data : []);
    if (!Array.isArray(rows)) rows = [];

    rows = rows.filter(function (t) {
      return SNM._validThreadId(SNM._rowThreadId(t));
    });

    if (!rows.length) {
      box.innerHTML =
        "<p class='soft'>No conversations yet. Message a seller from a listing or open chat with +phone.</p>";
      return;
    }

    box.innerHTML = rows
      .map(function (t) {
        var id = SNM._rowThreadId(t);
        var phone = SNM._rowPeerPhone(t);
        var title = SNM._cleanTitle(
          t.title ||
            t.peer_name ||
            t.name ||
            phone ||
            (t.thread && t.thread.context_type),
          "Chat"
        );
        var preview = "";
        if (t.last_message) {
          preview =
            typeof t.last_message === "string"
              ? t.last_message
              : t.last_message.body || t.last_message.text || "";
        } else {
          preview = t.preview || t.last_body || "";
        }
        return (
          '<div class="card" data-thread="' +
          SNM.escapeHtml(String(id)) +
          '" data-phone="' +
          SNM.escapeHtml(String(phone)) +
          '" style="cursor:pointer">' +
          "<strong>" +
          SNM.escapeHtml(String(title)) +
          "</strong>" +
          (preview
            ? "<p class='soft'>" +
              SNM.escapeHtml(String(preview).slice(0, 120)) +
              "</p>"
            : "") +
          "</div>"
        );
      })
      .join("");

    box.querySelectorAll("[data-thread]").forEach(function (el) {
      el.onclick = function () {
        var tid = el.getAttribute("data-thread");
        if (!SNM._validThreadId(tid)) return;
        var label = SNM._cleanTitle(
          (el.querySelector("strong") || {}).textContent,
          "Chat"
        );
        var phone = el.getAttribute("data-phone") || "";
        document.querySelectorAll("#inboxList .card, #threadList .card").forEach(function (c) {
          c.classList.remove("active");
        });
        el.classList.add("active");
        SNM._threadPeer = phone || SNM._threadPeer;
        if (typeof SNM._showThreadPhase === "function") SNM._showThreadPhase();
        if (typeof SNM._showThreadUi === "function") SNM._showThreadUi(label);
        SNM.openThread(tid, label, { phone: phone });
      };
    });
  } catch (e) {
    box.innerHTML =
      "<p class='soft'>" + SNM.escapeHtml(SNM._msgErr(e)) + "</p>";
  }
};

SNM.loadMessages = SNM.loadInbox;

SNM.openThread = async function (id, title, peerMeta) {
  if (!SNM._validThreadId(id)) {
    console.warn("openThread: invalid id", id);
    return;
  }
  id = String(id).trim();
  SNM._threadId = id;
  peerMeta = peerMeta || {};
  if (peerMeta.phone) SNM._threadPeer = peerMeta.phone;

  if (typeof SNM._showThreadUi === "function") SNM._showThreadUi(title);
  else if (typeof SNM._showThreadPhase === "function") SNM._showThreadPhase();

  var tv = document.getElementById("threadView");
  if (tv && SNM._threadPeer) tv.dataset.peerPhone = SNM._threadPeer;

  var box =
    document.getElementById("msgList") ||
    document.getElementById("threadMessages");
  if (box) box.innerHTML = "<p class='soft'>Loading…</p>";

  try {
    var data = await SNM.api(
      "/messages/threads/" + encodeURIComponent(id)
    );
    var msgs = data.messages || data.items || [];
    if (!Array.isArray(msgs)) msgs = [];
    var me = (typeof SNM.getUser === "function" && SNM.getUser()) || {};
    var myPhone = (me.phone || "").toString();
    var myDigits = myPhone.replace(/\D/g, "");

    /* recover peer UID from thread/messages if missing */
    if (!SNM._threadPeer) {
      var thr = data.thread || data;
      var candidates = [
        thr.participant_a_phone,
        thr.participant_b_phone,
        thr.peer_phone,
        thr.other_phone,
        data.peer_phone
      ];
      msgs.forEach(function (m) {
        candidates.push(m.from_phone, m.to_phone);
      });
      for (var i = 0; i < candidates.length; i++) {
        var ph = String(candidates[i] || "").trim();
        if (!ph) continue;
        var dig = ph.replace(/\D/g, "");
        if (myDigits && dig.slice(-10) === myDigits.slice(-10)) continue;
        SNM._threadPeer = typeof SNM._normPhone === "function" ? SNM._normPhone(ph) : ph;
        break;
      }
    }
    if (tv && SNM._threadPeer) tv.dataset.peerPhone = SNM._threadPeer;

    if (box) {
      box.innerHTML = msgs.length
        ? msgs
            .map(function (m) {
              return SNM.renderMessageBubble(m, me);
            })
            .join("")
        : "<p class='soft'>No messages yet. Type below to start.</p>";
      box.scrollTop = box.scrollHeight;
    }
  } catch (e) {
    if (box) {
      box.innerHTML =
        "<p class='soft'>" + SNM.escapeHtml(SNM._msgErr(e)) + "</p>";
    }
  }
};

SNM._ensureThreadWithPhone = async function (phone, title) {
  phone = SNM._normPhone(phone);
  if (!phone) throw new Error("Phone required");

  SNM._threadPeer = phone;
  SNM._showThreadUi(title || phone);

  var created = await SNM.api("/messages/threads", {
    method: "POST",
    body: {
      to_phone: phone,
      context_type: "direct"
    }
  });

  var tid =
    (created.thread && created.thread.id) ||
    created.thread_id ||
    created.id ||
    null;
  tid = tid != null ? String(tid).trim() : "";

  if (!SNM._validThreadId(tid)) {
    throw new Error("Could not open thread");
  }

  SNM._threadId = tid;
  await SNM.openThread(tid, title || phone, { phone: phone });
  return tid;
};

SNM.openChatWithSeller = async function (meta) {
  meta = meta || {};
  var phone = (
    meta.phone ||
    meta.owner_phone ||
    meta.seller_phone ||
    meta.author_phone ||
    ""
  )
    .toString()
    .trim();
  var name =
    meta.name ||
    meta.seller_name ||
    meta.owner_name ||
    meta.author_name ||
    phone ||
    "Seller";

  if (typeof SNM.showScreen === "function") SNM.showScreen("messages");

  try {
    if (!phone) {
      alert("No seller phone on this listing.");
      return;
    }
    await SNM.startDmByPhone(phone, name);
  } catch (err) {
    var msg = SNM._msgErr(err);
    if (typeof SNM.toast === "function") SNM.toast(msg);
    else alert(msg);
  }
};

SNM.startDmFromInput = async function (raw) {
  raw = (raw || "").trim();
  if (!raw) {
    alert("Enter phone (+234…)");
    return;
  }
  await SNM.startDmByPhone(raw);
};

SNM.startDmByPhone = async function (phone, titleHint) {
  phone = SNM._normPhone(phone);
  if (!phone) {
    alert("Phone required");
    return;
  }
  SNM._threadPeer = phone;

  var dmInput = document.getElementById("dm-phone");
  if (dmInput) dmInput.value = phone;

  if (typeof SNM.showScreen === "function") SNM.showScreen("messages");
  SNM._showThreadUi(titleHint || phone);

  try {
    var title = titleHint || phone;
    try {
      var looked = await SNM.api(
        "/messages/lookup" + SNM.qs({ phone: phone })
      );
      if (looked && looked.registered === false) {
        alert("Number not registered on Shop Near Me");
        return;
      }
      if (looked && looked.name) title = looked.name;
      if (looked && looked.phone) phone = SNM._normPhone(looked.phone);
    } catch (lookupErr) {}

    await SNM._ensureThreadWithPhone(phone, title);
  } catch (err) {
    var msg = SNM._msgErr(err);
    if (typeof SNM.toast === "function") SNM.toast(msg);
    else alert(msg);
  }
};

SNM.bindMessages = function () {
  if (SNM._messagesBound) return;
  SNM._messagesBound = true;

  function wireClose(btn) {
    if (!btn || btn._snmCloseWired) return;
    btn._snmCloseWired = true;
    btn.onclick = function (e) {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      SNM.closeThread();
    };
  }

  wireClose(document.getElementById("btnCloseThread"));
  wireClose(document.getElementById("btnThreadBack"));
  document
    .querySelectorAll(
      "#threadView .back-link, #threadView [data-act='close-thread']"
    )
    .forEach(wireClose);

  var send =
    document.getElementById("btnSendThread") ||
    document.getElementById("btnMsgSend");
  if (send && !send._snmSendWired) {
    send._snmSendWired = true;
    send.onclick = async function () {
      var input =
        document.getElementById("threadInput") ||
        document.getElementById("msgInput");
      var text = input ? (input.value || "").trim() : "";
      if (!text) return;
      try {
        await SNM.dropMessagePayload({ body: text });
        if (input) input.value = "";
        await SNM.reloadOpenThread();
      } catch (e) {
        alert(SNM._msgErr(e));
      }
    };
  }

  var imgBtn = document.getElementById("btnMsgImage");
  if (imgBtn && !imgBtn._snmWired) {
    imgBtn._snmWired = true;
    imgBtn.onclick = function () {
      var inp = document.getElementById("msg-image");
      if (!inp) {
        inp = document.createElement("input");
        inp.type = "file";
        inp.accept = "image/*";
        inp.id = "msg-image";
        inp.className = "hidden";
        document.body.appendChild(inp);
        inp.onchange = async function () {
          var file = inp.files && inp.files[0];
          if (!file) return;
          try {
            var dataUrl =
              typeof SNM.compressImageFile === "function"
                ? await SNM.compressImageFile(file, 480, 0.55)
                : await new Promise(function (res, rej) {
                    var r = new FileReader();
                    r.onload = function () { res(r.result); };
                    r.onerror = rej;
                    r.readAsDataURL(file);
                  });
            if (dataUrl.length > 120000) {
              alert("Image too large. Try a smaller photo.");
              return;
            }
            await SNM.dropMessagePayload({
              body: "📷 Photo",
              msg_type: "image",
              media_url: dataUrl
            });
            await SNM.reloadOpenThread();
          } catch (e) {
            alert(SNM._msgErr(e) || "Image send failed");
          }
          inp.value = "";
        };
      }
      inp.click();
    };
  }

  var voiceBtn = document.getElementById("btnMsgVoice");
  if (voiceBtn && !voiceBtn._snmWired) {
    voiceBtn._snmWired = true;
    voiceBtn.onclick = async function () {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert("Voice not supported on this device");
        return;
      }
      if (SNM._voiceRec && SNM._voiceRec.state === "recording") {
        SNM._voiceRec.stop();
        voiceBtn.classList.remove("recording");
        return;
      }
      try {
        var stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        SNM._voiceChunks = [];
        var rec = new MediaRecorder(stream);
        SNM._voiceRec = rec;
        rec.ondataavailable = function (ev) {
          if (ev.data && ev.data.size) SNM._voiceChunks.push(ev.data);
        };
        rec.onstop = async function () {
          stream.getTracks().forEach(function (tr) { tr.stop(); });
          try {
            var blob = new Blob(SNM._voiceChunks, { type: "audio/webm" });
            var dataUrl = await new Promise(function (resolve, reject) {
              var fr = new FileReader();
              fr.onload = function () { resolve(fr.result); };
              fr.onerror = reject;
              fr.readAsDataURL(blob);
            });
            if (dataUrl.length > 200000) {
              alert("Voice note too long. Keep under \~15s.");
              return;
            }
            await SNM.dropMessagePayload({
              body: "🎤 Voice note",
              msg_type: "voice",
              media_url: dataUrl
            });
            await SNM.reloadOpenThread();
          } catch (e) {
            alert(SNM._msgErr(e) || "Voice send failed");
          }
        };
        rec.start();
        voiceBtn.classList.add("recording");
        if (typeof SNM.toast === "function") SNM.toast("Recording… tap again to send");
        setTimeout(function () {
          if (SNM._voiceRec && SNM._voiceRec.state === "recording") {
            SNM._voiceRec.stop();
            voiceBtn.classList.remove("recording");
          }
        }, 15000);
      } catch (e) {
        alert("Mic permission needed for voice notes");
      }
    };
  }

  /* Call buttons: handled by calls.js document capture delegate */
  var callV = document.getElementById("btnCallVoice");
  var callVid = document.getElementById("btnCallVideo");
  var callEnd = document.getElementById("btnCallEnd");
  if (callV) callV._snmWired = false; /* allow delegate */
  if (callVid) callVid._snmWired = false;
  if (callEnd) callEnd._snmWired = false;

  var dmBtn = document.getElementById("btnDmStart");
  if (dmBtn && !dmBtn._snmDmWired) {
    dmBtn._snmDmWired = true;
    dmBtn.onclick = function () {
      var raw = (
        (document.getElementById("dm-phone") || {}).value || ""
      ).trim();
      SNM.startDmFromInput(raw);
    };
  }
};

SNM.onMessagesEnter = function () {
  /* Keep open chat; only load inbox when not in a thread */
  if (SNM._validThreadId(SNM._threadId)) return;
  SNM.loadInbox({ closeThread: true });
};
/* INBOX_401_V1 */
(function () {
  var _load = SNM.loadInbox;
  if (typeof _load !== "function" || SNM._inbox401Wrap) return;
  SNM._inbox401Wrap = true;
  SNM.loadInbox = async function (opts) {
    try {
      return await _load.call(SNM, opts);
    } catch (e) {
      var box =
        document.getElementById("inboxList") ||
        document.getElementById("threadList");
      var msg = (e && e.message) || "Inbox failed";
      if (
        (e && e.status === 401) ||
        /invalid token|credentials|unauthorized/i.test(msg)
      ) {
        if (box)
          box.innerHTML =
            "<p class='muted'>Session expired. Please log in again.</p>";
        if (typeof SNM.clearSession === "function") SNM.clearSession();
        if (typeof SNM.showScreen === "function") SNM.showScreen("login");
        return;
      }
      if (box)
        box.innerHTML =
          "<p class='muted'>" +
          (typeof SNM.esc === "function" ? SNM.esc(msg) : msg) +
          "</p>";
    }
  };
})();

/* MSG_MEDIA_HANDLERS_EOF — run after bindMessages */


/* MSG_UX_COMPOSER_EOF */
SNM._showMsgListPhase = function () {
  document.body.classList.remove("thread-open");
  var msg = document.getElementById("messages");
  if (msg) msg.classList.remove("thread-open");
  var list = document.getElementById("msgListPhase");
  var tv = document.getElementById("threadView");
  if (list) list.style.display = "";
  if (tv) {
    tv.classList.add("hidden");
    tv.style.display = "none";
  }
};

SNM._showThreadPhase = function () {
  var msg = document.getElementById("messages");
  if (msg) msg.classList.add("thread-open");
  document.body.classList.add("thread-open");
  var list = document.getElementById("msgListPhase");
  var tv = document.getElementById("threadView");
  if (list) list.style.display = "none";
  if (tv) {
    tv.classList.remove("hidden");
    tv.style.display = "flex";
  }
};

/* patch closeThread */
(function () {
  var prev = SNM.closeThread;
  SNM.closeThread = function () {
    if (typeof prev === "function") prev.apply(this, arguments);
    SNM._showMsgListPhase();
    SNM._resetVoiceUi();
    SNM._resetImageUi();
  };
})();

SNM._resetImageUi = function () {
  var box = document.getElementById("msgImageComposer");
  var img = document.getElementById("msgImagePreview");
  var cap = document.getElementById("msgImageCaption");
  var inp = document.getElementById("msg-image");
  if (box) box.classList.add("hidden");
  if (img) img.removeAttribute("src");
  if (cap) cap.value = "";
  if (inp) inp.value = "";
  SNM._pendingImageDataUrl = null;
};

SNM._resetVoiceUi = function () {
  var box = document.getElementById("msgVoiceComposer");
  if (box) box.classList.add("hidden");
  var send = document.getElementById("btnMsgVoiceSend");
  if (send) send.disabled = true;
  var st = document.getElementById("msgVoiceStatus");
  if (st) st.textContent = "Recording…";
  var meter = document.querySelector("#msgVoiceMeter span");
  if (meter) meter.style.width = "10%";
  var tim = document.getElementById("msgVoiceTimer");
  if (tim) tim.textContent = "0:00";
  if (SNM._voiceTimer) {
    clearInterval(SNM._voiceTimer);
    SNM._voiceTimer = null;
  }
  SNM._voicePaused = false;
  SNM._voiceSeconds = 0;
  SNM._pendingVoiceDataUrl = null;
};

SNM._formatVoiceTime = function (s) {
  s = Math.max(0, s | 0);
  var m = Math.floor(s / 60);
  var r = s % 60;
  return m + ":" + (r < 10 ? "0" : "") + r;
};

SNM._wireMsgMediaComposers = function () {
  if (SNM._msgMediaWired) return;
  SNM._msgMediaWired = true;

  var imgBtn = document.getElementById("btnMsgImage");
  var fileInp = document.getElementById("msg-image");
  if (imgBtn && fileInp) {
    imgBtn.onclick = function () {
      SNM._resetVoiceUi();
      fileInp.click();
    };
    fileInp.onchange = async function () {
      var file = fileInp.files && fileInp.files[0];
      if (!file) return;
      try {
        var dataUrl =
          typeof SNM.compressImageFile === "function"
            ? await SNM.compressImageFile(file, 640, 0.6)
            : await new Promise(function (res, rej) {
                var r = new FileReader();
                r.onload = function () {
                  res(r.result);
                };
                r.onerror = rej;
                r.readAsDataURL(file);
              });
        if (dataUrl.length > 180000) {
          dataUrl =
            typeof SNM.compressImageFile === "function"
              ? await SNM.compressImageFile(file, 400, 0.45)
              : dataUrl;
        }
        if (dataUrl.length > 180000) {
          alert("Photo still too large. Pick a smaller image.");
          return;
        }
        SNM._pendingImageDataUrl = dataUrl;
        var prev = document.getElementById("msgImagePreview");
        var box = document.getElementById("msgImageComposer");
        if (prev) prev.src = dataUrl;
        if (box) box.classList.remove("hidden");
      } catch (e) {
        alert("Could not load image");
      }
      fileInp.value = "";
    };
  }

  var imgSend = document.getElementById("btnMsgImageSend");
  if (imgSend) {
    imgSend.onclick = async function () {
      if (!SNM._pendingImageDataUrl) return;
      var cap = ((document.getElementById("msgImageCaption") || {}).value || "").trim();
      try {
        await SNM.dropMessagePayload({
          body: cap || "📷 Photo",
          msg_type: "image",
          media_url: SNM._pendingImageDataUrl
        });
        SNM._resetImageUi();
        await SNM.reloadOpenThread();
      } catch (e) {
        alert((typeof SNM._msgErr === "function" && SNM._msgErr(e)) || e.message || "Send failed");
      }
    };
  }
  var imgCancel = document.getElementById("btnMsgImageCancel");
  if (imgCancel) {
    imgCancel.onclick = function () {
      SNM._resetImageUi();
    };
  }

  var voiceBtn = document.getElementById("btnMsgVoice");
  if (voiceBtn) {
    voiceBtn.onclick = async function () {
      SNM._resetImageUi();
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert("Voice not supported on this device");
        return;
      }
      if (SNM._voiceRec && SNM._voiceRec.state === "recording") {
        return; /* use pause/send */
      }
      try {
        var stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        SNM._voiceChunks = [];
        SNM._voiceSeconds = 0;
        SNM._voicePaused = false;
        var rec = new MediaRecorder(stream);
        SNM._voiceRec = rec;
        SNM._voiceStream = stream;
        rec.ondataavailable = function (ev) {
          if (ev.data && ev.data.size) SNM._voiceChunks.push(ev.data);
        };
        rec.onstop = async function () {
          try {
            stream.getTracks().forEach(function (tr) {
              tr.stop();
            });
          } catch (e0) {}
          if (SNM._voiceTimer) {
            clearInterval(SNM._voiceTimer);
            SNM._voiceTimer = null;
          }
          var blob = new Blob(SNM._voiceChunks, { type: "audio/webm" });
          var dataUrl = await new Promise(function (resolve, reject) {
            var fr = new FileReader();
            fr.onload = function () {
              resolve(fr.result);
            };
            fr.onerror = reject;
            fr.readAsDataURL(blob);
          });
          SNM._pendingVoiceDataUrl = dataUrl;
          var st = document.getElementById("msgVoiceStatus");
          if (st) st.textContent = "Ready to send";
          var send = document.getElementById("btnMsgVoiceSend");
          if (send) send.disabled = false;
        };
        rec.start(200);
        var box = document.getElementById("msgVoiceComposer");
        if (box) box.classList.remove("hidden");
        var st = document.getElementById("msgVoiceStatus");
        if (st) st.textContent = "Recording…";
        var send = document.getElementById("btnMsgVoiceSend");
        if (send) send.disabled = true;
        SNM._voiceTimer = setInterval(function () {
          if (SNM._voicePaused) return;
          SNM._voiceSeconds = (SNM._voiceSeconds || 0) + 1;
          var tim = document.getElementById("msgVoiceTimer");
          if (tim) tim.textContent = SNM._formatVoiceTime(SNM._voiceSeconds);
          var meter = document.querySelector("#msgVoiceMeter span");
          if (meter) {
            var w = 15 + (SNM._voiceSeconds % 10) * 8 + Math.random() * 20;
            meter.style.width = Math.min(95, w) + "%";
          }
          if (SNM._voiceSeconds >= 15 && SNM._voiceRec && SNM._voiceRec.state === "recording") {
            try {
              SNM._voiceRec.stop();
            } catch (e1) {}
          }
        }, 1000);
      } catch (e) {
        alert("Mic permission needed");
      }
    };
  }

  var pauseBtn = document.getElementById("btnMsgVoicePause");
  if (pauseBtn) {
    pauseBtn.onclick = function () {
      if (!SNM._voiceRec) return;
      try {
        if (SNM._voiceRec.state === "recording") {
          SNM._voiceRec.pause();
          SNM._voicePaused = true;
          pauseBtn.textContent = "Resume";
          var st = document.getElementById("msgVoiceStatus");
          if (st) st.textContent = "Paused";
        } else if (SNM._voiceRec.state === "paused") {
          SNM._voiceRec.resume();
          SNM._voicePaused = false;
          pauseBtn.textContent = "Pause";
          var st2 = document.getElementById("msgVoiceStatus");
          if (st2) st2.textContent = "Recording…";
        }
      } catch (e) {
        /* some browsers lack pause — stop instead */
        try {
          SNM._voiceRec.stop();
        } catch (e2) {}
      }
    };
  }

  var delBtn = document.getElementById("btnMsgVoiceDelete");
  if (delBtn) {
    delBtn.onclick = function () {
      try {
        if (SNM._voiceRec && SNM._voiceRec.state !== "inactive") SNM._voiceRec.stop();
      } catch (e) {}
      if (SNM._voiceStream) {
        try {
          SNM._voiceStream.getTracks().forEach(function (tr) {
            tr.stop();
          });
        } catch (e2) {}
      }
      SNM._voiceChunks = [];
      SNM._pendingVoiceDataUrl = null;
      SNM._resetVoiceUi();
    };
  }

  var vSend = document.getElementById("btnMsgVoiceSend");
  if (vSend) {
    vSend.onclick = async function () {
      try {
        if (SNM._voiceRec && SNM._voiceRec.state === "recording") {
          await new Promise(function (resolve) {
            SNM._voiceRec.onstop = async function () {
              /* onstop already builds dataUrl in handler — wait tick */
              setTimeout(resolve, 50);
            };
            SNM._voiceRec.stop();
          });
        }
        /* ensure blob ready */
        if (!SNM._pendingVoiceDataUrl && SNM._voiceChunks && SNM._voiceChunks.length) {
          var blob = new Blob(SNM._voiceChunks, { type: "audio/webm" });
          SNM._pendingVoiceDataUrl = await new Promise(function (resolve, reject) {
            var fr = new FileReader();
            fr.onload = function () {
              resolve(fr.result);
            };
            fr.onerror = reject;
            fr.readAsDataURL(blob);
          });
        }
        if (!SNM._pendingVoiceDataUrl) {
          alert("Record a voice note first");
          return;
        }
        if (SNM._pendingVoiceDataUrl.length > 220000) {
          alert("Voice note too long");
          return;
        }
        await SNM.dropMessagePayload({
          body: "🎤 Voice note",
          msg_type: "voice",
          media_url: SNM._pendingVoiceDataUrl
        });
        SNM._resetVoiceUi();
        await SNM.reloadOpenThread();
      } catch (e) {
        alert((typeof SNM._msgErr === "function" && SNM._msgErr(e)) || e.message || "Send failed");
      }
    };
  }

  var back = document.getElementById("btnThreadBack");
  if (back && !back._snmPhase) {
    back._snmPhase = true;
    back.onclick = function () {
      SNM.closeThread();
      if (typeof SNM.loadInbox === "function") SNM.loadInbox({ closeThread: true });
    };
  }
};

/* ensure show thread phase when opening */
(function () {
  var prevOpen = SNM.openThread;
  if (typeof prevOpen === "function") {
    SNM.openThread = async function () {
      SNM._showThreadPhase();
      return prevOpen.apply(this, arguments);
    };
  }
  var prevBind = SNM.bindMessages;
  SNM.bindMessages = function () {
    if (typeof prevBind === "function") prevBind.apply(this, arguments);
    SNM._wireMsgMediaComposers();
  };
})();


/* MSG_MEDIA_CROP_VIDEO_EOF */
SNM.MSG_MAX_BYTES = 5 * 1024 * 1024; /* 5MB */

SNM._fileToDataUrl = function (file) {
  return new Promise(function (resolve, reject) {
    var r = new FileReader();
    r.onload = function () {
      resolve(r.result);
    };
    r.onerror = reject;
    r.readAsDataURL(file);
  });
};

SNM._dataUrlBytes = function (dataUrl) {
  var i = String(dataUrl || "").indexOf(",");
  var b64 = i >= 0 ? dataUrl.slice(i + 1) : dataUrl;
  return Math.floor((b64.length * 3) / 4);
};

SNM._cropState = { img: null, zoom: 1 };

SNM._drawCrop = function () {
  var canvas = document.getElementById("msgCropCanvas");
  var img = SNM._cropState.img;
  if (!canvas || !img) return;
  var ctx = canvas.getContext("2d");
  var size = 320;
  canvas.width = size;
  canvas.height = size;
  var zoom = SNM._cropState.zoom || 1;
  var scale = Math.max(size / img.width, size / img.height) * zoom;
  var w = img.width * scale;
  var h = img.height * scale;
  var x = (size - w) / 2;
  var y = (size - h) / 2;
  ctx.fillStyle = "#0f172a";
  ctx.fillRect(0, 0, size, size);
  ctx.drawImage(img, x, y, w, h);
};

SNM._getCroppedDataUrl = function () {
  var canvas = document.getElementById("msgCropCanvas");
  if (!canvas) return SNM._pendingImageDataUrl;
  var out = canvas.toDataURL("image/jpeg", 0.72);
  var n = 0;
  while (SNM._dataUrlBytes(out) > SNM.MSG_MAX_BYTES && n < 4) {
    out = canvas.toDataURL("image/jpeg", 0.55 - n * 0.1);
    n++;
  }
  return out;
};

SNM._loadImageForCrop = function (dataUrl) {
  return new Promise(function (resolve, reject) {
    var img = new Image();
    img.onload = function () {
      SNM._cropState.img = img;
      SNM._cropState.zoom = 1;
      var z = document.getElementById("msgCropZoom");
      if (z) z.value = "100";
      SNM._drawCrop();
      resolve();
    };
    img.onerror = reject;
    img.src = dataUrl;
  });
};

SNM._wireCropZoom = function () {
  var z = document.getElementById("msgCropZoom");
  if (z && !z._snmCrop) {
    z._snmCrop = true;
    z.oninput = function () {
      SNM._cropState.zoom = (parseInt(z.value, 10) || 100) / 100;
      SNM._drawCrop();
    };
  }
};

SNM._wireVideoAndCropSend = function () {
  SNM._wireCropZoom();

  var imgSend = document.getElementById("btnMsgImageSend");
  if (imgSend && !imgSend._snmCropSend) {
    imgSend._snmCropSend = true;
    imgSend.onclick = async function () {
      try {
        var dataUrl = SNM._getCroppedDataUrl();
        if (!dataUrl) {
          alert("Pick a photo first");
          return;
        }
        if (SNM._dataUrlBytes(dataUrl) > SNM.MSG_MAX_BYTES) {
          alert("Image exceeds 5MB after crop. Zoom out or pick a smaller photo.");
          return;
        }
        var cap = ((document.getElementById("msgImageCaption") || {}).value || "").trim();
        await SNM.dropMessagePayload({
          body: cap || "📷 Photo",
          msg_type: "image",
          media_url: dataUrl
        });
        if (typeof SNM._resetImageUi === "function") SNM._resetImageUi();
        var box = document.getElementById("msgImageComposer");
        if (box) box.classList.add("hidden");
        await SNM.reloadOpenThread();
      } catch (e) {
        alert((typeof SNM._msgErr === "function" && SNM._msgErr(e)) || e.message || "Send failed");
      }
    };
  }

  /* Hook file pick → crop stage */
  var fileInp = document.getElementById("msg-image");
  if (fileInp && !fileInp._snmCropPick) {
    fileInp._snmCropPick = true;
    fileInp.addEventListener("change", async function () {
      var file = fileInp.files && fileInp.files[0];
      if (!file) return;
      if (file.size > SNM.MSG_MAX_BYTES) {
        alert("Image must be under 5MB");
        fileInp.value = "";
        return;
      }
      try {
        var dataUrl =
          typeof SNM.compressImageFile === "function"
            ? await SNM.compressImageFile(file, 1280, 0.85)
            : await SNM._fileToDataUrl(file);
        SNM._pendingImageDataUrl = dataUrl;
        await SNM._loadImageForCrop(dataUrl);
        var box = document.getElementById("msgImageComposer");
        if (box) box.classList.remove("hidden");
        var vbox = document.getElementById("msgVideoComposer");
        if (vbox) vbox.classList.add("hidden");
      } catch (e) {
        alert("Could not open image");
      }
      fileInp.value = "";
    });
  }

  var vBtn = document.getElementById("btnMsgVideo");
  var vInp = document.getElementById("msg-video");
  if (vBtn && vInp && !vBtn._snmVid) {
    vBtn._snmVid = true;
    vBtn.onclick = function () {
      if (typeof SNM._resetImageUi === "function") SNM._resetImageUi();
      var ibox = document.getElementById("msgImageComposer");
      if (ibox) ibox.classList.add("hidden");
      vInp.click();
    };
    vInp.onchange = async function () {
      var file = vInp.files && vInp.files[0];
      if (!file) return;
      if (file.size > SNM.MSG_MAX_BYTES) {
        alert("Video must be under 5MB");
        vInp.value = "";
        return;
      }
      try {
        var dataUrl = await SNM._fileToDataUrl(file);
        if (SNM._dataUrlBytes(dataUrl) > SNM.MSG_MAX_BYTES) {
          alert("Video exceeds 5MB");
          return;
        }
        SNM._pendingVideoDataUrl = dataUrl;
        var prev = document.getElementById("msgVideoPreview");
        if (prev) {
          prev.src = dataUrl;
        }
        var box = document.getElementById("msgVideoComposer");
        if (box) box.classList.remove("hidden");
      } catch (e) {
        alert("Could not open video");
      }
      vInp.value = "";
    };
  }

  var vSend = document.getElementById("btnMsgVideoSend");
  if (vSend && !vSend._snmVidSend) {
    vSend._snmVidSend = true;
    vSend.onclick = async function () {
      if (!SNM._pendingVideoDataUrl) {
        alert("Pick a video first");
        return;
      }
      var cap = ((document.getElementById("msgVideoCaption") || {}).value || "").trim();
      try {
        await SNM.dropMessagePayload({
          body: cap || "🎬 Video",
          msg_type: "video",
          media_url: SNM._pendingVideoDataUrl
        });
        SNM._pendingVideoDataUrl = null;
        var box = document.getElementById("msgVideoComposer");
        if (box) box.classList.add("hidden");
        var prev = document.getElementById("msgVideoPreview");
        if (prev) prev.removeAttribute("src");
        await SNM.reloadOpenThread();
      } catch (e) {
        alert((typeof SNM._msgErr === "function" && SNM._msgErr(e)) || e.message || "Send failed");
      }
    };
  }
  var vCancel = document.getElementById("btnMsgVideoCancel");
  if (vCancel && !vCancel._snm) {
    vCancel._snm = true;
    vCancel.onclick = function () {
      SNM._pendingVideoDataUrl = null;
      var box = document.getElementById("msgVideoComposer");
      if (box) box.classList.add("hidden");
      var prev = document.getElementById("msgVideoPreview");
      if (prev) prev.removeAttribute("src");
    };
  }
};

(function () {
  var prev = SNM.bindMessages;
  SNM.bindMessages = function () {
    if (typeof prev === "function") prev.apply(this, arguments);
    SNM._wireVideoAndCropSend();
  };
  if (document.readyState !== "loading") {
    try {
      SNM._wireVideoAndCropSend();
    } catch (e) {}
  } else {
    document.addEventListener("DOMContentLoaded", function () {
      try {
        SNM._wireVideoAndCropSend();
      } catch (e2) {}
    });
  }
})();


/* CALL_PEER_RESOLVE_EOF */
SNM.resolveCallPeerPhone = function () {
  var candidates = [
    SNM._threadPeer,
    SNM._threadPeerId,
    (document.getElementById("threadView") || {}).dataset &&
      document.getElementById("threadView").dataset.peerPhone,
    (document.getElementById("dm-phone") || {}).value
  ];
  /* inbox card selected */
  var active = document.querySelector(
    "#inboxList .card.active[data-phone], #threadList .card.active[data-phone]"
  );
  if (active) candidates.push(active.getAttribute("data-phone"));

  /* open thread title sometimes holds phone */
  var title = (document.getElementById("threadTitle") || {}).textContent || "";
  var m = title.match(/(\+?\d{10,15})/);
  if (m) candidates.push(m[1]);

  var phone = "";
  for (var i = 0; i < candidates.length; i++) {
    var c = String(candidates[i] || "").trim();
    if (!c || c === "undefined" || c === "null") continue;
    phone = c;
    break;
  }
  if (typeof SNM._normPhone === "function") phone = SNM._normPhone(phone);
  else if (typeof SNM._callPeerPhone === "function") phone = SNM._callPeerPhone(phone);
  if (phone) SNM._threadPeer = phone;
  return phone || "";
};

