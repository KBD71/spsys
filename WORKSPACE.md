# 📚 학생 포트폴리오 시스템 - 작업 공간

## 📋 프로젝트 개요

완전한 학생 관리, 과제 제출, 평가 시스템이 통합된 교육용 웹 애플리케이션

**현재 위치**: `/Users/kbd/Library/CloudStorage/OneDrive-문현고등학교/spsys`

---

## 🎯 현재 상태

### ✅ 완료된 모든 기능

**Phase 1: 기본 인증 시스템**
- ✅ 학생 로그인 (5자리 학번)
- ✅ 교사 로그인 (관리자 모드)
- ✅ 비밀번호 변경 (SHA-256 해싱, 24시간 제한)
- ✅ Google Sheets 연동
- ✅ 반응형 UI (한글)

**Phase 2: 과제 관리 시스템**
- ✅ 과제 등록 및 관리
- ✅ 학생 과제 제출
- ✅ LaTeX 수식 지원 (MathJax)
- ✅ 제출 현황 추적
- ✅ 건의사항 입력 기능

**Phase 3: 평가 시스템**
- ✅ 평가 항목 설정 및 관리
- ✅ 세부 항목별 점수 입력
- ✅ 학생별 평가 결과 조회
- ✅ 반별 접근 권한 관리
- ✅ 평가 통계 및 분석

**시스템 관리 기능**
- ✅ 동적 하이퍼링크 메뉴 시스템
- ✅ 시트 자동 생성 (헤더 포함)
- ✅ 카테고리별 시트 분류
- ✅ 자동 백업 생성
- ✅ 실시간 통계 업데이트

### 🚧 현재 상태

**모든 핵심 기능 완료** - 프로덕션 사용 준비 완료

---

## 📂 폴더 구조

```
spsys/
├── WORKSPACE.md                          # 이 파일 - 프로젝트 현황  
├── README.md                             # 프로젝트 소개 (최신 버전)
├── CURRENT/student-portfolio-system/     # 메인 Apps Script 버전
│   ├── src/
│   │   ├── Main.gs                      # 핵심 백엔드 로직 (3000+ 라인)
│   │   ├── WebApp.html                  # 프론트엔드 UI
│   │   └── appsscript.json              # Apps Script 설정
│   └── docs/                            # 상세 문서
│       ├── API.md
│       ├── CHANGELOG.md
│       ├── DEPLOYMENT.md
│       ├── FUNCTIONS.md
│       └── SETUP.md
├── VERCEL/student-portfolio-vercel/      # Vercel 서버리스 버전
│   ├── api/                             # API 엔드포인트
│   │   ├── assignments.js               # 과제 관리
│   │   ├── change-password.js           # 비밀번호 변경
│   │   ├── evaluation-results.js        # 평가 결과
│   │   ├── login.js                     # 인증
│   │   ├── menu.js                      # 메뉴 관리
│   │   ├── my-records.js                # 개인 기록
│   │   ├── sheets.js                    # Google Sheets 연동
│   │   └── submit-assignment.js         # 과제 제출
│   ├── index.html                       # 메인 웹페이지
│   ├── package.json                     # 의존성 관리
│   └── .env.example                     # 환경 변수 템플릿
└── ARCHIVE/                              # 과거 버전 보관
    └── desktop-v1/                      # 초기 개발 버전
```

---

## 🔑 핵심 정보

### 완성된 시스템 구조

**Google Sheets 구조**:
- 📋 `메뉴`: 중앙 관리 허브
- ⭐ `학생명단_전체`: 전체 학생 데이터
- ⭐ `과제목록`: 과제 정보
- ⭐ `평가항목설정`: 평가 체계
- ⭐ `평가세부항목`: 세부 평가 기준
- ⭐ `평가결과`: 평가 점수 데이터
- ⭐ `제출현황`: 과제 제출 추적
- ⭐ `공개`: 학생 조회 가능 항목
- 📁 동적 생성: `학생명단_{반}`, `과제_{과제명}`, `평가_{평가명}`

### 학번 형식
- **5자리 숫자** (예: 20240101)
- 정규식: `/^[0-9]{5}$/`

### 보안 정책
- 비밀번호: SHA-256 해싱 + Salt
- 변경 제한: 24시간
- 반별 접근 권한 제어
- 관리자/학생 권한 분리

---

## 🚀 배포 및 사용

### Google Apps Script (권장 방법)

**빠른 시작**:
1. Google Sheets에서 새 스프레드시트 생성
2. `CURRENT/student-portfolio-system/src/Main.gs` 복사
3. Apps Script에서 `setupCompleteInteractiveMenu()` 실행
4. 웹앱 배포하여 URL 획득

**장점**:
- 설정 매우 간단 (10분)
- 무료 HTTPS 제공
- Google Sheets 직접 연결
- 모든 기능 완전 지원

### Vercel 서버리스 (확장성 중시)

**설정 방법**:
1. `VERCEL/student-portfolio-vercel` 디렉토리 이동
2. `.env` 파일 설정 (Google Sheets API)
3. `npm install && vercel --prod` 실행

**장점**:
- 무제한 확장성
- 커스텀 도메인
- 글로벌 CDN

---

## 📚 시스템 사용법

### 교사용 (관리자)

1. **시스템 초기화**: `setupCompleteInteractiveMenu()` 실행
2. **메뉴 시트**: 모든 기능의 중앙 허브
3. **시트 관리**: 하이퍼링크로 빠른 이동
4. **과제 관리**: 과제목록 시트에서 등록/수정
5. **평가 관리**: 평가항목설정에서 체계 구축
6. **데이터 관리**: 백업 생성, 통계 확인

### 학생용

1. **로그인**: 5자리 학번 + 비밀번호
2. **과제 확인**: 활성 과제 목록 조회
3. **과제 제출**: LaTeX 수식 지원
4. **평가 확인**: 개인 평가 결과 조회
5. **정보 관리**: 비밀번호 변경, 건의사항 입력

---

## 🎯 주요 완성 기능

### 관리 시스템
- ✅ 동적 메뉴 (하이퍼링크 기반)
- ✅ 시트 자동 생성 (목적별 헤더)
- ✅ 카테고리별 시트 분류
- ✅ 필수/선택 시트 구분
- ✅ 자동 백업 및 통계

### 교육 기능
- ✅ 과제 관리 (등록/제출/추적)
- ✅ 평가 시스템 (항목/점수/통계)
- ✅ LaTeX 수식 지원
- ✅ 반별 권한 관리
- ✅ 건의사항 시스템

### 보안 및 인증
- ✅ 이중 로그인 (학생/교사)
- ✅ SHA-256 해싱
- ✅ 24시간 변경 제한
- ✅ 접근 권한 제어

---

## 🔧 기술 스택

**Backend**: Google Apps Script / Node.js (Vercel)
**Frontend**: HTML/CSS/JavaScript, MathJax
**Database**: Google Sheets
**Authentication**: SHA-256 + Salt
**Deployment**: Apps Script Web App / Vercel

---

## 📈 시스템 상태

**현재 버전**: v3.0 (Phase 3 완료)
**프로덕션 준비**: ✅ 완료
**테스트 상태**: ✅ 모든 기능 검증 완료
**문서화**: ✅ 완전한 사용자 가이드 제공

---

## 🤝 기여 및 지원

- 📧 **GitHub**: https://github.com/KBD71/spsys
- 🐛 **Issues**: https://github.com/KBD71/spsys/issues
- 📖 **문서**: `CURRENT/student-portfolio-system/docs/`

---

**마지막 업데이트**: 2025-10-03
**현재 버전**: v3.0 (완전 기능 시스템)
**작업자**: KBD71
