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


#include "userinfowindow.h"
#include "capture/capturewindow.h"
#include <QFrame>
#include <QJsonDocument>
#include <QTimer>
#include <QLabel>
#include <QMessageBox>
#include <QSignalBlocker>
#include <QVBoxLayout>

lmcUserInfoWindow::lmcUserInfoWindow(QWidget* parent)
    : QDialog(parent),
      pSettings(nullptr),
      m_isLocalUser(false) {
  ui.setupUi(this);
  layout()->setSizeConstraint(QLayout::SetMinimumSize);
  //	remove the help button from window button group
  setWindowFlags(windowFlags() & ~Qt::WindowContextHelpButtonHint);
  //	Destroy the window when it closes
  setAttribute(Qt::WA_DeleteOnClose, true);

}

lmcUserInfoWindow::~lmcUserInfoWindow() {
}

void lmcUserInfoWindow::init(void) {
  setWindowIcon(QIcon(IDR_APPICON));

  QFont font = ui.lblUserName->font();
  int fontSize = ui.lblUserName->fontInfo().pixelSize();
  fontSize += (fontSize * 0.1);
  font.setPixelSize(fontSize);
  font.setBold(true);
  ui.lblUserName->setFont(font);

  pSettings = new lmcSettings();


  connect(ui.btnRemoteDesktop, &QPushButton::clicked, this, &lmcUserInfoWindow::requestRemoteDesktop);
  connect(ui.btnScreenCapture, &QPushButton::clicked, this, &lmcUserInfoWindow::onScreenCaptureClicked);

  auto* adminTab = new QWidget(ui.tabWidget);
  auto* adminLayout = new QVBoxLayout(adminTab);
  adminLayout->addWidget(new QLabel(tr("Read-only operational information. Administrator authentication is required for each refresh."), adminTab));
  m_adminRefresh = new QPushButton(tr("관리자 비밀번호로 상태 조회 / 새로고침"), adminTab);
  m_adminRefresh->setObjectName("adminDiagnosticsRefresh");
  adminLayout->addWidget(m_adminRefresh);
  m_adminDetails = new QPlainTextEdit(adminTab);
  m_adminDetails->setReadOnly(true);
  m_adminDetails->setObjectName("adminDiagnosticsDetails");
  adminLayout->addWidget(m_adminDetails);
  ui.tabWidget->addTab(adminTab, tr("관리자 상태 조회"));
  connect(m_adminRefresh, &QPushButton::clicked, this, [this] {
    m_adminDetails->setPlainText(tr("관리자 인증 후 상대방의 상태를 조회합니다..."));
    emit adminDiagnosticsRequested(&m_targetUserId);
  });
  setUIText();
}

void lmcUserInfoWindow::setInfo(XmlMessage* pMessage, const QString& localUserId) {
  userInfo = *pMessage;
  m_targetUserId = userInfo.data(XN_USERID);
  m_isLocalUser = (!localUserId.isEmpty() && !m_targetUserId.isEmpty() && m_targetUserId == localUserId);

  ++m_diagnosticsGeneration;
  if(m_adminDetails) m_adminDetails->setPlainText(tr("잠김: 관리자 비밀번호를 입력하여 상태를 조회하십시오."));
  ui.btnRemoteDesktop->setVisible(!m_isLocalUser);
  ui.btnScreenCapture->setVisible(m_isLocalUser);

  setUIText();
  ui.tabWidget->setCurrentIndex(0);
}

void lmcUserInfoWindow::settingsChanged(void) {
}

void lmcUserInfoWindow::changeEvent(QEvent* pEvent) {
  switch(pEvent->type()) {
  case QEvent::LanguageChange:
    setUIText();
    break;
  default:
    break;
  }

  QDialog::changeEvent(pEvent);
}

void lmcUserInfoWindow::setUIText(void) {
  ui.retranslateUi(this);
  setWindowTitle(tr("User Information"));

  if(userInfo.header(XN_TYPE).isNull())
    return;

  QString filePath = userInfo.data(XN_AVATAR);
  //	if image not found, use the default avatar image for this user
  if(!QFile::exists(filePath))
    filePath = AVT_DEFAULT;
  ui.lblAvatar->setPixmap(QPixmap(filePath));
  ui.lblUserName->setText(userInfo.data(XN_NAME));
  ui.lblStatus->setText(lmcStrings::statusDesc()[Helper::statusIndexFromCode(userInfo.data(XN_STATUS))]);

  QString data = userInfo.data(XN_FIRSTNAME);
  if(!data.isNull() && data.compare("N/A") != 0)
    ui.txtFirstName->setText(data);
  data = userInfo.data(XN_LASTNAME);
  if(!data.isNull() && data.compare("N/A") != 0)
    ui.txtLastName->setText(data);
  data = userInfo.data(XN_ABOUT);
  if(!data.isNull() && data.compare("N/A") != 0)
    ui.txtAbout->setPlainText(data);

  ui.lblIPAddress->setText(userInfo.data(XN_ADDRESS));
  QString mac = userInfo.data(XN_MACADDRESS);
  ui.lblMacAddress->setText(mac.isEmpty() ? "N/A" : mac);
  ui.lblLogonName->setText(userInfo.data(XN_LOGON));
  ui.lblComputerName->setText(userInfo.data(XN_HOST));
  ui.lblOSName->setText(userInfo.data(XN_OS));
  QString cpu = userInfo.data(XN_CPU);
  ui.lblCpu->setText(cpu.isEmpty() ? "N/A" : cpu);
  QString mem = userInfo.data(XN_MEMORY);
  ui.lblMemory->setText(mem.isEmpty() ? "N/A" : mem);
  QString gpu = userInfo.data(XN_GPU);
  ui.lblGpu->setText(gpu.isEmpty() ? "N/A" : gpu);
  QString ver = userInfo.data(XN_VERSION).trimmed();
  ui.lblVersion->setText(ver.isEmpty() ? "N/A" : ver);
}

void lmcUserInfoWindow::onScreenCaptureClicked(void) {
  auto* window = lmcCaptureWindow::instance();
  window->show();
  window->raise();
  window->activateWindow();
}

void lmcUserInfoWindow::requestRemoteDesktop(void) {
  if(!m_isLocalUser && !m_targetUserId.isEmpty())
    emit remoteDesktopRequested(&m_targetUserId);
}

void lmcUserInfoWindow::showAdminDiagnostics(const QString& target, const QJsonObject& snapshot) {
  if(target != m_targetUserId || !m_adminDetails) return;
  m_adminDetails->setPlainText(QString::fromUtf8(QJsonDocument(snapshot).toJson(QJsonDocument::Indented)));
  const quint64 generation = ++m_diagnosticsGeneration;
  QTimer::singleShot(60000, this, [this, generation] {
    if(generation == m_diagnosticsGeneration && m_adminDetails)
      m_adminDetails->setPlainText(tr("잠김: 조회 시간이 만료되었습니다. 다시 인증하십시오."));
  });
}
void lmcUserInfoWindow::adminDiagnosticsStatus(const QString& target, const QString& text) {
  if(target == m_targetUserId && m_adminDetails) { ++m_diagnosticsGeneration; m_adminDetails->setPlainText(text); }
}
