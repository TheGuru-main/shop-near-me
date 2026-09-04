window.SNM = window.SNM || {};
SNM._activeThread = null;

function _threadId(t) {
  var th = (t && t.thread) || t || {};
  return th.id || t.id;
}

function _peerLabel(t) {
  var th = (t && t.thread) || t || {};
  return (
    th.peer_name ||
    th.title ||
    (t.last_message && (t.last_message.body || "").slice(0, 28)) ||
    "Chat"
  );
}

SNM.loadMessages = async function () {
  var rail = document.getElementById("contactRail");
  var list = document.getElementById("threadList");
  var panel = document.getElementById("threadView");
  if (panel) panel.classList.add("hidden");
  if (list) list.classList.remove("hidden");
  if (rail) rail.innerHTML = "<p class='muted'>Loading…</p>";

  try {
    var data = await SNM.api("/messages/inbox");
    var threads = (data && data.threads) || [];

    if (rail) {
      if (!threads.length) {
        rail.innerHTML =
          "<span class='muted'>No chats yet. Use Direct message with +phone.</span>";
      } else {
        rail.innerHTML = threads
          .slice(0, 24)
          .map(function (t) {
            var id = _threadId(t);
            var name = _peerLabel(t);
            var preview =
              (t.last_message && t.last_message.body) || "Open";
            return (
              '<button type="button" class="contact-chip" data-thread="' +
              id +
              '" data-title="' +
              String(name).replace(/"/g, "") +
              '">' +
              '<div class="avatar">💬</div><div>' +
              name +
              "</div>" +
              '<div class="status">' +
              String(preview).slice(0, 40) +
              "</div></button>"
            );
          })
          .join("");
        rail.querySelectorAll(".contact-chip").forEach(function (chip) {
          chip.onclick = function () {
            rail.querySelectorAll(".contact-chip").forEach(function (c) {
              c.classList.remove("active");
            });
            chip.classList.add("active");
            SNM.openThread(
              chip.getAttribute("data-thread"),
              chip.getAttribute("data-title")
            );
          };
        });
      }
    }

    if (list) {
      if (!threads.length) {
        list.innerHTML = "<p class='muted'>Inbox empty.</p>";
      } else {
        list.innerHTML = threads
          .map(function (t) {
            var id = _threadId(t);
            var name = _peerLabel(t);
            var preview =
              (t.last_message && t.last_message.body) || "";
            return (
              '<button type="button" class="product-card" data-thread="' +
              id +
              '" data-title="' +
              String(name).replace(/"/g, "") +
              '"><div class="title">' +
              name +
              "</div>" +
              '<div class="meta">' +
              preview +
              "</div></button>"
            );
          })
          .join("");
        list.querySelectorAll("[data-thread]").forEach(function (b) {
          b.onclick = function () {
            SNM.openThread(
              b.getAttribute("data-thread"),
              b.getAttribute("data-title")
            );
          };
        });
      }
    }
  } catch (e) {
    if (list) {
      list.innerHTML =
        "<p class='muted'>Messages: " + (e.message || "unavailable") + "</p>";
    }
    if (rail) rail.innerHTML = "";
  }
};

SNM.openThread = async function (id, title) {
  SNM._activeThread = id;
  var list = document.getElementById("threadList");
  var panel = document.getElementById("threadView");
  var msgs = document.getElementById("threadMsgs");
  var tEl = document.getElementById("threadTitle");
  if (list) list.classList.add("hidden");
  if (panel) panel.classList.remove("hidden");
  if (tEl) tEl.textContent = title || "Chat";
  if (msgs) msgs.innerHTML = "<p class='muted'>Loading…</p>";

  try {
    var data = await SNM.api(
      "/messages/threads/" + encodeURIComponent(id)
    );
    var rows = (data && data.messages) || [];
    var me = (SNM.getUser() || {}).id;
    if (!rows.length) {
      msgs.innerHTML = "<p class='muted'>No messages yet.</p>";
      return;
    }
    msgs.innerHTML = rows
      .map(function (m) {
        var mine =
          String(m.from_user_id || m.sender_id || "") === String(me);
        return (
          '<div class="msg-bubble ' +
          (mine ? "mine" : "theirs") +
          '">' +
          (m.body || "") +
          "</div>"
        );
      })
      .join("");
    msgs.scrollTop = msgs.scrollHeight;
  } catch (e) {
    if (msgs) {
      msgs.innerHTML =
        "<p class='error'>" + (e.message || "Load failed") + "</p>";
    }
  }
};

SNM.bindMessages = function () {
  var back = document.getElementById("btnBackThreads");
  if (back) {
    back.onclick = function () {
      var tv = document.getElementById("threadView");
      var tl = document.getElementById("threadList");
      if (tv) tv.classList.add("hidden");
      if (tl) tl.classList.remove("hidden");
    };
  }

  var send = document.getElementById("btnSendMsg");
  if (send) {
    send.onclick = async function () {
      var body = (document.getElementById("msgBody").value || "").trim();
      if (!body || !SNM._activeThread) return;
      try {
        await SNM.api(
          "/messages/threads/" + encodeURIComponent(SNM._activeThread),
          { method: "POST", body: { body: body } }
        );
        document.getElementById("msgBody").value = "";
        SNM.openThread(
          SNM._activeThread,
          document.getElementById("threadTitle").textContent
        );
      } catch (e) {
        SNM.toast(e.message || "Send failed");
      }
    };
  }

  var dmBtn = document.getElementById("btnDmStart");
  if (dmBtn) {
    dmBtn.onclick = async function () {
      var err = document.getElementById("dmError");
      if (err) err.textContent = "";
      var phone = (document.getElementById("dm-phone").value || "").trim();
      var text =
        (document.getElementById("dm-body").value || "").trim() || "Hello";
      if (!phone || phone.charAt(0) !== "+") {
        if (err) {
          err.textContent = "Phone must start with + and country code";
        }
        return;
      }
      try {
        var found = await SNM.api(
          "/messages/lookup" + SNM.qs({ phone: phone })
        );
        var started = await SNM.api("/messages/threads", {
          method: "POST",
          body: {
            to_user_id: found.id,
            body: text,
            context_type: "direct"
          }
        });
        var tid =
          (started.thread && started.thread.id) || started.thread_id;
        var bodyEl = document.getElementById("dm-body");
        if (bodyEl) bodyEl.value = "";
        await SNM.loadMessages();
        if (tid) SNM.openThread(tid, found.name || phone);
      } catch (e) {
        if (err) err.textContent = e.message || "Could not start chat";
      }
    };
  }
};
