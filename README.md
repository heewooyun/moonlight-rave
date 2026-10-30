# Moonlight Rave

여름 밤 달빛 아래 야외 레이브 — 과거와 미래 사이의 질문을 담은 30초 키네틱 타이포 숏츠.

- 포맷: 1440×1080 (4:3), 30fps, 30초
- 스타일: 네온 · 레이저 · 트론풍 레트로 SF 그리드
- 음악: 프렌치 하우스 스타일 오리지널 트랙 (`tools/make-music.mjs`로 합성)
- 제작: [HyperFrames](https://github.com/heygen-com/hyperframes)

결과물: [`docs/moonlight-rave.mp4`](docs/moonlight-rave.mp4) — 공유 페이지는 `docs/` (GitHub Pages)

## 다시 만들기

Node.js 22+, FFmpeg 필요.

```bash
npm install
node tools/make-music.mjs        # assets/music.wav 생성
npx hyperframes preview           # 브라우저 미리보기
npx hyperframes render -o renders/moonlight-rave.mp4
```
