<script lang="ts">
	import { onMount } from 'svelte';
	import { authState, updateProfile } from '$lib/stores/user';
	import { getMyListings, requestListingReview, resubmitForApproval, updateListing } from '$lib/db';
	import { COUNTIES, LISTING_TYPE_LABEL, type County, type Listing } from '$lib/types';

	let displayName = $state('');
	let county = $state<County | ''>('');
	let bio = $state('');
	let saving = $state(false);
	let saved = $state(false);

	let listings = $state<Listing[]>([]);

	$effect(() => {
		if ($authState.profile) {
			displayName = $authState.profile.displayName ?? '';
			county = ($authState.profile.county ?? '') as County | '';
			bio = $authState.profile.bio ?? '';
		}
	});

	onMount(async () => {
		if ($authState.user) {
			listings = await getMyListings($authState.user.uid);
		}
	});

	async function save() {
		if (!$authState.user) return;
		saving = true;
		saved = false;
		try {
			await updateProfile($authState.user.uid, {
				displayName: displayName.trim() || 'Anonymous',
				county: (county || undefined) as County | undefined,
				bio: bio.trim() || undefined
			});
			saved = true;
		} finally {
			saving = false;
		}
	}

	async function toggleActive(l: Listing) {
		// Don't let the owner re-activate a listing that an admin suspended
		if (l.suspended && !l.active) {
			alert('This listing was suspended by a moderator. Use "Request review" instead.');
			return;
		}
		await updateListing(l.id, { active: !l.active });
		if ($authState.user) listings = await getMyListings($authState.user.uid);
	}

	async function askReview(l: Listing) {
		const message = prompt(
			`Request review of "${l.title}"?\n\nMessage to moderators (explain why this should be restored):`
		);
		if (!message) return;
		await requestListingReview(l.id, message);
		if ($authState.user) listings = await getMyListings($authState.user.uid);
		alert('Review requested. A moderator will look at it soon.');
	}

	async function resubmit(l: Listing) {
		if (!confirm(`Resubmit "${l.title}" for approval?`)) return;
		await resubmitForApproval(l.id);
		if ($authState.user) listings = await getMyListings($authState.user.uid);
		alert('Resubmitted. A moderator will review it soon.');
	}

	function fmtDate(ts?: number) {
		if (!ts) return '';
		return new Date(ts).toLocaleString();
	}
</script>

{#if !$authState.ready}
	<p class="text-stone-600">Loading…</p>
{:else if !$authState.user || !$authState.profile}
	<p class="text-stone-600">Sign in to view your profile.</p>
{:else}
	<h1 class="text-2xl font-bold text-orange-800">Your profile</h1>

	<form onsubmit={(e) => { e.preventDefault(); save(); }} class="mt-4 bg-white rounded-2xl shadow border border-stone-200 p-5 space-y-4">
		<label class="block">
			<span class="font-semibold text-stone-700">Name</span>
			<input bind:value={displayName} class="input input-bordered w-full mt-1 bg-white" maxlength="60" />
		</label>
		<label class="block">
			<span class="font-semibold text-stone-700">County</span>
			<select bind:value={county} class="select select-bordered w-full mt-1 bg-white">
				<option value="">— choose —</option>
				{#each COUNTIES as c}
					<option value={c}>{c} County</option>
				{/each}
			</select>
		</label>
		<label class="block">
			<span class="font-semibold text-stone-700">Short bio <span class="text-stone-400 text-sm">(optional)</span></span>
			<textarea bind:value={bio} rows="3" maxlength="400" class="textarea textarea-bordered w-full mt-1 bg-white"
				placeholder="A couple of lines about yourself. Helps people decide whether to reach out."></textarea>
		</label>
		<button type="submit" class="btn bg-orange-700 text-white hover:bg-orange-800 border-0" disabled={saving}>
			{saving ? 'Saving…' : 'Save'}
		</button>
		{#if saved}<span class="ml-2 text-emerald-700 text-sm">Saved.</span>{/if}
	</form>

	<h2 class="text-xl font-bold text-orange-800 mt-8">Your listings</h2>
	{#if listings.length === 0}
		<p class="mt-2 text-stone-600">You haven't posted anything yet. <a href="/listing/new/" class="underline text-orange-700">Post one</a>.</p>
	{:else}
		<ul class="mt-3 space-y-3">
			{#each listings as l (l.id)}
				{@const pending = l.approvalStatus === 'pending'}
				{@const rejected = l.approvalStatus === 'rejected'}
				{@const status = l.suspended
					? '🚫 suspended by moderator'
					: pending
						? '⏳ awaiting approval'
						: rejected
							? '❌ not approved'
							: l.active
								? '✅ active'
								: '💤 inactive'}
				<li class="bg-white rounded-xl border p-4 {l.suspended || rejected ? 'border-rose-300' : pending ? 'border-amber-300' : 'border-stone-200'}">
					<div class="flex justify-between items-start gap-3">
						<div class="min-w-0">
							<a href={`/listing/${l.id}/`} class="font-semibold text-stone-800 hover:underline">{l.title}</a>
							<p class="text-xs text-stone-500 mt-0.5">
								{LISTING_TYPE_LABEL[l.type]} · {l.county} County · {status}
							</p>
						</div>
						{#if !l.suspended && !pending && !rejected}
							<button class="btn btn-sm btn-outline shrink-0" onclick={() => toggleActive(l)}>
								{l.active ? 'Deactivate' : 'Reactivate'}
							</button>
						{/if}
					</div>

					{#if pending}
						<div class="mt-3 bg-amber-50 border border-amber-200 rounded p-3 text-sm">
							A moderator will review this listing before it appears in Browse. You'll get a message in your inbox once it's approved.
						</div>
					{/if}

					{#if rejected}
						<div class="mt-3 bg-rose-50 border border-rose-200 rounded p-3 text-sm">
							<p class="font-semibold text-rose-900">Not approved</p>
							<p class="text-rose-800 mt-1">Reason: {l.rejectionReason ?? '(not provided)'}</p>
						</div>
						<button class="btn btn-sm btn-outline border-amber-500 text-amber-700 hover:bg-amber-50 mt-2" onclick={() => resubmit(l)}>
							Resubmit for approval
						</button>
					{/if}

					{#if l.suspended}
						<div class="mt-3 bg-rose-50 border border-rose-200 rounded p-3 text-sm">
							<p class="font-semibold text-rose-900">Suspended {fmtDate(l.suspendedAt)}</p>
							<p class="text-rose-800 mt-1">Reason: {l.suspendedReason ?? '(not provided)'}</p>
						</div>
						{#if l.reviewRequestedAt}
							<p class="mt-2 text-xs text-amber-700">Review requested {fmtDate(l.reviewRequestedAt)} — pending moderator response.</p>
						{:else}
							<button class="btn btn-sm btn-outline border-amber-500 text-amber-700 hover:bg-amber-50 mt-2" onclick={() => askReview(l)}>
								Request review
							</button>
						{/if}
					{/if}
				</li>
			{/each}
		</ul>
	{/if}
{/if}
