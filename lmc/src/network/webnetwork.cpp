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


#include "webnetwork.h"
#include <QDebug>
#include <QJsonArray>
#include <QJsonDocument>
#include <QJsonObject>
#include <QJsonParseError>

const QString ErrorTypeNames[] = {"busy", "error"};

lmcWebNetwork::lmcWebNetwork(QObject* parent)
    : QObject(parent) {
  active = false;
  manager = new QNetworkAccessManager(this);
  connect(manager, &QNetworkAccessManager::finished, this, &lmcWebNetwork::replyFinished);
}

lmcWebNetwork::~lmcWebNetwork(void) {}

void lmcWebNetwork::init(void) {}

void lmcWebNetwork::start(void) {}

void lmcWebNetwork::stop(void) {}

void lmcWebNetwork::sendMessage(QString* lpszUrl, QString* lpszData) {
  Q_UNUSED(lpszData);

  if(!active)
    sendMessage(QUrl(*lpszUrl));
  else
    raiseError(ET_Busy);
}

void lmcWebNetwork::settingsChanged(void) {}

void lmcWebNetwork::slotError(QNetworkReply::NetworkError code) {
  if(code != QNetworkReply::NoError) {
    raiseError(ET_Error);
    active = false;
  }
}

void lmcWebNetwork::replyFinished(QNetworkReply* reply) {
  if(reply->error() != QNetworkReply::NoError) {
    reply->deleteLater();
    active = false;
    return;
  }

  // check if there was an HTTP redirection
  QVariant redirect = reply->attribute(QNetworkRequest::RedirectionTargetAttribute);
  if(!redirect.isNull()) {
    // send a new request to the redirected url
    QUrl redirectUrl = reply->url().resolved(redirect.toUrl());
    reply->deleteLater();
    sendMessage(redirectUrl);
    return;
  } else {
    // no redirection, get the data from the reply
    QByteArray data = reply->readAll();
    QString szMessage = QString::fromUtf8(data);

    // Support GitHub Releases API JSON response ({"tag_name": "v1.3.02", "assets": [...]})
    QJsonParseError jsonError;
    QJsonDocument jsonDoc = QJsonDocument::fromJson(data, &jsonError);
    if(jsonError.error == QJsonParseError::NoError && jsonDoc.isObject()) {
      QJsonObject jsonObj = jsonDoc.object();
      if(jsonObj.contains("tag_name")) {
        QString rawTag = jsonObj.value("tag_name").toString().trimmed();
        QString tagName = rawTag;
        if(tagName.startsWith('v', Qt::CaseInsensitive))
          tagName.remove(0, 1);

        QString exeUrl;
        QString zipUrl;
        if(jsonObj.contains("assets") && jsonObj.value("assets").isArray()) {
          const QJsonArray assets = jsonObj.value("assets").toArray();
          for(const QJsonValue& val : assets) {
            if(!val.isObject())
              continue;
            QJsonObject assetObj = val.toObject();
            QString assetName = assetObj.value("name").toString();
            QString browserUrl = assetObj.value("browser_download_url").toString();
            if(assetName.endsWith(".exe", Qt::CaseInsensitive) && exeUrl.isEmpty())
              exeUrl = browserUrl;
            else if(assetName.endsWith(".zip", Qt::CaseInsensitive) && zipUrl.isEmpty())
              zipUrl = browserUrl;
          }
        }

        QString directUrl = !exeUrl.isEmpty() ? exeUrl : zipUrl;
        if(directUrl.isEmpty() && !tagName.isEmpty()) {
          directUrl = QString(IDA_DOMAIN "/releases/download/v%1/lmc-%1-win64.exe").arg(tagName);
        }

        if(!tagName.isEmpty()) {
          XmlMessage xmlMessage;
          xmlMessage.addHeader(XN_TYPE, MessageTypeNames[MT_Version]);
          xmlMessage.addData(XN_WINVERSION, tagName);
          xmlMessage.addData(XN_LINVERSION, tagName);
          xmlMessage.addData(XN_MACVERSION, tagName);
          xmlMessage.addData(XN_DOWNLOADURL, directUrl);
          szMessage = xmlMessage.toString();
        }
      }
    }

    emit messageReceived(&szMessage);
    reply->close();
  }

  reply->deleteLater();
  active = false;
}

void lmcWebNetwork::sendMessage(const QUrl& url) {
  if(url.isEmpty()) {
    raiseError(ET_Error);
    return;
  }

  active = true;

  QNetworkRequest request(url);
  request.setRawHeader("User-Agent", "LAN-Messenger/" IDA_VERSION);
  request.setRawHeader("Accept", "application/vnd.github+json");

  QNetworkReply* reply = manager->get(request);
  connect(reply, &QNetworkReply::errorOccurred, this, &lmcWebNetwork::slotError);
}

void lmcWebNetwork::raiseError(ErrorType type) {
  XmlMessage xmlMessage;
  xmlMessage.addHeader(XN_TYPE, MessageTypeNames[MT_WebFailed]);
  xmlMessage.addData(XN_ERROR, ErrorTypeNames[type]);

  QString szMessage = xmlMessage.toString();
  emit messageReceived(&szMessage);
}
