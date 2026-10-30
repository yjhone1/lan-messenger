# LAN Messenger v1.3.0 (Based on v1.2.39 — OpenSSL 3.0 ↔ 1.0 Compatibility & Remote Desktop)

**LAN Messenger v1.3.0**은 사내/로컬 네트워크(LAN) 환경에서 별도의 서버 없이 동작하는 오픈소스 P2P 메신저 **LAN Messenger `v1.2.39`**를 기반으로 다음 두 가지 핵심 아키텍처와 최신 빌드 환경(**Qt 6.10.2 / GCC 15.2.0**) 호환성을 추가한 확장 버전입니다:

1. **OpenSSL 3.0 ↔ OpenSSL 1.0 구버전 양방향 호환성 아키텍처 (`Legacy v1.0` / `Strict v3.0`)**
2. **원격 데스크톱 제어 및 실시간 화면 공유 기능 (`lmc/src/remote/`)**

---

## 1. v1.3.0 주요 추가 및 변경 사항 (vs v1.2.39)

### ① OpenSSL 3.0 ↔ OpenSSL 1.0 구버전 호환성 아키텍처 (`lmc/src/core/crypto.*`, `lmc/src/network/*`)
- **문제 배경**: 최신 리눅스/윈도우(OpenSSL 3.x) 환경의 랜메신저가 구버전(`v1.2.39` 이하, OpenSSL 1.0.x) 클라이언트와 연결될 때, OpenSSL 3.0의 기본 X.509 SPKI 공개키 헤더(`-----BEGIN PUBLIC KEY-----`)를 구버전 클라이언트의 `PEM_read_bio_RSAPublicKey()`가 파싱하지 못해 `NULL` 역참조로 강제 종료(Crash)되던 문제를 해결했습니다.
- **해결 및 동작 구조**:
  - **`Legacy v1.0` 모드(기본값)**: OpenSSL 3.0 `EVP_PKEY` 및 `OSSL_ENCODER_CTX`를 사용하여 PKCS#1 `"type-specific"` 헤더(`-----BEGIN RSA PUBLIC KEY-----`)를 선두에 배치하고 `SHA-1` OAEP 패딩 및 표준 6바이트 프레임 헤더(`BRDCST`, `PUBKEY`, `HNDSHK`, `MESSAG`)를 사용하여 구버전(`v1.2.39` 등) 클라이언트와의 완벽한 상호운용성을 보장합니다.
  - **`Strict v3.0` 모드**: X.509 SPKI 헤더(`-----BEGIN PUBLIC KEY-----`), `SHA-256` OAEP 패딩, `v3.0` 전용 프레임 헤더(`BRDv30`, `PUBKv3`, `HNDv30`, `MSGv30`)를 사용합니다.
  - **듀얼 디코더 및 자동 폴백**: 상대방의 RSA-1024(128B 엔벨로프) 및 RSA-2048(256B 엔벨로프) 공개키를 `OSSL_DECODER_CTX`로 모두 수용하며, `retreiveAES()`에서 SHA-1 / SHA-256 OAEP 복호화를 자동 감지합니다.
  - **채팅창 실시간 모드 토글**: 채팅창(`lmc/src/gui/chat/chatwindow.cpp`) 우측 상단 툴바에서 **`Legacy v1.0` ↔ `Strict v3.0`** 프로토콜 모드를 즉시 전환할 수 있습니다.

### ② 원격 데스크톱 제어 기능 추가 (`lmc/src/remote/`)
- 채팅창 상단 툴바의 **`Remote Desktop...`** 버튼으로 상대방 피어에게 원격 화면 공유 및 제어를 요청(`MT_RemoteRequest` / `MT_RemoteAccept` / `MT_RemoteReject` / `MT_RemoteClose`)할 수 있습니다.
- **구성 모듈**:
  - `lmc/src/remote/remoteserver.h` / `remoteserver.cpp`: 로컬 화면 캡처, JPEG 프레임 스트리밍 및 원격 마우스/키보드 입력 이벤트 재현 서버
  - `lmc/src/remote/remoteclient.h` / `remoteclient.cpp`: TCP 기반 원격 프레임 수신 및 입력 전송 클라이언트
  - `lmc/src/remote/remoteviewerwindow.h` / `remoteviewerwindow.cpp`: 원격 화면 뷰어(`RemoteCanvasWidget`), **`Enable Control`(원격 마우스/키보드 제어 활성화)**, **`Fit to Window`(창 크기 자동 맞춤)**, **`Disconnect`** 제어 툴바 제공

### ③ 설정 마이그레이션 및 Qt 6.10.2 / GCC 15.2.0 호환성 업데이트
- `lmc/src/core/settings.cpp`: `v1.3.0` 미만 버전(`Helper::compareVersions(version, "1.3.0") < 0`)의 레거시 고정 TCP 포트 설정을 자동 정리하고 버전 정보를 `1.3.0`으로 마이그레이션합니다.
- `lmc/src/gui/chat/chatwindow.cpp` & `lmc/src/gui/main/mainwindow.cpp`: **Qt 6.10.2 (GCC 15.2.0, x86_64)** 환경에서 서로 다른 열거형 비트 연산 경고가 발생하지 않도록 `QKeyCombination(Qt::ControlModifier, ...)`을 적용했습니다.

---

## 2. 로컬 PC 작업 환경 안내 (Ubuntu 26.04.1 LTS / Qt Creator 18.0.2)

- **운영체제**: Ubuntu 26.04.1 LTS (`x86_64`)
- **IDE**: Qt Creator 18.0.2
- **Qt 버전**: Qt 6.10.2 (`GCC 15.2.0`, `x86_64`)

### 필수 패키지 설치 (Ubuntu 26.04.1 LTS 터미널)

```bash
sudo apt update
sudo apt install -y build-essential cmake ninja-build pkg-config \
  qt6-base-dev qt6-base-private-dev qt6-multimedia-dev qt6-tools-dev \
  qt6-tools-dev-tools qt6-l10n-tools qt6-translations-l10n libssl-dev
```

### Qt Creator 18.0.2에서 열기 및 빌드

1. 저장소를 로컬 PC로 `git pull` 받습니다. (`/.qtcreator/CMakeLists.txt.user`가 보존되어 있어 마이그레이션 없이 즉시 열립니다.)
2. **Qt Creator 18.0.2**에서 최상단 **`CMakeLists.txt`**를 열고 **`Desktop Qt 6.10.2 (GCC 15.2.0, x86_64)`** Kit으로 **`Build` (`Ctrl + B`)** 또는 **`Run` (`Ctrl + R`)**을 실행합니다.

### 터미널(CLI)에서 CMake 빌드 및 유닛 테스트(`tst_crypto`) 실행

```bash
cmake -B build -G Ninja -DCMAKE_BUILD_TYPE=Release -DLMC_BUILD_TESTS=ON
cmake --build build -j$(nproc)

# 실행 (버전 1.3.0)
./build/lmc/lan-messenger

# OpenSSL 3.0 <-> 1.0 암호화/호환성 유닛 테스트(11개 항목) 실행
ctest --test-dir build --output-on-failure -V
```

---

## 3. GitHub Actions 윈도우 배포판 자동 빌드 (`.github/workflows/windows-release.yml`)

- GitHub의 `master` 또는 `main` 브랜치에 Push하면 **Windows Release Build** 워크플로우가 자동 실행되어 **`v1.3.0`** 릴리스 태그와 함께 **`lan-messenger-windows-x64.zip`** 배포판을 생성 및 업로드합니다.

---

## 4. 웹 프리뷰 및 프로토콜 시뮬레이터 실행 (Node.js)

```bash
npm install
npm run dev
```

## 라이선스

GNU General Public License v3.0 (`LICENSE` 참조).
