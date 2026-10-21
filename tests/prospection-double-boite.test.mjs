import test from 'node:test';
import assert from 'node:assert/strict';
import { withMailbox, getConnection, authStore } from '../netlify/functions/_gmail-common.mjs';
import { expectedProspectingSender } from '../netlify/functions/_prospecting-core.mjs';

test('Prospection utilise l’expéditeur du compte choisi', async () => {
  assert.equal(await withMailbox('legacy', expectedProspectingSender), 'cleannette7@gmail.com');
  assert.equal(await withMailbox('workspace', expectedProspectingSender), 'nettoyage-pro@clean-cite.org');
});

test('Les connexions restent isolées', async () => {
  const store=authStore();
  await store.setJSON('connection',{email:'cleannette7@gmail.com',refreshToken:{v:1}});
  await store.setJSON('connection/workspace',{email:'nettoyage-pro@clean-cite.org',refreshToken:{v:1}});
  const [oldMail,newMail]=await Promise.all([
    withMailbox('legacy',getConnection),
    withMailbox('workspace',getConnection),
  ]);
  assert.equal(oldMail.email,'cleannette7@gmail.com');
  assert.equal(newMail.email,'nettoyage-pro@clean-cite.org');
});
