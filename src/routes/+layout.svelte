<script lang="ts">
	import './layout.css';
	import { onMount } from 'svelte';
	import { authState, initAuth, signInWithGoogle, signOutUser } from '$lib/stores/user';
	import { initMyThreads, unreadCount } from '$lib/stores/messages';
	import TosOverlay from '$lib/components/TosOverlay.svelte';
	import { page } from '$app/state';

	let { children } = $props();

	onMount(() => {
		initAuth();
		const stop = initMyThreads();
		return stop;
	});

	let menuOpen = $state(false);
	const baseNav = [
		{ href: '/browse/', label: 'Browse', key: 'browse' as const },
		{ href: '/listing/new/', label: 'Post', key: 'post' as const },
		{ href: '/messages/', label: 'Messages', key: 'messages' as const },
		{ href: '/about/', label: 'About', key: 'about' as const }
	];
	const adminLink = { href: '/admin/', label: 'Admin', key: 'admin' as const };

	const nav = $derived($authState.isAdmin ? [...baseNav, adminLink] : baseNav);

	const showTos = $derived(
		!!$authState.user && !!$authState.profile && !$authState.profile.acceptedTosAt
	);
</script>

<div class="min-h-screen flex flex-col">
	<header class="bg-orange-700 text-white shadow-md sticky top-0 z-40">
		<div class="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
			<a href="/" class="flex items-center gap-2 font-bold text-lg">
				<span class="text-2xl">🔥</span>
				<span>Brantley Wildfire Rescue</span>
			</a>

			<nav class="hidden md:flex items-center gap-5">
				{#each nav as n}
					<a
						href={n.href}
						class="hover:text-orange-100 relative"
						class:underline={page.url.pathname.startsWith(n.href)}
					>
						{n.label}
						{#if n.key === 'messages' && $unreadCount > 0}
							<span
								class="absolute -top-2 -right-4 bg-red-500 text-white text-[10px] font-bold rounded-full px-1.5 py-0.5 min-w-[18px] text-center"
								aria-label={`${$unreadCount} unread`}
							>
								{$unreadCount}
							</span>
						{/if}
					</a>
				{/each}
				{#if $authState.ready}
					{#if $authState.user}
						<a href="/profile/" class="flex items-center gap-2">
							{#if $authState.user.photoURL}
								<img
									src={$authState.user.photoURL}
									alt=""
									class="w-8 h-8 rounded-full border-2 border-white"
								/>
							{/if}
							<span class="text-sm">{$authState.profile?.displayName ?? 'You'}</span>
						</a>
						<button class="btn btn-sm btn-ghost text-white" onclick={signOutUser}>Sign out</button>
					{:else}
						<button class="btn btn-sm bg-white text-orange-700 hover:bg-orange-100" onclick={signInWithGoogle}>
							Sign in with Google
						</button>
					{/if}
				{/if}
			</nav>

			<button
				class="md:hidden p-2"
				aria-label="Menu"
				onclick={() => (menuOpen = !menuOpen)}
			>
				<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
				</svg>
			</button>
		</div>

		{#if menuOpen}
			<div class="md:hidden bg-orange-800 px-4 py-3 space-y-2">
				{#each nav as n}
					<a
						href={n.href}
						class="flex items-center gap-2 py-1"
						onclick={() => (menuOpen = false)}
					>
						{n.label}
						{#if n.key === 'messages' && $unreadCount > 0}
							<span
								class="bg-red-500 text-white text-[10px] font-bold rounded-full px-1.5 py-0.5 min-w-[18px] text-center"
								aria-label={`${$unreadCount} unread`}
							>
								{$unreadCount}
							</span>
						{/if}
					</a>
				{/each}
				{#if $authState.user}
					<a href="/profile/" class="block py-1" onclick={() => (menuOpen = false)}>Profile</a>
					<button class="block py-1" onclick={signOutUser}>Sign out</button>
				{:else if $authState.ready}
					<button class="block py-1" onclick={signInWithGoogle}>Sign in with Google</button>
				{/if}
			</div>
		{/if}
	</header>

	<main class="flex-1 max-w-5xl w-full mx-auto px-4 py-6">
		{@render children()}
	</main>

	{#if showTos}
		<TosOverlay />
	{/if}

	<footer class="bg-stone-100 text-stone-700 text-sm">
		<div class="max-w-5xl mx-auto px-4 py-6 flex flex-wrap gap-4 justify-between">
			<p>Brantley Wildfire Rescue — a community connector for Brantley, Glynn, and Camden counties.</p>
			<div class="flex gap-4 flex-wrap">
				<a href="/about/" class="underline">About & Rules</a>
				<a href="/report/" class="underline text-rose-700 font-medium">🚩 Report a problem</a>
				<a href="https://www.redcross.org/get-help.html" target="_blank" rel="noopener" class="underline">Red Cross</a>
				<a href="https://www.disasterassistance.gov/" target="_blank" rel="noopener" class="underline">FEMA</a>
			</div>
		</div>
	</footer>
</div>
