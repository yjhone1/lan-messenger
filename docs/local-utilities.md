# 로컬 유틸리티 설정과 확인 방법

## 설정

기본 언어는 한국어입니다. 기존 설정에서 영어를 직접 선택했다면 **Tools → Preferences → General → Language**에서 **Korean**을 선택하십시오.

**도구 → 유틸리티 - 현재 PC → AI 에이전트 설정...**에서 현재 PC만 설정합니다.
메뉴를 열 때마다 이 PC에 설정한 관리자 비밀번호를 입력해야 합니다. 취소하거나 비밀번호가 틀리면 설정 창이 열리지 않으며, 오입력 후에는 30초 뒤 재시도할 수 있습니다.
비밀번호가 아직 없으면 **유틸리티 → 관리자 비밀번호...**에서 먼저 설정하십시오. Windows 로그인 비밀번호와는 별개입니다.
체크 = 허용, 체크 해제 = 차단입니다. 처음 설치 시 11개 항목을 모두 허용합니다.
현재 로그인 사용자의 설정 파일 `Security/AiAgents` 그룹에 저장합니다.
상대방 PC의 설정을 변경하거나 정책을 전송하는 기능은 없습니다.

## AI 에이전트 직접 추가

1. **도구 → 유틸리티 - 현재 PC → AI 에이전트 설정...**를 열고 관리자 비밀번호로 인증합니다.
2. **에이전트 추가...**를 누릅니다.
3. **표시 이름**에 표시할 이름(예: `My Agent`)을 입력합니다.
4. **실행 파일명**에 실제 프로세스 실행 파일명(예: `myagent.exe, myagent-cli.exe`)을 쉼표로 구분해 입력하고 **저장**를 누릅니다. Windows 작업 관리자 → **세부 정보 → 이름**에서 확인할 수 있습니다.
5. 새 항목은 **허용**으로 추가됩니다. 차단하려면 체크를 해제합니다.

사용자 추가 항목 옆의 **수정...**로 이름·실행 파일명을 수정하고 **삭제**로 삭제합니다. 수정하면 허용으로 돌아가므로 필요한 경우 다시 체크를 해제하십시오. 삭제하면 해당 항목의 차단이 중단됩니다. 기본 제공 항목은 삭제·수정할 수 없습니다.

실행 파일명은 대소문자를 구분하지 않는 정확한 이름 비교입니다. 경로·와일드카드·명령어는 입력하지 않습니다. 여러 파일명은 항목당 최대 16개, 사용자 항목은 최대 100개입니다. 같은 파일명을 중복 등록할 수 없습니다.
`python.exe`, `node.exe` 같은 공용 실행기나 브라우저·주요 시스템 프로세스는 등록할 수 없습니다. Windows에서는 명령줄을 검사하지 않으므로 `python -m myagent`처럼 공용 실행기 안에서 동작하는 에이전트는 이 기능으로 구분할 수 없습니다.
등록 정보는 현재 로그인 사용자의 로컬 설정 `Security/CustomAiAgents`에 저장되어 재시작 후 유지됩니다. 원격으로 추가·수정·삭제하는 기능은 없습니다.

## Windows 명령 예시

PowerShell에서 실행 파일을 지정합니다. 설치 위치가 다르면 경로를 바꾸십시오.

```powershell
$messenger = 'C:\Program Files\LAN Messenger\lmc.exe'

# OpenCode 차단 (실행 중인 동일 사용자 프로세스도 종료될 수 있음)
& $messenger /agent-policy=opencode=block

# OpenCode 허용
& $messenger /agent-policy=opencode=allow

# 모두 허용
& $messenger /agents-allow-all

# 현재 정책을 대화상자로 표시
& $messenger /agent-status
```

`/agent-status`는 설정된 정책이며, 실제 프로세스 종료 성공의 증거는 아닙니다.
실행 중이면 명령을 로컬 인스턴스에 전달하고, 실행 중이 아니면 메신저를 시작합니다.
`block`과 `/quit`을 함께 쓰면 지속적인 감시가 실행되지 않습니다.

| 키 | 대상 |
|---|---|
| `autogpt` | AutoGPT |
| `babyagi` | BabyAGI |
| `devin` | Devin / OpenHands |
| `metagpt` | MetaGPT |
| `crewai` | CrewAI |
| `autogen` | Microsoft AutoGen |
| `claudeComputerUse` | Claude Computer Use |
| `openaiOperator` | OpenAI Operator / Codex Agent |
| `agentgpt` | AgentGPT |
| `chatdev` | ChatDev |
| `opencode` | OpenCode |

## 관리자 화면에서 확인

상대방의 사용자 정보 → 관리자 상태 조회에서 대상 PC의 관리자 비밀번호로 인증하면 최근 차단 성공·실패와 연결·오류 기록을 볼 수 있습니다.
`/trace`는 필요하지 않습니다. 조회는 읽기 전용이며 새로고침할 때마다 인증합니다.
[관리자 비밀번호 설정 및 조회 안내](administrator.md)를 참고하십시오.

## 로컬 로그로 실제 차단 확인

1. 작업을 저장한 뒤 시험할 에이전트 하나만 선택합니다.
2. 메신저를 완전히 종료한 뒤 `/trace`로 시작해 로그를 켭니다. 실행 중인 인스턴스에 `/trace`를 전달하는 것으로는 로그가 켜지지 않습니다.
3. 로컬 메뉴나 `/agent-policy=<key>=block`으로 해당 항목을 차단합니다.
4. 해당 에이전트를 실행하고 약 3초 이상 기다립니다. 로컬 유틸리티 창의 마지막 종료 표시와 로그를 확인합니다.
5. 허용으로 돌리거나 메신저를 완전히 종료한 뒤 에이전트를 다시 실행해 유지되는지 확인합니다.

```powershell
Get-Process -Name opencode,opencode-cli -ErrorAction SilentlyContinue

# Windows 기본 로그 위치
$logFolder = Join-Path $env:LOCALAPPDATA 'LAN Messenger\LAN Messenger\logs'
$latestLog = Get-ChildItem -LiteralPath $logFolder -Filter 'lmc_*.log' |
    Sort-Object LastWriteTime -Descending | Select-Object -First 1
if ($latestLog) {
    Select-String -LiteralPath $latestLog.FullName -Pattern 'AiAgentBlocker:'
}
```

성공 로그는 `terminated blocked agent process`, 실패 로그는 `failed to ...`를 포함합니다.
Linux `SIGTERM` 성공은 신호 전달 성공이므로 실제 프로세스 소멸도 확인해야 합니다.
권한이 높은 프로세스는 종료하지 못할 수 있습니다. Windows는 실행 파일 이름을,
Linux는 `/proc` 프로세스 이름·명령줄을 비교합니다. 이름 변경·다른 런처로 우회할 수 있습니다.
일반 브라우저와 클라우드 LLM API 사용을 막는 기능은 아닙니다.

## 종료·삭제

- 메신저 종료: 감시 타이머 중단. 저장된 정책은 다음 실행까지 유지합니다.
- Windows 삭제 프로그램: `/agents-allow-all /unsync /quit`으로 저장 정책도 모두 허용으로 바꾸고 감시를 중단합니다.
- 실행 파일만 수동 삭제: 실행 중인 메신저도 종료해야 감시가 끝납니다.
- 방화벽·서비스·예약 작업·영구 실행 금지 규칙은 만들지 않습니다. 종료된 에이전트는 직접 다시 실행해야 합니다.

## 개발자 회귀 테스트

`ctest`로 기본 허용, 정책 직렬화, 원격 정책 무시, Strict 변조·재전송 거부,
TLS 토큰·인증서·패킷 상한을 확인합니다.
실제 프로세스 종료 생명주기 테스트는 호스트 작업을 방해하지 않도록 기본적으로 건너뜁니다.
Linux의 별도 PID 네임스페이스 안에서만 다음처럼 실행하십시오.

```sh
sudo unshare --pid --fork --mount-proc env LMC_ISOLATED_PROCESS_TEST=1 \
  QT_QPA_PLATFORM=offscreen ./build/tests/tst_security
```
