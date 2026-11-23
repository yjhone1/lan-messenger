import test from 'node:test';
import assert from 'node:assert/strict';
import {configurePreviewAdminPassword, verifyPreviewAdminPassword} from './adminPreview';
test('preview admin gate defaults closed, stores no plaintext and requires old password for rotation', async () => {
  const data = new Map<string, string>();
  const storage = {getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => {data.set(key, value);}};
  const password = 'test-administrator-passphrase';
  assert.equal(await verifyPreviewAdminPassword(password, storage), false);
  assert.equal(await configurePreviewAdminPassword('short', '', storage), false);
  assert.equal(await configurePreviewAdminPassword(password, '', storage), true);
  assert.equal(await verifyPreviewAdminPassword(password, storage), true);
  assert.equal(await verifyPreviewAdminPassword('incorrect', storage), false);
  assert.equal([...data.values()].some(value => value.includes(password)), false);
  assert.equal(await configurePreviewAdminPassword('new-administrator-password', 'wrong', storage), false);
  assert.equal(await configurePreviewAdminPassword('new-administrator-password', password, storage), true);
  assert.equal(await verifyPreviewAdminPassword(password, storage), false);
});
