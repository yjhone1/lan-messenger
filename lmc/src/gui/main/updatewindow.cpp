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


#include <QDesktopServices>
#include <QDir>
#include <QFileInfo>
#include <QGuiApplication>
#include <QNetworkRequest>
#include <QScreen>
#include <QStandardPaths>
#include <QUrl>
#include "updatewindow.h"
#include "ui_updatewindow.h"
#include "core/shared.h"

lmcUpdateWindow::lmcUpdateWindow(QRect* pRect, QWidget* parent)
    : QWidget(parent),
      ui(new Ui::UpdateWindow),
      bytesReceived(0),
      bytesTotal(0),
      pDownloader(new QNetworkAccessManager(this)),
      pDownloadReply(nullptr),
      pDownloadFile(nullptr),
      status(US_Check) {
  ui->setupUi(this);
  //	set fixed size
  layout()->setSizeConstraint(QLayout::SetFixedSize);

  move(pRect->center() - rect().center());
  QRect screenRect = QGuiApplication::primaryScreen()->geometry();
  if(!screenRect.contains(geometry(), true)) {
    QRect windowRect = geometry();
    if(windowRect.right() > screenRect.right())
      windowRect.translate(screenRect.right() - windowRect.right(), 0);
    if(windowRect.left() < screenRect.left())
      windowRect.translate(qAbs(windowRect.left() - screenRect.left()), 0);
    if(windowRect.bottom() > screenRect.bottom())
      windowRect.translate(0, screenRect.bottom() - windowRect.bottom());
    if(windowRect.top() < screenRect.top())
      windowRect.translate(0, qAbs(windowRect.top() - screenRect.top()));
    setGeometry(windowRect);
  }

  connect(ui->btnRecheck, &QAbstractButton::clicked, this, &lmcUpdateWindow::btnRecheck_clicked);

  ui->btnClose->installEventFilter(this);
  ui->btnRecheck->installEventFilter(this);

  webVersion = QString();
  downloadUrl = QString();
  savedFilePath = QString();
}

lmcUpdateWindow::~lmcUpdateWindow() {
  if(pDownloadReply) {
    pDownloadReply->abort();
    pDownloadReply->deleteLater();
  }
  if(pDownloadFile) {
    if(pDownloadFile->isOpen())
      pDownloadFile->close();
    delete pDownloadFile;
  }
  delete ui;
}

void lmcUpdateWindow::init(void) {
  setWindowIcon(QIcon(IDR_APPICON));
  ui->lblOutput->setBackgroundRole(QPalette::Base);
  ui->lblOutput->setAutoFillBackground(true);
  ui->lblOutput->setOpenExternalLinks(true);
  ui->lblOutput->setTextInteractionFlags(Qt::TextBrowserInteraction);
  ui->lblOutput->setWordWrap(true);

  setUIText();
  checkForUpdates();
}

void lmcUpdateWindow::stop(void) {
  if(pDownloadReply) {
    pDownloadReply->abort();
    pDownloadReply->deleteLater();
    pDownloadReply = nullptr;
  }
}

void lmcUpdateWindow::receiveMessage(MessageType type, QString* lpszUserId, XmlMessage* pMessage) {
  Q_UNUSED(lpszUserId);

  switch(type) {
  case MT_Version:
#if defined(Q_OS_WIN)
    webVersion = pMessage->data(XN_WINVERSION);
#elif defined(Q_OS_LINUX)
    webVersion = pMessage->data(XN_LINVERSION);
#elif defined(Q_OS_MAC)
    webVersion = pMessage->data(XN_MACVERSION);
#endif
    downloadUrl = pMessage->data(XN_DOWNLOADURL);
    if(downloadUrl.isEmpty() && !webVersion.isEmpty()) {
      downloadUrl = QString(IDA_DOMAIN "/releases/download/v%1/lmc-%1-win64.exe").arg(webVersion);
    }

    if(Helper::compareVersions(webVersion, Helper::getAppVersion()) > 0)
      status = US_New; // newer version available online
    else
      status = US_Latest;
    setUIText();
    break;
  case MT_WebFailed:
    status = US_Error;
    setUIText();
    break;
  default:
    break;
  }

  ui->btnRecheck->setEnabled(true);
}

void lmcUpdateWindow::settingsChanged(void) {
}

bool lmcUpdateWindow::eventFilter(QObject* pObject, QEvent* pEvent) {
  Q_UNUSED(pObject);
  if(pEvent->type() == QEvent::KeyPress) {
    QKeyEvent* pKeyEvent = static_cast<QKeyEvent*>(pEvent);
    if(pKeyEvent->key() == Qt::Key_Escape) {
      close();
      return true;
    }
  }

  return false;
}

void lmcUpdateWindow::changeEvent(QEvent* pEvent) {
  switch(pEvent->type()) {
  case QEvent::LanguageChange:
    setUIText();
    break;
  default:
    break;
  }

  QWidget::changeEvent(pEvent);
}

void lmcUpdateWindow::btnRecheck_clicked(void) {
  if(status == US_New) {
    startDownload();
    return;
  }
  checkForUpdates();
}

void lmcUpdateWindow::startDownload(void) {
  if(downloadUrl.isEmpty() && !webVersion.isEmpty()) {
    downloadUrl = QString(IDA_DOMAIN "/releases/download/v%1/lmc-%1-win64.exe").arg(webVersion);
  }
  if(downloadUrl.isEmpty()) {
    checkForUpdates();
    return;
  }

  QString downloadDir = QStandardPaths::writableLocation(QStandardPaths::DownloadLocation);
  if(downloadDir.isEmpty())
    downloadDir = QDir::homePath();
  QDir().mkpath(downloadDir);

  QString fileName = QUrl(downloadUrl).fileName();
  if(fileName.isEmpty())
    fileName = QString("lmc-%1-win64.exe").arg(webVersion);

  savedFilePath = QDir(downloadDir).filePath(fileName);

  if(pDownloadFile) {
    if(pDownloadFile->isOpen())
      pDownloadFile->close();
    delete pDownloadFile;
    pDownloadFile = nullptr;
  }

  pDownloadFile = new QFile(savedFilePath, this);
  if(!pDownloadFile->open(QIODevice::WriteOnly | QIODevice::Truncate)) {
    delete pDownloadFile;
    pDownloadFile = nullptr;
    // Fallback: trigger direct file download URL via OS handler
    QDesktopServices::openUrl(QUrl(downloadUrl));
    return;
  }

  bytesReceived = 0;
  bytesTotal = 0;
  status = US_Downloading;
  ui->btnRecheck->setEnabled(false);
  setUIText();

  QUrl reqUrl(downloadUrl);
  QNetworkRequest request(reqUrl);
  request.setRawHeader("User-Agent", "LAN-Messenger/" IDA_VERSION);
  request.setAttribute(QNetworkRequest::RedirectPolicyAttribute,
                       QNetworkRequest::NoLessSafeRedirectPolicy);

  pDownloadReply = pDownloader->get(request);
  connect(pDownloadReply, &QIODevice::readyRead, this, &lmcUpdateWindow::onDownloadReadyRead);
  connect(pDownloadReply, &QNetworkReply::downloadProgress, this, &lmcUpdateWindow::onDownloadProgress);
  connect(pDownloadReply, &QNetworkReply::finished, this, &lmcUpdateWindow::onDownloadFinished);
}

void lmcUpdateWindow::onDownloadReadyRead(void) {
  if(pDownloadReply && pDownloadFile && pDownloadFile->isOpen()) {
    pDownloadFile->write(pDownloadReply->readAll());
  }
}

void lmcUpdateWindow::onDownloadProgress(qint64 received, qint64 total) {
  bytesReceived = received;
  bytesTotal = total;
  setUIText();
}

void lmcUpdateWindow::onDownloadFinished(void) {
  if(!pDownloadReply)
    return;

  if(pDownloadFile && pDownloadFile->isOpen()) {
    pDownloadFile->write(pDownloadReply->readAll());
    pDownloadFile->flush();
    pDownloadFile->close();
  }

  bool ok = (pDownloadReply->error() == QNetworkReply::NoError);
  pDownloadReply->deleteLater();
  pDownloadReply = nullptr;

  ui->btnRecheck->setEnabled(true);

  if(ok && !savedFilePath.isEmpty() && QFileInfo::exists(savedFilePath) && QFileInfo(savedFilePath).size() > 0) {
    status = US_Downloaded;
    setUIText();
#if defined(Q_OS_WIN)
    QDesktopServices::openUrl(QUrl::fromLocalFile(savedFilePath));
#else
    QDesktopServices::openUrl(QUrl::fromLocalFile(QFileInfo(savedFilePath).absolutePath()));
#endif
  } else {
    if(pDownloadFile) {
      pDownloadFile->remove();
    }
    status = US_New;
    setUIText();
    // Fallback to direct file URL download
    if(!downloadUrl.isEmpty())
      QDesktopServices::openUrl(QUrl(downloadUrl));
  }
}

void lmcUpdateWindow::setUIText(void) {
  ui->retranslateUi(this);

  QString title = tr("%1 updates");
  setWindowTitle(title.arg(lmcStrings::appName()));

  ui->lblOutput->setText(getStatusMessage());
}

void lmcUpdateWindow::checkForUpdates() {
  ui->btnRecheck->setEnabled(false);
  status = US_Check;
  setUIText();

  emit messageSent(MT_Version, NULL, NULL);
}

QString lmcUpdateWindow::getStatusMessage(void) {
  QString message;

  switch(status) {
  case US_Check:
    message = tr("Launching an update request...");
    break;
  case US_Error:
    message = tr("An error occured while checking for updates.");
    break;
  case US_New: {
    QString directUrl = !downloadUrl.isEmpty()
                            ? downloadUrl
                            : QString(IDA_DOMAIN "/releases/download/v%1/lmc-%1-win64.exe").arg(webVersion);
    QString fileName = QUrl(directUrl).fileName();
    message = tr("The new version %1 is available on %2 web site.").arg(webVersion, lmcStrings::appName()) +
              QString("<br><a href=\"%1\">%2 (%1)</a>").arg(directUrl, fileName);
    break;
  }
  case US_Downloading: {
    QString fileName = QFileInfo(savedFilePath).fileName();
    double mbDone = static_cast<double>(bytesReceived) / (1024.0 * 1024.0);
    if(bytesTotal > 0) {
      int pct = static_cast<int>((bytesReceived * 100) / bytesTotal);
      double mbTotal = static_cast<double>(bytesTotal) / (1024.0 * 1024.0);
      message = QString("%1 (%2% - %3 MB / %4 MB)")
                    .arg(fileName)
                    .arg(pct)
                    .arg(QString::number(mbDone, 'f', 1))
                    .arg(QString::number(mbTotal, 'f', 1));
    } else {
      message = QString("%1 (%2 MB)").arg(fileName, QString::number(mbDone, 'f', 1));
    }
    break;
  }
  case US_Downloaded: {
    QString fileUrl = QUrl::fromLocalFile(savedFilePath).toString();
    message = QString("<b>Download Complete:</b><br><a href=\"%1\">%2</a>").arg(fileUrl, savedFilePath);
    break;
  }
  case US_Latest:
    message = tr("You have the latest version of %1.").arg(lmcStrings::appName());
    break;
  }

  return message;
}
