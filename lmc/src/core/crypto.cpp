/****************************************************************************
**
** This file is part of LAN Messenger.
**
** Copyright (c) 2010 - 2012 Qualia Digital Solutions.
**
** Contact:  qualiatech@gmail.com
**
** LAN Messenger is free software: you can redistribute it and/or modify
** it under the terms of the GNU General Public License as published by
** the Free Software Foundation, either version 3 of the License, or
** (at your option) any later version.
**
** LAN Messenger is distributed in the hope that it will be useful,
** but WITHOUT ANY WARRANTY; without even the implied warranty of
** MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
** GNU General Public License for more details.
**
** You should have received a copy of the GNU General Public License
** along with LAN Messenger.  If not, see <http://www.gnu.org/licenses/>.
**
****************************************************************************/

#include "trace.h"
#include "crypto.h"

lmcCrypto::lmcCrypto(void) {
#if OPENSSL_VERSION_NUMBER >= 0x30000000L
  pRsaKey = NULL;
#else
  pRsa = NULL;
#endif
  encryptMap.clear();
  decryptMap.clear();
  sessionKeyMap.clear();
  sessionIvMap.clear();
  bits = 2048;
  exponent = 65537;
  legacyCompatMode = true; // Default to 'Legacy v1.0' for OpenSSL 1.0 peer compatibility
}

lmcCrypto::~lmcCrypto(void) {
#if OPENSSL_VERSION_NUMBER >= 0x30000000L
  if(pRsaKey)
    EVP_PKEY_free(pRsaKey);
#else
  if(pRsa)
    RSA_free(pRsa);
#endif
}

void lmcCrypto::setLegacyCompatibility(bool enabled) {
  legacyCompatMode = enabled;
  if(!publicKeyLegacy.isEmpty() && !publicKeyStrict.isEmpty()) {
    publicKey = legacyCompatMode ? publicKeyLegacy : publicKeyStrict;
  }
  lmcTrace::write(QString("Crypto protocol header mode set to: ") +
                  (legacyCompatMode ? "Legacy v1.0 (PKCS#1 BEGIN RSA PUBLIC KEY)"
                                    : "Strict v3.0 (SPKI BEGIN PUBLIC KEY)"));
}

bool lmcCrypto::isLegacyCompatibility(void) const {
  return legacyCompatMode;
}

QByteArray lmcCrypto::getPublicKeyForMode(void) const {
  if(legacyCompatMode && !publicKeyLegacy.isEmpty())
    return publicKeyLegacy;
  if(!legacyCompatMode && !publicKeyStrict.isEmpty())
    return publicKeyStrict;
  return publicKey;
}

// Creates an RSA key pair and returns the PEM string representation of the public key.
// Generates both 'Legacy v1.0' (-----BEGIN RSA PUBLIC KEY-----) and 'Strict v3.0'
// (-----BEGIN PUBLIC KEY-----) representations so the user can toggle modes at runtime.
QByteArray lmcCrypto::generateRSA(void) {
  unsigned char buf[256];
  RAND_seed(buf, sizeof(buf));

#if OPENSSL_VERSION_NUMBER >= 0x30000000L
  if(pRsaKey) {
    EVP_PKEY_free(pRsaKey);
    pRsaKey = NULL;
  }
  pRsaKey = EVP_RSA_gen(bits);
  if(!pRsaKey) {
    lmcTrace::write("Error: OpenSSL 3.0 EVP_RSA_gen failed");
    return QByteArray();
  }

  QByteArray pkcs1Pem;
  QByteArray spkiPem;

  // 1. Encode PKCS#1 'type-specific' header for Legacy v1.0 (-----BEGIN RSA PUBLIC KEY-----)
  //    Required by OpenSSL 1.0/1.1 peers calling PEM_read_bio_RSAPublicKey().
  {
    BIO* bioLegacy = BIO_new(BIO_s_mem());
    OSSL_ENCODER_CTX* encLegacy = OSSL_ENCODER_CTX_new_for_pkey(
        pRsaKey, EVP_PKEY_PUBLIC_KEY, "PEM", "type-specific", NULL);
    if(encLegacy && OSSL_ENCODER_to_bio(encLegacy, bioLegacy) == 1) {
      int keylen = BIO_pending(bioLegacy);
      QByteArray legacyBuf(keylen, 0);
      BIO_read(bioLegacy, legacyBuf.data(), keylen);
      pkcs1Pem = legacyBuf;
    }
    if(encLegacy)
      OSSL_ENCODER_CTX_free(encLegacy);
    BIO_free_all(bioLegacy);
  }

  // 2. Encode X.509 'SubjectPublicKeyInfo' header for Strict v3.0 (-----BEGIN PUBLIC KEY-----)
  //    Required by OpenSSL 3.x peers calling PEM_read_bio_PUBKEY().
  {
    BIO* bioStrict = BIO_new(BIO_s_mem());
    if(PEM_write_bio_PUBKEY(bioStrict, pRsaKey) == 1) {
      int keylen = BIO_pending(bioStrict);
      QByteArray strictBuf(keylen, 0);
      BIO_read(bioStrict, strictBuf.data(), keylen);
      spkiPem = strictBuf;
    }
    BIO_free_all(bioStrict);
  }

  // Include both PEM blocks so OpenSSL 1.x (PEM_read_bio_RSAPublicKey) and
  // OpenSSL 3.x (PEM_read_bio_PUBKEY / OSSL_DECODER) both find their expected header.
  publicKeyLegacy = pkcs1Pem + spkiPem;
  publicKeyStrict = spkiPem + pkcs1Pem;
  publicKey = legacyCompatMode ? publicKeyLegacy : publicKeyStrict;
  return publicKey;
#else
  if(pRsa) {
    RSA_free(pRsa);
    pRsa = NULL;
  }
  pRsa = RSA_new();
  BIGNUM* bn = BN_new();
  BN_set_word(bn, exponent);
  RSA_generate_key_ex(pRsa, bits, bn, NULL);
  BN_free(bn);

  QByteArray pkcs1Pem;
  QByteArray spkiPem;

  // 1. Legacy v1.0 PKCS#1 (-----BEGIN RSA PUBLIC KEY-----)
  {
    BIO* bio = BIO_new(BIO_s_mem());
    PEM_write_bio_RSAPublicKey(bio, pRsa);
    int keylen = BIO_pending(bio);
    char* pem_key = (char*)calloc(keylen + 1, 1);
    BIO_read(bio, pem_key, keylen);
    pkcs1Pem = QByteArray(pem_key, keylen);
    BIO_free_all(bio);
    free(pem_key);
  }

  // 2. Strict v3.0 SPKI (-----BEGIN PUBLIC KEY-----)
  {
    BIO* bio = BIO_new(BIO_s_mem());
    PEM_write_bio_RSA_PUBKEY(bio, pRsa);
    int keylen = BIO_pending(bio);
    char* pem_key = (char*)calloc(keylen + 1, 1);
    BIO_read(bio, pem_key, keylen);
    spkiPem = QByteArray(pem_key, keylen);
    BIO_free_all(bio);
    free(pem_key);
  }

  publicKeyLegacy = pkcs1Pem + spkiPem;
  publicKeyStrict = spkiPem + pkcs1Pem;
  publicKey = legacyCompatMode ? publicKeyLegacy : publicKeyStrict;
  return publicKey;
#endif
}

// Generates a random AES-256 key and IV, and encrypts it with the remote peer's public key.
// Accepts both '-----BEGIN RSA PUBLIC KEY-----' (Legacy v1.0) and '-----BEGIN PUBLIC KEY-----' (Strict v3.0).
QByteArray lmcCrypto::generateAES(QString* lpszUserId, QByteArray& pubKey) {
  if(pubKey.isEmpty()) {
    lmcTrace::write("Error: Empty public key received from " + *lpszUserId);
    return QByteArray();
  }

  int keyDataLen = 32;
  unsigned char* keyData = (unsigned char*)malloc(keyDataLen);
  RAND_bytes(keyData, keyDataLen);
  int keyLen = 32;
  int ivLen = EVP_CIPHER_iv_length(EVP_aes_256_cbc());
  int keyIvLen = keyLen + ivLen;
  unsigned char* keyIv = (unsigned char*)malloc(keyIvLen);
  int rounds = 5;
  keyLen = EVP_BytesToKey(EVP_aes_256_cbc(), EVP_sha1(), NULL, keyData, keyDataLen, rounds, keyIv, keyIv + keyLen);

#if OPENSSL_VERSION_NUMBER >= 0x30000000L
  EVP_PKEY* peerKey = NULL;
  BIO* bio = BIO_new_mem_buf(pubKey.constData(), pubKey.length());

  // Use OSSL_DECODER so both PKCS#1 (BEGIN RSA PUBLIC KEY) and SPKI (BEGIN PUBLIC KEY) are parsed cleanly
  OSSL_DECODER_CTX* dctxDec = OSSL_DECODER_CTX_new_for_pkey(
      &peerKey, "PEM", NULL, "RSA", EVP_PKEY_PUBLIC_KEY, NULL, NULL);
  if(dctxDec) {
    OSSL_DECODER_from_bio(dctxDec, bio);
    OSSL_DECODER_CTX_free(dctxDec);
  }
  if(!peerKey) {
    BIO_reset(bio);
    peerKey = PEM_read_bio_PUBKEY(bio, NULL, NULL, NULL);
  }
  BIO_free_all(bio);

  if(!peerKey) {
    lmcTrace::write("Error: Failed to parse peer RSA public key from " + *lpszUserId);
    free(keyIv);
    free(keyData);
    return QByteArray();
  }

  EVP_PKEY_CTX* pctx = EVP_PKEY_CTX_new(peerKey, NULL);
  size_t outLen = 0;
  QByteArray baKeyIv;

  if(pctx && EVP_PKEY_encrypt_init(pctx) > 0 &&
     EVP_PKEY_CTX_set_rsa_padding(pctx, RSA_PKCS1_OAEP_PADDING) > 0) {
    // Always use SHA-1 OAEP digest so both OpenSSL 1.x (hardcoded SHA-1 OAEP) and
    // OpenSSL 3.x peers can decrypt the 48-byte AES-256 key+IV envelope.
    EVP_PKEY_CTX_set_rsa_oaep_md(pctx, EVP_sha1());
    EVP_PKEY_CTX_set_rsa_mgf1_md(pctx, EVP_sha1());

    if(EVP_PKEY_encrypt(pctx, NULL, &outLen, keyIv, keyIvLen) > 0 && outLen > 0) {
      baKeyIv.resize((int)outLen);
      if(EVP_PKEY_encrypt(pctx, (unsigned char*)baKeyIv.data(), &outLen, keyIv, keyIvLen) > 0) {
        baKeyIv.resize((int)outLen);
      } else {
        baKeyIv.clear();
      }
    }
  }

  if(pctx)
    EVP_PKEY_CTX_free(pctx);
  EVP_PKEY_free(peerKey);
#else
  BIO* bio = BIO_new_mem_buf(pubKey.data(), pubKey.length());
  RSA* rsa = NULL;
  if(pubKey.contains("BEGIN RSA PUBLIC KEY")) {
    rsa = PEM_read_bio_RSAPublicKey(bio, NULL, NULL, NULL);
  } else {
    rsa = PEM_read_bio_RSA_PUBKEY(bio, NULL, NULL, NULL);
    if(!rsa) {
      BIO_reset(bio);
      rsa = PEM_read_bio_RSAPublicKey(bio, NULL, NULL, NULL);
    }
  }
  BIO_free_all(bio);

  if(!rsa) {
    lmcTrace::write("Error: Failed to parse peer RSA public key from " + *lpszUserId);
    free(keyIv);
    free(keyData);
    return QByteArray();
  }

  unsigned char* eKeyIv = (unsigned char*)malloc(RSA_size(rsa));
  int eKeyIvLen = RSA_public_encrypt(keyIvLen, keyIv, eKeyIv, rsa, RSA_PKCS1_OAEP_PADDING);
  QByteArray baKeyIv;
  if(eKeyIvLen > 0)
    baKeyIv = QByteArray((char*)eKeyIv, eKeyIvLen);
  RSA_free(rsa);
  free(eKeyIv);
#endif

  if(!baKeyIv.isEmpty()) {
    EVP_CIPHER_CTX ectx, dctx;
    EVP_EncryptInit_ex(ectx.ptr(), EVP_aes_256_cbc(), NULL, keyIv, keyIv + keyLen);
    encryptMap.insert(*lpszUserId, ectx);
    EVP_CIPHER_CTX_init(dctx.ptr());
    EVP_DecryptInit_ex(dctx.ptr(), EVP_aes_256_cbc(), NULL, keyIv, keyIv + keyLen);
    decryptMap.insert(*lpszUserId, dctx);

    sessionKeyMap.insert(*lpszUserId, QByteArray((const char*)keyIv, keyLen));
    sessionIvMap.insert(*lpszUserId, QByteArray((const char*)(keyIv + keyLen), ivLen));
  }

  free(keyIv);
  free(keyData);

  return baKeyIv;
}

// Decrypts the AES-256 key and IV with the local private key.
// Supports both Legacy v1.0 (OAEP-SHA1) and Strict v3.0 (OAEP-SHA256) handshakes seamlessly.
void lmcCrypto::retreiveAES(QString* lpszUserId, QByteArray& aesKeyIv) {
  if(aesKeyIv.isEmpty()) {
    lmcTrace::write("Error: Empty handshake payload from " + *lpszUserId);
    return;
  }

  int keyLen = 32;
  int ivLen = EVP_CIPHER_iv_length(EVP_aes_256_cbc());
  int expectedLen = keyLen + ivLen;

#if OPENSSL_VERSION_NUMBER >= 0x30000000L
  if(!pRsaKey)
    return;

  QByteArray decrypted;
  const EVP_MD* primaryMd = legacyCompatMode ? EVP_sha1() : EVP_sha256();
  const EVP_MD* fallbackMd = legacyCompatMode ? EVP_sha256() : EVP_sha1();
  const EVP_MD* candidates[2] = { primaryMd, fallbackMd };

  for(int i = 0; i < 2; ++i) {
    EVP_PKEY_CTX* pctx = EVP_PKEY_CTX_new(pRsaKey, NULL);
    size_t outLen = 0;
    if(pctx && EVP_PKEY_decrypt_init(pctx) > 0 &&
       EVP_PKEY_CTX_set_rsa_padding(pctx, RSA_PKCS1_OAEP_PADDING) > 0) {
      EVP_PKEY_CTX_set_rsa_oaep_md(pctx, candidates[i]);
      EVP_PKEY_CTX_set_rsa_mgf1_md(pctx, candidates[i]);

      if(EVP_PKEY_decrypt(pctx, NULL, &outLen,
                          (const unsigned char*)aesKeyIv.constData(),
                          aesKeyIv.length()) > 0 && outLen > 0) {
        decrypted.resize((int)outLen);
        if(EVP_PKEY_decrypt(pctx, (unsigned char*)decrypted.data(), &outLen,
                            (const unsigned char*)aesKeyIv.constData(),
                            aesKeyIv.length()) > 0 && (int)outLen >= expectedLen) {
          decrypted.resize((int)outLen);
          EVP_PKEY_CTX_free(pctx);
          break;
        }
        decrypted.clear();
      }
    }
    if(pctx)
      EVP_PKEY_CTX_free(pctx);
  }

  if(decrypted.length() < expectedLen) {
    lmcTrace::write("Error: Handshake RSA-OAEP decryption failed from " + *lpszUserId);
    return;
  }

  const unsigned char* keyIv = (const unsigned char*)decrypted.constData();
  EVP_CIPHER_CTX ectx, dctx;
  EVP_EncryptInit_ex(ectx.ptr(), EVP_aes_256_cbc(), NULL, keyIv, keyIv + keyLen);
  encryptMap.insert(*lpszUserId, ectx);
  EVP_DecryptInit_ex(dctx.ptr(), EVP_aes_256_cbc(), NULL, keyIv, keyIv + keyLen);
  decryptMap.insert(*lpszUserId, dctx);

  sessionKeyMap.insert(*lpszUserId, QByteArray((const char*)keyIv, keyLen));
  sessionIvMap.insert(*lpszUserId, QByteArray((const char*)(keyIv + keyLen), ivLen));
#else
  if(!pRsa)
    return;

  unsigned char* keyIv = (unsigned char*)malloc(RSA_size(pRsa));
  int decLen = RSA_private_decrypt(aesKeyIv.length(), (unsigned char*)aesKeyIv.data(), keyIv, pRsa, RSA_PKCS1_OAEP_PADDING);
  if(decLen < expectedLen) {
    lmcTrace::write("Error: Handshake RSA-OAEP decryption failed from " + *lpszUserId);
    free(keyIv);
    return;
  }

  EVP_CIPHER_CTX ectx, dctx;
  EVP_EncryptInit_ex(ectx.ptr(), EVP_aes_256_cbc(), NULL, keyIv, keyIv + keyLen);
  encryptMap.insert(*lpszUserId, ectx);
  EVP_DecryptInit_ex(dctx.ptr(), EVP_aes_256_cbc(), NULL, keyIv, keyIv + keyLen);
  decryptMap.insert(*lpszUserId, dctx);

  sessionKeyMap.insert(*lpszUserId, QByteArray((const char*)keyIv, keyLen));
  sessionIvMap.insert(*lpszUserId, QByteArray((const char*)(keyIv + keyLen), ivLen));

  free(keyIv);
#endif
}

bool lmcCrypto::hasSession(QString* lpszUserId) {
  return encryptMap.contains(*lpszUserId);
}

QByteArray lmcCrypto::encrypt(QString* lpszUserId, QByteArray& clearData) {
  if(!lpszUserId || !encryptMap.contains(*lpszUserId)) {
    lmcTrace::write("Error: No encryption session for peer");
    return QByteArray();
  }

  int outLen = clearData.length() + AES_BLOCK_SIZE;
  unsigned char* outBuffer = (unsigned char*)malloc(outLen);
  if(outBuffer == NULL) {
    lmcTrace::write("Error: Buffer not allocated");
    return QByteArray();
  }
  int foutLen = 0;

  EVP_CIPHER_CTX ctx = encryptMap.value(*lpszUserId);
  if(EVP_EncryptInit_ex(ctx.ptr(), NULL, NULL, NULL, NULL)) {
    if(EVP_EncryptUpdate(ctx.ptr(), outBuffer, &outLen, (unsigned char*)clearData.data(), clearData.length())) {
      if(EVP_EncryptFinal_ex(ctx.ptr(), outBuffer + outLen, &foutLen)) {
        outLen += foutLen;
        QByteArray byteArray((char*)outBuffer, outLen);
        free(outBuffer);
        return byteArray;
      }
    }
  }
  free(outBuffer);
  lmcTrace::write("Error: Message encryption failed");
  return QByteArray();
}

QByteArray lmcCrypto::decrypt(QString* lpszUserId, QByteArray& cipherData) {
  if(!lpszUserId || !decryptMap.contains(*lpszUserId)) {
    lmcTrace::write("Error: No decryption session for peer");
    return QByteArray();
  }

  int outLen = cipherData.length() + AES_BLOCK_SIZE;
  unsigned char* outBuffer = (unsigned char*)malloc(outLen);
  if(outBuffer == NULL) {
    lmcTrace::write("Error: Buffer not allocated");
    return QByteArray();
  }
  int foutLen = 0;

  EVP_CIPHER_CTX ctx = decryptMap.value(*lpszUserId);
  if(EVP_DecryptInit_ex(ctx.ptr(), NULL, NULL, NULL, NULL)) {
    if(EVP_DecryptUpdate(ctx.ptr(), outBuffer, &outLen, (unsigned char*)cipherData.data(), cipherData.length())) {
      if(EVP_DecryptFinal_ex(ctx.ptr(), outBuffer + outLen, &foutLen)) {
        outLen += foutLen;
        QByteArray byteArray((char*)outBuffer, outLen);
        free(outBuffer);
        return byteArray;
      }
    }
  }
  free(outBuffer);
  lmcTrace::write("Error: Message decryption failed");
  return QByteArray();
}
