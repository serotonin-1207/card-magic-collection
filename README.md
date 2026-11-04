# 카드 마술 모음

트럼프 마술 21종과 화투 마술 8종을 애니메이션 공연으로 보고 비법을 단계별로 배우는 앱입니다. 아이폰과 안드로이드에서 홈 화면에 설치해 쓰는 PWA이며, 설치 후에는 인터넷 없이 열립니다.

## 기능

- **공연 보기**: 비법 표시 없이 관객 시점으로 재생합니다.
- **비법 배우기**: 단계별 설명, 금색 점선으로 표시한 숨은 카드, 요령, 자주 하는 실수, 멘트를 제공합니다.
- **체험**: 앱이 마술사가 되는 21장의 예언, 쿠르스칼 카운트, 화투 생각한 달 맞히기입니다.
- **내 연습**: 저장한 마술과 연습 체크입니다. 기록은 이 기기에만 저장됩니다.

## 실행과 검증

빌드 과정은 없습니다. 폴더를 정적 서버로 띄우면 됩니다.

```bash
python -m http.server 5173
```

```bash
node tests/verify-tricks.mjs
```

위 검증은 수학 원리를 시뮬레이션하고, 공연 화면에 비법 표시가 없는지와 프레임 무결성을 확인합니다. `tests/frames.html`은 모든 장면을 펼쳐 눈으로 점검하는 페이지입니다.

## 폴더

| 경로 | 내용 |
| --- | --- |
| `js/logic.js` | 마술의 수학과 절차 |
| `js/tricks.js` | 트럼프 마술 내용과 장면, 장면 도구 |
| `js/tricks-more.js` | 트럼프 마술 추가분 |
| `js/tricks-hwatu.js` | 화투 마술 |
| `js/stage.js` | 카드 그리기와 재생 |
| `js/app.js` | 화면과 이동, 저장 |
| `src/core3d.js` | 3D 장면의 카드 상태 계산 (테스트에서도 사용) |
| `src/scenes3d.js` | 마술 24가지의 3D 장면 단계 |
| `src/proto3d.js` | three.js 3D 화면. `npm run build:3d`로 `js/proto3d.js`에 묶음 |
| `tests/scenes3d.html` | 3D 장면을 한 화면에 펼쳐 보는 점검 페이지 |
| `sw.js` | 오프라인 지원. 앱 파일을 추가하면 `SHELL` 목록과 `VERSION`을 함께 고칩니다 |
| `scripts/make_icons.py` | 앱 아이콘 생성 (Pillow 필요) |
| `scripts/build-preview.mjs` | 한 파일짜리 미리보기 페이지 생성 |

## 설치하려면

설치에는 HTTPS 주소가 필요합니다. 이 폴더를 GitHub Pages 같은 정적 호스팅에 올린 뒤 주소를 휴대폰에서 엽니다.

- **아이폰**: Safari → 공유 → 홈 화면에 추가
- **안드로이드**: Chrome → 메뉴(⋮) → 앱 설치

iOS 앱스토어에 올리려면 Mac 또는 클라우드 빌드와 Apple 개발자 계정이 필요합니다.

## Play 스토어용 빌드

Android 앱은 Capacitor로 웹 파일을 앱 안에 넣어 만듭니다. Android Studio의 JDK와 SDK가 필요합니다.

```bash
npm run sync
```

그다음 `android` 폴더에서 빌드합니다. 새 버전을 올릴 때는 `android/app/build.gradle`의 `versionCode`를 1 올리고 `versionName`을 바꿉니다.

```bash
gradlew.bat bundleRelease
```

결과물은 `android/app/build/outputs/bundle/release/app-release.aab`입니다. 서명 정보 `android/keystore.properties`는 저장소에 올리지 않습니다. 스토어 입력 문구와 설문 답변은 `store/listing-ko.md`, 그래픽은 `store/`에 있습니다.
