window.SNM = window.SNM || {};

SNM._threadId = null;
SNM._threadPeer = null;

SNM._msgPaths = {
  inbox: ["/messages/threads", "/messages/inbox", "/messages"],
  lookup: ["/messages/lookup", "/messages/user"],
  open: ["/messages/threads", "/messages/open"],
  send: ["/messages/send", "/messages"],
  history: ["/messages/thread", "/messages/history"]
};

SNM._tryGet = async function (paths, qs) {
  var last = null;
  for (var i = 0; i < paths.length; i++) {
    try {
      return await SNM.api(paths[i] + (qs || ""));
    } catch (e) {
      last = e;
      if (e && e.status && e.status !== 404) throw e;
    }
  }
  if (last) throw last;
  return null;
};

SNM._tryPost = async function (paths, body) {
  var last = null;
  for (var i = 0; i < paths.length; i++) {
    try {
      return await SNM.api(paths[i], { method: "POST", body: body });
    } catch (e) {
      last = e;
      if (e && e.status && e.status !== 404) throw e;
    }
  }
  if (last) throw last;
  return null;
};

SNM.renderContactRail = function (items) {
  var rail = document.getElementById("contactRail");
  if (!rail) return;
  items = items || [];
  if (!items.length) {
    rail.innerHTML = "";
    return;
  }
  rail.innerHTML = items
    .slice(0, 20)
    .map(function (t) {
      var name = t.name || t.peer_name || t.phone || "Chat";
      var phone = t.phone || t.peer_phone || "";
      var id = t.id || t.thread_id || "";
      return (
        '<button type="button" class="contact-chip" data-thread-id="' +
        SNM.esc(id) +
        '" data-phone="' +
        SNM.esc(phone) +
        '">' +
        SNM.esc(name) +
        "</button>"
      );
    })
    .join("");
};

SNM.renderThreadList = function (items) {
  var list = document.getElementById("threadList");
  if (!list) return;
  items = items || [];
  if (!items.length) {
    list.innerHTML = "<p class='muted'>No conversations yet. Start with a registered phone (+…).</p>";
    return;
  }
  list.innerHTML = items
    .map(function (t) {
      var title = t.name || t.peer_name || t.phone || "Conversation";
      var preview = t.last_message || t.preview || "";
      var id = t.id || t.thread_id || "";
      var phone = t.phone || t.peer_phone || "";
      return (
        '<article class="card" data-thread-id="' +
        SNM.esc(id) +
        '" data-phone="' +
        SNM.esc(phone) +
        '" style="cursor:pointer">' +
        "<strong>" +
        SNM.esc(title) +
        "</strong>" +
        (preview ? "<p class='muted small'>" + SNM.esc(preview) + "</p>" : "") +
        "</article>"
      );
    })
    .join("");
};

SNM.openThreadPanel = function (title) {
  var list = document.getElementById("threadList");
  var panel = document.getElementById("threadView");
  var tEl = document.getElementById("threadTitle");
  if (list) list.classList.add("hidden");
  if (panel) panel.classList.remove("hidden");
  if (tEl) tEl.textContent = title || "Chat";
};

SNM.closeThreadPanel = function () {
  var list = document.getElementById("threadList");
  var panel = document.getElementById("threadView");
  if (panel) panel.classList.add("hidden");
  if (list) list.classList.remove("hidden");
  SNM._threadId = null;
  SNM._threadPeer = null;
};

SNM.renderBubbles = function (messages) {
  var box = document.getElementById("msgList");
  if (!box) return;
  var me = SNM.getUser() || {};
  var myPhone = me.phone || "";
  var myId = me.id || "";
  messages = messages || [];
  box.innerHTML = messages
    .map(function (m) {
      var text = m.body || m.text || m.content || "";
      var from = m.from_phone || m.sender_phone || m.from || "";
      var sid = m.sender_id || m.from_id || "";
      var mine =
        (from && myPhone && from === myPhone) ||
        (sid && myId && String(sid) === String(myId)) ||
        !!m.mine;
      return (
        '<div class="msg-bubble ' +
        (mine ? "me" : "them") +
        '">' +
        SNM.esc(text) +
        "</div>"
      );
    })
    .join("");
  box.scrollTop = box.scrollHeight;
};

SNM.loadThreadMessages = async function (threadId) {
  var box = document.getElementById("msgList");
  if (box) box.innerHTML = "<p class='muted small'>Loading…</p>";
  try {
    var data = await SNM._tryGet(
      [
        "/messages/threads/" + encodeURIComponent(threadId),
        "/messages/thread/" + encodeURIComponent(threadId),
        "/messages/history"
      ],
      SNM.qs({ thread_id: threadId })
    );
    var msgs =
      (data && (data.messages || data.items || data.results)) ||
      (Array.isArray(data) ? data : []);
    SNM.renderBubbles(msgs);
  } catch (e) {
    if (box) {
      box.innerHTML =
        "<p class='muted small'>Could not load messages.</p>";
    }
  }
};

SNM.openThread = async function (opts) {
  opts = opts || {};
  var threadId = opts.threadId || opts.id || null;
  var phone = (opts.phone || "").trim();
  var title = opts.title || phone || "Chat";

  SNM._threadPeer = phone;
  SNM.openThreadPanel(title);

  if (!threadId && phone) {
    try {
      var looked = await SNM._tryGet(
        SNM._msgPaths.lookup,
        SNM.qs({ phone: phone })
      );
      if (looked) {
        threadId =
          looked.thread_id ||
          looked.id ||
          (looked.thread && looked.thread.id) ||
          null;
        title = looked.name || looked.user_name || title;
        if (looked.registered === false) {
          alert("That number is not registered on Shop Near Me.");
          SNM.closeThreadPanel();
          return;
        }
      }
    } catch (e) {
      alert("Number not found or not registered.");
      SNM.closeThreadPanel();
      return;
    }
  }

  if (!threadId && phone) {
    try {
      var opened = await SNM._tryPost(SNM._msgPaths.open, { phone: phone });
      threadId =
        (opened && (opened.thread_id || opened.id)) ||
        (opened && opened.thread && opened.thread.id) ||
        null;
    } catch (e) {
      /* may only need send with phone */
    }
  }

  SNM._threadId = threadId;
  var tEl = document.getElementById("threadTitle");
  if (tEl) tEl.textContent = title;

  if (threadId) await SNM.loadThreadMessages(threadId);
  else {
    var box = document.getElementById("msgList");
    if (box) {
      box.innerHTML =
        "<p class='muted small'>New chat with " +
        SNM.esc(phone) +
        ". Send a message.</p>";
    }
  }
};

SNM.startDmByPhone = async function (phone) {
  phone = (phone || "").trim();
  if (!phone || phone.charAt(0) !== "+") {
    alert("Use international phone (+234…).");
    return;
  }
  var input = document.getElementById("dm-phone");
  if (input) input.value = phone;
  SNM.showScreen("messages");
  await SNM.openThread({ phone: phone, title: phone });
};

SNM.sendMessage = async function () {
  var input = document.getElementById("msgInput");
  var text = ((input && input.value) || "").trim();
  if (!text) return;

  var body = {
    body: text,
    text: text,
    content: text
  };
  if (SNM._threadId) body.thread_id = SNM._threadId;
  if (SNM._threadPeer) body.to_phone = SNM._threadPeer;
  if (SNM._threadPeer) body.phone = SNM._threadPeer;

  /* optimistic */
  var box = document.getElementById("msgList");
  if (box) {
    var div = document.createElement("div");
    div.className = "msg-bubble me";
    div.textContent = text;
    box.appendChild(div);
    box.scrollTop = box.scrollHeight;
  }
  if (input) input.value = "";

  try {
    var data = await SNM._tryPost(SNM._msgPaths.send, body);
    if (data && (data.thread_id || data.id)) {
      SNM._threadId = data.thread_id || data.id;
    }
    if (SNM._threadId) await SNM.loadThreadMessages(SNM._threadId);
  } catch (e) {
    alert(
      "Send failed: " +
        ((e && e.message) || "check API / registered phone")
    );
  }
};

SNM.loadMessages = async function () {
  var list = document.getElementById("threadList");
  if (list) list.classList.remove("hidden");
  SNM.closeThreadPanel();
  if (list) list.innerHTML = "<p class='muted'>Loading inbox…</p>";
  try {
    var data = await SNM._tryGet(SNM._msgPaths.inbox, "");
    var items =
      (data && (data.threads || data.items || data.results)) ||
      (Array.isArray(data) ? data : []);
    SNM.renderContactRail(items);
    SNM.renderThreadList(items);
  } catch (e) {
    if (list) {
      list.innerHTML =
        "<p class='muted'>Inbox unavailable. You can still DM by phone.</p>";
    }
  }
};

SNM.bindMessages = function () {
  var dmBtn = document.getElementById("btnDmStart");
  if (dmBtn) {
    dmBtn.onclick = async function () {
      var phone = ((document.getElementById("dm-phone") || {}).value || "").trim();
      await SNM.startDmByPhone(phone);
    };
  }

  var sendBtn = document.getElementById("btnMsgSend");
  if (sendBtn) sendBtn.onclick = function () {
    SNM.sendMessage();
  };

  var input = document.getElementById("msgInput");
  if (input) {
    input.addEventListener("keydown", function (e) {
      if (e.key === "Enter") {
        e.preventDefault();
        SNM.sendMessage();
      }
    });
  }

  var back = document.getElementById("btnThreadBack");
  if (back) {
    back.onclick = function () {
      SNM.closeThreadPanel();
      SNM.loadMessages();
    };
  }

  var list = document.getElementById("threadList");
  if (list) {
    list.addEventListener("click", function (e) {
      var card = e.target.closest("[data-thread-id]");
      if (!card) return;
      SNM.openThread({
        threadId: card.getAttribute("data-thread-id"),
        phone: card.getAttribute("data-phone"),
        title: (card.querySelector("strong") || {}).textContent
      });
    });
  }

  var rail = document.getElementById("contactRail");
  if (rail) {
    rail.addEventListener("click", function (e) {
      var chip = e.target.closest("[data-thread-id], [data-phone]");
      if (!chip) return;
      SNM.openThread({
        threadId: chip.getAttribute("data-thread-id"),
        phone: chip.getAttribute("data-phone"),
        title: chip.textContent
      });
    });
  }
};
