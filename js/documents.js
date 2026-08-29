window.SNM = window.SNM || {};

SNM.parseDocLines = function () {
  var raw = (document.getElementById("doc-lines").value || "").trim();
  if (!raw) return [];
  return raw
    .split("\n")
    .map(function (line) {
      var parts = line.split(",").map(function (s) {
        return s.trim();
      });
      return {
        name: parts[0] || "Item",
        qty: Number(parts[1]) || 1,
        unit_price: Number(parts[2]) || 0
      };
    })
    .filter(function (l) {
      return l.name;
    });
};

SNM.createEInvoice = async function (kind) {
  var body = {
    customer_name: (document.getElementById("doc-customer").value || "").trim(),
    customer_phone: null,
    lines: SNM.parseDocLines(),
    currency: (document.getElementById("doc-currency").value || "NGN").trim(),
    kind: kind === "e_invoice_pp" ? "e_invoice_pp" : "e_invoice"
  };
  if (!body.lines.length) {
    SNM.toast("Add at least one line: name,qty,price");
    return;
  }
  try {
    var res = await SNM.api("/e-invoices", { method: "POST", body: body });
    SNM.toast("E-invoice " + (res.number || "created"));
    SNM.loadDocuments();
  } catch (e) {
    SNM.toast(e.message || "E-invoice failed (premium capacity?)");
  }
};

SNM.createReceipt = async function () {
  var body = {
    customer_name: (document.getElementById("doc-customer").value || "").trim(),
    lines: SNM.parseDocLines(),
    currency: (document.getElementById("doc-currency").value || "NGN").trim()
  };
  if (!body.lines.length) {
    SNM.toast("Add at least one line");
    return;
  }
  try {
    var res = await SNM.api("/receipts", { method: "POST", body: body });
    SNM.toast("Receipt " + (res.number || "created") + " · download only");
    SNM.loadDocuments();
  } catch (e) {
    SNM.toast(e.message || "Receipt failed");
  }
};

SNM.loadDocuments = async function () {
  var box = document.getElementById("docList");
  if (!box) return;
  box.innerHTML = "<p class=\"muted\">Loading documents…</p>";
  var html = [];

  try {
    var inv = await SNM.api("/e-invoices");
    var items = inv.items || inv.results || inv || [];
    if (!Array.isArray(items)) items = [];
    html.push("<h3>E-invoices</h3>");
    if (!items.length) html.push("<p class=\"muted\">None yet</p>");
    items.forEach(function (r) {
      html.push(
        "<div class=\"card\"><strong>" +
          SNM.escapeHtml(r.number || r.id || "INV") +
          "</strong>" +
          "<div class=\"muted\">" +
          SNM.escapeHtml(String(r.total != null ? r.total : "") + " " + (r.currency || "")) +
          "</div></div>"
      );
    });
  } catch (e) {
    html.push(
      "<p class=\"muted\">E-invoices: " + SNM.escapeHtml(e.message || "unavailable") + "</p>"
    );
  }

  try {
    var rec = await SNM.api("/receipts");
    var rows = rec.items || rec.results || rec || [];
    if (!Array.isArray(rows)) rows = [];
    html.push("<h3>Receipts</h3>");
    if (!rows.length) html.push("<p class=\"muted\">None yet</p>");
    rows.forEach(function (r) {
      html.push(
        "<div class=\"card\"><strong>" +
          SNM.escapeHtml(r.number || r.id || "RC") +
          "</strong>" +
          "<div class=\"muted\">" +
          SNM.escapeHtml(String(r.total != null ? r.total : "") + " " + (r.currency || "")) +
          " · phone only</div></div>"
      );
    });
  } catch (e) {
    html.push(
      "<p class=\"muted\">Receipts: " + SNM.escapeHtml(e.message || "unavailable") + "</p>"
    );
  }

  box.innerHTML = html.join("");
};

SNM.bindDocuments = function () {
  var inv = document.getElementById("btnCreateInvoice");
  if (inv) {
    inv.onclick = function () {
      SNM.createEInvoice("e_invoice");
    };
  }
  var invpp = document.getElementById("btnCreateInvoicePP");
  if (invpp) {
    invpp.onclick = function () {
      SNM.createEInvoice("e_invoice_pp");
    };
  }
  var rc = document.getElementById("btnCreateReceipt");
  if (rc) {
    rc.onclick = function () {
      SNM.createReceipt();
    };
  }
  var reload = document.getElementById("btnReloadDocs");
  if (reload) {
    reload.onclick = function () {
      SNM.loadDocuments();
    };
  }
};
