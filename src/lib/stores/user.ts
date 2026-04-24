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
import type { UserDoc } from '$lib/types';

export interface AuthState {
	ready: boolean;
	user: User | null;
	profile: UserDoc | null;
}

export const authState: Writable<AuthState> = writable({
	ready: false,
	user: null,
	profile: null
});

export function initAuth() {
	if (!browser) return;
	onAuthStateChanged(auth(), async (user) => {
		if (!user) {
			authState.set({ ready: true, user: null, profile: null });
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
				photoURL: user.photoURL ?? undefined,
				email: user.email ?? undefined,
				createdAt: Date.now(),
				blocked: []
			};
			await setDoc(ref, { ...profile, createdAtServer: serverTimestamp() });
		}
		authState.set({ ready: true, user, profile });
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
	await setDoc(doc(db(), 'users', uid), patch, { merge: true });
	authState.update((s) =>
		s.profile ? { ...s, profile: { ...s.profile, ...patch } } : s
	);
}

