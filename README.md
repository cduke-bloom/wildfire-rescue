# Brantley Wildfire Rescue

A free community board connecting neighbors displaced by wildfire in Brantley, Glynn, and Camden counties, Georgia. Hosts offer spare rooms or supplies; those in need post requests; both sides connect through built-in chat. No money, no middlemen.

## Tech

- SvelteKit + Tailwind 4 + daisyUI (static SPA build)
- Firebase: Auth (Google), Firestore, Hosting

## Local dev

```sh
cp .env.example .env.local
# fill in values from Firebase console → Project settings → Your web app
npm install
npm run dev
```

## Deploy

```sh
npm run build
firebase deploy
```

## Structure

```
src/lib/firebase.ts     Firebase SDK init
src/lib/types.ts        Data types (Listing, Thread, Message, etc.)
src/lib/db.ts           Firestore helpers
src/lib/stores/user.ts  Auth store
src/routes/             Pages
firestore.rules         Security rules
firestore.indexes.json  Composite indexes
firebase.json           Hosting + Firestore config
```
