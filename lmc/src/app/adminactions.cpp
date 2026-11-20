// SPDX-License-Identifier: GPL-3.0-or-later
#include "lmc.h"
#include "security/adminaudit.h"
#include <QDateTime>
#include <QInputDialog>
#include <QJsonDocument>
#include <QJsonArray>
#include <QLineEdit>
#include <QMessageBox>

void lmcCore::beginAdminAction(const QString& target, const QString& action) {
  if(!pMessaging->localUser || m_adminRequests.contains(target)) return;
  const QString local = pMessaging->localUser->id;
  bool ok = false;
  QString password = QInputDialog::getText(pUserInfoWindow ? static_cast<QWidget*>(pUserInfoWindow.data()) : pMainWindow,
      tr("관리자 인증"), tr("대상 PC에 설정된 관리자 비밀번호를 입력하십시오:"), QLineEdit::Password, {}, &ok);
  if(!ok || password.isEmpty()) {
    if(pUserInfoWindow) pUserInfoWindow->adminDiagnosticsStatus(target, tr("인증이 취소되었습니다."));
    return;
  }
  if(target == local) {
    const auto challenge = m_adminAuth.challenge(local, local, action);
    QByteArray key = AdminAuth::derive(password, QByteArray::fromHex(challenge.value("salt").toString().toLatin1()));
    const QString nonce = challenge.value("nonce").toString();
    if(m_adminAuth.authorize(local, local, action, nonce,
        AdminAuth::proof(key, AdminAuth::context(local, local, action, nonce)))) {
      if(pUserInfoWindow && action == "diagnostics") pUserInfoWindow->showAdminDiagnostics(target, adminSnapshot());
    } else if(pUserInfoWindow) {
      pUserInfoWindow->adminDiagnosticsStatus(target, tr("인증 실패: 로컬 관리자 비밀번호 설정을 확인하십시오."));
    }
    password.fill(QChar(0));
    return;
  }
  if(!pMessaging->getUser(const_cast<QString*>(&target))) return;
  const quint64 serial = ++m_adminSerial;
  m_adminRequests[target] = {password, action, {}, {}, serial};
  password.fill(QChar(0));
  XmlMessage request;
  request.addData("adminaction", action);
  QString peer = target;
  sendMessage(MT_AdminChallenge, &peer, &request);
  QTimer::singleShot(15000, this, [this, target, serial] {
    if(!m_adminRequests.contains(target) || m_adminRequests.value(target).serial != serial) return;
    m_adminRequests.remove(target);
    if(pUserInfoWindow) pUserInfoWindow->adminDiagnosticsStatus(target,
        tr("조회 시간 초과: 상대방의 관리자 비밀번호 설정, 연결 상태, 앱 버전을 확인하십시오."));
    else QMessageBox::warning(pMainWindow, tr("관리자 인증"), tr("상대방의 관리자 인증 응답이 없습니다."));
  });
}

QJsonObject lmcCore::adminSnapshot() const {
  QJsonObject policy;
  const auto map = AiAgentBlocker::instance()->policy();
  for(auto it = map.constBegin(); it != map.constEnd(); ++it)
    policy[it.key()] = it.value() ? "허용" : "차단";
  return {{"조회시각_UTC", QDateTime::currentDateTimeUtc().toString(Qt::ISODate)},
      {"메신저연결", pMessaging->isConnected()}, {"수신가능", pMessaging->canReceive()},
      {"에이전트감시동작", AiAgentBlocker::instance()->monitoring()},
      {"현재에이전트정책_종료성공과는별개", policy},
      {"최근운영기록_최대200개", AdminAudit::recent()},
      {"안내", "읽기 전용입니다. 차단 성공/실패와 오류는 category/result/detail을 확인하십시오. Linux의 차단 성공은 SIGTERM 전달 성공이며 실제 종료와는 다를 수 있습니다."}};
}

void lmcCore::processAdminMessage(MessageType type, QString* peer, XmlMessage* message) {
  if(!peer || !message || !pMessaging->localUser || !pMessaging->getUser(peer)) return;
  const QString local = pMessaging->localUser->id;
  if(type == MT_AdminChallenge) {
    const auto challenge = m_adminAuth.challenge(*peer, local, message->data("adminaction"));
    XmlMessage response;
    response.addData("adminchallenge", QString::fromUtf8(QJsonDocument(challenge).toJson(QJsonDocument::Compact)));
    sendMessage(MT_AdminChallengeReply, peer, &response);
    return;
  }
  if(type == MT_AdminChallengeReply) {
    if(!m_adminRequests.contains(*peer) || !m_adminRequests[*peer].key.isEmpty()) return;
    if(message->data("adminchallenge").size() > 2048) return;
    const auto challenge = QJsonDocument::fromJson(message->data("adminchallenge").toUtf8()).object();
    auto& pending = m_adminRequests[*peer];
    const QByteArray saltHex = challenge.value("salt").toString().toLatin1();
    const QByteArray nonceHex = challenge.value("nonce").toString().toLatin1();
    if(saltHex.size() != 32 || QByteArray::fromHex(saltHex).toHex() != saltHex || nonceHex.size() != 48 ||
       QByteArray::fromHex(nonceHex).toHex() != nonceHex || challenge.value("action").toString() != pending.action) {
      m_adminRequests.remove(*peer);
      if(pUserInfoWindow) pUserInfoWindow->adminDiagnosticsStatus(*peer,
          tr("인증 불가: 상대 PC에서 관리자 비밀번호를 설정하고 최신 앱을 사용해야 합니다."));
      QMessageBox::warning(pMainWindow, tr("관리자 인증"), tr("상대방의 관리자 인증이 준비되지 않았거나 재시도 대기 중입니다."));
      return;
    }
    pending.key = AdminAuth::derive(pending.password, QByteArray::fromHex(saltHex));
    pending.password.fill(QChar(0)); pending.password.clear();
    pending.nonce = QString::fromLatin1(nonceHex);
    const QByteArray aad = AdminAuth::context(local, *peer, pending.action, pending.nonce);
    XmlMessage request;
    request.addData("adminnonce", pending.nonce);
    request.addData("adminproof", QString::fromLatin1(AdminAuth::proof(pending.key, aad).toHex()));
    if(pending.action == "remote") {
      const quint64 serial = ++remoteRequestSerial;
      pendingRemoteRequests[*peer] = serial;
      QTimer::singleShot(30000, this, [this, target = *peer, serial] {
        if(pendingRemoteRequests.value(target) == serial) pendingRemoteRequests.remove(target);
      });
      m_adminRequests.remove(*peer);
      sendMessage(MT_RemoteRequest, peer, &request);
    } else sendMessage(MT_AdminDiagnostics, peer, &request);
    return;
  }
  if(type == MT_AdminDiagnostics) {
    QByteArray key;
    const QString nonce = message->data("adminnonce");
    XmlMessage response;
    response.addData("adminnonce", nonce);
    if(!m_adminAuth.authorize(*peer, local, "diagnostics", nonce,
        QByteArray::fromHex(message->data("adminproof").toLatin1()), &key)) {
      AdminAudit::record("admin", "denied", "Administrator diagnostics authentication failed");
      response.addData("adminerror", "denied");
    } else {
      AdminAudit::record("admin", "read", "Authenticated read-only diagnostics query");
      const auto body = QJsonDocument(adminSnapshot()).toJson(QJsonDocument::Compact);
      const auto sealed = AdminAuth::seal(key, AdminAuth::context(*peer, local, "diagnostics", nonce), body);
      response.addData("adminsnapshot", QString::fromLatin1(sealed.toBase64()));
    }
    sendMessage(MT_AdminDiagnosticsReply, peer, &response);
    return;
  }
  if(type == MT_AdminDiagnosticsReply) {
    if(!m_adminRequests.contains(*peer)) return;
    const auto pending = m_adminRequests.value(*peer);
    if(pending.action != "diagnostics" || pending.key.isEmpty() || message->data("adminnonce") != pending.nonce) return;
    m_adminRequests.remove(*peer);
    if(message->data("adminsnapshot").size() > 400000) return;
    const auto body = AdminAuth::open(pending.key, AdminAuth::context(local, *peer, "diagnostics", pending.nonce),
        QByteArray::fromBase64(message->data("adminsnapshot").toLatin1()));
    const auto snapshot = QJsonDocument::fromJson(body).object();
    if(pUserInfoWindow) {
      if(snapshot.isEmpty()) pUserInfoWindow->adminDiagnosticsStatus(*peer,
          tr("인증 실패 또는 응답 검증 실패: 관리자 비밀번호와 상대방 설정을 확인하십시오."));
      else pUserInfoWindow->showAdminDiagnostics(*peer, snapshot);
    }
  }
}
