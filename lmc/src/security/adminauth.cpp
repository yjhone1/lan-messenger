// SPDX-License-Identifier: GPL-3.0-or-later
#include "adminauth.h"
#include "core/settings.h"
#include <QDateTime>
#include <QFile>
#include <QJsonArray>
#include <QJsonDocument>
#include <openssl/crypto.h>
#include <openssl/evp.h>
#include <openssl/hmac.h>
#include <openssl/rand.h>

namespace {
constexpr int rounds = 200000;
QByteArray randomBytes(int count) {
  QByteArray bytes(count, 0);
  if(RAND_bytes(reinterpret_cast<unsigned char*>(bytes.data()), count) != 1) bytes.clear();
  return bytes;
}
QByteArray setting(const char* name) {
  lmcSettings settings;
  return QByteArray::fromHex(settings.value(QString::fromLatin1(name)).toByteArray());
}
bool equal(const QByteArray& a, const QByteArray& b) {
  return a.size() == 32 && b.size() == 32 && CRYPTO_memcmp(a.constData(), b.constData(), 32) == 0;
}
// Keep OpenSSL 1.0 compatibility without depending on core/crypto.h's context macro.
struct Cipher {
#if OPENSSL_VERSION_NUMBER < 0x10100000L
  EVP_CIPHER_CTX storage;
  EVP_CIPHER_CTX* ptr = &storage;
  Cipher() { EVP_CIPHER_CTX_init(ptr); }
  ~Cipher() { EVP_CIPHER_CTX_cleanup(ptr); }
#else
  EVP_CIPHER_CTX* ptr = EVP_CIPHER_CTX_new();
  ~Cipher() { EVP_CIPHER_CTX_free(ptr); }
#endif
};
}

AdminAuth::AdminAuth(std::function<qint64()> clock) : m_clock(std::move(clock)) {
  if(!m_clock) m_clock = [] { return QDateTime::currentMSecsSinceEpoch(); };
}

bool AdminAuth::configured() {
  return setting("Security/AdminSalt").size() == 16 && setting("Security/AdminVerifier").size() == 32;
}

bool AdminAuth::verifyLocalPassword(const QString& password) {
  return configured() && equal(derive(password, setting("Security/AdminSalt")), setting("Security/AdminVerifier"));
}

QByteArray AdminAuth::derive(const QString& password, const QByteArray& salt) {
  if(salt.size() != 16 || password.size() > 1024) return {};
  QByteArray utf8 = password.toUtf8(), key(32, 0);
  const int ok = PKCS5_PBKDF2_HMAC(utf8.constData(), utf8.size(),
      reinterpret_cast<const unsigned char*>(salt.constData()), salt.size(), rounds, EVP_sha256(),
      key.size(), reinterpret_cast<unsigned char*>(key.data()));
  OPENSSL_cleanse(utf8.data(), size_t(utf8.size()));
  return ok == 1 ? key : QByteArray();
}

bool AdminAuth::setPassword(const QString& password, const QString& currentPassword) {
  if(password.size() < 12 || password.size() > 1024) return false;
  if(configured() && !verifyLocalPassword(currentPassword)) return false;
  const QByteArray salt = randomBytes(16), key = derive(password, salt);
  if(key.size() != 32) return false;
  lmcSettings settings;
  settings.setValue("Security/AdminSalt", salt.toHex());
  settings.setValue("Security/AdminVerifier", key.toHex());
  settings.sync();
#ifndef Q_OS_WIN
  QFile::setPermissions(settings.fileName(), QFile::ReadOwner | QFile::WriteOwner);
#endif
  return settings.status() == QSettings::NoError;
}

QByteArray AdminAuth::context(const QString& requester, const QString& target,
                            const QString& action, const QString& nonce) {
  return QJsonDocument(QJsonArray{"LMC-ADMIN-1", requester, target, action, nonce}).toJson(QJsonDocument::Compact);
}

QByteArray AdminAuth::proof(const QByteArray& key, const QByteArray& data) {
  if(key.size() != 32) return {};
  QByteArray output(32, 0);
  unsigned int size = 0;
  if(!HMAC(EVP_sha256(), key.constData(), key.size(), reinterpret_cast<const unsigned char*>(data.constData()),
      size_t(data.size()), reinterpret_cast<unsigned char*>(output.data()), &size) || size != 32) return {};
  return output;
}

QJsonObject AdminAuth::challenge(const QString& requester, const QString& target, const QString& action) {
  const qint64 now = m_clock();
  for(auto it = m_pending.begin(); it != m_pending.end();) {
    if(it->expires <= now) it = m_pending.erase(it); else ++it;
  }
  for(auto it = m_retryAfter.begin(); it != m_retryAfter.end();) {
    if(it.value() <= now) it = m_retryAfter.erase(it); else ++it;
  }
  if(!configured() || requester.isEmpty() || target.isEmpty() ||
     (action != "remote" && action != "diagnostics") || m_pending.size() >= 64 || m_retryAfter.value(requester) > now) return {};
  const QByteArray nonce = randomBytes(24);
  if(nonce.isEmpty()) return {};
  const QString id = QString::fromLatin1(nonce.toHex());
  m_pending[id] = {requester, target, action, now + 30000, setting("Security/AdminVerifier")};
  m_retryAfter[requester] = now + 1000;
  return {{"nonce", id}, {"salt", QString::fromLatin1(setting("Security/AdminSalt").toHex())}, {"action", action}};
}

bool AdminAuth::authorize(const QString& requester, const QString& target, const QString& action,
                          const QString& nonce, const QByteArray& suppliedProof, QByteArray* key) {
  if(!m_pending.contains(nonce)) return false;
  const Pending pending = m_pending.take(nonce);
  const bool ok = pending.requester == requester && pending.target == target && pending.action == action &&
      pending.expires > m_clock() && equal(pending.key, setting("Security/AdminVerifier")) &&
      equal(proof(pending.key, context(requester, target, action, nonce)), suppliedProof);
  if(ok && key) *key = pending.key;
  if(!ok) m_retryAfter[requester] = m_clock() + 30000;
  return ok;
}

QByteArray AdminAuth::seal(const QByteArray& key, const QByteArray& aad, const QByteArray& plain) {
  if(key.size() != 32 || plain.size() > 256 * 1024) return {};
  QByteArray nonce = randomBytes(12), out(plain.size() + 16, 0), tag(16, 0);
  if(nonce.size() != 12) return {};
  const QByteArray encryptionKey = proof(key, QByteArray("LMC-ADMIN-DIAGNOSTICS-KEY-V1"));
  Cipher c;
  int size = 0, finalSize = 0;
  if(!c.ptr || EVP_EncryptInit_ex(c.ptr, EVP_aes_256_gcm(), nullptr,
      reinterpret_cast<const unsigned char*>(encryptionKey.constData()), reinterpret_cast<const unsigned char*>(nonce.constData())) != 1 ||
     EVP_EncryptUpdate(c.ptr, nullptr, &size, reinterpret_cast<const unsigned char*>(aad.constData()), aad.size()) != 1 ||
     EVP_EncryptUpdate(c.ptr, reinterpret_cast<unsigned char*>(out.data()), &size,
      reinterpret_cast<const unsigned char*>(plain.constData()), plain.size()) != 1 ||
     EVP_EncryptFinal_ex(c.ptr, reinterpret_cast<unsigned char*>(out.data()) + size, &finalSize) != 1 ||
     EVP_CIPHER_CTX_ctrl(c.ptr, EVP_CTRL_GCM_GET_TAG, 16, tag.data()) != 1) return {};
  out.resize(size + finalSize);
  return nonce + out + tag;
}

QByteArray AdminAuth::open(const QByteArray& key, const QByteArray& aad, const QByteArray& packet) {
  if(key.size() != 32 || packet.size() < 28 || packet.size() > 256 * 1024 + 28) return {};
  const QByteArray cipher = packet.mid(12, packet.size() - 28);
  QByteArray out(cipher.size() + 16, 0), tag = packet.right(16);
  const QByteArray encryptionKey = proof(key, QByteArray("LMC-ADMIN-DIAGNOSTICS-KEY-V1"));
  Cipher c;
  int size = 0, finalSize = 0;
  if(!c.ptr || EVP_DecryptInit_ex(c.ptr, EVP_aes_256_gcm(), nullptr,
      reinterpret_cast<const unsigned char*>(encryptionKey.constData()), reinterpret_cast<const unsigned char*>(packet.constData())) != 1 ||
     EVP_DecryptUpdate(c.ptr, nullptr, &size, reinterpret_cast<const unsigned char*>(aad.constData()), aad.size()) != 1 ||
     EVP_DecryptUpdate(c.ptr, reinterpret_cast<unsigned char*>(out.data()), &size,
      reinterpret_cast<const unsigned char*>(cipher.constData()), cipher.size()) != 1 ||
     EVP_CIPHER_CTX_ctrl(c.ptr, EVP_CTRL_GCM_SET_TAG, 16, tag.data()) != 1 ||
     EVP_DecryptFinal_ex(c.ptr, reinterpret_cast<unsigned char*>(out.data()) + size, &finalSize) != 1) return {};
  out.resize(size + finalSize);
  return out;
}
