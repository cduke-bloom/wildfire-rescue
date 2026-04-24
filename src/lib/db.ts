import {
	addDoc,
	arrayUnion,
	collection,
	doc,
	getDoc,
	getDocs,
	limit,
	onSnapshot,
	orderBy,
	query,
	serverTimestamp,
	setDoc,
	updateDoc,
	where,
	type Unsubscribe
} from 'firebase/firestore';
import { db } from '$lib/firebase';
import type {
	Listing,
	ListingType,
	Message,
	Report,
	Thread,
	County
} from '$lib/types';

// Firestore rejects `undefined` — strip it from writes
function clean<T extends Record<string, unknown>>(obj: T): Partial<T> {
	const out: Record<string, unknown> = {};
	for (const [k, v] of Object.entries(obj)) {
		if (v !== undefined) out[k] = v;
	}
	return out as Partial<T>;
}

// ---------- Listings ----------

export async function createListing(
	listing: Omit<Listing, 'id' | 'createdAt'>
): Promise<string> {
	const ref = await addDoc(collection(db(), 'listings'), {
		...clean(listing),
		createdAt: Date.now(),
		createdAtServer: serverTimestamp()
	});
	return ref.id;
}

export async function updateListing(id: string, patch: Partial<Listing>) {
	await updateDoc(doc(db(), 'listings', id), clean(patch));
}

export async function getListing(id: string): Promise<Listing | null> {
	const snap = await getDoc(doc(db(), 'listings', id));
	if (!snap.exists()) return null;
	return { id: snap.id, ...(snap.data() as Omit<Listing, 'id'>) };
}

export function subscribeListings(
	opts: { type?: ListingType; county?: County },
	cb: (items: Listing[]) => void
): Unsubscribe {
	const conds = [where('active', '==', true)];
	if (opts.type) conds.push(where('type', '==', opts.type));
	if (opts.county) conds.push(where('county', '==', opts.county));
	const q = query(collection(db(), 'listings'), ...conds, limit(100));
	return onSnapshot(q, (snap) => {
		const items = snap.docs.map((d) => ({
			id: d.id,
			...(d.data() as Omit<Listing, 'id'>)
		}));
		items.sort((a, b) => b.createdAt - a.createdAt);
		cb(items);
	});
}

export async function getMyListings(uid: string): Promise<Listing[]> {
	const q = query(collection(db(), 'listings'), where('ownerUid', '==', uid));
	const snap = await getDocs(q);
	return snap.docs.map((d) => ({
		id: d.id,
		...(d.data() as Omit<Listing, 'id'>)
	}));
}

// ---------- Threads / Messages ----------

export function threadIdFor(a: string, b: string, listingId?: string) {
	const pair = [a, b].sort().join('_');
	return listingId ? `${pair}__${listingId}` : pair;
}

export async function openOrCreateThread(
	me: { uid: string; name: string },
	other: { uid: string; name: string },
	listing?: { id: string; title: string }
): Promise<string> {
	const id = threadIdFor(me.uid, other.uid, listing?.id);
	const ref = doc(db(), 'threads', id);
	const snap = await getDoc(ref);
	if (!snap.exists()) {
		const thread: Omit<Thread, 'id'> = {
			participants: [me.uid, other.uid],
			participantNames: { [me.uid]: me.name, [other.uid]: other.name },
			listingId: listing?.id,
			listingTitle: listing?.title,
			updatedAt: Date.now()
		};
		await setDoc(ref, clean(thread));
	}
	return id;
}

export function subscribeMyThreads(
	uid: string,
	cb: (threads: Thread[]) => void
): Unsubscribe {
	const q = query(
		collection(db(), 'threads'),
		where('participants', 'array-contains', uid),
		orderBy('updatedAt', 'desc'),
		limit(100)
	);
	return onSnapshot(q, (snap) => {
		cb(
			snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Thread, 'id'>) }))
		);
	});
}

export function subscribeMessages(
	threadId: string,
	cb: (msgs: Message[]) => void
): Unsubscribe {
	const q = query(
		collection(db(), 'threads', threadId, 'messages'),
		orderBy('ts', 'asc'),
		limit(500)
	);
	return onSnapshot(q, (snap) => {
		cb(
			snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Message, 'id'>) }))
		);
	});
}

export async function sendMessage(
	threadId: string,
	sender: string,
	text: string
) {
	const clean = text.trim();
	if (!clean) return;
	await addDoc(collection(db(), 'threads', threadId, 'messages'), {
		sender,
		text: clean,
		ts: Date.now()
	});
	await updateDoc(doc(db(), 'threads', threadId), {
		lastMessage: clean.slice(0, 140),
		lastSender: sender,
		updatedAt: Date.now()
	});
}

// ---------- Reports / Blocks ----------

export async function submitReport(r: Omit<Report, 'id' | 'createdAt'>) {
	await addDoc(collection(db(), 'reports'), {
		...r,
		createdAt: Date.now()
	});
}

export async function blockUid(myUid: string, targetUid: string) {
	await updateDoc(doc(db(), 'users', myUid), {
		blocked: arrayUnion(targetUid)
	});
}
