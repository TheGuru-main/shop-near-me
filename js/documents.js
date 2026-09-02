/* Shop Near Me — documents.js
   Receipts (free, download-oriented) + e-invoice / e-invoice++ (premium)
   APIs: /receipts · /e-invoices · /premium/...
*/
(function () {
  function el(id) {
    return document.getElementById(id);
  }

  function escapeHtml(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function money(n, cur) {
    if (n == null || n === "") return "—";
    var c = cur || "NGN";
    return c + " " + Number(n).toLocaleString();
  }

  function parseLinesFromForm() {
    var name = (el("doc-item-name") && el("doc-item-name").value.trim()) || "";
    var qty = parseFloat((el("doc-item-qty") && el("doc-item-qty").value) || "1");
    var price = parseFloat((el("doc-item-price") && el("doc-item-price").value) || "0");
    if (!name) return [];
    return [
      {
        name: name,
        qty: isNaN(qty) ? 1 : qty,
        unit_price: isNaN(price) ? 0 : price,
      },
    ];
  }

  SNM.loadReceipts = async function () {
    var box = el("receiptList") || el("documentsReceipts");
    if (!box) return;
    box.innerHTML = '<p class="muted">Loading receipts…</p>';
    try {
      var data = await SNM.api("/receipts", { method: "GET" });
      var items = (data && (data.items || data.receipts || data)) || [];
      if (!Array.isArray(items)) items = [];
      if (!items.length) {
        box.innerHTML = '<p class="muted">No receipts yet. Create one below.</p>';
        return;
      }
      box.innerHTML = items
        .map(function (r) {
          return (
            '<article class="feed-card">' +
            "<strong>" +
            escapeHtml(r.number || r.id) +
            "</strong>" +
            '<p class="meta">' +
            money(r.total, r.currency) +
            (r.customer_name
              ? " · " + escapeHtml(r.customer_name)
              : "") +
            "</p>" +
            '<p class="muted">Download only · not shareable cloud link</p>' +
            "</article>"
          );
        })
        .join("");
    } catch (e) {
      box.innerHTML =
        '<p class="err">' + escapeHtml(e.message || String(e)) + "</p>";
    }
  };

  SNM.createReceipt = async function () {
    var customer =
      (el("doc-customer") && el("doc-customer").value.trim()) || "";
    var lines = parseLinesFromForm();
    if (!lines.length) {
      SNM.toast("Add item name for receipt");
      return;
    }
    try {
      var rec = await SNM.api("/receipts", {
        method: "POST",
        body: {
          customer_name: customer,
          lines: lines,
          currency: "NGN",
        },
      });
      SNM.toast("Receipt " + (rec.number || "saved"));
      await SNM.loadReceipts();
    } catch (e) {
      SNM.toast(e.message || "Receipt failed");
    }
  };

  SNM.loadEInvoices = async function () {
    var box = el("einvoiceList") || el("documentsInvoices");
    if (!box) return;
    box.innerHTML = '<p class="muted">Loading e-invoices…</p>';
    try {
      var data = await SNM.api("/e-invoices", { method: "GET" });
      var items = (data && (data.items || data.invoices || data)) || [];
      if (!Array.isArray(items)) items = [];
      if (!items.length) {
        box.innerHTML =
          '<p class="muted">No e-invoices yet. Requires active e-invoice plan when capacity is enforced.</p>';
        return;
      }
      box.innerHTML = items
        .map(function (r) {
          var status = escapeHtml(r.status || "issued");
          return (
            '<article class="feed-card">' +
            "<strong>" +
            escapeHtml(r.number || r.id) +
            "</strong>" +
            '<p class="meta">' +
            money(r.total, r.currency) +
            " · " +
            status +
            "</p>" +
            '<p class="muted">' +
            escapeHtml(r.customer_name || "") +
            (r.kind === "e_invoice_pp" ? " · Invoice++" : " · E-Invoice") +
            "</p>" +
            "</article>"
          );
        })
        .join("");
    } catch (e) {
      box.innerHTML =
        '<p class="err">' + escapeHtml(e.message || String(e)) + "</p>";
    }
  };

  SNM.createEInvoice = async function (kind) {
    var customer =
      (el("doc-customer") && el("doc-customer").value.trim()) || "";
    var phone =
      (el("doc-customer-phone") && el("doc-customer-phone").value.trim()) ||
      null;
    var lines = parseLinesFromForm();
    if (!lines.length) {
      SNM.toast("Add at least one line item");
      return;
    }
    var k = kind === "e_invoice_pp" ? "e_invoice_pp" : "e_invoice";
    try {
      var inv = await SNM.api("/e-invoices", {
        method: "POST",
        body: {
          customer_name: customer,
          customer_phone: phone,
          lines: lines,
          currency: "NGN",
          kind: k,
        },
      });
      SNM.toast("E-invoice " + (inv.number || "created"));
      await SNM.loadEInvoices();
    } catch (e) {
      SNM.toast(e.message || "E-invoice failed — check premium capacity");
    }
  };

  SNM.openDocuments = function () {
    if (typeof SNM.showScreen === "function") {
      SNM.showScreen("documents");
    }
    SNM.loadReceipts();
    SNM.loadEInvoices();
  };

  SNM.bindDocuments = function () {
    var open = el("btnDocuments") || el("btnOpenDocuments");
    if (open) {
      open.onclick = function () {
        SNM.openDocuments();
      };
    }
    var rBtn = el("btnCreateReceipt");
    if (rBtn) {
      rBtn.onclick = function () {
        SNM.createReceipt();
      };
    }
    var iBtn = el("btnCreateEinvoice");
    if (iBtn) {
      iBtn.onclick = function () {
        SNM.createEInvoice("e_invoice");
      };
    }
    var ppBtn = el("btnCreateEinvoicePp");
    if (ppBtn) {
      ppBtn.onclick = function () {
        SNM.createEInvoice("e_invoice_pp");
      };
    }
    var refresh = el("btnRefreshDocuments");
    if (refresh) {
      refresh.onclick = function () {
        SNM.loadReceipts();
        SNM.loadEInvoices();
      };
    }
  };
})();
