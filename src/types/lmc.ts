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
  hostName: string;
  logonName: string;
  osName: string;
  version: string;
  opensslVersion: 'OpenSSL 1.0.2u (Legacy PKCS#1)' | 'OpenSSL 3.0.13 (EVP_PKEY / OSSL_DECODER)';
  rsaBits: 1024 | 2048;
  caps: number;
  publicKeyPem: string;
  sessionEstablished: boolean;
  sessionKeyHex?: string;
  sessionIvHex?: string;
  envelopeBytes?: number;
}

export interface Group {
  id: string;
  name: string;
  expanded: boolean;
}

export type ThemeName = 'Classic' | 'Bubble' | 'Dark Bubble' | 'Digg' | 'Ping Pong';

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
  theme: ThemeName;
  userListView: 'Detailed' | 'Compact';
  showStatusTooltip: boolean;
  // Hotkeys
  sendKeyModCtrlEnter: boolean;
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
