window.SNM = window.SNM || {};

SNM._threadId = null;

SNM.loadInbox = async function () {
  var box = document.getElementById("inboxList");
  if (!box) return;
  box.innerHTML = "<p class='muted'>Loading inbox…</p>";
  try {
    var data = await SNM.api("/messages/threads");
    var rows = data.items || data.threads || data || [];
    if (!Array.isArray(rows)) rows = [];
    if (!rows.length) {
      box.innerHTML = "<p class='muted'>No conversations yet.</p>";
      return;
    }
    box.innerHTML = rows
      .map(function (t) {
        var id = t.id || t.thread_id;
        var title = SNM.escapeHtml(t.title || t.peer_name || "Thread");
        return (
          '<div class="product-card" data-thread="' +
          SNM.escapeHtml(String(id)) +
          '"><div class="title">' +
          title +
          "</div></div>"
        );
      })
      .join("");
    box.querySelectorAll("[data-thread]").forEach(function (el) {
      el.onclick = function () {
        SNM.openThread(el.getAttribute("data-thread"), el.textContent);
      };
    });
  } catch (e) {
    box.innerHTML = "<p class='muted'>" + SNM.escapeHtml(e.message) + "</p>";
  }
};

SNM.openThread = async function (id, title) {
  SNM._threadId = id;
  var tv = document.getElementById("threadView");
  var inbox = document.getElementById("inboxList");
  if (tv) tv.classList.remove("hidden");
  if (inbox) inbox.classList.add("hidden");
  var tt = document.getElementById("threadTitle");
  if (tt) tt.textContent = title || "Thread";
  var box = document.getElementById("threadMessages");
  if (box) box.innerHTML = "<p class='muted'>Loading…</p>";
  try {
    var data = await SNM.api("/messages/threads/" + encodeURIComponent(id));
    var msgs = data.messages || data.items || [];
    if (box) {
      box.innerHTML = msgs.length
        ? msgs
            .map(function (m) {
              return (
                "<div><strong>" +
                SNM.escapeHtml(m.sender_name || "User") +
                ":</strong> " +
                SNM.escapeHtml(m.body || m.text || "") +
                "</div>"
              );
            })
            .join("")
        : "<p class='muted'>No messages.</p>";
    }
  } catch (e) {
    if (box) box.innerHTML = "<p class='muted'>" + SNM.escapeHtml(e.message) + "</p>";
  }
};

SNM.bindMessages = function () {
  var close = document.getElementById("btnCloseThread");
  if (close) {
    close.onclick = function () {
      SNM._threadId = null;
      var tv = document.getElementById("threadView");
      var inbox = document.getElementById("inboxList");
      if (tv) tv.classList.add("hidden");
      if (inbox) inbox.classList.remove("hidden");
    };
  }
  var send = document.getElementById("btnSendThread");
  if (send) {
    send.onclick = async function () {
      if (!SNM._threadId) return SNM.toast("Open a thread first");
      var input = document.getElementById("threadInput");
      var text = input ? (input.value || "").trim() : "";
      if (!text) return;
      try {
        await SNM.api("/messages/threads/" + encodeURIComponent(SNM._threadId), {
          method: "POST",
          body: { body: text }
        });
        if (input) input.value = "";
        SNM.openThread(SNM._threadId, document.getElementById("threadTitle").textContent);
      } catch (e) {
        SNM.toast(e.message || "Send failed");
      }
    };
  }
};
