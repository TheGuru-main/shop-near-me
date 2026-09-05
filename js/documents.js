window.SNM = window.SNM || {};

SNM.loadReceipts = async function () {
  var el = document.getElementById("receiptList");
  if (!el) return;
  el.innerHTML = "<p class='muted'>Loading receipts…</p>";
  try {
    var data = await SNM.api("/receipts");
    var items =
      (data && (data.items || data.results)) ||
      (Array.isArray(data) ? data : []);
    if (!items.length) {
      el.innerHTML = "<p class='muted'>No receipts yet.</p>";
      return;
    }
    el.innerHTML = items
      .map(function (r) {
        return (
          '<article class="card">' +
          "<strong>" +
          SNM.esc(r.number || r.id || "Receipt") +
          "</strong>" +
          "<p class='muted small'>" +
          SNM.esc(String(r.total != null ? r.total : "")) +
          " " +
          SNM.esc(r.currency || "NGN") +
          (r.created_at ? " · " + SNM.esc(r.created_at) : "") +
          "</p>" +
          "<p class='muted small'>Download only · not shareable</p>" +
          "</article>"
        );
      })
      .join("");
  } catch (e) {
    el.innerHTML =
      "<p class='muted'>Receipts: " + SNM.esc((e && e.message) || "error") + "</p>";
  }
};

SNM.loadEinvoices = async function () {
  var el = document.getElementById("einvoiceList");
  if (!el) return;
  el.innerHTML = "<p class='muted'>Loading e-invoices…</p>";
  try {
    var data = await SNM.api("/e-invoices");
    var items =
      (data && (data.items || data.results)) ||
      (Array.isArray(data) ? data : []);
    if (!items.length) {
      el.innerHTML = "<p class='muted'>No e-invoices yet. Premium capacity required.</p>";
      return;
    }
    el.innerHTML = items
      .map(function (r) {
        return (
          '<article class="card">' +
          "<strong>" +
          SNM.esc(r.number || r.id || "E-Invoice") +
          "</strong>" +
          "<p class='muted small'>" +
          SNM.esc(String(r.total != null ? r.total : "")) +
          " " +
          SNM.esc(r.currency || "NGN") +
          (r.kind ? " · " + SNM.esc(r.kind) : "") +
          "</p></article>"
        );
      })
      .join("");
  } catch (e) {
    el.innerHTML =
      "<p class='muted'>E-invoices: " +
      SNM.esc((e && e.message) || "premium / error") +
      "</p>";
  }
};

SNM.createReceipt = async function () {
  var customer = ((document.getElementById("doc-customer") || {}).value || "").trim();
  var phone = ((document.getElementById("doc-customer-phone") || {}).value || "").trim();
  var name = ((document.getElementById("doc-item-name") || {}).value || "").trim();
  var qty = parseFloat(((document.getElementById("doc-item-qty") || {}).value || "1").trim()) || 1;
  var price = parseFloat(((document.getElementById("doc-item-price") || {}).value || "0").trim()) || 0;
  if (!name) {
    alert("Item name required.");
    return;
  }
  try {
    await SNM.api("/receipts", {
      method: "POST",
      body: {
        customer_name: customer,
        customer_phone: phone || null,
        lines: [{ name: name, qty: qty, unit_price: price }],
        currency: "NGN"
      }
    });
    await SNM.loadReceipts();
    alert("Receipt created (device download path · free monthly cap on API).");
  } catch (e) {
    alert("Receipt failed: " + ((e && e.message) || ""));
  }
};

SNM.createEinvoice = async function (kind) {
  kind = kind || "e_invoice";
  var customer = ((document.getElementById("doc-customer") || {}).value || "").trim();
  var phone = ((document.getElementById("doc-customer-phone") || {}).value || "").trim();
  var name = ((document.getElementById("doc-item-name") || {}).value || "").trim();
  var qty = parseFloat(((document.getElementById("doc-item-qty") || {}).value || "1").trim()) || 1;
  var price = parseFloat(((document.getElementById("doc-item-price") || {}).value || "0").trim()) || 0;
  if (!name) {
    alert("Item name required.");
    return;
  }
  try {
    await SNM.api("/e-invoices", {
      method: "POST",
      body: {
        customer_name: customer,
        customer_phone: phone || null,
        lines: [{ name: name, qty: qty, unit_price: price }],
        currency: "NGN",
        kind: kind
      }
    });
    await SNM.loadEinvoices();
    alert("E-invoice created.");
  } catch (e) {
    var msg = (e && e.message) || "";
    if (/premium|subscri|capacity|403|402/i.test(String(msg + (e && e.status)))) {
      alert("E-invoice requires an active premium plan. Open Premium to subscribe.");
      SNM.showScreen("premium");
      if (typeof SNM.loadPremium === "function") SNM.loadPremium();
      return;
    }
    alert("E-invoice failed: " + msg);
  }
};

SNM.loadDocuments = async function () {
  await SNM.loadReceipts();
  await SNM.loadEinvoices();
};

SNM.bindDocuments = function () {
  var r = document.getElementById("btnCreateReceipt");
  if (r) r.onclick = function () { SNM.createReceipt(); };

  var e = document.getElementById("btnCreateEinvoice");
  if (e) e.onclick = function () { SNM.createEinvoice("e_invoice"); };

  var pp = document.getElementById("btnCreateEinvoicePp");
  if (pp) pp.onclick = function () { SNM.createEinvoice("e_invoice_pp"); };
};

SNM.onDocumentsEnter = function () {
  SNM.loadDocuments();
};
