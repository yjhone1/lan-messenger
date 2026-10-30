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

#ifndef CRYPTO_H
#define CRYPTO_H

#include <QMap>
#include <QByteArray>
#include <QString>
#include <QDataStream>
#include <openssl/opensslv.h>
#include <openssl/rand.h>
#include <openssl/rsa.h>
#include <openssl/pem.h>
#include <openssl/aes.h>
#include <openssl/evp.h>
#if OPENSSL_VERSION_NUMBER >= 0x30000000L
#include <openssl/encoder.h>
#include <openssl/decoder.h>
#include <openssl/core_names.h>
#endif

class EVP_CIPHER_CTX_wrapper {
public:
#if OPENSSL_VERSION_NUMBER < 0x10100000L

  EVP_CIPHER_CTX_wrapper() {
    EVP_CIPHER_CTX_init(&ctx);
  }
  EVP_CIPHER_CTX* ptr() {
    return &ctx;
  }

  EVP_CIPHER_CTX ctx;

#else

  EVP_CIPHER_CTX_wrapper() {
    ctx = EVP_CIPHER_CTX_new();
    EVP_CIPHER_CTX_init(ctx);
  }

  EVP_CIPHER_CTX_wrapper(const EVP_CIPHER_CTX_wrapper& other) {
    ctx = EVP_CIPHER_CTX_new();
    EVP_CIPHER_CTX_copy(ctx, other.ctx);
  }

  EVP_CIPHER_CTX_wrapper& operator=(const EVP_CIPHER_CTX_wrapper& other) {
    if(this != &other)
      EVP_CIPHER_CTX_copy(ctx, other.ctx);
    return *this;
  }

  ~EVP_CIPHER_CTX_wrapper() {
    EVP_CIPHER_CTX_free(ctx);
  }

  EVP_CIPHER_CTX* ptr() {
    return ctx;
  }

  EVP_CIPHER_CTX* ctx;

#endif
};

#define EVP_CIPHER_CTX EVP_CIPHER_CTX_wrapper

class lmcCrypto {
public:
  lmcCrypto(void);
  ~lmcCrypto(void);

  QByteArray generateRSA(void);
  QByteArray generateAES(QString* lpszUserId, QByteArray& pubKey);
  void retreiveAES(QString* lpszUserId, QByteArray& aesKeyIv);
  bool hasSession(QString* lpszUserId);
  QByteArray encrypt(QString* lpszUserId, QByteArray& clearData);
  QByteArray decrypt(QString* lpszUserId, QByteArray& cipherData);

  // Legacy v1.0 ('-----BEGIN RSA PUBLIC KEY-----' + SHA-1 OAEP) vs
  // Strict v3.0 ('-----BEGIN PUBLIC KEY-----' + SHA-256 OAEP) protocol mode
  void setLegacyCompatibility(bool enabled);
  bool isLegacyCompatibility(void) const;
  QByteArray getPublicKeyForMode(void) const;

  QByteArray publicKey;       // Active public key (tracks legacyCompatibility)
  QByteArray publicKeyLegacy; // PKCS#1: -----BEGIN RSA PUBLIC KEY-----
  QByteArray publicKeyStrict; // SPKI:   -----BEGIN PUBLIC KEY-----

private:
#if OPENSSL_VERSION_NUMBER >= 0x30000000L
  EVP_PKEY* pRsaKey;
#else
  RSA* pRsa;
#endif
  QMap<QString, EVP_CIPHER_CTX> encryptMap;
  QMap<QString, EVP_CIPHER_CTX> decryptMap;
  QMap<QString, QByteArray> sessionKeyMap;
  QMap<QString, QByteArray> sessionIvMap;
  int bits;
  long exponent;
  bool legacyCompatMode;
};

#endif // CRYPTO_H
