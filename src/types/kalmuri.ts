/**
 * Kalmuri (칼무리) Screen Capture & Recording Types and Configurations
 * Designed for LAN Messenger integration with strict hotkey conflict prevention.
 */

export type CaptureArea =
  | 'fullscreen'      // 전체화면 캡쳐
  | 'area'            // 영역화면 캡쳐
  | 'drag'            // 드래그영역 캡쳐
  | 'activewindow'    // 활성중인 화면 캡쳐
  | 'control'         // 윈도우 컨트롤 캡쳐
  | 'webpage'         // 웹페이지 캡쳐
  | 'color';          // 색상 추출

export type CaptureFormat =
  | 'PNG'
  | 'JPG'
  | 'GIF'
  | 'BMP'
  | 'WebP'
  | 'MP4'             // 화면 녹화 (동영상)
  | 'GIF_ANIM'        // 움짤 녹화 (GIF)
  | 'WEBP_ANIM'       // 움짤 녹화 (WebP)
  | 'TXT'             // 글자 인식 (OCR)
  | 'CLIPBOARD'       // 클립보드 복사
  | 'IMAGE_SHARE'     // 이미지창고 (웹 링크)
  | 'PRINTER'         // 프린터 출력
  | 'FLOATING';       // 플러팅 (화면에 항상 위 띄우기)

export type NamingRule =
  | 'sequential1'     // 순차적 #1: K-001, K-002 ...
  | 'sequential2'     // 순차적 #2: 비어 있는 가장 작은 번호부터 채움
  | 'datetime';       // 날짜시간: K-YYYYMMDD-HHMMSS

export type CaptureSound =
  | 'none'            // 없음
  | 'pre'             // 캡쳐 전 소리
  | 'post';           // 캡쳐 후 소리

export type ClickEffect =
  | 'none'            // 없음
  | 'ripple'          // 원 퍼짐 (왼쪽 클릭 파란원, 오른쪽 주황원)
  | 'highlight';      // 강조 (노란색 원)

export type AreaColor =
  | 'blue'
  | 'red'
  | 'green'
  | 'yellow'
  | 'orange'
  | 'purple'
  | 'cyan'
  | 'magenta';

export interface PresetSize {
  width: number;
  height: number;
  name?: string;
}

export interface KalmuriSettings {
  area: CaptureArea;
  format: CaptureFormat;
  jpgQuality: number;        // 60, 70, 80, 90, 100
  webpQuality: number;       // 60, 70, 80, 90, 100
  ocrLang: 'ko' | 'en' | 'ja' | 'zh';
  saveFolder: string;        // '바탕 화면' or custom path
  namingRule: NamingRule;
  shortcutKey: string;       // Primary shortcut (e.g. 'PrintScreen')
  alternativeShortcut: string;// Web friendly shortcut (e.g. 'F11' or 'Ctrl+Shift+C')
  captureSound: CaptureSound;
  includeCursorCapture: boolean;
  includeCursorRecord: boolean;
  autoClipboardCopy: boolean;
  maxRecordDurationSec: number; // 0 (unlimited), 1800, 3600, 7200, 14400
  includeAudioRecord: boolean;
  gifFps: number;             // 10, 15, 20
  clickEffect: ClickEffect;
  areaColor: AreaColor;
  startOnBoot: boolean;
  language: string;
  presets: PresetSize[];
}

export interface CapturedItem {
  id: string;
  fileName: string;
  format: string;
  timestamp: number;
  width: number;
  height: number;
  dataUrl: string;
  ocrText?: string;
  colorHex?: string;
  isVideo?: boolean;
  durationSec?: number;
  fileSize: number;
}

export interface FloatingPinItem {
  id: string;
  dataUrl: string;
  width: number;
  height: number;
  x: number;
  y: number;
  title: string;
}

export interface ExtractedColor {
  hex: string;      // e.g. "FF9933"
  rgb: string;      // e.g. "255,153,51"
  web: string;      // e.g. "#FF9933"
  tcolor: string;   // e.g. "$003399FF" (Delphi TColor format: $00BBGGRR)
  timestamp: number;
}

/**
 * LAN Messenger Reserved Shortcuts
 * Capture tool MUST NOT conflict with any of these!
 */
export const LAN_MESSENGER_RESERVED_SHORTCUTS = [
  { key: 'Ctrl+G', name: '공개 채팅방 (Public Chat)', action: 'public_chat' },
  { key: 'Ctrl+B', name: '전체 쪽지 / 브로드캐스트 (Broadcast)', action: 'broadcast' },
  { key: 'Ctrl+H', name: '대화 기록 (History)', action: 'history' },
  { key: 'Ctrl+J', name: '파일 전송 목록 (File Transfers)', action: 'transfers' },
  { key: 'Ctrl+P', name: '환경설정 (Preferences)', action: 'preferences' },
  { key: 'Ctrl+S', name: '대화 저장 (Save Conversation)', action: 'save' },
  { key: 'Enter', name: '메시지 전송 (Send Message)', action: 'send' },
  { key: 'Ctrl+Enter', name: '메시지 전송 또는 줄바꿈', action: 'send_or_newline' },
] as const;

/**
 * Validates whether a shortcut candidate conflicts with LAN Messenger.
 */
export function validateCaptureShortcut(candidateKey: string): {
  isConflict: boolean;
  conflictWith?: string;
  message: string;
} {
  const normalizedCandidate = candidateKey.trim().toUpperCase().replace(/\s+/g, '');
  
  for (const reserved of LAN_MESSENGER_RESERVED_SHORTCUTS) {
    const normReserved = reserved.key.toUpperCase().replace(/\s+/g, '');
    if (normalizedCandidate === normReserved) {
      return {
        isConflict: true,
        conflictWith: reserved.name,
        message: `LAN Messenger 예약 단축키 (${reserved.name})와 중복되어 사용할 수 없습니다. 다른 단축키를 지정하세요.`,
      };
    }
  }

  return {
    isConflict: false,
    message: '사용 가능한 단축키입니다 (랜메신저 단축키와 분리됨).',
  };
}

/**
 * Safe, recommended capture shortcuts that never clash with LAN Messenger.
 */
export const RECOMMENDED_CAPTURE_SHORTCUTS = [
  { key: 'PrintScreen', label: 'PrintScreen (칼무리 기본값)' },
  { key: 'F11', label: 'F11 (웹 브라우저 추천)' },
  { key: 'F12', label: 'F12' },
  { key: 'F9', label: 'F9' },
  { key: 'Ctrl+Shift+C', label: 'Ctrl+Shift+C (Capture)' },
  { key: 'Ctrl+Shift+A', label: 'Ctrl+Shift+A (Area)' },
  { key: 'Ctrl+Alt+S', label: 'Ctrl+Alt+S (Screen)' },
];

export const AREA_COLOR_MAP: Record<AreaColor, { border: string; bg: string; name: string }> = {
  blue: { border: '#2563eb', bg: 'rgba(37, 99, 235, 0.1)', name: '파랑' },
  red: { border: '#dc2626', bg: 'rgba(220, 38, 38, 0.1)', name: '빨강' },
  green: { border: '#16a34a', bg: 'rgba(22, 163, 74, 0.1)', name: '초록' },
  yellow: { border: '#ca8a04', bg: 'rgba(202, 138, 4, 0.1)', name: '노랑' },
  orange: { border: '#ea580c', bg: 'rgba(234, 88, 12, 0.1)', name: '주황' },
  purple: { border: '#9333ea', bg: 'rgba(147, 51, 234, 0.1)', name: '보라' },
  cyan: { border: '#0891b2', bg: 'rgba(8, 145, 178, 0.1)', name: '청록' },
  magenta: { border: '#c026d3', bg: 'rgba(192, 38, 211, 0.1)', name: '자홍' },
};

export const DEFAULT_PRESET_SIZES: PresetSize[] = [
  { width: 320, height: 240, name: '320x240 (QVGA)' },
  { width: 480, height: 360, name: '480x360' },
  { width: 640, height: 480, name: '640x480 (VGA)' },
  { width: 720, height: 480, name: '720x480 (NTSC)' },
  { width: 800, height: 600, name: '800x600 (SVGA)' },
  { width: 1024, height: 768, name: '1024x768 (XGA)' },
  { width: 1280, height: 720, name: '1280x720 (HD 720p)' },
];

export const DEFAULT_KALMURI_SETTINGS: KalmuriSettings = {
  area: 'fullscreen',
  format: 'PNG',
  jpgQuality: 90,
  webpQuality: 90,
  ocrLang: 'ko',
  saveFolder: '바탕 화면',
  namingRule: 'sequential1',
  shortcutKey: 'PrintScreen',
  alternativeShortcut: 'F11',
  captureSound: 'pre',
  includeCursorCapture: true,
  includeCursorRecord: false,
  autoClipboardCopy: false,
  maxRecordDurationSec: 0,
  includeAudioRecord: false,
  gifFps: 10,
  clickEffect: 'none',
  areaColor: 'blue',
  startOnBoot: true,
  language: 'ko_KR',
  presets: DEFAULT_PRESET_SIZES,
};
