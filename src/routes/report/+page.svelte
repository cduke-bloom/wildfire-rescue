<script lang="ts">
	import { page } from '$app/state';
	import { authState } from '$lib/stores/user';
	import { submitReport } from '$lib/db';
	import type { ReportTargetType } from '$lib/types';

	const presetType = (page.url.searchParams.get('type') as ReportTargetType) || 'other';
	const presetTarget = page.url.searchParams.get('target') ?? '';

	let targetType = $state<ReportTargetType>(presetType);
	let targetId = $state(presetTarget);
	let targetName = $state('');
	let reason = $state('');
	let submitting = $state(false);
	let submitted = $state(false);
	let error = $state('');

	async function submit() {
		if (!$authState.user) {
			error = 'Please sign in to submit a report.';
			return;
		}
		if (!reason.trim()) {
			error = 'Please describe what happened.';
			return;
		}
		error = '';
		submitting = true;
		try {
			await submitReport({
				fromUid: $authState.user.uid,
				targetType,
				targetId: targetId.trim() || undefined,
				targetUid: undefined,
				reason:
					(targetName.trim() ? `[${targetName.trim()}] ` : '') + reason.trim()
			});
			submitted = true;
		} catch (e) {
			error = e instanceof Error ? e.message : 'Could not submit. Please try again.';
		} finally {
			submitting = false;
		}
	}
</script>

<a href="/" class="text-sm text-orange-700 underline">← Back home</a>
<h1 class="mt-2 text-2xl font-bold text-orange-800">Report a problem</h1>
<p class="mt-1 text-stone-700">
	Tell us about anything that breaks the
	<a href="/about/" class="underline">community rules</a> — bullying, harassment,
	scams, money requests, suspicious behavior, or anything that doesn't feel right.
	A volunteer moderator will review your report.
</p>
<p class="mt-2 text-sm text-rose-700">
	<strong>If you are in immediate danger, call 911 first.</strong>
</p>

{#if submitted}
	<div class="mt-6 bg-emerald-50 border border-emerald-300 rounded-2xl p-5">
		<h2 class="font-bold text-emerald-900">Thank you — report submitted.</h2>
		<p class="mt-2 text-stone-700">
			A moderator will review it. We don't reply to every report individually, but we
			act on credible ones quickly. If you reported a specific user, you may also want
			to <strong>Block</strong> them from their listing or your message thread with them.
		</p>
		<a href="/" class="btn bg-orange-700 text-white hover:bg-orange-800 border-0 mt-4">Back home</a>
	</div>
{:else}
	<form onsubmit={(e) => { e.preventDefault(); submit(); }} class="mt-5 bg-white rounded-2xl border border-stone-200 shadow p-5 space-y-5">
		<fieldset>
			<legend class="font-semibold text-stone-700">What are you reporting?</legend>
			<div class="mt-2 grid sm:grid-cols-2 gap-2">
				<label class="flex items-center gap-2 p-3 border rounded-lg cursor-pointer {targetType === 'listing' ? 'border-orange-600 bg-orange-50' : 'border-stone-200'}">
					<input type="radio" bind:group={targetType} value="listing" />
					<span>A listing</span>
				</label>
				<label class="flex items-center gap-2 p-3 border rounded-lg cursor-pointer {targetType === 'user' ? 'border-orange-600 bg-orange-50' : 'border-stone-200'}">
					<input type="radio" bind:group={targetType} value="user" />
					<span>A user</span>
				</label>
				<label class="flex items-center gap-2 p-3 border rounded-lg cursor-pointer {targetType === 'message' ? 'border-orange-600 bg-orange-50' : 'border-stone-200'}">
					<input type="radio" bind:group={targetType} value="message" />
					<span>A message</span>
				</label>
				<label class="flex items-center gap-2 p-3 border rounded-lg cursor-pointer {targetType === 'other' ? 'border-orange-600 bg-orange-50' : 'border-stone-200'}">
					<input type="radio" bind:group={targetType} value="other" />
					<span>Something else</span>
				</label>
			</div>
		</fieldset>

		{#if targetType === 'listing'}
			<label class="block">
				<span class="font-semibold text-stone-700">Listing ID or URL <span class="text-stone-400 text-sm">(optional)</span></span>
				<input
					bind:value={targetId}
					class="input input-bordered w-full mt-1 bg-white"
					placeholder="paste the listing URL or leave blank"
				/>
			</label>
		{:else if targetType === 'user'}
			<label class="block">
				<span class="font-semibold text-stone-700">Person's name on this site <span class="text-stone-400 text-sm">(optional)</span></span>
				<input
					bind:value={targetName}
					class="input input-bordered w-full mt-1 bg-white"
					placeholder="e.g. how they appeared in the app"
				/>
			</label>
		{/if}

		<label class="block">
			<span class="font-semibold text-stone-700">What happened?</span>
			<textarea
				bind:value={reason}
				rows="6"
				maxlength="2000"
				class="textarea textarea-bordered w-full mt-1 bg-white"
				placeholder="Describe what you saw — what was said, when, where, and anything that helps us look into it. Don't paste personal info you don't want shared with moderators."
			></textarea>
		</label>

		{#if error}
			<p class="text-rose-700 bg-rose-50 border border-rose-200 rounded p-2 text-sm">{error}</p>
		{/if}

		{#if !$authState.ready}
			<p class="text-stone-600 text-sm">Loading…</p>
		{:else if !$authState.user}
			<div class="bg-amber-50 border border-amber-300 rounded-lg p-3 text-sm">
				<p class="font-semibold text-amber-900">You'll need to sign in to submit.</p>
				<p class="text-stone-700 mt-1">We require sign-in to keep moderators from being flooded with spam reports.</p>
				<a href="/signin/" class="btn btn-sm bg-orange-700 text-white hover:bg-orange-800 border-0 mt-2">
					Sign in
				</a>
			</div>
		{:else}
			<button type="submit" class="btn bg-orange-700 text-white hover:bg-orange-800 border-0 w-full" disabled={submitting}>
				{submitting ? 'Submitting…' : 'Submit report'}
			</button>
		{/if}
	</form>
{/if}
