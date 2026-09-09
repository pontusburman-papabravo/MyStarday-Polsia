'use strict';

/**
 * SIWA contract after App Review Guideline 4 rejection (2026-09-09, build 1147).
 * Never discard a successful Apple Authentication Services credential.
 */

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { loadLocales, t } = require('../src/lib/i18n');

const ROOT = path.join(__dirname, '..');
const parentDbPath = path.join(ROOT, 'db/parent.js');
const appleAuthPath = path.join(ROOT, 'src/lib/apple-auth.js');
const appleTokenPath = path.join(ROOT, 'src/lib/apple-token.js');
const createOAuthPath = path.join(ROOT, 'src/lib/create-oauth-parent.js');
const oauthApplePath = path.join(ROOT, 'src/routes/auth/oauth-apple.js');
const sessionPath = path.join(ROOT, 'src/routes/auth/session.js');

let mockParentByApple = null;
let mockParentByEmail = null;
let mockCreateParent = null;
let mockCompleteLoginArgs = null;
let linked = null;

function installMocks(appleUser) {
  mockCreateParent = null;
  mockCompleteLoginArgs = null;
  linked = null;

  require.cache[parentDbPath] = {
    id: parentDbPath,
    filename: parentDbPath,
    loaded: true,
    exports: {
      getParentByAppleUserId: async () => mockParentByApple,
      getParentByEmail: async () => mockParentByEmail,
      linkAppleUserId: async (id, sub, email) => {
        linked = { id, sub, email };
        return { id };
      },
      saveAppleRefreshToken: async () => ({ id: 'p' }),
      listAppleRefreshTokens: async () => [],
    },
    children: [],
    parent: null,
    paths: [],
  };

  require.cache[appleAuthPath] = {
    id: appleAuthPath,
    filename: appleAuthPath,
    loaded: true,
    exports: {
      verifyAppleIdToken: async (token) => {
        if (token === 'invalid') return null;
        return appleUser || {
          sub: 'apple-sub-new-1',
          email: 'new-apple@example.com',
        };
      },
    },
    children: [],
    parent: null,
    paths: [],
  };

  require.cache[appleTokenPath] = {
    id: appleTokenPath,
    filename: appleTokenPath,
    loaded: true,
    exports: {
      captureAppleRefreshToken: async () => ({ stored: false, reason: 'test' }),
      isAppleTokenRevocationConfigured: () => false,
    },
    children: [],
    parent: null,
    paths: [],
  };

  require.cache[createOAuthPath] = {
    id: createOAuthPath,
    filename: createOAuthPath,
    loaded: true,
    exports: {
      createParentFromOAuth: async (opts) => {
        mockCreateParent = opts;
        return {
          id: 'parent-new',
          family_id: 'family-new',
          email: opts.email,
          name: opts.displayName,
          onboarding_completed: false,
        };
      },
    },
    children: [],
    parent: null,
    paths: [],
  };

  const rateLimiterPath = require.resolve('../src/middleware/rateLimiter');
  require.cache[rateLimiterPath] = {
    id: rateLimiterPath,
    filename: rateLimiterPath,
    loaded: true,
    exports: {
      appleLoginLimiter: (_req, _res, next) => next(),
    },
    children: [],
    parent: null,
    paths: [],
  };

  require.cache[sessionPath] = {
    id: sessionPath,
    filename: sessionPath,
    loaded: true,
    exports: {
      completeLogin: async (req, res, parent, userType, meta) => {
        mockCompleteLoginArgs = { parent, userType, meta };
        const status = meta && meta.isNewAccount ? 201 : 200;
        res.status(status).json({
          user: { id: parent.id, onboarding_completed: parent.onboarding_completed },
          csrfToken: 'csrf',
        });
      },
    },
    children: [],
    parent: null,
    paths: [],
  };

  delete require.cache[oauthApplePath];
}

function getAppleHandler() {
  const router = require(oauthApplePath);
  const layer = router.stack.find((l) => l.route && l.route.path === '/apple');
  return layer.route.stack[layer.route.stack.length - 1].handle;
}

async function callApple(body, appleUser) {
  installMocks(appleUser);
  const handler = getAppleHandler();
  let statusCode = 200;
  let payload = null;
  const req = { body, ip: '127.0.0.1', headers: {} };
  const res = {
    status(code) { statusCode = code; return this; },
    json(data) { payload = data; return this; },
  };
  await handler(req, res);
  return { statusCode, payload };
}

describe('SIWA invariants — backend', () => {
  beforeEach(() => {
    mockParentByApple = null;
    mockParentByEmail = null;
  });

  it('1) NEW APPLE USER first auth creates account from the same credential', async () => {
    const { statusCode } = await callApple({
      idToken: 'valid-token',
      name: 'Astrid Reviewer',
      firstName: 'Astrid',
      lastName: 'Reviewer',
      country_code: 'SE',
      terms_accepted: true,
      authorizationCode: 'auth-code-1',
    });
    assert.equal(statusCode, 201);
    assert.ok(mockCreateParent);
    assert.equal(mockCreateParent.displayName, 'Astrid Reviewer');
    assert.equal(mockCreateParent.email, 'new-apple@example.com');
    assert.equal(mockCreateParent.appleUserId, 'apple-sub-new-1');
    assert.equal(mockCreateParent.countryCode, 'SE');
  });

  it('2) REPEAT AUTH WITHOUT NAME logs in existing Apple user', async () => {
    mockParentByApple = {
      id: 'existing-apple',
      email: 'existing@example.com',
      onboarding_completed: true,
    };
    const { statusCode, payload } = await callApple({
      idToken: 'valid-token',
    }, { sub: 'apple-sub-existing', email: 'existing@example.com' });
    assert.equal(statusCode, 200);
    assert.equal(payload.user.id, 'existing-apple');
    assert.equal(mockCreateParent, null);
  });

  it('3) HIDE MY EMAIL accepts relay and looks up by Apple sub', async () => {
    mockParentByApple = {
      id: 'relay-parent',
      email: 'hidden@privaterelay.appleid.com',
      onboarding_completed: true,
    };
    const { statusCode, payload } = await callApple({
      idToken: 'valid-token',
    }, { sub: 'apple-sub-relay', email: 'hidden@privaterelay.appleid.com' });
    assert.equal(statusCode, 200);
    assert.equal(payload.user.id, 'relay-parent');
    assert.equal(mockCreateParent, null);
  });

  it('3b) Hide My Email new user stores relay address from token', async () => {
    const { statusCode } = await callApple({
      idToken: 'valid-token',
      country_code: 'SE',
      terms_accepted: true,
    }, { sub: 'apple-sub-relay-new', email: 'xyz@privaterelay.appleid.com' });
    assert.equal(statusCode, 201);
    assert.equal(mockCreateParent.email, 'xyz@privaterelay.appleid.com');
    assert.equal(mockCreateParent.appleUserId, 'apple-sub-relay-new');
  });

  it('4) EXISTING PASSWORD ACCOUNT does not take over', async () => {
    mockParentByEmail = {
      id: 'password-parent',
      has_password: true,
      email: 'taken@example.com',
    };
    const { statusCode, payload } = await callApple({
      idToken: 'valid-token',
      country_code: 'SE',
      terms_accepted: true,
    }, { sub: 'apple-sub-conflict', email: 'taken@example.com' });
    assert.equal(statusCode, 409);
    assert.equal(payload.error, 'email_conflict');
    assert.equal(mockCreateParent, null);
    assert.equal(linked, null);
  });

  it('5) COUNTRY GATE fail-closed — no account, no REGISTRATION_REQUIRED', async () => {
    const { statusCode, payload } = await callApple({
      idToken: 'valid-token',
      terms_accepted: true,
    });
    assert.equal(statusCode, 409);
    assert.equal(payload.code, 'APPLE_ACCOUNT_COMPLETION_REQUIRED');
    assert.ok(payload.missing.includes('country'));
    assert.equal(mockCreateParent, null);
    assert.notEqual(payload.code, 'REGISTRATION_REQUIRED');
  });

  it('6) TERMS GATE fail-closed — same credential completion, no second authorize', async () => {
    const { statusCode, payload } = await callApple({
      idToken: 'valid-token',
      country_code: 'SE',
    });
    assert.equal(statusCode, 409);
    assert.equal(payload.code, 'APPLE_ACCOUNT_COMPLETION_REQUIRED');
    assert.ok(payload.missing.includes('terms'));
    assert.equal(mockCreateParent, null);
  });

  it('completion API copy is localized after loadLocales (not a raw key)', () => {
    loadLocales();
    const sv = t('sv-SE', 'auth.api.errors.appleAccountCompletionRequired');
    const en = t('en-GB', 'auth.api.errors.appleAccountCompletionRequired');
    assert.notEqual(sv, 'auth.api.errors.appleAccountCompletionRequired');
    assert.notEqual(en, 'auth.api.errors.appleAccountCompletionRequired');
    assert.match(sv, /Apple/);
    assert.match(en, /Apple/);
  });

  it('login intent unknown Apple ID does not discard the credential via register redirect', async () => {
    const { statusCode, payload } = await callApple({
      idToken: 'valid-token',
      intent: 'login',
    });
    assert.equal(statusCode, 409);
    assert.equal(payload.code, 'APPLE_ACCOUNT_COMPLETION_REQUIRED');
    assert.notEqual(payload.code, 'REGISTRATION_REQUIRED');
    assert.equal(mockCreateParent, null);
  });
});

describe('SIWA invariants — client contract', () => {
  const login = fs.readFileSync(path.join(ROOT, 'public/login.html'), 'utf8');
  const register = fs.readFileSync(path.join(ROOT, 'public/register.html'), 'utf8');
  const sessionSrc = fs.readFileSync(path.join(ROOT, 'public/js/apple-auth-session.js'), 'utf8');
  const completionSrc = fs.readFileSync(path.join(ROOT, 'public/js/apple-auth-completion.js'), 'utf8');
  const platformSrc = fs.readFileSync(path.join(ROOT, 'public/js/platform.js'), 'utf8');

  it('8) UI contract — Apple path is not blocked by required email/password/name after auth', () => {
    assert.match(login, /isCompletionRequired/);
    assert.doesNotMatch(login, /REGISTRATION_REQUIRED/);
    assert.doesNotMatch(login, /\/register\?method=apple/);
    assert.match(login, /id="appleAccountCompletion"/);
    const completion = login.slice(
      login.indexOf('id="appleAccountCompletion"'),
      login.indexOf('id="appleLinkingPrompt"')
    );
    assert.doesNotMatch(completion, /type="password"/);
    assert.doesNotMatch(completion, /type="email"/);
    assert.match(register, /emailPasswordRegisterFields/);
    assert.match(register, /hideEmailPasswordIdentityFields/);
  });

  it('9) TOKEN SAFETY — no idToken in URL or web storage', () => {
    assert.doesNotMatch(login, /location\.href[^;]*idToken/);
    assert.doesNotMatch(register, /location\.href[^;]*idToken/);
    assert.doesNotMatch(sessionSrc, /localStorage\.setItem/);
    assert.doesNotMatch(sessionSrc, /sessionStorage\.setItem/);
    assert.match(sessionSrc, /never URL, localStorage, or sessionStorage/);
    assert.doesNotMatch(login, /localStorage\.setItem\([^)]*idToken/);
    assert.doesNotMatch(register, /localStorage\.setItem\([^)]*idToken/);
  });

  it('never starts a second Apple authorize for account completion', () => {
    assert.match(login, /SIWA-INVARIANT-1/);
    assert.match(sessionSrc, /never discard a successful Authentication Services credential/);
    const completionHandler = login.slice(login.indexOf('async function handleAppleCompletionSubmit'));
    assert.doesNotMatch(completionHandler.slice(0, 800), /appleSignIn\.signIn/);
    assert.match(register, /AppleAuthSession\.remember/);
  });

  it('cancel is a quiet abort and login re-enables the button', () => {
    assert.match(platformSrc, /canceled: true/);
    assert.match(platformSrc, /isAppleAuthCancellation/);
    const fn = login.slice(login.indexOf('async function handleAppleLogin'));
    assert.match(fn, /if \(!result \|\| result\.canceled\) \{\s*diag\.hideErrors\(\);\s*return;/);
    assert.match(fn, /AppleAuthCancel\.isAppleAuthCancellation/);
    assert.doesNotMatch(fn, /showError\(t\('auth\.login\.apple\.cancelled'\)\)/);
    assert.match(fn, /btn\.disabled = false/);
    const registerFn = register.slice(register.indexOf('async function handleAppleRegister'));
    assert.match(registerFn, /result\.canceled/);
    assert.match(registerFn, /AppleAuthCancel\.isAppleAuthCancellation/);
    assert.doesNotMatch(register, /showError\('appleRegisterError', t\('auth\.login\.apple\.cancelled'\)\)/);
  });

  it('platform returns authorizationCode and first-auth name', () => {
    assert.match(platformSrc, /authorizationCode: resp\.authorizationCode/);
    assert.match(platformSrc, /authorizationCode: auth\.code/);
    assert.match(platformSrc, /givenName/);
    assert.match(platformSrc, /familyName/);
  });

  it('memory credential helper keeps the first authorize result', () => {
    const context = { window: {}, console };
    vm.createContext(context);
    vm.runInContext(sessionSrc, context);
    const session = context.window.AppleAuthSession;
    const cred = session.fromAuthorizeResult({
      idToken: 'tok',
      name: 'Ada Lovelace',
      authorizationCode: 'code-1',
    });
    session.remember(cred);
    assert.equal(session.current().idToken, 'tok');
    assert.equal(session.current().authorizationCode, 'code-1');
    session.clear();
    assert.equal(session.current(), null);
  });

  it('completion helper hides identity fields', () => {
    assert.match(completionSrc, /hideEmailPasswordIdentityFields/);
    assert.match(completionSrc, /never asks for name, email, or password/i);
  });
});

describe('SIWA invariants — email/password registration unchanged', () => {
  it('11) register form still has name email password for the email path', () => {
    const html = fs.readFileSync(path.join(ROOT, 'public/register.html'), 'utf8');
    assert.match(html, /id="name"/);
    assert.match(html, /id="email"/);
    assert.match(html, /id="password"/);
    assert.match(html, /id="confirmPassword"/);
    assert.match(html, /id="registerForm"/);
  });
});

describe('SIWA invariants — iPad auth layout contract', () => {
  it('12) Apple buttons meet 44pt minimum and official copy keys', () => {
    const css = fs.readFileSync(path.join(ROOT, 'public/css/login-magic.css'), 'utf8');
    assert.match(css, /min-height:\s*44px/);
    const sv = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/locales/sv-SE.json'), 'utf8'));
    const en = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/locales/en-GB.json'), 'utf8'));
    assert.equal(sv.auth.login.continueWithApple, 'Fortsätt med Apple');
    assert.equal(en.auth.login.continueWithApple, 'Continue with Apple');
    assert.equal(sv.auth.register.continueWithApple, 'Fortsätt med Apple');
    assert.equal(en.auth.register.continueWithApple, 'Sign up with Apple');
  });
});
