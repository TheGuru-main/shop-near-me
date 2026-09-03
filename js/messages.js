window.SNM = window.SNM || {};

SNM._activeThreadId = null;
SNM._activePeerId = null;

SNM.loadThreads = async function () {
  var list = document.getElementById("threadList");
  var view = document.getElementById("threadView");
  if (view) view.classList.add("hidden");
  if (list) list.classList.remove("hidden");
  if (!list) return;
  list.innerHTML = "<p class='muted'>Loading messages…</p>";
  try {
    var data = await SNM.api("/messages/threads");
    var rows = data.threads || data.items || data.results || [];
    if (!rows.length) {
      list.innerHTML =
        "<div class='card'><p>No conversations yet.</p><p class='muted'>Message a seller from search or fairly used.</p></div>";
      return;
    }
    list.innerHTML = rows
      .map(function (t) {
        var title = t.peer_name || t.title || t.other_name || "Chat";
        var preview = t.last_message || t.preview || "";
        var id = t.id || t.thread_id;
        var peer = t.peer_id || t.other_user_id || "";
        return (
          '<button type="button" class="product-card" style="width:100%;text-align:left" data-thread="' +
          id +
          '" data-peer="' +
          peer +
          '">' +
          '<div class="title">' +
          title +
          "</div>" +
          '<div class="meta">' +
          preview +
          "</div>" +
          "</button>"
        );
      })
      .join("");
  } catch (err) {
    list.innerHTML =
      "<div class='card'><p class='error show'>" +
      (err.message || "Messages failed") +
      "</p></div>";
  }
};

SNM.openThread = async function (threadId, peerId) {
  SNM._activeThreadId = threadId;
  SNM._activePeerId = peerId || null;
  var list = document.getElementById("threadList");
  var view = document.getElementById("threadView");
  var box = document.getElementById("threadMsgs");
  if (list) list.classList.add("hidden");
  if (view) view.classList.remove("hidden");
  if (!box) return;
  box.innerHTML = "<p class='muted'>Loading…</p>";
  try {
    var data = await SNM.api(
      "/messages/threads/" + encodeURIComponent(threadId)
    );
    var msgs = data.messages || data.items || [];
    var me = (SNM.getUser() || {}).id;
    box.innerHTML = msgs
      .map(function (m) {
        var mine = String(m.sender_id || m.from_id) === String(me);
        return (
          '<div class="card" style="align-self:' +
          (mine ? "flex-end" : "flex-start") +
          ';max-width:85%">' +
          (m.body || m.text || "") +
          "</div>"
        );
      })
      .join("");
    box.scrollTop = box.scrollHeight;
  } catch (err) {
    box.innerHTML =
      "<p class='error show'>" + (err.message || "Thread failed") + "</p>";
  }
};

SNM.sendMessage = async function () {
  var body = (document.getElementById("msgBody")?.value || "").trim();
  if (!body) return;
  if (!SNM._activeThreadId && !SNM._activePeerId) {
    SNM.toast("No active chat");
    return;
  }
  try {
    await SNM.api("/messages", {
      method: "POST",
      body: {
        thread_id: SNM._activeThreadId,
        to_user_id: SNM._activePeerId,
        body: body
      }
    });
    document.getElementById("msgBody").value = "";
    if (SNM._activeThreadId) SNM.openThread(SNM._activeThreadId, SNM._activePeerId);
  } catch (err) {
    SNM.toast(err.message || "Send failed");
  }
};

SNM.startChatWith = async function (userId, name) {
  try {
    var data = await SNM.api("/messages/threads", {
      method: "POST",
      body: { peer_id: userId, peer_name: name || "" }
    });
    var id = data.id || data.thread_id;
    SNM.showScreen("messages");
    SNM.openThread(id, userId);
  } catch (err) {
    SNM.toast(err.message || "Could not start chat");
  }
};

SNM.bindMessages = function () {
  document.getElementById("threadList")?.addEventListener("click", function (e) {
    var btn = e.target.closest("[data-thread]");
    if (!btn) return;
    SNM.openThread(btn.getAttribute("data-thread"), btn.getAttribute("data-peer"));
  });
  document.getElementById("btnSendMsg")?.addEventListener("click", SNM.sendMessage);
  document.getElementById("msgBody")?.addEventListener("keydown", function (e) {
    if (e.key === "Enter") SNM.sendMessage();
  });
};
