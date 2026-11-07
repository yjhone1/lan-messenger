import { APP_UI_THEMES, AppUiTheme, AppUiThemeConfig, StatusCode } from '../types/lmc';

export type SupportedLanguage = 'en_US' | 'ko_KR';

export interface I18nLabels {
  langCode: SupportedLanguage;
  langDisplayName: string;
  // Top workspace bar
  topBar: {
    udpMulticast: string;
    protocolMode: string;
    inspectorBtn: string;
    lanOnline: string;
    lanDisconnected: string;
    langSwitchTooltip: string;
  };
  // Main window
  mainWindow: {
    title: string;
    refreshBtn: string;
    refreshTooltip: string;
    menuMessenger: string;
    menuTools: string;
    menuHelp: string;
    // Messenger menu items
    publicChat: string;
    sendBroadcast: string;
    addNewGroup: string;
    refreshContacts: string;
    // Tools menu items
    history: string;
    fileTransfers: string;
    cryptoInspector: string;
    kalmuriCapture: string;
    kalmuriCaptureTooltip: string;
    preferences: string;
    // Help menu items
    helpDocs: string;
    checkUpdates: string;
    aboutLmc: string;
    // Local user panel
    changeStatusTooltip: string;
    changeAvatarTooltip: string;
    selectAvatar: string;
    personalNotePlaceholder: string;
    // Toolbar & quick actions
    publicChatTooltip: string;
    broadcastTooltip: string;
    historyTooltip: string;
    transfersTooltip: string;
    preferencesTooltip: string;
    simulateIncomingFile: string;
    simulateIncomingFileTooltip: string;
    newGroupPlaceholder: string;
    addGroupBtn: string;
    actionChat: string;
    actionRemote: string;
    actionInfo: string;
    noActiveConversationTitle: string;
    noActiveConversationDesc: string;
    liveWireStreamTitle: string;
    activeModeLabel: string;
    openFullInspectorLink: string;
  };
  // Status labels
  status: Record<StatusCode, string>;
  // Default group names
  groups: Record<string, string>;
  // Chat window
  chatWindow: {
    conversationSuffix: string;
    simulateReply: string;
    simulateReplyTooltip: string;
    closeTooltip: string;
    encryptedSessionActive: string;
    activeWireFraming: string;
    broadcastFrom: string;
    sendingFolderTo: string;
    sendingFileTo: string;
    offeringFolder: string;
    offeringFile: string;
    accept: string;
    decline: string;
    cancel: string;
    transferringStream: string;
    transferCompleted: string;
    transferDeclined: string;
    transferCancelled: string;
    says: string;
    isTyping: string;
    hasEnteredText: string;
    notConnectedWarning: string;
    isOfflineWarning: string;
    isAwayWarning: string;
    isBusyWarning: string;
    strictMismatchWarning: string;
    useLegacyBtn: string;
    changeFontTooltip: string;
    changeColorTooltip: string;
    insertSmileyTooltip: string;
    sendFileTooltip: string;
    sendFolderTooltip: string;
    remoteDesktopTooltip: string;
    captureScreenTooltip: string;
    saveConversationTooltip: string;
    viewTransfersTooltip: string;
    viewHistoryTooltip: string;
    insertEmoticonTitle: string;
    selectFontTitle: string;
    selectColorTitle: string;
    placeholderCtrlEnter: string;
    placeholderEnter: string;
    sendBtn: string;
    sendFailedDisconnected: string;
  };
  // Preferences Dialog (SettingsDialogModal)
  preferences: {
    windowTitle: string;
    quickToggleLabel: string;
    categories: {
      general: string;
      account: string;
      messages: string;
      history: string;
      alerts: string;
      network: string;
      fileTransfer: string;
      theme: string;
      hotkeys: string;
    };
    general: {
      systemLegend: string;
      autoStart: string;
      autoShow: string;
      sysTrayLegend: string;
      showSysTray: string;
      minimizeToTray: string;
      showSysTrayMsg: string;
      languageLegend: string;
      languageSelectLabel: string;
      languageHint: string;
    };
    account: {
      personalDetailsLegend: string;
      userNameLabel: string;
      firstNameLabel: string;
      lastNameLabel: string;
      aboutLabel: string;
    };
    messages: {
      messageWindowLegend: string;
      showEmoticons: string;
      showMessageTime: string;
      showMessageDate: string;
      allowLinks: string;
      trimMessage: string;
      showSendButton: string;
      fontSizeLegend: string;
      messageTextSizeLabel: string;
      sizeSmall: string;
      sizeMedium: string;
      sizeLarge: string;
    };
    history: {
      messageHistoryLegend: string;
      saveHistory: string;
      saveFileHistory: string;
      clearMessageHistoryBtn: string;
      clearFileHistoryBtn: string;
    };
    alerts: {
      notificationsLegend: string;
      showAlerts: string;
      noBusyAlert: string;
      enableSound: string;
    };
    network: {
      protocolCompatLegend: string;
      wireHeaderModeLabel: string;
      multicastPortsLegend: string;
      multicastGroupIpLabel: string;
      udpPortLabel: string;
      tcpPortLabel: string;
      broadcastListLabel: string;
      addBtn: string;
    };
    fileTransfer: {
      fileReceptionLegend: string;
      autoReceiveFile: string;
      autoShowTransferWindow: string;
      receivedFilesFolderLabel: string;
    };
    theme: {
      appThemeLegend: string;
      appThemeLabel: string;
      appThemeHint: string;
      appThemeClassic: string;
      appThemeDark: string;
      appThemeHighContrast: string;
      chatThemeLabel: string;
      contactListViewLabel: string;
      detailedViewOption: string;
      compactViewOption: string;
      themePreviewTitle: string;
    };
    hotkeys: {
      sendMessageKeyLegend: string;
      enterSendsRadio: string;
      ctrlEnterSendsRadio: string;
    };
    buttons: {
      resetPreferences: string;
      ok: string;
      cancel: string;
    };
  };
  // Secondary modals
  modals: {
    broadcast: {
      title: string;
      messageLabel: string;
      placeholder: string;
      selectRecipientsLabel: string;
      selectAll: string;
      selectNone: string;
      send: string;
      cancel: string;
    };
    publicChat: {
      title: string;
      participantsLabel: string;
      youSuffix: string;
      inputPlaceholder: string;
      send: string;
    };
    transfers: {
      title: string;
      headerCount: string;
      clearList: string;
      emptyText: string;
      toPrefix: string;
      fromPrefix: string;
      close: string;
    };
    history: {
      title: string;
      searchPlaceholder: string;
      clearHistory: string;
      emptyText: string;
      selectPrompt: string;
      close: string;
    };
    userInfo: {
      titleSuffix: string;
      tabGeneral: string;
      tabSystem: string;
      hardwareSectionTitle: string;
      firstName: string;
      lastName: string;
      about: string;
      ipAddress: string;
      macAddress: string;
      hostName: string;
      logonName: string;
      os: string;
      osDetail: string;
      cpu: string;
      memory: string;
      gpu: string;
      version: string;
      cryptoStack: string;
      rsaKeySize: string;
      publicKeyPem: string;
      ok: string;
    };
    remoteDesktop: {
      titlePrefix: string;
      enableControl: string;
      fitToWindow: string;
      connectedStatus: string;
      disconnect: string;
    };
    about: {
      title: string;
      tabAbout: string;
      tabThanks: string;
      tabLicense: string;
      close: string;
    };
    update: {
      title: string;
      checking: string;
      error: string;
      newAvailable: string;
      upToDate: string;
      recheck: string;
      close: string;
    };
  };
}

export const EN_US_LABELS: I18nLabels = {
  langCode: 'en_US',
  langDisplayName: 'English (en_US)',
  topBar: {
    udpMulticast: 'UDP Multicast',
    protocolMode: 'Protocol Mode',
    inspectorBtn: '🔍 OpenSSL 3.0 ↔ 1.0 Inspector & ctest (11/11)',
    lanOnline: '● LAN Online',
    lanDisconnected: '○ Disconnected',
    langSwitchTooltip: 'Switch UI language between English (en_US) and Korean (ko_KR)',
  },
  mainWindow: {
    title: 'LAN Messenger',
    refreshBtn: 'Refresh',
    refreshTooltip: 'Refresh contacts list (F5)',
    menuMessenger: 'Messenger',
    menuTools: 'Tools',
    menuHelp: 'Help',
    publicChat: 'Public Chat... (Ctrl+G)',
    sendBroadcast: 'Send Broadcast... (Ctrl+B)',
    addNewGroup: 'Add New Group...',
    refreshContacts: 'Refresh Contacts (F5)',
    history: 'History (Ctrl+H)',
    fileTransfers: 'File Transfers (Ctrl+J)',
    cryptoInspector: 'OpenSSL 3.0 ↔ 1.0 Inspector',
    kalmuriCapture: 'Screen Capture (OpenSourceCapture)... [PrintScreen / F11]',
    kalmuriCaptureTooltip: 'Open OpenSourceCapture Screen Capture & Recording Tool (PrintScreen / F11 - No conflict with LAN Messenger shortcuts)',
    preferences: 'Preferences... (Ctrl+P)',
    helpDocs: 'Help & Protocol Docs (F1)',
    checkUpdates: 'Check for Updates...',
    aboutLmc: 'About LAN Messenger',
    changeStatusTooltip: 'Change Presence Status',
    changeAvatarTooltip: 'Change Avatar Picture',
    selectAvatar: 'Select Avatar',
    personalNotePlaceholder: 'Type a personal note...',
    publicChatTooltip: 'Public Chat Room (Ctrl+G)',
    broadcastTooltip: 'Send Broadcast Message (Ctrl+B)',
    historyTooltip: 'View Message History (Ctrl+H)',
    transfersTooltip: 'View File Transfers (Ctrl+J)',
    preferencesTooltip: 'Preferences (Ctrl+P)',
    simulateIncomingFile: '+ Incoming File',
    simulateIncomingFileTooltip: 'Simulate incoming file offer from peer',
    newGroupPlaceholder: 'New group name...',
    addGroupBtn: 'Add',
    actionChat: 'Chat',
    actionRemote: 'Remote',
    actionInfo: 'Info',
    noActiveConversationTitle: 'No Active Conversation Window',
    noActiveConversationDesc:
      'Click any contact in the LAN Messenger contact list on the left to open an encrypted P2P chat window.',
    liveWireStreamTitle: '● Live Wire Datagram Stream (tcpnetwork.cpp / datagram.cpp)',
    activeModeLabel: 'Active Mode',
    openFullInspectorLink: 'Open Full Inspector & ctest Suite →',
  },
  status: {
    chat: 'Available',
    busy: 'Busy',
    dnd: 'Do Not Disturb',
    brb: 'Be Right Back',
    away: 'Away',
    gone: 'Appear Offline',
  },
  groups: {
    '3BD95C30048C4E65F6082539A32DC333': 'General',
    '2AD85B20048C4E65F6082539A32DC222': 'Engineering & Crypto QA',
    '1CD75C10048C4E65F6082539A32DC111': 'Design & Frontend',
  },
  chatWindow: {
    conversationSuffix: 'Conversation',
    simulateReply: 'Simulate Reply',
    simulateReplyTooltip: 'Simulate incoming encrypted reply from this peer',
    closeTooltip: 'Close (Esc)',
    encryptedSessionActive: 'Encrypted P2P session active',
    activeWireFraming: 'Active Wire Framing',
    broadcastFrom: 'Broadcast from',
    sendingFolderTo: 'Sending folder to',
    sendingFileTo: 'Sending file to',
    offeringFolder: 'is offering a folder:',
    offeringFile: 'is offering a file:',
    accept: 'Accept',
    decline: 'Decline',
    cancel: 'Cancel',
    transferringStream: 'Transferring file over TCP stream...',
    transferCompleted: '✓ File transfer completed successfully.',
    transferDeclined: 'File transfer declined.',
    transferCancelled: 'File transfer cancelled.',
    says: 'says:',
    isTyping: 'is typing a message...',
    hasEnteredText: 'has entered text.',
    notConnectedWarning: 'You are no longer connected.',
    isOfflineWarning: 'is offline.',
    isAwayWarning: 'is away.',
    isBusyWarning: 'is busy. You may be interrupting.',
    strictMismatchWarning:
      '⚠️ Peer runs OpenSSL 1.0.2u (PEM_read_bio_RSAPublicKey). Strict v3.0 sends SPKI first; dual-PEM fallback keeps peer alive, or switch to Legacy v1.0.',
    useLegacyBtn: 'Use Legacy v1.0',
    changeFontTooltip: 'Change message font',
    changeColorTooltip: 'Change message text color',
    insertSmileyTooltip: 'Insert Smiley',
    sendFileTooltip: 'Send a file to',
    sendFolderTooltip: 'Send a folder to',
    remoteDesktopTooltip: 'Remote Desktop',
    captureScreenTooltip: 'Screen Capture & Send to Chat (OpenSourceCapture - PrintScreen / F11)',
    saveConversationTooltip: 'Save this conversation (Ctrl+S)',
    viewTransfersTooltip: 'View File Transfers (Ctrl+J)',
    viewHistoryTooltip: 'View History (Ctrl+H)',
    insertEmoticonTitle: 'Insert Emoticon',
    selectFontTitle: 'Select Font',
    selectColorTitle: 'Select Text Color',
    placeholderCtrlEnter: 'Type a message... (Press Ctrl+Enter to send)',
    placeholderEnter: 'Type a message... (Press Enter to send)',
    sendBtn: 'Send',
    sendFailedDisconnected: 'Message could not be sent because you are not connected.',
  },
  preferences: {
    windowTitle: 'Preferences - LAN Messenger',
    quickToggleLabel: 'UI Language',
    categories: {
      general: 'General',
      account: 'Account',
      messages: 'Messages',
      history: 'History',
      alerts: 'Alerts',
      network: 'Network',
      fileTransfer: 'File Transfer',
      theme: 'Theme',
      hotkeys: 'Hotkeys',
    },
    general: {
      systemLegend: 'System',
      autoStart: 'Start LAN Messenger when computer starts',
      autoShow: 'Show main window when LAN Messenger starts',
      sysTrayLegend: 'System Tray',
      showSysTray: 'Show system tray icon',
      minimizeToTray: 'Minimize main window to system tray',
      showSysTrayMsg: 'Display balloon notifications in system tray',
      languageLegend: 'Language',
      languageSelectLabel: 'Select Interface Language:',
      languageHint: 'Toggle between English (en_US) and Korean (ko_KR) for UI labels.',
    },
    account: {
      personalDetailsLegend: 'Personal Details',
      userNameLabel: 'User Name (Display Name):',
      firstNameLabel: 'First Name:',
      lastNameLabel: 'Last Name:',
      aboutLabel: 'About:',
    },
    messages: {
      messageWindowLegend: 'Message Window',
      showEmoticons: 'Show emoticons (smileys) in messages',
      showMessageTime: 'Show timestamp on messages',
      showMessageDate: 'Show date with timestamp',
      allowLinks: 'Enable hyperlinks in messages',
      trimMessage: 'Remove leading and trailing spaces from messages',
      showSendButton: 'Show Send button in chat window',
      fontSizeLegend: 'Font & Size',
      messageTextSizeLabel: 'Message Text Size:',
      sizeSmall: 'Small',
      sizeMedium: 'Medium',
      sizeLarge: 'Large',
    },
    history: {
      messageHistoryLegend: 'Message History',
      saveHistory: 'Save conversation history when chat window closes',
      saveFileHistory: 'Save file transfer history',
      clearMessageHistoryBtn: 'Clear Message History',
      clearFileHistoryBtn: 'Clear File History',
    },
    alerts: {
      notificationsLegend: 'Notifications & Sounds',
      showAlerts: 'Show status popup alerts',
      noBusyAlert: 'Do not show alerts when I am Busy',
      enableSound: 'Play sound effects on events',
    },
    network: {
      protocolCompatLegend: 'OpenSSL 3.0 ↔ 1.0 Protocol Compatibility',
      wireHeaderModeLabel: 'Wire Header & RSA Key Encoding Mode:',
      multicastPortsLegend: 'Multicast & Ports',
      multicastGroupIpLabel: 'Multicast Group IP:',
      udpPortLabel: 'UDP Port:',
      tcpPortLabel: 'TCP Port:',
      broadcastListLabel: 'Broadcast Address List:',
      addBtn: 'Add',
    },
    fileTransfer: {
      fileReceptionLegend: 'File Reception',
      autoReceiveFile: 'Automatically accept incoming files',
      autoShowTransferWindow: 'Show File Transfers window automatically when transfer starts',
      receivedFilesFolderLabel: 'Received Files Folder:',
    },
    theme: {
      appThemeLegend: 'Application Window Theme',
      appThemeLabel: 'Window & Border Theme:',
      appThemeHint: 'Changes the background color and border style across the entire app in real time.',
      appThemeClassic: '클래식 윈도우 (Classic Windows)',
      appThemeDark: '다크 모드 (Dark Mode)',
      appThemeHighContrast: '고대비 (High Contrast)',
      chatThemeLabel: 'Chat Theme:',
      contactListViewLabel: 'Contact List View:',
      detailedViewOption: 'Detailed View (36px with Avatars & Notes)',
      compactViewOption: 'Compact View (20px)',
      themePreviewTitle: 'Theme Preview',
    },
    hotkeys: {
      sendMessageKeyLegend: 'Send Message Key',
      enterSendsRadio: 'Press Enter to send message (Ctrl+Enter inserts new line)',
      ctrlEnterSendsRadio: 'Press Ctrl+Enter to send message (Enter inserts new line)',
    },
    buttons: {
      resetPreferences: 'Reset Preferences',
      ok: 'OK',
      cancel: 'Cancel',
    },
  },
  modals: {
    broadcast: {
      title: 'Send Broadcast Message',
      messageLabel: 'Broadcast Message',
      placeholder: 'Enter broadcast announcement for selected LAN peers...',
      selectRecipientsLabel: 'Select Recipients',
      selectAll: 'Select All',
      selectNone: 'Select None',
      send: 'Send',
      cancel: 'Cancel',
    },
    publicChat: {
      title: 'Public Chat - LAN Multicast Room (239.255.100.100)',
      participantsLabel: 'Participants',
      youSuffix: '(You)',
      inputPlaceholder: 'Send message to Public Chat Room...',
      send: 'Send',
    },
    transfers: {
      title: 'File Transfers',
      headerCount: 'Active & Completed Transfers',
      clearList: 'Clear List',
      emptyText: 'No file transfers recorded.',
      toPrefix: 'To',
      fromPrefix: 'From',
      close: 'Close',
    },
    history: {
      title: 'Message History',
      searchPlaceholder: 'Filter conversations by user or keyword...',
      clearHistory: 'Clear History',
      emptyText: 'No saved history',
      selectPrompt: 'Select a conversation on the left to inspect its message log.',
      close: 'Close',
    },
    userInfo: {
      titleSuffix: 'User Information',
      tabGeneral: 'General & Personal',
      tabSystem: 'System, Hardware & OpenSSL',
      hardwareSectionTitle: 'System & Hardware Specifications',
      firstName: 'First Name:',
      lastName: 'Last Name:',
      about: 'About:',
      ipAddress: 'IP Address:',
      macAddress: 'MAC Address (맥주소):',
      hostName: 'Host Name:',
      logonName: 'Logon Name:',
      os: 'Operating System:',
      osDetail: 'Windows / OS Version Detail:',
      cpu: 'CPU (Processor):',
      memory: 'Memory (RAM):',
      gpu: 'Graphics Card (GPU):',
      version: 'LMC Version:',
      cryptoStack: 'Crypto Stack:',
      rsaKeySize: 'RSA Key Size:',
      publicKeyPem: 'Peer Public Key PEM:',
      ok: 'OK',
    },
    remoteDesktop: {
      titlePrefix: 'Remote Desktop',
      enableControl: 'Enable Control',
      fitToWindow: 'Fit to Window',
      connectedStatus: 'Connected',
      disconnect: 'Disconnect',
    },
    about: {
      title: 'About LAN Messenger',
      tabAbout: 'About',
      tabThanks: 'Thanks',
      tabLicense: 'License',
      close: 'Close',
    },
    update: {
      title: 'LAN Messenger Updates',
      checking: 'Launching an update request...',
      error: 'An error occurred while checking for updates.',
      newAvailable: 'A new version is available on LAN Messenger GitHub Releases.',
      upToDate: 'You have the latest version of LAN Messenger.',
      recheck: 'Recheck',
      close: 'Close',
    },
  },
};

export const KO_KR_LABELS: I18nLabels = {
  langCode: 'ko_KR',
  langDisplayName: '한국어 (ko_KR)',
  topBar: {
    udpMulticast: 'UDP 멀티캐스트',
    protocolMode: '프로토콜 모드',
    inspectorBtn: '🔍 OpenSSL 3.0 ↔ 1.0 인스펙터 & ctest (11/11)',
    lanOnline: '● LAN 온라인',
    lanDisconnected: '○ 연결 끊김',
    langSwitchTooltip: 'UI 언어를 영어(en_US)와 한국어(ko_KR) 간에 전환합니다',
  },
  mainWindow: {
    title: 'LAN 메신저',
    refreshBtn: '새로고침',
    refreshTooltip: '대화상대 목록 새로고침 (F5)',
    menuMessenger: '메신저(M)',
    menuTools: '도구(T)',
    menuHelp: '도움말(H)',
    publicChat: '공개 채팅방... (Ctrl+G)',
    sendBroadcast: '전체 쪽지 보내기... (Ctrl+B)',
    addNewGroup: '새 그룹 추가...',
    refreshContacts: '대화상대 새로고침 (F5)',
    history: '대화 기록 (Ctrl+H)',
    fileTransfers: '파일 전송 목록 (Ctrl+J)',
    cryptoInspector: 'OpenSSL 3.0 ↔ 1.0 인스펙터',
    kalmuriCapture: '화면 캡쳐 (오픈소스캡쳐)... [PrintScreen / F11]',
    kalmuriCaptureTooltip: '오픈소스캡쳐 화면 캡처 및 화면 녹화 도구 (PrintScreen / F11 - 랜메신저 단축키와 분리됨)',
    preferences: '환경설정... (Ctrl+P)',
    helpDocs: '도움말 및 프로토콜 문서 (F1)',
    checkUpdates: '업데이트 확인...',
    aboutLmc: 'LAN 메신저 정보',
    changeStatusTooltip: '내 상태 변경',
    changeAvatarTooltip: '아바타 이미지 변경',
    selectAvatar: '아바타 선택',
    personalNotePlaceholder: '상태 메시지를 입력하세요...',
    publicChatTooltip: '공개 채팅방 열기 (Ctrl+G)',
    broadcastTooltip: '전체 쪽지(브로드캐스트) 보내기 (Ctrl+B)',
    historyTooltip: '대화 기록 보기 (Ctrl+H)',
    transfersTooltip: '파일 전송 목록 보기 (Ctrl+J)',
    preferencesTooltip: '환경설정 열기 (Ctrl+P)',
    simulateIncomingFile: '+ 파일 수신 테스트',
    simulateIncomingFileTooltip: '상대방으로부터 파일 수신 요청 시뮬레이션',
    newGroupPlaceholder: '새 그룹 이름 입력...',
    addGroupBtn: '추가',
    actionChat: '대화',
    actionRemote: '원격제어',
    actionInfo: '정보',
    noActiveConversationTitle: '열려 있는 대화창이 없습니다',
    noActiveConversationDesc:
      '왼쪽 LAN 메신저 대화상대 목록에서 사용자를 클릭하면 암호화된 P2P 대화창이 열립니다.',
    liveWireStreamTitle: '● 실시간 데이터그램 스트림 (tcpnetwork.cpp / datagram.cpp)',
    activeModeLabel: '현재 모드',
    openFullInspectorLink: '전체 인스펙터 및 ctest 실행기 열기 →',
  },
  status: {
    chat: '대화 가능',
    busy: '다른 용무 중',
    dnd: '방해 금지',
    brb: '곧 돌아옴',
    away: '자리 비움',
    gone: '오프라인 표시',
  },
  groups: {
    '3BD95C30048C4E65F6082539A32DC333': '일반 (General)',
    '2AD85B20048C4E65F6082539A32DC222': '엔지니어링 & 보안 QA',
    '1CD75C10048C4E65F6082539A32DC111': '디자인 & 프론트엔드',
  },
  chatWindow: {
    conversationSuffix: '대화',
    simulateReply: '답장 시뮬레이션',
    simulateReplyTooltip: '이 상대방의 암호화된 답장 수신을 시뮬레이션합니다',
    closeTooltip: '닫기 (Esc)',
    encryptedSessionActive: '암호화된 P2P 세션 활성화됨',
    activeWireFraming: '활성 프레임 모드',
    broadcastFrom: '전체 공지 발신자:',
    sendingFolderTo: '폴더 전송 중 →',
    sendingFileTo: '파일 전송 중 →',
    offeringFolder: '님이 폴더를 보냈습니다:',
    offeringFile: '님이 파일을 보냈습니다:',
    accept: '수락',
    decline: '거절',
    cancel: '취소',
    transferringStream: 'TCP 스트림으로 파일 전송 중...',
    transferCompleted: '✓ 파일 전송이 완료되었습니다.',
    transferDeclined: '파일 전송이 거절되었습니다.',
    transferCancelled: '파일 전송이 취소되었습니다.',
    says: '님의 말:',
    isTyping: '님이 메시지를 입력하고 있습니다...',
    hasEnteredText: '님이 텍스트를 입력했습니다.',
    notConnectedWarning: '현재 네트워크에 연결되어 있지 않습니다.',
    isOfflineWarning: '님은 현재 오프라인입니다.',
    isAwayWarning: '님은 현재 자리 비움 상태입니다.',
    isBusyWarning: '님은 다른 용무 중입니다.',
    strictMismatchWarning:
      '⚠️ 상대방이 OpenSSL 1.0.2u(PEM_read_bio_RSAPublicKey)를 사용 중입니다. 호환성을 위해 Legacy v1.0 모드를 권장합니다.',
    useLegacyBtn: 'Legacy v1.0 전환',
    changeFontTooltip: '메시지 글꼴 변경',
    changeColorTooltip: '메시지 글자 색상 변경',
    insertSmileyTooltip: '이모티콘 삽입',
    sendFileTooltip: '파일 보내기:',
    sendFolderTooltip: '폴더 보내기:',
    remoteDesktopTooltip: '원격 데스크톱 연결',
    captureScreenTooltip: '화면 캡쳐 후 대화방으로 전송 (오픈소스캡쳐 - PrintScreen / F11)',
    saveConversationTooltip: '대화 내용 저장 (Ctrl+S)',
    viewTransfersTooltip: '파일 전송 목록 보기 (Ctrl+J)',
    viewHistoryTooltip: '대화 기록 보기 (Ctrl+H)',
    insertEmoticonTitle: '이모티콘 선택',
    selectFontTitle: '글꼴 선택',
    selectColorTitle: '글자 색상 선택',
    placeholderCtrlEnter: '메시지를 입력하세요... (Ctrl+Enter 키로 전송)',
    placeholderEnter: '메시지를 입력하세요... (Enter 키로 전송)',
    sendBtn: '전송',
    sendFailedDisconnected: '네트워크에 연결되어 있지 않아 메시지를 보낼 수 없습니다.',
  },
  preferences: {
    windowTitle: '환경설정 - LAN 메신저',
    quickToggleLabel: '표시 언어',
    categories: {
      general: '일반',
      account: '계정',
      messages: '메시지',
      history: '대화 기록',
      alerts: '알림 및 소리',
      network: '네트워크',
      fileTransfer: '파일 전송',
      theme: '테마 및 보기',
      hotkeys: '단축키',
    },
    general: {
      systemLegend: '시스템 시작',
      autoStart: '컴퓨터 시작 시 LAN 메신저 자동 실행',
      autoShow: 'LAN 메신저 실행 시 메인 창 표시',
      sysTrayLegend: '시스템 트레이',
      showSysTray: '시스템 트레이 아이콘 표시',
      minimizeToTray: '메인 창을 시스템 트레이로 최소화',
      showSysTrayMsg: '시스템 트레이 풍선 알림 표시',
      languageLegend: '언어 설정 (Language)',
      languageSelectLabel: '인터페이스 표시 언어 선택:',
      languageHint: 'UI 레이블을 한국어(ko_KR) 또는 영어(en_US)로 즉시 전환합니다.',
    },
    account: {
      personalDetailsLegend: '개인 프로필 정보',
      userNameLabel: '사용자 이름 (표시 이름):',
      firstNameLabel: '이름 (First Name):',
      lastNameLabel: '성 (Last Name):',
      aboutLabel: '소개 (About):',
    },
    messages: {
      messageWindowLegend: '대화창 설정',
      showEmoticons: '메시지에 이모티콘(스마일리) 그래픽 표시',
      showMessageTime: '메시지 수신/발신 시간 표시',
      showMessageDate: '시간과 함께 날짜도 표시',
      allowLinks: '메시지 내 인터넷 주소(URL) 하이퍼링크 활성화',
      trimMessage: '메시지 앞뒤 공백 자동 제거',
      showSendButton: '대화창에 [전송] 버튼 표시',
      fontSizeLegend: '글꼴 및 크기',
      messageTextSizeLabel: '메시지 글자 크기:',
      sizeSmall: '작게 (Small)',
      sizeMedium: '보통 (Medium)',
      sizeLarge: '크게 (Large)',
    },
    history: {
      messageHistoryLegend: '대화 및 파일 기록',
      saveHistory: '대화창을 닫을 때 대화 기록 자동 저장',
      saveFileHistory: '파일 전송 내역 저장',
      clearMessageHistoryBtn: '대화 기록 전체 삭제',
      clearFileHistoryBtn: '파일 전송 내역 삭제',
    },
    alerts: {
      notificationsLegend: '알림 및 효과음',
      showAlerts: '상태 변경 팝업 알림 표시',
      noBusyAlert: '내 상태가 [다른 용무 중]일 때 알림 숨기기',
      enableSound: '이벤트 발생 시 효과음 재생',
    },
    network: {
      protocolCompatLegend: 'OpenSSL 3.0 ↔ 1.0 프로토콜 호환성',
      wireHeaderModeLabel: '패킷 헤더 및 RSA 공개키 인코딩 모드:',
      multicastPortsLegend: '멀티캐스트 및 포트 설정',
      multicastGroupIpLabel: '멀티캐스트 그룹 IP:',
      udpPortLabel: 'UDP 포트:',
      tcpPortLabel: 'TCP 포트:',
      broadcastListLabel: '브로드캐스트 주소 목록:',
      addBtn: '추가',
    },
    fileTransfer: {
      fileReceptionLegend: '파일 수신 설정',
      autoReceiveFile: '수신되는 파일을 자동으로 수락',
      autoShowTransferWindow: '파일 전송 시작 시 파일 전송 창 자동 표시',
      receivedFilesFolderLabel: '수신 파일 저장 폴더:',
    },
    theme: {
      appThemeLegend: '앱 전체 창 및 테두리 테마',
      appThemeLabel: '앱 테마 선택 (배경색 및 테두리 스타일):',
      appThemeHint: '선택 시 앱 전반의 배경색과 테두리 스타일이 실시간으로 변경됩니다.',
      appThemeClassic: '클래식 윈도우',
      appThemeDark: '다크 모드',
      appThemeHighContrast: '고대비',
      chatThemeLabel: '대화창 테마:',
      contactListViewLabel: '대화상대 목록 보기 방식:',
      detailedViewOption: '상세 보기 (36px - 아바타 및 상태 메시지 표시)',
      compactViewOption: '간단히 보기 (20px)',
      themePreviewTitle: '테마 미리보기',
    },
    hotkeys: {
      sendMessageKeyLegend: '메시지 전송 단축키',
      enterSendsRadio: 'Enter 키를 눌러 메시지 전송 (Ctrl+Enter는 줄바꿈)',
      ctrlEnterSendsRadio: 'Ctrl+Enter 키를 눌러 메시지 전송 (Enter는 줄바꿈)',
    },
    buttons: {
      resetPreferences: '설정 초기화',
      ok: '확인',
      cancel: '취소',
    },
  },
  modals: {
    broadcast: {
      title: '전체 쪽지 (브로드캐스트) 보내기',
      messageLabel: '전체 쪽지 내용',
      placeholder: '선택한 LAN 대화상대들에게 보낼 공지 내용을 입력하세요...',
      selectRecipientsLabel: '수신자 선택',
      selectAll: '전체 선택',
      selectNone: '전체 해제',
      send: '보내기',
      cancel: '취소',
    },
    publicChat: {
      title: '공개 채팅방 - LAN 멀티캐스트 룸 (239.255.100.100)',
      participantsLabel: '참여자 목록',
      youSuffix: '(나)',
      inputPlaceholder: '공개 채팅방에 메시지 보내기...',
      send: '전송',
    },
    transfers: {
      title: '파일 전송 목록',
      headerCount: '진행 중 및 완료된 파일 전송',
      clearList: '목록 비우기',
      emptyText: '파일 전송 내역이 없습니다.',
      toPrefix: '수신자:',
      fromPrefix: '발신자:',
      close: '닫기',
    },
    history: {
      title: '대화 기록 (History)',
      searchPlaceholder: '사용자 이름 또는 대화 내용으로 검색...',
      clearHistory: '기록 비우기',
      emptyText: '저장된 대화 기록이 없습니다',
      selectPrompt: '왼쪽 목록에서 대화를 선택하면 상세 내용을 확인할 수 있습니다.',
      close: '닫기',
    },
    userInfo: {
      titleSuffix: '사용자 상세 정보',
      tabGeneral: '일반 및 프로필',
      tabSystem: '시스템 · 하드웨어 · OpenSSL 정보',
      hardwareSectionTitle: '윈도우 버전 상세 및 하드웨어 사양 (CPU / 메모리 / 그래픽카드 / MAC 주소)',
      firstName: '이름 (First Name):',
      lastName: '성 (Last Name):',
      about: '소개 (About):',
      ipAddress: 'IP 주소:',
      macAddress: 'MAC 주소 (맥주소):',
      hostName: '호스트 이름:',
      logonName: '로그인 계정:',
      os: '운영체제 (OS):',
      osDetail: '윈도우 / OS 버전 상세:',
      cpu: 'CPU 정보:',
      memory: '메모리 (RAM) 정보:',
      gpu: '그래픽카드 (GPU) 정보:',
      version: '메신저 버전:',
      cryptoStack: '암호화 스택:',
      rsaKeySize: 'RSA 키 길이:',
      publicKeyPem: '상대방 공개키 PEM:',
      ok: '확인',
    },
    remoteDesktop: {
      titlePrefix: '원격 데스크톱',
      enableControl: '원격 마우스 제어 허용',
      fitToWindow: '창 크기에 맞춤',
      connectedStatus: '연결됨',
      disconnect: '연결 종료',
    },
    about: {
      title: 'LAN 메신저 정보',
      tabAbout: '프로그램 정보',
      tabThanks: '도움 주신 분들',
      tabLicense: '라이선스',
      close: '닫기',
    },
    update: {
      title: 'LAN 메신저 업데이트 확인',
      checking: 'GitHub 릴리스에서 업데이트를 확인하고 있습니다...',
      error: '업데이트 확인 중 오류가 발생했습니다.',
      newAvailable: '새로운 버전을 LAN 메신저 GitHub 릴리스에서 다운로드할 수 있습니다.',
      upToDate: '현재 최신 버전의 LAN 메신저를 사용 중입니다.',
      recheck: '다시 확인',
      close: '닫기',
    },
  },
};

const DICTIONARIES: Record<SupportedLanguage, I18nLabels> = {
  en_US: EN_US_LABELS,
  ko_KR: KO_KR_LABELS,
};

/**
 * Normalizes any locale string (e.g., 'ko', 'ko_KR', 'en', 'en_US') into
 * a supported language key ('en_US' or 'ko_KR').
 */
export function normalizeLanguage(lang?: string | null): SupportedLanguage {
  if (!lang) return 'en_US';
  const cleaned = lang.trim().toLowerCase();
  if (cleaned === 'ko_kr' || cleaned.startsWith('ko')) {
    return 'ko_KR';
  }
  return 'en_US';
}

/**
 * Returns the complete UI label dictionary for the given locale code.
 */
export function getLabels(lang?: string | null): I18nLabels {
  const normalized = normalizeLanguage(lang);
  return DICTIONARIES[normalized];
}

/**
 * Toggles between 'en_US' and 'ko_KR'.
 */
export function toggleLanguage(lang?: string | null): SupportedLanguage {
  return normalizeLanguage(lang) === 'ko_KR' ? 'en_US' : 'ko_KR';
}

/**
 * Resolves a dot-separated path (e.g. 'mainWindow.preferences' or 'preferences.buttons.ok')
 * against the active language dictionary.
 */
export function t(lang: string | null | undefined, keyPath: string): string {
  const dict = getLabels(lang);
  const parts = keyPath.split('.');
  let current: unknown = dict;
  for (const part of parts) {
    if (current && typeof current === 'object' && part in (current as Record<string, unknown>)) {
      current = (current as Record<string, unknown>)[part];
    } else {
      return keyPath;
    }
  }
  return typeof current === 'string' ? current : keyPath;
}

/**
 * Resolves any theme string ('classic' | 'dark' | 'high-contrast' or Korean labels)
 * to its full AppUiThemeConfig for real-time background and border styling.
 */
export function getAppThemeConfig(theme?: string | null): AppUiThemeConfig {
  if (!theme) return APP_UI_THEMES.classic;
  const cleaned = theme.trim().toLowerCase();
  if (cleaned === 'dark' || cleaned.includes('다크')) {
    return APP_UI_THEMES.dark;
  }
  if (cleaned === 'high-contrast' || cleaned.includes('고대비')) {
    return APP_UI_THEMES['high-contrast'];
  }
  return APP_UI_THEMES.classic;
}

export function normalizeAppTheme(theme?: string | null): AppUiTheme {
  return getAppThemeConfig(theme).id;
}

export const APP_THEME_STORAGE_KEY = 'lmc_app_theme';
const APP_THEME_FALLBACK_KEYS = [
  'lmc_app_theme',
  'appTheme',
  'data-app-theme',
  'app-theme',
  'theme',
] as const;

export function applyAppThemeAttribute(theme: AppUiTheme): void {
  if (typeof document !== 'undefined') {
    if (document.documentElement) {
      document.documentElement.setAttribute('data-app-theme', theme);
    }
    if (document.body) {
      document.body.setAttribute('data-app-theme', theme);
    }
  }
}

/**
 * Immediately saves the selected AppUiTheme ('classic' | 'dark' | 'high-contrast')
 * to localStorage and syncs document.documentElement's data-app-theme attribute.
 */
export function saveAppThemeToStorage(
  theme?: string | null,
  storage?: Pick<Storage, 'setItem'> | null
): AppUiTheme {
  const normalized = normalizeAppTheme(theme);
  const targetStorage =
    storage !== undefined
      ? storage
      : typeof window !== 'undefined' && window.localStorage
      ? window.localStorage
      : null;

  if (targetStorage) {
    try {
      for (const key of APP_THEME_FALLBACK_KEYS) {
        targetStorage.setItem(key, normalized);
      }
    } catch {
      // Ignore storage quota or private mode errors
    }
  }

  applyAppThemeAttribute(normalized);

  return normalized;
}

/**
 * Loads the persisted AppUiTheme from localStorage on application startup
 * and initializes document.documentElement's data-app-theme attribute.
 */
export function loadAppThemeFromStorage(
  storage?: Pick<Storage, 'getItem'> | null
): AppUiTheme {
  const targetStorage =
    storage !== undefined
      ? storage
      : typeof window !== 'undefined' && window.localStorage
      ? window.localStorage
      : null;

  let storedValue: string | null = null;
  if (targetStorage) {
    try {
      for (const key of APP_THEME_FALLBACK_KEYS) {
        const val = targetStorage.getItem(key);
        if (val) {
          storedValue = val;
          break;
        }
      }
    } catch {
      // Ignore storage read errors
    }
  }

  const normalized = normalizeAppTheme(storedValue);

  applyAppThemeAttribute(normalized);

  return normalized;
}

