window.SNM = window.SNM || {};
SNM._activeThread = null;

SNM.loadMessages = async function () {
  var rail = document.getElementById("contactRail");
  var list = document.getElementById("threadList");
  var panel = document.getElementById("threadView");
  if (panel) panel.classList.add("hidden");
  if (list) list.classList.remove("hidden");

  if (rail) rail.innerHTML = "<p class='muted'>Loading…</p>";

  try {
    /* Backend: GET /messages/inbox */
    var data = await SNM.api("/messages/inbox");
    var threads = data.threads || [];

    function peerLabel(t) {
      var th = t.thread || t;
      return (
        th.peer_name ||
        th.title ||
        (t.last_message && (t.last_message.body || "").slice(0, 24)) ||
        "Chat"
      );
    }

    function threadId(t) {
      var th = t.thread || t;
      return th.id || t.id;
    }

    if (rail) {
      if (!threads.length) {
        rail.innerHTML =
          "<span class='muted'>No chats yet — message a seller from search or fairly used.</span>";
      } else {
        rail.innerHTML = threads.slice(0, 20).map(function (t) {
          var id = threadId(t);
          var name = peerLabel(t);
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
        }).join("");
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
        list.innerHTML = threads.map(function (t) {
          var id = threadId(t);
          var name = peerLabel(t);
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
        }).join("");
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
    if (list)
      list.innerHTML =
        "<p class='muted'>Messages: " + (e.message || "unavailable") + "</p>";
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
    var rows = data.messages || [];
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
    if (msgs)
      msgs.innerHTML =
        "<p class='error'>" + (e.message || "Load failed") + "</p>";
  }
};

SNM.bindMessages = function () {
  var back = document.getElementById("btnBackThreads");
  if (back)
    back.onclick = function () {
      document.getElementById("threadView").classList.add("hidden");
      document.getElementById("threadList").classList.remove("hidden");
    };

  var send = document.getElementById("btnSendMsg");
  if (send)
    send.onclick = async function () {
      var body = (document.getElementById("msgBody").value || "").trim();
      if (!body || !SNM._activeThread) return;
      try {
        /* Backend: POST /messages/threads/{thread_id} */
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
};
