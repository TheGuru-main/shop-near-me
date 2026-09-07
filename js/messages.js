window.SNM = window.SNM || {};

SNM._threadId = null;
SNM._threadPeer = null;

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

SNM.loadInbox = async function () {
  var box =
    document.getElementById("inboxList") ||
    document.getElementById("threadList");
  if (!box) return;
  SNM.closeThread();
  box.innerHTML = "<p class='soft'>Loading inbox…</p>";
  try {
    var data = await SNM.api("/messages/inbox");
    var rows =
    data.items ||
    data.threads ||
    data.results ||
    (Array.isArray(data) ? data : []);
    if (!Array.isArray(rows)) rows = [];
    if (!rows.length) {
      box.innerHTML =
        "<p class='soft'>No conversations yet. Message a seller from a listing or DM with +phone.</p>";
      return;
    }
    box.innerHTML = rows
      .map(function (t) {
        var id = t.id || t.thread_id;
        var title = t.title || t.peer_name || t.name || t.phone || "Thread";
        var phone = t.phone || t.peer_phone || "";
        var preview = t.last_message || t.preview || "";
        return (
          '<div class="card" data-thread="' +
          SNM.escapeHtml(String(id)) +
          '" data-phone="' +
          SNM.escapeHtml(phone) +
          '" style="cursor:pointer">' +
          '<div class="title">' +
          SNM.escapeHtml(title) +
          "</div>" +
          (preview
            ? '<div class="meta">' + SNM.escapeHtml(preview) + "</div>"
            : "") +
          "</div>"
        );
      })
      .join("");
    box.querySelectorAll("[data-thread]").forEach(function (el) {
      el.onclick = function () {
        var t =
          (el.querySelector(".title") && el.querySelector(".title").textContent) ||
          "Thread";
        SNM.openThread(el.getAttribute("data-thread"), t);
      };
    });
  } catch (e) {
    box.innerHTML =
      "<p class='soft'>" + SNM.escapeHtml(e.message || "Inbox error") + "</p>";
  }
};

SNM.loadMessages = SNM.loadInbox;

SNM.openThread = async function (id, title) {
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
        "<p class='soft'>" + SNM.escapeHtml(e.message) + "</p>";
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
  SNM.showScreen("messages");

  try {
    /* 1) Resolve phone → user id */
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

    /* 2) Existing thread? */
    if (tid) {
      await SNM.openThread(String(tid), looked.name || phone);
      return;
    }

    if (!userId) {
      if (typeof SNM.toast === "function")
        SNM.toast("Could not resolve user for " + phone);
      else alert("Could not resolve user for " + phone);
      return;
    }

    /* 3) Start thread (API requires to_user_id + body) */
    var created = await SNM.api("/messages/threads", {
      method: "POST",
      body: {
        to_user_id: userId,
        body: "Hello",
        context_type: "direct"
      }
    });

    tid =
      created.thread_id ||
      created.id ||
      (created.thread && created.thread.id);

    if (tid) {
      await SNM.openThread(String(tid), looked.name || phone);
    } else {
      if (typeof SNM.toast === "function") SNM.toast("Thread created — open inbox");
      if (typeof SNM.loadInbox === "function") SNM.loadInbox();
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
  function wireClose(el) {
    if (!el || el._snmCloseWired) return;
    el._snmCloseWired = true;
    el.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      SNM.closeThread();
    });
  }

  wireClose(document.getElementById("btnCloseThread"));
  wireClose(document.getElementById("btnThreadBack"));

  document
    .querySelectorAll("#threadView .back-link, #threadView [data-act='close-thread']")
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
      if (!SNM._threadId && !SNM._threadPeer) {
        if (typeof SNM.toast === "function") SNM.toast("Open a thread first");
        return;
      }
      try {
        if (SNM._threadId) {
          await SNM.api(
            "/messages/threads/" + encodeURIComponent(SNM._threadId),
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
        var box =
          document.getElementById("threadMessages") ||
          document.getElementById("msgList");
        if (box) {
          var empty = box.querySelector("p.soft");
          if (empty) empty.remove();
          var bubble = document.createElement("div");
          bubble.className = "msg-bubble me";
          bubble.textContent = text;
          box.appendChild(bubble);
          box.scrollTop = box.scrollHeight;
        }
        if (SNM._threadId) {
          var titleEl = document.getElementById("threadTitle");
          SNM.openThread(
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
