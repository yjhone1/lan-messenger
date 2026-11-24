// SPDX-License-Identifier: GPL-3.0-or-later
#ifndef TERMINATIONDIAGNOSTICS_H
#define TERMINATIONDIAGNOSTICS_H
#include <QJsonObject>
#include <QString>
namespace TerminationDiagnostics {
// First instance only. The observer is a hidden, non-networked instance of lmc.exe.
void start(bool launchObserver = true);
void finish(int exitCode);
void activity(const QString& operation);
QJsonObject snapshot();
QString directory();
QJsonObject parseWindowsEvent(const QString& xml);
int runObserver(int argc, char** argv);
}
#endif
