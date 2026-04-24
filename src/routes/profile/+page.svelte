<script lang="ts">
	import { onMount } from 'svelte';
	import { authState, updateProfile, acceptTos } from '$lib/stores/user';
	import { getMyListings, updateListing } from '$lib/db';
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
		await updateListing(l.id, { active: !l.active });
		if ($authState.user) listings = await getMyListings($authState.user.uid);
	}

	async function acceptTerms() {
		if ($authState.user) await acceptTos($authState.user.uid);
	}
</script>

{#if !$authState.ready}
	<p class="text-stone-600">Loading…</p>
{:else if !$authState.user || !$authState.profile}
	<p class="text-stone-600">Sign in to view your profile.</p>
{:else}
	{#if !$authState.profile.acceptedTosAt}
		<div class="bg-amber-50 border border-amber-300 rounded-2xl p-5 mb-6">
			<h2 class="font-bold text-amber-900">Please read and accept before posting or messaging</h2>
			<ul class="mt-2 text-sm text-stone-800 list-disc pl-5 space-y-1">
				<li>Brantley Wildfire Rescue is a volunteer community board. We do not verify users or listings.</li>
				<li>Never exchange money through this platform. Report anyone who asks for payment.</li>
				<li>Meet in a safe public place first. Don't share your full address until you're comfortable.</li>
				<li>You use this service at your own risk. The organizers are not responsible for interactions between users.</li>
				<li>Don't post anything hateful, dangerous, or illegal.</li>
			</ul>
			<button class="btn bg-orange-700 text-white hover:bg-orange-800 border-0 mt-4" onclick={acceptTerms}>
				I understand and accept
			</button>
		</div>
	{/if}

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
		<ul class="mt-3 space-y-2">
			{#each listings as l (l.id)}
				<li class="bg-white rounded-xl border border-stone-200 p-4 flex justify-between items-center">
					<div>
						<a href={`/listing/${l.id}/`} class="font-semibold text-stone-800 hover:underline">{l.title}</a>
						<p class="text-xs text-stone-500 mt-0.5">{LISTING_TYPE_LABEL[l.type]} · {l.county} County · {l.active ? 'active' : 'inactive'}</p>
					</div>
					<button class="btn btn-sm btn-outline" onclick={() => toggleActive(l)}>
						{l.active ? 'Deactivate' : 'Reactivate'}
					</button>
				</li>
			{/each}
		</ul>
	{/if}
{/if}
