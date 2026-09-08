'use strict';

/**
 * Permanent first-line support agent — OOO is a timed mode, not the agent's life.
 *
 * SUPPORT_AGENT_MODE=auto|ooo|normal
 *   auto (default): OOO while config/support-ooo.js is active, else normal.
 *
 * SUPPORT_ESCALATION_SLA_HOURS (default 72)
 *   Conservative ops safety net: daily agent + 3 days without progress → human.
 *   Not a published customer SLA. Configurable.
 */

const { isOooActive } = require('./support-ooo');

const MODES = Object.freeze(['auto', 'ooo', 'normal']);
const DEFAULT_SLA_HOURS = 72;
const MAX_AUTO_EXTERNAL_REPLIES = 2;

function configuredMode() {
  const raw = String(process.env.SUPPORT_AGENT_MODE || 'auto').trim().toLowerCase();
  return MODES.includes(raw) ? raw : 'auto';
}

function resolveSupportAgentMode(now) {
  const configured = configuredMode();
  if (configured === 'ooo' || configured === 'normal') return configured;
  return isOooActive(now) ? 'ooo' : 'normal';
}

function isOooMode(now) {
  return resolveSupportAgentMode(now) === 'ooo';
}

function escalationSlaHours() {
  const raw = Number(process.env.SUPPORT_ESCALATION_SLA_HOURS);
  if (Number.isFinite(raw) && raw >= 1 && raw <= 24 * 30) return Math.floor(raw);
  return DEFAULT_SLA_HOURS;
}

module.exports = {
  MODES,
  DEFAULT_SLA_HOURS,
  MAX_AUTO_EXTERNAL_REPLIES,
  configuredMode,
  resolveSupportAgentMode,
  isOooMode,
  escalationSlaHours,
};
