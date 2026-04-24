import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { defineSecret } from 'firebase-functions/params';
import * as logger from 'firebase-functions/logger';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { Resend } from 'resend';

initializeApp();

const RESEND_API_KEY = defineSecret('RESEND_API_KEY');
const RESEND_FROM = defineSecret('RESEND_FROM');

const SITE_URL = 'https://brantley-wildfire-rescue.web.app';
const READ_RECENTLY_MS = 2 * 60 * 1000;
const NOTIFIED_RECENTLY_MS = 60 * 1000;

interface ThreadDoc {
	participants: string[];
	participantNames: Record<string, string>;
	listingTitle?: string;
	readAt?: Record<string, number>;
	notifiedAt?: Record<string, number>;
}

interface UserDoc {
	displayName?: string;
	email?: string;
}

interface MessageDoc {
	sender: string;
	text: string;
	ts: number;
}

export const notifyOnMessage = onDocumentCreated(
	{
		document: 'threads/{threadId}/messages/{msgId}',
		secrets: [RESEND_API_KEY, RESEND_FROM],
		region: 'us-central1'
	},
	async (event) => {
		const msg = event.data?.data() as MessageDoc | undefined;
		if (!msg) return;

		const threadId = event.params.threadId;
		const senderUid = msg.sender;
		const db = getFirestore();

		const threadSnap = await db.doc(`threads/${threadId}`).get();
		if (!threadSnap.exists) return;
		const thread = threadSnap.data() as ThreadDoc;

		const recipientUid = thread.participants.find((p) => p !== senderUid);
		if (!recipientUid) return;

		// Skip if recipient already read this thread in the last 2 minutes
		const lastRead = thread.readAt?.[recipientUid] ?? 0;
		if (Date.now() - lastRead < READ_RECENTLY_MS) {
			logger.info('Skipping email — recipient recently read', { threadId, recipientUid });
			return;
		}

		// Skip if we already emailed for this thread in the last minute (throttle)
		const lastNotified = thread.notifiedAt?.[recipientUid] ?? 0;
		if (Date.now() - lastNotified < NOTIFIED_RECENTLY_MS) {
			logger.info('Skipping email — recently notified', { threadId, recipientUid });
			return;
		}

		const recipientSnap = await db.doc(`users/${recipientUid}`).get();
		if (!recipientSnap.exists) return;
		const recipient = recipientSnap.data() as UserDoc;
		if (!recipient.email) return;

		const senderName = thread.participantNames[senderUid] ?? 'Someone';
		const listingTitle = thread.listingTitle;
		const preview = msg.text.length > 280 ? msg.text.slice(0, 280) + '…' : msg.text;
		const replyUrl = `${SITE_URL}/messages/${threadId}/`;

		const resend = new Resend(RESEND_API_KEY.value());
		try {
			await resend.emails.send({
				from: RESEND_FROM.value(),
				to: recipient.email,
				subject: `New message from ${senderName} — Brantley Wildfire Rescue`,
				html: renderEmail({
					recipientName: recipient.displayName ?? 'Friend',
					senderName,
					listingTitle,
					preview,
					replyUrl
				}),
				text: renderText({ senderName, listingTitle, preview, replyUrl })
			});
			await db.doc(`threads/${threadId}`).update({
				[`notifiedAt.${recipientUid}`]: FieldValue.serverTimestamp()
			});
			logger.info('Email sent', { threadId, recipientUid });
		} catch (err) {
			logger.error('Resend send failed', err);
		}
	}
);

function escapeHtml(s: string) {
	return s
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
}

function renderEmail(p: {
	recipientName: string;
	senderName: string;
	listingTitle?: string;
	preview: string;
	replyUrl: string;
}) {
	const aboutLine = p.listingTitle
		? `<p style="margin: 0 0 12px; color: #57534e; font-size: 14px;">about: <em>${escapeHtml(p.listingTitle)}</em></p>`
		: '';
	return `<!doctype html>
<html><body style="margin:0; padding:0; background:#fff7ed; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;">
  <div style="max-width: 520px; margin: 0 auto; padding: 24px 16px;">
    <div style="background: #c2410c; color: white; padding: 18px 20px; border-radius: 12px 12px 0 0;">
      <div style="font-size: 13px; opacity: 0.85;">Brantley Wildfire Rescue</div>
      <div style="font-size: 20px; font-weight: 600; margin-top: 2px;">New message from ${escapeHtml(p.senderName)}</div>
    </div>
    <div style="background: white; padding: 24px 20px; border: 1px solid #e7e5e4; border-top: none; border-radius: 0 0 12px 12px;">
      <p style="margin: 0 0 4px;">Hi ${escapeHtml(p.recipientName)},</p>
      <p style="margin: 0 0 12px;"><strong>${escapeHtml(p.senderName)}</strong> just messaged you.</p>
      ${aboutLine}
      <blockquote style="border-left: 3px solid #c2410c; padding: 6px 12px; color: #292524; margin: 0 0 20px; background: #fff7ed; border-radius: 0 6px 6px 0;">
        ${escapeHtml(p.preview)}
      </blockquote>
      <a href="${p.replyUrl}" style="display: inline-block; background: #c2410c; color: white; padding: 12px 22px; text-decoration: none; border-radius: 8px; font-weight: 600;">Reply on the site</a>
      <p style="color: #78716c; font-size: 12px; margin-top: 28px; line-height: 1.5;">
        You're receiving this because you have an active conversation on
        <a href="${SITE_URL}" style="color: #c2410c;">Brantley Wildfire Rescue</a>,
        a free community board connecting families displaced by wildfire with hosts and donors.<br/>
        Powered by Bloom Tech Support.
      </p>
    </div>
  </div>
</body></html>`;
}

function renderText(p: {
	senderName: string;
	listingTitle?: string;
	preview: string;
	replyUrl: string;
}) {
	return `${p.senderName} just sent you a message on Brantley Wildfire Rescue.${
		p.listingTitle ? `\n\nAbout: ${p.listingTitle}` : ''
	}

"${p.preview}"

Reply: ${p.replyUrl}

---
Brantley Wildfire Rescue — a free community board for families displaced by wildfire.
Powered by Bloom Tech Support.`;
}
