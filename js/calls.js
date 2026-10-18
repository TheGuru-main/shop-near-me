window.SNM = window.SNM || {};

SNM.openCallSheet = function (mode, peerLabel) {
  var sheet = document.getElementById("call-sheet");
  var peer = document.getElementById("callPeer");
  var status = document.getElementById("callStatus");
  var phone = SNM._threadPeer || "";
  if (peer) peer.textContent = peerLabel || phone || "Peer";
  if (status) {
    status.textContent =
      (mode === "video" ? "Video call" : "Voice call") +
      " — connecting…";
  }
  if (sheet) {
    sheet.classList.add("open");
    sheet.setAttribute("aria-hidden", "false");
    sheet.style.display = "block";
  }
  /* Native dial fallback until WebRTC signaling is live */
  if (mode === "voice" && phone && phone.charAt(0) === "+") {
    if (status) status.textContent = "Opening phone dialer for " + phone;
    try {
      window.location.href = "tel:" + phone;
    } catch (e) {}
  } else if (status) {
    status.textContent =
      (mode === "video" ? "Video" : "Voice") +
      " signaling is in progress. Peer: " +
      (phone || "—");
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

(function () {
  function wire() {
    var v = document.getElementById("btnCallVoice");
    var vid = document.getElementById("btnCallVideo");
    var end = document.getElementById("btnCallEnd");
    if (v && !v._snmWired) {
      v._snmWired = true;
      v.onclick = function () {
        if (!SNM._threadPeer && !SNM._validThreadId(SNM._threadId)) {
          alert("Open a chat first");
          return;
        }
        SNM.openCallSheet("voice");
      };
    }
    if (vid && !vid._snmWired) {
      vid._snmWired = true;
      vid.onclick = function () {
        if (!SNM._threadPeer && !SNM._validThreadId(SNM._threadId)) {
          alert("Open a chat first");
          return;
        }
        SNM.openCallSheet("video");
      };
    }
    if (end && !end._snmWired) {
      end._snmWired = true;
      end.onclick = function () {
        SNM.closeCallSheet();
      };
    }
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", wire);
  } else wire();
})();
