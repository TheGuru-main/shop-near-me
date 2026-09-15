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

SNM.closeThread = function () {
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

  var type = (m.type || m.msg_type || "text").toLowerCase();
  var body = m.body || m.text || "";
  var media = m.media_url || m.image_url || m.audio_url || "";
  var who =
    m.sender_name ||
    m.from_name ||
    (mine ? me.name || "You" : m.peer_name || "");

  var inner = "";
  if (type === "image" && media) {
    inner =
      '<img class="msg-media" src="' +
      SNM.escapeHtml(media) +
      '" alt="image" />' +
      (body
        ? '<div class="msg-caption">' + SNM.escapeHtml(body) + "</div>"
        : "");
  } else if ((type === "voice" || type === "audio") && media) {
    inner =
      '<audio class="msg-audio" controls src="' +
      SNM.escapeHtml(media) +
      '"></audio>' +
      (body
        ? '<div class="msg-caption">' + SNM.escapeHtml(body) + "</div>"
        : "");
  } else {
    inner = SNM.escapeHtml(body || "");
  }

  return (
    '<div class="msg-bubble ' +
    (mine ? "me" : "them") +
    '" data-msg-id="' +
    SNM.escapeHtml(String(m.id || "")) +
    '">' +
    (who
      ? '<div class="msg-who">' + SNM.escapeHtml(String(who)) + "</div>"
      : "") +
    '<div class="msg-payload">' +
    inner +
    "</div></div>"
  );
};

SNM.dropMessagePayload = async function (payload) {
  payload = payload || {};
  if (!SNM._validThreadId(SNM._threadId) && !SNM._threadPeer) {
    throw new Error("Open a thread first");
  }
  var body = {
    type: payload.type || "text",
    body: payload.body != null ? payload.body : payload.text || "",
    text: payload.body != null ? payload.body : payload.text || ""
  };
  if (payload.media_url) body.media_url = payload.media_url;
  if (SNM._threadPeerId) body.to_user_id = SNM._threadPeerId;

  if (SNM._validThreadId(SNM._threadId)) {
    return SNM.api(
      "/messages/threads/" + encodeURIComponent(String(SNM._threadId)),
      { method: "POST", body: body }
    );
  }
  body.to_phone = SNM._threadPeer;
  body.phone = SNM._threadPeer;
  return SNM.api("/messages/send", { method: "POST", body: body });
};

SNM.reloadOpenThread = async function () {
  if (!SNM._validThreadId(SNM._threadId)) return;
  var titleEl = document.getElementById("threadTitle");
  await SNM.openThread(
    SNM._threadId,
    titleEl ? titleEl.textContent : "Chat"
  );
};

SNM.toggleVoiceNote = async function () {
  var btn = document.getElementById("btnMsgVoice");
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    alert("Voice notes need mic permission on this device.");
    return;
  }
  if (SNM._voiceRec && SNM._voiceRec.state === "recording") {
    SNM._voiceRec.stop();
    if (btn) btn.classList.remove("recording");
    return;
  }
  try {
    var stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    SNM._voiceChunks = [];
    var mime = MediaRecorder.isTypeSupported("audio/webm")
      ? "audio/webm"
      : "audio/mp4";
    SNM._voiceRec = new MediaRecorder(stream, { mimeType: mime });
    SNM._voiceRec.ondataavailable = function (e) {
      if (e.data && e.data.size) SNM._voiceChunks.push(e.data);
    };
    SNM._voiceRec.onstop = async function () {
      stream.getTracks().forEach(function (t) {
        t.stop();
      });
      var blob = new Blob(SNM._voiceChunks, { type: mime });
      SNM._voiceChunks = [];
      if (blob.size < 500) return;
      if (blob.size > 900000) {
        alert("Voice note too long/large.");
        return;
      }
      try {
        var dataUrl = await new Promise(function (resolve, reject) {
          var r = new FileReader();
          r.onload = function () {
            resolve(r.result);
          };
          r.onerror = reject;
          r.readAsDataURL(blob);
        });
        await SNM.dropMessagePayload({
          type: "voice",
          body: "",
          media_url: dataUrl
        });
        await SNM.reloadOpenThread();
      } catch (err) {
        alert(SNM._msgErr(err));
      }
    };
    SNM._voiceRec.start();
    if (btn) btn.classList.add("recording");
  } catch (e) {
    alert("Mic blocked or unavailable.");
  }
};

SNM.openCallSheet = function (mode, peerLabel) {
  var sheet = document.getElementById("call-sheet");
  var peer = document.getElementById("callPeer");
  var status = document.getElementById("callStatus");
  if (peer) peer.textContent = peerLabel || SNM._threadPeer || "Peer";
  if (status) {
    status.textContent =
      (mode === "video" ? "Video" : "Voice") +
      " — signaling not fully live yet";
  }
  if (sheet) {
    sheet.classList.add("open");
    sheet.setAttribute("aria-hidden", "false");
    sheet.style.display = "block";
  }
};

SNM.closeCallSheet = function () {
  var sheet = document.getElementById("call-sheet");
  if (sheet) {
    sheet.classList.remove("open");
    sheet.setAttribute("aria-hidden", "true");
    sheet.style.display = "none";
  }
};

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
      data.items ||
      data.threads ||
      data.results ||
      (Array.isArray(data) ? data : []);
    if (!Array.isArray(rows)) rows = [];

    rows = rows.filter(function (t) {
      var id = t && (t.id != null ? t.id : t.thread_id);
      return SNM._validThreadId(id);
    });

    if (!rows.length) {
      box.innerHTML =
        "<p class='soft'>No conversations yet. Message a seller from a listing or DM with +phone.</p>";
      return;
    }

    box.innerHTML = rows
      .map(function (t) {
        var id = t.id != null ? t.id : t.thread_id;
        var title = SNM._cleanTitle(
          t.title || t.peer_name || t.name || t.phone || t.peer_phone,
          "Chat"
        );
        var phone = t.phone || t.peer_phone || "";
        var preview = t.last_message || t.preview || t.last_body || "";
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
        SNM.openThread(tid, label);
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
  if (peerMeta.user_id) SNM._threadPeerId = peerMeta.user_id;

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
    document.getElementById("threadMessages") ||
    document.getElementById("msgList");
  if (box) box.innerHTML = "<p class='soft'>Loading…</p>";

  try {
    var data = await SNM.api(
      "/messages/threads/" + encodeURIComponent(id)
    );
    var msgs = data.messages || data.items || [];
    if (!Array.isArray(msgs)) msgs = [];
    var me = (typeof SNM.getUser === "function" && SNM.getUser()) || {};
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

SNM.startDmByPhone = async function (phone) {
  phone = (phone || "").trim();
  if (!phone) {
    if (typeof SNM.toast === "function") SNM.toast("Phone required (+…)");
    else alert("Phone required");
    return;
  }
  if (phone.charAt(0) !== "+") phone = "+" + phone.replace(/\D/g, "");
  SNM._threadPeer = phone;

  var dmInput = document.getElementById("dm-phone");
  if (dmInput) dmInput.value = phone;
  if (typeof SNM.showScreen === "function") SNM.showScreen("messages");

  try {
    var looked = await SNM.api(
      "/messages/lookup" + SNM.qs({ phone: phone })
    );
    if (looked && looked.registered === false) {
      if (typeof SNM.toast === "function")
        SNM.toast("Number not registered on Shop Near Me");
      else alert("Number not registered");
      return;
    }

    var userId =
      looked.user_id ||
      looked.id ||
      (looked.user && looked.user.id) ||
      looked.to_user_id ||
      null;

    var tid =
      looked.thread_id ||
      (looked.thread && looked.thread.id) ||
      null;

    SNM._threadPeerId = userId || null;

    if (SNM._validThreadId(tid)) {
      await SNM.openThread(String(tid), looked.name || phone, {
        phone: phone,
        user_id: userId
      });
      return;
    }

    if (!userId) {
      if (typeof SNM.toast === "function")
        SNM.toast("Could not resolve user for " + phone);
      else alert("Could not resolve user for " + phone);
      return;
    }

    var created = await SNM.api("/messages/threads", {
      method: "POST",
      body: {
        to_user_id: userId,
        context_type: "direct"
      }
    });

    tid =
      created.thread_id ||
      created.id ||
      (created.thread && created.thread.id);

    if (SNM._validThreadId(tid)) {
      await SNM.openThread(String(tid), looked.name || phone, {
        phone: phone,
        user_id: userId
      });
    } else if (typeof SNM.loadInbox === "function") {
      await SNM.loadInbox({ keepThread: true });
    }
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
        await SNM.dropMessagePayload({ type: "text", body: text });
        if (input) input.value = "";
        await SNM.reloadOpenThread();
      } catch (e) {
        var msg = SNM._msgErr(e);
        if (typeof SNM.toast === "function") SNM.toast(msg);
        else alert(msg);
      }
    };
  }

  var imgBtn = document.getElementById("btnMsgImage");
  var imgInput = document.getElementById("msg-image");
  if (imgBtn && imgInput && !imgBtn._snmWired) {
    imgBtn._snmWired = true;
    imgBtn.onclick = function () {
      imgInput.click();
    };
    imgInput.onchange = async function () {
      var f = imgInput.files && imgInput.files[0];
      if (!f) return;
      if (f.size > 900000) {
        alert("Image too large (keep under \~900KB).");
        imgInput.value = "";
        return;
      }
      try {
        var dataUrl = await new Promise(function (resolve, reject) {
          var r = new FileReader();
          r.onload = function () {
            resolve(r.result);
          };
          r.onerror = reject;
          r.readAsDataURL(f);
        });
        await SNM.dropMessagePayload({
          type: "image",
          body: "",
          media_url: dataUrl
        });
        imgInput.value = "";
        await SNM.reloadOpenThread();
      } catch (e) {
        alert(SNM._msgErr(e));
      }
    };
  }

  var voiceBtn = document.getElementById("btnMsgVoice");
  if (voiceBtn && !voiceBtn._snmWired) {
    voiceBtn._snmWired = true;
    voiceBtn.onclick = function () {
      SNM.toggleVoiceNote();
    };
  }

  var callV = document.getElementById("btnCallVoice");
  if (callV && !callV._snmWired) {
    callV._snmWired = true;
    callV.onclick = function () {
      if (!SNM._validThreadId(SNM._threadId)) {
        alert("Open a chat first");
        return;
      }
      SNM.openCallSheet("voice");
    };
  }
  var callVid = document.getElementById("btnCallVideo");
  if (callVid && !callVid._snmWired) {
    callVid._snmWired = true;
    callVid.onclick = function () {
      if (!SNM._validThreadId(SNM._threadId)) {
        alert("Open a chat first");
        return;
      }
      SNM.openCallSheet("video");
    };
  }
  var callEnd = document.getElementById("btnCallEnd");
  if (callEnd && !callEnd._snmWired) {
    callEnd._snmWired = true;
    callEnd.onclick = function () {
      SNM.closeCallSheet();
    };
  }

  var dmBtn = document.getElementById("btnDmStart");
  if (dmBtn && !dmBtn._snmDmWired) {
    dmBtn._snmDmWired = true;
    dmBtn.onclick = function () {
      var phone = (
        (document.getElementById("dm-phone") || {}).value || ""
      ).trim();
      SNM.startDmByPhone(phone);
    };
  }
};

SNM.onMessagesEnter = function () {
  SNM.loadInbox({ closeThread: true });
};