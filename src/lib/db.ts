import {
	addDoc,
	arrayUnion,
	collection,
	deleteDoc,
	deleteField,
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
	County,
	UserDoc
} from '$lib/types';
import { SUPER_ADMIN_EMAILS } from '$lib/admin';

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
		// Override: every new listing starts inactive + pending until admin approves
		active: false,
		approvalStatus: 'pending',
		createdAt: Date.now(),
		createdAtServer: serverTimestamp()
	});
	return ref.id;
}

export async function resubmitForApproval(id: string) {
	await updateDoc(doc(db(), 'listings', id), {
		approvalStatus: 'pending',
		rejectionReason: deleteField()
	});
}

// Close a listing when it has been fulfilled — sets closedAt and turns it off.
// Distinct from a plain deactivation: shows a "Fulfilled" badge.
export async function closeListing(id: string) {
	await updateDoc(doc(db(), 'listings', id), {
		active: false,
		closedAt: Date.now()
	});
}

export async function reopenListing(id: string) {
	await updateDoc(doc(db(), 'listings', id), {
		active: true,
		closedAt: deleteField()
	});
}

export async function updateListing(id: string, patch: Partial<Listing>) {
	await updateDoc(doc(db(), 'listings', id), clean(patch));
}

// Owner-edit: any content change re-triggers admin approval and pulls the
// listing offline until re-approved. Use this — not updateListing — when an
// owner saves a real edit from the edit form.
export async function ownerEditListing(id: string, patch: Partial<Listing>) {
	await updateDoc(doc(db(), 'listings', id), {
		...clean(patch),
		active: false,
		approvalStatus: 'pending'
	});
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
	// Sorted so both participants produce the same array — required by the
	// "participants cannot be changed" update rule.
	const participants = [me.uid, other.uid].sort();
	const data: Omit<Thread, 'id'> = {
		participants,
		participantNames: { [me.uid]: me.name, [other.uid]: other.name },
		listingId: listing?.id,
		listingTitle: listing?.title,
		updatedAt: Date.now()
	};
	// merge:true → creates if missing, updates if it exists. Avoids a getDoc
	// that would fail under the read rule for non-existent threads.
	await setDoc(ref, clean(data), { merge: true });
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

export async function markThreadRead(threadId: string, uid: string) {
	await updateDoc(doc(db(), 'threads', threadId), {
		[`readAt.${uid}`]: Date.now()
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

// ---------- Admin actions ----------

export async function adminApproveListing(
	id: string,
	admin: { uid: string; name: string }
) {
	const listing = await getListing(id);
	if (!listing) return;
	await updateDoc(doc(db(), 'listings', id), {
		active: true,
		approvalStatus: 'approved',
		rejectionReason: deleteField()
	});
	await notifyOwner(
		admin,
		listing.ownerUid,
		listing.ownerName,
		`✅ Your listing "${listing.title}" has been approved and is now live on Southeast Georgia Wildfire Rescue.\n\nAnyone browsing will be able to see it and message you.`
	);
}

export async function adminRejectListing(
	id: string,
	reason: string,
	admin: { uid: string; name: string }
) {
	const listing = await getListing(id);
	if (!listing) return;
	await updateDoc(doc(db(), 'listings', id), {
		active: false,
		approvalStatus: 'rejected',
		rejectionReason: reason
	});
	await notifyOwner(
		admin,
		listing.ownerUid,
		listing.ownerName,
		`❌ Your listing "${listing.title}" was not approved.\n\nReason: ${reason}\n\nYou can edit it and click "Resubmit for approval" on your profile, or reply here if you have questions.`
	);
}

// Admin-notification threads always carry this display name and synthetic
// listing context so they're separate from any regular conversation the
// real admin might be having with the owner, and so the admin's personal
// name never appears in moderation messages.
const ADMIN_DISPLAY_NAME = 'Wildfire Rescue Team';
const ADMIN_THREAD_CONTEXT = {
	id: '__admin__',
	title: 'Wildfire Rescue Team'
};

async function notifyOwner(
	admin: { uid: string; name: string },
	ownerUid: string,
	ownerName: string,
	text: string
) {
	if (admin.uid === ownerUid) return; // admin acted on their own listing — skip notify
	const threadId = await openOrCreateThread(
		{ uid: admin.uid, name: ADMIN_DISPLAY_NAME },
		{ uid: ownerUid, name: ownerName },
		ADMIN_THREAD_CONTEXT
	);
	await sendMessage(threadId, admin.uid, text);
}

// Find a super-admin's uid so users can open a support thread.
// Falls back through the SUPER_ADMIN_EMAILS list in order.
async function findSupportAdminUid(): Promise<string | null> {
	for (const email of SUPER_ADMIN_EMAILS) {
		const q = query(
			collection(db(), 'users'),
			where('email', '==', email),
			limit(1)
		);
		const snap = await getDocs(q);
		if (!snap.empty) return snap.docs[0].id;
	}
	return null;
}

// User-initiated thread to moderators. Reuses the synthetic admin
// context so the same thread is used whether moderators contacted
// the user first or vice-versa.
export async function ensureSupportThread(user: {
	uid: string;
	name: string;
}): Promise<string> {
	const supportUid = await findSupportAdminUid();
	if (!supportUid) {
		throw new Error(
			'Moderator account isn\'t set up yet. Please try again in a few minutes.'
		);
	}
	return openOrCreateThread(
		user,
		{ uid: supportUid, name: ADMIN_DISPLAY_NAME },
		ADMIN_THREAD_CONTEXT
	);
}

export async function adminAskForDetails(
	id: string,
	message: string,
	admin: { uid: string; name: string }
) {
	const listing = await getListing(id);
	if (!listing) return;
	const firstName = listing.ownerName.split(' ')[0] || listing.ownerName;
	await notifyOwner(
		admin,
		listing.ownerUid,
		listing.ownerName,
		`Hi ${firstName} — your listing "${listing.title}" needs a bit more information before we can approve it.\n\n${message}\n\nPlease open your profile and click Edit on this listing to add the missing details. As soon as you save, we'll review it again.`
	);
}

export async function adminBanUser(
	targetUid: string,
	reason: string,
	admin: { uid: string; name: string }
) {
	await updateDoc(doc(db(), 'users', targetUid), {
		banned: true,
		bannedAt: Date.now(),
		bannedBy: admin.uid,
		bannedReason: reason
	});
}

export async function adminUnbanUser(targetUid: string) {
	await updateDoc(doc(db(), 'users', targetUid), {
		banned: false,
		bannedAt: deleteField(),
		bannedBy: deleteField(),
		bannedReason: deleteField()
	});
}

export async function adminDeleteListing(
	id: string,
	reason: string,
	admin: { uid: string; name: string }
) {
	const listing = await getListing(id);
	if (!listing) return;
	// Notify the owner BEFORE deleting so we still have access to their info
	if (listing.ownerUid !== admin.uid) {
		await notifyOwner(
			admin,
			listing.ownerUid,
			listing.ownerName,
			`🗑️ Your listing "${listing.title}" was removed by a moderator.\n\nReason: ${reason}\n\nIf you think this was a mistake, reply here. You're welcome to post a new listing that follows the community rules.`
		);
	}
	await deleteDoc(doc(db(), 'listings', id));
}

export async function adminSuspendListing(
	id: string,
	reason: string,
	adminUid: string
) {
	await updateDoc(doc(db(), 'listings', id), {
		active: false,
		suspended: true,
		suspendedAt: Date.now(),
		suspendedBy: adminUid,
		suspendedReason: reason,
		// Clear any prior review request
		reviewRequestedAt: deleteField(),
		reviewMessage: deleteField()
	});
}

export async function adminUnsuspendListing(id: string) {
	await updateDoc(doc(db(), 'listings', id), {
		active: true,
		suspended: false,
		suspendedAt: deleteField(),
		suspendedBy: deleteField(),
		suspendedReason: deleteField(),
		reviewRequestedAt: deleteField(),
		reviewMessage: deleteField()
	});
}

export async function requestListingReview(id: string, message: string) {
	await updateDoc(doc(db(), 'listings', id), {
		reviewRequestedAt: Date.now(),
		reviewMessage: message
	});
}

export function subscribeAllListings(cb: (items: Listing[]) => void): Unsubscribe {
	const q = query(collection(db(), 'listings'), orderBy('createdAt', 'desc'), limit(200));
	return onSnapshot(q, (snap) => {
		cb(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Listing, 'id'>) })));
	});
}

export function subscribeReports(cb: (items: Report[]) => void): Unsubscribe {
	const q = query(collection(db(), 'reports'), orderBy('createdAt', 'desc'), limit(200));
	return onSnapshot(q, (snap) => {
		cb(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Report, 'id'>) })));
	});
}

export function subscribeBannedUsers(cb: (users: UserDoc[]) => void): Unsubscribe {
	const q = query(
		collection(db(), 'users'),
		where('banned', '==', true),
		limit(200)
	);
	return onSnapshot(q, (snap) => {
		cb(snap.docs.map((d) => d.data() as UserDoc));
	});
}

export function subscribeAllUsers(cb: (users: UserDoc[]) => void): Unsubscribe {
	const q = query(collection(db(), 'users'), orderBy('createdAt', 'desc'), limit(500));
	return onSnapshot(q, (snap) => {
		cb(snap.docs.map((d) => d.data() as UserDoc));
	});
}

export async function resolveReport(id: string, adminUid: string, note?: string) {
	await updateDoc(doc(db(), 'reports', id), {
		resolved: true,
		resolvedAt: Date.now(),
		resolvedBy: adminUid,
		...(note ? { resolutionNote: note } : {})
	});
}
