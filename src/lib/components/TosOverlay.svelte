<script lang="ts">
	import { authState, acceptTosAndSignWaiver, signOutUser } from '$lib/stores/user';
	import RulesContent from './RulesContent.svelte';
	import WaiverContent from './WaiverContent.svelte';

	let agreed = $state(false);
	let signedName = $state($authState.profile?.displayName ?? '');
	let saving = $state(false);
	let error = $state('');

	const today = new Date().toLocaleDateString(undefined, {
		year: 'numeric',
		month: 'long',
		day: 'numeric'
	});

	async function accept() {
		if (!$authState.user) return;
		const name = signedName.trim();
		if (name.length < 2) {
			error = 'Please type your full name as your electronic signature.';
			return;
		}
		if (!agreed) {
			error = 'Please check the box to confirm you agree.';
			return;
		}
		error = '';
		saving = true;
		try {
			await acceptTosAndSignWaiver($authState.user.uid, name);
		} catch (e) {
			error = e instanceof Error ? e.message : 'Could not save. Please try again.';
		} finally {
			saving = false;
		}
	}
</script>

<div class="fixed inset-0 z-50 bg-stone-900/70 backdrop-blur-sm flex items-center justify-center p-3 md:p-6">
	<div class="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl">
		<header class="px-5 py-4 border-b border-stone-200 bg-orange-700 text-white rounded-t-2xl">
			<h2 class="text-lg md:text-xl font-bold">Welcome — please review and sign</h2>
			<p class="text-sm opacity-90 mt-0.5">
				You only need to do this once. By signing you agree to the community rules and the
				liability waiver below.
			</p>
		</header>

		<div class="flex-1 overflow-y-auto px-5 py-4 space-y-6">
			<section>
				<h3 class="text-base font-bold text-orange-800 uppercase tracking-wide mb-3">
					Part 1 — Community Rules
				</h3>
				<RulesContent compact />
			</section>

			<hr class="border-stone-200" />

			<section>
				<h3 class="text-base font-bold text-rose-800 uppercase tracking-wide mb-3">
					Part 2 — Waiver of Liability
				</h3>
				<WaiverContent compact />
			</section>
		</div>

		<footer class="px-5 py-4 border-t border-stone-200 bg-stone-50 rounded-b-2xl space-y-3">
			<div class="bg-white border border-stone-300 rounded-lg p-3 space-y-2">
				<label class="block">
					<span class="text-xs font-semibold text-stone-700 uppercase tracking-wide">
						Type your full name as electronic signature
					</span>
					<input
						bind:value={signedName}
						type="text"
						maxlength="80"
						required
						class="input input-bordered w-full mt-1 bg-white"
						placeholder="First and last name"
						style="font-family: 'Snell Roundhand', 'Apple Chancery', cursive;"
					/>
				</label>
				<p class="text-xs text-stone-500">Date: {today}</p>
			</div>

			<label class="flex items-start gap-3 cursor-pointer">
				<input type="checkbox" bind:checked={agreed} class="checkbox mt-0.5" />
				<span class="text-sm text-stone-800">
					I have read and agree to <strong>both</strong> the Community Rules and the Waiver of
					Liability above. By typing my name and clicking <em>Sign and continue</em>, I am
					providing my electronic signature, which has the same legal effect as a handwritten
					signature.
				</span>
			</label>

			{#if error}
				<p class="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded p-2">{error}</p>
			{/if}

			<div class="flex flex-col-reverse md:flex-row gap-2 md:justify-end">
				<button class="btn btn-ghost text-stone-600" onclick={signOutUser}>
					Decline & sign out
				</button>
				<button
					class="btn bg-orange-700 text-white hover:bg-orange-800 border-0 disabled:bg-stone-300"
					disabled={saving}
					onclick={accept}
				>
					{saving ? 'Saving…' : 'Sign and continue'}
				</button>
			</div>
		</footer>
	</div>
</div>
