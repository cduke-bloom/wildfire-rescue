<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { authState } from '$lib/stores/user';
	import { subscribeMyThreads } from '$lib/db';
	import type { Thread } from '$lib/types';

	let threads = $state<Thread[]>([]);
	let unsub: (() => void) | null = null;

	$effect(() => {
		unsub?.();
		if ($authState.user) {
			unsub = subscribeMyThreads($authState.user.uid, (t) => (threads = t));
		}
	});

	onDestroy(() => unsub?.());

	function other(t: Thread): { uid: string; name: string } {
		const myUid = $authState.user?.uid;
		const otherUid = t.participants.find((p) => p !== myUid) ?? '';
		return { uid: otherUid, name: t.participantNames[otherUid] ?? 'Unknown' };
	}

	function timeAgo(ts: number) {
		const s = (Date.now() - ts) / 1000;
		if (s < 60) return 'just now';
		if (s < 3600) return `${Math.floor(s / 60)}m`;
		if (s < 86400) return `${Math.floor(s / 3600)}h`;
		return `${Math.floor(s / 86400)}d`;
	}
</script>

<h1 class="text-2xl font-bold text-orange-800">Messages</h1>

{#if !$authState.ready}
	<p class="mt-4 text-stone-600">Loading…</p>
{:else if !$authState.user}
	<p class="mt-4 text-stone-600">Sign in to see your messages.</p>
{:else if threads.length === 0}
	<p class="mt-6 text-stone-600">No conversations yet. Message someone from their listing to get started.</p>
{:else}
	<ul class="mt-4 space-y-2">
		{#each threads as t (t.id)}
			{@const o = other(t)}
			<li>
				<a
					href={`/messages/${t.id}/`}
					class="block bg-white rounded-xl border border-stone-200 shadow-sm p-4 hover:shadow-md"
				>
					<div class="flex justify-between items-baseline">
						<p class="font-semibold text-stone-800">{o.name}</p>
						<span class="text-xs text-stone-500">{timeAgo(t.updatedAt)}</span>
					</div>
					{#if t.listingTitle}
						<p class="text-xs text-stone-500 mt-0.5">about: {t.listingTitle}</p>
					{/if}
					{#if t.lastMessage}
						<p class="text-sm text-stone-700 mt-1 line-clamp-1">
							{t.lastSender === $authState.user?.uid ? 'You: ' : ''}{t.lastMessage}
						</p>
					{/if}
				</a>
			</li>
		{/each}
	</ul>
{/if}
