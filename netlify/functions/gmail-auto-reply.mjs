import { autoProcess } from './gmail-mail-ai.mjs';

export default async function handler() {
  try {
    const result = await autoProcess();
    console.log('Clean-Cité Mail IA auto', result);
    return new Response(JSON.stringify(result), { status:200, headers:{'Content-Type':'application/json'} });
  } catch (e) {
    console.error('Clean-Cité Mail IA auto error', e);
    return new Response(JSON.stringify({error:e.message||'Erreur'}), { status:500, headers:{'Content-Type':'application/json'} });
  }
}

export const config = { schedule: '*/5 * * * *' };
