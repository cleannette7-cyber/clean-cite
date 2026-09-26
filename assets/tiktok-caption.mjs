// Le texte saisi peut déjà contenir les hashtags proposés par l'agent.
// N'ajouter que ceux qui ne figurent pas encore dans la légende.
export function captionWithTags(post = {}) {
  const caption = String(post.caption ?? '').trim();
  const seen = new Set([...caption.matchAll(/#[\p{L}\p{N}_]+/gu)].map(match => match[0].toLocaleLowerCase('fr-FR')));
  const missing = [];
  for (const entry of Array.isArray(post.hashtags) ? post.hashtags : []) {
    const tag = `#${String(entry ?? '').trim().replace(/^#+/, '')}`;
    if (!/^#[\p{L}\p{N}_]+$/u.test(tag)) continue;
    const key = tag.toLocaleLowerCase('fr-FR');
    if (seen.has(key)) continue;
    seen.add(key);
    missing.push(tag);
  }
  return [caption, missing.join(' ')].filter(Boolean).join('\n\n');
}
