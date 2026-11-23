// SPDX-License-Identifier: GPL-3.0-or-later
#ifndef ADMINAUTH_H
#define ADMINAUTH_H
#include <QByteArray>
#include <QJsonObject>
#include <QMap>
#include <QString>
#include <functional>

class AdminAuth {
public:
  explicit AdminAuth(std::function<qint64()> clock = {});
  static bool configured();
  static bool verifyLocalPassword(const QString& password);
  static bool setPassword(const QString& password, const QString& currentPassword = {});
  static QByteArray derive(const QString& password, const QByteArray& salt);
  static QByteArray context(const QString& requester, const QString& target,
                            const QString& action, const QString& nonce);
  static QByteArray proof(const QByteArray& key, const QByteArray& context);
  static QByteArray seal(const QByteArray& key, const QByteArray& context, const QByteArray& plain);
  static QByteArray open(const QByteArray& key, const QByteArray& context, const QByteArray& packet);

  QJsonObject challenge(const QString& requester, const QString& target, const QString& action);
  // Consumes a challenge on both success and failure. Never accepts unsolicited or replayed proofs.
  bool authorize(const QString& requester, const QString& target, const QString& action,
                 const QString& nonce, const QByteArray& suppliedProof, QByteArray* key = nullptr);
private:
  struct Pending { QString requester, target, action; qint64 expires; QByteArray key; };
  QMap<QString, Pending> m_pending;
  QMap<QString, qint64> m_retryAfter;
  std::function<qint64()> m_clock;
};
#endif
