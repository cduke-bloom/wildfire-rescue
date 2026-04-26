<script lang="ts">
	import { goto } from '$app/navigation';
	import { authState } from '$lib/stores/user';
	import { myThreads } from '$lib/stores/messages';
	import { ensureSupportThread, hideThread } from '$lib/db';
	import { isThreadUnread, isThreadVisible, type Thread } from '$lib/types';

	const visibleThreads = $derived.by(() => {
		const uid = $authState.user?.uid;
		if (!uid) return [];
		return $myThreads.filter((t) => isThreadVisible(t, uid));
	});

	async function hide(e: MouseEvent, t: Thread) {
		e.preventDefault();
		e.stopPropagation();
		if (!$authState.user) return;
		if (!confirm('Hide this conversation?\n\nIt will reappear if the other person messages you again.'))
			return;
		await hideThread(t.id, $authState.user.uid);
	}

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

	{#if visibleThreads.length === 0}
		<p class="mt-6 text-stone-600">No conversations yet. Message someone from their listing — or message the moderators above — to get started.</p>
	{:else}
	<ul class="mt-4 space-y-2">
		{#each visibleThreads as t (t.id)}
			{@const o = other(t)}
			{@const unread = $authState.user ? isThreadUnread(t, $authState.user.uid) : false}
			<li class="relative">
				<a
					href={`/messages/${t.id}/`}
					class="block bg-white rounded-xl border shadow-sm p-4 pr-12 hover:shadow-md {unread ? 'border-orange-400 ring-1 ring-orange-200' : 'border-stone-200'}"
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
				<button
					type="button"
					onclick={(e) => hide(e, t)}
					aria-label="Hide conversation"
					title="Hide this conversation"
					class="absolute top-3 right-3 p-1.5 rounded-md text-stone-400 hover:text-rose-700 hover:bg-rose-50"
				>
					<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3" />
					</svg>
				</button>
			</li>
		{/each}
		</ul>
	{/if}
{/if}
