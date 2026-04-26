<script lang="ts">
	import { goto } from '$app/navigation';
	import { authState } from '$lib/stores/user';
	import { myThreads } from '$lib/stores/messages';
	import { ensureSupportThread } from '$lib/db';
	import { isThreadUnread, type Thread } from '$lib/types';

	const threads = $derived($myThreads);

	let contacting = $state(false);
	let contactError = $state('');

	async function contactAdmin() {
		if (!$authState.user || !$authState.profile) return;
		contacting = true;
		contactError = '';
		try {
			const threadId = await ensureSupportThread({
				uid: $authState.user.uid,
				name: $authState.profile.displayName
			});
			await goto(`/messages/${threadId}/`);
		} catch (e) {
			contactError = e instanceof Error ? e.message : 'Could not open the moderator thread.';
		} finally {
			contacting = false;
		}
	}

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
{:else}
	<div class="mt-4 bg-orange-50 border border-orange-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
		<div class="min-w-0">
			<p class="font-semibold text-orange-900">Need to reach the moderators?</p>
			<p class="text-sm text-stone-700 mt-0.5">
				Question, concern, or something to flag? Message the Wildfire Rescue Team directly.
			</p>
		</div>
		<button
			class="btn bg-orange-700 text-white hover:bg-orange-800 border-0 shrink-0"
			onclick={contactAdmin}
			disabled={contacting}
		>
			{contacting ? 'Opening…' : '💬 Message moderators'}
		</button>
	</div>
	{#if contactError}
		<p class="mt-2 text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded p-2">{contactError}</p>
	{/if}

	{#if threads.length === 0}
		<p class="mt-6 text-stone-600">No conversations yet. Message someone from their listing — or message the moderators above — to get started.</p>
	{:else}
	<ul class="mt-4 space-y-2">
		{#each threads as t (t.id)}
			{@const o = other(t)}
			{@const unread = $authState.user ? isThreadUnread(t, $authState.user.uid) : false}
			<li>
				<a
					href={`/messages/${t.id}/`}
					class="block bg-white rounded-xl border shadow-sm p-4 hover:shadow-md {unread ? 'border-orange-400 ring-1 ring-orange-200' : 'border-stone-200'}"
				>
					<div class="flex justify-between items-baseline gap-2">
						<p class="font-semibold text-stone-800 flex items-center gap-2">
							{o.name}
							{#if unread}
								<span class="bg-red-500 text-white text-[10px] font-bold rounded-full px-2 py-0.5">NEW</span>
							{/if}
						</p>
						<span class="text-xs text-stone-500 shrink-0">{timeAgo(t.updatedAt)}</span>
					</div>
					{#if t.listingTitle}
						<p class="text-xs text-stone-500 mt-0.5">about: {t.listingTitle}</p>
					{/if}
					{#if t.lastMessage}
						<p class="text-sm mt-1 line-clamp-1 {unread ? 'text-stone-900 font-medium' : 'text-stone-700'}">
							{t.lastSender === $authState.user?.uid ? 'You: ' : ''}{t.lastMessage}
						</p>
					{/if}
				</a>
			</li>
		{/each}
		</ul>
	{/if}
{/if}
