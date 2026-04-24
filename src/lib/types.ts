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
}
