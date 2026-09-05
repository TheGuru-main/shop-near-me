window.SNM = window.SNM || {};

SNM.issueStudioInvoice = async function () {
  var kind = ((document.getElementById("inv-kind") || {}).value || "e_invoice").trim();
  var customer = ((document.getElementById("inv-customer") || {}).value || "").trim();
  var phone = ((document.getElementById("inv-customer-phone") || {}).value || "").trim();
  var name = ((document.getElementById("inv-item-name") || {}).value || "").trim();
  var qty = parseFloat(((document.getElementById("inv-item-qty") || {}).value || "1").trim()) || 1;
  var price = parseFloat(((document.getElementById("inv-item-price") || {}).value || "0").trim()) || 0;
  var notes = ((document.getElementById("inv-notes") || {}).value || "").trim();

  if (!name) {
    alert("Line item name required.");
    return;
  }

  try {
    var data = await SNM.api("/e-invoices", {
      method: "POST",
      body: {
        customer_name: customer,
        customer_phone: phone || null,
        lines: [{ name: name, qty: qty, unit_price: price }],
        currency: "NGN",
        kind: kind === "e_invoice_pp" ? "e_invoice_pp" : "e_invoice",
        notes: notes
      }
    });
    var status = document.getElementById("invStatus");
    if (status) {
      status.textContent =
        "Issued " + (data && (data.number || data.id) || "") +
        " · total " + (data && data.total != null ? data.total : "");
    }
    if (typeof SNM.loadEinvoices === "function") await SNM.loadEinvoices();
  } catch (e) {
    var msg = (e && e.message) || "";
    if (/premium|subscri|capacity|403|402/i.test(String(msg + (e && e.status)))) {
      alert("Invoice studio needs premium e-invoice capacity.");
      SNM.showScreen("premium");
      if (typeof SNM.loadPremium === "function") SNM.loadPremium();
      return;
    }
    alert("Issue failed: " + msg);
  }
};

SNM.bindInvoiceStudio = function () {
  var btn = document.getElementById("btnInvIssue");
  if (btn) {
    btn.onclick = function () {
      SNM.issueStudioInvoice();
    };
  }
};
