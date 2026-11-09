/**
 * Security & Permission Policy Engine for LAN Messenger v1.4.0.1
 * 
 * Enforces:
 * 1. Only 192.168.10.212 is authorized to initiate/request remote desktop control.
 * 2. Only 192.168.10.212 is authorized to toggle OpenSourceCapture ON/OFF (enable/disable usage).
 * 3. All other IPs are restricted and receive informative policy notifications.
 */

export const AUTHORIZED_ADMIN_IP = '192.168.10.212';

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
 * Validates whether the given IP is the authorized administrator / remote requester.
 */
export function isAuthorizedRemoteRequester(ip: string): boolean {
  const norm = normalizeIp(ip);
  return norm === AUTHORIZED_ADMIN_IP;
}

/**
 * Validates whether the given IP is authorized to configure OpenSourceCapture ON/OFF policy.
 */
export function canConfigureCapturePolicy(ip: string): boolean {
  const norm = normalizeIp(ip);
  return norm === AUTHORIZED_ADMIN_IP;
}

export interface RemoteDesktopRequestCheck {
  allowed: boolean;
  requiredIp: string;
  currentIp: string;
  message: string;
}

/**
 * Validates remote desktop control request permission.
 */
export function validateRemoteDesktopRequest(
  requesterIp: string,
  targetPeerName?: string
): RemoteDesktopRequestCheck {
  const norm = normalizeIp(requesterIp);
  const isAllowed = norm === AUTHORIZED_ADMIN_IP;
  const peerMsg = targetPeerName ? ` (${targetPeerName} 대상)` : '';

  if (isAllowed) {
    return {
      allowed: true,
      requiredIp: AUTHORIZED_ADMIN_IP,
      currentIp: norm,
      message: `원격 제어 요청 권한이 승인되었습니다${peerMsg}. (인가 IP: ${AUTHORIZED_ADMIN_IP})`,
    };
  }

  return {
    allowed: false,
    requiredIp: AUTHORIZED_ADMIN_IP,
    currentIp: norm,
    message: `원격 제어 요청은 관리자 IP(${AUTHORIZED_ADMIN_IP})에서만 허용됩니다.\n현재 사용자 IP: ${norm || '알 수 없음'}\n원격 제어를 요청하려면 관리자 IP(192.168.10.212)로 접속해야 합니다.`,
  };
}

export interface CapturePolicyChangeResult {
  allowed: boolean;
  nextState: boolean;
  requiredIp: string;
  currentIp: string;
  message: string;
}

/**
 * Validates and computes OpenSourceCapture ON/OFF policy change.
 */
export function evaluateCapturePolicyChange(
  requesterIp: string,
  currentState: boolean,
  targetState: boolean
): CapturePolicyChangeResult {
  const norm = normalizeIp(requesterIp);
  const isAllowed = norm === AUTHORIZED_ADMIN_IP;

  if (isAllowed) {
    return {
      allowed: true,
      nextState: targetState,
      requiredIp: AUTHORIZED_ADMIN_IP,
      currentIp: norm,
      message: `오픈소스캡쳐 기능이 관리자(${AUTHORIZED_ADMIN_IP})에 의해 ${targetState ? '사용 허용(ON)' : '사용 차단(OFF)'} 상태로 변경되었습니다.`,
    };
  }

  return {
    allowed: false,
    nextState: currentState,
    requiredIp: AUTHORIZED_ADMIN_IP,
    currentIp: norm,
    message: `오픈소스캡쳐 기능의 ON/OFF 설정은 관리자 IP(${AUTHORIZED_ADMIN_IP})에서만 변경할 수 있습니다.\n현재 사용자 IP: ${norm || '알 수 없음'}`,
  };
}

export interface CaptureUsageCheck {
  canUse: boolean;
  message: string;
  requiredAdminIp: string;
}

/**
 * Evaluates whether a user can use OpenSourceCapture under the current global policy.
 */
export function evaluateCaptureUsage(isFeatureEnabled: boolean): CaptureUsageCheck {
  if (isFeatureEnabled) {
    return {
      canUse: true,
      message: '오픈소스캡쳐 기능을 사용할 수 있습니다.',
      requiredAdminIp: AUTHORIZED_ADMIN_IP,
    };
  }

  return {
    canUse: false,
    message: `오픈소스캡쳐 사용 불가: 관리자(${AUTHORIZED_ADMIN_IP})에 의해 오픈소스캡쳐 기능 사용이 비활성화(차단)되어 있습니다.`,
    requiredAdminIp: AUTHORIZED_ADMIN_IP,
  };
}

export interface UserCapturePolicyChangeResult {
  allowed: boolean;
  targetUserId: string;
  targetUserName: string;
  nextState: boolean;
  requiredIp: string;
  currentIp: string;
  message: string;
}

/**
 * Validates whether the given requester IP can configure a user's capture ON/OFF permission.
 */
export function canConfigureUserCapturePolicy(requesterIp: string): boolean {
  return canConfigureCapturePolicy(requesterIp);
}

/**
 * Validates and evaluates changing an individual user's OpenSourceCapture permission.
 * Strictly permitted ONLY for 192.168.10.212.
 */
export function evaluateUserCapturePolicyChange(
  requesterIp: string,
  targetUser: { id: string; name: string; captureEnabled?: boolean },
  targetState: boolean
): UserCapturePolicyChangeResult {
  const norm = normalizeIp(requesterIp);
  const isAllowed = norm === AUTHORIZED_ADMIN_IP;

  if (isAllowed) {
    return {
      allowed: true,
      targetUserId: targetUser.id,
      targetUserName: targetUser.name,
      nextState: targetState,
      requiredIp: AUTHORIZED_ADMIN_IP,
      currentIp: norm,
      message: `[관리자 ${AUTHORIZED_ADMIN_IP}] '${targetUser.name}' 사용자의 오픈소스캡쳐 기능이 ${
        targetState ? '사용 허용(ON)' : '사용 차단(OFF)'
      } 상태로 설정되었습니다.`,
    };
  }

  const currentState = targetUser.captureEnabled !== false;
  return {
    allowed: false,
    targetUserId: targetUser.id,
    targetUserName: targetUser.name,
    nextState: currentState,
    requiredIp: AUTHORIZED_ADMIN_IP,
    currentIp: norm,
    message: `사용자별 캡쳐 권한 설정은 관리자 IP(${AUTHORIZED_ADMIN_IP})에서만 가능합니다.\n현재 IP: ${norm || '알 수 없음'}\n대상 사용자: ${targetUser.name}`,
  };
}

/**
 * Evaluates whether a specific user can use OpenSourceCapture, taking into account
 * both the global policy and the user's individual permission.
 */
export function evaluateUserCaptureUsage(
  user: { id?: string; name?: string; captureEnabled?: boolean } | null | undefined,
  globalFeatureEnabled: boolean
): CaptureUsageCheck & { userSpecific: boolean } {
  // 1. Check global policy
  if (!globalFeatureEnabled) {
    return {
      canUse: false,
      userSpecific: false,
      message: `오픈소스캡쳐 사용 불가: 관리자(${AUTHORIZED_ADMIN_IP})에 의해 오픈소스캡쳐 기능 전체가 비활성화(차단)되어 있습니다.`,
      requiredAdminIp: AUTHORIZED_ADMIN_IP,
    };
  }

  // 2. Check user-specific policy (defaults to true if undefined)
  if (user && user.captureEnabled === false) {
    const userName = user.name || '현재 사용자';
    return {
      canUse: false,
      userSpecific: true,
      message: `오픈소스캡쳐 사용 불가: '${userName}' 사용자는 관리자(${AUTHORIZED_ADMIN_IP})에 의해 캡쳐 사용 권한이 개별 차단(OFF)되었습니다.`,
      requiredAdminIp: AUTHORIZED_ADMIN_IP,
    };
  }

  return {
    canUse: true,
    userSpecific: false,
    message: '오픈소스캡쳐 기능을 사용할 수 있습니다.',
    requiredAdminIp: AUTHORIZED_ADMIN_IP,
  };
}

