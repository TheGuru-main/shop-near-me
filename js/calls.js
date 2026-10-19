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


SNM._callNotify = function (msg, isErr) {
  msg = String(msg || "");
  SNM._setCallStatus(msg);
  if (typeof SNM.toast === "function") {
    try {
      SNM.toast(msg);
      return;
    } catch (e) {}
  }
  /* avoid alert spam — status line is enough unless hard error */
  if (isErr && /session expired|not registered|unreachable/i.test(msg)) {
    try {
      alert(msg);
    } catch (e2) {}
  }
};


SNM._callId = null;
SNM._pc = null;
SNM._localStream = null;
SNM._callPoll = null;
SNM._signalCursor = 0;
SNM._callMode = "voice";
SNM._isCaller = false;

SNM._iceServers = function () {
  return [{ urls: "stun:stun.l.google.com:19302" }];
};

SNM.closeCallSheet = function () {
  var sheet = document.getElementById("call-sheet");
  if (sheet) {
    sheet.classList.remove("open");
    sheet.setAttribute("aria-hidden", "true");
    sheet.style.display = "none";
  }
};

SNM._setCallStatus = function (t) {
  var status = document.getElementById("callStatus");
  if (status) status.textContent = t || "";
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
};

SNM.hangupCall = async function () {
  var id = SNM._callId;
  if (id && typeof SNM.api === "function") {
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
      body: {
        call_id: SNM._callId,
        kind: "ice",
        ice: ev.candidate.toJSON()
      }
    }).catch(function () {});
  };
  pc.onconnectionstatechange = function () {
    var st = pc.connectionState || "";
    if (st === "connected") SNM._callNotify("Connected");
    else if (st === "connecting") SNM._callNotify("Connecting media…");
    else if (st === "disconnected") SNM._callNotify("Connection unstable…");
    else if (st === "failed") SNM._callNotify("Connection failed — network or peer offline", true);
    else if (st === "closed") SNM._callNotify("Call closed");
    else SNM._setCallStatus("Connection: " + st);
  };
  pc.ontrack = function (ev) {
    var remote = document.getElementById("callRemoteVideo");
    if (remote && ev.streams && ev.streams[0]) {
      remote.srcObject = ev.streams[0];
      remote.play && remote.play().catch(function () {});
    }
  };
  return pc;
};

SNM._attachLocal = async function (mode) {
  var video = mode === "video";
  var stream = await navigator.mediaDevices.getUserMedia({
    audio: true,
    video: video
  });
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
  var me = ((typeof SNM.getUser === "function" && SNM.getUser()) || {}).phone || "";
  me = String(me);
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
        body: {
          call_id: SNM._callId,
          kind: "answer",
          sdp: answer.sdp
        }
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
      } else {
        SNM._signalCursor = (SNM._signalCursor || 0) + list.length;
      }
      if (data && data.status === "ended") {
        SNM._setCallStatus("Ended");
        SNM._stopCallMedia();
      }
    })
    .catch(function () {});
};

SNM.startCall = async function (mode, peerPhone, peerLabel) {
  mode = mode === "video" ? "video" : "voice";
  peerPhone =
    peerPhone ||
    (typeof SNM.resolveCallPeerPhone === "function"
      ? SNM.resolveCallPeerPhone()
      : "") ||
    SNM._threadPeer ||
    "";
  peerPhone =
    typeof SNM._callPeerPhone === "function"
      ? SNM._callPeerPhone(peerPhone)
      : String(peerPhone || "").trim();
  if (!peerPhone) {
    var sheet0 = document.getElementById("call-sheet");
    if (sheet0) {
      sheet0.classList.add("open");
      sheet0.style.display = "block";
      sheet0.setAttribute("aria-hidden", "false");
    }
    SNM._setCallStatus("No peer UID — open a chat first");
    return;
  }
  /* immediate UI so button never feels dead */
  (function () {
    var sheet = document.getElementById("call-sheet");
    var peerEl = document.getElementById("callPeer");
    if (peerEl) peerEl.textContent = peerLabel || peerPhone;
    if (sheet) {
      sheet.classList.add("open");
      sheet.style.display = "block";
      sheet.setAttribute("aria-hidden", "false");
    }
    SNM._setCallStatus("Starting " + mode + "…");
  })();
  SNM._callMode = mode;
  SNM._isCaller = true;
  SNM._signalCursor = 0;

  var sheet = document.getElementById("call-sheet");
  var peer = document.getElementById("callPeer");
  if (peer) peer.textContent = peerLabel || peerPhone;
  if (sheet) {
    sheet.classList.add("open");
    sheet.setAttribute("aria-hidden", "false");
    sheet.style.display = "block";
  }
  SNM._setCallStatus("Starting " + mode + "…");

  try {
    SNM._callNotify("Connecting…");
    var rec = await SNM.api("/calls/start", {
      method: "POST",
      body: { to_uid: peerPhone, mode: mode }
    });
    SNM._callId = rec.call_id;
    try {
      await SNM._attachLocal(mode);
    } catch (mediaErr) {
      SNM._callNotify(
        "Mic/camera blocked or unavailable. Allow permission and retry.",
        true
      );
      SNM._stopCallMedia();
      return;
    }
    var pc = SNM._ensurePc();
    var offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    await SNM.api("/calls/signal", {
      method: "POST",
      body: {
        call_id: SNM._callId,
        kind: "offer",
        sdp: offer.sdp
      }
    });
    SNM._callNotify("Ringing… waiting for answer");
    if (SNM._callPoll) clearInterval(SNM._callPoll);
    SNM._callPoll = setInterval(SNM._pollCall, 1200);
    /* no answer timeout */
    setTimeout(function () {
      if (!SNM._callId) return;
      if (SNM._pc && SNM._pc.connectionState === "connected") return;
      var st = (SNM._pc && SNM._pc.connectionState) || "";
      if (st !== "connected" && st !== "connecting") {
        SNM._callNotify("No answer / user may be offline", true);
      }
    }, 45000);
  } catch (e) {
    var msg = (e && e.message) || "Call failed";
    var status = e && e.status;
    if (/Field required|loc|query/i.test(msg)) {
      msg = "Call request failed (bad payload). Update app and retry.";
    }
    if (status === 404 || /not found|callee/i.test(msg)) {
      msg = "User offline or not registered on Shop Near Me";
    } else if (status === 401 || status === 403) {
      msg = "Session expired — log in again, then retry call";
    } else if (/failed to fetch|network|load failed|offline/i.test(msg)) {
      msg = "Call server unreachable (network/CORS/sleeping host). Stay in app — retry in a few seconds.";
    }
    SNM._callNotify(msg, true);
    
    }
  }
};

SNM.joinCall = async function (callId, mode) {
  SNM._callId = callId;
  SNM._callMode = mode === "video" ? "video" : "voice";
  SNM._isCaller = false;
  SNM._signalCursor = 0;
  var sheet = document.getElementById("call-sheet");
  if (sheet) {
    sheet.classList.add("open");
    sheet.setAttribute("aria-hidden", "false");
    sheet.style.display = "block";
  }
  SNM._callNotify("Incoming call — joining…");
  if (SNM._callPoll) clearInterval(SNM._callPoll);
  SNM._callPoll = setInterval(SNM._pollCall, 1000);
  SNM._pollCall();
};

SNM.openCallSheet = function (mode, peerLabel) {
  var peer =
    (typeof SNM.resolveCallPeerPhone === "function" &&
      SNM.resolveCallPeerPhone()) ||
    SNM._threadPeer ||
    "";
  if (!peer) {
    SNM._setCallStatus("No peer UID");
    return;
  }
  SNM.startCall(mode === "video" ? "video" : "voice", peer, peerLabel || peer);
};



SNM.pollIncomingCalls = async function () {
  if (typeof SNM.api !== "function" || !SNM.getToken || !SNM.getToken()) return;
  try {
    var data = await SNM.api("/calls/pending");
    var items = (data && data.items) || [];
    if (!items.length) return;
    var ring = items[0];
    if (!ring || !ring.call_id) return;
    if (SNM._callId) return;
    var fromName =
      (ring.from && (ring.from.name || ring.from.uid)) || "Incoming";
    var mode = ring.mode || "voice";
    SNM._incomingCallId = ring.call_id;
    SNM._incomingCallMode = mode;
    var sheet = document.getElementById("call-sheet");
    var peer = document.getElementById("callPeer");
    if (peer) peer.textContent = fromName;
    if (sheet) {
      sheet.classList.add("open");
      sheet.setAttribute("aria-hidden", "false");
      sheet.style.display = "block";
    }
    SNM._setCallStatus("Incoming " + mode + " call — tap Accept");

  } catch (e) {}
};


/* CALL_DELEGATE_WIRE_EOF — always-on, capture phase, ignores stale _snmWired */
SNM._openCallSheetDom = function (label, status) {
  var sheet = document.getElementById("call-sheet");
  var peerEl = document.getElementById("callPeer");
  if (peerEl) peerEl.textContent = label || "—";
  if (sheet) {
    sheet.classList.add("open");
    sheet.style.display = "block";
    sheet.setAttribute("aria-hidden", "false");
  }
  if (typeof SNM._setCallStatus === "function") SNM._setCallStatus(status || "Starting…");
};

SNM._peerForCall = function () {
  var peer = "";
  if (typeof SNM.resolveCallPeerPhone === "function") {
    try {
      peer = SNM.resolveCallPeerPhone() || "";
    } catch (e) {}
  }
  if (!peer) peer = SNM._threadPeer || "";
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
  if (typeof SNM._callPeerPhone === "function") peer = SNM._callPeerPhone(peer);
  else if (typeof SNM._normPhone === "function") peer = SNM._normPhone(peer);
  return String(peer || "").trim();
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
        if (typeof SNM.hangupCall === "function") SNM.hangupCall();
        return;
      }
      if (acc) {
        if (SNM._incomingCallId && typeof SNM.joinCall === "function") {
          SNM.joinCall(SNM._incomingCallId, SNM._incomingCallMode || "voice");
          SNM._incomingCallId = null;
        } else {
          SNM._openCallSheetDom("—", "No incoming call");
        }
        return;
      }

      var mode = video ? "video" : "voice";
      var peer = SNM._peerForCall();
      SNM._openCallSheetDom(peer || "—", peer ? "Starting " + mode + "…" : "No peer UID");
      if (!peer) return;
      if (typeof SNM.startCall === "function") {
        SNM.startCall(mode, peer, peer);
      } else {
        SNM._setCallStatus("Call module missing");
      }
    },
    true /* capture — wins over dead onclick / overlays */
  );

  if (!window._snmCallPendingTimer) {
    window._snmCallPendingTimer = setInterval(function () {
      if (typeof SNM.pollIncomingCalls === "function") SNM.pollIncomingCalls();
    }, 4000);
  }
})();

