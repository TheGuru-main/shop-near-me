window.SNM = window.SNM || {};

SNM.loadFairlyUsed = async function () {
  var box = document.getElementById("fairlyFeed");
  if (!box) return;
  box.innerHTML = "<p class='muted'>Loading…</p>";
  try {
    var data = await SNM.api("/fairly-used");
    var rows = data.items || data.posts || data || [];
    if (!Array.isArray(rows)) rows = [];
    box.innerHTML = rows.length
      ? rows
          .map(function (p) {
            return (
              '<div class="product-card"><div class="title">' +
              SNM.escapeHtml(p.title || "Post") +
              "</div><div class='meta'>" +
              SNM.escapeHtml(p.body || "") +
              (p.price != null ? " · ₦" + p.price : "") +
              "</div></div>"
            );
          })
          .join("")
      : "<p class='muted'>No posts yet.</p>";
  } catch (e) {
    box.innerHTML = "<p class='muted'>" + SNM.escapeHtml(e.message) + "</p>";
  }
};

SNM.loadBanqueue = async function () {
  var box = document.getElementById("banqueueList");
  if (!box) return;
  box.innerHTML = "<p class='muted'>Loading…</p>";
  try {
    var data = await SNM.api("/banqueue/locations");
    var rows = data.items || data.locations || data || [];
    if (!Array.isArray(rows)) rows = [];
    box.innerHTML = rows.length
      ? rows.map(function (x) {
          return (
            '<div class="product-card"><div class="title">' +
            SNM.escapeHtml(x.name || x.title || "Location") +
            "</div></div>"
          );
        }).join("")
      : "<p class='muted'>No banqueue locations yet.</p>";
  } catch (e) {
    box.innerHTML = "<p class='muted'>" + SNM.escapeHtml(e.message) + "</p>";
  }
};

SNM.loadEmergency = async function () {
  var box = document.getElementById("emergencyList");
  if (!box) return;
  box.innerHTML = "<p class='muted'>Loading…</p>";
  try {
    var data = await SNM.api("/emergency/nearby");
    var rows = data.items || data.units || data || [];
    if (!Array.isArray(rows)) rows = [];
    box.innerHTML = rows.length
      ? rows.map(function (x) {
          return (
            '<div class="product-card"><div class="title">' +
            SNM.escapeHtml(x.name || x.unit_type || "Unit") +
            "</div><div class='meta'>" +
            SNM.escapeHtml(x.primary_location || x.phone || "") +
            "</div></div>"
          );
        }).join("")
      : "<p class='muted'>No emergency units nearby.</p>";
  } catch (e) {
    box.innerHTML = "<p class='muted'>" + SNM.escapeHtml(e.message) + "</p>";
  }
};

SNM.loadNews = async function (cat) {
  var box = document.getElementById("newsFeed");
  if (!box) return;
  box.innerHTML = "<p class='muted'>Loading news…</p>";
  try {
    var data = await SNM.api("/news" + SNM.qs({ category: cat || "local" }));
    var rows = data.articles || data.items || [];
    box.innerHTML = rows.length
      ? rows
          .map(function (a) {
            return (
              '<div class="product-card"><div class="title">' +
              SNM.escapeHtml(a.title || "Story") +
              "</div><div class='meta'>" +
              SNM.escapeHtml(a.source || a.description || "") +
              "</div></div>"
            );
          })
          .join("")
      : "<p class='muted'>No headlines.</p>";
  } catch (e) {
    box.innerHTML = "<p class='muted'>" + SNM.escapeHtml(e.message) + "</p>";
  }
};

SNM.bindTrust = function () {
  var post = document.getElementById("btnFairlyPost");
  if (post) {
    post.onclick = async function () {
      var title = (document.getElementById("fu-title").value || "").trim();
      var body = (document.getElementById("fu-body").value || "").trim();
      var price = parseFloat(document.getElementById("fu-price").value);
      if (!title) return SNM.toast("Title required");
      try {
        await SNM.api("/fairly-used", {
          method: "POST",
          body: {
            title: title,
            body: body,
            price: isNaN(price) ? null : price
          }
        });
        SNM.toast("Posted");
        SNM.loadFairlyUsed();
      } catch (e) {
        SNM.toast(e.message || "Post failed");
      }
    };
  }

  document.querySelectorAll("[data-news-cat]").forEach(function (b) {
    b.onclick = function () {
      SNM.loadNews(b.getAttribute("data-news-cat"));
    };
  });

  var rep = document.getElementById("btnSubmitReport");
  if (rep) {
    rep.onclick = async function () {
      try {
        await SNM.api("/reports", {
          method: "POST",
          body: {
            target_phone: (document.getElementById("rep-target").value || "").trim(),
            reason: (document.getElementById("rep-reason").value || "").trim()
          }
        });
        SNM.toast("Report submitted");
      } catch (e) {
        SNM.toast(e.message || "Report failed");
      }
    };
  }

  var rate = document.getElementById("btnSubmitRating");
  if (rate) {
    rate.onclick = async function () {
      try {
        await SNM.api("/ratings", {
          method: "POST",
          body: {
            target_phone: (document.getElementById("rate-target").value || "").trim(),
            score: parseInt(document.getElementById("rate-score").value, 10),
            note: (document.getElementById("rate-note").value || "").trim()
          }
        });
        SNM.toast("Rating saved");
      } catch (e) {
        SNM.toast(e.message || "Rating failed");
      }
    };
  }

  var adm = document.getElementById("btnAdminSend");
  if (adm) {
    adm.onclick = async function () {
      try {
        await SNM.api("/admin/contact", {
          method: "POST",
          body: { message: (document.getElementById("admin-msg").value || "").trim() }
        });
        SNM.toast("Sent to admin");
      } catch (e) {
        SNM.toast(e.message || "Send failed");
      }
    };
  }

  var co = document.getElementById("btnRunCheckout");
  if (co) {
    co.onclick = async function () {
      var out = document.getElementById("checkoutResult");
      try {
        var data = await SNM.api("/checkout/assist", {
          method: "POST",
          body: {
            item_name: (document.getElementById("co-item").value || "").trim(),
            qty: parseFloat(document.getElementById("co-qty").value) || 1,
            bulky: !!(document.getElementById("co-bulky") || {}).checked,
            pay_on_delivery: !!(document.getElementById("co-pod") || {}).checked
          }
        });
        if (out) {
          out.innerHTML =
            '<div class="product-card"><pre style="white-space:pre-wrap;font-size:0.85rem">' +
            SNM.escapeHtml(JSON.stringify(data, null, 2)) +
            "</pre></div>";
        }
      } catch (e) {
        SNM.toast(e.message || "Assist failed");
      }
    };
  }
};
