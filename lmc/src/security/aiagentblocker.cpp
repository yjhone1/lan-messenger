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

#include "security/aiagentblocker.h"
#include "core/settings.h"
#include "core/trace.h"

#include <QCoreApplication>
#include <QDir>
#include <QFile>
#include <QFileInfo>

#ifdef Q_OS_WIN
#ifndef WIN32_LEAN_AND_MEAN
#define WIN32_LEAN_AND_MEAN
#endif
#include <windows.h>
#include <tlhelp32.h>
#elif defined(Q_OS_LINUX)
#include <signal.h>
#include <cerrno>
#include <cstring>
#endif

AiAgentBlocker* AiAgentBlocker::instance() {
  static AiAgentBlocker* s_instance = new AiAgentBlocker(qApp);
  return s_instance;
}

AiAgentBlocker::AiAgentBlocker(QObject* parent)
    : QObject(parent),
      m_policy(defaultPolicy()),
      m_scanTimer(new QTimer(this)) {
  loadFromSettings();
  connect(m_scanTimer, &QTimer::timeout, this, &AiAgentBlocker::enforceNow);
}

AiAgentBlocker::~AiAgentBlocker() {
  stop();
}

const QList<AiAgentSpec>& AiAgentBlocker::specs() {
  static const QList<AiAgentSpec> s_specs = {
      {
          QStringLiteral("autogpt"),
          QStringLiteral("AutoGPT"),
          QStringLiteral("autogpt.exe / python -m autogpt"),
          QStringLiteral("autonomous"),
          QStringLiteral("High"),
          QStringLiteral("Goal-driven autonomous loop, local shell and file-system automation daemon"),
          {QStringLiteral("autogpt.exe"), QStringLiteral("autogpt"), QStringLiteral("autogpt-cli.exe"), QStringLiteral("autogpt-cli")},
          {QStringLiteral("python -m autogpt"), QStringLiteral("autogpt.py"), QStringLiteral("autogpt/app/main.py")},
      },
      {
          QStringLiteral("babyagi"),
          QStringLiteral("BabyAGI"),
          QStringLiteral("babyagi.exe / babyagi.py"),
          QStringLiteral("autonomous"),
          QStringLiteral("High"),
          QStringLiteral("Autonomous task-decomposition and infinite sub-task execution loop"),
          {QStringLiteral("babyagi.exe"), QStringLiteral("babyagi")},
          {QStringLiteral("babyagi.py"), QStringLiteral("python -m babyagi")},
      },
      {
          QStringLiteral("devin"),
          QStringLiteral("Devin / OpenHands"),
          QStringLiteral("openhands-daemon / devin-agent"),
          QStringLiteral("coding"),
          QStringLiteral("High"),
          QStringLiteral("Autonomous coding engineering agent controlling local terminal and containers"),
          {QStringLiteral("openhands-daemon.exe"), QStringLiteral("openhands-daemon"), QStringLiteral("openhands.exe"), QStringLiteral("openhands"), QStringLiteral("devin-agent.exe"), QStringLiteral("devin-agent")},
          {QStringLiteral("openhands-daemon"), QStringLiteral("python -m openhands"), QStringLiteral("devin-agent")},
      },
      {
          QStringLiteral("metagpt"),
          QStringLiteral("MetaGPT"),
          QStringLiteral("metagpt-worker / python -m metagpt"),
          QStringLiteral("coding"),
          QStringLiteral("High"),
          QStringLiteral("Multi-agent orchestration driving local code generation and compilation"),
          {QStringLiteral("metagpt-worker.exe"), QStringLiteral("metagpt-worker"), QStringLiteral("metagpt.exe"), QStringLiteral("metagpt")},
          {QStringLiteral("python -m metagpt"), QStringLiteral("metagpt.py"), QStringLiteral("metagpt-worker")},
      },
      {
          QStringLiteral("crewai"),
          QStringLiteral("CrewAI"),
          QStringLiteral("crewai-exec / crewai_runner"),
          QStringLiteral("autonomous"),
          QStringLiteral("Medium"),
          QStringLiteral("Role-based multi-agent orchestration executing local Python/shell tools"),
          {QStringLiteral("crewai-exec.exe"), QStringLiteral("crewai-exec"), QStringLiteral("crewai_runner.exe"), QStringLiteral("crewai_runner"), QStringLiteral("crewai.exe"), QStringLiteral("crewai")},
          {QStringLiteral("python -m crewai"), QStringLiteral("crewai_runner"), QStringLiteral("crewai-exec")},
      },
      {
          QStringLiteral("autogen"),
          QStringLiteral("Microsoft AutoGen"),
          QStringLiteral("autogen-agent / pyautogen"),
          QStringLiteral("autonomous"),
          QStringLiteral("High"),
          QStringLiteral("Multi-agent conversation engine with local automated Code Executor"),
          {QStringLiteral("autogen-agent.exe"), QStringLiteral("autogen-agent"), QStringLiteral("autogenstudio.exe"), QStringLiteral("autogenstudio")},
          {QStringLiteral("autogenstudio"), QStringLiteral("python -m autogen"), QStringLiteral("pyautogen")},
      },
      {
          QStringLiteral("claudeComputerUse"),
          QStringLiteral("Claude Computer Use"),
          QStringLiteral("claude-computer-use / anthropic-desktop"),
          QStringLiteral("system-control"),
          QStringLiteral("High"),
          QStringLiteral("Autonomous OS GUI agent with screen capture, mouse click, and keyboard control"),
          {QStringLiteral("claude-computer-use.exe"), QStringLiteral("claude-computer-use"), QStringLiteral("anthropic-desktop.exe"), QStringLiteral("anthropic-desktop"), QStringLiteral("claude-code.exe")},
          {QStringLiteral("claude-computer-use"), QStringLiteral("anthropic-desktop")},
      },
      {
          QStringLiteral("openaiOperator"),
          QStringLiteral("OpenAI Operator / Codex Agent"),
          QStringLiteral("operator-daemon / codex-runner"),
          QStringLiteral("system-control"),
          QStringLiteral("High"),
          QStringLiteral("Browser/local development autonomous control agent and Codex runner"),
          {QStringLiteral("operator-daemon.exe"), QStringLiteral("operator-daemon"), QStringLiteral("codex-runner.exe"), QStringLiteral("codex-runner"), QStringLiteral("codex.exe"), QStringLiteral("codex")},
          {QStringLiteral("operator-daemon"), QStringLiteral("codex-runner"), QStringLiteral("@openai/codex")},
      },
      {
          QStringLiteral("agentgpt"),
          QStringLiteral("AgentGPT"),
          QStringLiteral("agentgpt-node / agentgpt.exe"),
          QStringLiteral("autonomous"),
          QStringLiteral("Medium"),
          QStringLiteral("Autonomous goal-execution daemon spawning local child processes"),
          {QStringLiteral("agentgpt-node.exe"), QStringLiteral("agentgpt-node"), QStringLiteral("agentgpt.exe"), QStringLiteral("agentgpt")},
          {QStringLiteral("agentgpt-node"), QStringLiteral("agentgpt")},
      },
      {
          QStringLiteral("chatdev"),
          QStringLiteral("ChatDev"),
          QStringLiteral("chatdev-run / python run.py"),
          QStringLiteral("coding"),
          QStringLiteral("High"),
          QStringLiteral("Virtual software company agent invoking local compilers and test runners"),
          {QStringLiteral("chatdev-run.exe"), QStringLiteral("chatdev-run"), QStringLiteral("chatdev.exe"), QStringLiteral("chatdev")},
          {QStringLiteral("chatdev-run"), QStringLiteral("chatdev/run.py"), QStringLiteral("python -m chatdev")},
      },
      {
          QStringLiteral("opencode"),
          QStringLiteral("OpenCode"),
          QStringLiteral("opencode.exe / opencode-cli / opencode"),
          QStringLiteral("coding"),
          QStringLiteral("High"),
          QStringLiteral("Terminal-based open-source autonomous coding agent modifying files & running shell commands"),
          {QStringLiteral("opencode.exe"), QStringLiteral("opencode-cli.exe"), QStringLiteral("opencode"), QStringLiteral("opencode-cli")},
          {QStringLiteral("opencode-cli"), QStringLiteral("opencode-ai"), QStringLiteral("@opencode-ai/opencode")},
      },
  };
  return s_specs;
}

QMap<QString, bool> AiAgentBlocker::defaultPolicy() {
  QMap<QString, bool> defaults;
  for(const AiAgentSpec& spec : specs()) {
    defaults.insert(spec.key, true); // New installations allow every agent.
  }
  return defaults;
}

QString AiAgentBlocker::serializePolicy(const QMap<QString, bool>& policyMap) {
  QStringList parts;
  for(const AiAgentSpec& spec : specs()) {
    const bool allowed = policyMap.value(spec.key, true);
    parts.append(spec.key + QLatin1Char('=') + (allowed ? QLatin1Char('1') : QLatin1Char('0')));
  }
  return parts.join(QLatin1Char(';'));
}

QMap<QString, bool> AiAgentBlocker::deserializePolicy(const QString& serialized) {
  QMap<QString, bool> result = defaultPolicy();
  if(serialized.trimmed().isEmpty()) {
    return result;
  }
  const QStringList entries = serialized.split(QLatin1Char(';'), Qt::SkipEmptyParts);
  for(const QString& entry : entries) {
    const int eq = entry.indexOf(QLatin1Char('='));
    if(eq <= 0)
      continue;
    const QString key = entry.left(eq).trimmed();
    const QString val = entry.mid(eq + 1).trimmed();
    if(result.contains(key)) {
      result[key] = (val == QLatin1String("1") || val.compare(QLatin1String("true"), Qt::CaseInsensitive) == 0);
    }
  }
  return result;
}

QString AiAgentBlocker::matchBlockedAgentKey(const QString& processName,
                                             const QString& commandLine,
                                             const QMap<QString, bool>& policyMap) {
  const QString baseName = QFileInfo(processName).fileName().trimmed().toLower();
  const QString lowerCmd = commandLine.trimmed().toLower();
  if(baseName.isEmpty() && lowerCmd.isEmpty()) {
    return QString();
  }

  for(const AiAgentSpec& spec : specs()) {
    const bool allowed = policyMap.value(spec.key, true);
    if(allowed) {
      continue;
    }

    for(const QString& exe : spec.matchExecutables) {
      if(baseName == exe.toLower()) {
        return spec.key;
      }
    }

    if(!lowerCmd.isEmpty()) {
      for(const QString& sig : spec.matchCmdSignatures) {
        if(lowerCmd.contains(sig.toLower())) {
          return spec.key;
        }
      }
    }
  }

  return QString();
}

QMap<QString, bool> AiAgentBlocker::policy() const {
  return m_policy;
}

bool AiAgentBlocker::isAllowed(const QString& key) const {
  return m_policy.value(key, true);
}

void AiAgentBlocker::setAgentAllowed(const QString& key, bool allowed) {
  if(!m_policy.contains(key))
    return;
  if(m_policy.value(key) == allowed)
    return;
  m_policy[key] = allowed;
  saveToSettings();
  emit policyChanged(m_policy);
  if(!allowed) {
    enforceNow();
  }
}

void AiAgentBlocker::setPolicy(const QMap<QString, bool>& newPolicy) {
  QMap<QString, bool> merged = defaultPolicy();
  for(auto it = merged.begin(); it != merged.end(); ++it) {
    if(newPolicy.contains(it.key())) {
      it.value() = newPolicy.value(it.key());
    }
  }
  m_policy = merged;
  saveToSettings();
  emit policyChanged(m_policy);
  enforceNow();
}

void AiAgentBlocker::setAllAllowed(bool allowed) {
  for(auto it = m_policy.begin(); it != m_policy.end(); ++it) {
    it.value() = allowed;
  }
  saveToSettings();
  emit policyChanged(m_policy);
  if(!allowed) {
    enforceNow();
  }
}

QString AiAgentBlocker::serializedPolicy() const {
  return serializePolicy(m_policy);
}

void AiAgentBlocker::applySerializedPolicy(const QString& serialized) {
  setPolicy(deserializePolicy(serialized));
}

void AiAgentBlocker::start(int intervalMs) {
  if(intervalMs < 1000)
    intervalMs = 1000;
  m_scanTimer->start(intervalMs);
  enforceNow();
}

void AiAgentBlocker::stop() {
  if(m_scanTimer->isActive()) {
    m_scanTimer->stop();
  }
}

void AiAgentBlocker::loadFromSettings() {
  lmcSettings settings;
  settings.beginGroup(QLatin1String(IDS_AIAGENT_GROUP));
  for(const AiAgentSpec& spec : specs()) {
    m_policy[spec.key] = settings.value(spec.key, true).toBool();
  }
  settings.endGroup();
}

void AiAgentBlocker::saveToSettings() const {
  lmcSettings settings;
  settings.beginGroup(QLatin1String(IDS_AIAGENT_GROUP));
  for(auto it = m_policy.constBegin(); it != m_policy.constEnd(); ++it) {
    settings.setValue(it.key(), it.value());
  }
  settings.endGroup();
  settings.sync();
}

int AiAgentBlocker::enforceNow() {
  int blockedCount = 0;

  // Quick check: if every agent is allowed, skip OS enumeration entirely
  bool anyBlocked = false;
  for(auto it = m_policy.constBegin(); it != m_policy.constEnd(); ++it) {
    if(!it.value()) {
      anyBlocked = true;
      break;
    }
  }
  if(!anyBlocked) {
    return 0;
  }

#ifdef Q_OS_WIN
  const DWORD selfPid = GetCurrentProcessId();
  HANDLE hSnap = CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0);
  if(hSnap != INVALID_HANDLE_VALUE) {
    PROCESSENTRY32W pe;
    pe.dwSize = sizeof(PROCESSENTRY32W);
    if(Process32FirstW(hSnap, &pe)) {
      do {
        if(pe.th32ProcessID == 0 || pe.th32ProcessID == selfPid)
          continue;

        const QString exeName = QString::fromWCharArray(pe.szExeFile);
        const QString matchedKey = matchBlockedAgentKey(exeName, QString(), m_policy);
        if(!matchedKey.isEmpty()) {
          HANDLE hProc = OpenProcess(PROCESS_TERMINATE, FALSE, pe.th32ProcessID);
          if(hProc) {
            const BOOL terminated = TerminateProcess(hProc, 1);
            const DWORD errorCode = terminated ? 0 : GetLastError();
            CloseHandle(hProc);
            if(!terminated) {
              const QString reason = QStringLiteral("TerminateProcess failed (Windows error %1)").arg(errorCode);
              lmcTrace::write(QStringLiteral("AiAgentBlocker: failed to terminate %1 pid=%2: %3").arg(exeName).arg(pe.th32ProcessID).arg(reason));
              emit agentProcessBlockFailed(exeName, pe.th32ProcessID, reason);
            }
            if(terminated) {
              ++blockedCount;
              QString agentName = matchedKey;
              for(const AiAgentSpec& spec : specs()) {
                if(spec.key == matchedKey) {
                  agentName = spec.name;
                  break;
                }
              }
              lmcTrace::write(QStringLiteral("AiAgentBlocker: terminated blocked agent process %1 (%2, pid=%3)")
                                  .arg(exeName, agentName)
                                  .arg(pe.th32ProcessID));
              emit agentProcessBlocked(matchedKey, agentName, exeName, static_cast<qint64>(pe.th32ProcessID));
            }
          } else {
            const QString reason = QStringLiteral("OpenProcess denied (Windows error %1)").arg(GetLastError());
            lmcTrace::write(QStringLiteral("AiAgentBlocker: failed to open %1 pid=%2: %3").arg(exeName).arg(pe.th32ProcessID).arg(reason));
            emit agentProcessBlockFailed(exeName, pe.th32ProcessID, reason);
          }
        }
      } while(Process32NextW(hSnap, &pe));
    }
    CloseHandle(hSnap);
  }
#elif defined(Q_OS_LINUX)
  const qint64 selfPid = QCoreApplication::applicationPid();
  QDir procDir(QStringLiteral("/proc"));
  const QStringList entries = procDir.entryList(QDir::Dirs | QDir::NoDotAndDotDot);
  for(const QString& entry : entries) {
    bool ok = false;
    const qint64 pid = entry.toLongLong(&ok);
    if(!ok || pid <= 1 || pid == selfPid)
      continue;

    QString comm;
    QFile commFile(QStringLiteral("/proc/%1/comm").arg(pid));
    if(commFile.open(QIODevice::ReadOnly)) {
      comm = QString::fromUtf8(commFile.readAll()).trimmed();
    }

    QString cmdline;
    QFile cmdFile(QStringLiteral("/proc/%1/cmdline").arg(pid));
    if(cmdFile.open(QIODevice::ReadOnly)) {
      QByteArray raw = cmdFile.readAll();
      raw.replace('\0', ' ');
      cmdline = QString::fromUtf8(raw).trimmed();
    }

    const QString matchedKey = matchBlockedAgentKey(comm, cmdline, m_policy);
    if(!matchedKey.isEmpty()) {
      if(::kill(static_cast<pid_t>(pid), SIGTERM) == 0) {
        ++blockedCount;
        QString agentName = matchedKey;
        for(const AiAgentSpec& spec : specs()) {
          if(spec.key == matchedKey) {
            agentName = spec.name;
            break;
          }
        }
        lmcTrace::write(QStringLiteral("AiAgentBlocker: terminated blocked agent process %1 (%2, pid=%3)")
                            .arg(comm, agentName)
                            .arg(pid));
        emit agentProcessBlocked(matchedKey, agentName, comm, pid);
      } else {
        const QString reason = QString::fromLocal8Bit(std::strerror(errno));
        lmcTrace::write(QStringLiteral("AiAgentBlocker: failed to terminate %1 pid=%2: %3").arg(comm).arg(pid).arg(reason));
        emit agentProcessBlockFailed(comm, pid, reason);
      }
    }
  }
#endif

  return blockedCount;
}
