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


#include "core/trace.h"
#include "udpnetwork.h"

lmcUdpNetwork::lmcUdpNetwork(QObject* parent)
    : QObject(parent) {
  pUdpReceiver = new QUdpSocket(this);
  pUdpSender = new QUdpSocket(this);
  localId = QString();
  canReceive = false;
  isRunning = false;
  pCrypto = NULL;
  ipAddress = QHostAddress::Any;
  subnetMask = QHostAddress::Any;
  defBroadcast = QHostAddress::Broadcast;
  broadcastList.clear();
}

lmcUdpNetwork::~lmcUdpNetwork(void) {
}

void lmcUdpNetwork::init(int nPort) {
  pSettings = new lmcSettings();
  nUdpPort = nPort;
  multicastAddress = QHostAddress(pSettings->value(IDS_MULTICAST, IDS_MULTICAST_VAL).toString());
  int size = pSettings->beginReadArray(IDS_BROADCASTHDR);
  for(int index = 0; index < size; index++) {
    pSettings->setArrayIndex(index);
    QHostAddress address = QHostAddress(pSettings->value(IDS_BROADCAST).toString());
    if(!broadcastList.contains(address))
      broadcastList.append(address);
  }
  pSettings->endArray();
}

void lmcUdpNetwork::start(void) {
  //	start receiving datagrams
  canReceive = startReceiving();
  isRunning = true;
}

void lmcUdpNetwork::stop(void) {
  disconnect(pUdpReceiver, &QIODevice::readyRead, this, &lmcUdpNetwork::processPendingDatagrams);
  if(pUdpReceiver->state() == QAbstractSocket::BoundState) {
    lmcTrace::write("Leaving multicast group " + multicastAddress.toString() + " on interface " +
                    multicastInterface.humanReadableName());
    bool left = pUdpReceiver->leaveMulticastGroup(multicastAddress, multicastInterface);
    pUdpReceiver->close();
    lmcTrace::write((left ? "Success" : "Failed"));
  }
  isRunning = false;
}

void lmcUdpNetwork::setLocalId(QString* lpszLocalId) {
  localId = *lpszLocalId;
}

void lmcUdpNetwork::setCrypto(lmcCrypto* pCrypto) {
  this->pCrypto = pCrypto;
}

void lmcUdpNetwork::sendBroadcast(QString* lpszData) {
  if(!isRunning) {
    lmcTrace::write("Warning: UDP server not running. Broadcast not sent");
    return;
  }

  QByteArray datagram = lpszData->toUtf8();
  sendDatagram(multicastAddress, datagram);

  QList<QHostAddress> targets = broadcastList;
  if(!targets.contains(QHostAddress::Broadcast))
    targets.append(QHostAddress::Broadcast);

  // Also include subnet broadcast addresses of all active non-loopback IPv4 interfaces
  const QList<QNetworkInterface> ifaces = QNetworkInterface::allInterfaces();
  for(const QNetworkInterface& iface : ifaces) {
    if(!(iface.flags() & QNetworkInterface::IsUp) ||
       !(iface.flags() & QNetworkInterface::IsRunning) ||
       (iface.flags() & QNetworkInterface::IsLoopBack))
      continue;
    for(const QNetworkAddressEntry& entry : iface.addressEntries()) {
      if(entry.ip().protocol() == QAbstractSocket::IPv4Protocol && !entry.broadcast().isNull()) {
        if(!targets.contains(entry.broadcast()))
          targets.append(entry.broadcast());
      }
    }
  }

  for(int index = 0; index < targets.count(); index++) {
    sendDatagram(targets.at(index), datagram);
  }
}

void lmcUdpNetwork::settingsChanged(void) {
  QHostAddress address = QHostAddress(pSettings->value(IDS_MULTICAST, IDS_MULTICAST_VAL).toString());
  if(multicastAddress != address) {
    if(pUdpReceiver->state() == QAbstractSocket::BoundState) {
      lmcTrace::write("Leaving multicast group " + multicastAddress.toString() + " on interface " +
                      multicastInterface.humanReadableName());
      bool left = pUdpReceiver->leaveMulticastGroup(multicastAddress, multicastInterface);
      lmcTrace::write((left ? "Success" : "Failed"));
    }
    multicastAddress = address;
    lmcTrace::write("Joining multicast group " + multicastAddress.toString() + " on interface " +
                    multicastInterface.humanReadableName());
    bool joined = pUdpReceiver->joinMulticastGroup(multicastAddress, multicastInterface);
    lmcTrace::write((joined ? "Success" : "Failed"));
  }
  broadcastList.clear();
  broadcastList.append(defBroadcast);
  int size = pSettings->beginReadArray(IDS_BROADCASTHDR);
  for(int index = 0; index < size; index++) {
    pSettings->setArrayIndex(index);
    QHostAddress address = QHostAddress(pSettings->value(IDS_BROADCAST).toString());
    if(!broadcastList.contains(address))
      broadcastList.append(address);
  }
  pSettings->endArray();
}

void lmcUdpNetwork::setMulticastInterface(const QNetworkInterface& networkInterface) {
  multicastInterface = networkInterface;
}

void lmcUdpNetwork::setIPAddress(const QString& szAddress, const QString& szSubnet) {
  ipAddress = QHostAddress(szAddress);
  subnetMask = QHostAddress(szSubnet);
  setDefaultBroadcast();
  if(!broadcastList.contains(defBroadcast))
    broadcastList.append(defBroadcast);
}

void lmcUdpNetwork::processPendingDatagrams(void) {
  while(pUdpReceiver->hasPendingDatagrams()) {
    QByteArray datagram;
    datagram.resize(pUdpReceiver->pendingDatagramSize());
    QHostAddress address;
    pUdpReceiver->readDatagram(datagram.data(), datagram.size(), &address);
    bool ok = false;
    quint32 ipv4 = address.toIPv4Address(&ok);
    QString szAddress = ok ? QHostAddress(ipv4).toString() : address.toString();
    parseDatagram(&szAddress, datagram);
  }
}

void lmcUdpNetwork::sendDatagram(QHostAddress remoteAddress, QByteArray& datagram) {
  if(!isRunning)
    return;

  lmcTrace::write("Sending UDP datagram to " + remoteAddress.toString() + ":" + QString::number(nUdpPort));
  pUdpSender->writeDatagram(datagram.data(), datagram.size(), remoteAddress, nUdpPort);
}

bool lmcUdpNetwork::startReceiving(void) {
  lmcTrace::write("Binding UDP listener to port " + QString::number(nUdpPort));

  if(pUdpReceiver->bind(QHostAddress::AnyIPv4, nUdpPort, QUdpSocket::ShareAddress | QUdpSocket::ReuseAddressHint)) {
    lmcTrace::write("Success");
    lmcTrace::write("Joining multicast group " + multicastAddress.toString() +
                    " on interface " + multicastInterface.humanReadableName());
    bool joined = pUdpReceiver->joinMulticastGroup(multicastAddress, multicastInterface);
    lmcTrace::write((joined ? "Success" : "Failed"));
    connect(pUdpReceiver, &QIODevice::readyRead, this, &lmcUdpNetwork::processPendingDatagrams);
    return true;
  }

  lmcTrace::write("Failed");
  return false;
}

void lmcUdpNetwork::parseDatagram(QString* lpszAddress, QByteArray& baDatagram) {
  lmcTrace::write("UDP datagram received from " + *lpszAddress);
  DatagramHeader* pHeader = new DatagramHeader(DT_Broadcast, QString(), *lpszAddress);
  QByteArray payload = baDatagram;
  if(payload.startsWith("BRDCST") || payload.startsWith("BRDv30"))
    payload = payload.mid(6);
  QString szData = QString::fromUtf8(payload.constData(), payload.length());
  emit broadcastReceived(pHeader, &szData);
}

void lmcUdpNetwork::setDefaultBroadcast(void) {
  if(ipAddress.protocol() != QAbstractSocket::IPv4Protocol)
    return;

  //	The network broadcast address is obtained by ORing the host address and
  //	bit inversed subnet mask
  quint32 ipv4 = ipAddress.toIPv4Address();
  quint32 invMask = ~(subnetMask.toIPv4Address());
  defBroadcast = QHostAddress((ipv4 | invMask));
}
