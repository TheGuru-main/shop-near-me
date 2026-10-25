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

SNM._sameUid = function (a, b) {
  var da = String(a || "").replace(/\D/g, "");
  var db = String(b || "").replace(/\D/g, "");
  if (!da || !db) return false;
  return da === db || da.slice(-10) === db.slice(-10);
};

SNM._callId = null;
SNM._pc = null;
SNM._localStream = null;
SNM._callPoll = null;
SNM._signalCursor = 0;
SNM._callMode = "voice";
SNM._incomingCallId = null;
SNM._incomingCallMode = "voice";
SNM._iceQueue = [];
SNM._remoteReady = false;

SNM._iceServers = function () {
  return [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" }
  ];
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
  try {
    if (SNM._pc) SNM._pc.close();
  } catch (e) {}
  SNM._pc = null;
  if (SNM._localStream) {
    SNM._localStream.getTracks().forEach(function (tr) {
      try {
        tr.stop();
      } catch (e2) {}
    });
  }
  SNM._localStream = null;
  SNM._callId = null;
  SNM._signalCursor = 0;
  SNM._iceQueue = [];
  SNM._remoteReady = false;
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

SNM._flushIce = async function () {
  var pc = SNM._pc;
  if (!pc || !SNM._remoteReady) return;
  var q = SNM._iceQueue.splice(0, SNM._iceQueue.length);
  for (var i = 0; i < q.length; i++) {
    try {
      await pc.addIceCandidate(q[i]);
    } catch (e) {
      console.warn("ice flush", e);
    }
  }
};

SNM._ensurePc = function () {
  if (SNM._pc) return SNM._pc;
  var pc = new RTCPeerConnection({ iceServers: SNM._iceServers() });
  SNM._pc = pc;
  SNM._remoteReady = false;
  SNM._iceQueue = [];

  pc.onicecandidate = function (ev) {
    if (!ev.candidate || !SNM._callId) return;
    SNM.api("/calls/signal", {
      method: "POST",
      body: {
        call_id: SNM._callId,
        kind: "ice",
        ice: ev.candidate.toJSON()
      }
    }).catch(function () {});
  };

  pc.ontrack = function (ev) {
    var remote = document.getElementById("callRemoteVideo");
    if (remote && ev.streams && ev.streams[0]) {
      remote.srcObject = ev.streams[0];
      if (remote.play) remote.play().catch(function () {});
    }
  };

  pc.onconnectionstatechange = function () {
    var st = pc.connectionState;
    if (st === "connected") SNM._setCallStatus("Connected");
    else if (st === "connecting") SNM._setCallStatus("Connecting…");
    else if (st === "failed") SNM._setCallStatus("Connection failed");
    else if (st === "disconnected") SNM._setCallStatus("Disconnected");
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
    if (local.play) local.play().catch(function () {});
  }
  var pc = SNM._ensurePc();
  stream.getTracks().forEach(function (tr) {
    pc.addTrack(tr, stream);
  });
  return stream;
};

SNM._myUid = function () {
  var u = (SNM.getUser && SNM.getUser()) || {};
  return SNM._callPeerPhone(u.phone || "");
};

SNM._handleSignal = async function (entry) {
  if (!entry || !entry.kind) return;
  var me = SNM._myUid();
  if (entry.from_uid && me && SNM._sameUid(entry.from_uid, me)) return;

  var pc = SNM._ensurePc();
  try {
    if (entry.kind === "offer" && entry.sdp) {
      await pc.setRemoteDescription({ type: "offer", sdp: entry.sdp });
      SNM._remoteReady = true;
      await SNM._flushIce();
      if (!SNM._localStream) await SNM._attachLocal(SNM._callMode);
      var answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      await SNM.api("/calls/signal", {
        method: "POST",
        body: { call_id: SNM._callId, kind: "answer", sdp: answer.sdp }
      });
      SNM._callNotify("Answered — connecting…");
    } else if (entry.kind === "answer" && entry.sdp) {
      await pc.setRemoteDescription({ type: "answer", sdp: entry.sdp });
      SNM._remoteReady = true;
      await SNM._flushIce();
      SNM._callNotify("In call");
    } else if (entry.kind === "ice" && entry.ice) {
      if (!SNM._remoteReady) SNM._iceQueue.push(entry.ice);
      else await pc.addIceCandidate(entry.ice);
    } else if (entry.kind === "hangup") {
      SNM._callNotify("Peer hung up");
      SNM._stopCallMedia();
      SNM.closeCallSheet();
    }
  } catch (e) {
    console.warn("signal", e);
    SNM._callNotify("Signal error: " + ((e && e.message) || "retry"));
  }
};

SNM._pollCall = function () {
  if (!SNM._callId) return;
  SNM.api(
    "/calls/" +
      encodeURIComponent(SNM._callId) +
      "?after=" +
      encodeURIComponent(String(SNM._signalCursor || 0))
  )
    .then(function (data) {
      var list = (data && data.signals) || [];
      list.forEach(function (s) {
        SNM._handleSignal(s);
      });
      if (data && data.signal_total != null) {
        SNM._signalCursor = data.signal_total;
      }
      if (data && data.status === "ended") {
        SNM._setCallStatus("Ended");
        SNM._stopCallMedia();
      }
    })
    .catch(function () {});
};

SNM._peerForCall = function () {
  var peer =
    (typeof SNM.resolveCallPeerPhone === "function" &&
      SNM.resolveCallPeerPhone()) ||
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
  SNM._openCallSheetDom(
    peerLabel,
    peerPhone ? "Starting " + mode + "…" : "No peer UID"
  );
  if (!peerPhone) return;
  if (!SNM.getToken || !SNM.getToken()) {
    SNM._callNotify("Not logged in");
    return;
  }

  SNM._callMode = mode;
  SNM._signalCursor = 0;
  SNM._iceQueue = [];
  SNM._remoteReady = false;

  try {
    var rec = await SNM.api("/calls/start", {
      method: "POST",
      body: { to_uid: peerPhone, to_phone: peerPhone, mode: mode }
    });
    SNM._callId = rec.call_id || rec.id;
    SNM._setCallStatus("Ringing " + peerPhone + "…");

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
    SNM._callNotify("Offer sent — waiting for answer…");

    if (SNM._callPoll) clearInterval(SNM._callPoll);
    SNM._callPoll = setInterval(SNM._pollCall, 900);
    setTimeout(function () {
      if (!SNM._callId) return;
      var st = (SNM._pc && SNM._pc.connectionState) || "";
      if (st !== "connected" && st !== "connecting") {
        SNM._callNotify("No answer / peer offline");
      }
    }, 45000);
  } catch (e) {
    var msg = (e && e.message) || "Call failed";
    var status = e && e.status;
    if (status === 404) msg = "User not found";
    else if (status === 401 || status === 403) msg = "Session expired — log in again";
    else if (status) msg = "Call failed (" + status + "): " + msg;
    else if (/failed to fetch|network/i.test(msg))
      msg = "Network / API waking — retry in 10s";
    SNM._callNotify(msg);
  }
};

SNM.joinCall = async function (callId, mode) {
  SNM._callId = callId;
  SNM._callMode = mode === "video" ? "video" : "voice";
  SNM._signalCursor = 0;
  SNM._iceQueue = [];
  SNM._remoteReady = false;
  SNM._openCallSheetDom("Incoming", "Joining…");
  try {
    await SNM._attachLocal(SNM._callMode);
  } catch (e) {
    SNM._callNotify("Allow mic/camera, then Accept");
    return;
  }
  if (SNM._callPoll) clearInterval(SNM._callPoll);
  SNM._callPoll = setInterval(SNM._pollCall, 800);
  SNM._pollCall();
};

SNM.openCallSheet = function (mode) {
  SNM.startCall(mode, SNM._peerForCall());
};

SNM.pollIncomingCalls = async function () {
  if (!SNM.api || !SNM.getToken || !SNM.getToken()) return;
  if (SNM._callId) return;
  try {
    var data = await SNM.api("/calls/pending");
    var items = (data && data.items) || [];
    if (!items.length) return;
    var ring = items[0];
    if (!ring || !ring.call_id) return;
    SNM._incomingCallId = ring.call_id;
    SNM._incomingCallMode = ring.mode || "voice";
    var name =
      (ring.from && (ring.from.name || ring.from.uid)) || "Incoming";
    SNM._openCallSheetDom(
      name,
      "Incoming " + SNM._incomingCallMode + " — Accept"
    );
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
      if (end) {
        SNM.hangupCall();
        return;
      }
      if (acc) {
        if (SNM._incomingCallId) {
          var id = SNM._incomingCallId;
          var mode = SNM._incomingCallMode || "voice";
          SNM._incomingCallId = null;
          SNM.joinCall(id, mode);
        } else {
          SNM._openCallSheetDom("—", "No incoming call");
        }
        return;
      }
      SNM.startCall(video ? "video" : "voice", SNM._peerForCall());
    },
    true
  );
  if (!window._snmCallPendingTimer) {
    window._snmCallPendingTimer = setInterval(function () {
      SNM.pollIncomingCalls();
    }, 3000);
  }
})();
