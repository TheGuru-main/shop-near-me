window.SNM = window.SNM || {};

function money(n) {
  var x = Number(n);
  if (isNaN(x)) return "—";
  return x.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function docLinesFromForm() {
  var name = (document.getElementById("doc-item-name")?.value || "").trim();
  var qty = parseFloat(document.getElementById("doc-item-qty")?.value || "1");
  var price = parseFloat(document.getElementById("doc-item-price")?.value || "0");
  if (!name) return [];
  return [
    {
      name: name,
      qty: isNaN(qty) ? 1 : qty,
      unit_price: isNaN(price) ? 0 : price
    }
  ];
}

SNM.loadDocuments = async function () {
  await Promise.all([SNM.loadReceipts(), SNM.loadEInvoices()]);
};

SNM.loadReceipts = async function () {
  var list = document.getElementById("receiptList");
  if (!list) return;
  list.innerHTML = "<p class='muted'>Loading receipts…</p>";
  try {
    var data = await SNM.api("/receipts");
    var rows = data.items || data.results || [];
    if (!rows.length) {
      list.innerHTML = "<p class='muted'>No receipts yet.</p>";
      return;
    }
    list.innerHTML = rows
      .map(function (r) {
        return (
          '<article class="product-card">' +
          '<div class="title">' +
          (r.number || r.id) +
          "</div>" +
          '<div class="meta">' +
          money(r.total) +
          " " +
          (r.currency || "") +
          "</div>" +
          "</article>"
        );
      })
      .join("");
  } catch (err) {
    list.innerHTML =
      "<p class='error show'>" + (err.message || "Receipts failed") + "</p>";
  }
};

SNM.loadEInvoices = async function () {
  var list = document.getElementById("einvoiceList");
  if (!list) return;
  list.innerHTML = "<p class='muted'>Loading e-invoices…</p>";
  try {
    var data = await SNM.api("/e-invoices");
    var rows = data.items || data.results || [];
    if (!rows.length) {
      list.innerHTML = "<p class='muted'>No e-invoices yet.</p>";
      return;
    }
    list.innerHTML = rows
      .map(function (r) {
        return (
          '<article class="product-card">' +
          '<div class="title">' +
          (r.number || r.id) +
          "</div>" +
          '<div class="meta">' +
          money(r.total) +
          " " +
          (r.currency || "") +
          (r.kind ? " · " + r.kind : "") +
          "</div>" +
          "</article>"
        );
      })
      .join("");
  } catch (err) {
    list.innerHTML =
      "<p class='error show'>" + (err.message || "E-invoices failed") + "</p>";
  }
};

SNM.bindDocuments = function () {
  document.getElementById("btnCreateReceipt")?.addEventListener("click", async function () {
    var lines = docLinesFromForm();
    if (!lines.length) return SNM.toast("Enter item name");
    try {
      await SNM.api("/receipts", {
        method: "POST",
        body: {
          customer_name: (document.getElementById("doc-customer")?.value || "").trim(),
          lines: lines,
          currency: "NGN"
        }
      });
      SNM.toast("Receipt created (device download / list)");
      SNM.loadReceipts();
    } catch (err) {
      SNM.toast(err.message || "Receipt failed");
    }
  });

  document.getElementById("btnCreateEinvoice")?.addEventListener("click", async function () {
    var lines = docLinesFromForm();
    if (!lines.length) return SNM.toast("Enter item name");
    try {
      await SNM.api("/e-invoices", {
        method: "POST",
        body: {
          customer_name: (document.getElementById("doc-customer")?.value || "").trim(),
          customer_phone: (document.getElementById("doc-customer-phone")?.value || "").trim(),
          lines: lines,
          currency: "NGN",
          kind: "e_invoice"
        }
      });
      SNM.toast("E-Invoice created");
      SNM.loadEInvoices();
    } catch (err) {
      SNM.toast(err.message || "E-Invoice failed — check premium capacity");
    }
  });

  document.getElementById("btnCreateEinvoicePp")?.addEventListener("click", async function () {
    var lines = docLinesFromForm();
    if (!lines.length) return SNM.toast("Enter item name");
    try {
      await SNM.api("/e-invoices", {
        method: "POST",
        body: {
          customer_name: (document.getElementById("doc-customer")?.value || "").trim(),
          customer_phone: (document.getElementById("doc-customer-phone")?.value || "").trim(),
          lines: lines,
          currency: "NGN",
          kind: "e_invoice_pp"
        }
      });
      SNM.toast("E-Invoice++ created");
      SNM.loadEInvoices();
    } catch (err) {
      SNM.toast(err.message || "E-Invoice++ failed");
    }
  });
};
