/**
 * Security & Process Execution Policy Engine for LAN Messenger v1.4.0.3
 * 
 * Policy Rules:
 * 1. Remote Desktop (원격제어):
 *    - Located at the bottom of the System (시스템) tab.
 *    - IP restriction is removed: Any IP can initiate remote desktop IF AND ONLY IF
 *      the operator enters the authentication password '192.168.10.212'.
 * 
 * 2. Screen Capture (오픈소스캡쳐):
 *    - Completely unrestricted: Enabled by default for all users upon installing LAN Messenger.
 *    - No active/inactive toggle or administrative blocking.
 * 
 * 3. AI Agent Local Process Blocker (유틸리티 탭):
 *    - Protected by password '192.168.10.212'.
 *    - Blocks local autonomous background daemons, terminal execution, and process-level
 *      loops of the top 10 representative AI Agents (LLM API text chat is allowed; local daemon/process is blocked).
 *    - Granular per-user and per-agent toggle:
 *      * ON = 로컬 프로세스 구동 허용 (Allowed)
 *      * OFF = 로컬 프로세스단 차단 및 실행 금지 (Blocked - Default security posture)
 */

import {
  AiAgentKey,
  AiAgentProcessInfo,
  REPRESENTATIVE_AI_AGENTS,
  UserAiAgentBlockMap,
  DEFAULT_AI_AGENT_BLOCKS,
  UserUtilityFeatures,
  DEFAULT_USER_UTILITY_FEATURES,
  User,
} from '../types/lmc';

export const REMOTE_DESKTOP_PASSWORD = '192.168.10.212';
export const UTILITY_ADMIN_PASSWORD = '192.168.10.212';
export const AUTHORIZED_ADMIN_IP = '192.168.10.212'; // Retained for display reference

/**
 * Normalizes an IP string (handles IPv6-mapped IPv4 such as ::ffff:192.168.10.212).
 */
export function normalizeIp(ip: string): string {
  if (!ip) return '';
  const trimmed = ip.trim();
  if (trimmed.startsWith('::ffff:')) {
    return trimmed.substring(7);
  }
  return trimmed;
}

/**
 * Validates the Remote Desktop Authentication Password (192.168.10.212).
 * Works regardless of client IP.
 */
export function validateRemoteDesktopPassword(password: string): boolean {
  if (!password) return false;
  return password.trim() === REMOTE_DESKTOP_PASSWORD;
}

export interface RemoteDesktopRequestCheck {
  allowed: boolean;
  requiresPassword: boolean;
  message: string;
}

/**
 * Validates remote desktop control request permission.
 * Now IP-independent: Unlocks when the operator verifies password '192.168.10.212'.
 */
export function validateRemoteDesktopRequest(
  passwordOrVerified: string | boolean,
  targetPeerName?: string
): RemoteDesktopRequestCheck {
  const peerMsg = targetPeerName ? ` (${targetPeerName} 대상)` : '';
  const isUnlocked =
    typeof passwordOrVerified === 'boolean'
      ? passwordOrVerified
      : validateRemoteDesktopPassword(passwordOrVerified);

  if (isUnlocked) {
    return {
      allowed: true,
      requiresPassword: false,
      message: `원격 제어 세션 인증이 완료되었습니다${peerMsg}. 원격 데스크톱 연결을 시작합니다.`,
    };
  }

  return {
    allowed: false,
    requiresPassword: true,
    message: `원격 제어를 구동하려면 보안 인증 비밀번호(${REMOTE_DESKTOP_PASSWORD})를 입력해야 합니다.`,
  };
}

/**
 * Validates whether the given IP is the historical admin IP (for backwards compatibility).
 */
export function isAuthorizedRemoteRequester(ip: string): boolean {
  const norm = normalizeIp(ip);
  return norm === AUTHORIZED_ADMIN_IP;
}

/**
 * Screen Capture is unconditionally active and available upon installing LAN Messenger.
 */
export interface CaptureUsageCheck {
  canUse: boolean;
  message: string;
}

export function evaluateCaptureUsage(): CaptureUsageCheck {
  return {
    canUse: true,
    message: '오픈소스캡쳐 기능이 활성화되어 있으며 자유롭게 사용할 수 있습니다.',
  };
}

/**
 * Backward compatibility helper for capture checks
 */
export function evaluateUserCaptureUsage(): CaptureUsageCheck & { userSpecific: boolean } {
  return {
    canUse: true,
    userSpecific: false,
    message: '오픈소스캡쳐 기능은 모든 사용자에게 기본 활성화되어 있습니다.',
  };
}

/**
 * Validates the Utility Tab Administrator Password (192.168.10.212).
 */
export function validateUtilityPassword(password: string): boolean {
  if (!password) return false;
  return password.trim() === UTILITY_ADMIN_PASSWORD;
}

/**
 * Checks whether a specific AI Agent process is permitted to run on the endpoint.
 * Default: false (OFF = 프로세스 차단 / 실행 방지).
 */
export function isAiAgentProcessAllowed(
  user: { aiAgentBlocks?: UserAiAgentBlockMap } | null | undefined,
  agentKey: AiAgentKey
): boolean {
  if (!user || !user.aiAgentBlocks) {
    return DEFAULT_AI_AGENT_BLOCKS[agentKey] ?? false;
  }
  return user.aiAgentBlocks[agentKey] === true;
}

export interface AiAgentProcessCheck {
  allowed: boolean;
  agent: AiAgentProcessInfo;
  processBinary: string;
  userName: string;
  message: string;
}

/**
 * Validates whether an AI Agent process is permitted or blocked at the endpoint daemon level.
 */
export function validateAiAgentProcess(
  user: User | null | undefined,
  agentKey: AiAgentKey
): AiAgentProcessCheck {
  const agent =
    REPRESENTATIVE_AI_AGENTS.find((a) => a.key === agentKey) ||
    ({
      key: agentKey,
      name: agentKey,
      processBinary: `${agentKey}.exe`,
      category: 'autonomous',
      riskLevel: 'High',
      description: '로컬 자율 실행 에이전트',
      icon: '🤖',
    } as AiAgentProcessInfo);

  const userName = user?.name || '로컬 엔드포인트';
  const allowed = isAiAgentProcessAllowed(user, agentKey);

  if (allowed) {
    return {
      allowed: true,
      agent,
      processBinary: agent.processBinary,
      userName,
      message: `[실행 허용] ${agent.name} (${agent.processBinary}) 프로세스 구동이 허용되어 있습니다.`,
    };
  }

  return {
    allowed: false,
    agent,
    processBinary: agent.processBinary,
    userName,
    message: `[프로세스 실행 차단] '${agent.name}' (${agent.processBinary})\n\nLLM 클라우드 질의는 허용되지만, 로컬 자율 데몬 및 백그라운드 프로세스 구동은 보안 정책에 의해 차단되었습니다.\n\n해제를 원하실 경우 [사용자 정보 > 유틸리티 탭]에서 관리자 인증(비밀번호: ${UTILITY_ADMIN_PASSWORD}) 후 구동을 허용할 수 있습니다.`,
  };
}

/**
 * Backwards compatibility for UserUtilityFeatures & Capture Policy
 */
export type UtilityFeatureKey = keyof UserUtilityFeatures;

export interface UtilityFeatureMetadata {
  key: UtilityFeatureKey;
  label: string;
  shortLabel: string;
  icon: string;
  category: 'system' | 'ai';
  description: string;
}

export const UTILITY_FEATURES_LIST: UtilityFeatureMetadata[] = [
  {
    key: 'remoteDesktop',
    label: '원격제어 (Remote Desktop)',
    shortLabel: '원격제어',
    icon: '🖥️',
    category: 'system',
    description: '192.168.10.212 보안 비밀번호 기반 원격 화면 공유 및 원격 데스크톱 제어',
  },
  {
    key: 'screenCapture',
    label: '오픈소스캡쳐 (OpenSourceCapture)',
    shortLabel: '캡쳐',
    icon: '📸',
    category: 'system',
    description: '화면 캡쳐 스위트 실행 및 단축키(PrintScreen, F11) 사용 (기본 전원 허용)',
  },
  {
    key: 'codexAgent',
    label: 'Codex Agent (코덱스)',
    shortLabel: 'Codex AI',
    icon: '💻',
    category: 'ai',
    description: '코드 분석, 자동완성, 개발 스크립트 작성 및 디버깅 AI 에이전트',
  },
  {
    key: 'claudeAgent',
    label: '클로드 Agent (Claude)',
    shortLabel: '클로드 AI',
    icon: '🧠',
    category: 'ai',
    description: '심층 추론, 업무 보고서 작성 및 대화 요약 AI 에이전트',
  },
  {
    key: 'googleAgent',
    label: '구글 Agent (Gemini)',
    shortLabel: '구글 AI',
    icon: '✨',
    category: 'ai',
    description: '멀티모달 시각 분석, 네트워크 진단 및 실시간 검색 AI 에이전트',
  },
];

export function isUserFeatureEnabled(
  user: { utilityFeatures?: UserUtilityFeatures } | null | undefined,
  feature: UtilityFeatureKey
): boolean {
  if (!user || !user.utilityFeatures) {
    return DEFAULT_USER_UTILITY_FEATURES[feature] ?? true;
  }
  return user.utilityFeatures[feature] !== false;
}

export function canConfigureCapturePolicy(_ip?: string): boolean {
  return true;
}

export function canConfigureUserCapturePolicy(_ip?: string): boolean {
  return true;
}

export function evaluateCapturePolicyChange(
  _requesterIp: string,
  _currentState: boolean,
  targetState: boolean
) {
  return {
    allowed: true,
    nextState: targetState,
    requiredIp: AUTHORIZED_ADMIN_IP,
    currentIp: AUTHORIZED_ADMIN_IP,
    message: '오픈소스캡쳐 기능은 모든 사용자에게 항상 기본 활성화되어 있습니다.',
  };
}

export function evaluateUserCapturePolicyChange(
  _requesterIp: string,
  targetUser: { id: string; name: string },
  targetState: boolean
) {
  return {
    allowed: true,
    targetUserId: targetUser.id,
    targetUserName: targetUser.name,
    nextState: targetState,
    requiredIp: AUTHORIZED_ADMIN_IP,
    currentIp: AUTHORIZED_ADMIN_IP,
    message: `'${targetUser.name}' 사용자의 오픈소스캡쳐 기능이 기본 활성화되어 있습니다.`,
  };
}

export function validateFeatureUsage(
  user: { name?: string; utilityFeatures?: UserUtilityFeatures } | null | undefined,
  feature: UtilityFeatureKey
) {
  const meta = UTILITY_FEATURES_LIST.find((f: UtilityFeatureMetadata) => f.key === feature);
  const enabled = isUserFeatureEnabled(user, feature);
  return {
    allowed: enabled,
    featureKey: feature,
    featureLabel: meta?.label || feature,
    userName: user?.name || '사용자',
    message: enabled
      ? `${meta?.label || feature} 기능을 사용할 수 있습니다.`
      : `${meta?.label || feature} 기능이 차단되었습니다.`,
  };
}
