<script lang="ts">
	let { compact = false }: { compact?: boolean } = $props();
</script>

<div class={compact ? 'text-sm space-y-3 leading-relaxed' : 'prose prose-stone max-w-none'}>
	<p class={compact ? 'font-bold text-stone-900 uppercase tracking-wide text-xs' : 'font-bold uppercase'}>
		Waiver of Liability and Assumption of Risk
	</p>

	<p>
		In consideration for being voluntarily and of my own volition in participating in the
		activities provided by this website and its organizers and creators
		(<strong>"Provider"</strong>), I, the undersigned, acknowledge and agree as follows:
	</p>

	<ol class="space-y-3">
		<li>
			<strong>Assumption of Risk.</strong>
			I understand that participation in the activities involves inherent risks, including but not
			limited to bodily injury, illness, property damage, or death. I voluntarily assume all such
			risks, whether known or unknown, and accept full responsibility for my participation.
		</li>
		<li>
			<strong>Waiver and Release of Liability.</strong>
			To the fullest extent permitted by the laws of the State of Georgia, I hereby release, waive,
			discharge, and covenant not to sue the Provider, its owners, officers, employees, agents,
			contractors, and affiliates (collectively, <strong>"Released Parties"</strong>) from any and
			all liability, claims, demands, actions, or causes of action arising out of or related to any
			loss, damage, or injury, including death, that may be sustained by me, whether caused by
			negligence or any other behavior of the Released Parties or otherwise, while participating in
			the activities.
		</li>
		<li>
			<strong>Indemnification.</strong>
			I agree to indemnify and hold harmless the Released Parties from any loss, liability, damage,
			or costs, including attorney's fees, arising from my participation in the activities, whether
			caused by my own actions or otherwise.
		</li>
		<li>
			<strong>Severability.</strong>
			If any portion of this agreement is held invalid or unenforceable, the remaining portions
			shall continue in full force and effect.
		</li>
		<li>
			<strong>Governing Law.</strong>
			This agreement shall be governed by and construed in accordance with the laws of the State of
			Georgia.
		</li>
	</ol>

	<p class={compact ? 'mt-3 font-semibold uppercase text-xs' : 'font-semibold uppercase'}>
		I have read this Waiver of Liability and Assumption of Risk, fully understand its terms, and
		understand that I am giving up substantial rights by signing it. I sign it freely and voluntarily
		without any inducement.
	</p>
</div>
