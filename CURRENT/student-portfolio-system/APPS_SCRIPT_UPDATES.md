# Google Apps Script 수정 사항 정리

## 📋 개요
현재 구현된 기능들을 Google Apps Script 버전에 적용하기 위한 수정 사항 정리

---

## 🆕 추가된 기능들

### 1. LaTeX/MathJax 수식 지원
- **파일**: `WebApp.html`
- **상태**: ✅ 완료
- **설명**: 과제 제출 시 LaTeX 수식 입력 및 미리보기 지원

### 2. 건의사항 입력 기능  
- **파일**: `Main.gs`, `WebApp.html`
- **상태**: ✅ 완료
- **설명**: 내 기록에서 건의사항 컬럼이 있으면 입력창 표시 및 저장

### 3. 반별 공개 범위 설정
- **파일**: `Main.gs`
- **상태**: ✅ 완료
- **설명**: '공개' 시트에 대상반 컬럼 추가로 반별 필터링

---

## 📊 Google Sheets 구조 변경

### '공개' 시트 업데이트 필요
기존:
```
| 공개여부 | 시트이름 |
|---------|---------|
| TRUE    | 성적표   |
```

변경 후:
```
| 공개여부 | 시트이름 | 대상반    |
|---------|---------|----------|
| TRUE    | 성적표   | 전체      |
| TRUE    | 수행평가 | 1학년     |
| TRUE    | 특별활동 | 1-1,1-2   |
```

**대상반 형식**:
- `전체`: 모든 학생에게 공개
- `1학년`, `2학년`: 해당 학년만
- `1-1,1-2`: 특정 반들만 (쉼표로 구분)

---

## 🔧 Apps Script 코드 변경사항

### 1. Main.gs 함수 추가
```javascript
/**
 * 내 기록 조회 함수 - ✅ 완료
 */
function getMyRecords(studentId)

/**
 * 건의사항 저장 함수 - ✅ 완료  
 */
function saveSuggestion(studentId, sheetName, suggestion)

/**
 * 반별 접근 권한 확인 - ✅ 완료
 */
function isClassAllowedGS(studentClass, targetClass)
```

### 2. WebApp.html 수정사항

#### MathJax 라이브러리 추가 - ✅ 완료
```html
<!-- MathJax for LaTeX support -->
<script>
  MathJax = {
    tex: {
      inlineMath: [['$', '$'], ['\\(', '\\)']],
      displayMath: [['$$', '$$'], ['\\[', '\\]']]
    }
  };
</script>
<script src="https://polyfill.io/v3/polyfill.min.js?features=es6"></script>
<script src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js"></script>
```

#### 과제 제출 모달 추가 - ✅ 완료
- LaTeX 수식 입력 지원
- 실시간 미리보기 기능

#### 내 기록 섹션 추가 - ✅ 완료
```html
<!-- 내 기록 섹션 -->
<section class="my-records" aria-label="내 기록">
  <h2>📊 내 기록</h2>
  <div id="myRecordsList" class="my-records-list">
    <div class="loading-message">기록을 불러오는 중...</div>
  </div>
</section>
```

#### CSS 스타일 추가 - ✅ 완료
- 과제 및 모달 스타일
- 내 기록 카드 스타일  
- 건의사항 입력창 스타일

#### JavaScript 함수 추가 - ✅ 완료
```javascript
// 과제 관리
function loadAssignments()
function displayAssignments()
function showSubmitModal()
function submitAssignment()
function previewMath()

// 내 기록 관리
function loadMyRecords()
function displayMyRecords()
function saveSuggestionAppsScript()
```

---

## 🚀 배포 준비사항

### 1. Google Sheets 설정
- [ ] '공개' 시트에 '대상반' 컬럼 추가 (C열)
- [ ] 기존 데이터에 대상반 값 입력 (기본값: '전체')
- [ ] '과제설정' 시트 생성 (Phase 2용)
- [ ] '과제제출' 시트 생성 (Phase 2용)

### 2. Apps Script 배포
- [ ] 현재 코드들을 Apps Script 에디터에 업로드
- [ ] 웹앱으로 배포 (새 버전)
- [ ] 권한 설정 확인

### 3. 테스트
- [ ] 로그인 기능 테스트
- [ ] 과제 목록 로드 테스트  
- [ ] LaTeX 수식 입력 테스트
- [ ] 내 기록 조회 테스트
- [ ] 건의사항 저장 테스트
- [ ] 반별 필터링 테스트

---

## 📝 사용자 가이드 업데이트 필요

### 교사용
1. '공개' 시트에서 대상반 설정 방법
2. 건의사항 컬럼 추가 시 동작 방식

### 학생용  
1. LaTeX 수식 입력 방법
2. 건의사항 작성 방법

---

## 🔄 다음 개발 단계 (Phase 3)

### 평가 시스템 구현
- [ ] '평가항목설정' 시트 생성
- [ ] 교사용 평가 입력 UI
- [ ] 학생용 평가 결과 조회
- [ ] 통계 대시보드

### 파일 업로드 (Phase 4)
- [ ] Google Drive 연동
- [ ] 파일 업로드 API
- [ ] 파일 관리 UI

---

**마지막 업데이트**: 2025-10-02
**상태**: Apps Script 버전 준비 완료, 배포 가능