<script lang="ts">
	import { authState, signOutUser } from '$lib/stores/user';
</script>

<div class="fixed inset-0 z-50 bg-stone-900/80 backdrop-blur-sm flex items-center justify-center p-4">
	<div class="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden">
		<header class="px-6 py-5 bg-rose-700 text-white">
			<h2 class="text-xl font-bold">Your account has been banned</h2>
		</header>
		<div class="p-6 space-y-4 text-stone-800">
			{#if $authState.profile?.bannedReason}
				<div>
					<p class="font-semibold text-stone-700">Reason given by moderators:</p>
					<p class="mt-1 bg-rose-50 border border-rose-200 rounded p-3 whitespace-pre-line">
						{$authState.profile.bannedReason}
					</p>
				</div>
			{/if}
			<p>
				You can no longer post listings, send messages, or take any action on
				Southeast Georgia Wildfire Rescue with this account.
			</p>
			<p>
				If you believe this was a mistake, contact a moderator. Creating a new
				account to evade this ban is a violation of the
				<a href="/about/" class="underline text-orange-700">community rules</a>
				and will result in any new account being banned.
			</p>
			<button
				class="btn bg-stone-700 text-white hover:bg-stone-800 border-0"
				onclick={signOutUser}
			>
				Sign out
			</button>
		</div>
	</div>
</div>
