# 학생 포트폴리오 시스템 (SPSYS)

Google Sheets 기반 학생 비밀번호 관리 및 평가 시스템

---

## ✨ 특징

- ✅ **학생 인증**: 5자리 학번 + 비밀번호
- ✅ **보안**: SHA-256 해싱 + Salt
- ✅ **비밀번호 관리**: 24시간 변경 제한
- ✅ **Google Sheets 연동**: 실시간 데이터 동기화
- ✅ **반응형 UI**: 모바일/태블릿/PC 지원
- ✅ **한글 인터페이스**: 완전한 한국어 지원

---

## 🚀 빠른 시작

### 현재 구현된 기능 (Phase 1)

- 학생 로그인
- 비밀번호 변경
- Google Sheets 연동

### 배포 옵션

#### Option 1: Google Apps Script (추천 - 간단)

**위치**: `CURRENT/`

**장점**:
- 설정 간단 (15분)
- 무료 HTTPS
- Google Sheets 직접 연결

**시작하기**: [CURRENT/배포가이드.md](CURRENT/배포가이드.md)

#### Option 2: Vercel (추천 - 확장성)

**위치**: `VERCEL/`

**장점**:
- 무제한 확장
- 커스텀 도메인
- 글로벌 CDN
- 높은 할당량

**시작하기**: [VERCEL/README.md](VERCEL/README.md)

---

## 📂 프로젝트 구조

```
spsys/
├── WORKSPACE.md              # 프로젝트 현황 (시작점)
├── README.md                 # 이 파일
├── TASKS/                    # 작업 관리
│   ├── TODO.md              # 할 일 목록
│   ├── NEXT_STEPS.md        # 다음 단계 가이드
│   └── PHASE_2_ASSIGNMENTS.md  # Phase 2 구현 계획
├── CURRENT/                  # Apps Script 버전
│   ├── 코드.gs
│   ├── 웹페이지.html
│   └── 배포가이드.md
├── VERCEL/                   # Vercel 배포 버전
│   ├── index.html
│   ├── api/
│   ├── package.json
│   └── README.md
└── ARCHIVE/                  # 이전 버전 (참고용)
```

---

## 🎯 개발 로드맵

### ✅ Phase 1: 기본 인증 시스템 (완료)
- [x] 학생 로그인
- [x] 비밀번호 변경
- [x] Google Sheets 연동
- [x] 반응형 UI

### 📋 Phase 2: 과제 관리 시스템 (계획 중)
- [ ] 과제 목록 조회
- [ ] 과제 제출
- [ ] 제출 내역 확인
- [ ] 대시보드 UI

**구현 계획**: [TASKS/PHASE_2_ASSIGNMENTS.md](TASKS/PHASE_2_ASSIGNMENTS.md)

### 📊 Phase 3: 평가 시스템 (계획 중)
- [ ] 평가 항목 관리
- [ ] 평가 입력
- [ ] 평가 결과 조회
- [ ] 통계 대시보드

### 📁 Phase 4: 파일 업로드 (선택 사항)
- [ ] Google Drive 연동
- [ ] 파일 업로드
- [ ] 파일 관리

---

## 💻 다른 노트북에서 작업하기

### 1. 저장소 클론

```bash
cd Documents
git clone https://github.com/KBD71/spsys.git
cd spsys
```

### 2. 현재 상태 확인

```bash
cat WORKSPACE.md
cat TASKS/TODO.md
cat TASKS/NEXT_STEPS.md
```

### 3. 작업 시작

**Apps Script 배포**: `CURRENT/` 폴더 참조

**Vercel 배포**:
```bash
cd VERCEL
npm install
npm run dev
```

자세한 가이드: [TASKS/NEXT_STEPS.md](TASKS/NEXT_STEPS.md)

---

## 🔑 주요 정보

### 학번 형식
- **5자리 숫자** (예: 20240101)

### Google Sheets 구조

**시트 이름**: `학생명단_전체`

| 학번 | 이름 | 반 | 비밀번호 | 이메일 | 비밀번호변경일 | 변경횟수 |
|------|------|-----|----------|--------|---------------|----------|

---

## 📖 문서

- [WORKSPACE.md](WORKSPACE.md) - 프로젝트 전체 현황
- [TASKS/TODO.md](TASKS/TODO.md) - 할 일 목록
- [TASKS/NEXT_STEPS.md](TASKS/NEXT_STEPS.md) - 다음 단계 가이드
- [TASKS/PHASE_2_ASSIGNMENTS.md](TASKS/PHASE_2_ASSIGNMENTS.md) - Phase 2 구현 계획

---

## 🔧 기술 스택

### Apps Script 버전
- Google Apps Script (V8 Runtime)
- HTML/CSS/JavaScript
- Google Sheets API

### Vercel 버전
- Node.js
- Vercel Serverless Functions
- Google Sheets API (googleapis)
- HTML/CSS/JavaScript (Fetch API)

---

## 📞 지원

- **GitHub**: https://github.com/KBD71/spsys
- **Issues**: https://github.com/KBD71/spsys/issues

---

## 📝 라이선스

이 프로젝트는 교육 목적으로 만들어졌습니다.

---

**마지막 업데이트**: 2025-10-02
