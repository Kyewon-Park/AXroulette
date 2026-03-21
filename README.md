## Acknowledgements

This project is based on the following open-source project:

- https://github.com/lazygyu/roulette
- Author: lazygyu
- License: MIT License

Modifications have been made to fit this project.

# AXroulette

브라우저에서 실행되는 물리 기반 마블 레이스 룰렛입니다. 참가자 이름을 넣으면 구슬이 트랙을 따라 내려가고, 지정한 순위에 먼저 도달한 참가자를 당첨자로 확정합니다.

현재 빌드는 `Neon Drop` 콘셉트 UI를 사용하며, 단순 추첨기보다 "보는 재미"와 연출에 더 초점을 둔 프로젝트입니다.

## 핵심 기능

- `box2d-wasm` 기반의 2D 물리 시뮬레이션
- 1등뿐 아니라 원하는 목표 순위 지정 가능
- 코스 선택 지원
  - `Manual Work`
  - `Efficiency Boost`
- AI 부스트, 헌터 장애물, 자기장 구간 등 스테이지 상호작용
- 미니맵 드래그로 뷰포트 이동
- 화면 중앙 포인터 홀드로 2배속
- 참가자 목록 자동 저장 (`localStorage`)
- PWA/service worker 기반 정적 배포 지원

## 입력 규칙

참가자 이름은 줄바꿈 또는 쉼표로 구분해서 입력합니다.

예시:

```text
Soyeon
Minji/3
Ari*2
Theo/2*3
```

지원 문법:

- `이름` : 기본 1개, 기본 가중치
- `이름/3` : 가중치 3
- `이름*2` : 같은 이름의 구슬 2개 생성
- `이름/2*3` : 가중치 2인 구슬 3개 생성

가중치는 구슬의 물리 파라미터에 반영되고, `*개수`는 실제 참가 구슬 수를 늘립니다.

## 실행 방법

### 요구 사항

- Node.js
- Yarn

### 개발 서버

```bash
yarn
yarn dev
```

기본 개발 서버 주소는 `http://localhost:1235` 입니다.

### 빌드

```bash
yarn build
```

빌드 결과물은 `dist/`에 생성됩니다.

### 린트

```bash
yarn lint
```

## 사용 흐름

1. 참가자 이름을 입력합니다.
2. 필요하면 `/가중치`, `*개수` 문법으로 입력을 보정합니다.
3. 코스를 선택합니다.
4. 당첨 순위를 선택합니다.
5. `AI bubbles + SDS/CNS/Autoever` 옵션으로 스킬 사용 여부를 정합니다.
6. `Sync`로 명단을 반영한 뒤 `Start Race`를 실행합니다.

레이스가 끝나면 목표 순위를 차지한 참가자가 결과로 확정됩니다.

## 기술 스택

- TypeScript
- Parcel
- Sass
- box2d-wasm
- GSAP
- Workbox
- Biome

## 배포

GitHub Actions 워크플로우가 `main` 브랜치 푸시 시 `dist/`를 GitHub Pages로 배포하도록 구성되어 있습니다.

현재 설정은 상대 경로 기반으로 맞춰져 있어서, GitHub Pages 프로젝트 경로(`/저장소이름/`)에서도 정적 자산과 서비스 워커가 함께 동작하도록 구성되어 있습니다.

## 프로젝트 구조

```text
src/
  data/                 스테이지, 상수, 다국어 데이터
  utils/                공용 유틸리티와 비디오 레코더
  roulette.ts           게임 루프와 전체 진행 제어
  physics-box2d.ts      Box2D 연동
  rouletteRenderer.ts   캔버스 렌더링
assets/                 스타일, 아이콘, 이미지
scripts/build-sw.js     Workbox 기반 service worker 생성
index.html              UI와 앱 엔트리
```
