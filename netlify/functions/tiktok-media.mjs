import { randomUUID } from 'node:crypto';
import { getStore } from '@netlify/blobs';
import { getUser } from '@netlify/identity';

const ADMIN_EMAIL = String(process.env.CLEAN_CITE_ADMIN_EMAIL || 'cleannette7@gmail.com').trim().toLowerCase();
const MAX_BYTES = 3_000_000;
const store = () => getStore({ name: 'clean-cite-tiktok-photos', consistency: 'strong' });
const json = (status, data) => new Response(JSON.stringify(data), {
  status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
});

export default async function handler(req) {
  if (req.method === 'GET') {
    const id = new URL(req.url).searchParams.get('id') || '';
    if (!/^[0-9a-f-]{36}$/.test(id)) return new Response('Image introuvable.', { status: 404 });
    const image = await store().get(`photos/${id}`, { type: 'arrayBuffer' });
    if (!image) return new Response('Image introuvable.', { status: 404 });
    return new Response(image, { headers: {
      'Content-Type': 'image/jpeg', 'Cache-Control': 'public, max-age=86400',
      'X-Content-Type-Options': 'nosniff',
    } });
  }
  if (req.method !== 'POST') return json(405, { error: 'Méthode non autorisée.' });
  const user = await getUser();
  if (!user) return json(401, { error: 'Connexion administrateur requise.' });
  if (String(user.email || '').trim().toLowerCase() !== ADMIN_EMAIL) return json(403, { error: 'Accès administrateur refusé.' });
  if (Number(req.headers.get('content-length') || 0) > MAX_BYTES + 10000) return json(413, { error: 'Photo trop volumineuse (3 Mo maximum).' });
  try {
    const form = await req.formData();
    const image = form.get('photo');
    if (!image || image.type !== 'image/jpeg' || typeof image.arrayBuffer !== 'function' || image.size > MAX_BYTES || image.size < 100) {
      return json(400, { error: 'Choisis une photo JPEG de 3 Mo maximum.' });
    }
    const bytes = new Uint8Array(await image.arrayBuffer());
    if (bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes.at(-2) !== 0xff || bytes.at(-1) !== 0xd9) {
      return json(400, { error: 'Le fichier JPEG est invalide.' });
    }
    const id = randomUUID();
    const saved = await store().set(`photos/${id}`, image, { onlyIfNew: true });
    if (!saved.modified) throw new Error('Écriture photo refusée.');
    const origin = new URL(process.env.URL || 'https://clean-cite.org');
    if (origin.protocol !== 'https:') throw new Error('Adresse HTTPS du site manquante.');
    return json(201, { url: new URL(`/.netlify/functions/tiktok-media?id=${id}`, origin).href });
  } catch (error) {
    console.error('tiktok-media:', error);
    return json(503, { error: 'Impossible d’enregistrer la photo. Réessaie.' });
  }
}
