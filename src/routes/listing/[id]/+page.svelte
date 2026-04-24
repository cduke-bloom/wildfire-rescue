<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { authState, signInWithGoogle } from '$lib/stores/user';
	import {
		blockUid,
		getListing,
		openOrCreateThread,
		submitReport,
		updateListing
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

	async function contact() {
		if (!$authState.user || !$authState.profile || !listing) return;
		const threadId = await openOrCreateThread(
			{ uid: $authState.user.uid, name: $authState.profile.displayName },
			{ uid: listing.ownerUid, name: listing.ownerName },
			{ id: listing.id, title: listing.title }
		);
		await goto(`/messages/${threadId}/`);
	}

	async function deactivate() {
		if (!listing) return;
		if (!confirm('Remove this listing from the board?')) return;
		await updateListing(listing.id, { active: false });
		await goto('/profile/');
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
				<button class="btn btn-outline border-rose-600 text-rose-700 hover:bg-rose-600 hover:text-white" onclick={deactivate}>
					Remove listing
				</button>
			{:else if $authState.user}
				<button class="btn bg-orange-700 text-white hover:bg-orange-800 border-0" onclick={contact}>
					💬 Message {listing.ownerName.split(' ')[0]}
				</button>
				<button class="btn btn-sm btn-ghost text-stone-600" onclick={report}>Report</button>
				<button class="btn btn-sm btn-ghost text-stone-600" onclick={block}>Block user</button>
			{:else if $authState.ready}
				<button class="btn bg-orange-700 text-white hover:bg-orange-800 border-0" onclick={signInWithGoogle}>
					Sign in to message
				</button>
			{/if}
		</div>
	</article>

	<p class="mt-4 text-xs text-stone-500 text-center">
		Remember: meet in a safe public place first. Don't share full address or sensitive info until you're comfortable.
	</p>
{/if}
