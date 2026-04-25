<script lang="ts">
	import { authState } from '$lib/stores/user';
</script>

<section class="py-8 md:py-14 text-center">
	<h1 class="text-3xl md:text-5xl font-bold text-orange-800 leading-tight">
		Help for families displaced by the wildfire.
	</h1>
	<p class="mt-4 text-lg text-stone-700 max-w-2xl mx-auto">
		A free community board connecting neighbors in <strong>Brantley</strong>,
		<strong>Glynn</strong>, and <strong>Camden</strong> counties. Offer a spare room,
		request a place to stay, share supplies, or ask for what you need.
	</p>
	<p class="mt-2 text-sm text-stone-600">No money. No middlemen. Neighbors helping neighbors.</p>

	<div class="mt-6 flex flex-wrap gap-3 justify-center">
		<a href="/browse/" class="btn bg-orange-700 text-white hover:bg-orange-800 border-0">Browse listings</a>
		{#if $authState.user}
			<a href="/listing/new/" class="btn btn-outline border-orange-700 text-orange-700 hover:bg-orange-700 hover:text-white">Post a listing</a>
		{:else if $authState.ready}
			<a href="/signin/" class="btn btn-outline border-orange-700 text-orange-700 hover:bg-orange-700 hover:text-white">
				Sign in to post
			</a>
		{/if}
	</div>
</section>

<section class="grid md:grid-cols-2 gap-4 mt-8">
	<a
		href="/browse/?type=offer_shelter"
		class="rounded-2xl bg-white shadow p-5 hover:shadow-lg border border-stone-200"
	>
		<div class="text-3xl">🏠</div>
		<h2 class="font-bold text-lg mt-2">Need a place to stay?</h2>
		<p class="text-stone-600 mt-1 text-sm">Browse neighbors offering a spare room, trailer, or empty home.</p>
	</a>
	<a
		href="/browse/?type=offer_items"
		class="rounded-2xl bg-white shadow p-5 hover:shadow-lg border border-stone-200"
	>
		<div class="text-3xl">🎁</div>
		<h2 class="font-bold text-lg mt-2">Need supplies?</h2>
		<p class="text-stone-600 mt-1 text-sm">Find donated water, food, hygiene products, clothing, and more.</p>
	</a>
	<a
		href="/browse/?type=need_shelter"
		class="rounded-2xl bg-white shadow p-5 hover:shadow-lg border border-stone-200"
	>
		<div class="text-3xl">🤝</div>
		<h2 class="font-bold text-lg mt-2">Want to host a family?</h2>
		<p class="text-stone-600 mt-1 text-sm">See who needs help and reach out directly.</p>
	</a>
	<a
		href="/browse/?type=need_items"
		class="rounded-2xl bg-white shadow p-5 hover:shadow-lg border border-stone-200"
	>
		<div class="text-3xl">📦</div>
		<h2 class="font-bold text-lg mt-2">Want to donate items?</h2>
		<p class="text-stone-600 mt-1 text-sm">See what people are asking for — formula, diapers, water, and more.</p>
	</a>
</section>

<section class="mt-10 bg-orange-50 border border-orange-200 rounded-2xl p-5 text-sm text-stone-700">
	<h3 class="font-bold text-orange-800 mb-2">Your safety matters.</h3>
	<p>
		This is a volunteer community board. We don't verify listings or background-check users. Meet in public places
		first, trust your instincts, and report anything suspicious. If you're in immediate need, please also contact
		<a href="https://www.redcross.org/get-help.html" class="underline" target="_blank" rel="noopener">the Red Cross</a>
		or call 211. See <a href="/about/" class="underline">About & Safety</a> for more.
	</p>
</section>
