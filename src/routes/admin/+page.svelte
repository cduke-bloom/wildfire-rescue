<script lang="ts">
	import { onDestroy } from 'svelte';
	import { authState } from '$lib/stores/user';
	import { isAdminEmail } from '$lib/admin';
	import {
		adminApproveListing,
		adminRejectListing,
		adminSuspendListing,
		adminUnsuspendListing,
		resolveReport,
		subscribeAllListings,
		subscribeReports
	} from '$lib/db';
	import { LISTING_TYPE_LABEL, type Listing, type Report } from '$lib/types';

	let listings = $state<Listing[]>([]);
	let reports = $state<Report[]>([]);
	let unsubL: (() => void) | null = null;
	let unsubR: (() => void) | null = null;

	const isAdmin = $derived(isAdminEmail($authState.user?.email));

	$effect(() => {
		unsubL?.();
		unsubR?.();
		if (isAdmin) {
			unsubL = subscribeAllListings((l) => (listings = l));
			unsubR = subscribeReports((r) => (reports = r));
		}
	});

	onDestroy(() => {
		unsubL?.();
		unsubR?.();
	});

	const pendingApproval = $derived(
		listings.filter((l) => l.approvalStatus === 'pending')
	);
	const pendingReviews = $derived(
		listings.filter((l) => l.suspended && l.reviewRequestedAt)
	);
	const openReports = $derived(reports.filter((r) => !r.resolved));
	const resolvedReports = $derived(reports.filter((r) => r.resolved));

	let view = $state<'pending' | 'reviews' | 'reports' | 'listings'>('pending');

	function adminInfo() {
		return {
			uid: $authState.user!.uid,
			name: $authState.profile?.displayName ?? 'Moderator'
		};
	}

	async function approve(l: Listing) {
		if (!confirm(`Approve "${l.title}"?\n\n${l.ownerName} will be notified and the listing will go live.`)) return;
		await adminApproveListing(l.id, adminInfo());
	}

	async function reject(l: Listing) {
		const reason = prompt(`Reject "${l.title}"?\n\nReason (will be sent to ${l.ownerName}):`);
		if (!reason) return;
		await adminRejectListing(l.id, reason, adminInfo());
	}

	async function suspend(l: Listing) {
		const reason = prompt(`Suspend "${l.title}"?\n\nReason (shown to owner):`);
		if (!reason) return;
		await adminSuspendListing(l.id, reason, $authState.user!.uid);
	}

	async function unsuspend(l: Listing) {
		if (!confirm(`Restore "${l.title}" to public view?`)) return;
		await adminUnsuspendListing(l.id);
	}

	async function resolve(r: Report) {
		const note = prompt('Resolution note (optional):') ?? '';
		await resolveReport(r.id, $authState.user!.uid, note || undefined);
	}

	function fmtDate(ts?: number) {
		if (!ts) return '';
		return new Date(ts).toLocaleString();
	}
</script>

{#if !$authState.ready}
	<p class="text-stone-600">Loading…</p>
{:else if !$authState.user}
	<p class="text-stone-600">Sign in required.</p>
{:else if !isAdmin}
	<div class="bg-white rounded-2xl border border-stone-200 p-6 text-center">
		<h1 class="text-xl font-bold text-rose-700">Not authorized</h1>
		<p class="mt-2 text-stone-600">You don't have admin access. If you should, contact the site organizer.</p>
	</div>
{:else}
	<h1 class="text-2xl font-bold text-orange-800">Admin</h1>

	<div class="mt-4 flex gap-2 border-b border-stone-200 overflow-x-auto">
		<button
			class="px-3 py-2 text-sm font-medium whitespace-nowrap {view === 'pending' ? 'border-b-2 border-orange-700 text-orange-800' : 'text-stone-600 hover:text-stone-900'}"
			onclick={() => (view = 'pending')}
		>
			Awaiting approval
			{#if pendingApproval.length > 0}
				<span class="ml-1 bg-amber-500 text-white text-[10px] font-bold rounded-full px-1.5 py-0.5">
					{pendingApproval.length}
				</span>
			{/if}
		</button>
		<button
			class="px-3 py-2 text-sm font-medium whitespace-nowrap {view === 'reviews' ? 'border-b-2 border-orange-700 text-orange-800' : 'text-stone-600 hover:text-stone-900'}"
			onclick={() => (view = 'reviews')}
		>
			Review requests <span class="text-xs">({pendingReviews.length})</span>
		</button>
		<button
			class="px-3 py-2 text-sm font-medium whitespace-nowrap {view === 'reports' ? 'border-b-2 border-orange-700 text-orange-800' : 'text-stone-600 hover:text-stone-900'}"
			onclick={() => (view = 'reports')}
		>
			Reports <span class="text-xs">({openReports.length})</span>
		</button>
		<button
			class="px-3 py-2 text-sm font-medium whitespace-nowrap {view === 'listings' ? 'border-b-2 border-orange-700 text-orange-800' : 'text-stone-600 hover:text-stone-900'}"
			onclick={() => (view = 'listings')}
		>
			All listings <span class="text-xs">({listings.length})</span>
		</button>
	</div>

	{#if view === 'pending'}
		{#if pendingApproval.length === 0}
			<p class="mt-6 text-stone-600">Inbox zero — no listings awaiting approval.</p>
		{:else}
			<ul class="mt-4 space-y-3">
				{#each pendingApproval as l (l.id)}
					<li class="bg-white rounded-xl border border-amber-300 p-4 shadow-sm">
						<div class="flex justify-between gap-2 items-start">
							<div class="min-w-0">
								<a href={`/listing/${l.id}/`} target="_blank" class="font-semibold text-stone-900 hover:underline">
									{l.title}
								</a>
								<p class="text-xs text-stone-500 mt-0.5">
									{LISTING_TYPE_LABEL[l.type]} · {l.county} County · by {l.ownerName} · {fmtDate(l.createdAt)}
								</p>
							</div>
						</div>
						<p class="mt-3 text-sm text-stone-800 whitespace-pre-line line-clamp-6">{l.details}</p>
						{#if l.items?.length}
							<div class="mt-2 flex flex-wrap gap-1">
								{#each l.items.slice(0, 8) as item}
									<span class="badge bg-stone-100 border-0 text-xs">{item}</span>
								{/each}
							</div>
						{/if}
						<div class="mt-4 flex gap-2">
							<button class="btn btn-sm bg-emerald-600 text-white hover:bg-emerald-700 border-0" onclick={() => approve(l)}>
								✅ Approve & publish
							</button>
							<button class="btn btn-sm btn-outline border-rose-400 text-rose-700 hover:bg-rose-50" onclick={() => reject(l)}>
								❌ Reject
							</button>
						</div>
					</li>
				{/each}
			</ul>
		{/if}
	{:else if view === 'reviews'}
		{#if pendingReviews.length === 0}
			<p class="mt-6 text-stone-600">No pending review requests.</p>
		{:else}
			<ul class="mt-4 space-y-3">
				{#each pendingReviews as l (l.id)}
					<li class="bg-white rounded-xl border border-amber-300 p-4 shadow-sm">
						<div class="flex justify-between gap-2">
							<div class="min-w-0">
								<a href={`/listing/${l.id}/`} target="_blank" class="font-semibold text-stone-900 hover:underline">
									{l.title}
								</a>
								<p class="text-xs text-stone-500 mt-0.5">
									{LISTING_TYPE_LABEL[l.type]} · {l.county} County · by {l.ownerName}
								</p>
							</div>
							<span class="text-xs text-amber-700 shrink-0">
								Requested {fmtDate(l.reviewRequestedAt)}
							</span>
						</div>

						<div class="mt-3 bg-rose-50 border border-rose-200 rounded p-3 text-sm">
							<p class="font-semibold text-rose-900">Suspended for:</p>
							<p class="text-rose-800">{l.suspendedReason ?? '(no reason given)'}</p>
						</div>
						<div class="mt-2 bg-amber-50 border border-amber-200 rounded p-3 text-sm">
							<p class="font-semibold text-amber-900">Owner says:</p>
							<p class="text-stone-800 whitespace-pre-line">{l.reviewMessage ?? '(no message)'}</p>
						</div>

						<div class="mt-3 flex gap-2">
							<button class="btn btn-sm bg-emerald-600 text-white hover:bg-emerald-700 border-0" onclick={() => unsuspend(l)}>
								Approve & restore
							</button>
							<button class="btn btn-sm btn-outline border-stone-300 text-stone-700" onclick={() => suspend(l)}>
								Update reason / keep suspended
							</button>
						</div>
					</li>
				{/each}
			</ul>
		{/if}
	{:else if view === 'reports'}
		{#if openReports.length === 0}
			<p class="mt-6 text-stone-600">No open reports.</p>
		{:else}
			<ul class="mt-4 space-y-3">
				{#each openReports as r (r.id)}
					<li class="bg-white rounded-xl border border-stone-200 p-4 shadow-sm">
						<div class="flex justify-between gap-2">
							<p class="text-sm">
								<span class="badge bg-rose-100 text-rose-800 border-0">{r.targetType}</span>
								{#if r.targetType === 'listing' && r.targetId}
									<a href={`/listing/${r.targetId}/`} target="_blank" class="ml-2 text-orange-700 underline">view listing</a>
								{/if}
							</p>
							<span class="text-xs text-stone-500">{fmtDate(r.createdAt)}</span>
						</div>
						<p class="mt-2 text-sm text-stone-800 whitespace-pre-line">{r.reason}</p>
						<p class="mt-2 text-xs text-stone-500">
							Reported by uid <code>{r.fromUid.slice(0, 8)}</code>… against uid <code>{r.targetUid.slice(0, 8)}</code>…
						</p>
						<div class="mt-3 flex gap-2">
							<button class="btn btn-sm bg-stone-700 text-white hover:bg-stone-800 border-0" onclick={() => resolve(r)}>
								Mark resolved
							</button>
						</div>
					</li>
				{/each}
			</ul>
		{/if}

		{#if resolvedReports.length > 0}
			<details class="mt-6">
				<summary class="cursor-pointer text-sm text-stone-600">Resolved reports ({resolvedReports.length})</summary>
				<ul class="mt-3 space-y-2">
					{#each resolvedReports.slice(0, 50) as r (r.id)}
						<li class="bg-stone-50 rounded p-3 text-xs text-stone-600">
							<p>{r.reason}</p>
							{#if r.resolutionNote}
								<p class="mt-1 italic">→ {r.resolutionNote}</p>
							{/if}
						</li>
					{/each}
				</ul>
			</details>
		{/if}
	{:else}
		<ul class="mt-4 space-y-2">
			{#each listings as l (l.id)}
				<li class="bg-white rounded-xl border p-3 shadow-sm flex justify-between items-center gap-2 {l.suspended ? 'border-rose-300' : 'border-stone-200'}">
					<div class="min-w-0">
						<a href={`/listing/${l.id}/`} target="_blank" class="font-semibold text-stone-800 hover:underline truncate block">
							{l.title}
						</a>
						<p class="text-xs text-stone-500">
							{LISTING_TYPE_LABEL[l.type]} · {l.county} County · by {l.ownerName} ·
							{l.suspended ? '🚫 suspended' : l.active ? '✅ active' : '💤 inactive'}
						</p>
					</div>
					{#if l.suspended}
						<button class="btn btn-sm bg-emerald-600 text-white hover:bg-emerald-700 border-0" onclick={() => unsuspend(l)}>
							Restore
						</button>
					{:else if l.active}
						<button class="btn btn-sm btn-outline border-rose-400 text-rose-700 hover:bg-rose-50" onclick={() => suspend(l)}>
							Suspend
						</button>
					{/if}
				</li>
			{/each}
		</ul>
	{/if}
{/if}
