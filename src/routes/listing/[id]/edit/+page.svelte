<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { authState } from '$lib/stores/user';
	import { getListing, ownerEditListing } from '$lib/db';
	import {
		COUNTIES,
		LISTING_TYPE_LABEL,
		type County,
		type Listing,
		type ListingType
	} from '$lib/types';

	const TYPES: ListingType[] = ['offer_shelter', 'need_shelter', 'offer_items', 'need_items'];
	const id = $derived(page.params.id!);

	let loading = $state(true);
	let notFound = $state(false);
	let notOwner = $state(false);

	let type = $state<ListingType>('offer_shelter');
	let title = $state('');
	let details = $state('');
	let county = $state<County>('Brantley');
	let city = $state('');

	let petsOk = $state(true);
	let kidsOk = $state(true);
	let maxPeople = $state(4);
	let durationDays = $state(14);

	let itemsText = $state('');

	let saving = $state(false);
	let error = $state('');

	const isShelter = $derived(type === 'offer_shelter' || type === 'need_shelter');
	const isItems = $derived(type === 'offer_items' || type === 'need_items');

	let didLoad = false;

	$effect(() => {
		if (didLoad || !$authState.ready) return;
		didLoad = true;
		if (!$authState.user) {
			notOwner = true;
			loading = false;
			return;
		}
		void load($authState.user.uid);
	});

	async function load(uid: string) {
		try {
			const l = await getListing(id);
			if (!l) {
				notFound = true;
				return;
			}
			if (l.ownerUid !== uid) {
				notOwner = true;
				return;
			}
			type = l.type;
			title = l.title;
			details = l.details;
			county = l.county;
			city = l.city ?? '';
			if (l.prefs) {
				petsOk = l.prefs.petsOk;
				kidsOk = l.prefs.kidsOk;
				maxPeople = l.prefs.maxPeople;
				durationDays = l.prefs.durationDays ?? 14;
			}
			if (l.items) itemsText = l.items.join(', ');
		} finally {
			loading = false;
		}
	}

	async function save() {
		error = '';
		if (!$authState.user) return;
		if (!title.trim() || !details.trim()) {
			error = 'Please give it a short title and some details.';
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
			await ownerEditListing(id, {
				type,
				title: title.trim(),
				details: details.trim(),
				county,
				city: city.trim() || undefined,
				prefs: isShelter ? { petsOk, kidsOk, maxPeople, durationDays } : undefined,
				items
			});
			await goto(`/listing/${id}/`);
		} catch (e) {
			error = e instanceof Error ? e.message : 'Could not save.';
		} finally {
			saving = false;
		}
	}
</script>

{#if loading}
	<p class="text-stone-600">Loading…</p>
{:else if notFound}
	<p class="text-stone-600">Listing not found.</p>
	<a href="/profile/" class="text-orange-700 underline">Back to your profile</a>
{:else if notOwner}
	<p class="text-stone-600">You can only edit your own listings.</p>
	<a href={`/listing/${id}/`} class="text-orange-700 underline">Back to listing</a>
{:else}
	<a href={`/listing/${id}/`} class="text-sm text-orange-700 underline">← Back to listing</a>

	<h1 class="mt-2 text-2xl font-bold text-orange-800">Edit listing</h1>
	<div class="mt-2 bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-900">
		Heads up — saving an edit puts your listing back into the moderator queue. It will be hidden from Browse until it's re-approved.
	</div>

	<form onsubmit={(e) => { e.preventDefault(); save(); }} class="mt-4 space-y-5 bg-white rounded-2xl p-5 shadow border border-stone-200">
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
			<input bind:value={title} maxlength="80" class="input input-bordered w-full mt-1 bg-white" />
		</label>

		<label class="block">
			<span class="font-semibold text-stone-700">Details</span>
			<textarea bind:value={details} rows="5" maxlength="1500" class="textarea textarea-bordered w-full mt-1 bg-white"></textarea>
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
				<input bind:value={city} class="input input-bordered w-full mt-1 bg-white" />
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
				<textarea bind:value={itemsText} rows="4" class="textarea textarea-bordered w-full mt-1 bg-white"></textarea>
			</label>
		{/if}

		{#if error}
			<p class="text-rose-700 bg-rose-50 border border-rose-200 rounded p-2 text-sm">{error}</p>
		{/if}

		<button type="submit" class="btn bg-orange-700 text-white hover:bg-orange-800 border-0 w-full" disabled={saving}>
			{saving ? 'Saving…' : 'Save changes'}
		</button>
	</form>
{/if}
