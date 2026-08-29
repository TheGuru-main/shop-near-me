window.SNM = window.SNM || {};

/* ---------- Fairly used ---------- */
SNM.loadFairlyUsed = async function () {
  var box = document.getElementById("fairlyFeed");
  if (!box) return;
  box.innerHTML = "<p class=\"muted\">Loading fairly used…</p>";
  try {
    var data = await SNM.api("/fairly-used");
    var items = data.items || data.results || data || [];
    if (!Array.isArray(items)) items = [];
    if (!items.length) {
      box.innerHTML = "<p class=\"muted\">No posts yet. Be first.</p>";
      return;
    }
    box.innerHTML = items
      .map(function (p) {
        var id = p.id || "";
        return (
          "<div class=\"product-card\">" +
          "<strong>" + SNM.escapeHtml(p.title || p.name || "Post") + "</strong>" +
          "<div>" + SNM.escapeHtml(p.body || p.text || "") + "</div>" +
          "<div class=\"muted\">" +
          SNM.escapeHtml(p.seller_name || p.owner_name || "") +
          (p.price != null ? " · " + p.price : "") +
          "</div>" +
          "<div style=\"margin-top:0.5rem;display:flex;gap:0.4rem;flex-wrap:wrap\">" +
          "<button type=\"button\" class=\"btn small secondary\" data-fu-comment=\"" +
          SNM.escapeHtml(id) + "\">Comment</button>" +
          "<button type=\"button\" class=\"btn small secondary\" data-fu-share=\"" +
          SNM.escapeHtml(id) + "\">Share</button>" +
          "<button type=\"button\" class=\"btn small\" data-fu-msg=\"" +
          SNM.escapeHtml(id) + "\">Message seller</button>" +
          "</div></div>"
        );
      })
      .join("");

    box.querySelectorAll("[data-fu-comment]").forEach(function (btn) {
      btn.onclick = function () {
        var text = prompt("Comment");
        if (!text) return;
        SNM.api("/fairly-used/" + encodeURIComponent(btn.getAttribute("data-fu-comment")) + "/comments", {
          method: "POST",
          body: { body: text }
        })
          .then(function () {
            SNM.toast("Commented");
            SNM.loadFairlyUsed();
          })
          .catch(function (e) {
            SNM.toast(e.message || "Comment failed");
          });
      };
    });
    box.querySelectorAll("[data-fu-share]").forEach(function (btn) {
      btn.onclick = function () {
        SNM.toast("Share in-app · link copy coming with PWA share sheet");
      };
    });
    box.querySelectorAll("[data-fu-msg]").forEach(function (btn) {
      btn.onclick = async function () {
        try {
          await SNM.api("/messages/start", {
            method: "POST",
            body: { fairly_used_id: btn.getAttribute("data-fu-msg") }
          });
          SNM.toast("Thread opened");
          SNM.showScreen("messages");
          if (typeof SNM.loadInbox === "function") SNM.loadInbox();
        } catch (e) {
          SNM.toast(e.message || "Message seller failed");
        }
      };
    });
  } catch (e) {
    box.innerHTML = "<p class=\"muted\">" + SNM.escapeHtml(e.message || "Load failed") + "</p>";
  }
};

SNM.postFairlyUsed = async function () {
  var title = (document.getElementById("fu-title") && document.getElementById("fu-title").value) || "";
  var body = (document.getElementById("fu-body") && document.getElementById("fu-body").value) || "";
  var price = document.getElementById("fu-price") ? document.getElementById("fu-price").value : "";
  title = title.trim();
  body = body.trim();
  if (!title && !body) {
    SNM.toast("Add a title or note");
    return;
  }
  try {
    await SNM.api("/fairly-used", {
      method: "POST",
      body: {
        title: title || "Fairly used",
        body: body,
        price: price === "" ? null : Number(price)
      }
    });
    SNM.toast("Posted");
    if (document.getElementById("fu-title")) document.getElementById("fu-title").value = "";
    if (document.getElementById("fu-body")) document.getElementById("fu-body").value = "";
    if (document.getElementById("fu-price")) document.getElementById("fu-price").value = "";
    SNM.loadFairlyUsed();
  } catch (e) {
    SNM.toast(e.message || "Post failed");
  }
};

/* ---------- Banqueue / Emergency ---------- */
SNM.loadBanqueue = async function () {
  var box = document.getElementById("banqueueList");
  if (!box) return;
  box.innerHTML = "<p class=\"muted\">Loading…</p>";
  try {
    var data = await SNM.api("/banqueue/locations");
    var items = data.items || data.results || data || [];
    if (!Array.isArray(items)) items = [];
    box.innerHTML = items.length
      ? items
          .map(function (x) {
            return (
              "<div class=\"card\"><strong>" +
              SNM.escapeHtml(x.name || x.title || "Location") +
              "</strong><div class=\"muted\">" +
              SNM.escapeHtml(x.address || x.primary_location || "") +
              "</div></div>"
            );
          })
          .join("")
      : "<p class=\"muted\">No banqueue locations yet</p>";
  } catch (e) {
    box.innerHTML = "<p class=\"muted\">" + SNM.escapeHtml(e.message || "Failed") + "</p>";
  }
};

SNM.loadEmergency = async function () {
  var box = document.getElementById("emergencyList");
  if (!box) return;
  box.innerHTML = "<p class=\"muted\">Loading…</p>";
  try {
    var data = await SNM.api("/emergency/nearby");
    var items = data.items || data.results || data || [];
    if (!Array.isArray(items)) items = [];
    box.innerHTML = items.length
      ? items
          .map(function (x) {
            return (
              "<div class=\"card\"><strong>" +
              SNM.escapeHtml(x.name || x.type || "Unit") +
              "</strong><div class=\"muted\">" +
              SNM.escapeHtml(x.phone || x.contact || "") +
              " · " +
              SNM.escapeHtml(x.primary_location || x.community || "") +
              "</div></div>"
            );
          })
          .join("")
      : "<p class=\"muted\">No emergency units nearby</p>";
  } catch (e) {
    box.innerHTML = "<p class=\"muted\">" + SNM.escapeHtml(e.message || "Failed") + "</p>";
  }
};

/* ---------- Checkout assist ---------- */
SNM.runCheckoutAssist = async function () {
  var box = document.getElementById("checkoutResult");
  if (!box) return;
  var body = {
    item_name: (document.getElementById("co-item") && document.getElementById("co-item").value) || "",
    bulky: !!(document.getElementById("co-bulky") && document.getElementById("co-bulky").checked),
    pod: !!(document.getElementById("co-pod") && document.getElementById("co-pod").checked),
    qty: Number(document.getElementById("co-qty") && document.getElementById("co-qty").value) || 1
  };
  box.innerHTML = "<p class=\"muted\">Checking…</p>";
  try {
    var data = await SNM.api("/checkout/assist", { method: "POST", body: body });
    box.innerHTML =
      "<div class=\"card\"><strong>Assist</strong><pre style=\"white-space:pre-wrap;font-size:0.85rem\">" +
      SNM.escapeHtml(JSON.stringify(data, null, 2)) +
      "</pre></div>";
  } catch (e) {
    box.innerHTML = "<p class=\"muted\">" + SNM.escapeHtml(e.message || "Assist failed") + "</p>";
  }
};

/* ---------- Trust desk: report / rate / manifest ---------- */
SNM.submitReport = async function () {
  var target = (document.getElementById("rep-target") && document.getElementById("rep-target").value) || "";
  var reason = (document.getElementById("rep-reason") && document.getElementById("rep-reason").value) || "";
  if (!target || !reason) {
    SNM.toast("Target + reason required");
    return;
  }
  try {
    await SNM.api("/reports", {
      method: "POST",
      body: { target_phone: target.trim(), reason: reason.trim() }
    });
    SNM.toast("Report submitted");
  } catch (e) {
    SNM.toast(e.message || "Report failed");
  }
};

SNM.submitRating = async function () {
  var target = (document.getElementById("rate-target") && document.getElementById("rate-target").value) || "";
  var score = Number(document.getElementById("rate-score") && document.getElementById("rate-score").value);
  var note = (document.getElementById("rate-note") && document.getElementById("rate-note").value) || "";
  if (!target || !score) {
    SNM.toast("Target + score required");
    return;
  }
  try {
    await SNM.api("/ratings", {
      method: "POST",
      body: { target_phone: target.trim(), score: score, note: note.trim() }
    });
    SNM.toast("Rating saved");
  } catch (e) {
    SNM.toast(e.message || "Rating failed");
  }
};

SNM.messageAdmin = async function () {
  var body = (document.getElementById("admin-msg") && document.getElementById("admin-msg").value) || "";
  body = body.trim();
  if (!body) {
    SNM.toast("Write a message");
    return;
  }
  try {
    await SNM.api("/admin/contact", { method: "POST", body: { body: body } });
    SNM.toast("Sent to Shop Near Me admin box");
    if (document.getElementById("admin-msg")) document.getElementById("admin-msg").value = "";
  } catch (e) {
    SNM.toast(e.message || "Admin contact failed");
  }
};

SNM.loadNews = async function (category) {
  var box = document.getElementById("newsFeed");
  if (!box) return;
  box.innerHTML = "<p class=\"muted\">Loading news…</p>";
  try {
    var path = "/news" + SNM.qs({ category: category || "local", q: category || "business" });
    var data = await SNM.api(path);
    var items = data.articles || data.items || data.results || [];
    if (!Array.isArray(items)) items = [];
    if (!items.length) {
      box.innerHTML = "<p class=\"muted\">No headlines right now</p>";
      return;
    }
    box.innerHTML = items
      .map(function (a) {
        return (
          "<div class=\"card\"><strong>" +
          SNM.escapeHtml(a.title || "Story") +
          "</strong><div class=\"muted\">" +
          SNM.escapeHtml(a.source || a.publisher || "") +
          "</div><p class=\"muted\">" +
          SNM.escapeHtml(a.description || a.summary || "") +
          "</p></div>"
        );
      })
      .join("");
  } catch (e) {
    box.innerHTML = "<p class=\"muted\">" + SNM.escapeHtml(e.message || "News failed") + "</p>";
  }
};

SNM.bindTrust = function () {
  var fuPost = document.getElementById("btnFairlyPost");
  if (fuPost) fuPost.onclick = function () { SNM.postFairlyUsed(); };

  var co = document.getElementById("btnRunCheckout");
  if (co) co.onclick = function () { SNM.runCheckoutAssist(); };

  var rep = document.getElementById("btnSubmitReport");
  if (rep) rep.onclick = function () { SNM.submitReport(); };

  var rate = document.getElementById("btnSubmitRating");
  if (rate) rate.onclick = function () { SNM.submitRating(); };

  var adm = document.getElementById("btnAdminSend");
  if (adm) adm.onclick = function () { SNM.messageAdmin(); };

  document.querySelectorAll("[data-news-cat]").forEach(function (btn) {
    btn.onclick = function () {
      SNM.loadNews(btn.getAttribute("data-news-cat"));
    };
  });
};
