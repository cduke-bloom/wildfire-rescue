import {
	collection,
	deleteDoc,
	doc,
	getDoc,
	getDocs,
	setDoc
} from 'firebase/firestore';
import { db } from './firebase';

// Super-admins are hard-coded. Only super-admins can add or remove
// regular admins. There is intentionally no UI to grant super-admin —
// that requires editing this file (and firestore.rules) and redeploying.
export const SUPER_ADMIN_EMAILS = [
	'cduke@bloomtechsupport.com',
	'therealcodyduke@gmail.com'
];

export function isSuperAdminEmail(email: string | null | undefined): boolean {
	if (!email) return false;
	return SUPER_ADMIN_EMAILS.includes(email.toLowerCase());
}

// Async — checks the Firestore admins/{email} collection.
// Super-admins always pass this check too.
export async function checkIsAdmin(email: string | null | undefined): Promise<boolean> {
	if (!email) return false;
	if (isSuperAdminEmail(email)) return true;
	try {
		const snap = await getDoc(doc(db(), 'admins', email.toLowerCase()));
		return snap.exists();
	} catch {
		return false;
	}
}

export interface AdminEntry {
	email: string;
	addedBy: string;
	addedAt?: number;
}

export async function listAdmins(): Promise<AdminEntry[]> {
	const snap = await getDocs(collection(db(), 'admins'));
	return snap.docs.map((d) => {
		const data = d.data() as { addedBy?: string; addedAt?: number };
		return {
			email: d.id,
			addedBy: data.addedBy ?? '',
			addedAt: data.addedAt
		};
	});
}

export async function addAdmin(email: string, addedBy: string): Promise<void> {
	const normalized = email.trim().toLowerCase();
	if (!normalized) throw new Error('Please enter an email.');
	if (!normalized.includes('@')) throw new Error('That doesn\'t look like an email.');
	if (isSuperAdminEmail(normalized)) return; // already implicitly admin
	await setDoc(doc(db(), 'admins', normalized), {
		email: normalized,
		addedBy,
		addedAt: Date.now()
	});
}

export async function removeAdmin(email: string): Promise<void> {
	await deleteDoc(doc(db(), 'admins', email.toLowerCase()));
}
