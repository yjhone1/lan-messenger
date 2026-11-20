// SPDX-License-Identifier: GPL-3.0-or-later
#ifndef ADMINAUDIT_H
#define ADMINAUDIT_H
#include <QJsonArray>
#include <QString>
namespace AdminAudit {
void record(const QString& category, const QString& result, const QString& detail);
QJsonArray recent();
void traceEvent(const QString& line);
}
#endif
