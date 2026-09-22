window.SNM = window.SNM || {};

SNM.renderProfile = function () {
  var body = document.getElementById("profileBody");
  if (!body) return;
  var u = (typeof SNM.getUser === "function" && SNM.getUser()) || {};
  body.innerHTML =
    "<p><strong>" + SNM.esc(u.name || "User") + "</strong></p>" +
    "<p class='muted'>" + SNM.esc(u.role || "") + "</p>" +
    "<p>" + SNM.esc(u.phone || "") + "</p>" +
    "<p class='muted small'>" +
    SNM.esc(
      [u.primary_location, u.community, u.city, u.region, u.country]
        .filter(Boolean)
        .join(" · ")
    ) +
    "</p>";
};

SNM.openProfile = function () {
  SNM.renderProfile();
  var sheet = document.getElementById("profileSheet");
  if (sheet) {
    sheet.classList.add("open");
    sheet.setAttribute("aria-hidden", "false");
  }
};

var btn = document.getElementById("btnProfile");
if (btn && !btn._snmProfileWired) {
  btn._snmProfileWired = true;
  btn.onclick = function (e) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (typeof SNM.openProfile === "function") SNM.openProfile();
  };
}