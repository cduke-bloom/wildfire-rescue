<script lang="ts">
	import { goto } from '$app/navigation';
	import { authState } from '$lib/stores/user';
	import { createListing } from '$lib/db';
	import {
		COUNTIES,
		LISTING_TYPE_LABEL,
		type County,
		type ListingType
	} from '$lib/types';

	const TYPES: ListingType[] = ['offer_shelter', 'need_shelter', 'offer_items', 'need_items'];

	let type = $state<ListingType>('offer_shelter');
	let title = $state('');
	let details = $state('');
	let county = $state<County>('Brantley');
	let city = $state('');

	// shelter prefs
	let petsOk = $state(true);
	let kidsOk = $state(true);
	let maxPeople = $state(4);
	let durationDays = $state(14);

	// items
	let itemsText = $state('');

	// Required for need_* listings
	let affectedAttestation = $state(false);

	let saving = $state(false);
	let error = $state('');

	const isShelter = $derived(type === 'offer_shelter' || type === 'need_shelter');
	const isItems = $derived(type === 'offer_items' || type === 'need_items');
	const isNeed = $derived(type === 'need_shelter' || type === 'need_items');

	async function save() {
		error = '';
		if (!$authState.user || !$authState.profile) {
			error = 'Please sign in first.';
			return;
		}
		if (!title.trim() || !details.trim()) {
			error = 'Please give it a short title and some details.';
			return;
		}
		if (isNeed && !affectedAttestation) {
			error = 'You must certify that you have been affected by the wildfire.';
			return;
		}
		saving = true;
		try {
			const items = isItems
				? itemsText
						.split(/[,\n]/)
						.map((s) => s.trim())
						.filter(Boolean)
				: undefined;
			const id = await createListing({
				ownerUid: $authState.user.uid,
				ownerName: $authState.profile.displayName,
				type,
				title: title.trim(),
				details: details.trim(),
				county,
				city: city.trim() || undefined,
				prefs: isShelter
					? { petsOk, kidsOk, maxPeople, durationDays }
					: undefined,
				items,
				active: false,
				affectedAttestation: isNeed ? true : undefined,
				affectedAttestationAt: isNeed ? Date.now() : undefined
			});
			await goto(`/listing/${id}/?just_posted=1`);
		} catch (e) {
			error = e instanceof Error ? e.message : 'Could not save.';
		} finally {
			saving = false;
		}
	}
</script>

{#if !$authState.ready}
	<p class="text-stone-600">Loading…</p>
{:else if !$authState.user}
	<div class="bg-white rounded-2xl p-6 border border-stone-200 shadow">
		<h1 class="text-xl font-bold text-orange-800">Sign in to post</h1>
		<p class="mt-2 text-stone-700">
			You need an account before you can post a listing.
			<a href="/signin/" class="underline text-orange-700">Sign in or create one →</a>
		</p>
	</div>
{:else}
	<h1 class="text-2xl font-bold text-orange-800">Post a listing</h1>
	<p class="mt-1 text-sm text-stone-600">Takes about a minute. You can edit or remove it later.</p>
	<div class="mt-3 bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-sm text-emerald-900">
		<strong>Please close your listing once your need is met.</strong> When you've found a host or
		your supplies have been delivered, mark it as fulfilled so others know it's no longer available.
		This is part of the community rules.
	</div>

	<form onsubmit={(e) => { e.preventDefault(); save(); }} class="mt-6 space-y-5 bg-white rounded-2xl p-5 shadow border border-stone-200">
		<label class="block">
			<span class="font-semibold text-stone-700">What kind of listing?</span>
			<select bind:value={type} class="select select-bordered w-full mt-1 bg-white">
				{#each TYPES as t}
					<option value={t}>{LISTING_TYPE_LABEL[t]}</option>
				{/each}
			</select>
		</label>

		<label class="block">
			<span class="font-semibold text-stone-700">Short title</span>
			<input
				bind:value={title}
				maxlength="80"
				class="input input-bordered w-full mt-1 bg-white"
				placeholder={type === 'offer_shelter'
					? 'Spare bedroom available for 2 weeks'
					: type === 'need_shelter'
						? 'Family of 4 needs a place to stay'
						: type === 'offer_items'
							? 'Formula, diapers, and baby supplies'
							: 'Need water, non-perishables, hygiene'}
			/>
		</label>

		<label class="block">
			<span class="font-semibold text-stone-700">Details</span>
			<textarea
				bind:value={details}
				rows="5"
				maxlength="1500"
				class="textarea textarea-bordered w-full mt-1 bg-white"
				placeholder="Share your situation, what you can offer, or what you need. Be specific but don't share your full address — that stays private until you decide to share it in chat."
			></textarea>
		</label>

		<div class="grid md:grid-cols-2 gap-4">
			<label class="block">
				<span class="font-semibold text-stone-700">County</span>
				<select bind:value={county} class="select select-bordered w-full mt-1 bg-white">
					{#each COUNTIES as c}
						<option value={c}>{c} County</option>
					{/each}
				</select>
			</label>
			<label class="block">
				<span class="font-semibold text-stone-700">City or nearest town <span class="text-stone-400 text-sm">(optional)</span></span>
				<input bind:value={city} class="input input-bordered w-full mt-1 bg-white" placeholder="e.g. Nahunta, Brunswick, Woodbine, Jesup" />
			</label>
		</div>

		{#if isShelter}
			<div class="bg-orange-50 rounded-xl p-4 space-y-3 border border-orange-100">
				<p class="font-semibold text-orange-900">Shelter details</p>
				<label class="flex items-center gap-2">
					<input type="checkbox" bind:checked={petsOk} class="checkbox checkbox-sm" />
					<span>Pets are okay</span>
				</label>
				<label class="flex items-center gap-2">
					<input type="checkbox" bind:checked={kidsOk} class="checkbox checkbox-sm" />
					<span>Children are welcome</span>
				</label>
				<div class="grid grid-cols-2 gap-3">
					<label class="block">
						<span class="text-sm text-stone-700">Max people</span>
						<input type="number" min="1" max="20" bind:value={maxPeople} class="input input-bordered w-full mt-1 bg-white" />
					</label>
					<label class="block">
						<span class="text-sm text-stone-700">Duration (days)</span>
						<input type="number" min="1" max="365" bind:value={durationDays} class="input input-bordered w-full mt-1 bg-white" />
					</label>
				</div>
			</div>
		{/if}

		{#if isItems}
			<label class="block">
				<span class="font-semibold text-stone-700">Items (comma-separated or one per line)</span>
				<textarea
					bind:value={itemsText}
					rows="4"
					class="textarea textarea-bordered w-full mt-1 bg-white"
					placeholder="formula, diapers, bottled water, deodorant, feminine hygiene products, non-perishable food"
				></textarea>
			</label>
		{/if}

		{#if isNeed}
			<label class="flex items-start gap-3 bg-rose-50 border border-rose-300 rounded-xl p-4 cursor-pointer">
				<input type="checkbox" bind:checked={affectedAttestation} class="checkbox mt-0.5" />
				<span class="text-sm text-stone-900">
					<strong class="text-rose-900">I certify that I or my household have been directly affected</strong>
					by the wildfire — for example, evacuated, lost a home, lost belongings,
					or otherwise displaced by the fire.
					<br /><br />
					I understand that submitting false information will result in my account being
					<strong>permanently banned</strong> from Southeast Georgia Wildfire Rescue and my listing removed.
				</span>
			</label>
		{/if}

		{#if error}
			<p class="text-rose-700 bg-rose-50 border border-rose-200 rounded p-2 text-sm">{error}</p>
		{/if}

		<button type="submit" class="btn bg-orange-700 text-white hover:bg-orange-800 border-0 w-full" disabled={saving}>
			{saving ? 'Posting…' : 'Post listing'}
		</button>
	</form>
{/if}
