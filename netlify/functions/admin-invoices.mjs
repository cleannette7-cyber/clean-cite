import { getStore } from "@netlify/blobs";
import { getUser } from "@netlify/identity";

const ADMIN_EMAIL = String(process.env.CLEAN_CITE_ADMIN_EMAIL || "cleannette7@gmail.com").trim().toLowerCase();
const COMPANY = {
  name: "Clean-Cité",
  address: "149 rue de Paris, 93000 Bobigny",
  phone: "07 66 53 61 54",
  email: "cleannette7@gmail.com",
  siret: "989 248 554 00010",
  siren: "989248554",
};

const clean = (v, n = 1000) => String(v ?? "").trim().slice(0, n);
const validEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean(v, 254));
const esc = (v) => clean(v, 5000)
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;");
const euro = (n) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(Number(n) || 0);

function json(status, data) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

async function requireAdmin() {
  const user = await getUser();
  if (!user) return { ok: false, response: json(401, { error: "Connexion administrateur requise." }) };
  const email = String(user.email || "").trim().toLowerCase();
  if (email !== ADMIN_EMAIL) return { ok: false, response: json(403, { error: "Accès administrateur refusé." }) };
  return { ok: true, user };
}

function normalize(i) {
  const lines = (Array.isArray(i.lines) ? i.lines : []).slice(0, 30).map((l) => ({
    description: clean(l.description, 500),
    quantity: Number(l.quantity) || 0,
    unit: clean(l.unit, 80),
    unitPrice: Number(l.unitPrice) || 0,
  }));
  const subtotal = lines.reduce((sum, l) => sum + l.quantity * l.unitPrice, 0);
  const discountPercent = Math.max(0, Math.min(100, Number(i.discountPercent) || 0));
  const discount = subtotal * discountPercent / 100;
  const ht = Math.max(0, subtotal - discount);
  const vatRate = Math.max(0, Math.min(100, Number(i.vatRate) || 0));
  const vat = ht * vatRate / 100;
  const ttc = ht + vat;
  const paid = Math.max(0, Math.min(ttc, Number(i.amountPaid) || 0));
  return {
    invoiceNumber: clean(i.invoiceNumber, 80),
    sourceQuoteNumber: clean(i.sourceQuoteNumber, 80),
    invoiceDate: clean(i.invoiceDate, 20),
    serviceDate: clean(i.serviceDate, 20),
    dueDate: clean(i.dueDate, 20),
    clientType: i.clientType === "consumer" ? "consumer" : "business",
    client: {
      name: clean(i.client?.name, 200),
      phone: clean(i.client?.phone, 80),
      email: clean(i.client?.email, 254),
      siren: clean(i.client?.siren, 9).replace(/\D/g, ""),
      vatNumber: clean(i.client?.vatNumber, 40),
      address: clean(i.client?.address, 300),
      postal: clean(i.client?.postal, 20),
      city: clean(i.client?.city, 160),
    },
    operationCategory: "Prestation de services",
    vatRate,
    vatOnDebits: !!i.vatOnDebits,
    vatExemption: clean(i.vatExemption, 300),
    paymentMethod: clean(i.paymentMethod, 100),
    discountPercent,
    quoteDepositPercent: Math.max(0, Math.min(100, Number(i.quoteDepositPercent) || 0)),
    quoteDepositAmount: Math.max(0, Number(i.quoteDepositAmount) || 0),
    amountPaid: paid,
    lines,
    notes: clean(i.notes, 5000),
    paymentTerms: clean(i.paymentTerms, 5000),
    companyBank: {
      holder: clean(i.companyBank?.holder, 160),
      bank: clean(i.companyBank?.bank, 160),
      iban: clean(i.companyBank?.iban, 80),
      bic: clean(i.companyBank?.bic, 40),
    },
    totals: {
      subtotal,
      discount,
      ht,
      vat,
      ttc,
      balance: Math.max(0, ttc - paid),
    },
    status: paid >= ttc && ttc > 0 ? "paid" : "due",
  };
}

function validate(i) {
  if (!i.client.name) return "Nom / société client obligatoire.";
  if (!i.client.address || !i.client.city) return "Adresse et ville du client obligatoires.";
  if (!i.invoiceDate || !i.serviceDate || !i.dueDate) return "Dates obligatoires manquantes.";
  if (!i.lines.length || i.lines.some((l) => !l.description || !(l.quantity > 0) || l.unitPrice < 0)) return "Lignes de facture invalides.";
  if (i.vatRate === 0 && !i.vatExemption) return "Mention de TVA à 0 % obligatoire.";
  if (i.clientType === "business" && i.client.siren && i.client.siren.length !== 9) return "SIREN client invalide.";
  return "";
}

async function nextNumber(store, year) {
  const key = `sequence/${year}`;
  for (let k = 0; k < 10; k++) {
    const cur = await store.getWithMetadata(key, { type: "json", consistency: "strong" });
    if (!cur) {
      const r = await store.setJSON(key, { last: 1 }, { onlyIfNew: true });
      if (r.modified) return `F-${year}-0001`;
      continue;
    }
    const last = Number(cur.data?.last) || 0;
    const next = last + 1;
    const r = await store.setJSON(key, { last: next }, { onlyIfMatch: cur.etag });
    if (r.modified) return `F-${year}-${String(next).padStart(4, "0")}`;
  }
  throw new Error("Impossible d’attribuer un numéro de facture. Réessaie.");
}

function emailContent(p) {
  const rows = p.lines.map((l) => `<tr><td style="padding:9px;border-bottom:1px solid #e5e7eb">${esc(l.description)}</td><td style="padding:9px;text-align:right;border-bottom:1px solid #e5e7eb">${l.quantity}</td><td style="padding:9px;border-bottom:1px solid #e5e7eb">${esc(l.unit)}</td><td style="padding:9px;text-align:right;border-bottom:1px solid #e5e7eb">${euro(l.unitPrice)}</td><td style="padding:9px;text-align:right;border-bottom:1px solid #e5e7eb;font-weight:700">${euro(l.quantity * l.unitPrice)}</td></tr>`).join("");
  const subject = `Facture Clean-Cité ${p.invoiceNumber} — ${p.client.name}`;
  const html = `<div style="font-family:Arial,sans-serif;max-width:780px;margin:auto;color:#172033"><div style="background:#0B2447;color:white;padding:22px;border-radius:16px 16px 0 0"><div style="color:#e8c780;font-weight:800">CLEAN-CITÉ</div><h1 style="margin:5px 0">Facture ${esc(p.invoiceNumber)}</h1></div><div style="border:1px solid #dfe5ee;padding:24px"><p>Bonjour <strong>${esc(p.client.name)}</strong>,</p><p>Veuillez trouver votre facture Clean-Cité.</p><p><b>Date :</b> ${esc(p.invoiceDate)} · <b>Échéance :</b> ${esc(p.dueDate)}${p.sourceQuoteNumber ? ` · <b>Devis d’origine :</b> ${esc(p.sourceQuoteNumber)}` : ""}</p><table style="width:100%;border-collapse:collapse"><thead><tr style="background:#0B2447;color:white"><th style="padding:9px;text-align:left">Désignation</th><th>Qté</th><th>Unité</th><th>PU HT</th><th>Total HT</th></tr></thead><tbody>${rows}</tbody></table><div style="margin:20px 0 0 auto;max-width:360px"><p><b>Sous-total HT :</b> ${euro(p.totals.subtotal ?? p.totals.ht)}</p>${p.discountPercent ? `<p><b>Remise ${p.discountPercent}% :</b> -${euro(p.totals.discount || 0)}</p>` : ""}<p><b>Total HT :</b> ${euro(p.totals.ht)}</p><p><b>TVA ${p.vatRate}% :</b> ${euro(p.totals.vat)}</p><p style="background:#0B2447;color:white;padding:12px"><b>Total TTC : ${euro(p.totals.ttc)}</b></p><p><b>Reste à payer :</b> ${euro(p.totals.balance)}</p></div>${p.vatRate === 0 ? `<p><b>${esc(p.vatExemption)}</b></p>` : ""}${p.companyBank?.iban ? `<div style="margin-top:16px;padding:12px;background:#f7f9fc;border-radius:10px"><b>Coordonnées bancaires</b><br>${esc(p.companyBank.holder || COMPANY.name)}${p.companyBank.bank ? ` · ${esc(p.companyBank.bank)}` : ""}<br>IBAN : ${esc(p.companyBank.iban)}${p.companyBank.bic ? `<br>BIC : ${esc(p.companyBank.bic)}` : ""}</div>` : ""}<p>${esc(p.paymentTerms).replace(/\n/g, "<br>")}</p><p style="font-size:12px;color:#667085">${COMPANY.name} · ${COMPANY.address} · SIRET ${COMPANY.siret} · ${COMPANY.email}</p></div></div>`;
  const text = `Facture ${p.invoiceNumber}\nClient : ${p.client.name}\nTotal TTC : ${euro(p.totals.ttc)}\nReste à payer : ${euro(p.totals.balance)}\nÉchéance : ${p.dueDate}\n\n${COMPANY.name} - ${COMPANY.phone}`;
  return { subject, html, text };
}

async function sendBrevo(p) {
  if (!process.env.BREVO_API_KEY) throw new Error("BREVO_API_KEY n’est pas configurée dans Netlify.");
  if (!validEmail(p.client.email)) throw new Error("E-mail client manquant ou invalide.");
  const c = emailContent(p);
  const senderEmail = process.env.BREVO_SENDER_EMAIL || COMPANY.email;
  const body = {
    sender: { email: senderEmail, name: "Clean-Cité" },
    to: [{ email: p.client.email, name: p.client.name }],
    bcc: [{ email: COMPANY.email, name: "Clean-Cité" }],
    subject: c.subject,
    htmlContent: c.html,
    textContent: c.text,
    replyTo: { email: COMPANY.email, name: "Clean-Cité" },
  };
  const r = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "Content-Type": "application/json", "api-key": process.env.BREVO_API_KEY },
    body: JSON.stringify(body),
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.message || "Erreur Brevo");
  return d;
}

export default async function handler(req) {
  if (req.method !== "POST") return json(405, { error: "Méthode non autorisée." });

  try {
    const authorization = await requireAdmin();
    if (!authorization.ok) return authorization.response;

    let b = {};
    try {
      b = await req.json();
    } catch {
      return json(400, { error: "JSON invalide." });
    }

    // IMPORTANT : getStore est créé à l'intérieur d'une Function v2.
    // Netlify injecte alors automatiquement le contexte Blobs (siteID + token).
    const store = getStore({ name: "clean-cite-invoices", consistency: "strong" });

    if (b.action === "health") {
      await store.list({ prefix: "invoices/" });
      return json(200, { ok: true, storage: "netlify-blobs-v2" });
    }

    if (b.action === "finalize") {
      const p = normalize(b.invoice || {});
      const err = validate(p);
      if (err) return json(400, { error: err });
      const year = (p.invoiceDate || new Date().toISOString()).slice(0, 4);
      p.invoiceNumber = await nextNumber(store, year);
      p.createdAt = new Date().toISOString();
      p.createdBy = ADMIN_EMAIL;
      const wr = await store.setJSON(`invoices/${p.invoiceNumber}`, p, { onlyIfNew: true });
      if (!wr.modified) throw new Error("Numéro de facture déjà utilisé.");
      return json(200, { invoice: p });
    }

    if (b.action === "update") {
      const requested = normalize(b.invoice || {});
      const n = clean(requested.invoiceNumber, 80);
      if (!n) return json(400, { error: "Numéro de facture manquant." });
      const key = `invoices/${n}`;
      const current = await store.getWithMetadata(key, { type: "json", consistency: "strong" });
      if (!current?.data) return json(404, { error: "Facture introuvable." });
      const err = validate(requested);
      if (err) return json(400, { error: err });
      if (current.data.invoiceNumber !== n) return json(409, { error: "Numéro de facture incohérent." });
      const now = new Date().toISOString();
      const snapshotKey = `invoice-history/${n}/${now.replace(/[:.]/g, "-")}`;
      await store.setJSON(snapshotKey, current.data);
      requested.invoiceNumber = n;
      requested.createdAt = current.data.createdAt || now;
      requested.createdBy = current.data.createdBy || ADMIN_EMAIL;
      requested.updatedAt = now;
      requested.updatedBy = ADMIN_EMAIL;
      requested.revision = (Number(current.data.revision) || 0) + 1;
      requested.lastSentAt = current.data.lastSentAt || null;
      requested.sentCount = Number(current.data.sentCount) || 0;
      const wr = await store.setJSON(key, requested, { onlyIfMatch: current.etag });
      if (!wr.modified) return json(409, { error: "La facture a été modifiée ailleurs. Recharge-la puis réessaie." });
      return json(200, { invoice: requested });
    }

    if (b.action === "get") {
      const n = clean(b.invoiceNumber, 80);
      const p = await store.get(`invoices/${n}`, { type: "json", consistency: "strong" });
      if (!p) return json(404, { error: "Facture introuvable." });
      return json(200, { invoice: p });
    }

    if (b.action === "list") {
      const { blobs } = await store.list({ prefix: "invoices/" });
      const recent = blobs.slice(-50).reverse();
      const invoices = [];
      for (const x of recent) {
        const p = await store.get(x.key, { type: "json" });
        if (p) invoices.push({
          invoiceNumber: p.invoiceNumber,
          sourceQuoteNumber: p.sourceQuoteNumber || "",
          invoiceDate: p.invoiceDate,
          clientName: p.client?.name,
          totalTtc: p.totals?.ttc,
          balance: p.totals?.balance,
          status: p.status || "due",
          revision: Number(p.revision) || 0,
        });
      }
      invoices.sort((a, b) => String(b.invoiceNumber).localeCompare(String(a.invoiceNumber)));
      return json(200, { invoices });
    }

    if (b.action === "send") {
      const n = clean(b.invoiceNumber, 80);
      const key = `invoices/${n}`;
      const current = await store.getWithMetadata(key, { type: "json", consistency: "strong" });
      const p = current?.data;
      if (!p) return json(404, { error: "Facture introuvable." });
      await sendBrevo(p);
      const marked = { ...p, lastSentAt: new Date().toISOString(), sentCount: (Number(p.sentCount) || 0) + 1 };
      try { await store.setJSON(key, marked, { onlyIfMatch: current.etag }); } catch {}
      return json(200, { message: `Facture ${n} envoyée à ${p.client.email}.` });
    }

    return json(400, { error: "Action inconnue." });
  } catch (e) {
    console.error("admin-invoices-v2", e);
    const message = e && e.message ? String(e.message) : "Erreur serveur.";
    return json(500, { error: message, code: "INVOICE_SERVER_ERROR" });
  }
}
