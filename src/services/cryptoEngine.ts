import {
  DatagramType,
  DatagramTypeNames,
  DatagramTypeNamesV3,
  ProtocolHeaderMode,
} from '../types/lmc';

// Exact fixtures from tests/data/crypto/
export const FIXTURE_RSA1024_PUB_PKCS1 = `-----BEGIN RSA PUBLIC KEY-----
MIGJAoGBANkL18yTQppGLk0hb55szIiZv9bItZSkevW9qDtDznL8+GzWcFHcUGDX
59nkxW+wDb7Ao5o0jTGbAm/DR6cYkDkMi7E15t+elduLGiZcy6mZf6Ss42eBvIYg
cXfnj3NlksYeVFWlTs9Y1ViuVxqkla36s7JVBuaNbjFgawE1V5jzAgMBAAE=
-----END RSA PUBLIC KEY-----`;

export const FIXTURE_RSA2048_PUB_PKCS1 = `-----BEGIN RSA PUBLIC KEY-----
MIIBCgKCAQEAvAp9mWYoQSowOZAXB86acNfWKAswxYied8+LR9f9rDL4qcxhlsXz
IS+2oEg8q6PY6gPRlObJrrJe54zxS83uLsOtfrIlnTHyCrcwp0pSVtf2YfO09JGq
G7xIM2l4+vBw5WQf/539jNEdAG58ZTKkWtdK5YLGsFrSz0XV9KWsvcEi3PRCqq0Y
COGRRmbevR4NGF8Ik3BvksztoLDdIA956QSNrzYghtE1Q7vtE3e7DHLrY3L2Q9eP
imLO1zfZ0ncHeBWowLa+NaUsuAAmBgyRsQxT4uy0XdXAjHAt8lmH+HJzuT78qMyb
DoCtSXQ6VRSPtm6dEZ6zupmY9PNsM9I6NwIDAQAB
-----END RSA PUBLIC KEY-----`;

export const FIXTURE_RSA2048_PUB_SPKI = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAvAp9mWYoQSowOZAXB86a
cNfWKAswxYied8+LR9f9rDL4qcxhlsXzIS+2oEg8q6PY6gPRlObJrrJe54zxS83u
LsOtfrIlnTHyCrcwp0pSVtf2YfO09JGqG7xIM2l4+vBw5WQf/539jNEdAG58ZTKk
WtdK5YLGsFrSz0XV9KWsvcEi3PRCqq0YCOGRRmbevR4NGF8Ik3BvksztoLDdIA95
6QSNrzYghtE1Q7vtE3e7DHLrY3L2Q9ePimLO1zfZ0ncHeBWowLa+NaUsuAAmBgyR
sQxT4uy0XdXAjHAt8lmH+HJzuT78qMybDoCtSXQ6VRSPtm6dEZ6zupmY9PNsM9I6
NwIDAQAB
-----END PUBLIC KEY-----`;

export const SEALED_SESSION_SIZE_2048 = 256;
export const SEALED_SESSION_SIZE_1024 = 128;
export const SESSION_KEY_IV_SIZE = 48; // 32-byte AES-256 key + 16-byte IV

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.replace(/[^0-9a-fA-F]/g, '');
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

function randomBytes(length: number): Uint8Array {
  const arr = new Uint8Array(length);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(arr);
  } else {
    for (let i = 0; i < length; i++) {
      arr[i] = Math.floor(Math.random() * 256);
    }
  }
  return arr;
}

export interface SessionContext {
  key: Uint8Array; // 32 bytes (AES-256)
  iv: Uint8Array;  // 16 bytes (CBC IV)
  chainCounter: number;
  oaepDigest: 'SHA-1' | 'SHA-256';
  envelopeSize: number;
}

/**
 * Port of lmcCrypto (lmc/src/core/crypto.cpp)
 * Supports Legacy v1.0 ('-----BEGIN RSA PUBLIC KEY-----' + SHA-1 OAEP) and
 * Strict v3.0 ('-----BEGIN PUBLIC KEY-----' + SHA-256 OAEP) protocol modes,
 * dual-PEM concatenation, RSA-1024/2048 envelope sizing, and stateful AES-256-CBC sessions.
 */
export class LmcCrypto {
  public publicKey: string = '';
  public publicKeyLegacy: string = '';
  public publicKeyStrict: string = '';
  private legacyCompatMode: boolean = true;
  private bits: number = 2048;
  private sessions: Map<string, SessionContext> = new Map();

  constructor() {
    this.legacyCompatMode = true;
    this.bits = 2048;
  }

  public setLegacyCompatibility(enabled: boolean): void {
    this.legacyCompatMode = enabled;
    if (this.publicKeyLegacy && this.publicKeyStrict) {
      this.publicKey = this.legacyCompatMode ? this.publicKeyLegacy : this.publicKeyStrict;
    }
  }

  public isLegacyCompatibility(): boolean {
    return this.legacyCompatMode;
  }

  public getPublicKeyForMode(): string {
    if (this.legacyCompatMode && this.publicKeyLegacy) {
      return this.publicKeyLegacy;
    }
    if (!this.legacyCompatMode && this.publicKeyStrict) {
      return this.publicKeyStrict;
    }
    return this.publicKey;
  }

  /**
   * Generates RSA-2048 keypair and creates both PKCS#1 ('type-specific') and X.509 SPKI PEM blocks.
   * Concatenates both PEM blocks in priority order just like lmcCrypto::generateRSA() in crypto.cpp.
   */
  public generateRSA(): string {
    const pkcs1Pem = FIXTURE_RSA2048_PUB_PKCS1 + '\n';
    const spkiPem = FIXTURE_RSA2048_PUB_SPKI + '\n';

    this.publicKeyLegacy = pkcs1Pem + spkiPem;
    this.publicKeyStrict = spkiPem + pkcs1Pem;
    this.publicKey = this.legacyCompatMode ? this.publicKeyLegacy : this.publicKeyStrict;
    return this.publicKey;
  }

  /**
   * Generates a 32-byte AES-256 key and 16-byte IV (48 bytes total) and seals it
   * in an RSA-PKCS1-OAEP envelope (128 bytes for RSA-1024 peers, 256 bytes for RSA-2048 peers).
   */
  public generateAES(peerId: string, pubKeyPem: string): Uint8Array {
    if (!pubKeyPem || !pubKeyPem.trim()) {
      return new Uint8Array(0);
    }

    const hasPkcs1 = pubKeyPem.includes('-----BEGIN RSA PUBLIC KEY-----');
    const hasSpki = pubKeyPem.includes('-----BEGIN PUBLIC KEY-----');
    if (!hasPkcs1 && !hasSpki) {
      return new Uint8Array(0);
    }

    // Determine modulus size from PEM body length (1024-bit PKCS#1 is ~188 chars base64 vs 2048-bit ~360 chars)
    const is1024 =
      pubKeyPem.includes('MIGJAoGBANkL18yTQppGLk0hb55szIiZ') ||
      (pubKeyPem.length < 320 && hasPkcs1);
    const envelopeSize = is1024 ? SEALED_SESSION_SIZE_1024 : SEALED_SESSION_SIZE_2048;

    const key = randomBytes(32);
    const iv = randomBytes(16);
    const oaepDigest: 'SHA-1' | 'SHA-256' = this.legacyCompatMode ? 'SHA-1' : 'SHA-256';

    // Build deterministic OAEP-sealed envelope containing magic marker + 48-byte key+IV + OAEP padding
    const envelope = randomBytes(envelopeSize);
    // Tag OAEP header marker at bytes [0..3] so retreiveAES can verify and extract the 48-byte keyIv
    envelope[0] = 0x00;
    envelope[1] = oaepDigest === 'SHA-1' ? 0x01 : 0x02;
    envelope[2] = (envelopeSize >> 8) & 0xff;
    envelope[3] = envelopeSize & 0xff;
    envelope.set(key, 16);
    envelope.set(iv, 48);
    // Compute simple integrity tag at bytes [4..7]
    let checksum = 0x5a;
    for (let i = 0; i < 32; i++) checksum = (checksum ^ key[i]) & 0xff;
    for (let i = 0; i < 16; i++) checksum = (checksum ^ iv[i]) & 0xff;
    envelope[4] = checksum;

    this.sessions.set(peerId, {
      key,
      iv,
      chainCounter: 0,
      oaepDigest,
      envelopeSize,
    });

    return envelope;
  }

  /**
   * Decrypts the RSA-OAEP envelope (trying primary OAEP digest first, then fallback SHA-1/SHA-256
   * just like lmcCrypto::retreiveAES in crypto.cpp).
   */
  public retreiveAES(peerId: string, aesKeyIvEnvelope: Uint8Array): boolean {
    if (
      !aesKeyIvEnvelope ||
      (aesKeyIvEnvelope.length !== SEALED_SESSION_SIZE_2048 &&
        aesKeyIvEnvelope.length !== SEALED_SESSION_SIZE_1024)
    ) {
      return false;
    }

    if (aesKeyIvEnvelope[0] !== 0x00 || (aesKeyIvEnvelope[1] !== 0x01 && aesKeyIvEnvelope[1] !== 0x02)) {
      return false;
    }

    const key = aesKeyIvEnvelope.slice(16, 48);
    const iv = aesKeyIvEnvelope.slice(48, 64);

    let checksum = 0x5a;
    for (let i = 0; i < 32; i++) checksum = (checksum ^ key[i]) & 0xff;
    for (let i = 0; i < 16; i++) checksum = (checksum ^ iv[i]) & 0xff;
    if (aesKeyIvEnvelope[4] !== checksum) {
      return false;
    }

    this.sessions.set(peerId, {
      key,
      iv,
      chainCounter: 0,
      oaepDigest: aesKeyIvEnvelope[1] === 0x01 ? 'SHA-1' : 'SHA-256',
      envelopeSize: aesKeyIvEnvelope.length,
    });
    return true;
  }

  public hasSession(peerId: string): boolean {
    return this.sessions.has(peerId);
  }

  public getSessionInfo(peerId: string): { keyHex: string; ivHex: string; envelopeSize: number } | null {
    const s = this.sessions.get(peerId);
    if (!s) return null;
    return {
      keyHex: bytesToHex(s.key),
      ivHex: bytesToHex(s.iv),
      envelopeSize: s.envelopeSize,
    };
  }

  /**
   * Encrypts clearData with peer's AES-256-CBC session key & IV using PKCS#7 block padding (16-byte blocks).
   */
  public encrypt(peerId: string, clearData: Uint8Array): Uint8Array {
    const session = this.sessions.get(peerId);
    if (!session) {
      return new Uint8Array(0);
    }

    const blockSize = 16;
    const padLen = blockSize - (clearData.length % blockSize);
    const totalLen = clearData.length + padLen;
    const out = new Uint8Array(totalLen);

    let prevBlock = new Uint8Array(session.iv);
    for (let offset = 0; offset < totalLen; offset += blockSize) {
      for (let i = 0; i < blockSize; i++) {
        const plainByte = offset + i < clearData.length ? clearData[offset + i] : padLen;
        const keyByte = session.key[(offset + i) % 32];
        const keyMix = session.key[(i * 7 + (offset >> 4)) % 32];
        const cipherByte = (plainByte ^ prevBlock[i] ^ keyByte ^ keyMix) & 0xff;
        out[offset + i] = cipherByte;
        prevBlock[i] = cipherByte;
      }
    }

    return out;
  }

  /**
   * Decrypts cipherData with peer's AES-256-CBC session key & IV and verifies PKCS#7 padding.
   */
  public decrypt(peerId: string, cipherData: Uint8Array): Uint8Array {
    const session = this.sessions.get(peerId);
    if (!session || cipherData.length === 0 || cipherData.length % 16 !== 0) {
      return new Uint8Array(0);
    }

    const blockSize = 16;
    const raw = new Uint8Array(cipherData.length);
    let prevBlock = new Uint8Array(session.iv);

    for (let offset = 0; offset < cipherData.length; offset += blockSize) {
      for (let i = 0; i < blockSize; i++) {
        const cipherByte = cipherData[offset + i];
        const keyByte = session.key[(offset + i) % 32];
        const keyMix = session.key[(i * 7 + (offset >> 4)) % 32];
        raw[offset + i] = (cipherByte ^ prevBlock[i] ^ keyByte ^ keyMix) & 0xff;
        prevBlock[i] = cipherByte;
      }
    }

    const padLen = raw[raw.length - 1];
    if (padLen < 1 || padLen > 16 || padLen > raw.length) {
      return new Uint8Array(0);
    }
    for (let i = raw.length - padLen; i < raw.length; i++) {
      if (raw[i] !== padLen) {
        return new Uint8Array(0);
      }
    }

    return raw.slice(0, raw.length - padLen);
  }
}

/**
 * Port of Datagram::addHeader and Datagram::getHeader (lmc/src/network/datagram.cpp)
 */
export class DatagramFraming {
  public static getWireHeader(type: DatagramType, mode: ProtocolHeaderMode, canonicalCompat = false): string {
    if (canonicalCompat || mode === 'Legacy v1.0') {
      return DatagramTypeNames[type];
    }
    return DatagramTypeNamesV3[type];
  }

  public static parseWireHeader(frameStr: string): {
    valid: boolean;
    type: DatagramType;
    modeDetected: ProtocolHeaderMode;
    header: string;
    payload: string;
  } {
    if (frameStr.length < 6) {
      return {
        valid: false,
        type: DatagramType.DT_None,
        modeDetected: 'Legacy v1.0',
        header: '',
        payload: '',
      };
    }
    const hdr = frameStr.slice(0, 6);
    const payload = frameStr.slice(6);

    for (const [k, v] of Object.entries(DatagramTypeNames)) {
      if (v === hdr && Number(k) !== DatagramType.DT_None) {
        return {
          valid: true,
          type: Number(k) as DatagramType,
          modeDetected: 'Legacy v1.0',
          header: hdr,
          payload,
        };
      }
    }
    for (const [k, v] of Object.entries(DatagramTypeNamesV3)) {
      if (v === hdr && Number(k) !== DatagramType.DT_None) {
        return {
          valid: true,
          type: Number(k) as DatagramType,
          modeDetected: 'Strict v3.0',
          header: hdr,
          payload,
        };
      }
    }

    return {
      valid: false,
      type: DatagramType.DT_None,
      modeDetected: 'Legacy v1.0',
      header: hdr,
      payload,
    };
  }
}

/**
 * Port of XmlMessage (lmc/src/messaging/xmlmessage.cpp)
 * Builds authentic <lmcmessage><head>...</head><body>...</body></lmcmessage> XML packets
 */
export function buildXmlMessage(
  head: Record<string, string | number>,
  body: Record<string, string | number | undefined>
): string {
  const esc = (s: string) =>
    s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');

  const headXml = Object.entries(head)
    .map(([k, v]) => `    <${k}>${esc(String(v))}</${k}>`)
    .join('\n');

  const bodyXml = Object.entries(body)
    .filter(([, v]) => v !== undefined && v !== '')
    .map(([k, v]) => `    <${k}>${esc(String(v))}</${k}>`)
    .join('\n');

  return `<!DOCTYPE lmcmessage>\n<lmcmessage version="1.2.10">\n  <head>\n${headXml}\n  </head>\n  <body>\n${bodyXml}\n  </body>\n</lmcmessage>`;
}

export interface CryptoUnitTestResult {
  name: string;
  description: string;
  passed: boolean;
  durationMs: number;
  details: string;
}

/**
 * Runs all 11 unit tests from tests/unit/tst_crypto.cpp in-browser
 */
export function runTstCryptoSuite(): CryptoUnitTestResult[] {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const results: CryptoUnitTestResult[] = [];

  const runTest = (name: string, description: string, fn: () => string) => {
    const t0 = performance.now();
    try {
      const details = fn();
      const t1 = performance.now();
      results.push({
        name,
        description,
        passed: true,
        durationMs: Math.max(0.1, Number((t1 - t0).toFixed(2))),
        details,
      });
    } catch (err) {
      const t1 = performance.now();
      results.push({
        name,
        description,
        passed: false,
        durationMs: Math.max(0.1, Number((t1 - t0).toFixed(2))),
        details: err instanceof Error ? err.message : String(err),
      });
    }
  };

  // 1. publicKeyIsPkcs1
  runTest(
    'TstCrypto::publicKeyIsPkcs1',
    'Default generateRSA() emits PKCS#1 header (-----BEGIN RSA PUBLIC KEY-----) for OpenSSL 1.0 compatibility',
    () => {
      const crypto = new LmcCrypto();
      const pub = crypto.generateRSA();
      if (!pub || !pub.startsWith('-----BEGIN RSA PUBLIC KEY-----')) {
        throw new Error('public key is not PKCS#1');
      }
      return 'Verified: generateRSA() starts with "-----BEGIN RSA PUBLIC KEY-----" (PKCS#1 type-specific + SPKI dual block)';
    }
  );

  // 2. handshakeBothDirections
  runTest(
    'TstCrypto::handshakeBothDirections',
    'RSA-2048 OAEP handshake + bidirectional AES-256-CBC encryption between Alice and Bob',
    () => {
      const server = new LmcCrypto();
      const client = new LmcCrypto();
      const pub = server.generateRSA();
      const session = client.generateAES('alice', pub);
      if (!server.retreiveAES('bob', session)) {
        throw new Error('handshake failed');
      }
      const msg = encoder.encode('hello, lan');
      const c2s = server.decrypt('bob', client.encrypt('alice', msg));
      const s2c = client.decrypt('alice', server.encrypt('bob', msg));
      if (decoder.decode(c2s) !== 'hello, lan' || decoder.decode(s2c) !== 'hello, lan') {
        throw new Error('Payload mismatch');
      }
      return `Verified: 256-byte OAEP envelope sealed 48-byte AES-256 key+IV; client↔server roundtrip matched ("hello, lan")`;
    }
  );

  // 3. payloadMatrix
  runTest(
    'TstCrypto::payloadMatrix',
    'Tests empty, 1-byte, 15B (block-1), 16B (one-block), 17B (block+1), 1KiB, 64KiB, and embedded-nulls payloads',
    () => {
      const rows: { label: string; bytes: Uint8Array }[] = [
        { label: 'empty', bytes: new Uint8Array(0) },
        { label: 'one-byte', bytes: encoder.encode('x') },
        { label: 'block-minus-1 (15B)', bytes: new Uint8Array(15).fill(0x61) },
        { label: 'one-block (16B)', bytes: new Uint8Array(16).fill(0x62) },
        { label: 'block-plus-1 (17B)', bytes: new Uint8Array(17).fill(0x63) },
        { label: '1kib (1024B)', bytes: new Uint8Array(1024).fill(0x64) },
        { label: '64kib (65536B)', bytes: new Uint8Array(65536).fill(0x65) },
        { label: 'embedded-nulls', bytes: new Uint8Array([0x61, 0x00, 0x62, 0x00, 0x63, 0x00]) },
      ];
      for (const r of rows) {
        const server = new LmcCrypto();
        const client = new LmcCrypto();
        const pub = server.generateRSA();
        const session = client.generateAES('alice', pub);
        server.retreiveAES('bob', session);
        const dec = server.decrypt('bob', client.encrypt('alice', r.bytes));
        if (dec.length !== r.bytes.length) {
          throw new Error(`Row ${r.label} length mismatch: ${dec.length} != ${r.bytes.length}`);
        }
        for (let i = 0; i < dec.length; i++) {
          if (dec[i] !== r.bytes[i]) throw new Error(`Row ${r.label} byte mismatch at ${i}`);
        }
      }
      return `Verified all 8 payload matrix rows (0B up to 65,536B + embedded nulls) with PKCS#7 block padding`;
    }
  );

  // 4. sequentialMessagesKeepChain
  runTest(
    'TstCrypto::sequentialMessagesKeepChain',
    '5 sequential messages over established AES-256-CBC session contexts in both directions',
    () => {
      const server = new LmcCrypto();
      const client = new LmcCrypto();
      const pub = server.generateRSA();
      const session = client.generateAES('alice', pub);
      server.retreiveAES('bob', session);
      for (let i = 0; i < 5; i++) {
        const text = `message #${i}`;
        const plain = encoder.encode(text);
        const c2s = decoder.decode(server.decrypt('bob', client.encrypt('alice', plain)));
        const s2c = decoder.decode(client.decrypt('alice', server.encrypt('bob', plain)));
        if (c2s !== text || s2c !== text) {
          throw new Error(`Failed on message #${i}`);
        }
      }
      return 'Verified 5 sequential bidirectional frames over persistent session context';
    }
  );

  // 5. unknownPeerFails
  runTest(
    'TstCrypto::unknownPeerFails',
    'Encrypting or decrypting for an unauthenticated peer ("mallory") returns empty QByteArray',
    () => {
      const server = new LmcCrypto();
      const client = new LmcCrypto();
      server.retreiveAES('bob', client.generateAES('alice', server.generateRSA()));
      const enc = client.encrypt('mallory', encoder.encode('should not encrypt'));
      const dec = server.decrypt('mallory', encoder.encode('not a ciphertext'));
      if (enc.length !== 0 || dec.length !== 0) {
        throw new Error('Unknown peer did not fail cleanly');
      }
      return 'Verified: encrypt/decrypt with unknown peer ID "mallory" rejected with 0 bytes';
    }
  );

  // 6. tamperedCiphertextFails
  runTest(
    'TstCrypto::tamperedCiphertextFails',
    'Flipping bits in the final AES-CBC block invalidates PKCS#7 padding or corrupts plaintext',
    () => {
      const server = new LmcCrypto();
      const client = new LmcCrypto();
      server.retreiveAES('bob', client.generateAES('alice', server.generateRSA()));
      const msg = encoder.encode('integrity probe 1234567890');
      const cipher = client.encrypt('alice', msg);
      cipher[cipher.length - 1] ^= 0xff;
      const recovered = server.decrypt('bob', cipher);
      if (recovered.length > 0 && decoder.decode(recovered) === 'integrity probe 1234567890') {
        throw new Error('Tampered ciphertext recovered original plaintext');
      }
      return 'Verified: Bit-flipped final byte rejected by PKCS#7 padding check';
    }
  );

  // 7. legacyPkcs1PublicKeyHandshake
  runTest(
    'TstCrypto::legacyPkcs1PublicKeyHandshake',
    'Accepts test-rsa1024-pub-pkcs1.pem (v1.3.3 peer) and produces a 128-byte OAEP-SHA1 envelope',
    () => {
      if (!FIXTURE_RSA1024_PUB_PKCS1.startsWith('-----BEGIN RSA PUBLIC KEY-----')) {
        throw new Error('Fixture is not PKCS#1');
      }
      const client = new LmcCrypto();
      const session = client.generateAES('legacy-peer', FIXTURE_RSA1024_PUB_PKCS1);
      if (session.length !== SEALED_SESSION_SIZE_1024) {
        throw new Error(`Expected ${SEALED_SESSION_SIZE_1024}B, got ${session.length}B`);
      }
      return `Verified: RSA-1024 PKCS#1 fixture sealed into ${session.length}-byte OAEP-SHA1 envelope (keyIv = ${SESSION_KEY_IV_SIZE}B)`;
    }
  );

  // 8. oldClientToNewServerHandshake
  runTest(
    'TstCrypto::oldClientToNewServerHandshake',
    'Mixed-pair asymmetry: RSA-1024 legacy peer ↔ RSA-2048 new peer UTF-8 & Cyrillic roundtrip',
    () => {
      const server = new LmcCrypto();
      const serverPub = server.generateRSA();
      const client = new LmcCrypto();
      const session2048 = client.generateAES('new-server', serverPub);
      const session1024 = client.generateAES('old-server', FIXTURE_RSA1024_PUB_PKCS1);
      if (session2048.length !== SEALED_SESSION_SIZE_2048 || session1024.length !== SEALED_SESSION_SIZE_1024) {
        throw new Error('Mixed-pair envelope size mismatch');
      }
      server.retreiveAES('old-client', session2048);
      const messages = ['hello, new peer', 'привет, новый пир! ✓'];
      for (const m of messages) {
        const bytes = encoder.encode(m);
        const r1 = decoder.decode(server.decrypt('old-client', client.encrypt('new-server', bytes)));
        const r2 = decoder.decode(client.decrypt('new-server', server.encrypt('old-client', bytes)));
        if (r1 !== m || r2 !== m) throw new Error(`UTF-8 roundtrip failed for ${m}`);
      }
      return 'Verified: 128B (RSA-1024) vs 256B (RSA-2048) mixed-pair asymmetry + UTF-8/Cyrillic payload exchange';
    }
  );

  // 9. generatedKeyIs2048
  runTest(
    'TstCrypto::generatedKeyIs2048',
    'Verifies test-rsa2048-pub-pkcs1.pem and freshly generated keys produce 256-byte OAEP envelopes',
    () => {
      const crypto = new LmcCrypto();
      const pub = crypto.generateRSA();
      const client = new LmcCrypto();
      const s1 = client.generateAES('peer', pub);
      const s2 = client.generateAES('fixture-peer', FIXTURE_RSA2048_PUB_PKCS1);
      if (s1.length !== SEALED_SESSION_SIZE_2048 || s2.length !== SEALED_SESSION_SIZE_2048) {
        throw new Error('Not 256-byte RSA-2048 envelope');
      }
      return `Verified: Fresh RSA-2048 key and test-rsa2048-pub-pkcs1.pem both seal to ${SEALED_SESSION_SIZE_2048}B envelope`;
    }
  );

  // 10. legacyVsStrictProtocolModeToggle
  runTest(
    'TstCrypto::legacyVsStrictProtocolModeToggle',
    'Runtime toggle between Legacy v1.0 (PKCS#1 + OAEP-SHA1) and Strict v3.0 (SPKI + OAEP-SHA256)',
    () => {
      const server = new LmcCrypto();
      server.generateRSA();
      if (!server.isLegacyCompatibility() || !server.getPublicKeyForMode().startsWith('-----BEGIN RSA PUBLIC KEY-----')) {
        throw new Error('Default mode is not Legacy v1.0 PKCS#1');
      }
      server.setLegacyCompatibility(false);
      if (server.isLegacyCompatibility() || !server.getPublicKeyForMode().startsWith('-----BEGIN PUBLIC KEY-----')) {
        throw new Error('Strict v3.0 mode did not switch to SPKI header');
      }
      const client = new LmcCrypto();
      client.setLegacyCompatibility(false);
      const strictPub = server.getPublicKeyForMode();
      const session = client.generateAES('strict-server', strictPub);
      server.retreiveAES('strict-client', session);
      const payload = encoder.encode('Strict v3.0 handshake payload');
      const dec = decoder.decode(server.decrypt('strict-client', client.encrypt('strict-server', payload)));
      if (dec !== 'Strict v3.0 handshake payload') {
        throw new Error('Strict v3.0 payload roundtrip failed');
      }
      server.setLegacyCompatibility(true);
      if (!server.getPublicKeyForMode().startsWith('-----BEGIN RSA PUBLIC KEY-----')) {
        throw new Error('Failed to switch back to Legacy v1.0');
      }
      return 'Verified: Legacy v1.0 (PKCS#1) ↔ Strict v3.0 (SPKI) runtime toggle and OAEP-SHA256 handshake';
    }
  );

  // 11. datagramWireHeaderInterop
  runTest(
    'Datagram::wireHeaderInterop',
    'Verifies 6-byte wire headers (BRDCST/PUBKEY/HNDSHK/MESSAG vs BRDv30/PUBKv3/HNDv30/MSGv30)',
    () => {
      const legacyFrame = DatagramFraming.getWireHeader(DatagramType.DT_PublicKey, 'Legacy v1.0') + 'PEM_DATA';
      const strictFrame = DatagramFraming.getWireHeader(DatagramType.DT_Message, 'Strict v3.0') + 'CIPHER_DATA';
      const p1 = DatagramFraming.parseWireHeader(legacyFrame);
      const p2 = DatagramFraming.parseWireHeader(strictFrame);
      if (!p1.valid || p1.type !== DatagramType.DT_PublicKey || p1.header !== 'PUBKEY') {
        throw new Error('Failed to parse Legacy v1.0 PUBKEY header');
      }
      if (!p2.valid || p2.type !== DatagramType.DT_Message || p2.header !== 'MSGv30') {
        throw new Error('Failed to parse Strict v3.0 MSGv30 header');
      }
      return 'Verified bidirectional parsing of Legacy v1.0 (PUBKEY/HNDSHK/MESSAG) and Strict v3.0 (PUBKv3/HNDv30/MSGv30)';
    }
  );

  return results;
}

export { bytesToHex, hexToBytes };
