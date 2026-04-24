import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import {
	PUBLIC_FB_API_KEY,
	PUBLIC_FB_AUTH_DOMAIN,
	PUBLIC_FB_PROJECT_ID,
	PUBLIC_FB_STORAGE_BUCKET,
	PUBLIC_FB_SENDER_ID,
	PUBLIC_FB_APP_ID
} from '$env/static/public';

const config = {
	apiKey: PUBLIC_FB_API_KEY,
	authDomain: PUBLIC_FB_AUTH_DOMAIN,
	projectId: PUBLIC_FB_PROJECT_ID,
	storageBucket: PUBLIC_FB_STORAGE_BUCKET,
	messagingSenderId: PUBLIC_FB_SENDER_ID,
	appId: PUBLIC_FB_APP_ID
};

let _app: FirebaseApp | null = null;
let _auth: Auth | null = null;
let _db: Firestore | null = null;

export function app(): FirebaseApp {
	if (!_app) _app = getApps()[0] ?? initializeApp(config);
	return _app;
}
export function auth(): Auth {
	if (!_auth) _auth = getAuth(app());
	return _auth;
}
export function db(): Firestore {
	if (!_db) _db = getFirestore(app());
	return _db;
}
