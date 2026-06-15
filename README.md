# Leady 🌿
AI가 만들어주는 맞춤형 이야기로 외국어를 배워요.

## 배포 방법 (Vercel, 약 10분)

### 1단계 — API 키 발급
1. [console.anthropic.com](https://console.anthropic.com) 접속 → 회원가입/로그인
2. **API Keys** 메뉴 → **Create Key** 클릭
3. 키를 복사해서 보관 (다시 볼 수 없으니 주의!)

### 2단계 — GitHub에 올리기
1. [github.com](https://github.com) 회원가입/로그인
2. **New repository** 클릭 → 이름 `leady` → **Create repository**
3. 이 폴더 전체를 해당 저장소에 업로드
   - GitHub 웹에서 **uploading an existing file** 클릭해서 드래그앤드롭 가능

### 3단계 — Vercel 배포
1. [vercel.com](https://vercel.com) 접속 → GitHub 계정으로 로그인
2. **Add New Project** → GitHub 저장소 `leady` 선택 → **Import**
3. **Environment Variables** 섹션에서:
   - Name: `ANTHROPIC_API_KEY`
   - Value: 1단계에서 복사한 API 키 붙여넣기
4. **Deploy** 클릭!

잠시 후 `https://leady-xxx.vercel.app` 같은 URL이 생성됩니다 🎉

## 로컬에서 실행하기
```bash
# 의존성 설치
npm install

# .env.local 파일 생성
cp .env.local.example .env.local
# .env.local 파일을 열어서 API 키 입력

# 개발 서버 시작
npm run dev
# http://localhost:3000 에서 확인
```

## 기능
- 🌍 8개 언어 지원 (한국어, 영어, 일본어, 중국어, 스페인어, 프랑스어, 독일어, 포르투갈어)
- 📚 8가지 장르 복수 선택
- ✨ AI가 맞춤형 이야기 생성
- 👆 단어 클릭 → 뜻/발음/예문 팝업
- ✋ 문장 길게 누르기 → 번역
- 🔖 북마크 저장
- 📖 단어장 저장
- 🃏 플래시카드 퀴즈
- 💾 진행도 자동 저장
