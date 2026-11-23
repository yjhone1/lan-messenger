// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (c) 2026 LAN Messenger.
// Unit tests for AI Agent process blocking (11 agents including OpenCode),
// local policy serialization, remote policy rejection and enforcement lifecycle.

#include <QtTest>
#include <QProcess>
#include <QTemporaryDir>
#include <cstdio>
#ifdef Q_OS_LINUX
#include <sys/prctl.h>
#endif

#include "capture/capturewindow.h"
#include "security/aiagentblocker.h"
#include "core/settings.h"
#include "app/lmc.h"

class tst_Security : public QObject {
  Q_OBJECT
  QString settingsRoot;

private slots:
  void initTestCase();
  void remotePolicyCannotChangeLocalSettings();
  void enforcementStopsWhenMessengerStops();
  void specsContainElevenAgentsIncludingOpenCode();
  void defaultPolicyAllowsAllAgents();
  void policySerializationRoundTrip();
  void processMatchingDetectsBlockedAgentsAndAllowsBrowsers();
  void captureIsAlwaysEnabledUponInstall();
  void customAgentLifecycleAndValidation();
};

void tst_Security::specsContainElevenAgentsIncludingOpenCode() {
  const QList<AiAgentSpec>& list = AiAgentBlocker::specs();
  QCOMPARE(list.size(), 11);

  bool foundOpenCode = false;
  for(const AiAgentSpec& spec : list) {
    if(spec.key == QLatin1String("opencode")) {
      foundOpenCode = true;
      QCOMPARE(spec.name, QStringLiteral("OpenCode"));
      QVERIFY(spec.matchExecutables.contains(QStringLiteral("opencode.exe")));
      QVERIFY(spec.matchExecutables.contains(QStringLiteral("opencode")));
    }
  }
  QVERIFY(foundOpenCode);
}

void tst_Security::defaultPolicyAllowsAllAgents() {
  const QMap<QString, bool> defaults = AiAgentBlocker::defaultPolicy();
  QCOMPARE(defaults.size(), 11);
  for(auto it = defaults.constBegin(); it != defaults.constEnd(); ++it) {
    QVERIFY2(it.value(), qPrintable(QStringLiteral("Agent %1 should be allowed by default").arg(it.key())));
  }
}

void tst_Security::policySerializationRoundTrip() {
  QMap<QString, bool> custom = AiAgentBlocker::defaultPolicy();
  custom[QStringLiteral("opencode")] = true;
  custom[QStringLiteral("autogpt")] = false;

  const QString wire = AiAgentBlocker::serializePolicy(custom);
  const QMap<QString, bool> parsed = AiAgentBlocker::deserializePolicy(wire);

  QCOMPARE(parsed.value(QStringLiteral("opencode")), true);
  QCOMPARE(parsed.value(QStringLiteral("autogpt")), false);
  QCOMPARE(parsed.value(QStringLiteral("babyagi")), true);
  QCOMPARE(parsed.value(QStringLiteral("claudeComputerUse")), true);
}

void tst_Security::processMatchingDetectsBlockedAgentsAndAllowsBrowsers() {
  QMap<QString, bool> policy = AiAgentBlocker::defaultPolicy();

  for(auto it = policy.begin(); it != policy.end(); ++it) it.value() = false;
  // Explicitly blocked -> matched
  QCOMPARE(AiAgentBlocker::matchBlockedAgentKey(QStringLiteral("opencode.exe"), QString(), policy),
           QStringLiteral("opencode"));
  QCOMPARE(AiAgentBlocker::matchBlockedAgentKey(QStringLiteral("opencode-cli"), QString(), policy),
           QStringLiteral("opencode"));
  QCOMPARE(AiAgentBlocker::matchBlockedAgentKey(QStringLiteral("python"), QStringLiteral("python -m autogpt"), policy),
           QStringLiteral("autogpt"));
  QCOMPARE(AiAgentBlocker::matchBlockedAgentKey(QStringLiteral("codex-runner.exe"), QString(), policy),
           QStringLiteral("openaiOperator"));

  // Normal browsers for Web LLM access & generic tools must NEVER be blocked
  QVERIFY(AiAgentBlocker::matchBlockedAgentKey(QStringLiteral("chrome.exe"), QStringLiteral("https://chatgpt.com"), policy).isEmpty());
  QVERIFY(AiAgentBlocker::matchBlockedAgentKey(QStringLiteral("msedge.exe"), QStringLiteral("https://claude.ai"), policy).isEmpty());
  QVERIFY(AiAgentBlocker::matchBlockedAgentKey(QStringLiteral("firefox.exe"), QStringLiteral("https://gemini.google.com"), policy).isEmpty());

  // Allowed when toggled ON
  policy[QStringLiteral("opencode")] = true;
  QVERIFY(AiAgentBlocker::matchBlockedAgentKey(QStringLiteral("opencode.exe"), QString(), policy).isEmpty());
}

void tst_Security::captureIsAlwaysEnabledUponInstall() {
  QVERIFY(lmcCaptureWindow::isCaptureEnabled());
  QVERIFY(lmcCaptureWindow::isUserCaptureEnabled(QStringLiteral("peer-any")));
}

void tst_Security::customAgentLifecycleAndValidation() {
  auto* blocker = AiAgentBlocker::instance();
  const int original = AiAgentBlocker::specs().size();
  QString error;
  QVERIFY(!blocker->saveCustomAgent({}, "", {"myagent.exe"}, &error));
  for(const QString& invalid : {"python.exe", "node.exe", "svchost.exe", "chrome.exe", "lmc.exe", "*.exe", "C:/myagent.exe", "myagent.exe --run", ""})
    QVERIFY2(!blocker->saveCustomAgent({}, "Invalid", {invalid}, &error), qPrintable(invalid));
  QVERIFY(!blocker->saveCustomAgent({}, "Duplicate", {"opencode.exe"}, &error));
  QVERIFY(blocker->saveCustomAgent({}, "My Agent", {" MyAgent-Test.EXE ", "myagent-test-cli"}, &error));
  const QString key = AiAgentBlocker::specs().last().key;
  QVERIFY(AiAgentBlocker::isCustomAgent(key));
  QCOMPARE(AiAgentBlocker::specs().size(), original + 1);
  QVERIFY(blocker->isAllowed(key));
  auto policy = blocker->policy();
  policy[key] = false; // Match only; do not terminate any host processes in tests.
  QCOMPARE(AiAgentBlocker::matchBlockedAgentKey("MYAGENT-TEST.EXE", {}, policy), key);
  QVERIFY(AiAgentBlocker::matchBlockedAgentKey("other-myagent-test.exe", {}, policy).isEmpty());
  QCOMPARE(AiAgentBlocker::deserializePolicy(AiAgentBlocker::serializePolicy(policy)).value(key), false);
  QVERIFY(!blocker->saveCustomAgent({}, "Duplicate", {"myagent-test.exe"}, &error));
  QVERIFY(!blocker->saveCustomAgent("opencode", "Override", {"override.exe"}, &error));
  QVERIFY(!blocker->removeCustomAgent("opencode"));
  QVERIFY(blocker->saveCustomAgent(key, "Renamed Agent", {"renamed-test-agent.exe"}, &error));
  QVERIFY(blocker->isAllowed(key));
  policy[key] = false;
  QVERIFY(AiAgentBlocker::matchBlockedAgentKey("myagent-test.exe", {}, policy).isEmpty());
  QCOMPARE(AiAgentBlocker::matchBlockedAgentKey("renamed-test-agent.exe", {}, policy), key);
  lmcSettings saved;
  const auto json = saved.value("Security/CustomAiAgents").toByteArray();
  QVERIFY(json.contains(key.toUtf8()));
  QVERIFY(json.contains("renamed-test-agent.exe"));
  saved.setValue(QStringLiteral(IDS_AIAGENT_GROUP "/") + key, false);
  saved.sync();
  QProcess restarted;
  restarted.start(QCoreApplication::applicationFilePath(), {"--custom-agent-reload", settingsRoot, key});
  QVERIFY(restarted.waitForFinished(15000));
  QCOMPARE(restarted.exitStatus(), QProcess::NormalExit);
  QCOMPARE(restarted.exitCode(), 0);
  QVERIFY(blocker->removeCustomAgent(key));
  QCOMPARE(AiAgentBlocker::specs().size(), original);
  QVERIFY(!blocker->policy().contains(key));
  lmcSettings removed;
  QVERIFY(!removed.value("Security/CustomAiAgents").toByteArray().contains(key.toUtf8()));
  QVERIFY(!removed.contains(QStringLiteral(IDS_AIAGENT_GROUP "/") + key));
  QVERIFY(AiAgentBlocker::matchBlockedAgentKey("renamed-test-agent.exe", {}, policy).isEmpty());
}

void tst_Security::initTestCase() {
  static QTemporaryDir isolatedSettings;
  QVERIFY(isolatedSettings.isValid());
  settingsRoot = isolatedSettings.path();
  QSettings::setPath(QSettings::IniFormat, QSettings::UserScope, isolatedSettings.path());
}

void tst_Security::remotePolicyCannotChangeLocalSettings() {
  auto* blocker = AiAgentBlocker::instance();
  blocker->setAllAllowed(true);
  lmcCore core;
  QString sender("untrusted-peer");
  XmlMessage message;
  message.addData(XN_AIAGENTPOLICY, "opencode=0;autogpt=0");
  message.addData(XN_UTILITYPASS, "192.168.10.212"); // Previous public password must grant no authority.
  QVERIFY(QMetaObject::invokeMethod(&core, "receiveMessage", Qt::DirectConnection,
      Q_ARG(MessageType, MT_UtilityPolicy), Q_ARG(QString*, &sender), Q_ARG(XmlMessage*, &message)));
  QVERIFY(blocker->isAllowed("opencode"));
  QVERIFY(blocker->isAllowed("autogpt"));
}

void tst_Security::enforcementStopsWhenMessengerStops() {
#ifdef Q_OS_LINUX
  if(qEnvironmentVariable("LMC_ISOLATED_PROCESS_TEST") != "1")
    QSKIP("Run in a private PID namespace with LMC_ISOLATED_PROCESS_TEST=1; never terminate host processes in tests.");
  auto* blocker = AiAgentBlocker::instance();
  blocker->setAllAllowed(true);
  QProcess fixture;
  fixture.start(QCoreApplication::applicationFilePath(), {"--agent-fixture"});
  QVERIFY(fixture.waitForStarted());
  QVERIFY(fixture.waitForReadyRead());
  blocker->setAgentAllowed("opencode", false);
  QTRY_COMPARE(fixture.state(), QProcess::NotRunning);
  blocker->start(1000);
  blocker->stop();
  fixture.start(QCoreApplication::applicationFilePath(), {"--agent-fixture"});
  QVERIFY(fixture.waitForStarted());
  QVERIFY(fixture.waitForReadyRead());
  QTest::qWait(1300);
  QCOMPARE(fixture.state(), QProcess::Running);
  blocker->setAllAllowed(true); // Same release path used by /unsync during uninstall.
  lmcSettings saved;
  QVERIFY(saved.value(QStringLiteral(IDS_AIAGENT_GROUP "/opencode"), false).toBool());
  fixture.terminate();
  QVERIFY(fixture.waitForFinished());
#else
  QSKIP("Isolated Linux process lifecycle test");
#endif
}

int main(int argc, char** argv) {
  if(argc == 4 && QByteArray(argv[1]) == "--custom-agent-reload") {
    QCoreApplication application(argc, argv);
    QSettings::setPath(QSettings::IniFormat, QSettings::UserScope, QString::fromLocal8Bit(argv[2]));
    const QString key = QString::fromLocal8Bit(argv[3]);
    auto* blocker = AiAgentBlocker::instance();
    return AiAgentBlocker::isCustomAgent(key) && !blocker->isAllowed(key) &&
        AiAgentBlocker::matchBlockedAgentKey("renamed-test-agent.exe", {}, blocker->policy()) == key ? 0 : 1;
  }
#ifdef Q_OS_LINUX
  if(argc == 2 && QByteArray(argv[1]) == "--agent-fixture") {
    QCoreApplication fixture(argc, argv);
    prctl(PR_SET_NAME, "opencode", 0, 0, 0);
    std::puts("fixture ready");
    std::fflush(stdout);
    QTimer::singleShot(20000, &fixture, &QCoreApplication::quit);
    return fixture.exec();
  }
#endif
  QApplication application(argc, argv);
  tst_Security test;
  return QTest::qExec(&test, argc, argv);
}
#include "tst_security.moc"
