SNM.openCallSheet = function (mode, peerLabel) {
  var sheet = document.getElementById("call-sheet");
  var peer = document.getElementById("callPeer");
  var status = document.getElementById("callStatus");
  if (peer) peer.textContent = peerLabel || SNM._threadPeer || "Peer";
  if (status)
    status.textContent =
      (mode === "video" ? "Video" : "Voice") + " — signaling not fully live yet";
  if (sheet) {
    sheet.classList.add("open");
    sheet.setAttribute("aria-hidden", "false");
    sheet.style.display = "block";
  }
};

SNM.closeCallSheet = function () {
  var sheet = document.getElementById("call-sheet");
  if (sheet) {
    sheet.classList.remove("open");
    sheet.setAttribute("aria-hidden", "true");
    sheet.style.display = "none";
  }
};

// wire once
var v = document.getElementById("btnCallVoice");
var vid = document.getElementById("btnCallVideo");
if (v && !v._snmWired) {
  v._snmWired = true;
  v.onclick = function () {
    if (!SNM._validThreadId(SNM._threadId)) {
      alert("Open a chat first");
      return;
    }
    SNM.openCallSheet("voice");
    // later: SNM.api("/calls/offer", { thread_id, mode: "voice" })
  };
}
if (vid && !vid._snmWired) {
  vid._snmWired = true;
  vid.onclick = function () {
    if (!SNM._validThreadId(SNM._threadId)) {
      alert("Open a chat first");
      return;
    }
    SNM.openCallSheet("video");
  };
}
var end = document.getElementById("btnCallEnd");
if (end && !end._snmWired) {
  end._snmWired = true;
  end.onclick = function () {
    SNM.closeCallSheet();
  };
}
