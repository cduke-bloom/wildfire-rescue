import { writable, type Writable } from 'svelte/store';
import {
	GoogleAuthProvider,
	onAuthStateChanged,
	signInWithPopup,
	signOut,
	type User
} from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { browser } from '$app/environment';
import { auth, db } from '$lib/firebase';
import { checkIsAdmin, isSuperAdminEmail } from '$lib/admin';
import type { UserDoc } from '$lib/types';

export interface AuthState {
	ready: boolean;
	user: User | null;
	profile: UserDoc | null;
	isAdmin: boolean;
	isSuperAdmin: boolean;
}

export const authState: Writable<AuthState> = writable({
	ready: false,
	user: null,
	profile: null,
	isAdmin: false,
	isSuperAdmin: false
});

export function initAuth() {
	if (!browser) return;
	onAuthStateChanged(auth(), async (user) => {
		if (!user) {
			authState.set({
				ready: true,
				user: null,
				profile: null,
				isAdmin: false,
				isSuperAdmin: false
			});
			return;
		}
		const ref = doc(db(), 'users', user.uid);
		const snap = await getDoc(ref);
		let profile: UserDoc;
		if (snap.exists()) {
			profile = snap.data() as UserDoc;
		} else {
			profile = {
				uid: user.uid,
				displayName: user.displayName ?? 'Anonymous',
				createdAt: Date.now(),
				blocked: []
			};
			if (user.photoURL) profile.photoURL = user.photoURL;
			if (user.email) profile.email = user.email;
			await setDoc(ref, { ...profile, createdAtServer: serverTimestamp() });
		}
		const isSuperAdmin = isSuperAdminEmail(user.email);
		const isAdmin = isSuperAdmin || (await checkIsAdmin(user.email));
		authState.set({ ready: true, user, profile, isAdmin, isSuperAdmin });
	});
}

export async function signInWithGoogle() {
	const provider = new GoogleAuthProvider();
	await signInWithPopup(auth(), provider);
}

export async function signOutUser() {
	await signOut(auth());
}

export async function acceptTos(uid: string) {
	await setDoc(
		doc(db(), 'users', uid),
		{ acceptedTosAt: Date.now() },
		{ merge: true }
	);
	authState.update((s) =>
		s.profile ? { ...s, profile: { ...s.profile, acceptedTosAt: Date.now() } } : s
	);
}

export async function updateProfile(uid: string, patch: Partial<UserDoc>) {
	const clean: Record<string, unknown> = {};
	for (const [k, v] of Object.entries(patch)) if (v !== undefined) clean[k] = v;
	await setDoc(doc(db(), 'users', uid), clean, { merge: true });
	authState.update((s) =>
		s.profile ? { ...s, profile: { ...s.profile, ...patch } } : s
	);
}

