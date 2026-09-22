import { runProspectFollowups } from './_prospecting-core.mjs';

export default async function handler() {
  try {
    return new Response(JSON.stringify(await runProspectFollowups()), {
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
