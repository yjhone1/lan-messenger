export const VERSION_CONFIG = {
  version: 'v1.4.0.3',
  rawVersion: '1.4.0.3',
  displayVersion: 'v1.4.0.3',
  current: 'v1.4.0.3',
  appName: 'LAN Messenger',
  fullTitle: 'LAN Messenger v1.4.0.3',
  legacyBaseVersion: '1.2.39',
} as const;

export const APP_VERSION = VERSION_CONFIG.version;
export const AUTHORIZED_ADMIN_IP = '192.168.10.212';
export const UTILITY_ADMIN_PASSWORD = '192.168.10.212';

export type AiAgentKey =
  | 'autogpt'
  | 'babyagi'
  | 'devin'
  | 'metagpt'
  | 'crewai'
  | 'autogen'
  | 'claudeComputerUse'
  | 'openaiOperator'
  | 'agentgpt'
  | 'chatdev'
  | 'opencode';

export type UserAiAgentBlockMap = Record<AiAgentKey, boolean>;

export interface AiAgentProcessInfo {
  key: AiAgentKey;
  name: string;
  processBinary: string;
  category: 'autonomous' | 'coding' | 'system-control';
  riskLevel: 'High' | 'Medium';
  description: string;
  icon: string;
}

export const REPRESENTATIVE_AI_AGENTS: AiAgentProcessInfo[] = [
  {
    key: 'autogpt',
    name: 'AutoGPT',
    processBinary: 'autogpt.exe / python -m autogpt',
    category: 'autonomous',
    riskLevel: 'High',
    description: '목표 지향 자율 루프, 로컬 쉘 명령어 및 파일 시스템 임의 조작 백그라운드 데몬',
    icon: '🤖',
  },
  {
    key: 'babyagi',
    name: 'BabyAGI',
    processBinary: 'babyagi.exe / babyagi.py',
    category: 'autonomous',
    riskLevel: 'High',
    description: '작업 자동 분해 및 무한 하위 태스크 큐 자율 실행 백그라운드 프로세스',
    icon: '👶',
  },
  {
    key: 'devin',
    name: 'Devin / OpenHands',
    processBinary: 'openhands-daemon / devin-agent',
    category: 'coding',
    riskLevel: 'High',
    description: '자율 코딩 엔지니어링 에이전트, 로컬 터미널 및 Docker 컨테이너 자율 제어',
    icon: '👨‍💻',
  },
  {
    key: 'metagpt',
    name: 'MetaGPT',
    processBinary: 'metagpt-worker / python -m metagpt',
    category: 'coding',
    riskLevel: 'High',
    description: 'PM/아키텍트/엔지니어 등 멀티 에이전트 협업 기반 로컬 컴파일 및 소스 생성',
    icon: '🏢',
  },
  {
    key: 'crewai',
    name: 'CrewAI',
    processBinary: 'crewai-exec / crewai_runner',
    category: 'autonomous',
    riskLevel: 'Medium',
    description: '역할 기반 멀티 에이전트 오케스트레이션 및 로컬 툴·파이썬 스크립트 자율 호출',
    icon: '👥',
  },
  {
    key: 'autogen',
    name: 'Microsoft AutoGen',
    processBinary: 'autogen-agent / pyautogen',
    category: 'autonomous',
    riskLevel: 'High',
    description: '다중 에이전트 간 자율 대화 및 로컬 코드 자동 실행기(Code Executor)',
    icon: '🪟',
  },
  {
    key: 'claudeComputerUse',
    name: 'Claude Computer Use',
    processBinary: 'claude-computer-use / anthropic-desktop',
    category: 'system-control',
    riskLevel: 'High',
    description: 'OS 화면 실시간 캡처, 마우스 클릭/드래그 및 키보드 입력 직접 제어 에이전트',
    icon: '🖥️',
  },
  {
    key: 'openaiOperator',
    name: 'OpenAI Operator / Codex Agent',
    processBinary: 'operator-daemon / codex-runner',
    category: 'system-control',
    riskLevel: 'High',
    description: '브라우저 자율 탐색, 웹 폼 자동 작성 및 로컬 개발 환경 제어 에이전트',
    icon: '⚡',
  },
  {
    key: 'agentgpt',
    name: 'AgentGPT',
    processBinary: 'agentgpt-node / agentgpt.exe',
    category: 'autonomous',
    riskLevel: 'Medium',
    description: '웹/로컬 환경 자율 목표 달성 및 지속적인 하위 프로세스 생성 에이전트',
    icon: '🌐',
  },
  {
    key: 'chatdev',
    name: 'ChatDev',
    processBinary: 'chatdev-run / python run.py',
    category: 'coding',
    riskLevel: 'High',
    description: '가상 소프트웨어 개발사 시뮬레이션, 로컬 컴파일러 및 테스트 환경 자율 구동',
    icon: '💻',
  },
  {
    key: 'opencode',
    name: 'OpenCode',
    processBinary: 'opencode.exe / opencode-cli / opencode',
    category: 'coding',
    riskLevel: 'High',
    description: '터미널 기반 오픈소스 자율 코딩 에이전트, 로컬 파일 수정 및 쉘 명령어 자율 실행',
    icon: '⌨️',
  },
];

export const DEFAULT_AI_AGENT_BLOCKS: UserAiAgentBlockMap = {
  autogpt: false,          // false = 차단(OFF, 권장 보안 상태)
  babyagi: false,
  devin: false,
  metagpt: false,
  crewai: false,
  autogen: false,
  claudeComputerUse: false,
  openaiOperator: false,
  agentgpt: false,
  chatdev: false,
  opencode: false,
};

export interface UserUtilityFeatures {
  remoteDesktop: boolean;  // 원격제어
  screenCapture: boolean;  // 캡쳐
  codexAgent: boolean;     // codex agent
  claudeAgent: boolean;    // 클로드 agent
  googleAgent: boolean;    // 구글 agent
}

export const DEFAULT_USER_UTILITY_FEATURES: UserUtilityFeatures = {
  remoteDesktop: true,
  screenCapture: true,
  codexAgent: true,
  claudeAgent: true,
  googleAgent: true,
};

export type ProtocolHeaderMode = 'Legacy v1.0' | 'Strict v3.0';

export enum DatagramType {
  DT_None = 0,
  DT_Broadcast = 1,
  DT_PublicKey = 2,
  DT_Handshake = 3,
  DT_Message = 4,
}

export const DatagramTypeNames: Record<DatagramType, string> = {
  [DatagramType.DT_None]: '',
  [DatagramType.DT_Broadcast]: 'BRDCST',
  [DatagramType.DT_PublicKey]: 'PUBKEY',
  [DatagramType.DT_Handshake]: 'HNDSHK',
  [DatagramType.DT_Message]: 'MESSAG',
};

export const DatagramTypeNamesV3: Record<DatagramType, string> = {
  [DatagramType.DT_None]: '',
  [DatagramType.DT_Broadcast]: 'BRDv30',
  [DatagramType.DT_PublicKey]: 'PUBKv3',
  [DatagramType.DT_Handshake]: 'HNDv30',
  [DatagramType.DT_Message]: 'MSGv30',
};

export type StatusCode = 'chat' | 'busy' | 'dnd' | 'brb' | 'away' | 'gone';

export enum StatusTypeEnum {
  StatusTypeOnline = 0,
  StatusTypeBusy = 1,
  StatusTypeOffline = 2,
  StatusTypeAway = 3,
}

export interface StatusMetadata {
  code: StatusCode;
  label: string;
  type: StatusTypeEnum;
  icon: string;
  bubbleIcon: string;
  color: string;
}

export const STATUS_LIST: StatusMetadata[] = [
  {
    code: 'chat',
    label: 'Available',
    type: StatusTypeEnum.StatusTypeOnline,
    icon: '/resources/images/online.png',
    bubbleIcon: '/resources/images/onlinebubble.png',
    color: '#16a34a',
  },
  {
    code: 'busy',
    label: 'Busy',
    type: StatusTypeEnum.StatusTypeBusy,
    icon: '/resources/images/busy.png',
    bubbleIcon: '/resources/images/busybubble.png',
    color: '#dc2626',
  },
  {
    code: 'dnd',
    label: 'Do Not Disturb',
    type: StatusTypeEnum.StatusTypeBusy,
    icon: '/resources/images/nodisturb.png',
    bubbleIcon: '/resources/images/nodisturbbubble.png',
    color: '#b91c1c',
  },
  {
    code: 'brb',
    label: 'Be Right Back',
    type: StatusTypeEnum.StatusTypeAway,
    icon: '/resources/images/away.png',
    bubbleIcon: '/resources/images/awaybubble.png',
    color: '#d97706',
  },
  {
    code: 'away',
    label: 'Away',
    type: StatusTypeEnum.StatusTypeAway,
    icon: '/resources/images/away.png',
    bubbleIcon: '/resources/images/awaybubble.png',
    color: '#d97706',
  },
  {
    code: 'gone',
    label: 'Appear Offline',
    type: StatusTypeEnum.StatusTypeOffline,
    icon: '/resources/images/offline.png',
    bubbleIcon: '/resources/images/offlinebubble.png',
    color: '#6b7280',
  },
];

export enum UserCap {
  UC_None = 0x00000000,
  UC_File = 0x00000001,
  UC_GroupMessage = 0x00000002,
  UC_Folder = 0x00000004,
}

export interface User {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  about: string;
  status: StatusCode;
  avatar: number;
  avatarPath: string;
  note: string;
  group: string;
  address: string;
  macAddress: string;
  hostName: string;
  logonName: string;
  osName: string;
  osVersionDetail: string;
  cpuInfo: string;
  memoryInfo: string;
  gpuInfo: string;
  version: string;
  opensslVersion: 'OpenSSL 1.0.2u (Legacy PKCS#1)' | 'OpenSSL 3.0.13 (EVP_PKEY / OSSL_DECODER)';
  rsaBits: 1024 | 2048;
  caps: number;
  publicKeyPem: string;
  sessionEstablished: boolean;
  sessionKeyHex?: string;
  sessionIvHex?: string;
  envelopeBytes?: number;
  captureEnabled?: boolean;
  utilityFeatures?: UserUtilityFeatures;
  aiAgentBlocks?: UserAiAgentBlockMap;
  remoteDesktopUnlocked?: boolean;
}

export interface Group {
  id: string;
  name: string;
  expanded: boolean;
}

export type ThemeName = 'Classic' | 'Bubble' | 'Dark Bubble' | 'Digg' | 'Ping Pong';

export type AppUiTheme = 'classic' | 'dark' | 'high-contrast';

export interface AppUiThemeConfig {
  id: AppUiTheme;
  koName: string;
  enName: string;
  desktopBg: string;
  windowBg: string;
  panelBg: string;
  subPanelBg: string;
  textPrimary: string;
  textSecondary: string;
  borderOuter: string;
  borderInner: string;
  borderStyle: 'solid' | 'double';
  titlebarBg: string;
  titlebarText: string;
  buttonBg: string;
  buttonText: string;
  buttonBorder: string;
}

export const APP_UI_THEMES: Record<AppUiTheme, AppUiThemeConfig> = {
  classic: {
    id: 'classic',
    koName: '클래식 윈도우',
    enName: 'Classic Windows',
    desktopBg: '#3a6ea5',
    windowBg: '#ece9d8',
    panelBg: '#ffffff',
    subPanelBg: '#f5f4ee',
    textPrimary: '#0f172a',
    textSecondary: '#475569',
    borderOuter: '#0054e3',
    borderInner: '#aca899',
    borderStyle: 'solid',
    titlebarBg: 'linear-gradient(90deg, #0054e3 0%, #2673f2 50%, #0046c7 100%)',
    titlebarText: '#ffffff',
    buttonBg: '#e1dfd2',
    buttonText: '#0f172a',
    buttonBorder: '#7f9db9',
  },
  dark: {
    id: 'dark',
    koName: '다크 모드',
    enName: 'Dark Mode',
    desktopBg: '#0b1120',
    windowBg: '#1e293b',
    panelBg: '#0f172a',
    subPanelBg: '#1e293b',
    textPrimary: '#f1f5f9',
    textSecondary: '#94a3b8',
    borderOuter: '#38bdf8',
    borderInner: '#475569',
    borderStyle: 'solid',
    titlebarBg: 'linear-gradient(90deg, #0f172a 0%, #1e3a8a 50%, #0f172a 100%)',
    titlebarText: '#38bdf8',
    buttonBg: '#334155',
    buttonText: '#f8fafc',
    buttonBorder: '#64748b',
  },
  'high-contrast': {
    id: 'high-contrast',
    koName: '고대비',
    enName: 'High Contrast',
    desktopBg: '#000000',
    windowBg: '#000000',
    panelBg: '#000000',
    subPanelBg: '#0a0a0a',
    textPrimary: '#ffff00',
    textSecondary: '#00ffff',
    borderOuter: '#ffff00',
    borderInner: '#ffffff',
    borderStyle: 'double',
    titlebarBg: 'linear-gradient(90deg, #000000 0%, #1a1a00 100%)',
    titlebarText: '#ffff00',
    buttonBg: '#000000',
    buttonText: '#ffff00',
    buttonBorder: '#ffff00',
  },
};


export type ChatStateType = 'active' | 'composing' | 'paused' | 'inactive';

export interface ChatMessage {
  id: string;
  type: 'message' | 'broadcast' | 'file' | 'folder' | 'system' | 'error';
  senderId: string;
  senderName: string;
  recipientId: string;
  text: string;
  timestamp: number;
  fontFamily?: string;
  fontSize?: number;
  fontColor?: string;
  protocolMode: ProtocolHeaderMode;
  wireHeader: string;
  xmlPayload: string;
  encryptedHex: string;
  fileTransferId?: string;
  fileName?: string;
  fileSize?: number;
  fileMode?: 'send' | 'receive';
  fileOp?: 'request' | 'accept' | 'decline' | 'cancel' | 'progress' | 'complete' | 'abort';
  isFolder?: boolean;
  imageUrl?: string;
  isCapture?: boolean;
}

export interface FileTransferItem {
  id: string;
  peerId: string;
  peerName: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  transferredBytes: number;
  mode: 'send' | 'receive';
  isFolder: boolean;
  status: 'request' | 'transferring' | 'complete' | 'declined' | 'cancelled' | 'failed';
  startTime: number;
  speedBps: number;
}

export interface HistoryRecord {
  id: string;
  peerId: string;
  peerName: string;
  timestamp: number;
  isGroup: boolean;
  messages: ChatMessage[];
}

export interface WireFrameLog {
  id: string;
  timestamp: number;
  direction: 'OUT' | 'IN';
  transport: 'UDP' | 'TCP';
  datagramType: DatagramType;
  wireHeader: string;
  protocolMode: ProtocolHeaderMode;
  peerId: string;
  peerName: string;
  peerAddress: string;
  summary: string;
  rawPayloadPreview: string;
  encryptedBytes: number;
  status: 'ok' | 'warning' | 'blocked';
}

export interface LmcSettings {
  // General
  autoStart: boolean;
  autoShow: boolean;
  language: string;
  showSysTray: boolean;
  minimizeToTray: boolean;
  singleClickTray: boolean;
  showSysTrayMsg: boolean;
  // Account
  userName: string;
  firstName: string;
  lastName: string;
  about: string;
  // Messages
  trimMessage: boolean;
  clearOnClose: boolean;
  showEmoticons: boolean;
  showMessageTime: boolean;
  showMessageDate: boolean;
  allowLinks: boolean;
  pathToLink: boolean;
  showSendButton: boolean;
  fontFamily: string;
  fontSize: 'Small' | 'Medium' | 'Large';
  fontColor: string;
  // History
  saveHistory: boolean;
  sysHistoryPath: boolean;
  customHistoryPath: string;
  saveFileHistory: boolean;
  // Alerts
  showAlerts: boolean;
  noBusyAlert: boolean;
  noDNDAlert: boolean;
  enableSound: boolean;
  noBusySound: boolean;
  noDNDSound: boolean;
  soundEvents: {
    newMessage: boolean;
    userOnline: boolean;
    userOffline: boolean;
    newFile: boolean;
    fileDone: boolean;
  };
  // Network
  connectionName: string;
  timeoutSec: number;
  maxRetries: number;
  multicastAddress: string;
  broadcastList: string[];
  udpPort: number;
  tcpPort: number;
  legacyCompatibility: boolean;
  protocolMode: ProtocolHeaderMode;
  // File Transfer
  autoReceiveFile: boolean;
  autoShowTransferWindow: boolean;
  fileStoragePath: string;
  // Appearance / Theme
  appTheme: AppUiTheme;
  theme: ThemeName;
  userListView: 'Detailed' | 'Compact';
  showStatusTooltip: boolean;
  // Hotkeys
  sendKeyModCtrlEnter: boolean;
  // Security & Permissions Policy
  authorizedRemoteIp: string;
  captureFeatureEnabled: boolean;
}

export interface SmileyDef {
  index: number;
  code: string;
  altCode?: string;
  name: string;
  image: string;
}

export const SMILEY_LIST: SmileyDef[] = [
  { index: 1, name: 'Smile', code: ':-)', altCode: ':)', image: '/resources/smileys/01.png' },
  { index: 2, name: 'Open Mouthed', code: ':-D', altCode: ':D', image: '/resources/smileys/02.png' },
  { index: 3, name: 'Wink', code: ';-)', altCode: ';)', image: '/resources/smileys/03.png' },
  { index: 4, name: 'Surprised', code: ':-O', altCode: ':O', image: '/resources/smileys/04.png' },
  { index: 5, name: 'Tongue Out', code: ':-P', altCode: ':P', image: '/resources/smileys/05.png' },
  { index: 6, name: 'Hot', code: '(H)', altCode: '(h)', image: '/resources/smileys/06.png' },
  { index: 7, name: 'Angry', code: ':-@', altCode: ':@', image: '/resources/smileys/07.png' },
  { index: 8, name: 'Confused', code: ':-S', altCode: ':s', image: '/resources/smileys/08.png' },
  { index: 9, name: 'Embarrassed', code: ':-$', altCode: ':$', image: '/resources/smileys/09.png' },
  { index: 10, name: 'Sad', code: ':-(', altCode: ':(', image: '/resources/smileys/10.png' },
  { index: 11, name: 'Crying', code: ":'(", image: '/resources/smileys/11.png' },
  { index: 12, name: 'Disappointed', code: ':-|', altCode: ':|', image: '/resources/smileys/12.png' },
  { index: 13, name: 'Stormy Cloud', code: '(ST)', altCode: '(st)', image: '/resources/smileys/13.png' },
  { index: 14, name: 'Baring Teeth', code: '8o|', image: '/resources/smileys/14.png' },
  { index: 15, name: 'Nerd', code: '8-|', image: '/resources/smileys/15.png' },
  { index: 16, name: 'Sick', code: '+o(', image: '/resources/smileys/16.png' },
  { index: 17, name: 'Party', code: '<:o)', image: '/resources/smileys/17.png' },
  { index: 18, name: 'Sleepy', code: '|-)', image: '/resources/smileys/18.png' },
  { index: 19, name: 'Thinking', code: '*-)', image: '/resources/smileys/19.png' },
  { index: 20, name: "Don't Tell", code: ':-#', image: '/resources/smileys/20.png' },
  { index: 21, name: 'Secret', code: ':-*', image: '/resources/smileys/21.png' },
  { index: 22, name: 'Sarcastic', code: '^o)', image: '/resources/smileys/22.png' },
  { index: 23, name: 'Eye Rolling', code: '8-)', image: '/resources/smileys/23.png' },
  { index: 24, name: 'Red Heart', code: '(L)', altCode: '(l)', image: '/resources/smileys/24.png' },
  { index: 25, name: 'Broken Heart', code: '(U)', altCode: '(u)', image: '/resources/smileys/25.png' },
  { index: 26, name: 'Drink', code: '(D)', altCode: '(d)', image: '/resources/smileys/26.png' },
  { index: 27, name: 'Beer', code: '(B)', altCode: '(b)', image: '/resources/smileys/27.png' },
  { index: 28, name: 'Cat Face', code: '(@)', image: '/resources/smileys/28.png' },
  { index: 29, name: 'Dog Face', code: '(&)', image: '/resources/smileys/29.png' },
  { index: 30, name: 'Snail', code: '(SN)', altCode: '(sn)', image: '/resources/smileys/30.png' },
  { index: 31, name: 'Black Sheep', code: '(BAH)', altCode: '(bah)', image: '/resources/smileys/31.png' },
  { index: 32, name: 'Sleeping Moon', code: '(S)', altCode: '(s)', image: '/resources/smileys/32.png' },
  { index: 33, name: 'Star', code: '(*)', image: '/resources/smileys/33.png' },
  { index: 34, name: 'Sun', code: '(#)', image: '/resources/smileys/34.png' },
  { index: 35, name: 'Rainbow', code: '(R)', altCode: '(r)', image: '/resources/smileys/35.png' },
  { index: 36, name: 'Left Hug', code: '({)', image: '/resources/smileys/36.png' },
  { index: 37, name: 'Right Hug', code: '(})', image: '/resources/smileys/37.png' },
  { index: 38, name: 'Red Lips', code: '(K)', altCode: '(k)', image: '/resources/smileys/38.png' },
  { index: 39, name: 'Red Rose', code: '(F)', altCode: '(f)', image: '/resources/smileys/39.png' },
  { index: 40, name: 'Wilted Rose', code: '(W)', altCode: '(w)', image: '/resources/smileys/40.png' },
  { index: 41, name: 'Clock', code: '(O)', altCode: '(o)', image: '/resources/smileys/41.png' },
  { index: 42, name: 'Gift', code: '(G)', altCode: '(g)', image: '/resources/smileys/42.png' },
  { index: 43, name: 'Birthday Cake', code: '(^)', image: '/resources/smileys/43.png' },
  { index: 44, name: 'Camera', code: '(P)', altCode: '(p)', image: '/resources/smileys/44.png' },
  { index: 45, name: 'Light Bulb', code: '(I)', altCode: '(i)', image: '/resources/smileys/45.png' },
  { index: 46, name: 'Coffee', code: '(C)', altCode: '(c)', image: '/resources/smileys/46.png' },
  { index: 47, name: 'Telephone', code: '(T)', altCode: '(t)', image: '/resources/smileys/47.png' },
  { index: 48, name: 'Mobile Phone', code: '(MP)', altCode: '(mp)', image: '/resources/smileys/48.png' },
  { index: 49, name: 'Auto', code: '(AU)', altCode: '(au)', image: '/resources/smileys/49.png' },
  { index: 50, name: 'Airplane', code: '(AP)', altCode: '(ap)', image: '/resources/smileys/50.png' },
  { index: 51, name: 'Computer', code: '(CO)', altCode: '(co)', image: '/resources/smileys/51.png' },
  { index: 52, name: 'Money', code: '(MO)', altCode: '(mo)', image: '/resources/smileys/52.png' },
  { index: 53, name: 'Filmstrip', code: '(~)', image: '/resources/smileys/53.png' },
  { index: 54, name: 'Note', code: '(8)', image: '/resources/smileys/54.png' },
  { index: 55, name: 'Pizza', code: '(PI)', altCode: '(pi)', image: '/resources/smileys/55.png' },
  { index: 56, name: 'Soccer Ball', code: '(SO)', altCode: '(so)', image: '/resources/smileys/56.png' },
  { index: 57, name: 'E-Mail', code: '(E)', altCode: '(e)', image: '/resources/smileys/57.png' },
  { index: 58, name: 'Boy', code: '(Z)', altCode: '(z)', image: '/resources/smileys/58.png' },
  { index: 59, name: 'Girl', code: '(X)', altCode: '(x)', image: '/resources/smileys/59.png' },
  { index: 60, name: 'Island', code: '(IP)', altCode: '(ip)', image: '/resources/smileys/60.png' },
  { index: 61, name: 'Umbrella', code: '(UM)', altCode: '(um)', image: '/resources/smileys/61.png' },
  { index: 62, name: 'OK / Agree', code: '(OK)', altCode: '(ok)', image: '/resources/smileys/62.png' },
  { index: 63, name: 'Stop', code: '(STOP)', image: '/resources/smileys/63.png' },
  { index: 68, name: 'Yes', code: '(Y)', altCode: '(y)', image: '/resources/smileys/68.png' },
  { index: 69, name: 'No', code: '(N)', altCode: '(n)', image: '/resources/smileys/69.png' },
  { index: 70, name: 'Messenger', code: '(M)', altCode: '(m)', image: '/resources/smileys/70.png' },
];

export const AVATAR_LIST: string[] = Array.from({ length: 20 }, (_, i) => `/resources/avatars/${i}.png`);

export const DEFAULT_GROUPS: Group[] = [
  { id: '1CD75C10048C4E65F6082539A32DC111', name: 'General', expanded: true },
  { id: '2AD85B20048C4E65F6082539A32DC222', name: 'Engineering & DevOps', expanded: true },
  { id: '3BD95C30048C4E65F6082539A32DC333', name: 'QA & Legacy Lab (OpenSSL 1.0)', expanded: true },
];
