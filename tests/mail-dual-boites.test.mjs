import test from 'node:test';
import assert from 'node:assert/strict';
import { withMailbox, resolveMailboxId, gmailConfig, activeMailbox, MAILBOXES } from '../netlify/functions/_gmail-common.mjs';

test('choix des boîtes strict : aucune boîte arbitraire', () => {
  assert.deepEqual(MAILBOXES, ['legacy', 'workspace']);
  assert.equal(resolveMailboxId(), 'legacy');
  assert.equal(resolveMailboxId('workspace'), 'workspace');
  assert.throws(() => resolveMailboxId('contact@autre-site.fr'), /inconnue/);
});

test('Google Workspace impose la bonne adresse professionnelle', async () => {
  assert.equal(await withMailbox('workspace', () => gmailConfig().allowedEmail), 'nettoyage-pro@clean-cite.org');
});

test('le contexte de boîte n’affecte pas les autres appels asynchrones', async () => {
  const [a,b]=await Promise.all([
    withMailbox('legacy', async () => { await new Promise(r=>setTimeout(r,4)); return activeMailbox(); }),
    withMailbox('workspace', async () => { await new Promise(r=>setTimeout(r,1)); return activeMailbox(); })
  ]);
  assert.equal(a, 'legacy');
  assert.equal(b, 'workspace');
  assert.equal(activeMailbox(), 'legacy');
});
