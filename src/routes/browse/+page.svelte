<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { authState } from '$lib/stores/user';
	import { subscribeListings } from '$lib/db';
	import {
		BROWSE_FILTER,
		COUNTIES,
		LISTING_TYPE_LABEL,
		type County,
		type Listing,
		type ListingType
	} from '$lib/types';

	const TYPES: ListingType[] = ['offer_shelter', 'offer_items', 'need_shelter', 'need_items'];

	let type = $state<ListingType | ''>('');
	let county = $state<County | ''>('');
	let listings = $state<Listing[]>([]);
	let unsub: (() => void) | null = null;

	function sync() {
		const t = page.url.searchParams.get('type') as ListingType | null;
		const c = page.url.searchParams.get('county') as County | null;
		type = t && TYPES.includes(t) ? t : '';
		county = c && COUNTIES.includes(c) ? c : '';
		resubscribe();
	}

	function resubscribe() {
		unsub?.();
		unsub = subscribeListings(
			{ type: type || undefined, county: county || undefined },
			(items) => (listings = items)
		);
	}

	function updateFilters() {
		const params = new URLSearchParams();
		if (type) params.set('type', type);
		if (county) params.set('county', county);
		goto(`/browse/${params.toString() ? '?' + params.toString() : ''}`, {
			replaceState: true,
			noScroll: true
		});
		resubscribe();
	}

	function selectType(t: ListingType | '') {
		type = t;
		updateFilters();
	}

	onMount(sync);
	onDestroy(() => unsub?.());

	const visible = $derived(
		listings.filter((l) => !$authState.profile?.blocked?.includes(l.ownerUid))
	);

	function badgeClass(t: ListingType) {
		if (t === 'offer_shelter') return 'badge bg-emerald-100 text-emerald-800 border-0';
		if (t === 'need_shelter') return 'badge bg-orange-100 text-orange-800 border-0';
		if (t === 'offer_items') return 'badge bg-sky-100 text-sky-800 border-0';
		return 'badge bg-rose-100 text-rose-800 border-0';
	}
</script>

<h1 class="text-2xl font-bold text-orange-800">Browse</h1>
<p class="text-sm text-stone-600 mt-1">What are you looking for?</p>

<div class="mt-3 grid grid-cols-2 md:grid-cols-4 gap-2">
	{#each TYPES as t}
		{@const f = BROWSE_FILTER[t]}
		<button
			type="button"
			onclick={() => selectType(type === t ? '' : t)}
			class={`text-left rounded-xl border p-3 transition ${f.classes} ${type === t ? 'ring-2 ring-orange-500' : ''}`}
		>
			<div class="text-2xl">{f.emoji}</div>
			<div class="font-semibold mt-1 text-sm">{f.label}</div>
			<div class="text-xs opacity-80 mt-0.5">{f.sub}</div>
		</button>
	{/each}
</div>

{#if type}
	<button
		class="mt-3 text-sm text-orange-700 underline"
		onclick={() => selectType('')}
	>
		Clear filter — show everything
	</button>
{/if}

<label class="mt-4 flex flex-wrap items-center gap-2">
	<span class="text-sm text-stone-700">In:</span>
	<select
		class="select select-bordered bg-white"
		bind:value={county}
		onchange={updateFilters}
	>
		<option value="">All counties</option>
		{#each COUNTIES as c}
			<option value={c}>{c} County</option>
		{/each}
	</select>
</label>

{#if visible.length === 0}
	<p class="mt-10 text-center text-stone-600">
		No listings match your filters yet.
		{#if $authState.user}
			<br /><a class="text-orange-700 underline" href="/listing/new/">Post the first one →</a>
		{/if}
	</p>
{:else}
	<ul class="mt-5 grid gap-3 md:grid-cols-2">
		{#each visible as l (l.id)}
			<li class="bg-white rounded-2xl border border-stone-200 shadow-sm p-4 hover:shadow-md">
				<a href={`/listing/${l.id}/`} class="block">
					<div class="flex items-center justify-between gap-2">
						<span class={badgeClass(l.type)}>{LISTING_TYPE_LABEL[l.type]}</span>
						<span class="text-xs text-stone-500">{l.county} County</span>
					</div>
					<h2 class="font-bold text-lg mt-2 text-stone-800">{l.title}</h2>
					<p class="text-stone-600 mt-1 text-sm line-clamp-3">{l.details}</p>
					{#if l.items?.length}
						<div class="mt-2 flex flex-wrap gap-1">
							{#each l.items.slice(0, 6) as item}
								<span class="badge badge-sm bg-stone-100 border-0">{item}</span>
							{/each}
							{#if l.items.length > 6}
								<span class="text-xs text-stone-500">+{l.items.length - 6} more</span>
							{/if}
						</div>
					{/if}
					{#if l.prefs}
						<div class="mt-2 text-xs text-stone-600 flex flex-wrap gap-2">
							<span>👪 up to {l.prefs.maxPeople}</span>
							{#if l.prefs.petsOk}<span>🐾 pets ok</span>{/if}
							{#if l.prefs.kidsOk}<span>🧒 kids ok</span>{/if}
							{#if l.prefs.durationDays}<span>🗓 ~{l.prefs.durationDays}d</span>{/if}
						</div>
					{/if}
					<p class="mt-3 text-xs text-stone-500">Posted by {l.ownerName}</p>
				</a>
			</li>
		{/each}
	</ul>
{/if}
