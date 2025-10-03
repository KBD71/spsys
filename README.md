# 📚 학생 포트폴리오 시스템 (Student Portfolio System)

> 완전한 학생 관리, 과제 제출, 평가 시스템이 통합된 교육용 웹 애플리케이션

## 🌟 주요 기능

### ✅ 완성된 기능들

**🔐 사용자 인증 시스템**
- 학생 로그인 (5자리 학번)
- 교사 로그인 (관리자 모드)
- 비밀번호 변경 및 보안

**📝 과제 관리 시스템**
- 과제 등록 및 관리
- 학생 과제 제출
- LaTeX 수식 지원
- 제출 현황 추적

**📊 평가 시스템**
- 평가 항목 설정
- 세부 항목별 점수 입력
- 학생별 평가 결과 조회
- 반별 접근 권한 관리

**📋 동적 메뉴 시스템**
- 하이퍼링크 기반 시트 탐색
- 시트 카테고리 자동 분류
- 새 시트 자동 생성 (헤더 포함)
- 필수/선택 시트 구분
- 원클릭 삭제 기능

**📈 데이터 관리**
- Google Sheets 연동
- 실시간 통계 업데이트
- 자동 백업 생성
- 샘플 데이터 생성

## 🚀 빠른 시작

### 1. Google Apps Script 버전 (권장)

```bash
# 1. 프로젝트 클론
git clone https://github.com/KBD71/spsys.git
cd spsys

# 2. Apps Script 파일 복사
# - CURRENT/student-portfolio-system/src/Main.gs → Apps Script 프로젝트
# - CURRENT/student-portfolio-system/src/WebApp.html → HTML 파일로 추가

# 3. Google Sheets 준비
# - 새 스프레드시트 생성
# - Apps Script에서 setupCompleteInteractiveMenu() 실행
```

### 2. Vercel 서버리스 버전

```bash
# 1. 디렉토리 이동
cd VERCEL/student-portfolio-vercel

# 2. 환경 변수 설정
cp .env.example .env
# .env 파일에 Google Sheets 연동 정보 입력

# 3. 배포
npm install
vercel --prod
```

## 📁 프로젝트 구조

```
spsys/
├── CURRENT/student-portfolio-system/    # 메인 Apps Script 버전
│   ├── src/
│   │   ├── Main.gs                      # 핵심 백엔드 로직
│   │   ├── WebApp.html                  # 프론트엔드 UI
│   │   └── appsscript.json              # Apps Script 설정
│   └── docs/                            # 문서화
│
├── VERCEL/student-portfolio-vercel/     # Vercel 서버리스 버전
│   ├── api/                             # API 엔드포인트
│   ├── index.html                       # 메인 웹페이지
│   └── package.json                     # 의존성 관리
│
└── ARCHIVE/                             # 과거 버전 보관
```

## 🎯 시스템 아키텍처

### 데이터 구조 (Google Sheets)

**필수 시트 (⭐)**
- `메뉴`: 중앙 관리 허브
- `학생명단_전체`: 전체 학생 데이터
- `과제목록`: 과제 정보
- `평가항목설정`: 평가 체계
- `평가세부항목`: 세부 평가 기준
- `평가결과`: 평가 점수 데이터
- `제출현황`: 과제 제출 추적
- `공개`: 학생 조회 가능 항목

**동적 생성 시트**
- `학생명단_{반}`: 반별 학생 관리
- `과제_{과제명}`: 과제별 제출 현황
- `평가_{평가명}`: 평가별 결과

### API 엔드포인트

```
POST /api/login              # 사용자 인증
GET  /api/assignments        # 과제 목록 조회
POST /api/submit-assignment  # 과제 제출
GET  /api/my-records         # 학생 기록 조회
POST /api/change-password    # 비밀번호 변경
GET  /api/evaluation-results # 평가 결과 조회
POST /api/evaluation-results # 평가 점수 입력
GET  /api/menu               # 시스템 정보 조회
```

## 👨‍🏫 교사용 기능

### 시스템 관리
- **메뉴 시트**: 모든 기능의 중앙 허브
- **시트 자동 생성**: 목적별 헤더 포함
- **하이퍼링크 탐색**: 클릭으로 시트 이동
- **통계 모니터링**: 실시간 시스템 현황

### 과제 관리
- 과제 등록 및 수정
- 제출 현황 모니터링
- LaTeX 수식이 포함된 과제 검토

### 평가 관리
- 평가 항목 설정
- 세부 기준별 점수 입력
- 반별 평가 대상 관리
- 평가 결과 통계

### 데이터 관리
- 자동 백업 생성
- 샘플 데이터 생성
- 시트 삭제 및 정리

## 👨‍🎓 학생용 기능

### 과제 시스템
- 활성 과제 목록 조회
- 과제 상세 내용 확인
- LaTeX 수식 미리보기
- 과제 제출 및 수정

### 평가 결과
- 개인 평가 결과 조회
- 세부 항목별 점수 확인
- 평가 코멘트 확인

### 개인 정보
- 비밀번호 변경
- 개인 기록 조회
- 건의사항 입력

## 🔧 고급 기능

### LaTeX 수식 지원
- MathJax 라이브러리 통합
- 실시간 수식 미리보기
- 과제 제출에서 수식 사용 가능

### 동적 메뉴 시스템
- 시트 상태 자동 감지
- 카테고리별 색상 구분
- 필수 시트 보호 기능
- 스마트 설명 자동 생성

### 보안 기능
- SHA-256 비밀번호 해싱
- 24시간 비밀번호 변경 제한
- 반별 접근 권한 제어
- 관리자 권한 분리

## 📚 사용법 가이드

### 첫 설정
1. Google Sheets에서 새 스프레드시트 생성
2. Apps Script에서 `setupCompleteInteractiveMenu()` 실행
3. 필요한 시트들이 자동 생성됨
4. 메뉴 시트에서 관리자 정보 설정

### 일상 운영
1. **메뉴 시트**에서 모든 작업 시작
2. 시트명 클릭으로 빠른 이동
3. 새 시트 생성 버튼으로 확장
4. 통계 새로고침으로 현황 파악

### 데이터 백업
- 메뉴에서 "💾 백업 생성" 클릭
- 자동으로 타임스탬프가 포함된 백업 생성
- Google Drive에 백업 파일 저장

## 🔄 버전 히스토리

- **v3.0** (현재): 평가 시스템 + 동적 메뉴
- **v2.0**: 과제 관리 시스템 추가
- **v1.0**: 기본 인증 시스템

## 🤝 기여하기

1. 이슈 리포트: [GitHub Issues](https://github.com/KBD71/spsys/issues)
2. 기능 제안: [GitHub Discussions](https://github.com/KBD71/spsys/discussions)
3. 코드 기여: Pull Request 환영

## 📄 라이선스

MIT License - 자유롭게 사용, 수정, 배포 가능

## 🆘 지원

- 📧 이메일: 관리자에게 문의
- 📖 문서: `CURRENT/student-portfolio-system/docs/`
- 🔍 FAQ: 프로젝트 Wiki 참조

---

**마지막 업데이트**: 2025-10-03
**현재 버전**: v3.0 (Phase 3 완료)
