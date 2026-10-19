window.SNM = window.SNM || {};

SNM._callPeerPhone = function (raw) {
  raw = String(raw || "").trim().replace(/\s/g, "");
  if (!raw) return "";
  if (raw.charAt(0) === "+") return "+" + raw.slice(1).replace(/\D/g, "");
  var d = raw.replace(/\D/g, "");
  if (d.indexOf("234") === 0) return "+" + d;
  if (d.length === 11 && d.charAt(0) === "0") return "+234" + d.slice(1);
  if (d.length >= 10) return "+" + d;
  return raw;
};

SNM._callId = null;
SNM._pc = null;
SNM._localStream = null;
SNM._callPoll = null;
SNM._signalCursor = 0;
SNM._callMode = "voice";
SNM._incomingCallId = null;
SNM._incomingCallMode = "voice";

SNM._iceServers = function () {
  return [{ urls: "stun:stun.l.google.com:19302" }];
};

SNM._setCallStatus = function (t) {
  var el = document.getElementById("callStatus");
  if (el) el.textContent = t || "";
};

SNM._openCallSheetDom = function (label, status) {
  var sheet = document.getElementById("call-sheet");
  var peerEl = document.getElementById("callPeer");
  if (peerEl) peerEl.textContent = label || "—";
  if (sheet) {
    sheet.classList.add("open");
    sheet.style.display = "block";
    sheet.setAttribute("aria-hidden", "false");
  }
  SNM._setCallStatus(status || "");
};

SNM.closeCallSheet = function () {
  var sheet = document.getElementById("call-sheet");
  if (sheet) {
    sheet.classList.remove("open");
    sheet.style.display = "none";
    sheet.setAttribute("aria-hidden", "true");
  }
};

SNM._callNotify = function (msg) {
  SNM._setCallStatus(String(msg || ""));
};

SNM._stopCallMedia = function () {
  if (SNM._callPoll) {
    clearInterval(SNM._callPoll);
    SNM._callPoll = null;
  }
  try { if (SNM._pc) SNM._pc.close(); } catch (e) {}
  SNM._pc = null;
  if (SNM._localStream) {
    SNM._localStream.getTracks().forEach(function (tr) {
      try { tr.stop(); } catch (e2) {}
    });
  }
  SNM._localStream = null;
  SNM._callId = null;
  SNM._signalCursor = 0;
};

SNM.hangupCall = async function () {
  var id = SNM._callId;
  if (id && SNM.api) {
    try {
      await SNM.api("/calls/signal", {
        method: "POST",
        body: { call_id: id, kind: "hangup" }
      });
    } catch (e) {}
  }
  SNM._stopCallMedia();
  SNM.closeCallSheet();
  SNM._setCallStatus("Ended");
};

SNM._ensurePc = function () {
  if (SNM._pc) return SNM._pc;
  var pc = new RTCPeerConnection({ iceServers: SNM._iceServers() });
  SNM._pc = pc;
  pc.onicecandidate = function (ev) {
    if (!ev.candidate || !SNM._callId) return;
    SNM.api("/calls/signal", {
      method: "POST",
      body: { call_id: SNM._callId, kind: "ice", ice: ev.candidate.toJSON() }
    }).catch(function () {});
  };
  pc.ontrack = function (ev) {
    var remote = document.getElementById("callRemoteVideo");
    if (remote && ev.streams && ev.streams[0]) {
      remote.srcObject = ev.streams[0];
      remote.play && remote.play().catch(function () {});
    }
  };
  pc.onconnectionstatechange = function () {
    var st = pc.connectionState;
    if (st === "connected") SNM._setCallStatus("Connected");
    else if (st === "connecting") SNM._setCallStatus("Connecting…");
    else if (st === "failed") SNM._setCallStatus("Connection failed");
  };
  return pc;
};

SNM._attachLocal = async function (mode) {
  var stream = await navigator.mediaDevices.getUserMedia(
    mode === "video"
      ? { audio: true, video: { facingMode: "user" } }
      : { audio: true, video: false }
  );
  SNM._localStream = stream;
  var local = document.getElementById("callLocalVideo");
  if (local) {
    local.srcObject = stream;
    local.muted = true;
    local.play && local.play().catch(function () {});
  }
  var pc = SNM._ensurePc();
  stream.getTracks().forEach(function (tr) {
    pc.addTrack(tr, stream);
  });
  return stream;
};

SNM._handleSignal = async function (entry) {
  if (!entry || !entry.kind) return;
  var me = ((SNM.getUser && SNM.getUser()) || {}).phone || "";
  if (entry.from_uid && me && entry.from_uid === me) return;
  var pc = SNM._ensurePc();
  try {
    if (entry.kind === "offer" && entry.sdp) {
      await pc.setRemoteDescription({ type: "offer", sdp: entry.sdp });
      await SNM._attachLocal(SNM._callMode);
      var answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      await SNM.api("/calls/signal", {
        method: "POST",
        body: { call_id: SNM._callId, kind: "answer", sdp: answer.sdp }
      });
      SNM._callNotify("Answered — connecting…");
    } else if (entry.kind === "answer" && entry.sdp) {
      await pc.setRemoteDescription({ type: "answer", sdp: entry.sdp });
      SNM._callNotify("In call");
    } else if (entry.kind === "ice" && entry.ice) {
      await pc.addIceCandidate(entry.ice);
    } else if (entry.kind === "hangup") {
      SNM._callNotify("Peer hung up");
      SNM._stopCallMedia();
      SNM.closeCallSheet();
    }
  } catch (e) {
    console.warn("signal", e);
  }
};

SNM._pollCall = function () {
  if (!SNM._callId) return;
  SNM.api(
    "/calls/" + encodeURIComponent(SNM._callId) +
      "?after=" + encodeURIComponent(String(SNM._signalCursor || 0))
  )
    .then(function (data) {
      ((data && data.signals) || []).forEach(function (s) {
        SNM._handleSignal(s);
      });
      if (data && data.signal_total != null) SNM._signalCursor = data.signal_total;
      if (data && data.status === "ended") {
        SNM._setCallStatus("Ended");
        SNM._stopCallMedia();
      }
    })
    .catch(function () {});
};

SNM._peerForCall = function () {
  var peer = (typeof SNM.resolveCallPeerPhone === "function" && SNM.resolveCallPeerPhone()) ||
    SNM._threadPeer ||
    "";
  if (!peer) {
    var tv = document.getElementById("threadView");
    if (tv && tv.dataset && tv.dataset.peerPhone) peer = tv.dataset.peerPhone;
  }
  if (!peer) {
    var active = document.querySelector(
      "#inboxList .card.active[data-phone], #threadList .card.active[data-phone]"
    );
    if (active) peer = active.getAttribute("data-phone") || "";
  }
  return SNM._callPeerPhone(peer);
};

SNM.startCall = async function (mode, peerPhone, peerLabel) {
  mode = mode === "video" ? "video" : "voice";
  peerPhone = SNM._callPeerPhone(peerPhone || SNM._peerForCall() || "");
  peerLabel = peerLabel || peerPhone || "Peer";
  SNM._openCallSheetDom(peerLabel, peerPhone ? "Starting " + mode + "…" : "No peer UID");
  if (!peerPhone) return;

  SNM._callMode = mode;
  SNM._signalCursor = 0;
  try {
    var rec = await SNM.api("/calls/start", {
      method: "POST",
      body: { to_uid: peerPhone, to_phone: peerPhone, mode: mode }
    });
    SNM._callId = rec.call_id || rec.id;
    SNM._setCallStatus("Attaching media…");
    try {
      await SNM._attachLocal(mode);
    } catch (e1) {
      SNM._callNotify("Allow mic/camera, then retry");
      SNM._stopCallMedia();
      return;
    }
    var pc = SNM._ensurePc();
    var offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    await SNM.api("/calls/signal", {
      method: "POST",
      body: { call_id: SNM._callId, kind: "offer", sdp: offer.sdp }
    });
    SNM._callNotify("Ringing… waiting for answer");
    if (SNM._callPoll) clearInterval(SNM._callPoll);
    SNM._callPoll = setInterval(SNM._pollCall, 1200);
  } catch (e) {
    var msg = (e && e.message) || "Call failed";
    if (e && e.status === 404) msg = "User not found";
    if (e && (e.status === 401 || e.status === 403)) msg = "Session expired — log in again";
    if (/failed to fetch|network/i.test(msg)) msg = "Call server unreachable — retry";
    SNM._callNotify(msg);
  }
};

SNM.joinCall = async function (callId, mode) {
  SNM._callId = callId;
  SNM._callMode = mode === "video" ? "video" : "voice";
  SNM._signalCursor = 0;
  SNM._openCallSheetDom("Incoming", "Joining…");
  try {
    await SNM._attachLocal(SNM._callMode);
  } catch (e) {
    SNM._callNotify("Allow mic/camera");
  }
  if (SNM._callPoll) clearInterval(SNM._callPoll);
  SNM._callPoll = setInterval(SNM._pollCall, 1000);
  SNM._pollCall();
};

SNM.openCallSheet = function (mode) {
  SNM.startCall(mode, SNM._peerForCall());
};

SNM.pollIncomingCalls = async function () {
  if (!SNM.api || !SNM.getToken || !SNM.getToken() || SNM._callId) return;
  try {
    var data = await SNM.api("/calls/pending");
    var items = (data && data.items) || [];
    if (!items.length) return;
    var ring = items[0];
    if (!ring || !ring.call_id) return;
    SNM._incomingCallId = ring.call_id;
    SNM._incomingCallMode = ring.mode || "voice";
    var name = (ring.from && (ring.from.name || ring.from.uid)) || "Incoming";
    SNM._openCallSheetDom(name, "Incoming — tap Accept");
  } catch (e) {}
};

(function () {
  if (window._snmCallDelegateWired) return;
  window._snmCallDelegateWired = true;
  document.addEventListener(
    "click",
    function (e) {
      var voice = e.target.closest("#btnCallVoice");
      var video = e.target.closest("#btnCallVideo");
      var end = e.target.closest("#btnCallEnd");
      var acc = e.target.closest("#btnCallAccept");
      if (!voice && !video && !end && !acc) return;
      e.preventDefault();
      e.stopPropagation();
      if (end) return SNM.hangupCall();
      if (acc) {
        if (SNM._incomingCallId) {
          var id = SNM._incomingCallId;
          var mode = SNM._incomingCallMode || "voice";
          SNM._incomingCallId = null;
          return SNM.joinCall(id, mode);
        }
        return SNM._openCallSheetDom("—", "No incoming call");
      }
      SNM.startCall(video ? "video" : "voice", SNM._peerForCall());
    },
    true
  );
  if (!window._snmCallPendingTimer) {
    window._snmCallPendingTimer = setInterval(function () {
      SNM.pollIncomingCalls();
    }, 4000);
  }
})();
