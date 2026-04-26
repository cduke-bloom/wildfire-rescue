<script lang="ts">
	let { compact = false }: { compact?: boolean } = $props();
</script>

<div class={compact ? 'text-sm space-y-3 leading-relaxed' : 'prose prose-stone max-w-none'}>
	<h2 class={compact ? 'text-base font-bold text-stone-900 mt-0' : ''}>Be safe and respectful</h2>
	<ul>
		<li><strong>Treat everyone with dignity.</strong> No bullying, harassment, threats, intimidation, or persistent unwanted contact.</li>
		<li><strong>No hate speech or discrimination</strong> based on race, religion, sex, sexual orientation, gender identity, national origin, disability, or any other protected characteristic.</li>
		<li><strong>No verbal abuse, slurs, or insults.</strong></li>
		<li><strong>No false identities or false claims.</strong> Don't pretend to be someone you're not. Don't fabricate situations to manipulate others.</li>
		<li><strong>No sexual content or sexual solicitation</strong> of any kind.</li>
		<li><strong>No exploitation of vulnerable people.</strong> Don't take advantage of anyone in crisis.</li>
	</ul>

	<h2 class={compact ? 'text-base font-bold text-stone-900 mt-3' : ''}>No money, no commercial activity</h2>
	<ul>
		<li><strong>Never request, accept, or send money</strong> through this platform — not as rent, deposit, "gas money," "donations," or any other reason. This is a free, charity-only board.</li>
		<li><strong>No solicitation, advertising, or sales</strong> of any kind.</li>
		<li><strong>No commercial use.</strong> Items are donated freely and shelter is offered freely.</li>
	</ul>

	<h2 class={compact ? 'text-base font-bold text-stone-900 mt-3' : ''}>No illegal or dangerous behavior</h2>
	<ul>
		<li><strong>Don't break the law.</strong> No drugs, weapons, theft, or any other illegal activity.</li>
		<li><strong>Minors must always be accompanied by a legal parent or guardian</strong> when staying with a host.</li>
	</ul>

	<h2 class={compact ? 'text-base font-bold text-stone-900 mt-3' : ''}>Protect privacy</h2>
	<ul>
		<li><strong>Don't post personal info publicly</strong> in listings — no Social Security numbers, banking info, or sensitive personal details.</li>
		<li><strong>Share your address only in private messages</strong>, after you've established trust.</li>
	</ul>

	<h2 class={compact ? 'text-base font-bold text-stone-900 mt-3' : ''}>Use the platform honestly</h2>
	<ul>
		<li>
			<strong class="text-rose-900">Only request help if you've been affected by the wildfire.</strong>
			This board exists for people directly displaced or harmed by the wildfire that began in Brantley County and has spread across southeast Georgia.
			You will be asked to certify this when posting a "need" listing. Submitting false information
			will result in your account being <strong>permanently banned</strong> and your listings removed.
		</li>
		<li><strong>Don't use multiple accounts</strong> to manipulate the platform.</li>
		<li><strong>Don't repost the same listing repeatedly</strong> to game visibility.</li>
		<li>
			<strong>Close your listing once your need is met.</strong> When you've been hosted, found a guest, received the items, or your situation is otherwise resolved, mark your listing as fulfilled. Leaving stale listings up wastes other people's time and clutters the board.
		</li>
		<li><strong>Use the Report button</strong> on any listing or message to flag a violation. Use Block to stop seeing someone.</li>
	</ul>

	<h2 class={compact ? 'text-base font-bold text-rose-800 mt-4' : 'text-rose-800'}>You are on your own — read carefully</h2>
	<p>
		<strong>Southeast Georgia Wildfire Rescue is a community connector, not a vetting service.</strong>
		By using this platform, you accept the following:
	</p>
	<ul>
		<li><strong>We do not background-check users.</strong> Anyone can sign up.</li>
		<li><strong>We do not verify listings, identities, or stories.</strong></li>
		<li><strong>We do not inspect homes</strong> or guarantee safety, cleanliness, or honesty of any host or guest.</li>
		<li><strong>We do not mediate disputes.</strong> If a host and guest disagree, that is between them.</li>
		<li><strong>We do not provide insurance, refunds, replacements, or financial recourse</strong> of any kind.</li>
		<li><strong>You use this platform entirely at your own risk.</strong></li>
		<li>
			<strong>The platform creator, organizers, and volunteers are NOT responsible</strong> for any harm, loss, theft, injury, illness, property damage, or other negative outcome resulting from arrangements made through this platform.
		</li>
		<li><strong>You are solely responsible</strong> for your own decisions about who to host, whose help to accept, when and where to meet, and what information to share.</li>
		<li><strong>If something goes wrong, contact the appropriate authorities.</strong> Call <strong>911</strong> for emergencies, your local police for theft or harassment, or <strong>211</strong> / the Red Cross for shelter referrals.</li>
	</ul>

	<p class={compact ? 'mt-3 font-semibold' : 'font-semibold'}>
		By accepting, you acknowledge that you have read, understood, and agreed to all of the above. Violators may have listings suspended or accounts banned without notice.
	</p>
</div>
