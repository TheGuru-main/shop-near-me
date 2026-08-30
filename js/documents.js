window.SNM = window.SNM || {};

SNM.parseDocLines = function () {
  var raw = (document.getElementById("doc-lines").value || "").trim();
  if (!raw) return [];
  return raw.split("\n").map(function (line) {
    var p = line.split(",");
    return {
      name: (p[0] || "").trim(),
      qty: parseFloat(p[1]) || 1,
      unit_price: parseFloat(p[2]) || 0
    };
  }).filter(function (l) {
    return l.name;
  });
};

SNM.loadDocuments = async function () {
  var box = document.getElementById("docList");
  if (!box) return;
  box.innerHTML = "<p class='muted'>Loading…</p>";
  var parts = [];
  try {
    var inv = await SNM.api("/e-invoices");
    var rows = inv.items || [];
    parts.push("<h3>E-invoices</h3>");
    parts.push(
      rows.length
        ? rows
            .map(function (r) {
              return (
                '<div class="product-card"><div class="title">' +
                SNM.escapeHtml(r.number || r.id) +
                "</div><div class='meta'>" +
                SNM.escapeHtml(String(r.total || "")) +
                " " +
                SNM.escapeHtml(r.currency || "") +
                "</div></div>"
              );
            })
            .join("")
        : "<p class='muted'>None</p>"
    );
  } catch (e) {
    parts.push("<p class='muted'>Invoices: " + SNM.escapeHtml(e.message) + "</p>");
  }
  try {
    var rec = await SNM.api("/receipts");
    var rows2 = rec.items || [];
    parts.push("<h3>Receipts</h3>");
    parts.push(
      rows2.length
        ? rows2
            .map(function (r) {
              return (
                '<div class="product-card"><div class="title">' +
                SNM.escapeHtml(r.number || r.id) +
                "</div><div class='meta'>" +
                SNM.escapeHtml(String(r.total || "")) +
                "</div></div>"
              );
            })
            .join("")
        : "<p class='muted'>None</p>"
    );
  } catch (e2) {
    parts.push("<p class='muted'>Receipts: " + SNM.escapeHtml(e2.message) + "</p>");
  }
  box.innerHTML = parts.join("");
};

SNM.bindDocuments = function () {
  async function create(kind) {
    var lines = SNM.parseDocLines();
    if (!lines.length) return SNM.toast("Add lines: name,qty,price");
    var body = {
      customer_name: (document.getElementById("doc-customer").value || "").trim(),
      currency: (document.getElementById("doc-currency").value || "NGN").trim(),
      lines: lines
    };
    try {
      if (kind === "receipt") {
        await SNM.api("/receipts", { method: "POST", body: body });
      } else {
        body.kind = kind === "pp" ? "e_invoice_pp" : "e_invoice";
        await SNM.api("/e-invoices", { method: "POST", body: body });
      }
      SNM.toast("Created");
      SNM.loadDocuments();
    } catch (e) {
      SNM.toast(e.message || "Create failed");
    }
  }
  var a = document.getElementById("btnCreateInvoice");
  var b = document.getElementById("btnCreateInvoicePP");
  var c = document.getElementById("btnCreateReceipt");
  var r = document.getElementById("btnReloadDocs");
  if (a) a.onclick = function () {
    create("inv");
  };
  if (b) b.onclick = function () {
    create("pp");
  };
  if (c) c.onclick = function () {
    create("receipt");
  };
  if (r) r.onclick = function () {
    SNM.loadDocuments();
  };
};
