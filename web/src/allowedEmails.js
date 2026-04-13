/**
 * Authorised email addresses for this application.
 * Used for client-side pre-checks on the login page.
 * The canonical enforcement lives in firestore.rules — keep both in sync.
 */
export const ALLOWED_EMAILS = new Set([
  'graham.pressey@blacklineconsulting.ca',
  'ian.shelley@blacklineconsulting.ca',
  'abdel.al-sharif@blacklineconsulting.ca',
  'anum.nasir@blacklineconsulting.ca',
  'yash.melwani@blacklineconsulting.ca',
  'nikhil.konduru@blacklineconsulting.ca',
  'john.connolly@blacklineconsulting.ca',
  'michelle.tam@blacklineconsulting.ca',
  'rehan.setna@blacklineconsulting.ca',
  'laura.devenny@blacklineconsulting.ca',
  'ben.haddon@blacklineconsulting.ca',
]);

export function isAllowedEmail(email) {
  return ALLOWED_EMAILS.has(email.trim().toLowerCase());
}
