// SPDX-License-Identifier: GPL-3.0-or-later
#include "terminationdiagnostics.h"
#include "core/stdlocation.h"
#include "core/trace.h"
#include <QApplication>
#include <QDateTime>
#include <QElapsedTimer>
#include <QFile>
#include <QJsonArray>
#include <QJsonDocument>
#include <QNetworkInterface>
#include <QProcess>
#include <QRegularExpression>
#include <QSaveFile>
#include <QSysInfo>
#include <QSystemTrayIcon>
#include <QTimer>
#include <QWidget>
#include <QUuid>
#include <QXmlStreamReader>
#ifdef Q_OS_WIN
#define WIN32_LEAN_AND_MEAN
#include <windows.h>
#include <winevt.h>
#define PSAPI_VERSION 1
#include <psapi.h>
#include <QAbstractNativeEventFilter>
#endif

namespace {
QString session;
QJsonArray activities;
QTimer* timer = nullptr;
QString storageError;
QString utc() { return QDateTime::currentDateTimeUtc().toString(Qt::ISODateWithMs); }
QString file(const QString& id, const QString& part) { return TerminationDiagnostics::directory() + "/" + id + "." + part + ".json"; }
QJsonObject read(const QString& path) {
  QFile f(path);
  if(f.size() > 256 * 1024 || !f.open(QIODevice::ReadOnly)) return {};
  return QJsonDocument::fromJson(f.readAll()).object();
}
bool write(const QString& path, const QJsonObject& object) {
  QSaveFile f(path);
  if(!f.open(QIODevice::WriteOnly)) return false;
  f.setPermissions(QFile::ReadOwner | QFile::WriteOwner);
  const auto bytes = QJsonDocument(object).toJson(QJsonDocument::Compact);
  if(f.write(bytes) != bytes.size()) { f.cancelWriting(); return false; }
  return f.commit();
}
QJsonArray network() {
  QJsonArray list;
  for(const auto& iface : QNetworkInterface::allInterfaces()) {
    if(iface.flags().testFlag(QNetworkInterface::IsLoopBack)) continue;
    QJsonArray addresses;
    for(const auto& entry : iface.addressEntries())
      if(entry.ip().protocol() == QAbstractSocket::IPv4Protocol && addresses.size() < 4) addresses.append(entry.ip().toString());
    list.append(QJsonObject{{"name", iface.humanReadableName().left(128)},
        {"up", iface.flags().testFlag(QNetworkInterface::IsUp)},
        {"running", iface.flags().testFlag(QNetworkInterface::IsRunning)}, {"ipv4", addresses}});
    if(list.size() >= 16) break;
  }
  return list;
}
void sample() {
  if(session.isEmpty()) return;
  QJsonObject object{{"sampleUtc", utc()}, {"activities", activities}};
#ifdef Q_OS_WIN
  PROCESS_MEMORY_COUNTERS_EX counters = {}; counters.cb = sizeof(counters);
  if(GetProcessMemoryInfo(GetCurrentProcess(), reinterpret_cast<PROCESS_MEMORY_COUNTERS*>(&counters), sizeof(counters))) {
    object["workingSetBytes"] = double(counters.WorkingSetSize);
    object["privateBytes"] = double(counters.PrivateUsage);
  }
  DWORD handles;
  if(GetProcessHandleCount(GetCurrentProcess(), &handles)) object["handles"] = double(handles);
#endif
  if(qobject_cast<QApplication*>(QCoreApplication::instance())) {
    int visibleWindows = 0, visibleTrays = 0;
    for(auto* widget : QApplication::topLevelWidgets()) {
      if(widget->isVisible()) ++visibleWindows;
      for(auto* tray : widget->findChildren<QSystemTrayIcon*>()) if(tray->isVisible()) ++visibleTrays;
    }
    object["visibleWindows"] = visibleWindows;
    object["visibleTrayIcons"] = visibleTrays;
  }
  if(!write(file(session, "activity"), object)) storageError = "마지막 앱 표본 저장 실패. 대상 PC의 로그 폴더 권한과 여유 공간을 확인하세요.";
}
void retainSessions() {
  QDir dir(TerminationDiagnostics::directory());
  const auto starts = dir.entryInfoList({"*.start.json"}, QDir::Files, QDir::Time);
  // The newest runs cover the active process and any observer finishing after exit.
  int retained = 0;
  for(const auto& start : starts) {
    const QString id = start.fileName().section('.', 0, 0);
    if(!QRegularExpression("^[a-f0-9]{32}$").match(id).hasMatch()) continue;
    if(++retained <= 10) continue;
    for(const auto& part : {"start", "activity", "observer", "finish", "evidence-admin"}) QFile::remove(file(id, part));
    QFile::remove(dir.filePath(id + ".trace-tail.log"));
  }
}
void evidence(const QString& id, const QJsonObject& start) {
  write(file(id, "evidence-admin"), QJsonObject{{"collectedUtc",utc()},{"events", QJsonDocument::fromJson([&] {
    QFile f(StdLocation::logDir() + "/admin-events.json");
    return f.size() <= 256 * 1024 && f.open(QIODevice::ReadOnly) ? f.readAll() : QByteArray();
  }()).array()}});
  const QString name = start.value("traceFile").toString();
  if(QFileInfo(name).fileName() != name || !name.startsWith("lmc_") || !name.endsWith(".log")) return;
  QFile input(StdLocation::logDir() + "/" + name);
  if(!input.open(QIODevice::ReadOnly)) return;
  const bool truncated = input.size() > 128 * 1024;
  if(truncated) input.seek(input.size() - 128 * 1024);
  QByteArray data = input.read(128 * 1024);
  if(truncated) { const int end = data.indexOf('\n'); if(end >= 0) data.remove(0, end + 1); }
  QSaveFile output(TerminationDiagnostics::directory() + "/" + id + ".trace-tail.log");
  if(output.open(QIODevice::WriteOnly)) {
    output.setPermissions(QFile::ReadOwner | QFile::WriteOwner);
    if(output.write(data) == data.size()) output.commit(); else output.cancelWriting();
  }
}
#ifdef Q_OS_WIN
class PowerEvents : public QAbstractNativeEventFilter {
public:
#if QT_VERSION >= QT_VERSION_CHECK(6, 0, 0)
  bool nativeEventFilter(const QByteArray&, void* raw, qintptr*) override {
#else
  bool nativeEventFilter(const QByteArray&, void* raw, long*) override {
#endif
    const auto* message = static_cast<MSG*>(raw);
    if(message->message == WM_POWERBROADCAST) {
      if(message->wParam == PBT_APMSUSPEND) TerminationDiagnostics::activity("Windows 절전 진입 알림 관측");
      else if(message->wParam == PBT_APMRESUMEAUTOMATIC || message->wParam == PBT_APMRESUMESUSPEND)
        TerminationDiagnostics::activity("Windows 절전 복귀 알림 관측");
    }
    return false;
  }
};
QDateTime windowsTime(const FILETIME& value) {
  ULARGE_INTEGER time; time.LowPart = value.dwLowDateTime; time.HighPart = value.dwHighDateTime;
  return QDateTime::fromMSecsSinceEpoch(qint64(time.QuadPart / 10000ULL) - 11644473600000LL, Qt::UTC);
}
void collectWindowsEvents() {
  QJsonObject output{{"collectedUtc", utc()}};
  QJsonArray events;
  EVT_HANDLE query = EvtQuery(nullptr, L"Application",
      L"*[System[(EventID=1000 or EventID=1001 or EventID=1002) and TimeCreated[timediff(@SystemTime) <= 86400000]]]",
      EvtQueryChannelPath | EvtQueryReverseDirection);
  if(!query) output["status"] = QString("Windows 이벤트 조회 실패 (오류 %1)").arg(GetLastError());
  else {
    QElapsedTimer budget; budget.start();
    int scanned = 0;
    while(scanned++ < 512 && events.size() < 16 && budget.elapsed() < 3000) {
      EVT_HANDLE event; DWORD count = 0;
      if(!EvtNext(query, 1, &event, 100, 0, &count)) {
        if(GetLastError() != ERROR_NO_MORE_ITEMS) output["status"] = QString("Windows 이벤트 부분 조회 (오류 %1)").arg(GetLastError());
        break;
      }
      DWORD used = 0, properties = 0;
      EvtRender(nullptr, event, EvtRenderEventXml, 0, nullptr, &used, &properties);
      if(GetLastError() == ERROR_INSUFFICIENT_BUFFER && used <= 128 * 1024) {
        QVector<wchar_t> buffer(int(used / sizeof(wchar_t) + 1));
        if(EvtRender(nullptr, event, EvtRenderEventXml, used, buffer.data(), &used, &properties)) {
          const auto parsed = TerminationDiagnostics::parseWindowsEvent(QString::fromWCharArray(buffer.constData()));
          if(!parsed.isEmpty()) events.append(parsed);
        }
      }
      EvtClose(event);
    }
    if(!output.contains("status")) output["status"] = "최근 24시간의 대상 기록을 범위 제한하여 조회했습니다.";
    EvtClose(query);
  }
  output["events"] = events;
  output["scope"] = "응용 프로그램 로그의 최근 24시간, 최대 512개 검사/3초, lmc.exe 관련 최대 16개. 조회 범위에 없거나 아직 기록되지 않은 오류는 표시되지 않을 수 있습니다.";
  while(QJsonDocument(output).toJson(QJsonDocument::Compact).size()>120*1024 && !events.isEmpty()) {
    events.removeLast(); output["events"]=events; output["truncated"]=true;
  }
  write(TerminationDiagnostics::directory() + "/windows-events.json", output);
}
#endif
}

QString TerminationDiagnostics::directory() { return StdLocation::logDir() + "/termination-diagnostics"; }

void TerminationDiagnostics::start(bool launchObserver) {
  if(timer) { timer->stop(); delete timer; timer = nullptr; }
  session = QUuid::createUuid().toString(QUuid::WithoutBraces).remove('-');
  storageError.clear();
  activities = {};
  QDir().mkpath(directory());
  retainSessions();
  QJsonObject object{{"session", session}, {"startUtc", utc()}, {"pid", double(QCoreApplication::applicationPid())},
      {"executable", QCoreApplication::applicationFilePath()}, {"version", QStringLiteral(IDA_VERSION)},
      {"processBits", int(sizeof(void*) * 8)}, {"os", QSysInfo::prettyProductName()},
      {"traceFile", lmcTrace::fileName().isEmpty() ? QString() : QFileInfo(lmcTrace::fileName()).fileName()}};
  if(!write(file(session, "start"), object)) {
    storageError="자동 점검 시작 기록 저장 실패. 대상 PC의 로그 폴더 권한과 여유 공간을 확인하세요.";
    session.clear(); return;
  }
  sample();
  timer = new QTimer(QCoreApplication::instance());
  QObject::connect(timer, &QTimer::timeout, QCoreApplication::instance(), [] { sample(); });
  timer->start(10000);
#ifdef Q_OS_WIN
  if(qobject_cast<QApplication*>(QCoreApplication::instance())) {
    static PowerEvents powerEvents;
    QCoreApplication::instance()->installNativeEventFilter(&powerEvents);
  }
  if(launchObserver) {
    const bool started = QProcess::startDetached(QCoreApplication::applicationFilePath(),
        {"/diagnostics-observer", QString::number(QCoreApplication::applicationPid()), session});
    object["observerLaunched"] = started;
  } else object["observerLaunched"] = false;
#else
  Q_UNUSED(launchObserver);
  object["observerStatus"] = "이 플랫폼은 외부 종료 관측을 지원하지 않습니다.";
#endif
  write(file(session, "start"), object);
}
void TerminationDiagnostics::activity(const QString& operation) {
  if(session.isEmpty()) return;
  if(!activities.isEmpty()) {
    const auto last = activities.last().toObject();
    if(last.value("operation").toString() == operation.left(120) &&
        QDateTime::fromString(last.value("time").toString(), Qt::ISODateWithMs).msecsTo(QDateTime::currentDateTimeUtc()) < 1000) return;
  }
  activities.append(QJsonObject{{"time", utc()}, {"operation", operation.left(120)}});
  while(activities.size() > 20) activities.removeFirst();
  sample();
}
void TerminationDiagnostics::finish(int exitCode) {
  if(session.isEmpty()) return;
  if(timer) timer->stop();
  sample();
  write(file(session, "finish"), QJsonObject{{"time", utc()}, {"eventLoopExitCode", exitCode}});
  session.clear();
}
QJsonObject TerminationDiagnostics::parseWindowsEvent(const QString& xml) {
  if(xml.size() > 64 * 1024) return {};
  QXmlStreamReader reader(xml);
  QJsonObject object, fields;
  bool matches = false;
  while(!reader.atEnd()) {
    reader.readNext();
    if(!reader.isStartElement()) continue;
    const auto name = reader.name().toString();
    if(name == "Provider") object["provider"] = reader.attributes().value("Name").toString().left(128);
    else if(name == "TimeCreated") object["time"] = reader.attributes().value("SystemTime").toString().left(64);
    else if(name == "EventID" || name == "EventRecordID") object[name] = reader.readElementText().left(64);
    else if(name == "Data") {
      const QString key = reader.attributes().value("Name").toString().left(80);
      const QString value = reader.readElementText();
      const QString basename = QFileInfo(QString(value).replace('\\', '/')).fileName();
      if(basename.compare("lmc.exe", Qt::CaseInsensitive) == 0) matches = true;
      if(fields.size() < 24) fields[key.isEmpty() ? QString("Data%1").arg(fields.size() + 1) : key] = value.left(512);
    }
  }
  if(reader.hasError() || !matches) return {};
  const auto eventId = object.value("EventID").toString();
  if(eventId != "1000" && eventId != "1001" && eventId != "1002") return {};
  object["fields"] = fields;
  return object;
}
QJsonObject TerminationDiagnostics::snapshot() {
  sample();
  QJsonArray runs;
  QDir dir(directory());
  const auto starts = dir.entryInfoList({"*.start.json"}, QDir::Files, QDir::Time);
  for(const auto& entry : starts) {
    const QString id = entry.fileName().section('.', 0, 0);
    if(!QRegularExpression("^[a-f0-9]{32}$").match(id).hasMatch()) continue;
    auto object = read(entry.absoluteFilePath());
    object["currentSession"] = id == session;
    object["activity"] = read(file(id, "activity"));
    object["observation"] = read(file(id, "observer"));
    object["finish"] = read(file(id, "finish"));
    object["evidenceDirectory"] = directory();
    QJsonArray evidenceFiles;
    for(const auto& name : {id + ".evidence-admin.json", id + ".trace-tail.log"})
      if(QFile::exists(dir.filePath(name))) evidenceFiles.append(name);
    object["evidenceFiles"] = evidenceFiles;
    runs.append(object);
    if(runs.size() >= 6) break;
  }
  auto windows = read(directory() + "/windows-events.json");
  QJsonObject result{{"schema", 1}, {"runs", runs}, {"windows", windows}, {"directory", directory()}, {"storageError",storageError},
      {"notice", "수집 도입 이후의 기록입니다. 종료 코드만으로 충돌 원인을 확정하지 않습니다. 종료 당시 실제 작업·창/트레이 상태는 마지막 표본과 다를 수 있습니다. 프로세스 종료 후에는 메신저를 다시 실행해야 원격 조회할 수 있습니다."}};
  while(QJsonDocument(result).toJson(QJsonDocument::Compact).size() > 80 * 1024) {
    auto events = windows.value("events").toArray();
    if(!events.isEmpty()) { events.removeLast(); windows["events"] = events; result["windows"] = windows; }
    else if(runs.size() > 1) { runs.removeLast(); result["runs"] = runs; }
    else { result["runs"] = QJsonArray(); result["truncated"] = true; break; }
    result["truncated"] = true;
  }
  return result;
}
int TerminationDiagnostics::runObserver(int argc, char** argv) {
#ifdef Q_OS_WIN
  const QString testApp = QCoreApplication::applicationName(), testOrg = QCoreApplication::organizationName();
  QCoreApplication app(argc, argv);
  if(QStandardPaths::isTestModeEnabled()) { app.setApplicationName(testApp); app.setOrganizationName(testOrg); }
  else { app.setApplicationName(IDA_PRODUCT); app.setOrganizationName(IDA_COMPANY); }
  const auto args = app.arguments();
  if(args.size() != 4 || !QRegularExpression("^[a-f0-9]{32}$").match(args[3]).hasMatch()) return 2;
  bool ok = false; const quint32 pid = args[2].toUInt(&ok);
  if(!ok || pid == 0 || pid == quint32(app.applicationPid())) return 2;
  const QString id = args[3]; const auto start = read(file(id, "start"));
  if(start.value("pid").toDouble() != pid || start.value("session").toString() != id) return 2;
  HANDLE process = OpenProcess(SYNCHRONIZE | PROCESS_QUERY_LIMITED_INFORMATION, FALSE, pid);
  QJsonObject observed;
  if(!process) {
    write(file(id, "observer"), {{"status", QString("프로세스 관측 시작 실패 (오류 %1), 실제 종료 시각/코드 확인 불가").arg(GetLastError())}});
    return 3;
  }
  wchar_t path[MAX_PATH * 4]; DWORD pathSize = DWORD(sizeof(path) / sizeof(wchar_t));
  FILETIME creation, exit, kernel, user;
  if(!QueryFullProcessImageNameW(process, 0, path, &pathSize) ||
      QString::fromWCharArray(path, int(pathSize)).compare(QDir::toNativeSeparators(app.applicationFilePath()), Qt::CaseInsensitive) != 0 ||
      !GetProcessTimes(process, &creation, &exit, &kernel, &user) ||
      qAbs(windowsTime(creation).msecsTo(QDateTime::fromString(start.value("startUtc").toString(), Qt::ISODateWithMs))) > 60000) {
    CloseHandle(process); return 3;
  }
  observed["status"] = "프로세스 종료 관측 중";
  QJsonArray changes; QJsonArray previous;
  collectWindowsEvents();
  for(;;) {
    const auto current = network();
    if(changes.isEmpty() || current != previous) {
      changes.append(QJsonObject{{"time", utc()}, {"interfaces", current}});
      while(changes.size() > 20) changes.removeFirst();
      previous = current;
    }
    observed["networkChanges"] = changes;
    observed["lastObservedUtc"] = utc();
    write(file(id, "observer"), observed);
    DWORD wait;
    QElapsedTimer interval; interval.start();
    do {
      wait = WaitForSingleObject(process, 250);
      app.processEvents();
    } while(wait == WAIT_TIMEOUT && interval.elapsed() < 5000);
    if(wait == WAIT_OBJECT_0) break;
    if(wait != WAIT_TIMEOUT) { observed["status"] = "프로세스 관측 중단, 실제 종료 시각/코드 확인 불가"; write(file(id,"observer"),observed); CloseHandle(process); return 4; }
  }
  observed["status"] = "프로세스 종료 관측됨";
  DWORD code;
  if(GetExitCodeProcess(process, &code)) observed["exitCode"] = "0x" + QString("%1").arg(quint64(code),8,16,QChar('0')).toUpper();
  if(GetProcessTimes(process, &creation, &exit, &kernel, &user)) {
    observed["exitUtc"] = windowsTime(exit).toString(Qt::ISODateWithMs);
    observed["runtimeSeconds"] = double(windowsTime(creation).secsTo(windowsTime(exit)));
  }
  CloseHandle(process);
  changes.append(QJsonObject{{"time", utc()}, {"interfaces", network()}, {"stage", "afterExit"}});
  while(changes.size() > 20) changes.removeFirst();
  observed["networkChanges"] = changes;
  write(file(id, "observer"), observed);
  evidence(id, start);
  QElapsedTimer delay; delay.start(); // Allow Windows Error Reporting time to publish the event.
  while(delay.elapsed() < 10000) { app.processEvents(); Sleep(100); }
  collectWindowsEvents();
  return 0;
#else
  Q_UNUSED(argc); Q_UNUSED(argv); return 2;
#endif
}
