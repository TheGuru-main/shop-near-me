/* Shop Near Me — messages.js */
(function () {
  function el(id) {
    return document.getElementById(id);
  }

  function escapeHtml(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  var activeThreadId = null;

  SNM.loadThreads = async function () {
    var box = el("threadList") || el("messagesList");
    if (!box) return;
    box.innerHTML = '<p class="muted">Loading conversations…</p>';
    try {
      var data = await SNM.api("/messages/threads", { method: "GET" });
      var threads = (data && (data.threads || data.items || data)) || [];
      if (!Array.isArray(threads)) threads = [];
      if (!threads.length) {
        box.innerHTML =
          '<p class="muted">No messages yet. Message a seller from Search or Fairly Used.</p>';
        return;
      }
      box.innerHTML = threads
        .map(function (t) {
          var id = escapeHtml(t.id || t.thread_id || "");
          var title = escapeHtml(
            t.title || t.peer_name || t.other_name || "Chat"
          );
          var preview = escapeHtml(t.last_body || t.preview || "");
          return (
            '<button type="button" class="feed-card thread-row" data-thread="' +
            id +
            '">' +
            "<strong>" +
            title +
            "</strong>" +
            '<p class="meta muted">' +
            preview +
            "</p></button>"
          );
        })
        .join("");
    } catch (e) {
      box.innerHTML =
        '<p class="err">' + escapeHtml(e.message || String(e)) + "</p>";
    }
  };

  SNM.openThread = async function (threadId) {
    activeThreadId = threadId;
    var box = el("messagePane") || el("chatPane") || el("messagesList");
    if (!box) return;
    box.innerHTML = '<p class="muted">Loading…</p>';
    try {
      var data = await SNM.api(
        "/messages/threads/" + encodeURIComponent(threadId),
        { method: "GET" }
      );
      var msgs = (data && (data.messages || data.items || [])) || [];
      var me = (SNM.getUser() || {}).id;
      box.innerHTML =
        msgs
          .map(function (m) {
            var mine = String(m.sender_id) === String(me);
            var body = escapeHtml(m.body || m.text || "");
            return (
              '<div class="msg-bubble ' +
              (mine ? "mine" : "theirs") +
              '">' +
              body +
              "</div>"
            );
          })
          .join("") || '<p class="muted">No messages in this thread.</p>';
      var composer = el("msgComposer");
      if (composer) composer.style.display = "block";
    } catch (e) {
      box.innerHTML =
        '<p class="err">' + escapeHtml(e.message || String(e)) + "</p>";
    }
  };

  SNM.sendMessage = async function () {
    var input = el("msgInput") || el("messageInput");
    if (!input || !activeThreadId) {
      SNM.toast("Open a conversation first");
      return;
    }
    var body = input.value.trim();
    if (!body) return;
    try {
      await SNM.api(
        "/messages/threads/" + encodeURIComponent(activeThreadId),
        {
          method: "POST",
          body: { body: body },
        }
      );
      input.value = "";
      await SNM.openThread(activeThreadId);
      await SNM.loadThreads();
    } catch (e) {
      SNM.toast(e.message || "Send failed");
    }
  };

  /** Start chat with a user/seller (from search or fairly used) */
  SNM.startChatWith = async function (peerUserId, seedText) {
    if (!peerUserId) {
      SNM.toast("Missing peer");
      return;
    }
    try {
      var data = await SNM.api("/messages/threads", {
        method: "POST",
        body: {
          peer_id: peerUserId,
          body: seedText || "Hello — interested via Shop Near Me",
        },
      });
      var tid = data.thread_id || data.id;
      if (typeof SNM.showScreen === "function") SNM.showScreen("messages");
      if (tid) await SNM.openThread(tid);
      await SNM.loadThreads();
    } catch (e) {
      SNM.toast(e.message || "Could not start chat");
    }
  };

  SNM.bindMessages = function () {
    var send = el("btnSendMsg") || el("btnMsgSend");
    if (send) send.onclick = function () {
      SNM.sendMessage();
    };
    document.body.addEventListener("click", function (e) {
      var row = e.target.closest("[data-thread]");
      if (row) {
        SNM.openThread(row.getAttribute("data-thread"));
        return;
      }
      var msgSeller = e.target.closest("[data-message-seller]");
      if (msgSeller) {
        SNM.startChatWith(
          msgSeller.getAttribute("data-message-seller"),
          msgSeller.getAttribute("data-seed") || ""
        );
      }
    });
  };
})();
