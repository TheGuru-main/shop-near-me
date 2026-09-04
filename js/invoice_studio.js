// js/invoice_studio.js
window.SNM = window.SNM || {};
SNM.bindInvoiceStudio = function () {
  var btn = document.getElementById("btnInvIssue");
  if (!btn) return;
  btn.onclick = function () {
    var kind = (document.getElementById("inv-kind") || {}).value || "e_invoice";
    SNM.go("documents");
    setTimeout(function () {
      if (kind === "e_invoice_pp") document.getElementById("btnCreateEinvoicePp").click();
      else document.getElementById("btnCreateEinvoice").click();
    }, 200);
  };
};
