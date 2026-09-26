import test from 'node:test';
import assert from 'node:assert/strict';
import { photoPostInput } from '../netlify/functions/tiktok-agent.mjs';

const future = () => new Date(Date.now() + 2 * 86400_000).toISOString();
const post = { format: 'carrousel', title: 'Avant et après le nettoyage', caption: 'Chantier terminé avec accord du client.',
  hashtags: ['CleanCite', '#Nettoyage'], mediaUrl: '/images/uploads/intervention.jpg',
  mediaUrls: ['/images/uploads/intervention.jpg', 'https://clean-cite.org/.netlify/functions/tiktok-media?id=01234567-89ab-4cde-a123-0123456789ab'] };

test('la programmation photo construit une demande Buffer avec les images publiques et une heure future', () => {
  const input = photoPostInput(post, 'channel-123', future());
  assert.equal(input.schedulingType, 'automatic');
  assert.equal(input.mode, 'customScheduled');
  assert.equal(input.channelId, 'channel-123');
  assert.equal(input.assets.length, 2);
  assert.equal(input.assets[0].image.url, 'https://clean-cite.org/images/uploads/intervention.jpg');
  assert.match(input.text, /#CleanCite #Nettoyage/);
  assert.equal(input.metadata.tiktok.title, post.title);
});

test('la programmation refuse les vidéos, les images non publiques et les dates trop proches', () => {
  assert.throws(() => photoPostInput({ ...post, format: 'vidéo' }, 'id', future()), /format Photo ou Carrousel/);
  assert.throws(() => photoPostInput({ ...post, mediaUrl: 'http://localhost/photo.jpg' }, 'id', future()), /URL HTTPS publique/);
  assert.throws(() => photoPostInput(post, 'id', new Date(Date.now() + 1000).toISOString()), /10 minutes/);
  assert.throws(() => photoPostInput({ ...post, mediaUrls: Array.from({ length: 10 }, (_, i) => `https://example.com/${i}.jpg`) }, 'id', future()), /maximum 10 photos/);
});
