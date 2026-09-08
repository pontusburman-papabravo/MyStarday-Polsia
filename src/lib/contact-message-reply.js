/**
 * contact-message-reply.js — Admin inbox reply email for contact_message rows.
 */
const config = require('./config');
const { t } = require('./i18n');
const { validateLocale } = require('./locale');

const TYPE_SUBJECT_KEYS = {
  bug: 'support.reply.subjectBug',
  feedback: 'support.reply.subjectFeedback',
  language: 'support.reply.subjectLanguage',
  contact: 'support.reply.subjectContact',
};

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatPlainText(text) {
  return String(text || '').trim();
}

function buildReplySubject(messageType, locale) {
  const loc = validateLocale(locale);
  const key = TYPE_SUBJECT_KEYS[messageType] || TYPE_SUBJECT_KEYS.contact;
  return t(loc, key);
}

function buildReplyBodies({ recipientName, originalMessage, replyBody, followUpUrl, locale }) {
  const loc = validateLocale(locale);
  const greetingName = recipientName && !recipientName.includes('@')
    ? recipientName.trim()
    : t(loc, 'support.receipt.greetingFallback');
  const plainReply = formatPlainText(replyBody);
  const plainOriginal = formatPlainText(originalMessage);

  const text = t(loc, 'support.reply.text', {
    name: greetingName,
    reply: plainReply,
    url: followUpUrl || '',
    original: plainOriginal,
    fromName: config.email.fromName,
  });

  const html = `
    <div style="font-family: sans-serif; max-width: 520px; margin: 0 auto; color: #1B2340;">
      <p>${t(loc, 'support.reply.htmlHi', { name: escapeHtml(greetingName) })}</p>
      <div style="white-space: pre-wrap; line-height: 1.5;">${escapeHtml(plainReply)}</div>
      ${followUpUrl ? `<p style="margin-top: 20px; line-height: 1.5;"><a href="${escapeHtml(followUpUrl)}" style="color: #C4851A; font-weight: 600;">${t(loc, 'support.reply.openLink')}</a> ${t(loc, 'support.reply.htmlHint')}</p>` : ''}
      <hr style="border: none; border-top: 1px solid #EDE7F6; margin: 24px 0;">
      <p style="color: #5A6178; font-size: 13px; margin-bottom: 8px;">${t(loc, 'support.reply.originalLabel')}</p>
      <blockquote style="margin: 0; padding: 12px 16px; background: #f5f5f5; border-left: 4px solid #F5A623; border-radius: 8px; color: #5A6178; font-size: 14px; white-space: pre-wrap;">${escapeHtml(plainOriginal)}</blockquote>
      <p style="margin-top: 24px;">${t(loc, 'support.reply.htmlBye')},<br>${escapeHtml(config.email.fromName)}</p>
    </div>`;

  return { text, html };
}

module.exports = {
  buildReplySubject,
  buildReplyBodies,
  escapeHtml,
};
