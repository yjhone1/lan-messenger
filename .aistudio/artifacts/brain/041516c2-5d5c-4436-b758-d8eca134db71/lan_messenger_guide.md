# LAN Messenger v1.4.0.0 개발 환경 & 아키텍처 가이드 (오픈소스캡쳐 통합판)

이 문서는 **LAN Messenger `v1.4.0.0`**에서 새롭게 통합된 **오픈소스캡쳐(OpenSourceCapture) 화면 캡처 및 동영상 녹화 스위트**, **OpenSSL 3.0 ↔ 1.0 호환성 아키텍처**, **원격 데스크톱 제어(Remote Desktop)** 기능과 빌드 환경을 정리한 가이드입니다.

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

## 2. 버전 정보 동기화 현황 (`1.4.0.0`)

모든 빌드 및 패키징 설정 파일이 `1.4.0.0`으로 완전히 통일되었습니다.

| 파일 경로 | 설정 항목 | 적용 값 |
| :--- | :--- | :--- |
| `/VERSION` | 프로젝트 버전 | `1.4.0.0` |
| `CMakeLists.txt` | project version | `1.4.0.0` |
| `lmc/CMakeLists.txt` | LMC_VERSION | `1.4.0.0` |
| `lmc/src/core/definitions.h` | IDA_VERSION | `1.4.0.0` |
| `lmc/src/app/lmcwin32.rc` | FILEVERSION / PRODUCTVERSION | `1,4,0,0` / `"1.4.0.0"` |
| `lmc/setup/win32/setup.nsi` | ProductVersion / InstallerVersion | `1.4.0.0` |
| `LANMessenger.pro` | IDA_VERSION | `1.4.0.0` |
| `.github/workflows/windows-release.yml` | 릴리스 태그 | `v1.4.0.0` |

---

## 3. 빌드 및 테스트 확인

- **C++ Qt 빌드 파일 등록**: `lmc/CMakeLists.txt`와 `LANMessenger.pro`에 `capturewindow.cpp`, `capturedefinitions.h`, `capturewindow.h` 등록 완료
- **웹 앱 빌드 & 린트**: TypeScript 컴파일 성공 (`tsc --noEmit`), Lint 오류 0건
- **유닛 테스트**: 단축키 충돌 방지 및 파일명 생성 등 14개 테스트 전체 통과 (14/14 Passing)
