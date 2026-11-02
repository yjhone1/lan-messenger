# LAN Messenger v1.3.0 개발 환경 & 아키텍처 가이드 (v1.2.39 기반 확장판)

이 문서는 기존 **LAN Messenger `v1.2.39`**를 기반으로 **① OpenSSL 3.0 ↔ 1.0 호환성 아키텍처**와 **② 원격 데스크톱 제어(Remote Desktop) 기능**을 추가하여 **`v1.3.0`**으로 정식 버전업한 전체 내역과 빌드 워크플로우를 정리한 아티팩트 문서입니다.

---

## 1. `v1.3.0` 버전 반영 파일 총정리

| 분류 | 파일 경로 | 반영된 내용 |
| :--- | :--- | :--- |
| **설정 마이그레이션** | `lmc/src/core/settings.cpp` | 테스트용 태그였던 `"1.3.3"` 비교 구문을 `if(Helper::compareVersions(version, "1.3.0") < 0)`으로 수정 |
| **앱 버전/설명 매크로** | `lmc/src/core/definitions.h` | `IDA_VERSION` 기본값을 `"1.3.0"`으로 설정, `IDA_DESCRIPTION`(About 창 설명)에 v1.2.39 기반 OpenSSL 3.0/1.0 호환 및 Remote Desktop 내역 추가 |
| **CMake 빌드 설정** | `CMakeLists.txt`, `lmc/CMakeLists.txt` | `project(lan-messenger VERSION 1.3.0)` 및 `LMC_VERSION "1.3.0"` 기본값 적용 |
| **QMake 프로젝트** | `LANMessenger.pro` | `IDA_VERSION=\"1.3.0\"` 반영 |
| **GitHub 윈도우 배포** | `.github/workflows/windows-release.yml` | GitHub Releases 태그를 `v1.3.0`, 제목을 `LAN Messenger v1.3.0 Windows Release`로 설정 및 릴리스 노트 반영 |
| **Windows 패키징** | `lmc/setup/win32/setup.nsi`, `setup.bat`, `zip.ps1` | `ProductVersion`을 `"1.3.0"`, `InstallerVersion`을 `"1.3.0.0"`으로 업데이트 |
| **문서 및 테스트** | `README.md`, `tests/unit/tst_crypto.cpp`, `tests/data/crypto/README.md` | `v1.2.39` 기반 `v1.3.0` 아키텍처 명세 및 테스트 주석 동기화 |

---

## 2. `v1.2.39` 대비 `v1.3.0`의 2대 핵심 추가 기능

### ① OpenSSL 3.0 ↔ OpenSSL 1.0 구버전 호환성 아키텍처 (`lmc/src/core/crypto.*`)
- **`Legacy v1.0` 모드(기본값)**:
  - PKCS#1 `"type-specific"` 헤더(`-----BEGIN RSA PUBLIC KEY-----`)와 `SHA-1` OAEP 패딩, 표준 6바이트 헤더(`BRDCST`, `PUBKEY`, `HNDSHK`, `MESSAG`)를 사용합니다.
  - 구버전(`v1.2.39` 이하, OpenSSL 1.0) 클라이언트가 `PEM_read_bio_RSAPublicKey()` 호출 시 강제 종료(Crash)되지 않고 완벽히 통신합니다.
- **`Strict v3.0` 모드**:
  - X.509 SPKI 헤더(`-----BEGIN PUBLIC KEY-----`), `SHA-256` OAEP 패딩, `v3.0` 프레임 헤더(`BRDv30`, `PUBKv3`, `HNDv30`, `MSGv30`)를 사용합니다.
  - 채팅창 우측 상단 툴바에서 언제든 **`Legacy v1.0` ↔ `Strict v3.0`** 토글이 가능합니다.

### ② 원격 데스크톱 제어 기능 (`lmc/src/remote/`)
- **`RemoteServer` (`remoteserver.cpp`)**: 화면 캡처 및 JPEG 프레임 스트리밍, 원격 마우스 이동/클릭/휠 및 키보드 이벤트 주입
- **`RemoteClient` (`remoteclient.cpp`)**: TCP 소켓을 통한 실시간 원격 화면 프레임 수신 및 마우스/키보드 제어 패킷 송신
- **`RemoteViewerWindow` (`remoteviewerwindow.cpp`)**: `Enable Control`(원격 제어 허용), `Fit to Window`(창 크기 맞춤), `Disconnect`(연결 종료) 기능을 갖춘 전용 뷰어 윈도우

---

## 3. 내 PC 작업 환경 (Ubuntu 26.04.1 LTS / Qt Creator 18.0.2 / Qt 6.10.2 / GCC 15.2.0)

```bash
# 로컬 PC에서 최신 변경사항 받기
git pull

# 터미널에서 CMake 빌드 및 유닛 테스트 실행 시
cmake -B build -G Ninja -DCMAKE_BUILD_TYPE=Release -DLMC_BUILD_TESTS=ON
cmake --build build -j$(nproc)
ctest --test-dir build --output-on-failure -V
```
- **Qt Creator 18.0.2**에서는 루트의 `CMakeLists.txt`와 `/.qtcreator/CMakeLists.txt.user`가 그대로 유지되므로 별도 마이그레이션 없이 즉시 열리고 **`v1.3.0`**으로 빌드됩니다.
