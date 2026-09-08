'use strict';

/**
 * Confirmation email after a contact_message is created — points at the web thread.
 */
const config = require('./config');
const { issueReplyToken, threadPath, followUpUrl } = require('./support-reply-token');
const { escapeHtml } = require('./contact-message-reply');
const { t } = require('./i18n');
const { validateLocale } = require('./locale');

function isLandingShareMailbox(email) {
  return String(email || '').toLowerCase().startsWith('landing-share@');
}

function shouldSendSupportReceipt(email) {
  return Boolean(email) && email.includes('@') && !isLandingShareMailbox(email);
}

function buildReceiptBodies({ recipientName, followUpUrl: url, locale }) {
  const loc = validateLocale(locale);
  const greetingName = recipientName && !String(recipientName).includes('@')
    ? String(recipientName).trim()
    : t(loc, 'support.receipt.greetingFallback');

  const text = t(loc, 'support.receipt.text', {
    name: greetingName,
    url,
    fromName: config.email.fromName,
  });

  const html = `
    <div style="font-family: sans-serif; max-width: 520px; margin: 0 auto; color: #1B2340;">
      <p>${t(loc, 'support.receipt.htmlHi', { name: escapeHtml(greetingName) })}</p>
      <p>${t(loc, 'support.receipt.htmlReceived')}</p>
      <p style="line-height: 1.5;"><a href="${escapeHtml(url)}" style="color: #C4851A; font-weight: 600;">${t(loc, 'support.receipt.openLink')}</a>
      ${t(loc, 'support.receipt.htmlHint')}</p>
      <p style="margin-top: 24px;">${t(loc, 'support.receipt.htmlBye')},<br>${escapeHtml(config.email.fromName)}</p>
    </div>`;

  return {
    subject: t(loc, 'support.receipt.subject'),
    text,
    html,
  };
}

async function publicThreadFor(messageId, { createdBy = 'system' } = {}) {
  const issued = await issueReplyToken(messageId, { createdBy });
  return {
    threadUrl: threadPath(issued.raw),
    followUpUrl: followUpUrl(issued.raw),
    tokenPrefix: issued.raw.split('.')[0],
  };
}

module.exports = {
  isLandingShareMailbox,
  shouldSendSupportReceipt,
  threadPath,
  buildReceiptBodies,
  publicThreadFor,
};
