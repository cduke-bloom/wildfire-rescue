<script lang="ts">
	import { goto } from '$app/navigation';
	import {
		authState,
		resetPassword,
		signInWithEmail,
		signInWithGoogle,
		signUpWithEmail
	} from '$lib/stores/user';

	let mode = $state<'signin' | 'signup' | 'reset'>('signin');

	let displayName = $state('');
	let email = $state('');
	let password = $state('');
	let confirmPassword = $state('');

	let busy = $state(false);
	let error = $state('');
	let info = $state('');

	$effect(() => {
		if ($authState.user) goto('/');
	});

	async function submit() {
		error = '';
		info = '';
		busy = true;
		try {
			if (mode === 'signin') {
				if (!email || !password) throw new Error('Please enter your email and password.');
				await signInWithEmail(email, password);
			} else if (mode === 'signup') {
				if (!displayName.trim()) throw new Error('Please enter your name.');
				if (!email || !password) throw new Error('Please enter your email and password.');
				if (password.length < 8) throw new Error('Password must be at least 8 characters.');
				if (password !== confirmPassword) throw new Error('Passwords do not match.');
				await signUpWithEmail(email, password, displayName);
			} else if (mode === 'reset') {
				if (!email) throw new Error('Enter your email and we\'ll send a reset link.');
				await resetPassword(email);
				info = 'If an account exists for that email, a reset link is on its way.';
			}
		} catch (e) {
			error = friendly(e);
		} finally {
			busy = false;
		}
	}

	async function google() {
		error = '';
		busy = true;
		try {
			await signInWithGoogle();
		} catch (e) {
			error = friendly(e);
		} finally {
			busy = false;
		}
	}

	function friendly(e: unknown): string {
		const msg = e instanceof Error ? e.message : String(e);
		// Firebase puts a code prefix like "Firebase: Error (auth/invalid-credential)."
		if (msg.includes('auth/invalid-credential') || msg.includes('auth/wrong-password')) {
			return 'Email or password is wrong.';
		}
		if (msg.includes('auth/email-already-in-use')) {
			return 'An account already exists for that email. Try signing in instead.';
		}
		if (msg.includes('auth/invalid-email')) {
			return 'That doesn\'t look like a valid email.';
		}
		if (msg.includes('auth/weak-password')) {
			return 'Password is too weak. Use at least 8 characters.';
		}
		if (msg.includes('auth/user-not-found')) {
			return 'No account found for that email.';
		}
		if (msg.includes('auth/too-many-requests')) {
			return 'Too many attempts. Try again in a few minutes.';
		}
		if (msg.includes('auth/operation-not-allowed')) {
			return 'This sign-in method isn\'t turned on for this site yet. Try the other option above or contact the moderators.';
		}
		return msg.replace(/^Firebase: /, '');
	}
</script>

<div class="max-w-md mx-auto">
	<a href="/" class="text-sm text-orange-700 underline">← Back home</a>

	<h1 class="mt-2 text-2xl font-bold text-orange-800">
		{mode === 'signup' ? 'Create an account' : mode === 'reset' ? 'Reset your password' : 'Sign in'}
	</h1>

	{#if mode !== 'reset'}
		<p class="mt-1 text-sm text-stone-600">
			Free, no payment required. By signing in you agree to follow the
			<a href="/about/" class="underline">community rules</a>.
		</p>
	{/if}

	<div class="mt-5 bg-white rounded-2xl shadow border border-stone-200 p-5">
		<button
			class="w-full flex items-center justify-center gap-2 border border-stone-300 rounded-md py-2.5 hover:bg-stone-50 disabled:opacity-50"
			onclick={google}
			disabled={busy}
		>
			<svg class="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
				<path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
				<path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
				<path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.99 10.99 0 0 0 1 12c0 1.78.43 3.46 1.18 4.93l2.85-2.22.81-.62z"/>
				<path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
			</svg>
			<span class="font-medium">Continue with Google</span>
		</button>

		<div class="my-4 flex items-center gap-3 text-xs text-stone-500">
			<div class="flex-1 border-t border-stone-200"></div>
			<span>or</span>
			<div class="flex-1 border-t border-stone-200"></div>
		</div>

		<form onsubmit={(e) => { e.preventDefault(); submit(); }} class="space-y-3">
			{#if mode === 'signup'}
				<label class="block">
					<span class="text-sm font-medium text-stone-700">Your name</span>
					<input
						bind:value={displayName}
						type="text"
						required
						autocomplete="name"
						class="input input-bordered w-full mt-1 bg-white"
						placeholder="First and last name"
					/>
				</label>
			{/if}

			<label class="block">
				<span class="text-sm font-medium text-stone-700">Email</span>
				<input
					bind:value={email}
					type="email"
					required
					autocomplete="email"
					class="input input-bordered w-full mt-1 bg-white"
					placeholder="you@example.com"
				/>
			</label>

			{#if mode !== 'reset'}
				<label class="block">
					<span class="text-sm font-medium text-stone-700">Password</span>
					<input
						bind:value={password}
						type="password"
						required
						minlength="8"
						autocomplete={mode === 'signup' ? 'new-password' : 'current-password'}
						class="input input-bordered w-full mt-1 bg-white"
					/>
				</label>
			{/if}

			{#if mode === 'signup'}
				<label class="block">
					<span class="text-sm font-medium text-stone-700">Confirm password</span>
					<input
						bind:value={confirmPassword}
						type="password"
						required
						autocomplete="new-password"
						class="input input-bordered w-full mt-1 bg-white"
					/>
				</label>
			{/if}

			{#if error}
				<p class="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded p-2">{error}</p>
			{/if}
			{#if info}
				<p class="text-sm text-emerald-800 bg-emerald-50 border border-emerald-200 rounded p-2">{info}</p>
			{/if}

			<button
				type="submit"
				class="btn bg-orange-700 text-white hover:bg-orange-800 border-0 w-full"
				disabled={busy}
			>
				{busy
					? 'Working…'
					: mode === 'signup'
						? 'Create account'
						: mode === 'reset'
							? 'Send reset link'
							: 'Sign in'}
			</button>
		</form>

		<div class="mt-4 text-sm text-stone-600 flex flex-wrap gap-3 justify-between">
			{#if mode === 'signin'}
				<button class="underline hover:text-stone-900" onclick={() => (mode = 'signup')}>
					Create an account
				</button>
				<button class="underline hover:text-stone-900" onclick={() => (mode = 'reset')}>
					Forgot password?
				</button>
			{:else if mode === 'signup'}
				<button class="underline hover:text-stone-900" onclick={() => (mode = 'signin')}>
					Already have an account? Sign in
				</button>
			{:else}
				<button class="underline hover:text-stone-900" onclick={() => (mode = 'signin')}>
					Back to sign in
				</button>
			{/if}
		</div>
	</div>
</div>
