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
#include "network.h"

lmcNetwork::lmcNetwork(QObject* parent)
    : QObject(parent) {
  pUdpNetwork = new lmcUdpNetwork(this);
  pTcpNetwork = new lmcTcpNetwork(this);
  pWebNetwork = new lmcWebNetwork(this);
  connect(pUdpNetwork, &lmcUdpNetwork::broadcastReceived, this, &lmcNetwork::udp_receiveBroadcast);
  connect(pTcpNetwork, &lmcTcpNetwork::newConnection, this, &lmcNetwork::tcp_newConnection);
  connect(pTcpNetwork, &lmcTcpNetwork::connectionLost, this, &lmcNetwork::tcp_connectionLost);
  connect(pTcpNetwork, &lmcTcpNetwork::messageReceived, this, &lmcNetwork::tcp_receiveMessage);
  connect(pTcpNetwork, &lmcTcpNetwork::progressReceived, this, &lmcNetwork::tcp_receiveProgress);
  connect(pWebNetwork, &lmcWebNetwork::messageReceived, this, &lmcNetwork::web_receiveMessage);
  pTimer = NULL;
  pCrypto = new lmcCrypto();
  ipAddress = QString();
  subnetMask = QString();
  networkInterface = QNetworkInterface();
  interfaceName = QString();
  isConnected = false;
  canReceive = false;
}

lmcNetwork::~lmcNetwork(void) {
}

void lmcNetwork::init(XmlMessage* pInitParams) {
  lmcTrace::write("Network initialized");

  pSettings = new lmcSettings();
  isConnected = getIPAddress();

  lmcTrace::write("Network interface selected: " + (networkInterface.isValid() ? networkInterface.humanReadableName() : "None") +
                  "\nIP address obtained: " + (ipAddress.isEmpty() ? "NULL" : ipAddress) +
                  "\nSubnet mask obtained: " + (subnetMask.isEmpty() ? "NULL" : subnetMask) +
                  "\nConnection status: " + (isConnected ? "OK" : "Fail"));

  int cliUdpPort = pInitParams->data(XN_ARGUDPPORT).toInt();
  int udpPort = cliUdpPort > 0 ? cliUdpPort : pSettings->value(IDS_UDPPORT, IDS_UDPPORT_VAL).toInt();
  int tcpPort = pSettings->value(IDS_TCPPORT, IDS_TCPPORT_VAL).toString().trimmed().toInt();
  QString protocolMode = pSettings->value(IDS_PROTOCOLMODE, IDS_PROTOCOLMODE_VAL).toString();
  bool legacyCompat = pSettings->value(IDS_LEGACYCOMPAT, IDS_LEGACYCOMPAT_VAL).toBool();
  if(protocolMode == "Strict v3.0")
    legacyCompat = false;
  else if(protocolMode == "Legacy v1.0")
    legacyCompat = true;
  pCrypto->setLegacyCompatibility(legacyCompat);
  pUdpNetwork->init(udpPort);
  pTcpNetwork->init(tcpPort);
}

void lmcNetwork::start(void) {
  lmcTrace::write("Network started");
  pCrypto->generateRSA();

  pTimer = new QTimer(this);
  connect(pTimer, &QTimer::timeout, this, &lmcNetwork::timer_timeout);
  pTimer->start(2000);

  pUdpNetwork->setCrypto(pCrypto);
  pTcpNetwork->setCrypto(pCrypto);
  if(isConnected) {
    pUdpNetwork->setMulticastInterface(networkInterface);
    pUdpNetwork->setIPAddress(ipAddress, subnetMask);
    pUdpNetwork->start();
    pTcpNetwork->setIPAddress(ipAddress);
    pTcpNetwork->start();
    canReceive = pUdpNetwork->canReceive;
  }
}

void lmcNetwork::stop(void) {
  pTimer->stop();

  pUdpNetwork->stop();
  pTcpNetwork->stop();

  lmcTrace::write("Network stopped");
}

QString lmcNetwork::physicalAddress(void) {
  if(networkInterface.isValid())
    return networkInterface.hardwareAddress();

  return QString();

  //	//	get the first active network interface
  //	QNetworkInterface networkInterface;

  //	if(getNetworkInterface(&networkInterface))
  //		return networkInterface.hardwareAddress();

  //	return QString();
}

void lmcNetwork::setLocalId(QString* lpszLocalId) {
  pUdpNetwork->setLocalId(lpszLocalId);
  pTcpNetwork->setLocalId(lpszLocalId);
}

void lmcNetwork::sendBroadcast(QString* lpszData) {
  pUdpNetwork->sendBroadcast(lpszData);
}

void lmcNetwork::addConnection(QString* lpszUserId, QString* lpszAddress, int nPort) {
  pTcpNetwork->addConnection(lpszUserId, lpszAddress, nPort);
}

int lmcNetwork::tcpServerPort(void) const {
  return pTcpNetwork->serverPort();
}

void lmcNetwork::sendMessage(QString* lpszReceiverId, QString* lpszAddress, QString* lpszData) {
  Q_UNUSED(lpszAddress);
  pTcpNetwork->sendMessage(lpszReceiverId, lpszData);
}

bool lmcNetwork::canSendTo(QString* lpszReceiverId) {
  return pTcpNetwork->canSendTo(lpszReceiverId);
}

void lmcNetwork::initSendFile(QString* lpszReceiverId, QString* lpszAddress, QString* lpszData, int nPort) {
  pTcpNetwork->initSendFile(lpszReceiverId, lpszAddress, lpszData, nPort);
}

void lmcNetwork::initReceiveFile(QString* lpszSenderId, QString* lpszAddress, QString* lpszData) {
  pTcpNetwork->initReceiveFile(lpszSenderId, lpszAddress, lpszData);
}

void lmcNetwork::fileOperation(FileMode mode, QString* lpszUserId, QString* lpszData) {
  pTcpNetwork->fileOperation(mode, lpszUserId, lpszData);
}

void lmcNetwork::sendWebMessage(QString* lpszUrl, QString* lpszData) {
  pWebNetwork->sendMessage(lpszUrl, lpszData);
}

void lmcNetwork::settingsChanged(void) {
  QString protocolMode = pSettings->value(IDS_PROTOCOLMODE, IDS_PROTOCOLMODE_VAL).toString();
  bool legacyCompat = pSettings->value(IDS_LEGACYCOMPAT, IDS_LEGACYCOMPAT_VAL).toBool();
  if(protocolMode == "Strict v3.0")
    legacyCompat = false;
  else if(protocolMode == "Legacy v1.0")
    legacyCompat = true;
  pCrypto->setLegacyCompatibility(legacyCompat);
  pUdpNetwork->settingsChanged();
  pTcpNetwork->settingsChanged();
}

void lmcNetwork::timer_timeout(void) {
  bool prev = isConnected;
  isConnected = getIPAddress(false);

  if(prev != isConnected) {
    lmcTrace::write("Network interface selected: " + (networkInterface.isValid() ? networkInterface.humanReadableName() : "None") +
                    "\nIP address obtained: " + (ipAddress.isEmpty() ? "NULL" : ipAddress) +
                    "\nSubnet mask obtained: " + (subnetMask.isEmpty() ? "NULL" : subnetMask) +
                    "\nConnection status: " + (isConnected ? "OK" : "Fail"));

    if(isConnected) {
      pUdpNetwork->setMulticastInterface(networkInterface);
      pUdpNetwork->setIPAddress(ipAddress, subnetMask);
      pUdpNetwork->start();
      pTcpNetwork->setIPAddress(ipAddress);
      pTcpNetwork->start();
      canReceive = pUdpNetwork->canReceive;
    } else {
      pUdpNetwork->stop();
      pTcpNetwork->stop();
    }
    emit connectionStateChanged();
  }
}

void lmcNetwork::udp_receiveBroadcast(DatagramHeader* pHeader, QString* lpszData) {
  emit broadcastReceived(pHeader, lpszData);
}

void lmcNetwork::tcp_newConnection(QString* lpszUserId, QString* lpszAddress) {
  emit newConnection(lpszUserId, lpszAddress);
}

void lmcNetwork::tcp_connectionLost(QString* lpszUserId) {
  emit connectionLost(lpszUserId);
}

void lmcNetwork::tcp_receiveMessage(DatagramHeader* pHeader, QString* lpszData) {
  emit messageReceived(pHeader, lpszData);
}

void lmcNetwork::tcp_receiveProgress(QString* lpszUserId, QString* lpszData) {
  emit progressReceived(lpszUserId, lpszData);
}

void lmcNetwork::web_receiveMessage(QString* lpszData) {
  emit webMessageReceived(lpszData);
}

bool lmcNetwork::getIPAddress(bool verbose) {
  // If an interface is already being used, get it. Ignore all others
  networkInterface = QNetworkInterface::interfaceFromName(interfaceName);
  if(networkInterface.isValid()) {
    QNetworkAddressEntry addressEntry;
    if(isInterfaceUp(&networkInterface) && getIPAddress(&networkInterface, &addressEntry)) {
      ipAddress = addressEntry.ip().toString();
      subnetMask = addressEntry.netmask().toString();
      return true;
    }
    ipAddress = QString();
    subnetMask = QString();
    return false;
  }

  // Currently, not using preferred connection, since using preferred connection is not
  // working properly.
  // Get the preferred interface name from settings if checking for the first time
  //if(szInterfaceName.isNull())
  //	szInterfaceName = pSettings->value(IDS_CONNECTION, IDS_CONNECTION_VAL).toString();

  //bool usePreferred = (szInterfaceName.compare(IDS_CONNECTION_VAL, Qt::CaseInsensitive) != 0);
  bool usePreferred = false;

  lmcTrace::write("Checking for active network interface...", verbose);

  //	get a list of all network interfaces available in the system
  QList<QNetworkInterface> allInterfaces = QNetworkInterface::allInterfaces();

  bool activeFound = false;

  auto isVirtualInterface = [](const QNetworkInterface& iface) -> bool {
    QString n = iface.name().toLower();
    QString h = iface.humanReadableName().toLower();
    return n.startsWith("docker") || n.startsWith("veth") || n.startsWith("br-") ||
           n.startsWith("virbr") || n.startsWith("vmnet") || n.startsWith("vboxnet") ||
           n.startsWith("wsl") || n.startsWith("tun") || n.startsWith("tap") ||
           h.contains("virtual") || h.contains("vmware") || h.contains("vbox") ||
           h.contains("docker") || h.contains("wsl") || h.contains("hyper-v") ||
           h.contains("loopback");
  };

  // Pass 1: Prefer physical (non-virtual) interfaces with non-link-local IPv4
  // Pass 2: Fallback to any active interface
  for(int pass = 0; pass < 2; pass++) {
    for(int index = 0; index < allInterfaces.count(); index++) {
      if(usePreferred && interfaceName.compare(allInterfaces[index].name()) != 0)
        continue;

      if(pass == 0 && isVirtualInterface(allInterfaces[index]))
        continue;

      if(isInterfaceUp(&allInterfaces[index])) {
        activeFound = true;
        QNetworkAddressEntry addressEntry;
        if(getIPAddress(&allInterfaces[index], &addressEntry)) {
          if(pass == 0 && addressEntry.ip().toString().startsWith("169.254."))
            continue;
          lmcTrace::write("Active network interface found: " + allInterfaces[index].humanReadableName(),
                          verbose);
          ipAddress = addressEntry.ip().toString();
          subnetMask = addressEntry.netmask().toString();
          networkInterface = allInterfaces[index];
          interfaceName = allInterfaces[index].name();
          return true;
        }
      }
    }
  }

  lmcTrace::write(QString("Warning: ") + (activeFound ? "No IP address found" : "No active network interface found"),
                  verbose);
  ipAddress = QString();
  subnetMask = QString();
  return false;
}

bool lmcNetwork::getIPAddress(QNetworkInterface* pNetworkInterface, QNetworkAddressEntry* pAddressEntry) {
  //	get a list of all associated ip addresses of the interface
  QList<QNetworkAddressEntry> addressEntries = pNetworkInterface->addressEntries();
  //	return the first non-link-local ipv4 address if available
  for(int index = 0; index < addressEntries.count(); index++) {
    if(addressEntries[index].ip().protocol() == QAbstractSocket::IPv4Protocol &&
       !addressEntries[index].ip().toString().startsWith("169.254.")) {
      *pAddressEntry = addressEntries[index];
      return true;
    }
  }
  for(int index = 0; index < addressEntries.count(); index++) {
    if(addressEntries[index].ip().protocol() == QAbstractSocket::IPv4Protocol) {
      *pAddressEntry = addressEntries[index];
      return true;
    }
  }
  // if ipv4 address is not present, check for ipv6 address
  for(int index = 0; index < addressEntries.count(); index++) {
    if(addressEntries[index].ip().protocol() == QAbstractSocket::IPv6Protocol) {
      *pAddressEntry = addressEntries[index];
      return true;
    }
  }

  return false;
}

bool lmcNetwork::getNetworkInterface(QNetworkInterface* pNetworkInterface) {
  // If an interface is already being used, get it. Ignore all others
  if(networkInterface.isValid()) {
    *pNetworkInterface = networkInterface;
    return isInterfaceUp(pNetworkInterface);
  }

  // Get the preferred interface name from settings if checking for the first time
  if(interfaceName.isNull())
    interfaceName = pSettings->value(IDS_CONNECTION, IDS_CONNECTION_VAL).toString();

  QString szPreferred = interfaceName;
  // Currently, hard coding usePreferred to False, since using preferred connection is not
  // working properly.
  //bool usePreferred = (szPreferred.compare(IDS_CONNECTION_VAL, Qt::CaseInsensitive) != 0);
  bool usePreferred = false;

  // Return true if preferred interface is available
  if(usePreferred && getNetworkInterface(pNetworkInterface, &szPreferred))
    return true;

  // Return true if a fallback interface is available
  if(!usePreferred && getNetworkInterface(pNetworkInterface, NULL))
    return true;

  return false;
}

bool lmcNetwork::getNetworkInterface(QNetworkInterface* pNetworkInterface, QString* lpszPreferred) {
  lmcTrace::write("Checking for active network interface...");

  //	get a list of all network interfaces available in the system
  QList<QNetworkInterface> allInterfaces = QNetworkInterface::allInterfaces();

  //	return the preferred interface if it is active
  for(int index = 0; index < allInterfaces.count(); index++) {
    // Skip to the next interface if it is not the preferred one
    // Checked only if searching for the preferred adapter
    if(lpszPreferred && lpszPreferred->compare(allInterfaces[index].name()) != 0)
      continue;

    if(isInterfaceUp(&allInterfaces[index])) {
      *pNetworkInterface = allInterfaces[index];
      lmcTrace::write("Active network interface found: " + pNetworkInterface->humanReadableName());
      return true;
    }
  }

  lmcTrace::write("Warning: No active network interface found");
  return false;
}

bool lmcNetwork::isInterfaceUp(QNetworkInterface* pNetworkInterface) {
  if(pNetworkInterface->flags().testFlag(QNetworkInterface::IsUp) && pNetworkInterface->flags().testFlag(QNetworkInterface::IsRunning) && !pNetworkInterface->flags().testFlag(QNetworkInterface::IsLoopBack)) {
    return true;
  }

  return false;
}

bool lmcNetwork::getNetworkAddressEntry(QNetworkAddressEntry* pAddressEntry) {
  //	get the first active network interface
  QNetworkInterface networkInterface;

  if(getNetworkInterface(&networkInterface)) {
    //lmcTrace::write("Querying IP address from network interface...");

    //	get a list of all associated ip addresses of the interface
    QList<QNetworkAddressEntry> addressEntries = networkInterface.addressEntries();
    //	return the first address which is an ipv4 address
    for(int index = 0; index < addressEntries.count(); index++) {
      if(addressEntries[index].ip().protocol() == QAbstractSocket::IPv4Protocol) {
        *pAddressEntry = addressEntries[index];
        this->networkInterface = networkInterface;
        this->interfaceName = networkInterface.name();
        //lmcTrace::write("IPv4 address found for network interface.");
        return true;
      }
    }
    // if ipv4 address is not present, check for ipv6 address
    for(int index = 0; index < addressEntries.count(); index++) {
      if(addressEntries[index].ip().protocol() == QAbstractSocket::IPv6Protocol) {
        *pAddressEntry = addressEntries[index];
        this->networkInterface = networkInterface;
        this->interfaceName = networkInterface.name();
        //lmcTrace::write("IPv6 address found for network interface.");
        return true;
      }
    }

    //lmcTrace::write("Warning: No IP address found for network interface.");
  }

  return false;
}
