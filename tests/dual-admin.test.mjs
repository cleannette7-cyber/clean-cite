import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { isAdminEmail, ADMIN_EMAILS } from '../netlify/functions/_admin-access.mjs';

const root = new URL('../', import.meta.url);
const read = file => readFileSync(new URL(file, root), 'utf8');

// Le contrôle vérifie toujours la session Netlify Identity en amont côté serveur.
test('les deux e-mails sont autorisés mais aucun client ordinaire', () => {
  assert.deepEqual(ADMIN_EMAILS, ['cleannette7@gmail.com', 'nettoyage-pro@clean-cite.org']);
  assert.equal(isAdminEmail('cleannette7@gmail.com'), true);
  assert.equal(isAdminEmail('NETTOYAGE-PRO@CLEAN-CITE.ORG '), true);
  assert.equal(isAdminEmail('client@example.org'), false);
  assert.equal(isAdminEmail(''), false);
});

test('toutes les pages admin ont deux adresses autorisées', () => {
  for (const page of ['index', 'devis', 'factures', 'prospection', 'mail-ia', 'tiktok']) {
    assert.match(read(`admin/${page}.html`), /const ADMIN_EMAILS=new Set\(\[/);
    assert.match(read(`admin/${page}.html`), /ADMIN_EMAILS\.has\(/);
  }
  assert.match(read('admin/cms.html'), /CLEAN_CITE_ADMIN_EMAILS\.includes/);
});

test('les vérifications serveur restent présentes et utilisent la liste commune', () => {
  for (const name of ['prospecting-api', 'admin-send-devis', 'gmail-mail-ai', 'gmail-oauth', 'admin-invoices', 'tiktok-media', 'tiktok-agent']) {
    const source = read(`netlify/functions/${name}.mjs`);
    assert.match(source, /getUser\(\)/);
    assert.match(source, /isAdminEmail\(/);
  }
  assert.match(read('netlify/functions/client-planning.js'), /ADMIN_EMAILS\.has\(email\)/);
});
