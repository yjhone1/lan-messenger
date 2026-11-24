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
#include <QJsonArray>
#include <QTimer>
#include <QLabel>
#include <QMessageBox>
#include <QSignalBlocker>
#include <QVBoxLayout>

namespace {
QString reportTime(const QString& text) {
  const auto date = QDateTime::fromString(text, Qt::ISODateWithMs);
  if(!date.isValid() || date.timeSpec() == Qt::LocalTime) return text.isEmpty() ? QStringLiteral("정보 없음") : text;
  return date.toOffsetFromUtc(9 * 3600).toString("yyyy-MM-dd HH:mm:ss 'KST'");
}
QString reportLabel(const QString& value) {
  static const QMap<QString, QString> labels = {
    {"network", "통신"}, {"admin", "관리자"}, {"agent", "AI 에이전트"}, {"agents", "AI 에이전트"},
    {"state", "상태"}, {"error", "오류"}, {"failure", "실패"}, {"success", "성공"},
    {"configuration", "설정"}, {"authentication", "인증"}, {"read", "조회"}, {"denied", "거부"}};
  return labels.value(value, value.isEmpty() ? QStringLiteral("정보 없음") : value);
}
QString reportDetail(const QString& value) {
  if(value == "Error: Message decryption failed") return "메시지 복호화 실패";
  if(value == "Error: No encryption session for peer") return "상대방의 암호화 세션 없음";
  if(value.startsWith("Connecting to user ")) return "상대방에게 연결 시도 (성공 여부는 이 기록만으로 알 수 없음)";
  if(value.startsWith("Accepted connection from user ")) return "상대방의 연결 수락";
  if(value == "Authenticated read-only diagnostics query") return "관리자 인증 후 읽기 전용 상태 조회";
  if(value == "Administrator credential configured locally") return "해당 PC에서 관리자 비밀번호 설정";
  if(value == "Connected") return "연결됨";
  if(value == "Disconnected") return "연결 끊김";
  return value;
}
QString diagnosticReport(const QJsonObject& snapshot, XmlMessage user) {
  const auto escaped = [](const QString& value) { return value.toHtmlEscaped(); };
  QString html = "<html><body><h2>관리자 상태 조회 보고서</h2>"
      "<p>선택한 PC에서 인증 후 받은 읽기 전용 조회 자료입니다. 실시간 감시 화면이나 Windows 충돌 보고서가 아닙니다.</p>"
      "<h3>조회 대상 및 상태</h3><table border='1' cellspacing='0' cellpadding='6' width='100%'>";
  const auto row = [&](const QString& label, const QString& value) {
    html += "<tr><th align='left'>" + escaped(label) + "</th><td>" + escaped(value.isEmpty() ? QStringLiteral("정보 없음") : value) + "</td></tr>";
  };
  row("대상 사용자 (사용자 정보)", user.data(XN_NAME));
  row("PC 이름 (사용자 정보)", user.data(XN_HOST));
  row("IP 주소 (사용자 정보)", user.data(XN_ADDRESS));
  row("메신저 버전 (사용자 정보)", user.data(XN_VERSION));
  row("조회 시각 (한국시간)", reportTime(snapshot.value("조회시각_UTC").toString()));
  row("조회 시각 원문", snapshot.value("조회시각_UTC").toString());
  for(const auto& key : {QStringLiteral("메신저연결"), QStringLiteral("수신가능"), QStringLiteral("에이전트감시동작")}) {
    const auto value = snapshot.value(key);
    row(key == "메신저연결" ? "메신저 연결" : key == "수신가능" ? "수신 가능" : "에이전트 감시 동작",
        value.isBool() ? (value.toBool() ? "예" : "아니요") : "정보 없음");
  }
  html += "</table><h3>AI 에이전트 정책</h3><p>허용·차단 설정이며, 실제 프로세스 종료 성공 여부와는 별개입니다.</p>"
      "<table border='1' cellspacing='0' cellpadding='6' width='100%'><tr><th>에이전트 식별자</th><th>정책</th></tr>";
  const auto policy = snapshot.value("현재에이전트정책_종료성공과는별개").toObject();
  for(auto it = policy.begin(); it != policy.end(); ++it)
    html += "<tr><td>" + escaped(it.key()) + "</td><td>" + escaped(it.value().toString("정보 없음")) + "</td></tr>";
  if(policy.isEmpty()) html += "<tr><td colspan='2'>제공된 정책 정보 없음</td></tr>";
  html += "</table><h3>최근 운영 기록 (최대 200개)</h3>"
      "<table border='1' cellspacing='0' cellpadding='5' width='100%'>"
      "<tr><th>발생 시각 (한국시간)</th><th>구분</th><th>종류</th><th>상세 내용</th><th>기록 원문</th></tr>";
  const auto events = snapshot.value("최근운영기록_최대200개").toArray();
  for(int i = qMax(0, int(events.size()) - 200); i < events.size(); ++i) {
    const auto event = events.at(i).toObject();
    const auto detail = event.value("detail").toString();
    html += "<tr><td>" + escaped(reportTime(event.value("time").toString())) + "</td><td>" +
        escaped(reportLabel(event.value("category").toString())) + "</td><td>" +
        escaped(reportLabel(event.value("result").toString())) + "</td><td>" + escaped(reportDetail(detail)) +
        "</td><td>" + escaped(detail) + "</td></tr>";
  }
  if(events.isEmpty()) html += "<tr><td colspan='5'>제공된 운영 기록 없음</td></tr>";
  html += "</table><p>" + escaped(snapshot.value("안내").toString()) +
      "</p><p>이 자료만으로 메신저 자동 종료 원인을 확정할 수 없습니다. 실제 종료 시각의 Windows 오류 기록과 대조해야 합니다.</p></body></html>";
  return html;
}
}

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
  m_adminViews = new QTabWidget(adminTab);
  m_adminReport = new QTextBrowser(m_adminViews);
  m_adminReport->setObjectName("adminDiagnosticsReport");
  m_adminReport->setOpenLinks(false);
  m_adminReport->setOpenExternalLinks(false);
  m_adminViews->addTab(m_adminReport, tr("보고서"));
  m_adminDetails = new QPlainTextEdit(m_adminViews);
  m_adminDetails->setReadOnly(true);
  m_adminDetails->setObjectName("adminDiagnosticsDetails");
  m_adminViews->addTab(m_adminDetails, tr("원문 JSON"));
  adminLayout->addWidget(m_adminViews);
  ui.tabWidget->addTab(adminTab, tr("관리자 상태 조회"));
  connect(m_adminRefresh, &QPushButton::clicked, this, [this] {
    ++m_diagnosticsGeneration;
    clearAdminDiagnostics(tr("관리자 인증 후 상대방의 상태를 조회합니다..."));
    emit adminDiagnosticsRequested(&m_targetUserId);
  });
  setUIText();
}

void lmcUserInfoWindow::setInfo(XmlMessage* pMessage, const QString& localUserId) {
  userInfo = *pMessage;
  m_targetUserId = userInfo.data(XN_USERID);
  m_isLocalUser = (!localUserId.isEmpty() && !m_targetUserId.isEmpty() && m_targetUserId == localUserId);

  ++m_diagnosticsGeneration;
  clearAdminDiagnostics(tr("잠김: 관리자 비밀번호를 입력하여 상태를 조회하십시오."));
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
  m_adminReport->setHtml(diagnosticReport(snapshot, userInfo));
  m_adminViews->setCurrentIndex(0);
  if(width() < 900) resize(900, qMax(height(), 640));
  const quint64 generation = ++m_diagnosticsGeneration;
  QTimer::singleShot(60000, this, [this, generation] {
    if(generation == m_diagnosticsGeneration && m_adminDetails)
      clearAdminDiagnostics(tr("잠김: 조회 시간이 만료되었습니다. 다시 인증하십시오."));
  });
}
void lmcUserInfoWindow::adminDiagnosticsStatus(const QString& target, const QString& text) {
  if(target == m_targetUserId && m_adminDetails) { ++m_diagnosticsGeneration; clearAdminDiagnostics(text); }
}

void lmcUserInfoWindow::clearAdminDiagnostics(const QString& text) {
  if(m_adminDetails) m_adminDetails->setPlainText(text);
  if(m_adminReport) m_adminReport->setPlainText(text);
  if(m_adminViews) m_adminViews->setCurrentIndex(0);
}
