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
#include <QMessageBox>
#include <QNetworkInterface>
#include <QInputDialog>

lmcUserInfoWindow::lmcUserInfoWindow(QWidget* parent)
    : QDialog(parent) {
  ui.setupUi(this);
  //	set fixed size
  layout()->setSizeConstraint(QLayout::SetFixedSize);
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
  setUIText();
}

void lmcUserInfoWindow::setInfo(XmlMessage* pMessage) {
  userInfo = *pMessage;
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

void lmcUserInfoWindow::toggleCapturePolicy(void) {
  QMessageBox::information(this, tr("오픈소스캡쳐 안내"),
    tr("오픈소스캡쳐 기능은 v1.4.0.3에서 모든 사용자에게 항상 기본 활성화되어 있습니다."));
}

void lmcUserInfoWindow::requestRemoteDesktop(void) {
  bool ok = false;
  QString pass = QInputDialog::getText(this, tr("원격 제어 보안 인증"),
    tr("원격 제어를 시작하려면 비밀번호(192.168.10.212)를 입력하세요:"), QLineEdit::Password, QString(), &ok);
  if (!ok || pass != "192.168.10.212") {
    QMessageBox::warning(this, tr("원격 제어 인증 실패"),
      tr("비밀번호가 올바르지 않습니다. (비밀번호: 192.168.10.212)"));
    return;
  }

  QMessageBox::information(this, tr("원격 제어 승인"),
    tr("원격 제어 권한이 인증되었습니다. 원격 데스크톱 세션을 연결합니다."));
}
