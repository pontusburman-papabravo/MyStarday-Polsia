'use strict';

/**
 * SIWA sheet dismiss is a quiet cancel, not an authentication failure.
 * Physical iPhone build 1158 showed the red Apple-failed banner on cancel.
 */

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { loadLocales, t } = require('../src/lib/i18n');

const ROOT = path.join(__dirname, '..');
const cancelApi = require('../public/js/apple-auth-cancel.js');

const FAILED_KEY = 'auth.login.apple.failed';

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function extractAsyncFunction(src, name, endNeedle) {
  const start = src.indexOf(`async function ${name}`);
  assert.ok(start > 0, `${name} must exist`);
  const end = src.indexOf(endNeedle, start);
  assert.ok(end > start, `${name} end marker missing`);
  return src.slice(start, end);
}

function loadNativePlatform(authorizeImpl, { includeCancelHelper = true } = {}) {
  const windowObj = {
    location: { origin: 'https://example.test', href: 'https://example.test/login' },
    document: {
      documentElement: { classList: { add() {} } },
      body: { classList: { add() {} } },
      readyState: 'complete',
      addEventListener() {},
      getElementById() { return null; },
    },
    navigator: {},
  };
  const Capacitor = {
    isNativePlatform: () => true,
    getPlatform: () => 'ios',
    Plugins: {
      SignInWithApple: { authorize: authorizeImpl },
    },
  };
  windowObj.Capacitor = Capacitor;
  const sandbox = {
    window: windowObj,
    document: windowObj.document,
    navigator: windowObj.navigator,
    Capacitor,
    console,
    setTimeout,
    clearTimeout,
    fetch: async () => ({ ok: true, json: async () => ({}) }),
  };
  if (includeCancelHelper) {
    vm.runInNewContext(read('public/js/apple-auth-cancel.js'), sandbox);
  }
  vm.runInNewContext(read('public/js/platform.js'), sandbox);
  return sandbox.window.Platform;
}

function makeButton(label) {
  return { disabled: false, textContent: label };
}

function makeLoginSandbox(signIn) {
  const visibleErrors = [];
  const logs = [];
  const authFailures = [];
  const posts = [];
  const redirects = [];
  const remembered = [];
  const btn = makeButton('Fortsätt med Apple');
  const appleLoginError = { style: { display: 'none' }, textContent: '' };

  function hideErrors() {
    appleLoginError.style.display = 'none';
    appleLoginError.textContent = '';
    visibleErrors.length = 0;
  }

  function showError(msg) {
    appleLoginError.textContent = msg;
    appleLoginError.style.display = '';
    visibleErrors.push(msg);
  }

  const sandbox = {
    window: {},
    document: {
      getElementById(id) {
        if (id === 'appleLoginBtn') return btn;
        if (id === 'appleLoginError') return appleLoginError;
        return { style: { display: 'none' }, textContent: '', classList: { add() {}, remove() {} } };
      },
    },
    console,
    t: (key) => key,
    fetch: async (url, init) => {
      posts.push({ url, method: init && init.method, body: init && init.body });
      return { ok: false, status: 500, json: async () => ({ error: 'should-not-run' }) };
    },
    submitAppleCredential: async () => {
      posts.push({ url: '/api/auth/apple', method: 'POST' });
      return { res: { ok: false, status: 500 }, data: { error: 'should-not-run' } };
    },
    finishAppleSuccess: async () => {
      redirects.push('/home');
    },
    Platform: {
      isIOS: () => true,
      appleSignIn: { isAvailable: () => true, signIn },
    },
    AppleSignInDiagnostics: {
      log(step, detail) { logs.push({ step, detail }); },
      showError,
      hideErrors,
      hideLinkingPrompts() {},
      getActiveAppleButton() { return btn; },
      isParentLoginVisible() { return true; },
    },
    AppleAuthCancel: cancelApi,
    AppleAuthSession: {
      fromAuthorizeResult(result) { return result; },
      remember(credential) { remembered.push(credential); },
      isCompletionRequired() { return false; },
    },
    AppleAuthCompletion: { showPanel() {} },
    AppEntry: {
      trackAuthMethod() {},
      trackAuthFailed(_method, reason) { authFailures.push(reason); },
      track() {},
    },
    Auth: { setAuth() {}, redirectToDashboard() { redirects.push('/dashboard'); } },
  };
  sandbox.window = sandbox;
  sandbox.window.Platform = sandbox.Platform;
  sandbox.window.AppleSignInDiagnostics = sandbox.AppleSignInDiagnostics;
  sandbox.window.AppleAuthCancel = cancelApi;
  sandbox.window.AppleAuthSession = sandbox.AppleAuthSession;
  sandbox.window.AppleAuthCompletion = sandbox.AppleAuthCompletion;
  sandbox.window.AppEntry = sandbox.AppEntry;
  sandbox.window.location = { href: '/login' };
  Object.defineProperty(sandbox.window.location, 'href', {
    get() { return redirects[redirects.length - 1] || '/login'; },
    set(v) { redirects.push(v); },
  });

  const fn = extractAsyncFunction(
    read('public/login.html'),
    'handleAppleLogin',
    "document.getElementById('appleCompletionSubmitBtn')"
  );
  vm.runInNewContext(`${fn}\nthis.handleAppleLogin = handleAppleLogin;`, sandbox);
  return {
    handleAppleLogin: sandbox.handleAppleLogin,
    btn,
    visibleErrors,
    logs,
    authFailures,
    posts,
    redirects,
    remembered,
    appleLoginError,
  };
}

function makeRegisterSandbox(signIn) {
  const visibleErrors = [];
  const posts = [];
  const redirects = [];
  const remembered = [];
  const btn = makeButton('Fortsätt med Apple');
  const appleRegisterError = {
    classList: {
      hidden: true,
      add(name) { if (name === 'hidden') this.hidden = true; },
      remove(name) { if (name === 'hidden') this.hidden = false; },
    },
    textContent: '',
  };

  function showError(id, msg) {
    if (id === 'appleRegisterError') {
      appleRegisterError.textContent = msg;
      appleRegisterError.classList.hidden = false;
      visibleErrors.push(msg);
    }
  }

  const sandbox = {
    window: {},
    document: {
      getElementById(id) {
        if (id === 'appleRegisterBtn') return btn;
        if (id === 'appleRegisterError') return appleRegisterError;
        return { classList: { add() {}, remove() {} }, textContent: '' };
      },
    },
    console,
    t: (key) => key,
    showError,
    fetch: async (url, init) => {
      posts.push({ url, method: init && init.method, body: init && init.body });
      return { ok: false, status: 500, json: async () => ({ error: 'should-not-run' }) };
    },
    Platform: {
      isIOS: () => true,
      appleSignIn: { isAvailable: () => true, signIn },
    },
    RegisterAppleAuth: {
      preflight() { return { ok: true }; },
    },
    AppleSignInDiagnostics: { log() {} },
    AppleAuthCancel: cancelApi,
    AppleAuthSession: {
      fromAuthorizeResult(result) { return result; },
      remember(credential) { remembered.push(credential); },
      buildRequestBody() { return { idToken: 'tok', intent: 'register' }; },
      isCompletionRequired() { return false; },
      applyAuthenticatedSession() {},
    },
    AppleAuthCompletion: {
      hideEmailPasswordIdentityFields() {},
      showPanel() {},
    },
    Auth: { setAuth() {}, redirectToDashboard() { redirects.push('/dashboard'); } },
    MarketingEvents: { trackSignup() {} },
    OAuthRegistrationPayload: null,
  };
  sandbox.window = sandbox;
  sandbox.window.Platform = sandbox.Platform;
  sandbox.window.RegisterAppleAuth = sandbox.RegisterAppleAuth;
  sandbox.window.AppleSignInDiagnostics = sandbox.AppleSignInDiagnostics;
  sandbox.window.AppleAuthCancel = cancelApi;
  sandbox.window.AppleAuthSession = sandbox.AppleAuthSession;
  sandbox.window.AppleAuthCompletion = sandbox.AppleAuthCompletion;
  sandbox.window.location = { href: '/register' };
  Object.defineProperty(sandbox.window.location, 'href', {
    get() { return redirects[redirects.length - 1] || '/register'; },
    set(v) { redirects.push(v); },
  });

  const fn = extractAsyncFunction(
    read('public/register.html'),
    'handleAppleRegister',
    "document.getElementById('appleCompletionSubmitBtn')"
  );
  vm.runInNewContext(`${fn}\nthis.handleAppleRegister = handleAppleRegister;`, sandbox);
  return {
    handleAppleRegister: sandbox.handleAppleRegister,
    btn,
    visibleErrors,
    posts,
    redirects,
    remembered,
    appleRegisterError,
  };
}

describe('isAppleAuthCancellation — native + web variants', () => {
  it('detects stable plugin/runtime cancel codes first', () => {
    assert.equal(cancelApi.isAppleAuthCancellation({ code: 'ERR_CANCELED', message: 'ERROR' }), true);
    assert.equal(cancelApi.isAppleAuthCancellation({ code: 1001, message: 'ERROR' }), true);
    assert.equal(cancelApi.isAppleAuthCancellation({ code: '1001', message: 'ERROR' }), true);
    assert.equal(cancelApi.isAppleAuthCancellation({ code: 'ASAuthorizationError.canceled' }), true);
    assert.equal(cancelApi.isAppleAuthCancellation({ error: 'user_cancelled' }), true);
    assert.equal(cancelApi.isAppleAuthCancellation({ error: 'popup_closed_by_user' }), true);
    assert.equal(cancelApi.isAppleAuthCancellation({ canceled: true }), true);
  });

  it('detects shipped 1158 localizedDescription variants without a cancel code', () => {
    assert.equal(cancelApi.isAppleAuthCancellation({
      code: 'ERROR',
      message: 'Auktoriseringen avbröts av användaren.',
    }), true);
    assert.equal(cancelApi.isAppleAuthCancellation({
      code: 'ERROR',
      message: 'Åtgärden kunde inte slutföras. (com.apple.AuthenticationServices.AuthorizationError error 1001.)',
    }), true);
    assert.equal(cancelApi.isAppleAuthCancellation({
      message: 'The authorization was cancelled by the user.',
    }), true);
    assert.equal(cancelApi.isAppleAuthCancellation({ message: 'canceled' }), true);
  });

  it('does not treat real auth failures as cancel', () => {
    assert.equal(cancelApi.isAppleAuthCancellation(new Error('APPLE_SIGN_IN_FAILED')), false);
    assert.equal(cancelApi.isAppleAuthCancellation(new Error('SIGN_IN_UNAVAILABLE')), false);
    assert.equal(cancelApi.isAppleAuthCancellation({
      code: 'ERROR',
      message: 'The authorization attempt failed for an unknown reason',
    }), false);
    assert.equal(cancelApi.isAppleAuthCancellation({
      code: 1000,
      message: 'Åtgärden kunde inte slutföras.',
    }), false);
    assert.equal(cancelApi.isAppleAuthCancellation({ message: 'network error' }), false);
    const canceled = cancelApi.canceledResult();
    assert.equal(canceled.canceled, true);
    assert.equal(canceled.idToken, undefined);
  });
});

describe('platform.appleSignIn.signIn native cancel contract', () => {
  it('A) authorize reject with known user-cancel returns { canceled: true }', async () => {
    const Platform = loadNativePlatform(async () => {
      const err = new Error('Auktoriseringen avbröts av användaren.');
      err.code = 'ERROR';
      throw err;
    });
    const result = await Platform.appleSignIn.signIn();
    assert.equal(result.canceled, true);
    assert.equal(result.idToken, undefined);
  });

  it('A) authorize reject with ERR_CANCELED returns { canceled: true }', async () => {
    const Platform = loadNativePlatform(async () => {
      const err = new Error('canceled');
      err.code = 'ERR_CANCELED';
      throw err;
    });
    const result = await Platform.appleSignIn.signIn();
    assert.equal(result.canceled, true);
    assert.equal(result.idToken, undefined);
  });

  it('B) unknown AuthorizationError still throws APPLE_SIGN_IN_FAILED', async () => {
    const Platform = loadNativePlatform(async () => {
      const err = new Error('The authorization attempt failed for an unknown reason');
      err.code = 'ERROR';
      throw err;
    });
    await assert.rejects(() => Platform.appleSignIn.signIn(), { message: 'APPLE_SIGN_IN_FAILED' });
  });

  it('SIGN_IN_UNAVAILABLE is not treated as cancel', async () => {
    const Platform = loadNativePlatform(async () => {
      throw new Error('SIGN_IN_UNAVAILABLE');
    });
    await assert.rejects(() => Platform.appleSignIn.signIn(), { message: 'SIGN_IN_UNAVAILABLE' });
  });

  it('fallback without helper script still treats Swedish dismiss as cancel', async () => {
    const Platform = loadNativePlatform(async () => {
      const err = new Error('Auktoriseringen avbröts av användaren.');
      err.code = 'ERROR';
      throw err;
    }, { includeCancelHelper: false });
    const result = await Platform.appleSignIn.signIn();
    assert.equal(result.canceled, true);
    assert.equal(result.idToken, undefined);
  });
});

describe('login Apple cancel path', () => {
  let authorizeCalls;

  beforeEach(() => {
    authorizeCalls = 0;
  });

  it('C) cancel hides errors, re-enables button, no backend POST, no redirect', async () => {
    const flow = makeLoginSandbox(async () => {
      authorizeCalls += 1;
      return { canceled: true };
    });
    await flow.handleAppleLogin(flow.btn);
    assert.equal(flow.visibleErrors.length, 0);
    assert.equal(flow.appleLoginError.textContent, '');
    assert.equal(flow.btn.disabled, false);
    assert.equal(flow.posts.length, 0);
    assert.equal(flow.redirects.length, 0);
    assert.equal(flow.remembered.length, 0);
    assert.equal(flow.authFailures.length, 0);
    assert.ok(!flow.logs.some((row) => row.step === 'step_error'));
    assert.equal(authorizeCalls, 1);
  });

  it('C) thrown native cancel is also a quiet abort', async () => {
    const err = new Error('Auktoriseringen avbröts av användaren.');
    err.code = 'ERROR';
    const flow = makeLoginSandbox(async () => {
      throw err;
    });
    await flow.handleAppleLogin(flow.btn);
    assert.equal(flow.visibleErrors.length, 0);
    assert.equal(flow.btn.disabled, false);
    assert.equal(flow.posts.length, 0);
    assert.equal(flow.redirects.length, 0);
    assert.equal(flow.authFailures.length, 0);
  });

  it('B) real Apple auth error still displays the failed banner', async () => {
    loadLocales();
    const failedSv = t('sv-SE', FAILED_KEY);
    const flow = makeLoginSandbox(async () => {
      throw new Error('APPLE_SIGN_IN_FAILED');
    });
    flow.handleAppleLogin = flow.handleAppleLogin;
    await flow.handleAppleLogin(flow.btn);
    assert.ok(flow.visibleErrors.includes(FAILED_KEY));
    assert.notEqual(failedSv, FAILED_KEY);
    assert.match(failedSv, /Apple-inloggning misslyckades/);
    assert.equal(flow.btn.disabled, false);
    assert.equal(flow.posts.length, 0);
    assert.ok(flow.authFailures.includes('APPLE_SIGN_IN_FAILED'));
    assert.ok(flow.logs.some((row) => row.step === 'step_error'));
  });

  it('E) after cancel a second tap can authorize again', async () => {
    const flow = makeLoginSandbox(async () => {
      authorizeCalls += 1;
      return { canceled: true };
    });
    await flow.handleAppleLogin(flow.btn);
    assert.equal(flow.btn.disabled, false);
    await flow.handleAppleLogin(flow.btn);
    assert.equal(authorizeCalls, 2);
    assert.equal(flow.visibleErrors.length, 0);
    assert.equal(flow.posts.length, 0);
  });
});

describe('register Apple cancel path', () => {
  let authorizeCalls;

  beforeEach(() => {
    authorizeCalls = 0;
  });

  it('D) cancel hides Apple error, re-enables button, no backend POST, no redirect', async () => {
    const flow = makeRegisterSandbox(async () => {
      authorizeCalls += 1;
      return { canceled: true };
    });
    await flow.handleAppleRegister();
    assert.equal(flow.visibleErrors.length, 0);
    assert.equal(flow.appleRegisterError.classList.hidden, true);
    assert.equal(flow.btn.disabled, false);
    assert.equal(flow.posts.length, 0);
    assert.equal(flow.redirects.length, 0);
    assert.equal(flow.remembered.length, 0);
    assert.equal(authorizeCalls, 1);
  });

  it('B) real Apple auth error still displays on register', async () => {
    const flow = makeRegisterSandbox(async () => {
      throw new Error('APPLE_SIGN_IN_FAILED');
    });
    await flow.handleAppleRegister();
    assert.ok(flow.visibleErrors.includes(FAILED_KEY));
    assert.equal(flow.appleRegisterError.classList.hidden, false);
    assert.equal(flow.btn.disabled, false);
    assert.equal(flow.posts.length, 0);
  });

  it('E) after register cancel a second tap can authorize again', async () => {
    const flow = makeRegisterSandbox(async () => {
      authorizeCalls += 1;
      return { canceled: true };
    });
    await flow.handleAppleRegister();
    await flow.handleAppleRegister();
    assert.equal(authorizeCalls, 2);
    assert.equal(flow.visibleErrors.length, 0);
    assert.equal(flow.btn.disabled, false);
  });
});

describe('login/register pages load the cancel helper before platform.js', () => {
  it('login and register script order is cancel helper then platform', () => {
    const login = read('public/login.html');
    const register = read('public/register.html');
    const loginCancel = login.indexOf('/js/apple-auth-cancel.js');
    const loginPlatform = login.indexOf('/js/platform.js');
    const registerCancel = register.indexOf('/js/apple-auth-cancel.js');
    const registerPlatform = register.indexOf('/js/platform.js');
    assert.ok(loginCancel > 0 && loginCancel < loginPlatform);
    assert.ok(registerCancel > 0 && registerCancel < registerPlatform);
  });

  it('vendored native plugin rejects cancel as ERR_CANCELED', () => {
    const swift = read('scripts/ios/SignInWithApple-Plugin.patched.swift');
    assert.match(swift, /ERR_CANCELED/);
    assert.match(swift, /ASAuthorizationError\.Code\.canceled/);
    assert.match(swift, /call\.reject\("canceled", "ERR_CANCELED"/);
  });
});
