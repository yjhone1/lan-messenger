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
#include <QLabel>
#include <QMessageBox>
#include <QSignalBlocker>
#include <QVBoxLayout>

lmcUserInfoWindow::lmcUserInfoWindow(QWidget* parent)
    : QDialog(parent),
      pSettings(nullptr),
      m_tabUtility(nullptr),
      m_utilityTabAttached(true),
      m_utilityUnlocked(false),
      m_isLocalUser(false),
      m_peerPolicy(AiAgentBlocker::defaultPolicy()) {
  ui.setupUi(this);
  layout()->setSizeConstraint(QLayout::SetMinimumSize);
  //	remove the help button from window button group
  setWindowFlags(windowFlags() & ~Qt::WindowContextHelpButtonHint);
  //	Destroy the window when it closes
  setAttribute(Qt::WA_DeleteOnClose, true);

  m_tabUtility = ui.tabUtility;
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

  buildUtilityAgentRows();
  updateLockUiState();

  connect(ui.btnRemoteDesktop, &QPushButton::clicked, this, &lmcUserInfoWindow::requestRemoteDesktop);
  connect(ui.btnScreenCapture, &QPushButton::clicked, this, &lmcUserInfoWindow::onScreenCaptureClicked);
  connect(ui.btnUnlockUtility, &QPushButton::clicked, this, &lmcUserInfoWindow::onUnlockUtilityClicked);
  connect(ui.txtUtilityPassword, &QLineEdit::returnPressed, this, &lmcUserInfoWindow::onUnlockUtilityClicked);
  connect(ui.btnAllowAllAgents, &QPushButton::clicked, this, &lmcUserInfoWindow::onAllowAllAgentsClicked);
  connect(ui.btnBlockAllAgents, &QPushButton::clicked, this, &lmcUserInfoWindow::onBlockAllAgentsClicked);

  setUIText();
}

void lmcUserInfoWindow::setInfo(XmlMessage* pMessage, const QString& localUserId) {
  userInfo = *pMessage;
  m_targetUserId = userInfo.data(XN_USERID);
  m_isLocalUser = (!localUserId.isEmpty() && !m_targetUserId.isEmpty() && m_targetUserId == localUserId);

  // Own user's Utility tab must NOT be visible to self; only visible when managing a peer.
  if(m_tabUtility) {
    if(m_isLocalUser && m_utilityTabAttached) {
      const int idx = ui.tabWidget->indexOf(m_tabUtility);
      if(idx >= 0) {
        ui.tabWidget->removeTab(idx);
      }
      m_utilityTabAttached = false;
    } else if(!m_isLocalUser && !m_utilityTabAttached) {
      ui.tabWidget->addTab(m_tabUtility, tr("Utility"));
      m_utilityTabAttached = true;
    }
  }

  ui.btnRemoteDesktop->setVisible(!m_isLocalUser);

  // Reset Utility lock whenever opening peer info and load peer's current 11-agent policy.
  m_utilityUnlocked = false;
  ui.txtUtilityPassword->clear();
  m_peerPolicy = AiAgentBlocker::deserializePolicy(userInfo.data(XN_AIAGENTPOLICY));
  refreshUtilityControls();
  updateLockUiState();

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

  if(m_utilityTabAttached && m_tabUtility) {
    const int idx = ui.tabWidget->indexOf(m_tabUtility);
    if(idx >= 0) {
      ui.tabWidget->setTabText(idx, tr("Utility"));
    }
  }

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

void lmcUserInfoWindow::buildUtilityAgentRows(void) {
  m_agentChecks.clear();
  QVBoxLayout* layout = ui.layoutAgents;
  layout->setSpacing(6);

  for(const AiAgentSpec& spec : AiAgentBlocker::specs()) {
    QFrame* rowFrame = new QFrame(ui.wgtAgentsContainer);
    rowFrame->setFrameShape(QFrame::StyledPanel);
    QVBoxLayout* rowLayout = new QVBoxLayout(rowFrame);
    rowLayout->setContentsMargins(8, 6, 8, 6);
    rowLayout->setSpacing(2);

    QCheckBox* chk = new QCheckBox(
        QStringLiteral("%1 (%2) [%3]").arg(spec.name, spec.processBinary, spec.riskLevel),
        rowFrame);
    chk->setProperty("agentKey", spec.key);
    connect(chk, &QCheckBox::toggled, this, &lmcUserInfoWindow::onAgentCheckboxToggled);

    QLabel* lblDesc = new QLabel(spec.description, rowFrame);
    lblDesc->setWordWrap(true);
    QFont smallFont = lblDesc->font();
    if(smallFont.pointSize() > 1) {
      smallFont.setPointSize(qMax(7, smallFont.pointSize() - 1));
    }
    lblDesc->setFont(smallFont);

    rowLayout->addWidget(chk);
    rowLayout->addWidget(lblDesc);
    layout->addWidget(rowFrame);
    m_agentChecks.insert(spec.key, chk);
  }
  layout->addStretch(1);
}

void lmcUserInfoWindow::refreshUtilityControls(void) {
  for(auto it = m_agentChecks.constBegin(); it != m_agentChecks.constEnd(); ++it) {
    QCheckBox* chk = it.value();
    if(!chk)
      continue;
    const bool allowed = m_peerPolicy.value(it.key(), false);
    QSignalBlocker blocker(chk);
    chk->setChecked(allowed);
  }
}

void lmcUserInfoWindow::updateLockUiState(void) {
  ui.wgtUtilityLock->setVisible(!m_utilityUnlocked);
  ui.wgtUtilityControls->setVisible(m_utilityUnlocked);
}

void lmcUserInfoWindow::emitUtilityPolicyUpdate(void) {
  if(m_isLocalUser || m_targetUserId.isEmpty() || !m_utilityUnlocked)
    return;
  emit utilityPolicyChanged(
      m_targetUserId,
      AiAgentBlocker::serializePolicy(m_peerPolicy),
      QString::fromLatin1(AiAgentBlocker::kAdminPassword));
}

void lmcUserInfoWindow::toggleCapturePolicy(void) {
  QMessageBox::information(this, tr("Screen Capture Information"),
    tr("Screen Capture feature is always enabled by default in v1.4.0.3 for all users."));
}

void lmcUserInfoWindow::onScreenCaptureClicked(void) {
  lmcCaptureWindow* pWnd = lmcCaptureWindow::instance();
  pWnd->show();
  pWnd->raise();
  pWnd->activateWindow();
}

void lmcUserInfoWindow::requestRemoteDesktop(void) {
  if(m_isLocalUser || m_targetUserId.isEmpty())
    return;
  emit remoteDesktopRequested(&m_targetUserId);
}

void lmcUserInfoWindow::onUnlockUtilityClicked(void) {
  const QString entered = ui.txtUtilityPassword->text();
  if(!AiAgentBlocker::verifyAdminPassword(entered)) {
    QMessageBox::warning(this, tr("Authentication Failed"),
      tr("Incorrect administrator password. Enter 192.168.10.212."));
    return;
  }
  m_utilityUnlocked = true;
  updateLockUiState();
  refreshUtilityControls();
}

void lmcUserInfoWindow::onAgentCheckboxToggled(bool checked) {
  QCheckBox* chk = qobject_cast<QCheckBox*>(sender());
  if(!chk)
    return;
  const QString key = chk->property("agentKey").toString();
  if(key.isEmpty())
    return;
  m_peerPolicy[key] = checked;
  emitUtilityPolicyUpdate();
}

void lmcUserInfoWindow::onAllowAllAgentsClicked(void) {
  for(auto it = m_peerPolicy.begin(); it != m_peerPolicy.end(); ++it) {
    it.value() = true;
  }
  refreshUtilityControls();
  emitUtilityPolicyUpdate();
}

void lmcUserInfoWindow::onBlockAllAgentsClicked(void) {
  for(auto it = m_peerPolicy.begin(); it != m_peerPolicy.end(); ++it) {
    it.value() = false;
  }
  refreshUtilityControls();
  emitUtilityPolicyUpdate();
}
