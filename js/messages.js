window.SNM = window.SNM || {};

SNM._threadId = null;
SNM._threadPeer = null;

SNM._validThreadId = function (id) {
  if (id == null) return false;
  id = String(id).trim();
  if (!id || id === "undefined" || id === "null") return false;
  return true;
};

SNM.closeThread = function () {
  SNM._threadId = null;
  SNM._threadPeer = null;
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
  if (tt) tt.textContent = "Thread";
};

SNM.loadInbox = async function (opts) {
  opts = opts || {};
  var box =
    document.getElementById("inboxList") ||
    document.getElementById("threadList");
  if (!box) return;

  /* Only close open thread when entering screen, not on every refresh */
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

    /* drop broken / placeholder rows */
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
        var title =
          t.title ||
          t.peer_name ||
          t.name ||
          t.phone ||
          t.peer_phone ||
          "Thread";
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
        SNM.openThread(
          tid,
          (el.querySelector("strong") || {}).textContent || "Thread"
        );
      };
    });
  } catch (e) {
    box.innerHTML =
      "<p class='soft'>" +
      SNM.escapeHtml((e && e.message) || "Inbox error") +
      "</p>";
  }
};

SNM.loadMessages = SNM.loadInbox;

SNM.openThread = async function (id, title) {
  if (!SNM._validThreadId(id)) {
    console.warn("openThread: invalid id", id);
    return;
  }
  id = String(id).trim();
  SNM._threadId = id;

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
  if (tt) tt.textContent = title || "Thread";

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
              var mine =
                (m.sender_id &&
                  me.id &&
                  String(m.sender_id) === String(me.id)) ||
                (m.from_phone && me.phone && m.from_phone === me.phone) ||
                !!m.mine;
              return (
                '<div class="msg-bubble ' +
                (mine ? "me" : "them") +
                '">' +
                SNM.escapeHtml(m.body || m.text || "") +
                "</div>"
              );
            })
            .join("")
        : "<p class='soft'>No messages yet. Say hello.</p>";
      box.scrollTop = box.scrollHeight;
    }
  } catch (e) {
    if (box) {
      box.innerHTML =
        "<p class='soft'>" +
        SNM.escapeHtml((e && e.message) || "Thread error") +
        "</p>";
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

    if (SNM._validThreadId(tid)) {
      await SNM.openThread(String(tid), looked.name || phone);
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
        body: "Hi",
        context_type: "direct"
      }
    });

    tid =
      created.thread_id ||
      created.id ||
      (created.thread && created.thread.id);

    if (SNM._validThreadId(tid)) {
      await SNM.openThread(String(tid), looked.name || phone);
    } else if (typeof SNM.loadInbox === "function") {
      await SNM.loadInbox({ keepThread: true });
    }
  } catch (err) {
    var msg =
      (err && err.message) ||
      (err && err.data && (err.data.detail || err.data.message)) ||
      "DM failed";
    if (typeof msg !== "string") {
      try {
        msg = JSON.stringify(msg);
      } catch (e) {
        msg = "DM failed";
      }
    }
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
      if (!SNM._validThreadId(SNM._threadId) && !SNM._threadPeer) {
        if (typeof SNM.toast === "function") SNM.toast("Open a thread first");
        return;
      }
      try {
        if (SNM._validThreadId(SNM._threadId)) {
          await SNM.api(
            "/messages/threads/" +
              encodeURIComponent(String(SNM._threadId)),
            { method: "POST", body: { body: text, text: text } }
          );
        } else {
          await SNM.api("/messages/send", {
            method: "POST",
            body: {
              body: text,
              text: text,
              to_phone: SNM._threadPeer,
              phone: SNM._threadPeer
            }
          });
        }
        if (input) input.value = "";
        if (SNM._validThreadId(SNM._threadId)) {
          var titleEl = document.getElementById("threadTitle");
          await SNM.openThread(
            SNM._threadId,
            titleEl ? titleEl.textContent : "Thread"
          );
        }
      } catch (e) {
        if (typeof SNM.toast === "function")
          SNM.toast(e.message || "Send failed");
        else alert(e.message || "Send failed");
      }
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
