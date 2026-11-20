// SPDX-License-Identifier: GPL-3.0-or-later
#include <QtTest>
#include <QTemporaryDir>
#include <QJsonDocument>
#include "security/adminauth.h"
#include "security/adminaudit.h"
#include "core/settings.h"

class TstAdminAuth : public QObject {
  Q_OBJECT
  const QString password = "admin-test-passphrase-2026";
  QTemporaryDir settings;
private slots:
  void initTestCase() {
    QVERIFY(settings.isValid());
    QSettings::setPath(QSettings::IniFormat, QSettings::UserScope, settings.path());
    QStandardPaths::setTestModeEnabled(true);
  }
  void init() {
    lmcSettings local;
    local.remove("Security/AdminSalt"); local.remove("Security/AdminVerifier"); local.sync();
  }
  void unconfiguredFailsClosed() {
    AdminAuth auth;
    QVERIFY(!AdminAuth::configured());
    QVERIFY(auth.challenge("requester", "target", "remote").isEmpty());
    QVERIFY(!auth.authorize("requester", "target", "remote", "nonce", QByteArray(32, 'x')));
  }
  void passwordChangeRequiresCurrentPassword() {
    QVERIFY(!AdminAuth::setPassword("short"));
    QVERIFY(AdminAuth::setPassword(password));
    QVERIFY(AdminAuth::configured());
    QVERIFY(!AdminAuth::setPassword("another-long-password", "incorrect"));
    QVERIFY(AdminAuth::setPassword("another-long-password", password));
    lmcSettings local;
    const auto serialized = local.value("Security/AdminVerifier").toByteArray();
    QVERIFY(!serialized.contains(password.toUtf8()));
  }
  void correctProofIsSingleUseAndBoundToPeerAndPurpose() {
    QVERIFY(AdminAuth::setPassword(password));
    AdminAuth auth;
    auto challenge = auth.challenge("requester", "target", "remote");
    QVERIFY(!challenge.isEmpty());
    const auto nonce = challenge.value("nonce").toString();
    const auto key = AdminAuth::derive(password, QByteArray::fromHex(challenge.value("salt").toString().toLatin1()));
    const auto proof = AdminAuth::proof(key, AdminAuth::context("requester", "target", "remote", nonce));
    QVERIFY(!QJsonDocument(challenge).toJson().contains(password.toUtf8()));
    QVERIFY(auth.authorize("requester", "target", "remote", nonce, proof));
    QVERIFY(!auth.authorize("requester", "target", "remote", nonce, proof));
    challenge = auth.challenge("another-requester", "target", "remote");
    const auto other = challenge.value("nonce").toString();
    const auto wrongPurpose = AdminAuth::proof(key, AdminAuth::context("another-requester", "target", "diagnostics", other));
    QVERIFY(!auth.authorize("another-requester", "target", "remote", other, wrongPurpose));
    QVERIFY(auth.challenge("another-requester", "target", "remote").isEmpty()); // Failure backoff.
  }
  void incorrectPasswordAndCredentialRotationInvalidateProofs() {
    QVERIFY(AdminAuth::setPassword(password));
    AdminAuth auth;
    const auto challenge = auth.challenge("requester", "target", "diagnostics");
    const auto nonce = challenge.value("nonce").toString();
    const auto salt = QByteArray::fromHex(challenge.value("salt").toString().toLatin1());
    const auto wrong = AdminAuth::derive("incorrect-password", salt);
    QVERIFY(!auth.authorize("requester", "target", "diagnostics", nonce,
        AdminAuth::proof(wrong, AdminAuth::context("requester", "target", "diagnostics", nonce))));
    const auto next = auth.challenge("other-peer", "target", "remote");
    const auto nextNonce = next.value("nonce").toString();
    const auto key = AdminAuth::derive(password, salt);
    QVERIFY(AdminAuth::setPassword("rotated-admin-password", password));
    QVERIFY(!auth.authorize("other-peer", "target", "remote", nextNonce,
        AdminAuth::proof(key, AdminAuth::context("other-peer", "target", "remote", nextNonce))));
  }
  void expiredChallengesCannotAuthorizeAndPeersCannotSwapProofs() {
    QVERIFY(AdminAuth::setPassword(password));
    qint64 now = 1000;
    AdminAuth auth([&now] { return now; });
    auto challenge = auth.challenge("requester", "target", "remote");
    auto nonce = challenge.value("nonce").toString();
    const auto key = AdminAuth::derive(password, QByteArray::fromHex(challenge.value("salt").toString().toLatin1()));
    const auto proof = AdminAuth::proof(key, AdminAuth::context("requester", "target", "remote", nonce));
    now += 30001;
    QVERIFY(!auth.authorize("requester", "target", "remote", nonce, proof));
    challenge = auth.challenge("other-peer", "target", "diagnostics");
    nonce = challenge.value("nonce").toString();
    QVERIFY(!auth.authorize("impostor", "target", "diagnostics", nonce,
        AdminAuth::proof(key, AdminAuth::context("other-peer", "target", "diagnostics", nonce))));
  }
  void diagnosticsAreEncryptedAndRejectTamperingAndCrossRequestReplay() {
    const QByteArray key(32, 'k');
    const auto aad = AdminAuth::context("requester", "target", "diagnostics", "nonce");
    const QByteArray plain("{\"agent\":\"failure\",\"network\":\"connected\"}");
    const auto packet = AdminAuth::seal(key, aad, plain);
    QVERIFY(!packet.isEmpty());
    QVERIFY(!packet.contains(plain));
    QCOMPARE(AdminAuth::open(key, aad, packet), plain);
    QVERIFY(AdminAuth::open(QByteArray(32, 'x'), aad, packet).isEmpty());
    QVERIFY(AdminAuth::open(key, AdminAuth::context("requester", "target", "diagnostics", "other"), packet).isEmpty());
    for(int offset : {0, 12, int(packet.size() - 1)}) {
      auto changed = packet; changed[offset] = char(changed[offset] ^ 1);
      QVERIFY(AdminAuth::open(key, aad, changed).isEmpty());
    }
  }
  void auditWorksWithoutTraceAndDoesNotCollectArbitraryPayloads() {
    const int before = AdminAudit::recent().size();
    AdminAudit::traceEvent("Sending XML with password=do-not-record chat=private");
    QCOMPARE(AdminAudit::recent().size(), before);
    AdminAudit::traceEvent("AiAgentBlocker: failed to terminate test-process");
    QCOMPARE(AdminAudit::recent().last().toObject().value("result").toString(), QString("failure"));
    for(int i = 0; i < 205; ++i) AdminAudit::record("network", "state", "test connection");
    QCOMPARE(AdminAudit::recent().size(), 200);
    QVERIFY(!QJsonDocument(AdminAudit::recent()).toJson().contains("do-not-record"));
  }
};
QTEST_GUILESS_MAIN(TstAdminAuth)
#include "tst_adminauth.moc"
