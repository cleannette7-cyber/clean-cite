import { runProspectingJob } from './_prospecting-core.mjs';

export default async function handler(request) {
  if (request.method !== 'POST') return;
  const body = await request.json().catch(() => ({}));
  try { await runProspectingJob(String(body.jobId || ''), String(body.runToken || '')); }
  catch (error) { console.error('prospecting-search-background', error); }
}

export const config = { background: true };
