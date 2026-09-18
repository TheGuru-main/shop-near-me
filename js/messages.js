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

/** Normalize to E.164-ish +digits for API to_phone */
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
    (m.from_phone && me.phone && String(m.from_phone) === String(me.phone)) ||
    (m.from_user_id && me.id && String(m.from_user_id) === String(me.id)) ||
    !!m.mine;

  var type = (m.msg_type || m.type || "text").toLowerCase();
  var body = m.body || m.text || "";
  var media = m.media_url || m.image_url || m.audio_url || "";
  var who = mine ? me.name || "You" : "";

  var inner = "";
  if (type === "image" && media) {
    inner =
      '<img class="msg-media" src="' +
      SNM.escapeHtml(media) +
      '" alt="image" />' +
      (body && body !== "[image]"
        ? '<div class="msg-caption">' + SNM.escapeHtml(body) + "</div>"
        : "");
  } else if ((type === "voice" || type === "audio") && media) {
    inner =
      '<audio class="msg-audio" controls src="' +
      SNM.escapeHtml(media) +
      '"></audio>';
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
  if (!SNM._validThreadId(SNM._threadId)) {
    throw new Error("Open a chat first");
  }
  var text = "";
  if (payload.body != null) text = String(payload.body).trim();
  if (!text && payload.text != null) text = String(payload.text).trim();
  if (!text) throw new Error("Type a message first");

  return SNM.api(
    "/messages/threads/" + encodeURIComponent(String(SNM._threadId)),
    { method: "POST", body: { body: text } }
  );
};

SNM.reloadOpenThread = async function () {
  if (!SNM._validThreadId(SNM._threadId)) return;
  var titleEl = document.getElementById("threadTitle");
  await SNM.openThread(
    SNM._threadId,
    titleEl ? titleEl.textContent : "Chat"
  );
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

  SNM._showThreadUi(title);

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

/** Open/create thread by peer phone UID — matches ThreadCreate.to_phone */
SNM._ensureThreadWithPhone = async function (phone, title) {
  phone = SNM._normPhone(phone);
  if (!phone) throw new Error("Phone required");

  SNM._threadPeer = phone;
  SNM._showThreadUi(title || phone);

  var created = await SNM.api("/messages/threads", {
    method: "POST",
    body: {
      to_phone: phone,
      body: "…",
      context_type: "direct"
    }
  });

  var tid =
    (created.thread && created.thread.id) ||
    created.thread_id ||
    created.id;

  if (!SNM._validThreadId(tid)) {
    throw new Error("Could not open thread");
  }

  await SNM.openThread(String(tid), title || phone, { phone: phone });
  return tid;
};

/**
 * From listing / fairly-used card.
 * SNM.openChatWithSeller({ phone, name })  — phone is the UID
 */
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
    } catch (lookupErr) {
      // still try create — API will 404 if unknown
    }

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
      if (!SNM._validThreadId(SNM._threadId)) {
        alert("Open a chat first");
        return;
      }
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
      alert("Send text for now. Image attach next.");
    };
  }

  var voiceBtn = document.getElementById("btnMsgVoice");
  if (voiceBtn && !voiceBtn._snmWired) {
    voiceBtn._snmWired = true;
    voiceBtn.onclick = function () {
      alert("Send text for now.");
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
      var raw = (
        (document.getElementById("dm-phone") || {}).value || ""
      ).trim();
      SNM.startDmFromInput(raw);
    };
  }
};

SNM.onMessagesEnter = function () {
  SNM.loadInbox({ closeThread: true });
};