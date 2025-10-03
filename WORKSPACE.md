# 📚 학생 포트폴리오 시스템 - 작업 공간

## 📋 프로젝트 개요

Google Sheets 기반 과제 관리 시스템

**현재 위치**: `/Users/kbd/Library/CloudStorage/OneDrive-문현고등학교/spsys`

---

## 🎯 현재 상태

### ✅ 완료된 기능

**핵심 시스템**
- ✅ 과제 시트 자동 생성
- ✅ 과제ID 자동 채번 (TS001, TS002...)
- ✅ 과제설정 시트 관리
- ✅ 공개 시트 자동 등록
- ✅ 날짜 유효성 검증

**메뉴 시스템**
- ✅ 동적 하이퍼링크 메뉴
- ✅ 카테고리별 자동 분류
- ✅ 시트 삭제 기능 (필수 시트 보호)
- ✅ 실시간 시트 목록 업데이트

**평가 시스템**
- ✅ 평가 항목 설정 및 관리
- ✅ 학생별 평가 입력 및 조회
- ✅ 평가 결과 통계 및 분석

**학생 웹 인터페이스**
- ✅ 학생 로그인 시스템 (학번 인증)
- ✅ 내 기록 조회 (공개 항목만)
- ✅ 평가 결과 확인
- ✅ 건의사항 입력 기능

**코드 품질**
- ✅ 상수 정의 및 적용
- ✅ isValidDate() 함수 구현
- ✅ 과제ID 중복 방지
- ✅ template 시트 우선 사용
- ✅ 에러 처리 완비

---

## 📂 폴더 구조

```
spsys/
├── README.md                                    # 프로젝트 개요
├── WORKSPACE.md                                 # 이 파일
│
├── CURRENT/student-portfolio-system/            # 메인 시스템 ⭐
│   ├── src/
│   │   ├── Main.gs                             # 핵심 로직 (3059줄)
│   │   ├── WebApp.html                         # 학생 웹 인터페이스 (1827줄)
│   │   └── appsscript.json                     # 설정
│   └── README.md                               # 상세 가이드
│
├── VERCEL/student-portfolio-vercel/             # (사용 안 함)
│   ├── api/
│   ├── index.html
│   └── package.json
│
└── ARCHIVE/                                     # 과거 버전
    └── desktop-v1/
```

---

## 🔑 핵심 정보

### 시스템 구성

**필수 시트 (⭐)**:
- 📋 `메뉴`: 중앙 관리 허브
- ⭐ `학생명단_전체`: 학생 데이터
- ⭐ `과제설정`: 과제 정보
- ⭐ `공개`: 공개 설정
- ⭐ `template`: 시트 템플릿

**동적 생성**:
- 과제별 전용 시트 (과제 생성 시)

### 주요 상수

```javascript
// 컬럼 인덱스 (0-indexed)
COLUMN_INDEX = {
  PUBLIC: 0,
  ASSIGNMENT_ID: 1,
  ASSIGNMENT_NAME: 2,
  TARGET_SHEET: 3,
  START_DATE: 4,
  END_DATE: 5,
  QUESTION_START: 6
}

// 필수 시트
REQUIRED_SHEETS = [
  '학생명단_전체',
  '과제설정',
  '공개',
  'template'
]
```

---

## 🚀 사용 방법

### 초기 설정

1. Google Sheets에서 새 스프레드시트 생성
2. Apps Script 열기 (확장 프로그램 > Apps Script)
3. Main.gs와 WebApp.html 복사하여 붙여넣기
4. `setupCompleteInteractiveMenu()` 실행
5. 권한 승인 후 완료
6. **웹앱 배포** (학생용):
   - 배포 > 새 배포
   - 유형: 웹 앱, 실행 계정: 나
   - 액세스 권한: [조직 내 사용자]
   - URL 복사하여 학생들에게 공유

### 교사용 (Google Sheets)

**과제 생성**:
```
메뉴 > 📋 포트폴리오 > ➕ 새 과제 시트
→ 과제명, 날짜, 질문 입력
→ 자동으로 시트 생성 및 등록
```

**시트 탐색**:
```
메뉴 시트 > 시트명 클릭
→ 해당 시트로 이동
```

**시트 삭제**:
```
메뉴 시트 > 삭제 체크박스 클릭
→ 확인 후 삭제
```

### 학생용 (웹앱)

**로그인**:
```
웹앱 URL 접속 > 5자리 학번 입력
→ 본인 정보 확인
```

**기록 조회**:
```
대시보드 > 내 기록 탭
→ 공개된 과제 및 평가 항목 확인
```

**평가 결과**:
```
대시보드 > 평가 결과 탭
→ 항목별 점수 및 교사 코멘트 확인
```

---

## 🔧 최근 개선사항

### 2025-10-03 업데이트

1. **상수 정의**
   - COLUMN_INDEX, ROW_INDEX, SHEET_NAMES 추가
   - 모든 매직 넘버를 상수로 대체

2. **날짜 검증**
   - isValidDate() 함수 구현
   - 형식, 유효성, 순서 검증

3. **공개 시트 자동 등록**
   - 과제 생성 시 자동으로 공개 시트에 등록
   - 기본값: 공개 안함, 전체 대상

4. **template 시트 처리**
   - template 시트 우선 사용
   - 없거나 비어있으면 기본 헤더 사용

5. **과제ID 중복 방지**
   - maxId 기반 ID 생성
   - 행 삭제 후에도 중복 없음

---

## 📊 Git 상태

### 최근 커밋

```
5b0651d Update documentation: Reflect restored student web app features (v2.0)
aaa90ff Restore: Bring back student login and web app features
acaac67 Remove teacher management features from web app
```

### 브랜치

- **main**: 메인 브랜치 (활성)

---

## 🐛 알려진 이슈

### 검증 필요

- **질문 헤더 컬럼 계산** (Main.gs:230)
  - 현재: `COLUMN_INDEX.QUESTION_START + newQuestionNum + 1`
  - 검증 필요: 질문이 올바른 위치에 저장되는지 테스트 필요

---

## 📈 향후 계획

### 단기 (1-2주)
- [ ] 사용자 테스트 수행 (교사/학생 양쪽)
- [ ] 버그 수정 및 안정화
- [ ] 웹앱 UI/UX 개선

### 중기 (1-2개월)
- [ ] 파일 업로드 기능 (Google Drive 연동)
- [ ] 통계 대시보드 추가
- [ ] 모바일 최적화

### 장기
- [ ] 알림 시스템 (과제 마감 알림)
- [ ] 데이터 시각화
- [ ] 모바일 앱 개발

---

## 🤝 기여

- **GitHub**: https://github.com/KBD71/spsys
- **Issues**: https://github.com/KBD71/spsys/issues

---

## 📝 개발 노트

### 주요 결정사항

1. **하이브리드 시스템**
   - 교사: Google Sheets 기반 관리
   - 학생: 웹앱 기반 조회
   - Apps Script로 통합 관리

2. **상수 기반 설계**
   - 매직 넘버 제거
   - 유지보수성 향상
   - 코드 가독성 개선

3. **자동화 우선**
   - 과제ID 자동 생성
   - 시트 자동 등록
   - 메뉴 자동 업데이트

4. **학생 웹앱 복원 (v2.0)**
   - 학생 로그인 및 인증
   - 내 기록 조회 기능
   - 평가 결과 확인 기능
   - 건의사항 입력 기능

---

**마지막 업데이트**: 2025-10-03
**현재 버전**: v2.0 (과제 관리 + 학생 웹앱)
**작업자**: KBD71

**v2.0 주요 변경사항**:
- ✅ 학생 로그인 시스템 복원
- ✅ WebApp.html 복원 (1827줄)
- ✅ Main.gs 완전 복원 (3059줄)
- ✅ 평가 시스템 복원
- ✅ 내 기록 조회 기능 복원
