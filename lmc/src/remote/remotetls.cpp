// SPDX-License-Identifier: GPL-3.0-or-later
#include "remotetls.h"
#include <QCryptographicHash>
#include <openssl/evp.h>
#include <openssl/pem.h>
#include <openssl/rsa.h>
#include <openssl/x509.h>

bool RemoteTlsListener::createIdentity() {
  if(!QSslSocket::supportsSsl()) return false;
  EVP_PKEY_CTX* context = EVP_PKEY_CTX_new_id(EVP_PKEY_RSA, nullptr);
  EVP_PKEY* key = nullptr;
  bool ok = context && EVP_PKEY_keygen_init(context) > 0 &&
      EVP_PKEY_CTX_set_rsa_keygen_bits(context, 2048) > 0 && EVP_PKEY_keygen(context, &key) > 0;
  if(context) EVP_PKEY_CTX_free(context);
  if(!ok) return false;
  X509* cert = X509_new();
  BIO* certBio = BIO_new(BIO_s_mem());
  BIO* keyBio = BIO_new(BIO_s_mem());
  ok = cert && certBio && keyBio;
  if(ok) {
    X509_set_version(cert, 2);
    ASN1_INTEGER_set(X509_get_serialNumber(cert), 1);
    X509_gmtime_adj(X509_get_notBefore(cert), -60);
    X509_gmtime_adj(X509_get_notAfter(cert), 3600);
    X509_set_pubkey(cert, key);
    X509_NAME* name = X509_get_subject_name(cert);
    X509_NAME_add_entry_by_txt(name, "CN", MBSTRING_ASC,
        reinterpret_cast<const unsigned char*>("LAN Messenger Remote"), -1, -1, 0);
    X509_set_issuer_name(cert, name);
    ok = X509_sign(cert, key, EVP_sha256()) > 0 &&
        PEM_write_bio_X509(certBio, cert) == 1 &&
        PEM_write_bio_PrivateKey(keyBio, key, nullptr, nullptr, 0, nullptr, nullptr) == 1;
  }
  if(ok) {
    char* data = nullptr;
    long size = BIO_get_mem_data(certBio, &data);
    m_certificate = QSslCertificate(QByteArray(data, int(size)), QSsl::Pem);
    size = BIO_get_mem_data(keyBio, &data);
    m_key = QSslKey(QByteArray(data, int(size)), QSsl::Rsa, QSsl::Pem, QSsl::PrivateKey);
    ok = !m_certificate.isNull() && !m_key.isNull();
  }
  if(certBio) BIO_free(certBio);
  if(keyBio) BIO_free(keyBio);
  if(cert) X509_free(cert);
  EVP_PKEY_free(key);
  return ok;
}

QByteArray RemoteTlsListener::fingerprint() const {
  return m_certificate.digest(QCryptographicHash::Sha256).toHex();
}

void RemoteTlsListener::incomingConnection(qintptr descriptor) {
  auto* socket = new QSslSocket(this);
  if(!socket->setSocketDescriptor(descriptor)) { socket->deleteLater(); return; }
  socket->setReadBufferSize(16 * 1024 * 1024 + 9);
  socket->setLocalCertificate(m_certificate);
  socket->setPrivateKey(m_key);
  socket->setProtocol(QSsl::TlsV1_2OrLater);
  socket->setPeerVerifyMode(QSslSocket::VerifyNone); // Viewer authenticates using one-time secret after TLS.
  addPendingConnection(socket);
  emit newConnection();
  socket->startServerEncryption();
}
