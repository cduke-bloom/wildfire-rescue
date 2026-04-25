export type County = 'Brantley' | 'Glynn' | 'Camden' | 'Wayne';
export const COUNTIES: County[] = ['Brantley', 'Glynn', 'Camden', 'Wayne'];

export type ListingType =
	| 'offer_shelter'
	| 'need_shelter'
	| 'offer_items'
	| 'need_items';

export const LISTING_TYPE_LABEL: Record<ListingType, string> = {
	offer_shelter: 'Offering a place to stay',
	need_shelter: 'Need a place to stay',
	offer_items: 'Offering supplies',
	need_items: 'Need supplies'
};

// What a *browser* is looking for (viewer perspective, not poster perspective)
export const BROWSE_FILTER: Record<
	ListingType,
	{ label: string; sub: string; emoji: string; classes: string }
> = {
	offer_shelter: {
		label: 'Find a place to stay',
		sub: 'Hosts offering rooms or homes',
		emoji: '🏠',
		classes: 'bg-emerald-50 hover:bg-emerald-100 border-emerald-200 text-emerald-900'
	},
	offer_items: {
		label: 'Find supplies',
		sub: 'Donated water, food, hygiene, etc.',
		emoji: '🎁',
		classes: 'bg-sky-50 hover:bg-sky-100 border-sky-200 text-sky-900'
	},
	need_shelter: {
		label: 'See who needs a host',
		sub: 'Families looking for a place to stay',
		emoji: '🤝',
		classes: 'bg-orange-50 hover:bg-orange-100 border-orange-200 text-orange-900'
	},
	need_items: {
		label: 'See what people need',
		sub: 'Specific supply requests',
		emoji: '📦',
		classes: 'bg-rose-50 hover:bg-rose-100 border-rose-200 text-rose-900'
	}
};

export interface UserDoc {
	uid: string;
	displayName: string;
	photoURL?: string;
	email?: string;
	county?: County;
	bio?: string;
	acceptedTosAt?: number;
	blocked?: string[];
	createdAt: number;
	// Set by admin when this user violates the rules.
	// Banned users can browse but cannot post or message.
	banned?: boolean;
	bannedAt?: number;
	bannedBy?: string;
	bannedReason?: string;
}

export interface ShelterPrefs {
	petsOk: boolean;
	kidsOk: boolean;
	maxPeople: number;
	durationDays?: number;
	notes?: string;
}

export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

export interface Listing {
	id: string;
	ownerUid: string;
	ownerName: string;
	type: ListingType;
	title: string;
	details: string;
	county: County;
	city?: string;
	prefs?: ShelterPrefs;
	items?: string[];
	active: boolean;
	createdAt: number;
	// Owner-set: marks the listing as fulfilled / no longer needed.
	// Distinct from a temporary deactivation in that it represents
	// a successful outcome and is the expected end-state.
	closedAt?: number;
	// Pre-publication approval — required before a listing goes live
	approvalStatus?: ApprovalStatus;
	rejectionReason?: string;
	// Required for need_shelter / need_items listings: the poster certifies
	// they have been directly affected by the wildfire.
	affectedAttestation?: boolean;
	affectedAttestationAt?: number;
	// Post-publication moderation
	suspended?: boolean;
	suspendedAt?: number;
	suspendedBy?: string;
	suspendedReason?: string;
	// Owner request to review a suspension
	reviewRequestedAt?: number;
	reviewMessage?: string;
}

export interface Thread {
	id: string;
	participants: string[];
	participantNames: Record<string, string>;
	listingId?: string;
	listingTitle?: string;
	lastMessage?: string;
	lastSender?: string;
	updatedAt: number;
	readAt?: Record<string, number>;
}

export function isThreadUnread(t: Thread, uid: string): boolean {
	if (!t.lastSender || t.lastSender === uid) return false;
	const seen = t.readAt?.[uid] ?? 0;
	return t.updatedAt > seen;
}

export interface Message {
	id: string;
	sender: string;
	text: string;
	ts: number;
}

export type ReportTargetType = 'listing' | 'message' | 'user' | 'other';

export interface Report {
	id: string;
	fromUid: string;
	targetUid?: string;
	targetType: ReportTargetType;
	targetId?: string;
	reason: string;
	createdAt: number;
	resolved?: boolean;
	resolvedAt?: number;
	resolvedBy?: string;
	resolutionNote?: string;
}
