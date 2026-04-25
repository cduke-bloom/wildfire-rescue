<script lang="ts">
	import { authState, acceptTos, signOutUser } from '$lib/stores/user';
	import RulesContent from './RulesContent.svelte';

	let agreed = $state(false);
	let saving = $state(false);

	async function accept() {
		if (!$authState.user || !agreed) return;
		saving = true;
		try {
			await acceptTos($authState.user.uid);
		} finally {
			saving = false;
		}
	}
</script>

<div class="fixed inset-0 z-50 bg-stone-900/70 backdrop-blur-sm flex items-center justify-center p-3 md:p-6">
	<div class="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl">
		<header class="px-5 py-4 border-b border-stone-200 bg-orange-700 text-white rounded-t-2xl">
			<h2 class="text-lg md:text-xl font-bold">Welcome — please read the community rules</h2>
			<p class="text-sm opacity-90 mt-0.5">You only need to do this once.</p>
		</header>

		<div class="flex-1 overflow-y-auto px-5 py-4">
			<RulesContent compact />
		</div>

		<footer class="px-5 py-4 border-t border-stone-200 bg-stone-50 rounded-b-2xl space-y-3">
			<label class="flex items-start gap-3 cursor-pointer">
				<input
					type="checkbox"
					bind:checked={agreed}
					class="checkbox mt-0.5"
				/>
				<span class="text-sm text-stone-800">
					I have read, understood, and agree to follow these rules. I accept that the platform takes no responsibility for any arrangements made or outcomes that occur.
				</span>
			</label>
			<div class="flex flex-col-reverse md:flex-row gap-2 md:justify-end">
				<button class="btn btn-ghost text-stone-600" onclick={signOutUser}>
					Decline & sign out
				</button>
				<button
					class="btn bg-orange-700 text-white hover:bg-orange-800 border-0 disabled:bg-stone-300"
					disabled={!agreed || saving}
					onclick={accept}
				>
					{saving ? 'Saving…' : 'I agree, continue'}
				</button>
			</div>
		</footer>
	</div>
</div>
