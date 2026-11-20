// SPDX-License-Identifier: GPL-3.0-or-later
#ifndef REMOTETLS_H
#define REMOTETLS_H
#include <QTcpServer>
#include <QSslSocket>
#include <QSslCertificate>
#include <QSslKey>

// Ephemeral identity per approved session; the viewer pins its SHA-256 digest.
class RemoteTlsListener : public QTcpServer {
public:
  explicit RemoteTlsListener(QObject* parent) : QTcpServer(parent) {}
  bool createIdentity();
  QByteArray fingerprint() const;
protected:
  void incomingConnection(qintptr descriptor) override;
private:
  QSslCertificate m_certificate;
  QSslKey m_key;
};
#endif
