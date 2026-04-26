<script lang="ts">
	import { onDestroy } from 'svelte';
	import { authState } from '$lib/stores/user';
	import { addAdmin, listAdmins, removeAdmin, type AdminEntry } from '$lib/admin';
	import {
		adminApproveListing,
		adminAskForDetails,
		adminBanUser,
		adminDeleteListing,
		adminRejectListing,
		adminSuspendListing,
		adminUnbanUser,
		adminUnsuspendListing,
		resolveReport,
		subscribeAllListings,
		subscribeAllUsers,
		subscribeBannedUsers,
		subscribeReports
	} from '$lib/db';
	import { COUNTIES, LISTING_TYPE_LABEL, type Listing, type Report, type UserDoc } from '$lib/types';

	let listings = $state<Listing[]>([]);
	let reports = $state<Report[]>([]);
	let banned = $state<UserDoc[]>([]);
	let users = $state<UserDoc[]>([]);
	let admins = $state<AdminEntry[]>([]);
	let unsubL: (() => void) | null = null;
	let unsubR: (() => void) | null = null;
	let unsubB: (() => void) | null = null;
	let unsubU: (() => void) | null = null;

	const isAdmin = $derived($authState.isAdmin);
	const isSuperAdmin = $derived($authState.isSuperAdmin);

	$effect(() => {
		unsubL?.();
		unsubR?.();
		unsubB?.();
		unsubU?.();
		if (isAdmin) {
			unsubL = subscribeAllListings((l) => (listings = l));
			unsubR = subscribeReports((r) => (reports = r));
			unsubB = subscribeBannedUsers((u) => (banned = u));
			unsubU = subscribeAllUsers((u) => (users = u));
		}
	});

	$effect(() => {
		if (isSuperAdmin) refreshAdmins();
	});

	async function refreshAdmins() {
		try {
			admins = await listAdmins();
		} catch (e) {
			console.error('Failed to load admins', e);
		}
	}

	onDestroy(() => {
		unsubL?.();
		unsubR?.();
		unsubB?.();
		unsubU?.();
	});

	const usersByCounty = $derived.by(() => {
		const map: Record<string, number> = { Unset: 0 };
		for (const c of COUNTIES) map[c] = 0;
		for (const u of users) {
			if (u.county && u.county in map) map[u.county]++;
			else map['Unset']++;
		}
		return map;
	});

	const newThisWeek = $derived(
		users.filter((u) => Date.now() - u.createdAt < 7 * 86400000).length
	);
	const signedWaiver = $derived(users.filter((u) => !!u.waiverSignedAt).length);

	let userQuery = $state('');
	const filteredUsers = $derived.by(() => {
		const q = userQuery.trim().toLowerCase();
		if (!q) return users;
		return users.filter(
			(u) =>
				u.displayName.toLowerCase().includes(q) ||
				(u.email ?? '').toLowerCase().includes(q) ||
				(u.county ?? '').toLowerCase().includes(q)
		);
	});

	let newAdminEmail = $state('');
	let adminError = $state('');
	let adminBusy = $state(false);

	async function inviteAdmin() {
		if (!$authState.user?.email) return;
		adminError = '';
		adminBusy = true;
		try {
			await addAdmin(newAdminEmail, $authState.user.email);
			newAdminEmail = '';
			await refreshAdmins();
		} catch (e) {
			adminError = e instanceof Error ? e.message : 'Could not add admin.';
		} finally {
			adminBusy = false;
		}
	}

	async function revokeAdmin(email: string) {
		if (!confirm(`Revoke admin access for ${email}?`)) return;
		try {
			await removeAdmin(email);
			await refreshAdmins();
		} catch (e) {
			adminError = e instanceof Error ? e.message : 'Could not remove admin.';
		}
	}

	const pendingApproval = $derived(
		listings.filter((l) => l.approvalStatus === 'pending')
	);
	const pendingReviews = $derived(
		listings.filter((l) => l.suspended && l.reviewRequestedAt)
	);
	const openReports = $derived(reports.filter((r) => !r.resolved));
	const resolvedReports = $derived(reports.filter((r) => r.resolved));

	let view = $state<
		'pending' | 'reviews' | 'reports' | 'listings' | 'users' | 'banned' | 'admins'
	>('pending');

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

	async function askForMore(l: Listing) {
		const message = prompt(
			`Ask ${l.ownerName} for more info on "${l.title}".\n\nWhat's missing? (sent as a message; the listing stays in the queue):`
		);
		if (!message) return;
		await adminAskForDetails(l.id, message, adminInfo());
		alert('Message sent. The listing stays in the queue. The owner can edit and resave to bump it back to you.');
	}

	async function remove(l: Listing) {
		if (
			!confirm(
				`PERMANENTLY DELETE "${l.title}"?\n\nThis cannot be undone. The listing and all of its data will be removed. Use Suspend instead if you might want to restore it later.`
			)
		)
			return;
		const reason = prompt(`Reason for deletion (sent to ${l.ownerName}):`);
		if (!reason) return;
		await adminDeleteListing(l.id, reason, adminInfo());
	}

	async function banPoster(l: Listing) {
		if (
			!confirm(
				`Ban ${l.ownerName} permanently?\n\nThey will no longer be able to post listings or send messages on this site.`
			)
		)
			return;
		const reason = prompt('Reason for banning (shown to the user):');
		if (!reason) return;
		await adminBanUser(l.ownerUid, reason, adminInfo());
		alert(`${l.ownerName} has been banned. Consider also deleting their listings.`);
	}

	async function unban(u: UserDoc) {
		if (!confirm(`Unban ${u.displayName}? They'll regain access immediately.`)) return;
		await adminUnbanUser(u.uid);
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
		<button
			class="px-3 py-2 text-sm font-medium whitespace-nowrap {view === 'users' ? 'border-b-2 border-orange-700 text-orange-800' : 'text-stone-600 hover:text-stone-900'}"
			onclick={() => (view = 'users')}
		>
			Users <span class="text-xs">({users.length})</span>
		</button>
		<button
			class="px-3 py-2 text-sm font-medium whitespace-nowrap {view === 'banned' ? 'border-b-2 border-orange-700 text-orange-800' : 'text-stone-600 hover:text-stone-900'}"
			onclick={() => (view = 'banned')}
		>
			Banned users <span class="text-xs">({banned.length})</span>
		</button>
		{#if isSuperAdmin}
			<button
				class="px-3 py-2 text-sm font-medium whitespace-nowrap {view === 'admins' ? 'border-b-2 border-orange-700 text-orange-800' : 'text-stone-600 hover:text-stone-900'}"
				onclick={() => (view = 'admins')}
			>
				Admins <span class="text-xs">({admins.length})</span>
			</button>
		{/if}
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
						<div class="mt-4 flex gap-2 flex-wrap">
							<button class="btn btn-sm bg-emerald-600 text-white hover:bg-emerald-700 border-0" onclick={() => approve(l)}>
								✅ Approve & publish
							</button>
							<button class="btn btn-sm btn-outline border-amber-500 text-amber-800 hover:bg-amber-50" onclick={() => askForMore(l)}>
								💬 Ask for more info
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
							Reported by uid <code>{r.fromUid.slice(0, 8)}</code>…{r.targetUid
								? ` against uid ${r.targetUid.slice(0, 8)}…`
								: ''}
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
	{:else if view === 'users'}
		<div class="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
			<div class="bg-white rounded-xl border border-stone-200 p-3">
				<p class="text-xs uppercase text-stone-500 tracking-wide">Total signed up</p>
				<p class="text-2xl font-bold text-stone-900 mt-1">{users.length}</p>
			</div>
			<div class="bg-white rounded-xl border border-stone-200 p-3">
				<p class="text-xs uppercase text-stone-500 tracking-wide">New this week</p>
				<p class="text-2xl font-bold text-emerald-700 mt-1">{newThisWeek}</p>
			</div>
			<div class="bg-white rounded-xl border border-stone-200 p-3">
				<p class="text-xs uppercase text-stone-500 tracking-wide">Signed waiver</p>
				<p class="text-2xl font-bold text-stone-900 mt-1">{signedWaiver}<span class="text-sm text-stone-500"> / {users.length}</span></p>
			</div>
			<div class="bg-white rounded-xl border border-rose-200 p-3">
				<p class="text-xs uppercase text-stone-500 tracking-wide">Banned</p>
				<p class="text-2xl font-bold text-rose-700 mt-1">{banned.length}</p>
			</div>
		</div>

		<div class="mt-3 bg-white rounded-xl border border-stone-200 p-3 flex flex-wrap gap-3 text-sm">
			<span class="text-xs uppercase text-stone-500 tracking-wide self-center">By county:</span>
			{#each Object.entries(usersByCounty) as [county, count]}
				<span class="text-stone-700"><strong>{county}</strong>: {count}</span>
			{/each}
		</div>

		<div class="mt-4">
			<input
				bind:value={userQuery}
				type="search"
				placeholder="Search by name, email, or county…"
				class="input input-bordered w-full bg-white"
			/>
		</div>

		{#if filteredUsers.length === 0}
			<p class="mt-6 text-stone-600">No users match.</p>
		{:else}
			<ul class="mt-3 space-y-1">
				{#each filteredUsers as u (u.uid)}
					<li class="bg-white rounded-lg border p-3 flex flex-wrap items-center justify-between gap-2 {u.banned ? 'border-rose-300' : 'border-stone-200'}">
						<div class="min-w-0 flex-1">
							<p class="font-semibold text-stone-900 truncate">
								{u.displayName}
								{#if u.banned}<span class="ml-2 badge bg-rose-100 text-rose-800 border-0">banned</span>{/if}
								{#if !u.waiverSignedAt}<span class="ml-2 badge bg-amber-100 text-amber-900 border-0">no waiver</span>{/if}
							</p>
							<p class="text-xs text-stone-500 truncate">
								{u.email ?? '(no email)'}{u.county ? ` · ${u.county} County` : ''} · joined {fmtDate(u.createdAt)}
							</p>
						</div>
					</li>
				{/each}
			</ul>
		{/if}
	{:else if view === 'banned'}
		{#if banned.length === 0}
			<p class="mt-6 text-stone-600">No banned users.</p>
		{:else}
			<ul class="mt-4 space-y-2">
				{#each banned as u (u.uid)}
					<li class="bg-white rounded-xl border border-rose-300 p-4 shadow-sm">
						<div class="flex justify-between items-start gap-3">
							<div class="min-w-0">
								<p class="font-semibold text-stone-900">{u.displayName}</p>
								{#if u.email}
									<p class="text-xs text-stone-500 truncate">{u.email}</p>
								{/if}
								<p class="text-xs text-stone-500">uid: <code>{u.uid.slice(0, 12)}…</code></p>
								{#if u.bannedAt}
									<p class="text-xs text-stone-500 mt-0.5">Banned {fmtDate(u.bannedAt)}</p>
								{/if}
							</div>
							<button
								class="btn btn-sm bg-emerald-600 text-white hover:bg-emerald-700 border-0 shrink-0"
								onclick={() => unban(u)}
							>
								Unban
							</button>
						</div>
						{#if u.bannedReason}
							<div class="mt-3 bg-rose-50 border border-rose-200 rounded p-3 text-sm text-rose-900 whitespace-pre-line">
								{u.bannedReason}
							</div>
						{/if}
					</li>
				{/each}
			</ul>
		{/if}
	{:else if view === 'admins' && isSuperAdmin}
		<div class="mt-4 bg-white rounded-2xl border border-stone-200 shadow-sm p-5">
			<h2 class="font-bold text-stone-900">Invite an admin</h2>
			<p class="text-sm text-stone-600 mt-1">
				Enter the email of someone you want to grant admin access. They'll get admin
				powers the next time they sign in. The email must match the address they sign
				in with.
			</p>
			<form
				onsubmit={(e) => { e.preventDefault(); inviteAdmin(); }}
				class="mt-3 flex flex-col sm:flex-row gap-2"
			>
				<input
					bind:value={newAdminEmail}
					type="email"
					placeholder="person@example.com"
					class="input input-bordered flex-1 bg-white"
					required
				/>
				<button
					type="submit"
					class="btn bg-orange-700 text-white hover:bg-orange-800 border-0"
					disabled={adminBusy}
				>
					{adminBusy ? 'Adding…' : 'Add admin'}
				</button>
			</form>
			{#if adminError}
				<p class="mt-2 text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded p-2">{adminError}</p>
			{/if}
		</div>

		<h2 class="mt-6 font-bold text-stone-900">Current admins</h2>
		{#if admins.length === 0}
			<p class="mt-2 text-stone-600 text-sm">No invited admins yet.</p>
		{:else}
			<ul class="mt-2 space-y-2">
				{#each admins as a (a.email)}
					<li class="bg-white rounded-xl border border-stone-200 p-3 flex justify-between items-center gap-2">
						<div class="min-w-0">
							<p class="font-medium text-stone-800 truncate">{a.email}</p>
							{#if a.addedBy}
								<p class="text-xs text-stone-500">invited by {a.addedBy}{a.addedAt ? ` · ${fmtDate(a.addedAt)}` : ''}</p>
							{/if}
						</div>
						<button
							class="btn btn-sm btn-outline border-rose-400 text-rose-700 hover:bg-rose-50"
							onclick={() => revokeAdmin(a.email)}
						>
							Revoke
						</button>
					</li>
				{/each}
			</ul>
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
					<div class="flex gap-1 shrink-0">
						{#if l.suspended}
							<button class="btn btn-sm bg-emerald-600 text-white hover:bg-emerald-700 border-0" onclick={() => unsuspend(l)}>
								Restore
							</button>
						{:else if l.active}
							<button class="btn btn-sm btn-outline border-rose-400 text-rose-700 hover:bg-rose-50" onclick={() => suspend(l)}>
								Suspend
							</button>
						{/if}
						<button class="btn btn-sm btn-outline border-rose-700 text-rose-800 hover:bg-rose-700 hover:text-white" onclick={() => remove(l)}>
							🗑️ Delete
						</button>
						<button class="btn btn-sm btn-outline border-rose-900 text-rose-900 hover:bg-rose-900 hover:text-white" onclick={() => banPoster(l)}>
							🚫 Ban user
						</button>
					</div>
				</li>
			{/each}
		</ul>
	{/if}
{/if}
