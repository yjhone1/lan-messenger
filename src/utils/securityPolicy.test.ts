import test from 'node:test';
import assert from 'node:assert/strict';
import {
  AUTHORIZED_ADMIN_IP,
  normalizeIp,
  isAuthorizedRemoteRequester,
  canConfigureCapturePolicy,
  validateRemoteDesktopRequest,
  evaluateCapturePolicyChange,
  evaluateCaptureUsage,
  evaluateUserCapturePolicyChange,
  evaluateUserCaptureUsage,
} from './securityPolicy';

test('normalizeIp handles bare and IPv6-mapped IPv4 addresses', () => {
  assert.equal(normalizeIp('192.168.10.212'), '192.168.10.212');
  assert.equal(normalizeIp(' ::ffff:192.168.10.212 '), '192.168.10.212');
  assert.equal(normalizeIp('192.168.1.42'), '192.168.1.42');
  assert.equal(normalizeIp(''), '');
});

test('isAuthorizedRemoteRequester returns true strictly for 192.168.10.212', () => {
  assert.equal(isAuthorizedRemoteRequester('192.168.10.212'), true);
  assert.equal(isAuthorizedRemoteRequester('::ffff:192.168.10.212'), true);

  // Unauthorized IPs must be false
  assert.equal(isAuthorizedRemoteRequester('192.168.1.42'), false);
  assert.equal(isAuthorizedRemoteRequester('192.168.1.104'), false);
  assert.equal(isAuthorizedRemoteRequester('192.168.10.211'), false);
  assert.equal(isAuthorizedRemoteRequester('192.168.10.213'), false);
  assert.equal(isAuthorizedRemoteRequester('10.0.0.1'), false);
  assert.equal(isAuthorizedRemoteRequester(''), false);
});

test('canConfigureCapturePolicy returns true strictly for 192.168.10.212', () => {
  assert.equal(canConfigureCapturePolicy('192.168.10.212'), true);
  assert.equal(canConfigureCapturePolicy('::ffff:192.168.10.212'), true);

  // Unauthorized IPs must be false
  assert.equal(canConfigureCapturePolicy('192.168.1.42'), false);
  assert.equal(canConfigureCapturePolicy('192.168.1.104'), false);
  assert.equal(canConfigureCapturePolicy('10.0.0.5'), false);
});

test('validateRemoteDesktopRequest permits only 192.168.10.212 and denies other IPs', () => {
  const allowed = validateRemoteDesktopRequest('192.168.10.212', 'Minho Park (Win7)');
  assert.equal(allowed.allowed, true);
  assert.equal(allowed.requiredIp, AUTHORIZED_ADMIN_IP);
  assert.match(allowed.message, /원격 제어 요청 권한이 승인되었습니다/);

  const denied = validateRemoteDesktopRequest('192.168.1.42', 'Minho Park (Win7)');
  assert.equal(denied.allowed, false);
  assert.equal(denied.requiredIp, AUTHORIZED_ADMIN_IP);
  assert.match(denied.message, /원격 제어 요청은 관리자 IP\(192\.168\.10\.212\)에서만 허용됩니다/);
  assert.match(denied.message, /192\.168\.1\.42/);
});

test('evaluateCapturePolicyChange allows 192.168.10.212 to toggle ON/OFF and rejects others', () => {
  // Admin turns OFF
  const adminTurnOff = evaluateCapturePolicyChange('192.168.10.212', true, false);
  assert.equal(adminTurnOff.allowed, true);
  assert.equal(adminTurnOff.nextState, false);
  assert.match(adminTurnOff.message, /사용 차단\(OFF\) 상태로 변경되었습니다/);

  // Admin turns ON
  const adminTurnOn = evaluateCapturePolicyChange('192.168.10.212', false, true);
  assert.equal(adminTurnOn.allowed, true);
  assert.equal(adminTurnOn.nextState, true);
  assert.match(adminTurnOn.message, /사용 허용\(ON\) 상태로 변경되었습니다/);

  // Non-admin attempts to turn OFF
  const nonAdminTry = evaluateCapturePolicyChange('192.168.1.42', true, false);
  assert.equal(nonAdminTry.allowed, false);
  assert.equal(nonAdminTry.nextState, true); // state remains unchanged
  assert.match(nonAdminTry.message, /관리자 IP\(192\.168\.10\.212\)에서만 변경할 수 있습니다/);
});

test('evaluateCaptureUsage reports whether OpenSourceCapture is usable or disabled by policy', () => {
  const whenEnabled = evaluateCaptureUsage(true);
  assert.equal(whenEnabled.canUse, true);

  const whenDisabled = evaluateCaptureUsage(false);
  assert.equal(whenDisabled.canUse, false);
  assert.match(whenDisabled.message, /192\.168\.10\.212/);
  assert.match(whenDisabled.message, /비활성화\(차단\)/);
});

test('evaluateUserCapturePolicyChange allows only 192.168.10.212 to configure per-user capture', () => {
  const targetUser = { id: 'PEER-WIN7', name: 'Minho Park (Win7)', captureEnabled: true };

  // 192.168.10.212 turns off Minho's capture
  const adminResult = evaluateUserCapturePolicyChange('192.168.10.212', targetUser, false);
  assert.equal(adminResult.allowed, true);
  assert.equal(adminResult.nextState, false);
  assert.equal(adminResult.targetUserId, 'PEER-WIN7');
  assert.match(adminResult.message, /Minho Park/);
  assert.match(adminResult.message, /사용 차단\(OFF\)/);

  // 192.168.10.212 turns on Minho's capture
  const adminTurnOn = evaluateUserCapturePolicyChange('::ffff:192.168.10.212', { ...targetUser, captureEnabled: false }, true);
  assert.equal(adminTurnOn.allowed, true);
  assert.equal(adminTurnOn.nextState, true);
  assert.match(adminTurnOn.message, /사용 허용\(ON\)/);

  // Unauthorized IP (192.168.1.42) attempts to toggle Minho's capture
  const nonAdminResult = evaluateUserCapturePolicyChange('192.168.1.42', targetUser, false);
  assert.equal(nonAdminResult.allowed, false);
  assert.equal(nonAdminResult.nextState, true); // untouched
  assert.match(nonAdminResult.message, /192\.168\.10\.212/);
});

test('evaluateUserCaptureUsage checks both global and user-specific capture states', () => {
  // Global ON, User ON -> Allowed
  const r1 = evaluateUserCaptureUsage({ id: 'U1', name: 'Alice', captureEnabled: true }, true);
  assert.equal(r1.canUse, true);

  // Global ON, User undefined (default) -> Allowed
  const r2 = evaluateUserCaptureUsage({ id: 'U2', name: 'Bob' }, true);
  assert.equal(r2.canUse, true);

  // Global OFF -> Blocked globally
  const r3 = evaluateUserCaptureUsage({ id: 'U1', name: 'Alice', captureEnabled: true }, false);
  assert.equal(r3.canUse, false);
  assert.equal(r3.userSpecific, false);
  assert.match(r3.message, /기능 전체가 비활성화/);

  // Global ON, User OFF -> Blocked per-user
  const r4 = evaluateUserCaptureUsage({ id: 'U1', name: 'Alice', captureEnabled: false }, true);
  assert.equal(r4.canUse, false);
  assert.equal(r4.userSpecific, true);
  assert.match(r4.message, /Alice/);
  assert.match(r4.message, /개별 차단\(OFF\)/);
});

