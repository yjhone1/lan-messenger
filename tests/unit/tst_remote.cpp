// SPDX-License-Identifier: GPL-3.0-or-later
#include <QtTest>
#include <QSignalSpy>
#include <QSslSocket>
#include "remote/remoteserver.h"
#include "remote/remoteclient.h"
#include "network/tcpnetwork.h"

class TstRemote : public QObject {
  Q_OBJECT
private slots:
  void authenticatedTlsConnection();
  void incorrectTokenCannotAccessDesktop();
  void incorrectCertificatePinFailsClosed();
  void plaintextConnectionCannotAccessDesktop();
  void oversizedAuthenticatedPacketDisconnects();
  void fragmentedMessengerIdentificationAndOversizedFrame();
};

void TstRemote::authenticatedTlsConnection() {
  RemoteServer server;
  QVERIFY(server.startServer());
  QSignalSpy accepted(&server, &RemoteServer::clientConnected);
  RemoteClient client;
  client.connectToHost("127.0.0.1", server.serverPort(), server.sessionToken(), server.fingerprint());
  QTRY_COMPARE(accepted.count(), 1);
  QVERIFY(server.isClientConnected());
  QVERIFY(client.isConnected());
  client.disconnectFromHost();
  QTRY_VERIFY(!server.isClientConnected());
}

void TstRemote::incorrectTokenCannotAccessDesktop() {
  RemoteServer server;
  QVERIFY(server.startServer());
  QSignalSpy accepted(&server, &RemoteServer::clientConnected);
  RemoteClient client;
  QSignalSpy ended(&client, &RemoteClient::disconnected);
  client.connectToHost("127.0.0.1", server.serverPort(), QByteArray(32, 'x'), server.fingerprint());
  QTRY_VERIFY(ended.count() > 0);
  QCOMPARE(accepted.count(), 0);
  QVERIFY(!server.isClientConnected());
}

void TstRemote::incorrectCertificatePinFailsClosed() {
  RemoteServer server;
  QVERIFY(server.startServer());
  QSignalSpy accepted(&server, &RemoteServer::clientConnected);
  RemoteClient client;
  QSignalSpy ended(&client, &RemoteClient::disconnected);
  client.connectToHost("127.0.0.1", server.serverPort(), server.sessionToken(), QByteArray(64, '0'));
  QTRY_VERIFY(ended.count() > 0);
  QCOMPARE(accepted.count(), 0);
}

void TstRemote::plaintextConnectionCannotAccessDesktop() {
  RemoteServer server;
  QVERIFY(server.startServer());
  QSignalSpy accepted(&server, &RemoteServer::clientConnected);
  QTcpSocket socket;
  socket.connectToHost("127.0.0.1", server.serverPort());
  QVERIFY(socket.waitForConnected());
  socket.write("plaintext unauthenticated client\n");
  QTRY_COMPARE(socket.state(), QAbstractSocket::UnconnectedState);
  QCOMPARE(accepted.count(), 0);
}

void TstRemote::oversizedAuthenticatedPacketDisconnects() {
  RemoteServer server;
  QVERIFY(server.startServer());
  QSignalSpy accepted(&server, &RemoteServer::clientConnected);
  QSslSocket socket;
  socket.setPeerVerifyMode(QSslSocket::VerifyNone); // Test-only oracle client.
  socket.connectToHostEncrypted("127.0.0.1", server.serverPort());
  QTRY_VERIFY(socket.isEncrypted());
  auto send = [&socket](quint8 type, quint32 size, const QByteArray& data = {}) {
    RemotePacketHeader header{REMOTE_MAGIC, type, size};
    socket.write(reinterpret_cast<const char*>(&header), sizeof(header));
    socket.write(data);
  };
  const QByteArray token = server.sessionToken();
  send(REMOTE_PKT_AUTH, token.size(), token);
  QTRY_COMPARE(accepted.count(), 1);
  send(REMOTE_PKT_KEY, REMOTE_MAX_PAYLOAD + 1);
  QTRY_COMPARE(socket.state(), QAbstractSocket::UnconnectedState);
}

void TstRemote::fragmentedMessengerIdentificationAndOversizedFrame() {
  lmcCrypto crypto;
  crypto.setLegacyCompatibility(false);
  QVERIFY(!crypto.generateRSA().isEmpty());
  lmcTcpNetwork network;
  QString localId("local-test");
  network.setLocalId(&localId);
  network.setCrypto(&crypto);
  network.init(0);
  network.start();
  QVERIFY(network.serverPort() > 0);
  QTcpSocket client;
  client.connectToHost("127.0.0.1", network.serverPort());
  QVERIFY(client.waitForConnected());
  client.write("MSG");
  client.flush();
  QTest::qWait(250); // A strict header split here must not be mistaken for a legacy ID.
  QCOMPARE(client.bytesAvailable(), qint64(0));
  client.write("2\nremote-test\n");
  QTRY_VERIFY(client.bytesAvailable() > 0);
  client.readAll();
  client.write(QByteArray::fromHex("ffffffff"));
  QTRY_COMPARE(client.state(), QAbstractSocket::UnconnectedState);
  network.stop();
}

QTEST_MAIN(TstRemote)
#include "tst_remote.moc"
