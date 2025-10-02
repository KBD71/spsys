# 학생 포트폴리오 시스템 (SPSYS) - 작업 공간

## 📋 프로젝트 개요

Google Sheets 기반 학생 비밀번호 관리 및 평가 시스템

**현재 위치**: `C:\Users\matht\Documents\spsys`

---

## 🎯 현재 상태

### ✅ 완료된 작업

1. **Phase 1: 기본 인증 시스템 (완료)**
   - ✅ 학생 로그인 (5자리 학번)
   - ✅ 비밀번호 변경 (SHA-256 해싱, 24시간 제한)
   - ✅ Google Sheets 연동
   - ✅ 반응형 UI (한글)

2. **배포 옵션 구현**
   - ✅ Google Apps Script 버전 (`CURRENT/`)
   - ✅ Vercel Serverless 버전 (`VERCEL/`)

### 🚧 진행 중인 작업

- 없음 (다음 단계 대기 중)

### 📅 예정된 작업

- Phase 2: 과제 관리 시스템 (사용자 지시 대기)
- Phase 3: 평가 시스템 (사용자 지시 대기)
- Phase 4: 파일 업로드 (선택 사항)

---

## 📂 폴더 구조

```
spsys/
├── WORKSPACE.md              # 이 파일 - 프로젝트 현황
├── README.md                 # 프로젝트 소개
├── TASKS/                    # 작업 관리
│   ├── TODO.md              # 체크리스트
│   ├── NEXT_STEPS.md        # 다음 작업 가이드
│   └── PHASE_2_ASSIGNMENTS.md  # Phase 2 구현 계획
├── CURRENT/                  # 현재 사용 중인 Apps Script 버전
│   ├── 코드.gs
│   ├── 웹페이지.html
│   ├── 배포가이드.md
│   └── README.md
├── VERCEL/                   # Vercel 배포 버전
│   ├── index.html
│   ├── api/
│   │   ├── login.js
│   │   ├── change-password.js
│   │   └── sheets.js
│   ├── package.json
│   ├── vercel.json
│   ├── .env.example
│   └── README.md
└── ARCHIVE/                  # 이전 버전 보관
    ├── desktop-v1/          # 바탕화면 초기 버전
    └── github-old/          # 이전 GitHub 버전
```

---

## 🔑 핵심 정보

### 학번 형식
- **5자리 숫자** (예: 20240101)
- 정규식: `/^[0-9]{5}$/`

### 비밀번호 정책
- 길이: 4-20자
- 해싱: SHA-256 + Salt
- 변경 제한: 24시간

### Google Sheets 구조

**시트 이름**: `학생명단_전체`

| 학번 | 이름 | 반 | 비밀번호 | 이메일 | 비밀번호변경일 | 변경횟수 |
|------|------|-----|----------|--------|---------------|----------|
| 20240101 | 홍길동 | 1-1 | (해시) | hong@... | 2025-10-02 | 1 |

---

## 🚀 배포 옵션

### Option 1: Google Apps Script (추천 - 간단)

**장점**:
- 설정 간단 (클릭 몇 번)
- 무료 HTTPS
- Google Sheets 직접 연결

**단점**:
- Apps Script 제약 (30초 실행 제한)
- 커스텀 도메인 불가

**배포 방법**: `CURRENT/배포가이드.md` 참조

### Option 2: Vercel (추천 - 확장성)

**장점**:
- 무제한 확장 가능
- 커스텀 도메인
- 빠른 성능 (글로벌 CDN)
- 높은 할당량 (일 500,000 요청)

**단점**:
- Google Cloud Console 설정 필요
- 환경 변수 관리 필요

**배포 방법**: `VERCEL/README.md` 참조

---

## 💻 다른 노트북에서 작업하기

### 1단계: 저장소 클론

```bash
cd Documents
git clone https://github.com/KBD71/spsys.git
cd spsys
```

### 2단계: 현재 상태 확인

```bash
# 이 파일 읽기
cat WORKSPACE.md

# 다음 작업 확인
cat TASKS/TODO.md
cat TASKS/NEXT_STEPS.md
```

### 3단계: 필요한 도구 설치

**Apps Script 배포용**:
- Google 계정만 있으면 됨

**Vercel 배포용**:
```bash
# Node.js 설치 필요
npm install

# Vercel CLI 설치
npm install -g vercel
```

### 4단계: 작업 계속

1. `TASKS/TODO.md`에서 현재 진행 상황 확인
2. `TASKS/NEXT_STEPS.md`에서 다음 작업 확인
3. 작업 완료 후 git commit & push

---

## 📞 문제 해결

### Google Sheets 연결 안 됨

**Apps Script 버전**:
1. 스프레드시트 ID 확인
2. `코드.gs`에서 CONFIG.SHEET_NAME 확인
3. 열 이름이 정확한지 확인

**Vercel 버전**:
1. 서비스 계정 이메일로 시트 공유 확인
2. `.env` 파일 환경 변수 확인
3. `vercel env pull` 실행

### 학번 인식 안 됨

- 5자리 숫자 확인
- Google Sheets에서 학번 열이 텍스트 형식인지 확인
- 앞에 0이 있으면 텍스트로 저장해야 함

### 비밀번호 변경 안 됨

- 24시간 제한 확인
- 현재 비밀번호 정확한지 확인
- 새 비밀번호가 4-20자인지 확인

---

## 🔄 업데이트 이력

- **2025-10-02**: 프로젝트 재구성, 저장소 이름 변경 (spsys)
- **Phase 1 완료**: 기본 인증 시스템 구현
- **다음 단계**: Phase 2 과제 관리 시스템 (사용자 지시 대기)

---

## 📧 연락처

- GitHub: https://github.com/KBD71/spsys
- Issues: https://github.com/KBD71/spsys/issues

---

**마지막 업데이트**: 2025-10-02
**작업자**: KBD71
**현재 브랜치**: main
