export type County = 'Brantley' | 'Glynn' | 'Camden';
export const COUNTIES: County[] = ['Brantley', 'Glynn', 'Camden'];

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
}

export interface ShelterPrefs {
	petsOk: boolean;
	kidsOk: boolean;
	maxPeople: number;
	durationDays?: number;
	notes?: string;
}

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
	// Moderation state — set by admins
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

export interface Report {
	id: string;
	fromUid: string;
	targetUid: string;
	targetType: 'listing' | 'message' | 'user';
	targetId?: string;
	reason: string;
	createdAt: number;
	resolved?: boolean;
	resolvedAt?: number;
	resolvedBy?: string;
	resolutionNote?: string;
}
