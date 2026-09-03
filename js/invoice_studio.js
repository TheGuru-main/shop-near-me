window.SNM = window.SNM || {};

SNM.issueStudioInvoice = async function () {
  var kind = document.getElementById("inv-kind")?.value || "e_invoice";
  var name = (document.getElementById("doc-item-name")?.value || "").trim();
  var qty = parseFloat(document.getElementById("doc-item-qty")?.value || "1");
  var price = parseFloat(document.getElementById("doc-item-price")?.value || "0");
  if (!name) {
    SNM.toast("Fill document item fields first (Documents screen)");
    SNM.showScreen("documents");
    return;
  }
  try {
    await SNM.api("/e-invoices", {
      method: "POST",
      body: {
        customer_name: (document.getElementById("doc-customer")?.value || "").trim(),
        customer_phone: (document.getElementById("doc-customer-phone")?.value || "").trim(),
        lines: [
          {
            name: name,
            qty: isNaN(qty) ? 1 : qty,
            unit_price: isNaN(price) ? 0 : price
          }
        ],
        currency: "NGN",
        kind: kind
      }
    });
    SNM.toast("Invoice issued");
    SNM.showScreen("documents");
    if (typeof SNM.loadEInvoices === "function") SNM.loadEInvoices();
  } catch (err) {
    SNM.toast(err.message || "Issue failed");
  }
};

SNM.bindInvoiceStudio = function () {
  document.getElementById("btnInvIssue")?.addEventListener("click", function () {
    SNM.issueStudioInvoice();
  });
};
