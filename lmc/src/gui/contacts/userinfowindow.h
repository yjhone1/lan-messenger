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

signals:
  void remoteDesktopRequested(QString* lpszUserId);
  void utilityPolicyChanged(const QString& targetUserId,
                            const QString& serializedPolicy,
                            const QString& password);

public slots:
  void toggleCapturePolicy(void);
  void requestRemoteDesktop(void);

private slots:
  void onScreenCaptureClicked(void);
  void onUnlockUtilityClicked(void);
  void onAgentCheckboxToggled(bool checked);
  void onAllowAllAgentsClicked(void);
  void onBlockAllAgentsClicked(void);

protected:
  void changeEvent(QEvent* pEvent);

private:
  void setUIText(void);
  void buildUtilityAgentRows(void);
  void refreshUtilityControls(void);
  void updateLockUiState(void);
  void emitUtilityPolicyUpdate(void);

  Ui::UserInfoWindow ui;
  lmcSettings* pSettings;
  XmlMessage userInfo;
  QWidget* m_tabUtility;
  bool m_utilityTabAttached;
  bool m_utilityUnlocked;
  bool m_isLocalUser;
  QString m_targetUserId;
  QMap<QString, bool> m_peerPolicy;
  QMap<QString, QCheckBox*> m_agentChecks;
};

#endif // USERINFOWINDOW_H
