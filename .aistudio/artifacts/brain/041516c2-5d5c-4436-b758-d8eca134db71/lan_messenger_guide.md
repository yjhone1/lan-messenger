# LAN Messenger v1.4.0.3 개발 환경 & 아키텍처 가이드 (오픈소스캡쳐 & AI Agent 차단 통합판)

이 문서는 **LAN Messenger `v1.4.0.3`**에서 통합된 **오픈소스캡쳐(OpenSourceCapture) 화면 캡처 스위트**, **시스템 탭 하단 원격 제어(IP 무관 비밀번호: 192.168.10.212 인증)**, **사용자 정보 → 유틸리티 탭(비밀번호: 192.168.10.212) 기반 10대 대표 자율 AI Agent 로컬 프로세스 구동/설치 차단(Process Blocker)**, **Windows C++ MSVC 빌드 오류 완전 해결**을 정리한 종합 엔지니어링 가이드입니다.

---

## 1. 오픈소스캡쳐(OpenSourceCapture) 화면 캡처 & 동영상 녹화 기능 구현 내역

### 1) 무제한 즉시 사용 (No On/Off Restrictions)
- 사용자의 요청에 따라 캡처 활성/비활성 제어 권한을 전면 해제하였습니다.
- LAN Messenger 설치 시 모든 사용자가 별도의 권한 승인이나 IP 제한 없이 즉시 오픈소스캡쳐를 자유롭게 사용할 수 있습니다.

### 2) 네이티브 C++ Qt 구현 (`lmc/src/capture/`)
- **`capturedefinitions.h`**:
  - 7가지 캡처 영역 정의 (`CA_FullScreen`, `CA_Area`, `CA_Drag`, `CA_ActiveWindow`, `CA_Control`, `CA_WebPage`, `CA_Color`)
  - 저장 형식 (`CF_PNG`, `CF_JPG`, `CF_GIF`, `CF_BMP`, `CF_WebP`, `CF_TXT`, `CF_Clipboard`, `CF_Floating`, `CF_Printer`)
  - 파일명 명명 규칙 (`NR_Sequential1` K-001 순차적, `NR_Sequential2` 빈 번호 채우기, `NR_DateTime` K-YYYYMMDD-HHMMSS)
  - 색상 변환 함수: Delphi/Windows TColor 형식(`$00BBGGRR`) 변환기
  - **단축키 충돌 방지기 (`isShortcutConflictingWithLmc`)**: LAN Messenger 필수 단축키(`Ctrl+G`, `Ctrl+B`, `Ctrl+H`, `Ctrl+J`, `Ctrl+P`, `Ctrl+S`, `Enter/Ctrl+Enter`) 침범 방지
- **`capturewindow.h` / `capturewindow.cpp`**:
  - **`lmcCaptureWindow`**: 오픈소스캡쳐 메인 플로팅 제어창
  - **`lmcAreaFrameWidget`**: 영역화면 캡처용 테두리 창 (방향키 1px 이동, `Ctrl+방향키` 10px 이동, `Shift+방향키` 크기 조절)
  - **`lmcDragOverlayWidget`**: 마우스 드래그 영역 선택 오버레이
  - **`lmcFloatingWidget`**: 캡처 이미지를 화면 항상 위에 띄워 두는 플로팅 창

---

## 2. 버전 정보 동기화 현황 (`1.4.0.3`)

모든 빌드 및 패키징 설정 파일이 `1.4.0.3`으로 완전히 통일되었습니다.

| 파일 경로 | 설정 항목 | 적용 값 |
| :--- | :--- | :--- |
| `/VERSION` | 프로젝트 버전 | `1.4.0.3` |
| `CMakeLists.txt` | project version | `1.4.0.3` |
| `lmc/CMakeLists.txt` | LMC_VERSION | `1.4.0.3` |
| `lmc/src/core/definitions.h` | IDA_VERSION / LMC_APP_VERSION | `1.4.0.3` |
| `lmc/src/app/lmcwin32.rc` | FILEVERSION / PRODUCTVERSION | `1,4,0,3` / `"1.4.0.3"` |
| `lmc/setup/win32/setup.nsi` | ProductVersion / InstallerVersion | `1.4.0.3` |
| `LANMessenger.pro` | IDA_VERSION | `1.4.0.3` |
| `.github/workflows/windows-release.yml` | 릴리스 환경변수 LMC_VERSION | `1.4.0.3` |
| `src/types/lmc.ts` | VERSION_CONFIG | `v1.4.0.3` (`1.4.0.3`) |

---

## 3. 원격 제어 & 10대 대표 자율 AI Agent 프로세스 차단 아키텍처

### 1) 원격 제어 (시스템 탭 하단 재배치 & 비밀번호 인증)
- **위치**: `사용자 정보 → 시스템(System) 탭` 최하단에 배치.
- **인증 원칙**: 접속 클라이언트의 IP 주소와 무관하게 보안 비밀번호 **`192.168.10.212`**를 입력해야만 원격 세션이 활성화되어 원격 데스크톱을 사용할 수 있습니다.
- **채팅창 및 컨텍스트 메뉴**: 채팅 툴바나 사용자 우클릭 메뉴에서 원격 제어를 시도할 때도 동일하게 `RemoteDesktopAuthModal`이 호출되어 비밀번호 `192.168.10.212` 입력을 요구합니다.

### 2) 사용자 정보 → [유틸리티] 탭 (10대 대표 AI Agent 로컬 프로세스 구동 차단)
- **접근 경로 (본인 및 대화상대)**:
  - **본인 (로컬 사용자)**: 메인 화면 상단 프로필 카드의 **`[내 정보 (유틸리티)]`** 버튼 또는 상단 메뉴의 **`도구 → 내 정보 및 시스템 유틸리티...`**를 클릭하여 내 PC의 시스템 정보 및 AI Agent 차단 상태를 직접 확인/설정합니다.
  - **대화상대 (원격 피어)**: 대화상대 목록에서 사용자를 선택하고 `[정보]`를 클릭하거나 채팅창에서 열어 원격 사용자의 상태를 조회/관리합니다.
- **배경 및 목적**: 일반 LLM(OpenAI/Anthropic/Gemini 등 순수 클라우드 질의 API)의 사용은 전면 허용하되, 사용자 단말 로컬에서 백그라운드 루프, 쉘 명령어 임의 실행, 파일 시스템 조작을 수행하는 **자율 AI Agent 데몬은 관리/보안 리스크가 크므로 프로세스단에서 설치 및 구동을 차단(OFF)**합니다.
- **보안 인증**: 유틸리티 탭 진입 시 관리자 비밀번호인 **`192.168.10.212`**를 입력해야 설정 잠금이 해제됩니다. 본인 단말이든 원격 대화상대이든 비밀번호 입력 후 직접 토글하거나 일괄 제어할 수 있습니다.
- **10대 대표 자율 AI Agent 프로세스 목록**:

| 번호 | 에이전트 명칭 | 실행 프로세스 바이너리 명 | 위험도 | 분류 | 위험 특성 및 데몬 설명 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | **AutoGPT** | `autogpt.exe / python -m autogpt` | High | 자율 루프 | 목표 지향 자율 루프, 로컬 쉘 명령어 및 파일 시스템 임의 조작 백그라운드 데몬 |
| 2 | **BabyAGI** | `babyagi.exe / babyagi.py` | High | 자율 루프 | 작업 자동 분해 및 무한 하위 태스크 큐 자율 실행 백그라운드 프로세스 |
| 3 | **Devin / OpenHands** | `openhands-daemon / devin-agent` | High | 코딩 제어 | 자율 코딩 엔지니어링 에이전트, 로컬 터미널 및 Docker 컨테이너 자율 제어 |
| 4 | **MetaGPT** | `metagpt-worker / python -m metagpt` | High | 코딩 제어 | PM/아키텍트/엔지니어 등 멀티 에이전트 협업 기반 로컬 컴파일 및 소스 생성 |
| 5 | **CrewAI** | `crewai-exec / crewai_runner` | Medium | 자율 루프 | 역할 기반 멀티 에이전트 오케스트레이션 및 로컬 툴·파이썬 스크립트 자율 호출 |
| 6 | **Microsoft AutoGen** | `autogen-agent / pyautogen` | High | 자율 루프 | 다중 에이전트 간 자율 대화 및 로컬 코드 자동 실행기(Code Executor) |
| 7 | **Claude Computer Use** | `claude-computer-use / anthropic-desktop` | High | 시스템 제어 | OS 화면 실시간 캡처, 마우스 클릭/드래그 및 키보드 입력 직접 제어 에이전트 |
| 8 | **OpenAI Operator / Codex** | `operator-daemon / codex-runner` | High | 시스템 제어 | 브라우저 자율 탐색, 웹 폼 자동 작성 및 로컬 개발 환경 제어 에이전트 |
| 9 | **AgentGPT** | `agentgpt-node / agentgpt.exe` | Medium | 자율 루프 | 웹/로컬 환경 자율 목표 달성 및 지속적인 하위 프로세스 생성 에이전트 |
| 10 | **ChatDev** | `chatdev-run / python run.py` | High | 코딩 제어 | 가상 소프트웨어 개발사 시뮬레이션, 로컬 컴파일러 및 테스트 환경 자율 구동 |

- **토글 동작**:
  - `● 로컬 구동 허용 (ON)`: 해당 단말에서 해당 프로세스 바이너리의 백그라운드 데몬 실행 허용
  - `■ 프로세스단 차단 (OFF)`: 프로세스 실행 차단 및 데몬 종료 (기본 권장 보안 상태)
- **일괄 설정**:
  - `[✕ 전체 프로세스 차단]`: 10개 에이전트 프로세스 전체 일괄 차단(OFF)
  - `[✓ 전체 프로세스 허용]`: 10개 에이전트 프로세스 전체 일괄 허용(ON)

---

## 4. Windows GitHub Actions 빌드 오류 해결 내역

### 1) 발생 원인
- MSVC 컴파일러에서 `userinfowindow.cpp` 빌드 중 오류 발생:
  - `error C2039: 'ipAddress': is not a member of 'lmcSettings'`

### 2) C++ 소스 코드 수정 완료 (`lmc/src/gui/contacts/userinfowindow.cpp`)
- `QNetworkInterface::allAddresses()`를 순회하여 안전한 IPv4 처리를 수행.
- `requestRemoteDesktop()` 슬롯을 신설하여 비밀번호 `192.168.10.212`를 `QInputDialog::getText()`로 검증하도록 구현.
- 캡처 기능은 모든 사용자에게 항상 기본 허용되도록 간소화.

---

## 5. 단위 테스트 및 검증 결과

- **단위 테스트 (Unit Tests)**: 20개 테스트 100% 통과 (`0 fail`).
  - IP 무관 비밀번호 `192.168.10.212` 기반 원격 제어 세션 인증 검증.
  - 오픈소스캡쳐 무제한 기본 사용 검증.
  - 10대 대표 자율 AI Agent 목록, 프로세스 바이너리 식별자 및 프로세스단 차단/허용 로직 검증.
- **웹 앱 빌드 & 린트**: TypeScript 컴파일 성공, Lint 오류 0건.
