// CLEAN-CITÉ : liste restreinte des comptes d'administration Netlify Identity.
// Le contrôle d'authentification doit être réalisé avant l'appel à cette fonction.
export const ADMIN_EMAILS = Object.freeze(['cleannette7@gmail.com', 'nettoyage-pro@clean-cite.org']);
export const normalizeAdminEmail = email => String(email || '').trim().toLowerCase();
export const isAdminEmail = email => ADMIN_EMAILS.includes(normalizeAdminEmail(email));
