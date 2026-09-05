window.SNM = window.SNM || {};

SNM._callPeer = null;
SNM._callId = null;

SNM.openCallSheet = function (peerLabel, status) {
  var sheet = document.getElementById("call-sheet");
  var peer = document.getElementById("callPeer");
  var st = document.getElementById("callStatus");
  if (peer) peer.textContent = peerLabel || SNM._callPeer || "—";
  if (st) st.textContent = status || "Calling…";
  if (sheet) {
    sheet.classList.add("open");
    sheet.setAttribute("aria-hidden", "false");
  }
};

SNM.closeCallSheet = function () {
  var sheet = document.getElementById("call-sheet");
  if (sheet) {
    sheet.classList.remove("open");
    sheet.setAttribute("aria-hidden", "true");
  }
  SNM._callId = null;
};

SNM.startCall = async function (kind) {
  kind = kind || "voice";
  var phone = SNM._threadPeer || "";
  if (!phone) {
    alert("Open a chat first, then call.");
    return;
  }
  SNM._callPeer = phone;
  SNM.openCallSheet(phone, kind === "video" ? "Video calling…" : "Voice calling…");

  try {
    var data = await SNM.api("/calls/start", {
      method: "POST",
      body: {
        to_phone: phone,
        phone: phone,
        kind: kind,
        type: kind,
        thread_id: SNM._threadId || undefined
      }
    });
    SNM._callId = (data && (data.id || data.call_id)) || null;
    var st = document.getElementById("callStatus");
    if (st) {
      st.textContent =
        (data && data.status) ||
        "Signaling sent · media may soft-fail until WebRTC is fully live";
    }
  } catch (e) {
    var st2 = document.getElementById("callStatus");
    if (st2) {
      st2.textContent =
        "Signaling unavailable: " + ((e && e.message) || "try again later");
    }
  }
};

SNM.endCall = async function () {
  try {
    if (SNM._callId) {
      await SNM.api("/calls/end", {
        method: "POST",
        body: { call_id: SNM._callId, id: SNM._callId }
      });
    }
  } catch (e) {
    /* soft */
  }
  SNM.closeCallSheet();
};

SNM.acceptCall = async function () {
  var st = document.getElementById("callStatus");
  try {
    if (SNM._callId) {
      await SNM.api("/calls/accept", {
        method: "POST",
        body: { call_id: SNM._callId, id: SNM._callId }
      });
    }
    if (st) st.textContent = "Accepted · connect media when WebRTC path is live";
  } catch (e) {
    if (st) st.textContent = "Accept failed (signaling)";
  }
};

SNM.bindCalls = function () {
  var v = document.getElementById("btnCallVoice");
  var vid = document.getElementById("btnCallVideo");
  var end = document.getElementById("btnCallEnd");
  var acc = document.getElementById("btnCallAccept");

  if (v) {
    v.onclick = function () {
      SNM.startCall("voice");
    };
  }
  if (vid) {
    vid.onclick = function () {
      SNM.startCall("video");
    };
  }
  if (end) end.onclick = function () {
    SNM.endCall();
  };
  if (acc) acc.onclick = function () {
    SNM.acceptCall();
  };
};
