// Email-based admin gate. Add an email here to grant admin access.
// Same list is mirrored in firestore.rules — keep them in sync.
export const ADMIN_EMAILS = [
	'cduke@bloomtechsupport.com',
	'therealcodyduke@gmail.com'
];

export function isAdminEmail(email: string | null | undefined): boolean {
	if (!email) return false;
	return ADMIN_EMAILS.includes(email.toLowerCase());
}
