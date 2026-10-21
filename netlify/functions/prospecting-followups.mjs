import { runProspectFollowups } from './_prospecting-core.mjs';
import { withMailbox } from './_gmail-common.mjs';

export default async function handler() {
  try {
    // Deux exécutions séquentielles : chaque relance garde son expéditeur d'origine.
    // Le plafond d'envoi journalier reste global entre les deux boîtes.
    const legacy = await withMailbox('legacy', () => runProspectFollowups());
    const workspace = await withMailbox('workspace', () => runProspectFollowups());
    return new Response(JSON.stringify({ legacy, workspace }), {
      headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    console.error('prospecting-followups-schedule', error);
    return new Response(JSON.stringify({ error: 'Relances de prospection indisponibles.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
    });
  }
}

export const config = { schedule: '30 8 * * *' };
