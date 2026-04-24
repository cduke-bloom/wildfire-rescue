import { writable, derived, type Readable } from 'svelte/store';
import { authState } from '$lib/stores/user';
import { subscribeMyThreads } from '$lib/db';
import { isThreadUnread, type Thread } from '$lib/types';

export const myThreads = writable<Thread[]>([]);

let unsub: (() => void) | null = null;

export function initMyThreads() {
	const stop = authState.subscribe(($s) => {
		unsub?.();
		unsub = null;
		if ($s.user) {
			unsub = subscribeMyThreads($s.user.uid, (t) => myThreads.set(t));
		} else {
			myThreads.set([]);
		}
	});
	return () => {
		stop();
		unsub?.();
	};
}

export const unreadCount: Readable<number> = derived(
	[myThreads, authState],
	([$threads, $auth]) => {
		const uid = $auth.user?.uid;
		if (!uid) return 0;
		return $threads.filter((t) => isThreadUnread(t, uid)).length;
	}
);
