import React, { useState, useEffect, useRef } from 'react';
import {
  AVATAR_LIST,
  ChatMessage,
  ChatStateType,
  DatagramType,
  DEFAULT_GROUPS,
  FileTransferItem,
  Group,
  HistoryRecord,
  LmcSettings,
  ProtocolHeaderMode,
  STATUS_LIST,
  StatusCode,
  User,
  UserCap,
  WireFrameLog,
} from './types/lmc';
import {
  buildXmlMessage,
  bytesToHex,
  DatagramFraming,
  FIXTURE_RSA1024_PUB_PKCS1,
  FIXTURE_RSA2048_PUB_PKCS1,
  LmcCrypto,
} from './services/cryptoEngine';
import { ChatWindow } from './components/ChatWindow';
import {
  AboutDialogModal,
  BroadcastWindowModal,
  ChatRoomWindowModal,
  CryptoInspectorModal,
  HistoryWindowModal,
  RemoteViewerWindowModal,
  SettingsDialogModal,
  TransferWindowModal,
  UpdateWindowModal,
  UserInfoWindowModal,
} from './components/DialogModals';

const DEFAULT_SETTINGS: LmcSettings = {
  autoStart: true,
  autoShow: true,
  language: 'en_US',
  showSysTray: true,
  minimizeToTray: false,
  singleClickTray: false,
  showSysTrayMsg: true,
  userName: 'Alex Kim (Ubuntu 24.04)',
  firstName: 'Alex',
  lastName: 'Kim',
  about: 'Systems Engineer — OpenSSL 3.0.13 / Qt 6.6 workstation',
  trimMessage: true,
  clearOnClose: true,
  showEmoticons: true,
  showMessageTime: true,
  showMessageDate: false,
  allowLinks: true,
  pathToLink: false,
  showSendButton: true,
  fontFamily: 'Tahoma',
  fontSize: 'Medium',
  fontColor: '#000000',
  saveHistory: true,
  sysHistoryPath: true,
  customHistoryPath: '',
  saveFileHistory: true,
  showAlerts: true,
  noBusyAlert: false,
  noDNDAlert: true,
  enableSound: true,
  noBusySound: false,
  noDNDSound: true,
  soundEvents: {
    newMessage: true,
    userOnline: true,
    userOffline: true,
    newFile: true,
    fileDone: true,
  },
  connectionName: 'Auto (eth0 - 192.168.1.42)',
  timeoutSec: 10,
  maxRetries: 1,
  multicastAddress: '239.255.100.100',
  broadcastList: ['255.255.255.255', '192.168.1.255'],
  udpPort: 50000,
  tcpPort: 50000,
  legacyCompatibility: true,
  protocolMode: 'Legacy v1.0',
  autoReceiveFile: false,
  autoShowTransferWindow: true,
  fileStoragePath: '/home/alex/Downloads/LANMessenger',
  theme: 'Bubble',
  userListView: 'Detailed',
  showStatusTooltip: true,
  sendKeyModCtrlEnter: false,
};

const INITIAL_PEERS: User[] = [
  {
    id: 'PEER-WIN7-LEGACY',
    name: 'Minho Park (Win7 Legacy)',
    firstName: 'Minho',
    lastName: 'Park',
    about: 'Legacy Windows 7 Embedded Controller running LAN Messenger v1.2.35 (OpenSSL 1.0.2u)',
    status: 'chat',
    avatar: 2,
    avatarPath: '/resources/avatars/2.png',
    note: 'OpenSSL 1.0.2u • Requires PKCS#1 BEGIN RSA PUBLIC KEY',
    group: '3BD95C30048C4E65F6082539A32DC333',
    address: '192.168.1.104',
    hostName: 'WIN7-LAB-PC04',
    logonName: 'mpark',
    osName: 'Windows 7 SP1 (x86)',
    version: '1.2.35',
    opensslVersion: 'OpenSSL 1.0.2u (Legacy PKCS#1)',
    rsaBits: 1024,
    caps: UserCap.UC_File | UserCap.UC_GroupMessage | UserCap.UC_Folder,
    publicKeyPem: FIXTURE_RSA1024_PUB_PKCS1,
    sessionEstablished: true,
  },
  {
    id: 'PEER-UBUNTU18-LEGACY',
    name: 'Elena Rostova (Ubuntu 18.04)',
    firstName: 'Elena',
    lastName: 'Rostova',
    about: 'QA Test Bench verifying RSA-1024 OAEP-SHA1 128-byte envelope compatibility',
    status: 'away',
    avatar: 5,
    avatarPath: '/resources/avatars/5.png',
    note: 'Testing RSA-1024 <-> RSA-2048 mixed-pair handshake',
    group: '3BD95C30048C4E65F6082539A32DC333',
    address: '192.168.1.108',
    hostName: 'qa-bionic-node2',
    logonName: 'erostova',
    osName: 'Ubuntu 18.04 LTS',
    version: '1.2.35',
    opensslVersion: 'OpenSSL 1.0.2u (Legacy PKCS#1)',
    rsaBits: 1024,
    caps: UserCap.UC_File | UserCap.UC_GroupMessage | UserCap.UC_Folder,
    publicKeyPem: FIXTURE_RSA1024_PUB_PKCS1,
    sessionEstablished: true,
  },
  {
    id: 'PEER-UBUNTU24-MODERN',
    name: 'Marcus Chen (Ubuntu 24.04)',
    firstName: 'Marcus',
    lastName: 'Chen',
    about: 'Core C++/Qt6 Developer — OpenSSL 3.0 OSSL_DECODER & EVP_PKEY maintainer',
    status: 'chat',
    avatar: 9,
    avatarPath: '/resources/avatars/9.png',
    note: 'OpenSSL 3.0.13 • Supports Legacy v1.0 & Strict v3.0',
    group: '2AD85B20048C4E65F6082539A32DC222',
    address: '192.168.1.21',
    hostName: 'dev-noble-ws01',
    logonName: 'mchen',
    osName: 'Linux (Ubuntu 24.04 LTS)',
    version: '1.3.0',
    opensslVersion: 'OpenSSL 3.0.13 (EVP_PKEY / OSSL_DECODER)',
    rsaBits: 2048,
    caps: UserCap.UC_File | UserCap.UC_GroupMessage | UserCap.UC_Folder,
    publicKeyPem: FIXTURE_RSA2048_PUB_PKCS1,
    sessionEstablished: true,
  },
  {
    id: 'PEER-MACOS-DESIGN',
    name: 'Hannah Lindqvist (macOS)',
    firstName: 'Hannah',
    lastName: 'Lindqvist',
    about: 'Desktop UI & Theme Designer',
    status: 'busy',
    avatar: 14,
    avatarPath: '/resources/avatars/14.png',
    note: 'In a release review meeting',
    group: '1CD75C10048C4E65F6082539A32DC111',
    address: '192.168.1.55',
    hostName: 'Hannahs-MacBook-Pro.local',
    logonName: 'hlindqvist',
    osName: 'macOS Sonoma 14.5',
    version: '1.3.0',
    opensslVersion: 'OpenSSL 3.0.13 (EVP_PKEY / OSSL_DECODER)',
    rsaBits: 2048,
    caps: UserCap.UC_File | UserCap.UC_GroupMessage | UserCap.UC_Folder,
    publicKeyPem: FIXTURE_RSA2048_PUB_PKCS1,
    sessionEstablished: true,
  },
];

export function App() {
  const cryptoRef = useRef<LmcCrypto>(new LmcCrypto());
  const [settings, setSettings] = useState<LmcSettings>(DEFAULT_SETTINGS);
  const [connected, setConnected] = useState(true);

  const [localUser, setLocalUser] = useState<User>(() => {
    const pubPem = cryptoRef.current.generateRSA();
    return {
      id: 'LOCAL-NODE-192-168-1-42',
      name: DEFAULT_SETTINGS.userName,
      firstName: DEFAULT_SETTINGS.firstName,
      lastName: DEFAULT_SETTINGS.lastName,
      about: DEFAULT_SETTINGS.about,
      status: 'chat',
      avatar: 0,
      avatarPath: '/resources/avatars/0.png',
      note: 'Qt 6.10.2 (GCC 15.2.0) • OpenSSL 3.0 <-> 1.0 Interop',
      group: DEFAULT_GROUPS[0].id,
      address: '192.168.1.42',
      hostName: 'ubuntu-26-04-ws',
      logonName: 'alex',
      osName: 'Ubuntu 26.04.1 LTS (Qt 6.10.2 / GCC 15.2.0 x86_64)',
      version: '1.3.0',
      opensslVersion: 'OpenSSL 3.0.13 (EVP_PKEY / OSSL_DECODER)',
      rsaBits: 2048,
      caps: UserCap.UC_File | UserCap.UC_GroupMessage | UserCap.UC_Folder,
      publicKeyPem: pubPem,
      sessionEstablished: true,
    };
  });

  const [groups, setGroups] = useState<Group[]>(DEFAULT_GROUPS);
  const [peers, setPeers] = useState<User[]>(INITIAL_PEERS);

  // Open chat windows & active peer
  const [openChatPeerIds, setOpenChatPeerIds] = useState<string[]>([
    'PEER-WIN7-LEGACY',
    'PEER-UBUNTU24-MODERN',
  ]);
  const [activeChatPeerId, setActiveChatPeerId] = useState<string>('PEER-WIN7-LEGACY');

  // Messages per peerId
  const [conversations, setConversations] = useState<Record<string, ChatMessage[]>>({});
  const [peerChatStates, setPeerChatStates] = useState<Record<string, ChatStateType>>({});

  // Public chat room messages
  const [publicMessages, setPublicMessages] = useState<ChatMessage[]>([]);

  // File transfers
  const [transfers, setTransfers] = useState<FileTransferItem[]>([]);

  // Saved conversation history
  const [history, setHistory] = useState<HistoryRecord[]>([]);

  // Live wire frame logs
  const [wireLogs, setWireLogs] = useState<WireFrameLog[]>([]);

  // UI popups & modals in MainWindow
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showAvatarDropdown, setShowAvatarDropdown] = useState(false);
  const [activeMenu, setActiveMenu] = useState<'messenger' | 'tools' | 'help' | null>(null);
  const [selectedTreeUserId, setSelectedTreeUserId] = useState<string>('PEER-WIN7-LEGACY');
  const [addingGroup, setAddingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');

  // Modal states
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [showPublicChatModal, setShowPublicChatModal] = useState(false);
  const [showTransfersModal, setShowTransfersModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showCryptoInspectorModal, setShowCryptoInspectorModal] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [inspectingUser, setInspectingUser] = useState<User | null>(null);
  const [remoteDesktopPeer, setRemoteDesktopPeer] = useState<User | null>(null);

  // System Tray Balloon Notification
  const [trayBalloon, setTrayBalloon] = useState<{
    title: string;
    message: string;
    type: 'info' | 'warning';
  } | null>(null);

  const playSound = (soundName: 'newmessage' | 'useronline' | 'useroffline' | 'newfile' | 'filedone') => {
    if (!settings.enableSound) return;
    if (localUser.status === 'busy' && settings.noBusySound) return;
    if (localUser.status === 'dnd' && settings.noDNDSound) return;
    try {
      const audio = new Audio(`/resources/sounds/${soundName}.wav`);
      audio.volume = 0.45;
      audio.play().catch(() => {});
    } catch {
      // Ignore audio autoplay block
    }
  };

  const triggerTrayBalloon = (
    title: string,
    message: string,
    type: 'info' | 'warning' = 'info'
  ) => {
    if (!settings.showSysTray || !settings.showSysTrayMsg) return;
    setTrayBalloon({ title, message, type });
  };

  useEffect(() => {
    if (!trayBalloon) return;
    const t = setTimeout(() => setTrayBalloon(null), 4500);
    return () => clearTimeout(t);
  }, [trayBalloon]);

  // Initialize RSA/AES handshakes with all initial peers on mount
  useEffect(() => {
    const crypto = cryptoRef.current;
    crypto.generateRSA();
    const initialWire: WireFrameLog[] = [];
    const encoder = new TextEncoder();

    INITIAL_PEERS.forEach((p, idx) => {
      const envelope = crypto.generateAES(p.id, p.publicKeyPem);
      const sessInfo = crypto.getSessionInfo(p.id);
      if (sessInfo) {
        p.sessionKeyHex = sessInfo.keyHex;
        p.sessionIvHex = sessInfo.ivHex;
        p.envelopeBytes = sessInfo.envelopeSize;
      }

      initialWire.push({
        id: `init-pub-${p.id}`,
        timestamp: Date.now() - (20 - idx * 3) * 1000,
        direction: 'IN',
        transport: 'TCP',
        datagramType: DatagramType.DT_PublicKey,
        wireHeader: 'PUBKEY',
        protocolMode: 'Legacy v1.0',
        peerId: p.id,
        peerName: p.name,
        peerAddress: p.address,
        summary: `Received RSA-${p.rsaBits} Public Key (${
          p.opensslVersion.includes('1.0')
            ? 'PKCS#1 BEGIN RSA PUBLIC KEY'
            : 'Dual PKCS#1 + X.509 SPKI PEM'
        })`,
        rawPayloadPreview: `PUBKEY${p.publicKeyPem.split('\n').slice(0, 3).join('\n')}...`,
        encryptedBytes: p.publicKeyPem.length + 6,
        status: 'ok',
      });

      initialWire.push({
        id: `init-hnd-${p.id}`,
        timestamp: Date.now() - (18 - idx * 3) * 1000,
        direction: 'OUT',
        transport: 'TCP',
        datagramType: DatagramType.DT_Handshake,
        wireHeader: 'HNDSHK',
        protocolMode: 'Legacy v1.0',
        peerId: p.id,
        peerName: p.name,
        peerAddress: p.address,
        summary: `Sealed 48B AES-256 Key+IV in ${envelope.length}B RSA-PKCS1-OAEP (SHA-1) envelope`,
        rawPayloadPreview: `HNDSHK::OAEP_SHA1(${envelope.length}B) => ${bytesToHex(
          envelope.slice(0, 24)
        )}...`,
        encryptedBytes: envelope.length + 6,
        status: 'ok',
      });
    });

    // Seed initial conversations demonstrating OpenSSL 1.0 <-> 3.0 compatibility
    const win7MsgXml = buildXmlMessage(
      { from: 'PEER-WIN7-LEGACY', to: localUser.id, type: 'message', messageid: '1001' },
      {
        time: Date.now() - 60000,
        font: 'Tahoma,10',
        color: '#000000',
        message:
          'Connected from Windows 7 (OpenSSL 1.0.2u)! Your PKCS#1 "-----BEGIN RSA PUBLIC KEY-----" header parsed cleanly in PEM_read_bio_RSAPublicKey() without crashing :-)',
      }
    );
    const win7Cipher = crypto.encrypt('PEER-WIN7-LEGACY', encoder.encode(win7MsgXml));

    const u24MsgXml = buildXmlMessage(
      { from: 'PEER-UBUNTU24-MODERN', to: localUser.id, type: 'message', messageid: '1002' },
      {
        time: Date.now() - 45000,
        font: 'Tahoma,10',
        color: '#1e3a8a',
        message:
          'Hey Alex! OpenSSL 3.0.13 OSSL_DECODER & OAEP SHA-1/SHA-256 dual fallback passed all 11 ctest unit tests in tst_crypto.cpp (Y)',
      }
    );
    const u24Cipher = crypto.encrypt('PEER-UBUNTU24-MODERN', encoder.encode(u24MsgXml));

    const seedConvos: Record<string, ChatMessage[]> = {
      'PEER-WIN7-LEGACY': [
        {
          id: 'msg-seed-1',
          type: 'message',
          senderId: 'PEER-WIN7-LEGACY',
          senderName: 'Minho Park (Win7 Legacy)',
          recipientId: localUser.id,
          text: 'Connected from Windows 7 (OpenSSL 1.0.2u)! Your PKCS#1 "-----BEGIN RSA PUBLIC KEY-----" header parsed cleanly in PEM_read_bio_RSAPublicKey() without crashing :-)',
          timestamp: Date.now() - 60000,
          protocolMode: 'Legacy v1.0',
          wireHeader: 'MESSAG',
          xmlPayload: win7MsgXml,
          encryptedHex: bytesToHex(win7Cipher.slice(0, 32)),
        },
      ],
      'PEER-UBUNTU24-MODERN': [
        {
          id: 'msg-seed-2',
          type: 'message',
          senderId: 'PEER-UBUNTU24-MODERN',
          senderName: 'Marcus Chen (Ubuntu 24.04)',
          recipientId: localUser.id,
          text: 'Hey Alex! OpenSSL 3.0.13 OSSL_DECODER & OAEP SHA-1/SHA-256 dual fallback passed all 11 ctest unit tests in tst_crypto.cpp (Y)',
          timestamp: Date.now() - 45000,
          protocolMode: 'Legacy v1.0',
          wireHeader: 'MESSAG',
          xmlPayload: u24MsgXml,
          encryptedHex: bytesToHex(u24Cipher.slice(0, 32)),
        },
      ],
    };

    setConversations(seedConvos);
    setPublicMessages([
      {
        id: 'pub-1',
        type: 'message',
        senderId: 'PEER-UBUNTU24-MODERN',
        senderName: 'Marcus Chen (Ubuntu 24.04)',
        recipientId: 'PUBLIC',
        text: 'Welcome to the 239.255.100.100:50000 LAN Multicast Chat Room!',
        timestamp: Date.now() - 180000,
        protocolMode: 'Legacy v1.0',
        wireHeader: 'BRDCST',
        xmlPayload: '',
        encryptedHex: '',
      },
      {
        id: 'pub-2',
        type: 'message',
        senderId: 'PEER-WIN7-LEGACY',
        senderName: 'Minho Park (Win7 Legacy)',
        recipientId: 'PUBLIC',
        text: 'Legacy Windows 7 & Ubuntu 18.04 nodes are online and receiving multicast announces.',
        timestamp: Date.now() - 120000,
        protocolMode: 'Legacy v1.0',
        wireHeader: 'BRDCST',
        xmlPayload: '',
        encryptedHex: '',
      },
    ]);
    setHistory([
      {
        id: 'hist-1',
        peerId: 'PEER-WIN7-LEGACY',
        peerName: 'Minho Park (Win7 Legacy)',
        timestamp: Date.now() - 3600000,
        isGroup: false,
        messages: seedConvos['PEER-WIN7-LEGACY'],
      },
      {
        id: 'hist-2',
        peerId: 'PEER-UBUNTU24-MODERN',
        peerName: 'Marcus Chen (Ubuntu 24.04)',
        timestamp: Date.now() - 1800000,
        isGroup: false,
        messages: seedConvos['PEER-UBUNTU24-MODERN'],
      },
    ]);
    setWireLogs(initialWire.reverse());
  }, [localUser.id]);

  // Progress active file transfers
  useEffect(() => {
    const active = transfers.some((t) => t.status === 'transferring');
    if (!active) return;

    const timer = setInterval(() => {
      setTransfers((prev) =>
        prev.map((tr) => {
          if (tr.status !== 'transferring') return tr;
          const step = Math.max(65536, Math.round(tr.fileSize * 0.25));
          const nextBytes = Math.min(tr.fileSize, tr.transferredBytes + step);
          const isDone = nextBytes >= tr.fileSize;
          if (isDone) {
            playSound('filedone');
            triggerTrayBalloon(
              'File Transfer Complete',
              `${tr.fileName} (${tr.mode === 'send' ? 'sent to' : 'received from'} ${tr.peerName})`
            );
            // Update inline chat message status
            setConversations((conv) => {
              const peerMsgs = conv[tr.peerId] || [];
              return {
                ...conv,
                [tr.peerId]: peerMsgs.map((m) =>
                  m.fileTransferId === tr.id ? { ...m, fileOp: 'complete' } : m
                ),
              };
            });
          }
          return {
            ...tr,
            transferredBytes: nextBytes,
            status: isDone ? 'complete' : 'transferring',
          };
        })
      );
    }, 650);

    return () => clearInterval(timer);
  }, [transfers]);

  const handleToggleProtocolMode = (newMode: ProtocolHeaderMode) => {
    const isLegacy = newMode === 'Legacy v1.0';
    cryptoRef.current.setLegacyCompatibility(isLegacy);
    const updatedPub = cryptoRef.current.getPublicKeyForMode();
    setLocalUser((prev) => ({ ...prev, publicKeyPem: updatedPub }));
    setSettings((prev) => ({
      ...prev,
      protocolMode: newMode,
      legacyCompatibility: isLegacy,
    }));

    setWireLogs((prev) => [
      {
        id: `mode-${Date.now()}`,
        timestamp: Date.now(),
        direction: 'OUT',
        transport: 'TCP',
        datagramType: DatagramType.DT_PublicKey,
        wireHeader: isLegacy ? 'PUBKEY' : 'PUBKv3',
        protocolMode: newMode,
        peerId: 'ALL_PEERS',
        peerName: 'All Active Sessions',
        peerAddress: settings.multicastAddress,
        summary: isLegacy
          ? 'Switched to Legacy v1.0 (PKCS#1 BEGIN RSA PUBLIC KEY + SHA-1 OAEP + canonical 6-byte headers)'
          : 'Switched to Strict v3.0 (X.509 SPKI BEGIN PUBLIC KEY + SHA-256 OAEP + v3.0 6-byte headers)',
        rawPayloadPreview: `${isLegacy ? 'PUBKEY' : 'PUBKv3'}\n${
          updatedPub.split('\n').slice(0, 2).join('\n')
        }...`,
        encryptedBytes: updatedPub.length + 6,
        status: 'ok',
      },
      ...prev,
    ]);
  };

  const handleOpenChat = (peerId: string) => {
    if (!openChatPeerIds.includes(peerId)) {
      setOpenChatPeerIds((prev) => [...prev, peerId]);
    }
    setActiveChatPeerId(peerId);
  };

  const handleCloseChat = (peerId: string) => {
    // Save to history if enabled
    const msgs = conversations[peerId] || [];
    const peerObj = peers.find((p) => p.id === peerId);
    if (settings.saveHistory && msgs.length > 0 && peerObj) {
      setHistory((prev) => [
        {
          id: `hist-${peerId}-${Date.now()}`,
          peerId,
          peerName: peerObj.name,
          timestamp: Date.now(),
          isGroup: false,
          messages: msgs,
        },
        ...prev.filter((h) => h.peerId !== peerId),
      ]);
    }
    setOpenChatPeerIds((prev) => {
      const next = prev.filter((id) => id !== peerId);
      if (activeChatPeerId === peerId) {
        setActiveChatPeerId(next[0] || '');
      }
      return next;
    });
  };

  const handleSendMessage = (
    peerId: string,
    text: string,
    fontFamily: string,
    fontSize: number,
    fontColor: string,
    protocolMode: ProtocolHeaderMode
  ) => {
    const peer = peers.find((p) => p.id === peerId);
    if (!peer) return;

    if (!connected) {
      const errMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        type: 'error',
        senderId: localUser.id,
        senderName: localUser.name,
        recipientId: peerId,
        text: 'Message could not be sent because you are not connected.',
        timestamp: Date.now(),
        protocolMode,
        wireHeader: 'ERROR',
        xmlPayload: '',
        encryptedHex: '',
      };
      setConversations((prev) => ({
        ...prev,
        [peerId]: [...(prev[peerId] || []), errMsg],
      }));
      return;
    }

    const wireHeader = DatagramFraming.getWireHeader(DatagramType.DT_Message, protocolMode);
    const xml = buildXmlMessage(
      { from: localUser.id, to: peerId, type: 'message', messageid: Date.now() },
      {
        time: Date.now(),
        font: `${fontFamily},${fontSize}`,
        color: fontColor,
        message: text,
      }
    );

    const encoder = new TextEncoder();
    const cipherBytes = cryptoRef.current.encrypt(peerId, encoder.encode(xml));
    const cipherHex = bytesToHex(cipherBytes.slice(0, 32));

    const newMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      type: 'message',
      senderId: localUser.id,
      senderName: localUser.name,
      recipientId: peerId,
      text,
      timestamp: Date.now(),
      fontFamily,
      fontSize,
      fontColor,
      protocolMode,
      wireHeader,
      xmlPayload: xml,
      encryptedHex: cipherHex,
    };

    setConversations((prev) => ({
      ...prev,
      [peerId]: [...(prev[peerId] || []), newMsg],
    }));

    setWireLogs((prev) => [
      {
        id: `wire-out-${Date.now()}`,
        timestamp: Date.now(),
        direction: 'OUT',
        transport: 'TCP',
        datagramType: DatagramType.DT_Message,
        wireHeader,
        protocolMode,
        peerId: peer.id,
        peerName: peer.name,
        peerAddress: peer.address,
        summary: `Encrypted <lmcmessage type="message"> with AES-256-CBC (${cipherBytes.length}B)`,
        rawPayloadPreview: `${wireHeader}::AES256_CBC(${cipherHex}...)`,
        encryptedBytes: cipherBytes.length + 6,
        status: 'ok',
      },
      ...prev,
    ]);

    // Trigger simulated peer composing state and contextual reply
    setTimeout(() => {
      setPeerChatStates((prev) => ({ ...prev, [peerId]: 'composing' }));
    }, 600);

    setTimeout(() => {
      setPeerChatStates((prev) => ({ ...prev, [peerId]: 'active' }));
      simulatePeerReply(peer, text, protocolMode);
    }, 1800);
  };

  const simulatePeerReply = (peer: User, userPrompt: string, currentMode: ProtocolHeaderMode) => {
    const isLegacyPeer = peer.opensslVersion.includes('OpenSSL 1.0');
    const replyWireHeader = isLegacyPeer
      ? 'MESSAG'
      : DatagramFraming.getWireHeader(DatagramType.DT_Message, currentMode);

    let replyText = '';
    if (isLegacyPeer) {
      if (currentMode === 'Legacy v1.0') {
        replyText = `[OpenSSL 1.0.2u ACK] Decrypted your ${currentMode} frame ("${userPrompt.slice(
          0,
          36
        )}") using RSA-1024 OAEP-SHA1 + AES-256-CBC :-)`;
      } else {
        replyText = `[OpenSSL 1.0.2u Notice] Received Strict v3.0 frame; dual-PEM PKCS#1 fallback prevented NULL dereference!`;
      }
    } else {
      replyText = `[OpenSSL 3.0.13 ACK] Received "${userPrompt.slice(
        0,
        40
      )}" via ${replyWireHeader} (${currentMode}) (OK)`;
    }

    const xml = buildXmlMessage(
      { from: peer.id, to: localUser.id, type: 'message', messageid: Date.now() },
      { time: Date.now(), font: 'Tahoma,10', color: '#000000', message: replyText }
    );
    const cipherBytes = cryptoRef.current.encrypt(peer.id, new TextEncoder().encode(xml));

    const replyMsg: ChatMessage = {
      id: `reply-${Date.now()}`,
      type: 'message',
      senderId: peer.id,
      senderName: peer.name,
      recipientId: localUser.id,
      text: replyText,
      timestamp: Date.now(),
      protocolMode: isLegacyPeer ? 'Legacy v1.0' : currentMode,
      wireHeader: replyWireHeader,
      xmlPayload: xml,
      encryptedHex: bytesToHex(cipherBytes.slice(0, 32)),
    };

    setConversations((prev) => ({
      ...prev,
      [peer.id]: [...(prev[peer.id] || []), replyMsg],
    }));

    setWireLogs((prev) => [
      {
        id: `wire-in-${Date.now()}`,
        timestamp: Date.now(),
        direction: 'IN',
        transport: 'TCP',
        datagramType: DatagramType.DT_Message,
        wireHeader: replyWireHeader,
        protocolMode: isLegacyPeer ? 'Legacy v1.0' : currentMode,
        peerId: peer.id,
        peerName: peer.name,
        peerAddress: peer.address,
        summary: `Decrypted incoming ${replyWireHeader} packet from ${peer.name}`,
        rawPayloadPreview: `${replyWireHeader}::AES256_CBC(${bytesToHex(
          cipherBytes.slice(0, 24)
        )}...)`,
        encryptedBytes: cipherBytes.length + 6,
        status: 'ok',
      },
      ...prev,
    ]);

    playSound('newmessage');
  };

  const handleSendFile = (
    peerId: string,
    isFolder: boolean,
    customFileName?: string,
    customFileSize?: number
  ) => {
    const peer = peers.find((p) => p.id === peerId);
    if (!peer) return;

    const transferId = `tr-${Date.now()}`;
    const fileName =
      customFileName ||
      (isFolder ? 'openssl3_compat_patch_v1.2.10/' : 'openssl_legacy_handshake.pcap');
    const fileSize = customFileSize || (isFolder ? 1843200 : 425984);

    const newTransfer: FileTransferItem = {
      id: transferId,
      peerId: peer.id,
      peerName: peer.name,
      fileName,
      filePath: `${settings.fileStoragePath}/${fileName}`,
      fileSize,
      transferredBytes: 0,
      mode: 'send',
      isFolder,
      status: 'transferring',
      startTime: Date.now(),
      speedBps: 524288,
    };

    setTransfers((prev) => [newTransfer, ...prev]);

    const fileMsg: ChatMessage = {
      id: `fmsg-${Date.now()}`,
      type: isFolder ? 'folder' : 'file',
      senderId: localUser.id,
      senderName: localUser.name,
      recipientId: peer.id,
      text: `${isFolder ? 'Folder' : 'File'} transfer: ${fileName}`,
      timestamp: Date.now(),
      protocolMode: settings.protocolMode,
      wireHeader: settings.protocolMode === 'Legacy v1.0' ? 'MESSAG' : 'MSGv30',
      xmlPayload: '',
      encryptedHex: '',
      fileTransferId: transferId,
      fileName,
      fileSize,
      fileMode: 'send',
      fileOp: 'accept',
      isFolder,
    };

    setConversations((prev) => ({
      ...prev,
      [peer.id]: [...(prev[peer.id] || []), fileMsg],
    }));

    if (settings.autoShowTransferWindow) {
      setShowTransfersModal(true);
    }
  };

  const handleFileAction = (
    transferId: string,
    messageId: string,
    action: 'accept' | 'decline' | 'cancel'
  ) => {
    setTransfers((prev) =>
      prev.map((tr) => {
        if (tr.id !== transferId) return tr;
        if (action === 'accept') return { ...tr, status: 'transferring' };
        if (action === 'decline') return { ...tr, status: 'declined' };
        return { ...tr, status: 'cancelled' };
      })
    );

    setConversations((prev) => {
      const updated: Record<string, ChatMessage[]> = {};
      for (const [k, list] of Object.entries(prev)) {
        updated[k] = list.map((m) =>
          m.id === messageId || m.fileTransferId === transferId
            ? { ...m, fileOp: action }
            : m
        );
      }
      return updated;
    });
  };

  const handleSendBroadcast = (recipientIds: string[], text: string) => {
    const wireHeader = DatagramFraming.getWireHeader(
      DatagramType.DT_Broadcast,
      settings.protocolMode
    );

    recipientIds.forEach((peerId) => {
      const bMsg: ChatMessage = {
        id: `brd-${peerId}-${Date.now()}`,
        type: 'broadcast',
        senderId: localUser.id,
        senderName: localUser.name,
        recipientId: peerId,
        text,
        timestamp: Date.now(),
        protocolMode: settings.protocolMode,
        wireHeader,
        xmlPayload: '',
        encryptedHex: '',
      };
      setConversations((prev) => ({
        ...prev,
        [peerId]: [...(prev[peerId] || []), bMsg],
      }));
    });

    setWireLogs((prev) => [
      {
        id: `wire-brd-${Date.now()}`,
        timestamp: Date.now(),
        direction: 'OUT',
        transport: 'UDP',
        datagramType: DatagramType.DT_Broadcast,
        wireHeader,
        protocolMode: settings.protocolMode,
        peerId: 'BROADCAST',
        peerName: `${recipientIds.length} Selected Peers`,
        peerAddress: settings.multicastAddress,
        summary: `Sent UDP Broadcast (${wireHeader}): "${text}"`,
        rawPayloadPreview: `${wireHeader}<lmcmessage><head><type>broadcast</type></head><body><broadcast>${text}</broadcast></body></lmcmessage>`,
        encryptedBytes: text.length + 96,
        status: 'ok',
      },
      ...prev,
    ]);

    triggerTrayBalloon('Broadcast Sent', `Delivered to ${recipientIds.length} LAN peer(s).`);
  };

  const handleRefreshNetwork = () => {
    const wireHeader = DatagramFraming.getWireHeader(
      DatagramType.DT_Broadcast,
      settings.protocolMode
    );
    setWireLogs((prev) => [
      {
        id: `wire-ann-${Date.now()}`,
        timestamp: Date.now(),
        direction: 'OUT',
        transport: 'UDP',
        datagramType: DatagramType.DT_Broadcast,
        wireHeader,
        protocolMode: settings.protocolMode,
        peerId: 'MULTICAST',
        peerName: 'LAN Multicast Group',
        peerAddress: `${settings.multicastAddress}:${settings.udpPort}`,
        summary: `Multicast MT_Announce discovery probe sent to ${peers.length} online peers`,
        rawPayloadPreview: `${wireHeader}<lmcmessage><head><type>announce</type></head><body><userid>${localUser.id}</userid><address>${localUser.address}</address></body></lmcmessage>`,
        encryptedBytes: 148,
        status: 'ok',
      },
      ...prev,
    ]);
    triggerTrayBalloon(
      'LAN Discovery Refreshed',
      `Probed ${settings.multicastAddress}:${settings.udpPort} — ${peers.length} peers active.`
    );
  };

  const handleSimulateIncomingFileOffer = () => {
    const peer = peers.find((p) => p.id === activeChatPeerId) || peers[0];
    if (!peer) return;
    const transferId = `tr-in-${Date.now()}`;
    const fileName = 'crypto_interop_report.pdf';
    const fileSize = 819200;

    const newTr: FileTransferItem = {
      id: transferId,
      peerId: peer.id,
      peerName: peer.name,
      fileName,
      filePath: `${settings.fileStoragePath}/${fileName}`,
      fileSize,
      transferredBytes: 0,
      mode: 'receive',
      isFolder: false,
      status: settings.autoReceiveFile ? 'transferring' : 'request',
      startTime: Date.now(),
      speedBps: 450000,
    };

    setTransfers((prev) => [newTr, ...prev]);

    const msg: ChatMessage = {
      id: `fmsg-in-${Date.now()}`,
      type: 'file',
      senderId: peer.id,
      senderName: peer.name,
      recipientId: localUser.id,
      text: `${peer.name} sends file ${fileName}`,
      timestamp: Date.now(),
      protocolMode: settings.protocolMode,
      wireHeader: 'MESSAG',
      xmlPayload: '',
      encryptedHex: '',
      fileTransferId: transferId,
      fileName,
      fileSize,
      fileMode: 'receive',
      fileOp: settings.autoReceiveFile ? 'accept' : 'request',
      isFolder: false,
    };

    setConversations((prev) => ({
      ...prev,
      [peer.id]: [...(prev[peer.id] || []), msg],
    }));
    handleOpenChat(peer.id);
    playSound('newfile');
  };

  const currentLocalStatusMeta =
    STATUS_LIST.find((s) => s.code === localUser.status) || STATUS_LIST[0];

  const activePeer =
    peers.find((p) => p.id === activeChatPeerId) || peers[0];

  return (
    <div
      className="h-screen w-screen flex flex-col bg-[#3a6ea5] overflow-hidden select-none"
      onClick={() => {
        setActiveMenu(null);
        setShowStatusDropdown(false);
        setShowAvatarDropdown(false);
      }}
    >
      {/* Top Desktop Workspace Bar */}
      <div className="h-8 px-3 bg-slate-900 text-white border-b border-slate-700 flex items-center justify-between text-xs shrink-0">
        <div className="flex items-center gap-2.5">
          <img src="/resources/images/logo.png" alt="LMC" className="w-4 h-4" />
          <span className="font-bold tracking-tight">LAN Messenger v1.3.0</span>
          <span className="hidden md:inline-block text-slate-400">|</span>
          <span className="hidden md:inline-block text-[11px] text-slate-300">
            UDP Multicast <code className="text-emerald-400">{settings.multicastAddress}:{settings.udpPort}</code>
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick Protocol Compatibility Toggle in Top Bar */}
          <button
            type="button"
            onClick={() =>
              handleToggleProtocolMode(
                settings.protocolMode === 'Legacy v1.0' ? 'Strict v3.0' : 'Legacy v1.0'
              )
            }
            className={`px-2 py-0.5 rounded text-[11px] font-semibold border flex items-center gap-1.5 cursor-pointer ${
              settings.protocolMode === 'Legacy v1.0'
                ? 'bg-amber-500/20 border-amber-400 text-amber-200 hover:bg-amber-500/30'
                : 'bg-indigo-500/20 border-indigo-400 text-indigo-200 hover:bg-indigo-500/30'
            }`}
          >
            <span>Protocol Mode: {settings.protocolMode}</span>
            <span className="text-[10px] opacity-80">
              ({settings.protocolMode === 'Legacy v1.0' ? 'PKCS#1 / OpenSSL 1.0 Safe' : 'SPKI / OpenSSL 3.0'})
            </span>
          </button>

          <button
            type="button"
            onClick={() => setShowCryptoInspectorModal(true)}
            className="px-2.5 py-0.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-[11px] cursor-pointer flex items-center gap-1"
          >
            <span>🔍 OpenSSL 3.0 ↔ 1.0 Inspector & ctest (11/11)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              const next = !connected;
              setConnected(next);
              triggerTrayBalloon(
                'LAN Messenger',
                next ? 'You are online.' : 'You are no longer connected.',
                next ? 'info' : 'warning'
              );
            }}
            className={`px-2 py-0.5 rounded text-[11px] font-semibold cursor-pointer ${
              connected
                ? 'bg-emerald-900/60 text-emerald-300 border border-emerald-600'
                : 'bg-red-900/70 text-red-200 border border-red-500'
            }`}
          >
            {connected ? '● LAN Online' : '○ Disconnected'}
          </button>
        </div>
      </div>

      {/* Main Desktop Area: Left = lmcMainWindow, Right = Open lmcChatWindow(s) */}
      <div className="flex-1 flex gap-3 p-3 min-h-0 overflow-hidden">
        {/* ================= LEFT: lmcMainWindow ================= */}
        <div className="w-80 sm:w-88 flex flex-col bg-[#ece9d8] border-2 border-[#0054e3] rounded-t-md shadow-2xl overflow-hidden shrink-0">
          {/* Titlebar */}
          <div className="h-7 px-2.5 bg-gradient-to-r from-[#0054e3] via-[#2673f2] to-[#0046c7] text-white flex items-center justify-between select-none">
            <div className="flex items-center gap-1.5">
              <img src="/resources/images/logo.png" alt="" className="w-4 h-4" />
              <span className="font-bold text-xs">LAN Messenger</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleRefreshNetwork}
                title="Refresh contacts list (F5)"
                className="px-1.5 py-0.5 text-[10px] bg-white/15 hover:bg-white/25 rounded text-white cursor-pointer"
              >
                Refresh
              </button>
            </div>
          </div>

          {/* Main Menu Bar (Messenger | Tools | Help) */}
          <div className="relative px-1.5 py-0.5 bg-[#ece9d8] border-b border-[#aca899] flex items-center gap-1 text-xs">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setActiveMenu(activeMenu === 'messenger' ? null : 'messenger');
              }}
              className={`px-2 py-0.5 rounded-xs cursor-pointer ${
                activeMenu === 'messenger' ? 'bg-[#0054e3] text-white' : 'hover:bg-[#d6d2c2]'
              }`}
            >
              <u>M</u>essenger
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setActiveMenu(activeMenu === 'tools' ? null : 'tools');
              }}
              className={`px-2 py-0.5 rounded-xs cursor-pointer ${
                activeMenu === 'tools' ? 'bg-[#0054e3] text-white' : 'hover:bg-[#d6d2c2]'
              }`}
            >
              <u>T</u>ools
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setActiveMenu(activeMenu === 'help' ? null : 'help');
              }}
              className={`px-2 py-0.5 rounded-xs cursor-pointer ${
                activeMenu === 'help' ? 'bg-[#0054e3] text-white' : 'hover:bg-[#d6d2c2]'
              }`}
            >
              <u>H</u>elp
            </button>

            {/* Dropdown Menu: Messenger */}
            {activeMenu === 'messenger' && (
              <div className="absolute top-full left-1 z-40 w-48 bg-white border border-gray-400 shadow-lg py-1 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setShowPublicChatModal(true);
                    setActiveMenu(null);
                  }}
                  className="w-full px-3 py-1.5 text-left hover:bg-[#0054e3] hover:text-white flex items-center gap-2 cursor-pointer"
                >
                  <img src="/resources/images/chatroom.png" alt="" className="w-4 h-4" />
                  <span>Public Chat... (Ctrl+G)</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowBroadcastModal(true);
                    setActiveMenu(null);
                  }}
                  className="w-full px-3 py-1.5 text-left hover:bg-[#0054e3] hover:text-white flex items-center gap-2 cursor-pointer"
                >
                  <img src="/resources/images/broadcastmsg.png" alt="" className="w-4 h-4" />
                  <span>Send Broadcast... (Ctrl+B)</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAddingGroup(true);
                    setActiveMenu(null);
                  }}
                  className="w-full px-3 py-1.5 text-left hover:bg-[#0054e3] hover:text-white flex items-center gap-2 cursor-pointer"
                >
                  <img src="/resources/images/addcontact.png" alt="" className="w-4 h-4" />
                  <span>Add New Group...</span>
                </button>
                <div className="my-1 border-t border-gray-200" />
                <button
                  type="button"
                  onClick={() => {
                    handleRefreshNetwork();
                    setActiveMenu(null);
                  }}
                  className="w-full px-3 py-1.5 text-left hover:bg-[#0054e3] hover:text-white flex items-center gap-2 cursor-pointer"
                >
                  <img src="/resources/images/refresh.png" alt="" className="w-4 h-4" />
                  <span>Refresh Contacts (F5)</span>
                </button>
              </div>
            )}

            {/* Dropdown Menu: Tools */}
            {activeMenu === 'tools' && (
              <div className="absolute top-full left-16 z-40 w-56 bg-white border border-gray-400 shadow-lg py-1 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setShowHistoryModal(true);
                    setActiveMenu(null);
                  }}
                  className="w-full px-3 py-1.5 text-left hover:bg-[#0054e3] hover:text-white flex items-center gap-2 cursor-pointer"
                >
                  <img src="/resources/images/history.png" alt="" className="w-4 h-4" />
                  <span>History (Ctrl+H)</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowTransfersModal(true);
                    setActiveMenu(null);
                  }}
                  className="w-full px-3 py-1.5 text-left hover:bg-[#0054e3] hover:text-white flex items-center gap-2 cursor-pointer"
                >
                  <img src="/resources/images/transfer.png" alt="" className="w-4 h-4" />
                  <span>File Transfers (Ctrl+J)</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCryptoInspectorModal(true);
                    setActiveMenu(null);
                  }}
                  className="w-full px-3 py-1.5 text-left hover:bg-[#0054e3] hover:text-white flex items-center gap-2 cursor-pointer"
                >
                  <img src="/resources/images/networksettings.png" alt="" className="w-4 h-4" />
                  <span>OpenSSL 3.0 ↔ 1.0 Inspector</span>
                </button>
                <div className="my-1 border-t border-gray-200" />
                <button
                  type="button"
                  onClick={() => {
                    setShowSettingsModal(true);
                    setActiveMenu(null);
                  }}
                  className="w-full px-3 py-1.5 text-left hover:bg-[#0054e3] hover:text-white flex items-center gap-2 cursor-pointer"
                >
                  <img src="/resources/images/tools.png" alt="" className="w-4 h-4" />
                  <span>Preferences... (Ctrl+P)</span>
                </button>
              </div>
            )}

            {/* Dropdown Menu: Help */}
            {activeMenu === 'help' && (
              <div className="absolute top-full left-28 z-40 w-52 bg-white border border-gray-400 shadow-lg py-1 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setShowCryptoInspectorModal(true);
                    setActiveMenu(null);
                  }}
                  className="w-full px-3 py-1.5 text-left hover:bg-[#0054e3] hover:text-white flex items-center gap-2 cursor-pointer"
                >
                  <img src="/resources/images/question.png" alt="" className="w-4 h-4" />
                  <span>Help & Protocol Docs (F1)</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowUpdateModal(true);
                    setActiveMenu(null);
                  }}
                  className="w-full px-3 py-1.5 text-left hover:bg-[#0054e3] hover:text-white flex items-center gap-2 cursor-pointer"
                >
                  <img src="/resources/images/web.png" alt="" className="w-4 h-4" />
                  <span>Check for Updates...</span>
                </button>
                <div className="my-1 border-t border-gray-200" />
                <button
                  type="button"
                  onClick={() => {
                    setShowAboutModal(true);
                    setActiveMenu(null);
                  }}
                  className="w-full px-3 py-1.5 text-left hover:bg-[#0054e3] hover:text-white flex items-center gap-2 cursor-pointer"
                >
                  <img src="/resources/images/info.png" alt="" className="w-4 h-4" />
                  <span>About LAN Messenger</span>
                </button>
              </div>
            )}
          </div>

          {/* Local User Panel (btnStatus, lblUserName, lblStatus, btnAvatar, txtNote) */}
          <div className="relative p-2.5 bg-[#f5f4ee] border-b border-[#aca899]">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowStatusDropdown((v) => !v);
                      setShowAvatarDropdown(false);
                    }}
                    title="Change Presence Status"
                    className="p-0.5 rounded hover:bg-[#d6d2c2] border border-transparent hover:border-[#aca899] flex items-center gap-1 cursor-pointer"
                  >
                    <img
                      src={currentLocalStatusMeta.icon}
                      alt={currentLocalStatusMeta.label}
                      className="w-5 h-5"
                    />
                    <span className="text-[10px] text-gray-600">▾</span>
                  </button>
                  <span className="font-bold text-sm text-slate-900 truncate">
                    {localUser.name}
                  </span>
                </div>

                <div className="pl-7 text-[11px] text-gray-600">
                  {currentLocalStatusMeta.label} • {localUser.address}
                </div>

                {/* Personal Note Input (ui.txtNote) */}
                <div className="mt-2">
                  <input
                    type="text"
                    value={localUser.note}
                    onChange={(e) => setLocalUser({ ...localUser, note: e.target.value })}
                    placeholder="Type a personal note..."
                    className="w-full bg-white border border-[#7f9db9] px-2 py-1 text-xs rounded-xs focus:outline-none focus:border-[#0054e3]"
                  />
                </div>
              </div>

              {/* Avatar Picker Button (ui.btnAvatar) */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowAvatarDropdown((v) => !v);
                  setShowStatusDropdown(false);
                }}
                title="Change Avatar Picture"
                className="w-12 h-12 rounded border border-gray-400 bg-white p-0.5 hover:border-[#0054e3] cursor-pointer shrink-0"
              >
                <img
                  src={localUser.avatarPath}
                  alt="Avatar"
                  className="w-full h-full object-cover rounded-xs"
                />
              </button>
            </div>

            {/* Popup: Status Menu */}
            {showStatusDropdown && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="absolute top-10 left-2 z-40 w-44 bg-white border border-gray-400 shadow-lg py-1 text-xs"
              >
                {STATUS_LIST.map((st) => (
                  <button
                    key={st.code}
                    type="button"
                    onClick={() => {
                      setLocalUser({ ...localUser, status: st.code as StatusCode });
                      setShowStatusDropdown(false);
                    }}
                    className={`w-full px-3 py-1.5 text-left flex items-center gap-2 cursor-pointer ${
                      localUser.status === st.code
                        ? 'bg-blue-100 font-bold text-blue-900'
                        : 'hover:bg-[#0054e3] hover:text-white'
                    }`}
                  >
                    <img src={st.icon} alt="" className="w-4 h-4" />
                    <span>{st.label}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Popup: Avatar Picker (20 built-in LAN Messenger avatars) */}
            {showAvatarDropdown && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="absolute top-16 right-2 z-40 w-60 bg-white border border-gray-400 shadow-lg p-2 rounded"
              >
                <div className="text-[11px] font-semibold text-gray-700 mb-1.5">
                  Select Avatar
                </div>
                <div className="grid grid-cols-5 gap-1.5">
                  {AVATAR_LIST.map((avPath, idx) => (
                    <button
                      key={avPath}
                      type="button"
                      onClick={() => {
                        setLocalUser({ ...localUser, avatar: idx, avatarPath: avPath });
                        setShowAvatarDropdown(false);
                      }}
                      className={`p-0.5 border rounded cursor-pointer ${
                        localUser.avatarPath === avPath
                          ? 'border-[#0054e3] ring-2 ring-blue-400'
                          : 'border-gray-300 hover:border-blue-400'
                      }`}
                    >
                      <img src={avPath} alt={`Avatar ${idx}`} className="w-9 h-9 object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Highlight Divider (ui.lblDividerTop) */}
          <div className="h-0.5 bg-[#0054e3]" />

          {/* MainWindow Toolbar (ui.wgtToolBar: ChatRoom, Broadcast, History, Transfers, Settings, Refresh) */}
          <div className="px-2 py-1 bg-[#ece9d8] border-b border-[#aca899] flex items-center justify-between">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setShowPublicChatModal(true)}
                title="Public Chat Room (Ctrl+G)"
                className="p-1 rounded hover:bg-[#d6d2c2] border border-transparent hover:border-[#aca899] cursor-pointer"
              >
                <img src="/resources/images/chatroom.png" alt="Public Chat" className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setShowBroadcastModal(true)}
                title="Send Broadcast Message (Ctrl+B)"
                className="p-1 rounded hover:bg-[#d6d2c2] border border-transparent hover:border-[#aca899] cursor-pointer"
              >
                <img
                  src="/resources/images/broadcastmsg.png"
                  alt="Broadcast"
                  className="w-4 h-4"
                />
              </button>
              <button
                type="button"
                onClick={() => setShowHistoryModal(true)}
                title="View Message History (Ctrl+H)"
                className="p-1 rounded hover:bg-[#d6d2c2] border border-transparent hover:border-[#aca899] cursor-pointer"
              >
                <img src="/resources/images/history.png" alt="History" className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setShowTransfersModal(true)}
                title="View File Transfers (Ctrl+J)"
                className="p-1 rounded hover:bg-[#d6d2c2] border border-transparent hover:border-[#aca899] cursor-pointer"
              >
                <img src="/resources/images/transfer.png" alt="Transfers" className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setShowSettingsModal(true)}
                title="Preferences (Ctrl+P)"
                className="p-1 rounded hover:bg-[#d6d2c2] border border-transparent hover:border-[#aca899] cursor-pointer"
              >
                <img src="/resources/images/tools.png" alt="Preferences" className="w-4 h-4" />
              </button>
            </div>

            <button
              type="button"
              onClick={handleSimulateIncomingFileOffer}
              title="Simulate incoming file offer from peer"
              className="px-2 py-0.5 bg-white hover:bg-blue-50 border border-[#7f9db9] rounded-xs text-[10px] font-medium text-blue-900 cursor-pointer"
            >
              + Incoming File
            </button>
          </div>

          {/* Add New Group inline bar */}
          {addingGroup && (
            <div className="p-1.5 bg-blue-50 border-b border-blue-200 flex items-center gap-1">
              <input
                type="text"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="New group name..."
                className="flex-1 bg-white border border-[#7f9db9] px-1.5 py-0.5 text-xs"
              />
              <button
                type="button"
                onClick={() => {
                  if (newGroupName.trim()) {
                    setGroups((prev) => [
                      ...prev,
                      { id: `GRP-${Date.now()}`, name: newGroupName.trim(), expanded: true },
                    ]);
                    setNewGroupName('');
                  }
                  setAddingGroup(false);
                }}
                className="px-2 py-0.5 bg-[#0054e3] text-white text-xs rounded-xs cursor-pointer"
              >
                Add
              </button>
            </div>
          )}

          {/* Contact Tree List (ui.tvUserList - lmcUserTreeWidget) */}
          <div className="flex-1 bg-white overflow-y-auto p-1.5 space-y-1.5">
            {groups.map((grp) => {
              const grpPeers = peers.filter((p) => p.group === grp.id);
              return (
                <div key={grp.id} className="select-none">
                  {/* Group Header Item */}
                  <div
                    onClick={() =>
                      setGroups((prev) =>
                        prev.map((g) =>
                          g.id === grp.id ? { ...g, expanded: !g.expanded } : g
                        )
                      )
                    }
                    className="flex items-center justify-between px-1.5 py-1 bg-[#f0efe8] hover:bg-[#e5e3d8] border border-[#d4d0c8] rounded-xs cursor-pointer text-xs font-bold text-slate-800"
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-gray-600">
                        {grp.expanded ? '▾' : '▸'}
                      </span>
                      <span>{grp.name}</span>
                    </div>
                    <span className="text-[11px] font-normal text-gray-500">
                      ({grpPeers.length})
                    </span>
                  </div>

                  {/* Group Children */}
                  {grp.expanded && (
                    <div className="pl-2 pt-1 space-y-0.5">
                      {grpPeers.map((peer) => {
                        const st =
                          STATUS_LIST.find((s) => s.code === peer.status) || STATUS_LIST[0];
                        const isSelected = selectedTreeUserId === peer.id;
                        const isLegacy = peer.opensslVersion.includes('1.0');

                        return (
                          <div
                            key={peer.id}
                            onClick={() => {
                              setSelectedTreeUserId(peer.id);
                              handleOpenChat(peer.id);
                            }}
                            title={
                              settings.showStatusTooltip
                                ? `${peer.name} (${st.label}) — ${peer.address} — ${peer.opensslVersion}`
                                : undefined
                            }
                            className={`rounded-xs px-2 py-1.5 cursor-pointer flex items-center justify-between gap-2 transition-colors ${
                              isSelected
                                ? 'bg-[#316ac5] text-white'
                                : 'hover:bg-blue-50 text-slate-900'
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <img
                                src={st.icon}
                                alt={st.label}
                                className="w-4 h-4 shrink-0"
                              />
                              <div className="min-w-0">
                                <div className="text-xs font-semibold truncate flex items-center gap-1.5">
                                  <span className="truncate">{peer.name}</span>
                                </div>
                                {settings.userListView === 'Detailed' && (
                                  <div
                                    className={`text-[10px] truncate ${
                                      isSelected ? 'text-blue-100' : 'text-gray-500'
                                    }`}
                                  >
                                    {peer.note}
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <span
                                className={`text-[9px] font-mono px-1 py-0.5 rounded ${
                                  isSelected
                                    ? 'bg-white/20 text-white'
                                    : isLegacy
                                    ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                    : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                }`}
                              >
                                {isLegacy ? 'OSSL 1.0' : 'OSSL 3.0'}
                              </span>
                              {settings.userListView === 'Detailed' && (
                                <img
                                  src={peer.avatarPath}
                                  alt=""
                                  className="w-7 h-7 rounded-xs border border-gray-300 object-cover bg-white"
                                />
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Selected Contact Quick Action Bar (User Context Menu Actions) */}
          {selectedTreeUserId && (
            <div className="px-2 py-1.5 bg-[#f5f4ee] border-t border-[#aca899] flex items-center justify-between text-[11px]">
              <span className="font-semibold text-slate-700 truncate">
                {peers.find((p) => p.id === selectedTreeUserId)?.name}
              </span>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => handleOpenChat(selectedTreeUserId)}
                  className="px-1.5 py-0.5 bg-[#e1dfd2] hover:bg-[#d5d2c3] border border-[#7f9db9] rounded-xs cursor-pointer"
                >
                  Chat
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const u = peers.find((p) => p.id === selectedTreeUserId);
                    if (u) setRemoteDesktopPeer(u);
                  }}
                  className="px-1.5 py-0.5 bg-[#e1dfd2] hover:bg-[#d5d2c3] border border-[#7f9db9] rounded-xs cursor-pointer"
                >
                  Remote
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const u = peers.find((p) => p.id === selectedTreeUserId);
                    if (u) setInspectingUser(u);
                  }}
                  className="px-1.5 py-0.5 bg-[#e1dfd2] hover:bg-[#d5d2c3] border border-[#7f9db9] rounded-xs cursor-pointer"
                >
                  Info
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ================= RIGHT: Conversation Workspace & Wire Telemetry ================= */}
        <div className="flex-1 flex flex-col gap-2.5 min-w-0 overflow-hidden">
          {/* Open Chat Window Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 shrink-0">
            {openChatPeerIds.map((pid) => {
              const p = peers.find((x) => x.id === pid);
              if (!p) return null;
              const st = STATUS_LIST.find((s) => s.code === p.status) || STATUS_LIST[0];
              const isAct = activeChatPeerId === pid;
              return (
                <div
                  key={pid}
                  onClick={() => setActiveChatPeerId(pid)}
                  className={`px-2.5 py-1 rounded-t border-t border-x flex items-center gap-1.5 text-xs cursor-pointer shrink-0 ${
                    isAct
                      ? 'bg-[#0054e3] text-white border-[#0054e3] font-bold'
                      : 'bg-[#d4d0c8] text-slate-800 border-[#aca899] hover:bg-[#e1dfd2]'
                  }`}
                >
                  <img src={st.bubbleIcon} alt="" className="w-3.5 h-3.5" />
                  <span className="truncate max-w-[160px]">{p.name}</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCloseChat(pid);
                    }}
                    className="ml-1 opacity-75 hover:opacity-100 cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
              );
            })}
          </div>

          {/* Active lmcChatWindow */}
          {activePeer && openChatPeerIds.includes(activePeer.id) ? (
            <div className="flex-1 flex flex-col min-h-0">
              <ChatWindow
                localUser={localUser}
                peer={activePeer}
                messages={conversations[activePeer.id] || []}
                settings={settings}
                connected={connected}
                peerChatState={peerChatStates[activePeer.id] || 'active'}
                isActive={true}
                onFocus={() => {}}
                onClose={() => handleCloseChat(activePeer.id)}
                onSendMessage={handleSendMessage}
                onSendFile={handleSendFile}
                onFileAction={handleFileAction}
                onStartRemoteDesktop={(pid) => {
                  const target = peers.find((p) => p.id === pid);
                  if (target) setRemoteDesktopPeer(target);
                }}
                onOpenHistory={() => setShowHistoryModal(true)}
                onOpenTransfers={() => setShowTransfersModal(true)}
                onToggleProtocolMode={handleToggleProtocolMode}
                onSimulateIncomingMessage={(pid) => {
                  const target = peers.find((p) => p.id === pid);
                  if (target) {
                    simulatePeerReply(
                      target,
                      'Manual interop probe',
                      settings.protocolMode
                    );
                  }
                }}
              />
            </div>
          ) : (
            <div className="flex-1 bg-[#ece9d8] border-2 border-[#7a96df] rounded flex flex-col items-center justify-center p-6 text-center">
              <img src="/resources/images/logo.png" alt="" className="w-14 h-14 mb-2 opacity-80" />
              <div className="font-bold text-sm text-slate-800">
                No Active Conversation Window
              </div>
              <p className="text-xs text-gray-600 mt-1 max-w-md">
                Click any contact in the <b>LAN Messenger</b> contact list on the left to open an
                encrypted P2P chat window.
              </p>
            </div>
          )}

          {/* Compact Live Datagram & OpenSSL Compatibility Strip */}
          <div className="h-28 bg-slate-950 border border-slate-700 rounded p-2 flex flex-col shrink-0 text-[11px] font-mono text-slate-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-1 mb-1">
              <div className="flex items-center gap-2">
                <span className="text-emerald-400 font-bold">
                  ● Live Wire Datagram Stream (tcpnetwork.cpp / datagram.cpp)
                </span>
                <span className="text-slate-400 hidden sm:inline">
                  | Active Mode: <b className="text-amber-300">{settings.protocolMode}</b>
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowCryptoInspectorModal(true)}
                className="text-blue-400 hover:underline cursor-pointer"
              >
                Open Full Inspector & ctest Suite →
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-1">
              {wireLogs.slice(0, 6).map((w) => (
                <div key={w.id} className="flex items-center gap-2 truncate">
                  <span
                    className={`px-1 rounded text-[10px] font-bold ${
                      w.direction === 'OUT'
                        ? 'bg-blue-900 text-blue-200'
                        : 'bg-emerald-900 text-emerald-200'
                    }`}
                  >
                    {w.direction}
                  </span>
                  <span className="text-amber-300 font-bold">[{w.wireHeader}]</span>
                  <span className="text-slate-400">{w.peerAddress}</span>
                  <span className="text-slate-200 truncate">{w.summary}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* System Tray Balloon Notification Toast (QSystemTrayIcon::showMessage) */}
      {trayBalloon && (
        <div className="fixed bottom-4 right-4 z-50 w-72 bg-[#ffffe1] border border-gray-600 rounded shadow-xl p-2.5 text-xs text-slate-900 flex items-start gap-2">
          <img
            src={
              trayBalloon.type === 'warning'
                ? '/resources/images/critical.png'
                : '/resources/images/info.png'
            }
            alt=""
            className="w-4 h-4 mt-0.5 shrink-0"
          />
          <div className="flex-1 min-w-0">
            <div className="font-bold">{trayBalloon.title}</div>
            <div className="text-gray-700 mt-0.5">{trayBalloon.message}</div>
          </div>
          <button
            type="button"
            onClick={() => setTrayBalloon(null)}
            className="text-gray-500 hover:text-black cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* ================= SECONDARY WINDOWS / MODALS ================= */}
      {showBroadcastModal && (
        <BroadcastWindowModal
          users={peers}
          groups={groups}
          protocolMode={settings.protocolMode}
          onSendBroadcast={handleSendBroadcast}
          onClose={() => setShowBroadcastModal(false)}
        />
      )}

      {showPublicChatModal && (
        <ChatRoomWindowModal
          localUser={localUser}
          users={peers}
          messages={publicMessages}
          settings={settings}
          onSendPublicMessage={(txt) => {
            const msg: ChatMessage = {
              id: `pub-${Date.now()}`,
              type: 'message',
              senderId: localUser.id,
              senderName: localUser.name,
              recipientId: 'PUBLIC',
              text: txt,
              timestamp: Date.now(),
              protocolMode: settings.protocolMode,
              wireHeader: settings.protocolMode === 'Legacy v1.0' ? 'BRDCST' : 'BRDv30',
              xmlPayload: '',
              encryptedHex: '',
            };
            setPublicMessages((prev) => [...prev, msg]);
          }}
          onOpenUserInfo={(u) => setInspectingUser(u)}
          onClose={() => setShowPublicChatModal(false)}
        />
      )}

      {showTransfersModal && (
        <TransferWindowModal
          transfers={transfers}
          onAccept={(id) => handleFileAction(id, '', 'accept')}
          onDecline={(id) => handleFileAction(id, '', 'decline')}
          onCancel={(id) => handleFileAction(id, '', 'cancel')}
          onClearCompleted={() =>
            setTransfers((prev) => prev.filter((t) => t.status === 'transferring'))
          }
          onClose={() => setShowTransfersModal(false)}
        />
      )}

      {showHistoryModal && (
        <HistoryWindowModal
          history={history}
          localUser={localUser}
          settings={settings}
          onClearHistory={() => setHistory([])}
          onClose={() => setShowHistoryModal(false)}
        />
      )}

      {inspectingUser && (
        <UserInfoWindowModal
          user={inspectingUser}
          onClose={() => setInspectingUser(null)}
        />
      )}

      {remoteDesktopPeer && (
        <RemoteViewerWindowModal
          peer={remoteDesktopPeer}
          onClose={() => setRemoteDesktopPeer(null)}
        />
      )}

      {showCryptoInspectorModal && (
        <CryptoInspectorModal
          wireLogs={wireLogs}
          protocolMode={settings.protocolMode}
          onToggleProtocolMode={handleToggleProtocolMode}
          onClearLogs={() => setWireLogs([])}
          onClose={() => setShowCryptoInspectorModal(false)}
        />
      )}

      {showSettingsModal && (
        <SettingsDialogModal
          settings={settings}
          localUser={localUser}
          onSaveSettings={(next) => {
            setSettings(next);
            setLocalUser((prev) => ({
              ...prev,
              name: next.userName || prev.name,
              firstName: next.firstName,
              lastName: next.lastName,
              about: next.about,
            }));
            if (next.protocolMode !== settings.protocolMode) {
              handleToggleProtocolMode(next.protocolMode);
            }
          }}
          onResetSettings={() => {
            setSettings(DEFAULT_SETTINGS);
            handleToggleProtocolMode('Legacy v1.0');
          }}
          onClearHistory={() => setHistory([])}
          onClearTransfers={() => setTransfers([])}
          onClose={() => setShowSettingsModal(false)}
        />
      )}

      {showUpdateModal && (
        <UpdateWindowModal onClose={() => setShowUpdateModal(false)} />
      )}

      {showAboutModal && (
        <AboutDialogModal onClose={() => setShowAboutModal(false)} />
      )}
    </div>
  );
}
export default App;
