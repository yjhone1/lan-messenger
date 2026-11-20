import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validateRemoteDesktopRequest,
  evaluateCaptureUsage,
  evaluateUserCaptureUsage,
  isAiAgentProcessAllowed,
  validateAiAgentProcess,
} from './securityPolicy';
import {
  REPRESENTATIVE_AI_AGENTS,
  DEFAULT_AI_AGENT_BLOCKS,
  AiAgentKey,
  User,
} from '../types/lmc';

test('preview consent requires explicit approval, never a fixed password', () => {
  // Verified password
  const verified = validateRemoteDesktopRequest(true, 'Minho Park (Win7)');
  assert.equal(verified.allowed, true);
  assert.equal(verified.requiresPassword, false);
  assert.match(verified.message, /원격 제어 세션 인증이 완료되었습니다/);

  // Boolean verified flag
  const boolVerified = validateRemoteDesktopRequest(true, 'Test Peer');
  assert.equal(boolVerified.allowed, true);

  // Unverified / Wrong password
  const denied = validateRemoteDesktopRequest('wrong_pass', 'Minho Park (Win7)');
  assert.equal(denied.allowed, false);
  assert.equal(denied.requiresPassword, true);
  assert.doesNotMatch(denied.message, /192\.168\.10\.212/);
});

test('evaluateCaptureUsage confirms Screen Capture is unconditionally active upon installation', () => {
  const usage = evaluateCaptureUsage();
  assert.equal(usage.canUse, true);
  assert.match(usage.message, /오픈소스캡쳐 기능이 활성화되어 있으며/);

  const userUsage = evaluateUserCaptureUsage();
  assert.equal(userUsage.canUse, true);
  assert.equal(userUsage.userSpecific, false);
});

test('REPRESENTATIVE_AI_AGENTS contains the 11 representative autonomous agents including opencode', () => {
  assert.equal(REPRESENTATIVE_AI_AGENTS.length, 11);

  const keys: AiAgentKey[] = [
    'autogpt',
    'babyagi',
    'devin',
    'metagpt',
    'crewai',
    'autogen',
    'claudeComputerUse',
    'openaiOperator',
    'agentgpt',
    'chatdev',
    'opencode',
  ];

  keys.forEach((k) => {
    const found = REPRESENTATIVE_AI_AGENTS.find((a) => a.key === k);
    assert.ok(found, `Expected agent with key: ${k}`);
    assert.ok(found.processBinary.length > 0, `Process binary name for ${k} should not be empty`);
    assert.ok(found.riskLevel === 'High' || found.riskLevel === 'Medium');
    assert.ok(found.description.length > 0);
  });
});

test('isAiAgentProcessAllowed and validateAiAgentProcess enforce process-level blocking', () => {
  const sampleUser: Partial<User> = {
    id: 'U-SAMPLE',
    name: '엔드포인트 단말 01',
    aiAgentBlocks: {
      ...DEFAULT_AI_AGENT_BLOCKS,
      autogpt: false,       // 차단(OFF)
      devin: false,         // 차단(OFF)
      opencode: false,      // 차단(OFF)
      openaiOperator: true, // 허용(ON)
    },
  };

  // Blocked agents
  assert.equal(isAiAgentProcessAllowed(sampleUser as User, 'autogpt'), false);
  assert.equal(isAiAgentProcessAllowed(sampleUser as User, 'devin'), false);
  assert.equal(isAiAgentProcessAllowed(sampleUser as User, 'opencode'), false);

  const autogptCheck = validateAiAgentProcess(sampleUser as User, 'autogpt');
  assert.equal(autogptCheck.allowed, false);
  assert.equal(autogptCheck.processBinary, 'autogpt.exe / python -m autogpt');
  assert.match(autogptCheck.message, /프로세스 실행 차단/);
  assert.match(autogptCheck.message, /AutoGPT/);
  assert.doesNotMatch(autogptCheck.message, /192\.168\.10\.212/);

  const opencodeCheck = validateAiAgentProcess(sampleUser as User, 'opencode');
  assert.equal(opencodeCheck.allowed, false);
  assert.equal(opencodeCheck.processBinary, 'opencode.exe / opencode-cli / opencode');
  assert.match(opencodeCheck.message, /OpenCode/);

  // Allowed agent
  assert.equal(isAiAgentProcessAllowed(sampleUser as User, 'openaiOperator'), true);
  const operatorCheck = validateAiAgentProcess(sampleUser as User, 'openaiOperator');
  assert.equal(operatorCheck.allowed, true);
  assert.match(operatorCheck.message, /실행 허용/);
});

test('new installs and missing agent policies default to allow', () => {
  for(const agent of REPRESENTATIVE_AI_AGENTS) {
    assert.equal(DEFAULT_AI_AGENT_BLOCKS[agent.key], true);
    assert.equal(isAiAgentProcessAllowed(undefined, agent.key), true);
  }
  assert.equal(validateRemoteDesktopRequest('192.168.10.212').allowed, false);
});
