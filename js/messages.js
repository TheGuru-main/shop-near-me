window.SNM = window.SNM || {};

SNM.activeThreadId = null;

SNM.loadInbox = async function () {
  var box = document.getElementById("inboxList");
  var thread = document.getElementById("threadView");
  if (thread) thread.classList.add("hidden");
  if (!box) return;
  box.classList.remove("hidden");
  box.innerHTML = "<p class=\"muted\">Loading inbox…</p>";
  try {
    var data = await SNM.api("/messages/inbox");
    var items = data.threads || data.items || data || [];
    if (!Array.isArray(items)) items = [];
    if (!items.length) {
      box.innerHTML =
        "<p class=\"muted\">No messages yet. Keep chat in-app for protected deals.</p>";
      return;
    }
    box.innerHTML = items
      .map(function (t) {
        var id = t.id || t.thread_id || "";
        var title = t.title || t.peer_name || t.other_name || "Thread";
        var last = t.last_message || t.preview || "";
        return (
          "<div class=\"card\" data-thread=\"" +
          SNM.escapeHtml(String(id)) +
          "\" style=\"cursor:pointer\">" +
          "<strong>" +
          SNM.escapeHtml(title) +
          "</strong>" +
          "<div class=\"muted\">" +
          SNM.escapeHtml(last) +
          "</div></div>"
        );
      })
      .join("");

    box.querySelectorAll("[data-thread]").forEach(function (el) {
      el.onclick = function () {
        var id = el.getAttribute("data-thread");
        SNM.openThread(id, el.querySelector("strong")
          ? el.querySelector("strong").textContent
          : "Thread");
      };
    });
  } catch (e) {
    box.innerHTML = "<p class=\"muted\">" + SNM.escapeHtml(e.message || "Inbox failed") + "</p>";
  }
};

SNM.openThread = async function (threadId, title) {
  SNM.activeThreadId = threadId;
  var box = document.getElementById("inboxList");
  var view = document.getElementById("threadView");
  var titleEl = document.getElementById("threadTitle");
  var msgs = document.getElementById("threadMessages");
  if (box) box.classList.add("hidden");
  if (view) view.classList.remove("hidden");
  if (titleEl) titleEl.textContent = title || "Thread";
  if (!msgs) return;
  msgs.innerHTML = "<p class=\"muted\">Loading…</p>";
  try {
    var data = await SNM.api("/messages/threads/" + encodeURIComponent(threadId));
    var list = data.messages || data.items || data || [];
    if (!Array.isArray(list)) list = [];
    if (!list.length) {
      msgs.innerHTML = "<p class=\"muted\">No messages in this thread</p>";
      return;
    }
    var me = SNM.getUser() || {};
    msgs.innerHTML = list
      .map(function (m) {
        var mine =
          m.sender_phone === me.phone ||
          m.sender_id === me.id ||
          m.from_me === true;
        return (
          "<div class=\"muted\" style=\"margin:0.35rem 0;text-align:" +
          (mine ? "right" : "left") +
          "\">" +
          "<span style=\"display:inline-block;background:" +
          (mine ? "#dcfce7" : "#f3f4f6") +
          ";padding:0.4rem 0.6rem;border-radius:10px;color:#14532d;font-style:normal\">" +
          SNM.escapeHtml(m.body || m.text || m.content || "") +
          "</span></div>"
        );
      })
      .join("");
    msgs.scrollTop = msgs.scrollHeight;
  } catch (e) {
    msgs.innerHTML = "<p class=\"muted\">" + SNM.escapeHtml(e.message || "Load failed") + "</p>";
  }
};

SNM.sendThreadMessage = async function () {
  var input = document.getElementById("threadInput");
  if (!input || !SNM.activeThreadId) return;
  var text = (input.value || "").trim();
  if (!text) return;
  try {
    await SNM.api("/messages/threads/" + encodeURIComponent(SNM.activeThreadId), {
      method: "POST",
      body: { body: text, text: text }
    });
    input.value = "";
    await SNM.openThread(
      SNM.activeThreadId,
      (document.getElementById("threadTitle") || {}).textContent || "Thread"
    );
  } catch (e) {
    SNM.toast(e.message || "Send failed");
  }
};

SNM.bindMessages = function () {
  var close = document.getElementById("btnCloseThread");
  if (close) {
    close.onclick = function () {
      SNM.activeThreadId = null;
      var view = document.getElementById("threadView");
      var box = document.getElementById("inboxList");
      if (view) view.classList.add("hidden");
      if (box) box.classList.remove("hidden");
      SNM.loadInbox();
    };
  }
  var send = document.getElementById("btnSendThread");
  if (send) {
    send.onclick = function () {
      SNM.sendThreadMessage();
    };
  }
  var input = document.getElementById("threadInput");
  if (input) {
    input.addEventListener("keydown", function (e) {
      if (e.key === "Enter") SNM.sendThreadMessage();
    });
  }
};
