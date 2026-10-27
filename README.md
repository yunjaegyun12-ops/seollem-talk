# 설렘톡 (AI 연인 캐릭터 채팅) — 정적 웹앱
빌드 없음. 이 폴더를 HTTPS 정적 호스팅(GitHub Pages, Cloudflare Pages, Netlify 등)에 그대로 올리면 됩니다.
- index.html / style.css / app.js / sw.js / manifest.webmanifest / icons/
- 데이터(캐릭터·대화·기억·사진)는 IndexedDB, 설정·API 키는 localStorage (기기 안에만 저장)
- (테스트용 mock 서버와 Playwright 테스트는 이 저장소에 포함하지 않음)
로컬 실행: `python3 -m http.server 8787` 후 http://localhost:8787
