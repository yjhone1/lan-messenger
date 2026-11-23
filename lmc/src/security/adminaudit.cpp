// SPDX-License-Identifier: GPL-3.0-or-later
#include "adminaudit.h"
#include "core/stdlocation.h"
#include <QDateTime>
#include <QFile>
#include <QJsonDocument>
#include <QJsonObject>
#include <QSaveFile>

namespace {
QString path() { return StdLocation::logDir() + "/admin-events.json"; }
QJsonArray& entries() {
  static QJsonArray data = [] {
    QFile file(path());
    if(file.size() > 256 * 1024 || !file.open(QIODevice::ReadOnly)) return QJsonArray();
    QJsonArray stored = QJsonDocument::fromJson(file.readAll()).array();
    while(stored.size() > 200) stored.removeFirst();
    return stored;
  }();
  return data;
}
}

void AdminAudit::record(const QString& category, const QString& result, const QString& detail) {
  auto& data = entries();
  data.append(QJsonObject{{"time", QDateTime::currentDateTimeUtc().toString(Qt::ISODateWithMs)},
      {"category", category.left(40)}, {"result", result.left(40)}, {"detail", detail.left(180)}});
  while(data.size() > 200) data.removeFirst();
  QDir().mkpath(StdLocation::logDir());
  QSaveFile file(path());
  if(file.open(QIODevice::WriteOnly)) {
    file.setPermissions(QFile::ReadOwner | QFile::WriteOwner);
    file.write(QJsonDocument(data).toJson(QJsonDocument::Compact));
    file.commit();
  }
}

QJsonArray AdminAudit::recent() { return entries(); }

void AdminAudit::traceEvent(const QString& line) {
  // Explicit operational prefixes only. Never collect arbitrary trace text, XML or chat payloads.
  if(line.startsWith("AiAgentBlocker:"))
    record("agent", line.contains("failed", Qt::CaseInsensitive) ? "failure" : "success", line);
  else if(line.startsWith("Error:") || line.startsWith("TCP server listening failed"))
    record("network", "error", line);
  else if(line.startsWith("Network started") || line.startsWith("Network stopped") ||
          line.startsWith("TCP server listening on port") || line.startsWith("Connecting to user") ||
          line.startsWith("Accepted connection from user"))
    record("network", "state", line);
}
