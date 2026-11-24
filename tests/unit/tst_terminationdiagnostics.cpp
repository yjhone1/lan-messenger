// SPDX-License-Identifier: GPL-3.0-or-later
#include <QtTest>
#include <QJsonDocument>
#include <QJsonArray>
#include <QSaveFile>
#include <QStandardPaths>
#include <QUuid>
#include <QProcess>
#include <QTimer>
#include <QFile>
#include <QRegularExpression>
#include <cstdio>
#ifdef Q_OS_WIN
#include <windows.h>
#endif
#include "security/terminationdiagnostics.h"

class TstTerminationDiagnostics : public QObject {
  Q_OBJECT
private slots:
  void initTestCase() {
    QStandardPaths::setTestModeEnabled(true);
    QCoreApplication::setOrganizationName("lmc-termination-tests");
    QCoreApplication::setApplicationName(QUuid::createUuid().toString(QUuid::WithoutBraces));
  }
  void recordsFirstInstanceLifecycleWithoutInventingAnExit() {
    TerminationDiagnostics::start(false);
    TerminationDiagnostics::activity("관리자 상태 조회 요청");
    const auto running = TerminationDiagnostics::snapshot().value("runs").toArray().first().toObject();
    QVERIFY(running.value("currentSession").toBool());
    QVERIFY(!running.value("startUtc").toString().isEmpty());
    QVERIFY(!running.value("executable").toString().isEmpty());
    QVERIFY(running.value("observation").toObject().isEmpty());
    QVERIFY(running.value("finish").toObject().isEmpty());
    QCOMPARE(running.value("activity").toObject().value("activities").toArray().last().toObject().value("operation").toString(), QString("관리자 상태 조회 요청"));
    TerminationDiagnostics::finish(7);
    const auto closed = TerminationDiagnostics::snapshot().value("runs").toArray().first().toObject();
    QVERIFY(!closed.value("currentSession").toBool());
    QCOMPARE(closed.value("finish").toObject().value("eventLoopExitCode").toInt(),7);
    QVERIFY(!closed.value("observation").toObject().contains("exitUtc"));
  }
  void persistsAnUnfinishedRunAndBoundsActivities() {
    TerminationDiagnostics::start(false);
    for(int i=0;i<30;++i) TerminationDiagnostics::activity(QString("operation-%1").arg(i));
    const auto previous = TerminationDiagnostics::snapshot().value("runs").toArray().first().toObject();
    QCOMPARE(previous.value("activity").toObject().value("activities").toArray().size(),20);
    const QString previousId=previous.value("session").toString();
    TerminationDiagnostics::start(false); // Simulates a missing controlled-finish marker.
    const auto runs=TerminationDiagnostics::snapshot().value("runs").toArray();
    bool found=false;
    for(const auto& entry:runs) {
      const auto run=entry.toObject();
      if(run.value("session").toString()!=previousId) continue;
      found=true;
      QVERIFY(!run.value("currentSession").toBool());
      QVERIFY(run.value("finish").toObject().isEmpty());
      QVERIFY(run.value("observation").toObject().isEmpty());
    }
    QVERIFY(found);
    TerminationDiagnostics::finish(0);
  }
  void parsesOnlyMessengerWindowsEventsAndPreservesNamedFields() {
    const QString xml="<Event xmlns='http://schemas.microsoft.com/win/2004/08/events/event'><System><Provider Name='Application Error'/><EventID>1000</EventID><TimeCreated SystemTime='2026-11-24T02:00:00Z'/><EventRecordID>123</EventRecordID></System><EventData><Data Name='AppName'>lmc.exe</Data><Data Name='ExceptionCode'>c0000005</Data><Data Name='ModuleName'>example.dll</Data><Data Name='FaultingOffset'>00001234</Data></EventData></Event>";
    const auto event=TerminationDiagnostics::parseWindowsEvent(xml);
    QCOMPARE(event.value("EventID").toString(),QString("1000"));
    QCOMPARE(event.value("time").toString(),QString("2026-11-24T02:00:00Z"));
    QCOMPARE(event.value("fields").toObject().value("ExceptionCode").toString(),QString("c0000005"));
    QCOMPARE(event.value("fields").toObject().value("ModuleName").toString(),QString("example.dll"));
    QVERIFY(TerminationDiagnostics::parseWindowsEvent(QString(xml).replace("lmc.exe","unrelated.exe")).isEmpty());
    QVERIFY(TerminationDiagnostics::parseWindowsEvent(QString(xml).replace("lmc.exe","prefix-lmc.exe")).isEmpty());
    QVERIFY(TerminationDiagnostics::parseWindowsEvent(xml.left(50)).isEmpty());
    QVERIFY(TerminationDiagnostics::parseWindowsEvent(QString(xml).replace("1000","1009")).isEmpty());
  }
  void cachedEventsAndHistoryStayWithinTransportBudget() {
    QJsonArray events;
    for(int i=0;i<16;++i) events.append(QJsonObject{{"time","2026-11-24T02:00:00Z"},{"detail",QString(6000,'x')}});
    QSaveFile file(TerminationDiagnostics::directory()+"/windows-events.json");
    QVERIFY(file.open(QIODevice::WriteOnly));
    file.write(QJsonDocument(QJsonObject{{"events",events}}).toJson(QJsonDocument::Compact));
    QVERIFY(file.commit());
    const auto snapshot=TerminationDiagnostics::snapshot();
    QVERIFY(QJsonDocument(snapshot).toJson(QJsonDocument::Compact).size()<=80*1024);
    QVERIFY(snapshot.value("truncated").toBool());
  }
  void windowsObserverRecordsControlledAndForcedFixtureExits() {
#ifdef Q_OS_WIN
    for(const auto& mode : {QString("normal"),QString("forced")}) {
      QProcess fixture;
      auto environment=QProcessEnvironment::systemEnvironment();
      environment.insert("LMC_TERMINATION_TEST_APP",QCoreApplication::applicationName());
      fixture.setProcessEnvironment(environment);
      fixture.start(QCoreApplication::applicationFilePath(),{"--observer-parent",mode});
      QVERIFY(fixture.waitForStarted());
      QVERIFY(fixture.waitForReadyRead(10000));
      const QString line=QString::fromUtf8(fixture.readAllStandardOutput()).trimmed();
      QVERIFY(line.startsWith("SESSION="));
      const QString id=line.mid(8);
      QVERIFY(QRegularExpression("^[a-f0-9]{32}$").match(id).hasMatch());
      QVERIFY(fixture.waitForFinished(20000));
      const QString path=TerminationDiagnostics::directory()+"/"+id+".observer.json";
      const auto observation=[&] { QFile f(path); if(!f.open(QIODevice::ReadOnly)) return QJsonObject(); return QJsonDocument::fromJson(f.readAll()).object(); };
      QTRY_VERIFY_WITH_TIMEOUT(observation().contains("exitUtc"),10000);
      QCOMPARE(observation().value("exitCode").toString(), mode=="normal" ? QString("0x00000000") : QString("0xC0000005"));
      QVERIFY(observation().value("runtimeSeconds").toDouble()>=0);
      QCOMPARE(QFile::exists(TerminationDiagnostics::directory()+"/"+id+".finish.json"),mode=="normal");
    }
#else
    QSKIP("Windows process observer integration test");
#endif
  }
};
int main(int argc,char**argv) {
#ifdef Q_OS_WIN
  if(argc>1 && (QByteArray(argv[1])=="/diagnostics-observer" || QByteArray(argv[1])=="--observer-parent")) {
    QStandardPaths::setTestModeEnabled(true);
    QCoreApplication::setOrganizationName("lmc-termination-tests");
    QCoreApplication::setApplicationName(qEnvironmentVariable("LMC_TERMINATION_TEST_APP"));
    if(QByteArray(argv[1])=="/diagnostics-observer") return TerminationDiagnostics::runObserver(argc,argv);
    const QString appName=QCoreApplication::applicationName();
    QCoreApplication app(argc,argv);
    app.setApplicationName(appName);
    TerminationDiagnostics::start(true);
    const QString id=TerminationDiagnostics::snapshot().value("runs").toArray().first().toObject().value("session").toString();
    std::printf("SESSION=%s\n",id.toUtf8().constData()); std::fflush(stdout);
    QTimer check;
    QObject::connect(&check,&QTimer::timeout,&app,[&] {
      QFile status(TerminationDiagnostics::directory()+"/"+id+".observer.json");
      if(!status.open(QIODevice::ReadOnly) || QJsonDocument::fromJson(status.readAll()).object().value("status").toString()!="프로세스 종료 관측 중") return;
      if(argc>2 && QByteArray(argv[2])=="forced") TerminateProcess(GetCurrentProcess(),0xC0000005);
      TerminationDiagnostics::finish(0); app.quit();
    });
    check.start(100);
    QTimer::singleShot(15000,&app,[&] { app.exit(5); });
    return app.exec();
  }
#endif
  QCoreApplication app(argc,argv);
  TstTerminationDiagnostics test;
  return QTest::qExec(&test,argc,argv);
}
#include "tst_terminationdiagnostics.moc"
