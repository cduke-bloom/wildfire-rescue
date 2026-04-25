<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { authState } from '$lib/stores/user';
	import {
		blockUid,
		closeListing,
		getListing,
		openOrCreateThread,
		reopenListing,
		submitReport
	} from '$lib/db';
	import { LISTING_TYPE_LABEL, type Listing } from '$lib/types';

	const id = $derived(page.params.id!);

	let listing = $state<Listing | null>(null);
	let loading = $state(true);
	let notFound = $state(false);

	onMount(async () => {
		try {
			const l = await getListing(id);
			if (!l) notFound = true;
			else listing = l;
		} finally {
			loading = false;
		}
	});

	let contactError = $state('');
	let contacting = $state(false);

	async function contact() {
		if (!$authState.user || !$authState.profile || !listing) return;
		contacting = true;
		contactError = '';
		try {
			const threadId = await openOrCreateThread(
				{ uid: $authState.user.uid, name: $authState.profile.displayName },
				{ uid: listing.ownerUid, name: listing.ownerName },
				{ id: listing.id, title: listing.title }
			);
			await goto(`/messages/${threadId}/`);
		} catch (e) {
			contactError = e instanceof Error ? e.message : 'Could not open chat.';
			console.error('contact failed', e);
		} finally {
			contacting = false;
		}
	}

	async function close() {
		if (!listing) return;
		if (
			!confirm(
				'Mark this listing as fulfilled?\n\nIt will no longer appear in Browse. You can reopen it from your profile if you need to.'
			)
		)
			return;
		await closeListing(listing.id);
		const fresh = await getListing(listing.id);
		if (fresh) listing = fresh;
	}

	async function reopen() {
		if (!listing) return;
		if (!confirm('Reopen this listing? It will appear in Browse again.')) return;
		await reopenListing(listing.id);
		const fresh = await getListing(listing.id);
		if (fresh) listing = fresh;
	}

	function ageDays(ts: number) {
		return Math.floor((Date.now() - ts) / 86400000);
	}

	async function report() {
		if (!$authState.user || !listing) return;
		const reason = prompt('Briefly, what is the problem with this listing?');
		if (!reason) return;
		await submitReport({
			fromUid: $authState.user.uid,
			targetUid: listing.ownerUid,
			targetType: 'listing',
			targetId: listing.id,
			reason
		});
		alert('Report submitted. Thank you.');
	}

	async function block() {
		if (!$authState.user || !listing) return;
		if (!confirm(`Block ${listing.ownerName}? You won't see their listings or messages anymore.`)) return;
		await blockUid($authState.user.uid, listing.ownerUid);
		await goto('/browse/');
	}

	const isMine = $derived(!!($authState.user && listing && $authState.user.uid === listing.ownerUid));
</script>

{#if loading}
	<p class="text-stone-600">Loading…</p>
{:else if notFound || !listing}
	<p class="text-stone-600">Listing not found or no longer active.</p>
	<a href="/browse/" class="text-orange-700 underline">Back to browse</a>
{:else}
	<a href="/browse/" class="text-sm text-orange-700 underline">← Back to browse</a>

	{#if listing.approvalStatus === 'pending'}
		<div class="mt-3 bg-amber-50 border border-amber-300 rounded-xl p-3 text-sm text-amber-900">
			⏳ This listing is awaiting moderator approval. It will appear in Browse once approved.
		</div>
	{:else if listing.approvalStatus === 'rejected'}
		<div class="mt-3 bg-rose-50 border border-rose-300 rounded-xl p-3 text-sm text-rose-900">
			❌ This listing was not approved. {listing.rejectionReason ? `Reason: ${listing.rejectionReason}` : ''}
		</div>
	{:else if listing.closedAt}
		<div class="mt-3 bg-emerald-50 border border-emerald-300 rounded-xl p-3 text-sm text-emerald-900">
			✅ Closed by the poster — this need has been fulfilled.
		</div>
	{:else if isMine && listing.active && ageDays(listing.createdAt) >= 5}
		<div class="mt-3 bg-amber-50 border border-amber-300 rounded-xl p-3 text-sm text-amber-900">
			<strong>This listing has been up for {ageDays(listing.createdAt)} days.</strong>
			If your need has been met or you've found a host, please mark it as fulfilled
			so others know it's no longer available.
			<button class="btn btn-xs bg-emerald-600 text-white border-0 hover:bg-emerald-700 ml-2" onclick={close}>
				✅ Mark as fulfilled
			</button>
		</div>
	{/if}

	<article class="mt-3 bg-white rounded-2xl shadow p-5 border border-stone-200">
		<div class="flex items-center justify-between gap-2">
			<span class="badge bg-orange-100 text-orange-800 border-0">{LISTING_TYPE_LABEL[listing.type]}</span>
			<span class="text-xs text-stone-500">
				{listing.county} County{listing.city ? ' · ' + listing.city : ''}
			</span>
		</div>
		<h1 class="text-2xl font-bold mt-2 text-stone-800">{listing.title}</h1>
		<p class="mt-1 text-sm text-stone-500">Posted by {listing.ownerName}</p>

		<p class="mt-4 whitespace-pre-line text-stone-800">{listing.details}</p>

		{#if listing.prefs}
			<div class="mt-4 bg-orange-50 rounded-xl p-4 border border-orange-100">
				<p class="font-semibold text-orange-900 mb-2">Host preferences</p>
				<ul class="text-sm text-stone-700 space-y-1">
					<li>👪 Up to {listing.prefs.maxPeople} people</li>
					<li>🐾 Pets: {listing.prefs.petsOk ? 'welcome' : 'no pets please'}</li>
					<li>🧒 Children: {listing.prefs.kidsOk ? 'welcome' : 'adults only'}</li>
					{#if listing.prefs.durationDays}<li>🗓 Up to ~{listing.prefs.durationDays} days</li>{/if}
				</ul>
			</div>
		{/if}

		{#if listing.items?.length}
			<div class="mt-4">
				<p class="font-semibold text-stone-700 mb-2">Items</p>
				<div class="flex flex-wrap gap-2">
					{#each listing.items as item}
						<span class="badge bg-stone-100 border-0">{item}</span>
					{/each}
				</div>
			</div>
		{/if}

		<div class="mt-6 flex flex-wrap gap-3 border-t pt-4 border-stone-200">
			{#if isMine}
				{#if listing.closedAt}
					<button class="btn bg-emerald-600 text-white border-0 hover:bg-emerald-700" onclick={reopen}>
						Reopen listing
					</button>
				{:else if listing.active}
					<button class="btn bg-emerald-600 text-white border-0 hover:bg-emerald-700" onclick={close}>
						✅ Mark as fulfilled
					</button>
				{/if}
				<a
					href={`/listing/${listing.id}/edit/`}
					class="btn btn-outline border-orange-600 text-orange-700 hover:bg-orange-600 hover:text-white"
				>
					Edit
				</a>
			{:else if $authState.user}
				<button
					class="btn bg-orange-700 text-white hover:bg-orange-800 border-0"
					onclick={contact}
					disabled={contacting}
				>
					{contacting ? 'Opening…' : `💬 Message ${listing.ownerName.split(' ')[0]}`}
				</button>
				<button class="btn btn-sm btn-ghost text-stone-600" onclick={report}>🚩 Report</button>
				<button class="btn btn-sm btn-ghost text-stone-600" onclick={block}>Block user</button>
			{:else if $authState.ready}
				<a href="/signin/" class="btn bg-orange-700 text-white hover:bg-orange-800 border-0">
					Sign in to message
				</a>
				<a href={`/report/?type=listing&target=${listing.id}`} class="btn btn-sm btn-ghost text-stone-600">
					🚩 Report
				</a>
			{/if}
		</div>

		{#if contactError}
			<p class="mt-3 text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded p-2">
				{contactError}
			</p>
		{/if}
	</article>

	<p class="mt-4 text-xs text-stone-500 text-center">
		Remember: meet in a safe public place first. Don't share full address or sensitive info until you're comfortable.
	</p>
{/if}
