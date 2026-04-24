<script lang="ts">
	import { onDestroy, tick } from 'svelte';
	import { page } from '$app/state';
	import { doc, getDoc } from 'firebase/firestore';
	import { db } from '$lib/firebase';
	import { authState } from '$lib/stores/user';
	import { blockUid, markThreadRead, sendMessage, submitReport, subscribeMessages } from '$lib/db';
	import type { Message, Thread } from '$lib/types';

	const threadId = $derived(page.params.threadId!);

	let thread = $state<Thread | null>(null);
	let messages = $state<Message[]>([]);
	let draft = $state('');
	let unsub: (() => void) | null = null;
	let listEl = $state<HTMLElement>();
	let notAllowed = $state(false);

	$effect(() => {
		unsub?.();
		if (!$authState.user || !threadId) return;
		const myUid = $authState.user.uid;
		void loadThread();
		unsub = subscribeMessages(threadId, async (m) => {
			messages = m;
			await tick();
			listEl?.scrollTo({ top: listEl.scrollHeight });
			void markThreadRead(threadId, myUid).catch(() => {});
		});
	});

	async function loadThread() {
		const snap = await getDoc(doc(db(), 'threads', threadId));
		if (!snap.exists()) {
			notAllowed = true;
			return;
		}
		const t = { id: snap.id, ...(snap.data() as Omit<Thread, 'id'>) };
		if (!t.participants.includes($authState.user!.uid)) {
			notAllowed = true;
			return;
		}
		thread = t;
	}

	onDestroy(() => unsub?.());

	async function send() {
		if (!$authState.user || !draft.trim()) return;
		const text = draft;
		draft = '';
		await sendMessage(threadId, $authState.user.uid, text);
	}

	async function report() {
		if (!$authState.user || !thread) return;
		const otherUid = thread.participants.find((p) => p !== $authState.user!.uid);
		if (!otherUid) return;
		const reason = prompt('What is the problem?');
		if (!reason) return;
		await submitReport({
			fromUid: $authState.user.uid,
			targetUid: otherUid,
			targetType: 'message',
			targetId: threadId,
			reason
		});
		alert('Report submitted. Thank you.');
	}

	async function block() {
		if (!$authState.user || !thread) return;
		const otherUid = thread.participants.find((p) => p !== $authState.user!.uid);
		if (!otherUid) return;
		if (!confirm('Block this user? You will stop seeing their listings and messages.')) return;
		await blockUid($authState.user.uid, otherUid);
		alert('User blocked.');
	}

	const otherName = $derived.by(() => {
		if (!thread || !$authState.user) return '';
		const otherUid = thread.participants.find((p) => p !== $authState.user!.uid);
		return otherUid ? thread.participantNames[otherUid] : '';
	});

	function fmtTime(ts: number) {
		return new Date(ts).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
	}
</script>

{#if !$authState.ready}
	<p class="text-stone-600">Loading…</p>
{:else if !$authState.user}
	<p class="text-stone-600">Sign in to view this conversation.</p>
{:else if notAllowed}
	<p class="text-stone-600">This conversation isn't available.</p>
	<a href="/messages/" class="text-orange-700 underline">Back to messages</a>
{:else}
	<div class="flex items-center justify-between">
		<a href="/messages/" class="text-sm text-orange-700 underline">← All messages</a>
		<div class="flex gap-1">
			<button class="btn btn-xs btn-ghost text-stone-500" onclick={report}>Report</button>
			<button class="btn btn-xs btn-ghost text-stone-500" onclick={block}>Block</button>
		</div>
	</div>

	<div class="mt-2 bg-white rounded-2xl shadow border border-stone-200 flex flex-col" style="height: calc(100vh - 220px); min-height: 400px;">
		<div class="border-b border-stone-200 p-3">
			<p class="font-semibold text-stone-800">{otherName}</p>
			{#if thread?.listingTitle}
				<p class="text-xs text-stone-500">about: {thread.listingTitle}</p>
			{/if}
		</div>

		<div bind:this={listEl} class="flex-1 overflow-y-auto p-4 space-y-2 bg-stone-50">
			{#each messages as m (m.id)}
				{@const mine = m.sender === $authState.user.uid}
				<div class="flex {mine ? 'justify-end' : 'justify-start'}">
					<div class="max-w-[80%]">
						<div class="rounded-2xl px-4 py-2 {mine ? 'bg-orange-700 text-white' : 'bg-white border border-stone-200 text-stone-800'}">
							<p class="whitespace-pre-wrap break-words">{m.text}</p>
						</div>
						<p class="text-[10px] text-stone-400 mt-0.5 {mine ? 'text-right' : ''}">{fmtTime(m.ts)}</p>
					</div>
				</div>
			{/each}
			{#if messages.length === 0}
				<p class="text-center text-stone-500 text-sm mt-8">
					Send the first message. Introduce yourself and what you need or can offer.
				</p>
			{/if}
		</div>

		<form
			onsubmit={(e) => {
				e.preventDefault();
				send();
			}}
			class="p-3 border-t border-stone-200 flex gap-2"
		>
			<input
				bind:value={draft}
				type="text"
				maxlength="1000"
				placeholder="Type a message…"
				class="input input-bordered flex-1 bg-white"
			/>
			<button type="submit" class="btn bg-orange-700 text-white hover:bg-orange-800 border-0" disabled={!draft.trim()}>
				Send
			</button>
		</form>
	</div>
{/if}
