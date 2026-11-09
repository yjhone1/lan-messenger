# LAN Messenger v1.4.0.1 개발 환경 & 아키텍처 가이드 (오픈소스캡쳐 통합판)

이 문서는 **LAN Messenger `v1.4.0.1`**에서 새롭게 통합된 **오픈소스캡쳐(OpenSourceCapture) 화면 캡처 및 동영상 녹화 스위트**, **OpenSSL 3.0 ↔ 1.0 호환성 아키텍처**, **원격 데스크톱 제어(Remote Desktop)** 기능과 빌드 환경을 정리한 가이드입니다.

---

## 1. 오픈소스캡쳐(OpenSourceCapture) 화면 캡처 & 동영상 녹화 기능 구현 내역

### 1) 네이티브 C++ Qt 구현 (`lmc/src/capture/`)
- **`capturedefinitions.h`**:
  - 7가지 캡처 영역 정의 (`CA_FullScreen`, `CA_Area`, `CA_Drag`, `CA_ActiveWindow`, `CA_Control`, `CA_WebPage`, `CA_Color`)
  - 저장 형식 (`CF_PNG`, `CF_JPG`, `CF_GIF`, `CF_BMP`, `CF_WebP`, `CF_TXT`, `CF_Clipboard`, `CF_Floating`, `CF_Printer`)
  - 파일명 명명 규칙 (`NR_Sequential1` K-001 순차적, `NR_Sequential2` 빈 번호 채우기, `NR_DateTime` K-YYYYMMDD-HHMMSS)
  - 색상 변환 함수: Delphi/Windows TColor 형식(`$00BBGGRR`) 변환기
  - **단축키 충돌 방지기 (`isShortcutConflictingWithLmc`)**: LAN Messenger 필수 단축키(`Ctrl+G`, `Ctrl+B`, `Ctrl+H`, `Ctrl+J`, `Ctrl+P`, `Ctrl+S`, `Enter/Ctrl+Enter`)를 절대 침범하지 않도록 보호
- **`capturewindow.h` / `capturewindow.cpp`**:
  - **`lmcCaptureWindow`**: 오픈소스캡쳐 메인 플로팅 제어창 (영역 콤보, 포맷 콤보, 품질 선택, 캡처/REC 버튼, 폴더열기, 환경설정)
  - **`lmcAreaFrameWidget`**: 영역화면 캡처용 테두리 창. 
    - 방향키(1px 이동), `Ctrl+방향키`(10px 이동), `Shift+방향키`(1px 크기 조절)
    - 프리셋 크기 (320x240, 640x480, 800x600, 1024x768, 1280x720 HD, 1920x1080 FHD)
    - 상단 머리띠(현재 크기 표시, REC/캡처 버튼, 닫기)
  - **`lmcDragOverlayWidget`**: 마우스 드래그 영역 선택 오버레이
  - **`lmcFloatingWidget`**: 캡처 이미지를 화면 항상 위에 띄워 두는 플러팅 창
  - 색상 추출 시 클립보드에 HEX, RGB, TColor 코드 자동 복사
- **LAN Messenger UI 연동**:
  - **메인 윈도우 (`lmcMainWindow`)**:
    - 메뉴바 `Tools` → `Screen Capture (OpenSourceCapture)...`
    - 메인 툴바 카메라/도구 아이콘 버튼
    - 트레이 메뉴 `Screen Capture (OpenSourceCapture)...`
    - `PrintScreen` 및 `F11` 단축키 등록 (`new QShortcut`)
  - **채팅 윈도우 (`lmcChatWindow`)**:
    - 채팅 툴바에 캡처 버튼 추가
    - 캡처 완료 시 채팅 상대방에게 캡처 이미지를 즉시 파일로 전송 연동

### 2) 웹 시뮬레이터 구현 (`src/`)
- **전역 단축키 핸들러 (`src/App.tsx`)**:
  - `window.addEventListener('keydown')`을 통해 `PrintScreen`, `F11`, `Ctrl+Shift+S` 감지
  - 브라우저 기본 동작 차단(`e.preventDefault()`) 및 오픈소스캡쳐 창 자동 복원/실행
- **시각 피드백 & 토스트 알림**:
  - 셔터 플래시(카메라 섬광 효과)
  - 캡처 완료 팝업 알림 (파일명, 크기, 미리보기 썸네일, 폴더열기 단추)
  - 오픈소스캡쳐 창이 닫혀 있을 때도 우측 하단에 대기 상태 배지 제공

---

## 2. 버전 정보 동기화 현황 (`1.4.0.1`)

모든 빌드 및 패키징 설정 파일이 `1.4.0.1`로 완전히 통일되었습니다.

| 파일 경로 | 설정 항목 | 적용 값 |
| :--- | :--- | :--- |
| `/VERSION` | 프로젝트 버전 | `1.4.0.1` |
| `CMakeLists.txt` | project version | `1.4.0.1` |
| `lmc/CMakeLists.txt` | LMC_VERSION | `1.4.0.1` |
| `lmc/src/core/definitions.h` | IDA_VERSION / LMC_APP_VERSION | `1.4.0.1` |
| `lmc/src/app/lmcwin32.rc` | FILEVERSION / PRODUCTVERSION | `1,4,0,1` / `"1.4.0.1"` |
| `lmc/setup/win32/setup.nsi` | ProductVersion / InstallerVersion | `1.4.0.1` |
| `LANMessenger.pro` | IDA_VERSION | `1.4.0.1` |
| `.github/workflows/windows-release.yml` | 릴리스 환경변수 LMC_VERSION | `1.4.0.1` |
| `src/types/lmc.ts` | VERSION_CONFIG | `v1.4.0.1` (`1.4.0.1`) |

---

## 3. 원격 데스크톱 & 오픈소스캡쳐 보안 및 권한 정책 (`192.168.10.212` 전용)

사용자의 보안 요구사항에 따라 특정 관리자 IP(`192.168.10.212`)에만 권한을 부여하도록 시스템 전반에 접근 제어가 적용되었습니다.

### 1) 원격 데스크톱 제어 요청 (`192.168.10.212` 전용)
- **인가된 요청자 IP**: `192.168.10.212`
- **동작 방식**:
  - 원격 데스크톱 제어 연결을 요청할 수 있는 권한은 오직 `192.168.10.212`에만 주어집니다.
  - 타 IP(예: `192.168.1.42`, `192.168.1.104` 등)에서 원격 제어를 요청하려고 시도하면 보안 경고 알림(`SecurityAlertModal`)과 함께 즉시 차단됩니다.
  - C++ `RemoteServer` 수신 소켓(`onNewConnection`)에서도 연결 클라이언트의 IP가 `192.168.10.212`가 아닐 경우 접속을 즉시 강제 종료(reject)합니다.

### 2) 오픈소스캡쳐 기능 ON/OFF 제어 (`192.168.10.212` 전용)
- **기능 활성화/비활성화(ON/OFF) 권한**: 오직 `192.168.10.212` 관리자만 변경 가능
- **사용 가능/차단 제어**:
  - 관리자(`192.168.10.212`)가 오픈소스캡쳐를 **OFF(사용 차단)**로 설정하면, 모든 클라이언트에서 화면 캡쳐 및 단축키 실행이 차단됩니다.
  - 차단 상태에서 단축키(`PrintScreen`, `F11`)를 누르거나 메뉴/툴바 버튼을 누르면:
    - `"오픈소스캡쳐 사용 불가: 관리자(192.168.10.212)에 의해 기능 사용이 비활성화(차단)되어 있습니다."` 안내 팝업이 노출됩니다.
  - 오직 `192.168.10.212` 접속자만이 환경설정(`SettingsDialog`의 `보안 및 권한 정책` 탭) 및 오픈소스캡쳐 플로팅 바에서 **ON(사용 허용)**으로 복구할 수 있습니다.

### 3) 사용자 정보 -> 시스템 정보 창에서 사용자별 캡쳐 ON/OFF 제어 (`192.168.10.212` 전용)
- **위치**: 사용자 목록에서 사용자 더블클릭 또는 우클릭 `정보 보기` → `시스템` 탭 하단
- **기능 설명**:
  - 특정 사용자별로 오픈소스캡쳐 기능(단축키 및 캡쳐 실행)의 사용 가능(ON) / 사용 차단(OFF) 상태를 개별적으로 제어할 수 있습니다.
  - **설정 권한 제한**:
    - 오직 관리자 IP인 **`192.168.10.212`** 접속자에게만 토글 버튼(`[캡쳐 기능 차단(OFF)하기]` / `[캡쳐 기능 허용(ON)하기]`)이 활성화됩니다.
    - 일반 IP(`192.168.1.42` 등)에서는 설정 버튼이 잠금(`disabled`) 상태로 표시되며, `🔒 관리자(192.168.10.212)에서만 설정 가능` 경고 라벨이 표시됩니다.
  - **사용 차단(OFF)된 사용자의 동작**:
    - 관리자가 해당 사용자의 캡쳐를 차단(OFF)하면, 해당 사용자는 오픈소스캡쳐 실행, 단축키(`PrintScreen`, `F11`), 채팅창 내 캡쳐 시도시 개별 차단 보안 알림 모달이 표시되며 사용이 차단됩니다.

### 4) 웹 시뮬레이터 실시간 검증 기능
- 상단 헤더바에 **[내 IP / 권한 배지]** 및 **[IP 전환 단추]**가 제공되어, `192.168.10.212(관리자)`와 `192.168.1.42(일반 IP)`를 1클릭으로 즉시 전환하며 권한 허용/차단 동작을 실시간으로 테스트할 수 있습니다.

---

## 4. 빌드 및 테스트 확인

- **C++ Qt 빌드 파일 등록**: `lmc/CMakeLists.txt`와 `LANMessenger.pro`에 `capturewindow.cpp`, `capturedefinitions.h`, `capturewindow.h` 등록 완료
- **웹 앱 빌드 & 린트**: TypeScript 컴파일 성공 (`tsc --noEmit`), Lint 오류 0건
- **보안 및 캡처 유닛 테스트**:
  - `src/utils/securityPolicy.test.ts` (8/8 통과: 전역 및 사용자별 캡쳐 ON/OFF 권한 검증)
  - `src/utils/kalmuri.test.ts` & `src/utils/i18n.test.ts` (14/14 통과)
  - 총 22개 테스트 전체 통과 (22/22 Passing)
