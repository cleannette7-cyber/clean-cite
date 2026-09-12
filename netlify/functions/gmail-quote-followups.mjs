import { runFollowups } from './_quote-followups.mjs';

export default async function handler() {
  try { return new Response(JSON.stringify(await runFollowups()),{headers:{'Content-Type':'application/json'}}); }
  catch(e) { console.error('followup-schedule',e); return new Response(JSON.stringify({error:'Relances indisponibles.'}),{status:500}); }
}

export const config = { schedule:'0 9 * * *' }; // 09:00 UTC, chaque jour.
