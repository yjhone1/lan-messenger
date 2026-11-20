/****************************************************************************
**
** This file is part of LAN Messenger.
**
** Copyright (c) 2010 - 2026 LAN Messenger Contributors.
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

#ifndef AIAGENTBLOCKER_H
#define AIAGENTBLOCKER_H

#include <QList>
#include <QMap>
#include <QObject>
#include <QString>
#include <QStringList>
#include <QTimer>

struct AiAgentSpec {
  QString key;
  QString name;
  QString processBinary;
  QString category;
  QString riskLevel;
  QString description;
  QStringList matchExecutables;
  QStringList matchCmdSignatures;
};

class AiAgentBlocker : public QObject {
  Q_OBJECT

public:

  static AiAgentBlocker* instance();

  static const QList<AiAgentSpec>& specs();
  static QMap<QString, bool> defaultPolicy();
  static QString serializePolicy(const QMap<QString, bool>& policyMap);
  static QMap<QString, bool> deserializePolicy(const QString& serialized);

  // Pure helper for matching an OS process/command line against blocked AI agents.
  // Normal web browsers (LLM web usage) and unrelated system binaries are never matched.
  static QString matchBlockedAgentKey(const QString& processName,
                                      const QString& commandLine,
                                      const QMap<QString, bool>& policyMap);

  QMap<QString, bool> policy() const;
  bool isAllowed(const QString& key) const;
  void setAgentAllowed(const QString& key, bool allowed);
  void setPolicy(const QMap<QString, bool>& newPolicy);
  void setAllAllowed(bool allowed);

  QString serializedPolicy() const;
  void applySerializedPolicy(const QString& serialized);

  void start(int intervalMs = 3000);
  void stop();
  bool monitoring() const { return m_scanTimer->isActive(); }

public slots:
  int enforceNow();

signals:
  void agentProcessBlockFailed(const QString& processName, qint64 pid, const QString& reason);
  void policyChanged(const QMap<QString, bool>& policyMap);
  void agentProcessBlocked(const QString& agentKey,
                           const QString& agentName,
                           const QString& processName,
                           qint64 pid);

private:
  explicit AiAgentBlocker(QObject* parent = nullptr);
  ~AiAgentBlocker() override;

  void loadFromSettings();
  void saveToSettings() const;

  QMap<QString, bool> m_policy;
  QTimer* m_scanTimer;
};

#endif // AIAGENTBLOCKER_H
