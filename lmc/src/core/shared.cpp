/****************************************************************************
**
** This file is part of LAN Messenger.
** 
** Copyright (c) 2010 - 2012 Qualia Digital Solutions.
** 
** Contact:  qualiatech@gmail.com
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


#include "shared.h"
#ifdef Q_OS_WIN
#include <Windows.h>
#include <lmcons.h>
#else
#include <stdlib.h>
#include <sys/utsname.h>
#endif
#include <QStringList>
#include <QFile>
#include <QDir>
#include <QSettings>
#include <QSysInfo>
#include <QThread>
#include <QNetworkInterface>
#include <QStringConverter>

int Helper::indexOf(const QString array[], int size, const QString& value) {
  for(int index = 0; index < size; index++) {
    if(value == array[index])
      return index;
  }

  return -1;
}

int Helper::statusIndexFromCode(QString status) {
  for(int index = 0; index < ST_COUNT; index++)
    if(statusCode[index].compare(status) == 0)
      return index;
  return -1;
}

QString Helper::formatSize(qint64 size) {
  qint64 gb = 1073741824;
  qint64 mb = 1048576;
  qint64 kb = 1024;

  if(size > gb)
    return QString("%1 GB").arg((double)size / gb, 0, 'f', 2);
  else if(size > mb)
    return QString("%1 MB").arg((double)size / mb, 0, 'f', 2);
  else if(size > kb)
    return QString("%1 KB").arg((double)size / kb, 0, 'f', 2);
  else
    return QString("%1 bytes").arg(size);
}

QString Helper::getUuid(void) {
  QString Uuid = QUuid::createUuid().toString();
  Uuid = Uuid.remove("{").remove("}").remove("-");
  return Uuid;
}

QString Helper::getLogonName(void) {
  // Test hook for the mock stand (tools/lmm): per-process identity on
  // platforms where the logon name cannot be overridden per process
  // (Windows GetUserName reads the token, not the environment, so all
  // workers would share one userId). Unset in production, no behavior change.
  const QString forced = QString::fromLocal8Bit(qgetenv("LMC_LOGON_NAME"));
  if(!forced.isEmpty())
    return forced;
#if defined Q_OS_WIN //	if platform is Windows
  TCHAR szUserName[UNLEN + 1];
  DWORD nSize = sizeof(szUserName);
  GetUserName(szUserName, &nSize);
  return QString::fromStdWString(szUserName);
#else // this code should work for MAC and Linux
  char* szUserName;
  szUserName = getenv("USER");
  if(szUserName)
    return QString::fromLatin1(szUserName);
#endif

  return QString();
}

QString Helper::getHostName(void) {
  return QHostInfo::localHostName();
}

QString Helper::getOSName(void) {
#if defined Q_OS_WIN
  QSettings reg("HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion", QSettings::NativeFormat);
  QString productName = reg.value("ProductName").toString();
  QString displayVersion = reg.value("DisplayVersion").toString();
  if(displayVersion.isEmpty())
    displayVersion = reg.value("ReleaseId").toString();
  QString buildNumber = reg.value("CurrentBuildNumber").toString();
  int ubr = reg.value("UBR", 0).toInt();

  // Windows 11 has buildNumber >= 22000 even if registry ProductName says Windows 10
  if(buildNumber.toInt() >= 22000 && productName.contains("Windows 10")) {
    productName.replace("Windows 10", "Windows 11");
  }
  if(productName.isEmpty())
    productName = QSysInfo::prettyProductName();

  QString buildStr = buildNumber;
  if(ubr > 0 && !buildNumber.isEmpty())
    buildStr = QString("%1.%2").arg(buildNumber).arg(ubr);

  QString arch = QSysInfo::currentCpuArchitecture();
  QStringList parts;
  parts << productName;
  if(!displayVersion.isEmpty())
    parts << displayVersion;
  if(!buildStr.isEmpty())
    parts << QString("(OS Build %1, %2)").arg(buildStr, arch);
  else if(!arch.isEmpty())
    parts << QString("(%1)").arg(arch);

  return parts.join(" ");
#else
  QString pretty = QSysInfo::prettyProductName();
  QString kernel = QSysInfo::kernelVersion();
  QString arch = QSysInfo::currentCpuArchitecture();
  return QString("%1 (Kernel %2, %3)").arg(pretty, kernel, arch);
#endif
}

QString Helper::getAppVersion(void) {
  QString buildVer = QStringLiteral(IDA_VERSION).trimmed();
  QString codeVer = QStringLiteral(LMC_APP_VERSION).trimmed();
  if(buildVer.isEmpty() || compareVersions(buildVer, codeVer) < 0)
    return codeVer;
  return buildVer;
}

QString Helper::getCpuInfo(void) {
  int threads = QThread::idealThreadCount();
#if defined Q_OS_WIN
  QSettings reg("HKEY_LOCAL_MACHINE\\HARDWARE\\DESCRIPTION\\System\\CentralProcessor\\0", QSettings::NativeFormat);
  QString cpuName = reg.value("ProcessorNameString").toString().trimmed();
  int mhz = reg.value("~MHz", 0).toInt();
  if(!cpuName.isEmpty()) {
    if(mhz > 0)
      return QString("%1 (%2 MHz, %3 Threads)").arg(cpuName).arg(mhz).arg(threads);
    return QString("%1 (%2 Threads)").arg(cpuName).arg(threads);
  }
#elif defined Q_OS_LINUX
  QFile cpuFile("/proc/cpuinfo");
  if(cpuFile.open(QIODevice::ReadOnly | QIODevice::Text)) {
    QByteArray content = cpuFile.readAll();
    cpuFile.close();
    const QList<QByteArray> lines = content.split('\n');
    for(const QByteArray& line : lines) {
      if(line.startsWith("model name")) {
        int colon = line.indexOf(':');
        if(colon != -1) {
          QString model = QString::fromUtf8(line.mid(colon + 1)).trimmed();
          return QString("%1 (%2 Threads)").arg(model).arg(threads);
        }
      }
    }
  }
#endif
  return QString("%1 (%2 Threads)").arg(QSysInfo::currentCpuArchitecture()).arg(threads);
}

QString Helper::getMemoryInfo(void) {
#if defined Q_OS_WIN
  MEMORYSTATUSEX memInfo;
  memInfo.dwLength = sizeof(MEMORYSTATUSEX);
  if(GlobalMemoryStatusEx(&memInfo)) {
    double totalGb = (double)memInfo.ullTotalPhys / (1024.0 * 1024.0 * 1024.0);
    double availGb = (double)memInfo.ullAvailPhys / (1024.0 * 1024.0 * 1024.0);
    return QString("%1 GB (Available: %2 GB / Load: %3%)")
        .arg(totalGb, 0, 'f', 2)
        .arg(availGb, 0, 'f', 2)
        .arg(memInfo.dwMemoryLoad);
  }
#elif defined Q_OS_LINUX
  QFile memFile("/proc/meminfo");
  if(memFile.open(QIODevice::ReadOnly | QIODevice::Text)) {
    qint64 memTotalKb = 0;
    qint64 memAvailKb = 0;
    const QList<QByteArray> lines = memFile.readAll().split('\n');
    memFile.close();
    for(const QByteArray& line : lines) {
      if(line.startsWith("MemTotal:")) {
        memTotalKb = QString::fromLatin1(line).simplified().section(' ', 1, 1).toLongLong();
      } else if(line.startsWith("MemAvailable:")) {
        memAvailKb = QString::fromLatin1(line).simplified().section(' ', 1, 1).toLongLong();
      }
    }
    if(memTotalKb > 0) {
      double totalGb = (double)memTotalKb / (1024.0 * 1024.0);
      double availGb = (double)memAvailKb / (1024.0 * 1024.0);
      return QString("%1 GB (Available: %2 GB)")
          .arg(totalGb, 0, 'f', 2)
          .arg(availGb, 0, 'f', 2);
    }
  }
#endif
  return "N/A";
}

QString Helper::getGpuInfo(void) {
#if defined Q_OS_WIN
  DISPLAY_DEVICEW dd;
  ZeroMemory(&dd, sizeof(dd));
  dd.cb = sizeof(dd);
  for(DWORD i = 0; EnumDisplayDevicesW(NULL, i, &dd, 0); i++) {
    if(dd.StateFlags & DISPLAY_DEVICE_PRIMARY_DEVICE) {
      QString gpuName = QString::fromWCharArray(dd.DeviceString).trimmed();
      if(!gpuName.isEmpty())
        return gpuName;
    }
  }
  if(EnumDisplayDevicesW(NULL, 0, &dd, 0)) {
    QString gpuName = QString::fromWCharArray(dd.DeviceString).trimmed();
    if(!gpuName.isEmpty())
      return gpuName;
  }
#elif defined Q_OS_LINUX
  QDir drmDir("/sys/class/drm");
  if(drmDir.exists()) {
    QFile uevent("/sys/class/drm/card0/device/uevent");
    if(uevent.open(QIODevice::ReadOnly | QIODevice::Text)) {
      const QList<QByteArray> lines = uevent.readAll().split('\n');
      uevent.close();
      QString driver;
      QString pciId;
      for(const QByteArray& line : lines) {
        if(line.startsWith("DRIVER="))
          driver = QString::fromUtf8(line.mid(7)).trimmed();
        else if(line.startsWith("PCI_ID="))
          pciId = QString::fromUtf8(line.mid(7)).trimmed();
      }
      if(!driver.isEmpty())
        return QString("%1 (PCI %2)").arg(driver, pciId);
    }
  }
#endif
  return "Standard Display Adapter";
}

QString Helper::getMacAddress(void) {
  const QList<QNetworkInterface> interfaces = QNetworkInterface::allInterfaces();
  for(const QNetworkInterface& iface : interfaces) {
    if((iface.flags() & QNetworkInterface::IsUp) &&
       (iface.flags() & QNetworkInterface::IsRunning) &&
       !(iface.flags() & QNetworkInterface::IsLoopBack)) {
      QString mac = iface.hardwareAddress().trimmed();
      if(!mac.isEmpty() && mac != "00:00:00:00:00:00")
        return mac;
    }
  }
  return "00:00:00:00:00:00";
}

QString Helper::escapeDelimiter(QString* lpszData) {
  return lpszData->replace(DELIMITER, DELIMITER_ESC, Qt::CaseSensitive);
}

QString Helper::unescapeDelimiter(QString* lpszData) {
  return lpszData->replace(DELIMITER_ESC, DELIMITER, Qt::CaseSensitive);
}

//	Returns:
//	<0 if version 1 is older
//	>0 if version 1 is newer
//	0 if both versions are same
int Helper::compareVersions(const QString& version1, const QString& version2) {
  QString cleanV1 = version1.trimmed();
  QString cleanV2 = version2.trimmed();
  if(cleanV1.startsWith('v', Qt::CaseInsensitive))
    cleanV1.remove(0, 1);
  if(cleanV2.startsWith('v', Qt::CaseInsensitive))
    cleanV2.remove(0, 1);

  if(cleanV1.isEmpty() || cleanV2.isEmpty())
    return 0;

  QStringList v1 = cleanV1.split(".", Qt::SkipEmptyParts);
  QStringList v2 = cleanV2.split(".", Qt::SkipEmptyParts);

  int maxLen = qMax(v1.count(), v2.count());
  for(int index = 0; index < maxLen; index++) {
    int part1 = (index < v1.count()) ? v1[index].toInt() : 0;
    int part2 = (index < v2.count()) ? v2[index].toInt() : 0;
    int comp = part1 - part2;
    if(comp != 0)
      return comp;
  }

  return 0;
}

QString Helper::boolToString(bool value) {
  return value ? LMC_TRUE : LMC_FALSE;
}

bool Helper::stringToBool(const QString& value) {
  return value.compare(LMC_TRUE) == 0 ? true : false;
}

//	Function that copies content of source to destination
//	Destination file will be overwritten
//	Supports only small files
bool Helper::copyFile(const QString& source, const QString& destination) {
  QFile srcFile(source);
  if(!srcFile.open(QIODevice::ReadOnly))
    return false;

  QByteArray data = srcFile.readAll();
  srcFile.close();

  QFile destFile(destination);
  if(!destFile.open(QIODevice::WriteOnly))
    return false;

  destFile.write(data);
  destFile.close();

  return true;
}

void Helper::setUtf8Stream(QTextStream& stream) {
  stream.setEncoding(QStringConverter::Utf8);
}
