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


#ifndef USERINFOWINDOW_H
#define USERINFOWINDOW_H

#include <QCheckBox>
#include <QDialog>
#include <QMap>
#include <QPlainTextEdit>
#include <QPushButton>
#include <QJsonObject>
#include "ui_userinfowindow.h"
#include "core/shared.h"
#include "core/settings.h"
#include "core/stdlocation.h"
#include "messaging/xmlmessage.h"
#include "security/aiagentblocker.h"

class lmcUserInfoWindow : public QDialog {
  Q_OBJECT

public:
  lmcUserInfoWindow(QWidget* parent = 0);
  ~lmcUserInfoWindow();

  void init(void);
  void setInfo(XmlMessage* pMessage, const QString& localUserId = QString());
  void settingsChanged(void);
  void showAdminDiagnostics(const QString& target, const QJsonObject& snapshot);
  void adminDiagnosticsStatus(const QString& target, const QString& text);

signals:
  void remoteDesktopRequested(QString* lpszUserId);
  void adminDiagnosticsRequested(QString* lpszUserId);

public slots:
  void requestRemoteDesktop(void);

private slots:
  void onScreenCaptureClicked(void);

protected:
  void changeEvent(QEvent* pEvent);

private:
  void setUIText(void);

  Ui::UserInfoWindow ui;
  lmcSettings* pSettings;
  XmlMessage userInfo;
  bool m_isLocalUser;
  QString m_targetUserId;
  QPlainTextEdit* m_adminDetails = nullptr;
  QPushButton* m_adminRefresh = nullptr;
  quint64 m_diagnosticsGeneration = 0;
};

#endif // USERINFOWINDOW_H
