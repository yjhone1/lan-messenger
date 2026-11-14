// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (c) 2026 LAN Messenger.
// Unit tests for AI Agent process blocking (11 agents including OpenCode),
// policy serialization, and administrator password validation.

#include <QtTest>

#include "capture/capturewindow.h"
#include "security/aiagentblocker.h"

class tst_Security : public QObject {
  Q_OBJECT

private slots:
  void specsContainElevenAgentsIncludingOpenCode();
  void defaultPolicyBlocksAllAgents();
  void policySerializationRoundTrip();
  void verifyAdminPasswordIsExactAndIpIndependent();
  void processMatchingDetectsBlockedAgentsAndAllowsBrowsers();
  void captureIsAlwaysEnabledUponInstall();
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

void tst_Security::defaultPolicyBlocksAllAgents() {
  const QMap<QString, bool> defaults = AiAgentBlocker::defaultPolicy();
  QCOMPARE(defaults.size(), 11);
  for(auto it = defaults.constBegin(); it != defaults.constEnd(); ++it) {
    QVERIFY2(!it.value(), qPrintable(QStringLiteral("Agent %1 should be blocked by default").arg(it.key())));
  }
}

void tst_Security::policySerializationRoundTrip() {
  QMap<QString, bool> custom = AiAgentBlocker::defaultPolicy();
  custom[QStringLiteral("opencode")] = true;
  custom[QStringLiteral("autogpt")] = true;

  const QString wire = AiAgentBlocker::serializePolicy(custom);
  const QMap<QString, bool> parsed = AiAgentBlocker::deserializePolicy(wire);

  QCOMPARE(parsed.value(QStringLiteral("opencode")), true);
  QCOMPARE(parsed.value(QStringLiteral("autogpt")), true);
  QCOMPARE(parsed.value(QStringLiteral("babyagi")), false);
  QCOMPARE(parsed.value(QStringLiteral("claudeComputerUse")), false);
}

void tst_Security::verifyAdminPasswordIsExactAndIpIndependent() {
  QVERIFY(AiAgentBlocker::verifyAdminPassword(QStringLiteral("192.168.10.212")));
  QVERIFY(!AiAgentBlocker::verifyAdminPassword(QStringLiteral("192.168.10.211")));
  QVERIFY(!AiAgentBlocker::verifyAdminPassword(QString()));
}

void tst_Security::processMatchingDetectsBlockedAgentsAndAllowsBrowsers() {
  QMap<QString, bool> policy = AiAgentBlocker::defaultPolicy();

  // Blocked by default -> matched
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

QTEST_MAIN(tst_Security)
#include "tst_security.moc"
