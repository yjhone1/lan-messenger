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

#include <QtGlobal>
#include <QCoreApplication>
#include <QDir>
#include <QFile>
#include <QFileInfo>
#ifdef Q_OS_WIN
#include <Windows.h>
#include <QLibrary>
#else
#include <QSoundEffect>
#include <QMediaDevices>
#include <QAudioDevice>
#include <QUrl>
#endif
#include "soundplayer.h"

#ifdef Q_OS_WIN
typedef BOOL(WINAPI* sndPlaySoundFunc)(LPCSTR lpszSound, UINT fuSound);
static sndPlaySoundFunc sndPlaySoundFromDll = nullptr;
#endif

lmcSoundPlayer::lmcSoundPlayer(void) {
  pSettings = new lmcSettings();
  for(int index = 0; index < SE_Max; index++) {
    eventState[index] = Qt::Checked;
    sounds[index] = soundFile[index];
  }
  settingsChanged();
#ifdef Q_OS_WIN
  if(sndPlaySoundFromDll == nullptr) {
    QLibrary winmmDll("winmm");
    sndPlaySoundFromDll = (sndPlaySoundFunc)winmmDll.resolve("sndPlaySoundA");
  }
#endif
}

bool lmcSoundPlayer::isAvailable() {
#ifdef Q_OS_WIN
  return sndPlaySoundFromDll != nullptr;
#else
  return !QMediaDevices::audioOutputs().isEmpty();
#endif
}

static QString resolveDiskSoundPath(const QString& filename) {
  if(filename.isEmpty())
    return QString();

  QFileInfo directInfo(filename);
  if(directInfo.exists() && directInfo.isFile())
    return directInfo.absoluteFilePath();

  const QString baseName = directInfo.fileName();
  const QString appDir = QCoreApplication::applicationDirPath();
  const QStringList candidates = {
    QDir(appDir).filePath(filename),
    QDir(appDir).filePath("sounds/" + baseName),
    QDir(appDir).filePath("runtime/sounds/" + baseName),
    QDir(appDir).filePath("../src/resources/sounds/" + baseName),
    QDir(appDir).filePath("../../lmc/src/resources/sounds/" + baseName)
  };
  for(const QString& candidate : candidates) {
    QFileInfo info(candidate);
    if(info.exists() && info.isFile())
      return info.absoluteFilePath();
  }
  return QString();
}

void lmcSoundPlayer::play(const QString& filename) {
  if(filename.isEmpty() || !isAvailable())
    return;

  const QString baseName = QFileInfo(filename).fileName();
  const QString qrcPath = ":/sounds/" + baseName;
  QString diskPath = resolveDiskSoundPath(filename);

#ifdef Q_OS_WIN
  if(diskPath.isEmpty() && QFile::exists(qrcPath)) {
    QString cacheSoundDir = QDir(QCoreApplication::applicationDirPath()).filePath("sounds");
    QDir().mkpath(cacheSoundDir);
    QString extractedPath = QDir(cacheSoundDir).filePath(baseName);
    if(!QFile::exists(extractedPath))
      QFile::copy(qrcPath, extractedPath);
    if(QFile::exists(extractedPath))
      diskPath = QFileInfo(extractedPath).absoluteFilePath();
  }
  if(sndPlaySoundFromDll && !diskPath.isEmpty())
    sndPlaySoundFromDll(QDir::toNativeSeparators(diskPath).toLocal8Bit().constData(), SND_ASYNC | SND_NODEFAULT);
#else
  QUrl sourceUrl;
  if(filename.startsWith(":/")) {
    if(QFile::exists(filename))
      sourceUrl = QUrl("qrc" + filename);
  } else if(filename.startsWith("qrc:/")) {
    sourceUrl = QUrl(filename);
  } else if(!diskPath.isEmpty()) {
    sourceUrl = QUrl::fromLocalFile(diskPath);
  } else if(QFile::exists(qrcPath)) {
    sourceUrl = QUrl("qrc:/sounds/" + baseName);
  }

  if(!sourceUrl.isValid() || sourceUrl.isEmpty())
    return;

  // Leaked on purpose: a static QSoundEffect would be destroyed after
  // QApplication teardown, and its destructor posts events with no event
  // loop left, aborting the process on Qt 6.8.
  static QSoundEffect* effect = new QSoundEffect();
  effect->setSource(sourceUrl);
  effect->play();
#endif
}

void lmcSoundPlayer::play(SoundEvent event) {
  QString localStatus = pSettings->value(IDS_STATUS, IDS_STATUS_VAL).toString();
  if(!playSound || (localStatus == "Busy" && noBusySound) || (localStatus == "NoDisturb" && noDNDSound))
    return;

  if(!eventState[event])
    return;

  play(sounds[event]);
}

void lmcSoundPlayer::settingsChanged(void) {
  int size = qMin(pSettings->beginReadArray(IDS_SOUNDEVENTHDR), (int)SE_Max);
  for(int index = 0; index < size; index++) {
    pSettings->setArrayIndex(index);
    eventState[index] = pSettings->value(IDS_SOUNDEVENT, IDS_SOUNDEVENT_VAL).toInt();
  }
  pSettings->endArray();

  size = qMin(pSettings->beginReadArray(IDS_SOUNDFILEHDR), (int)SE_Max);
  for(int index = 0; index < size; index++) {
    pSettings->setArrayIndex(index);
    sounds[index] = pSettings->value(IDS_SOUNDFILE, soundFile[index]).toString();
  }
  pSettings->endArray();

  playSound = pSettings->value(IDS_SOUND, IDS_SOUND_VAL).toBool();
  noBusySound = pSettings->value(IDS_NOBUSYSOUND, IDS_NOBUSYSOUND_VAL).toBool();
  noDNDSound = pSettings->value(IDS_NODNDSOUND, IDS_NODNDSOUND_VAL).toBool();
}
