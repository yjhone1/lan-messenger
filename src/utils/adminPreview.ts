// Browser demonstration only. Native endpoint authentication is implemented in security/adminauth.cpp.
type Store = Pick<Storage, 'getItem' | 'setItem'>;
const storageKey = 'lmc.preview.admin.v1';
const toHex = (bytes: Uint8Array) => Array.from(bytes, n => n.toString(16).padStart(2, '0')).join('');
async function derive(password: string, salt: string): Promise<string> {
  const raw = Uint8Array.from(salt.match(/../g) || [], value => parseInt(value, 16));
  const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({name: 'PBKDF2', hash: 'SHA-256', salt: raw, iterations: 200000}, material, 256);
  return toHex(new Uint8Array(bits));
}
export async function verifyPreviewAdminPassword(password: string, storage: Store = localStorage): Promise<boolean> {
  try {
    if(password.length > 1024) return false;
    const credential = JSON.parse(storage.getItem(storageKey) || 'null');
    if(!credential || !/^[0-9a-f]{32}$/.test(credential.salt) || !/^[0-9a-f]{64}$/.test(credential.verifier)) return false;
    const candidate = await derive(password, credential.salt);
    let difference = 0;
    for(let i = 0; i < 64; i++) difference |= candidate.charCodeAt(i) ^ credential.verifier.charCodeAt(i);
    return difference === 0;
  } catch { return false; }
}
export async function configurePreviewAdminPassword(password: string, current = '', storage: Store = localStorage): Promise<boolean> {
  try {
    if(password.length < 12 || password.length > 1024) return false;
    if(storage.getItem(storageKey) && !await verifyPreviewAdminPassword(current, storage)) return false;
    const salt = toHex(crypto.getRandomValues(new Uint8Array(16)));
    storage.setItem(storageKey, JSON.stringify({salt, verifier: await derive(password, salt)}));
    return true;
  } catch { return false; }
}
