<script lang="ts">
	import RulesContent from '$lib/components/RulesContent.svelte';
</script>

<h1 class="text-2xl font-bold text-orange-800">About & Community Rules</h1>

<section class="prose prose-stone max-w-none mt-4 bg-white rounded-2xl shadow border border-stone-200 p-6">
	<h2>What this is</h2>
	<p>
		<strong>Brantley Wildfire Rescue</strong> is a volunteer-built community board for neighbors in
		Brantley, Glynn, Camden, and Wayne counties, Georgia, affected by the wildfire. People who are
		displaced can post what they need, and people who want to help can offer a spare room or supplies.
		<strong>There are no money transactions, ever.</strong>
	</p>

	<h2>How it works</h2>
	<ol>
		<li>Create a free account with email and password, or continue with Google.</li>
		<li>Post a listing — either something you can offer, or something you need.</li>
		<li>Browse other listings and message people directly, inside the app.</li>
		<li>Meet in a safe public place first, then decide whether to continue.</li>
	</ol>

	<h2>See something wrong?</h2>
	<p>
		<a href="/report/"><strong>🚩 Report a problem</strong></a> from the footer of any page,
		or use the Report button on any listing or message. Anyone signed in can report. Reports go
		straight to volunteer moderators.
	</p>

	<h2>Other places to get help</h2>
	<ul>
		<li><strong>Dial 211</strong> — United Way's local assistance line.</li>
		<li><a href="https://www.redcross.org/get-help.html" target="_blank" rel="noopener">American Red Cross</a> — shelter and emergency supplies.</li>
		<li><a href="https://www.disasterassistance.gov/" target="_blank" rel="noopener">DisasterAssistance.gov</a> — FEMA federal aid.</li>
		<li><a href="https://www.airbnb.org/" target="_blank" rel="noopener">Airbnb.org</a> — free emergency housing program.</li>
		<li><a href="https://www.salvationarmyusa.org/usn/" target="_blank" rel="noopener">Salvation Army</a> — food, shelter, and emergency aid.</li>
	</ul>
</section>

<section class="mt-6 bg-white rounded-2xl shadow border border-stone-200 p-6">
	<h2 class="text-xl font-bold text-orange-800">Community Rules</h2>
	<p class="text-sm text-stone-600 mt-1">By using this platform you agree to follow these rules. Listings and accounts that violate them may be suspended or banned.</p>
	<div class="mt-4">
		<RulesContent />
	</div>
</section>
