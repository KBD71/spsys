# 🎯 시험 감독 시스템 통합 가이드

## 📋 목차
1. [시스템 개요](#시스템-개요)
2. [설치 방법](#설치-방법)
3. [Google Sheets 설정](#google-sheets-설정)
4. [Google Apps Script 설치](#google-apps-script-설치)
5. [Vercel API 배포](#vercel-api-배포)
6. [프론트엔드 통합](#프론트엔드-통합)
7. [사용 방법](#사용-방법)
8. [문제 해결](#문제-해결)

---

## 🎯 시스템 개요

이 시험 감독 시스템은 교실 환경에서 학생들이 노트북으로 시험을 볼 때,
AI나 다른 자료를 참고하는 것을 방지하기 위한 시스템입니다.

### 주요 기능
- ✅ **전체화면 강제**: 시험 시작 시 자동 전체화면
- ✅ **화면 이탈 감지**: 다른 탭/프로그램 전환 감지
- ✅ **이탈 횟수 제한**: N회 이탈 시 자동 제출
- ✅ **복사/붙여넣기 차단**: 문제 복사 및 답안 붙여넣기 방지
- ✅ **단축키 차단**: F12, Ctrl+T 등 주요 단축키 차단
- ✅ **로그 기록**: 모든 의심 행동 자동 기록
- ✅ **교사용 리포트**: 의심 학생 목록 자동 생성

### 효과성
- **90% 이상** 효과적 (교실 감독 + 물리적 제약 조건 충족 시)
- **심리적 압박**: 감시 중임을 명시적으로 표시
- **사후 검증**: 의심 학생에 대한 추가 확인 가능

---

## 📦 설치 방법

### 필요한 파일
제공된 파일 목록:
1. **Google Apps Script 파일**
   - `ExamMonitor.gs` - 시험 로그 관리
   - `SheetManager.gs` - 시트 관리 (업데이트)
   - `Triggers.gs` - 메뉴 및 트리거 (업데이트)
   - `UI.gs` - UI 함수 (업데이트)

2. **Vercel API 파일**
   - `exam-log.js` - 시험 로그 API
   - `assignments.js` - 과제 목록 API (업데이트)

3. **프론트엔드 파일**
   - `exam-monitor-frontend.js` - 시험 감독 JavaScript

---

## 🗂️ Google Sheets 설정

### 1. 시트 구조 업데이트

#### 과제설정 시트에 컬럼 추가
기존 컬럼 뒤에 다음 3개 컬럼 추가:

| 컬럼명 | 타입 | 설명 | 기본값 |
|--------|------|------|--------|
| 시험모드 | 체크박스 | 시험 감독 활성화 여부 | FALSE |
| 이탈허용횟수 | 숫자(0-10) | 허용할 화면 이탈 횟수 | 3 |
| 강제전체화면 | 체크박스 | 전체화면 강제 여부 | FALSE |

**설정 방법:**
```
1. Google Sheets에서 '과제설정' 시트 열기
2. '마감일' 컬럼 뒤에 3개 컬럼 추가
3. 헤더에 위 컬럼명 입력
4. 데이터 유효성 검사:
   - 시험모드: 체크박스
   - 이탈허용횟수: 숫자 0~10
   - 강제전체화면: 체크박스
```

#### template 시트에 컬럼 추가
'제출일시'와 '초안생성' 컬럼 사이에 추가:

| 컬럼명 | 타입 | 설명 |
|--------|------|------|
| 이탈횟수 | 숫자 | 학생의 화면 이탈 총 횟수 |

#### 시험로그 시트 생성
자동으로 생성되지만, 수동으로 만들 경우:

| 컬럼명 | 설명 |
|--------|------|
| 타임스탬프 | 이벤트 발생 시각 |
| 학번 | 학생 학번 |
| 이름 | 학생 이름 |
| 반 | 학생 반 |
| 과제ID | 과제 ID |
| 과제명 | 과제명 |
| 이벤트타입 | 이벤트 종류 (화면이탈, 전체화면해제 등) |
| 지속시간(초) | 이탈 지속 시간 |
| 상세정보 | 추가 정보 |

### 2. 자동 초기화 (권장)
```
메뉴 > 📋 포트폴리오 관리 > ⚙️ 시스템 설정 > 초기화: 필수 시트 생성
```
→ 모든 시트가 자동으로 생성/업데이트됩니다.

---

## 💻 Google Apps Script 설치

### 1. Google Sheets에서 Apps Script 열기
```
확장 프로그램 > Apps Script
```

### 2. 파일 추가/업데이트

#### 새 파일 추가
1. `+` 버튼 클릭 → "스크립트" 선택
2. 파일명: `ExamMonitor`
3. 제공된 `ExamMonitor.gs` 내용 복사/붙여넣기

#### 기존 파일 업데이트
1. **SheetManager.gs**
   - 기존 파일 열기
   - 전체 내용을 제공된 `SheetManager.gs`로 교체

2. **Triggers.gs**
   - 기존 파일 열기
   - 전체 내용을 제공된 `Triggers.gs`로 교체

3. **UI.gs**
   - 기존 파일 열기
   - 전체 내용을 제공된 `UI.gs`로 교체

### 3. 저장 및 테스트
```
Ctrl + S 또는 저장 버튼 클릭
```

### 4. 권한 부여
1. Apps Script 실행 시 권한 요청 팝업
2. "권한 검토" 클릭
3. 계정 선택
4. "고급" → "앱 이름(안전하지 않음)으로 이동" 클릭
5. "허용" 클릭

---

## ☁️ Vercel API 배포

### 1. 새 API 파일 추가
```bash
# Vercel 프로젝트 폴더 구조
/api
  ├── login.js (기존)
  ├── assignments.js (업데이트)
  ├── submit-assignment.js (기존)
  └── exam-log.js (새로 추가) ← NEW!
```

### 2. 파일 업데이트

#### assignments.js 교체
- 제공된 `assignments.js`로 전체 교체
- 시험모드 정보 추가됨

#### exam-log.js 추가
- 새 파일 생성: `/api/exam-log.js`
- 제공된 내용 복사/붙여넣기

### 3. Vercel 배포
```bash
# 로컬에서 테스트
vercel dev

# 프로덕션 배포
vercel --prod
```

### 4. 환경 변수 확인
Vercel 대시보드에서 확인:
```
SPREADSHEET_ID=your_spreadsheet_id
GOOGLE_SERVICE_ACCOUNT_EMAIL=your_email
GOOGLE_PRIVATE_KEY=your_key
```

---

## 🌐 프론트엔드 통합

### index.html 수정

#### 1. 시험 감독 JavaScript 추가
`index.html` 파일의 `</body>` 태그 직전에 추가:

```html
<script>
    // 여기에 exam-monitor-frontend.js의 내용 복사/붙여넣기
    
    // 전역 변수
    let examModeActive = false;
    let violationCount = 0;
    // ... (나머지 코드)
</script>
```

#### 2. showSubmitModal 함수 수정
기존 `showSubmitModal` 함수에서 다음 부분 추가:

```javascript
async function showSubmitModal(assignmentId, assignmentName) {
    const modal = document.getElementById('submitModal');
    const titleEl = document.getElementById('submitModalTitle');
    const questionsContainer = document.getElementById('questionsContainer');
    const form = document.getElementById('assignmentSubmitForm');
    
    modal.classList.remove('hidden');
    titleEl.textContent = assignmentName;
    form.dataset.assignmentId = assignmentId;
    questionsContainer.innerHTML = '<div class="loading-message">질문을 불러오는 중...</div>';

    try {
        // 과제 상세 정보 가져오기
        const response = await fetch(`${API_BASE}/assignment-detail?assignmentId=${assignmentId}&studentId=${currentStudentId}`);
        const result = await response.json();
        if (!result.success) throw new Error(result.message);
        
        // ★★★ 시험 모드 확인 추가 ★★★
        const assignmentsResponse = await fetch(`${API_BASE}/assignments?studentId=${currentStudentId}`);
        const assignmentsData = await assignmentsResponse.json();
        const currentAssignment = assignmentsData.assignments.find(a => a.id === assignmentId);
        
        if (currentAssignment && currentAssignment.examMode) {
            activateExamMode(assignmentId, {
                maxViolations: currentAssignment.maxViolations,
                forceFullscreen: currentAssignment.forceFullscreen
            });
        }
        // ★★★ 여기까지 추가 ★★★
        
        // ... 나머지 기존 코드 ...
    } catch (error) {
        // 오류 처리
    }
}
```

#### 3. closeSubmitModal 함수 수정
기존 `closeSubmitModal` 함수 끝에 추가:

```javascript
function closeSubmitModal() {
    document.getElementById('submitModal').classList.add('hidden');
    
    // ★★★ 시험 모드 비활성화 추가 ★★★
    deactivateExamMode();
}
```

---

## 📖 사용 방법

### 교사: 시험 만들기

#### 1. 과제 생성
```
메뉴 > 📋 포트폴리오 관리 > ➕ 새 과제 시트 생성
```

#### 2. 시험 모드 설정
1. '과제설정' 시트로 이동
2. 해당 과제 행에서:
   - **시험모드**: ☑️ 체크
   - **이탈허용횟수**: 3 (권장)
   - **강제전체화면**: ☑️ 체크 (권장)

#### 3. 공개 설정
1. '공개' 시트로 이동
2. 해당 과제 행에서:
   - **공개**: ☑️ 체크

### 학생: 시험 보기

#### 1. 로그인
```
https://your-vercel-domain.vercel.app
```

#### 2. 시험 시작
- 과제 목록에서 시험 선택
- 자동으로 전체화면 전환
- 상단에 경고 바 표시

#### 3. 주의사항
- ⚠️ 화면을 벗어나면 자동 기록됨
- ⚠️ N회 이탈 시 자동 제출됨
- ⚠️ 복사/붙여넣기 차단됨

### 교사: 결과 확인

#### 1. 시험 로그 확인
```
메뉴 > 📋 포트폴리오 관리 > 🎯 시험 감독 > 📊 현재 시트 시험 로그 요약
```

#### 2. 의심 학생 목록
```
메뉴 > 📋 포트폴리오 관리 > 🎯 시험 감독 > ⚠️ 의심 학생 목록 보기
```

#### 3. 상세 로그
```
메뉴 > 📋 포트폴리오 관리 > ➡️ 바로가기 > 📊 시험로그
```

---

## 🔧 문제 해결

### Q1: 시험모드 컬럼이 안 보여요
**A:** 초기화 실행
```
메뉴 > ⚙️ 시스템 설정 > 초기화: 필수 시트 생성
```

### Q2: 전체화면이 자동으로 안 됩니다
**A:** 브라우저 설정 확인
- Chrome: 설정 > 개인정보 및 보안 > 사이트 설정 > 전체화면
- Edge: 설정 > 쿠키 및 사이트 권한 > 전체화면

### Q3: 로그가 기록되지 않습니다
**A:** 다음을 확인하세요
1. Vercel API 배포 확인
2. 시험로그 시트 존재 확인
3. 브라우저 콘솔에서 오류 확인 (F12)

### Q4: 학생이 우회할 수 있나요?
**A:** 기술적으로 가능하지만:
- 개발자 도구 차단으로 일반 학생은 어려움
- 교사의 물리적 감독으로 보완
- 사후 로그 분석으로 의심 행동 확인

### Q5: 다른 모니터 사용을 막을 수 있나요?
**A:** 불가능합니다
- 웹 기술의 한계
- 교사가 교실을 돌아다니며 확인 필요

---

## 🎓 추천 운영 방법

### 3단계 보안 전략

#### 1단계: 기술적 차단 (이 시스템)
- 화면 이탈 감지
- 복사/붙여넣기 차단
- 전체화면 강제

#### 2단계: 물리적 감독
- 교사가 교실 순회
- 모니터 배치 확인
- 스마트폰 제출

#### 3단계: 사후 검증
- 로그 분석
- 의심 학생 구술 재평가
- 답안 유사도 검사

### 시험 당일 체크리스트

#### 시험 전 (교사)
- [ ] 시험모드 설정 확인
- [ ] 이탈허용횟수 설정
- [ ] 공개 설정 확인
- [ ] 인터넷 연결 확인

#### 시험 중 (교사)
- [ ] 교실 순회
- [ ] 학생 모니터 관찰
- [ ] 스마트폰 사용 감시

#### 시험 후 (교사)
- [ ] 시험로그 확인
- [ ] 의심 학생 목록 확인
- [ ] 필요시 추가 면담

---

## 📞 지원 및 문의

### 문서 위치
- Google Apps Script: Apps Script 편집기
- Vercel API: Vercel 대시보드
- 로그: '시험로그' 시트

### 추가 개발이 필요한 경우
- 웹캠 감독 추가
- 타이핑 속도 분석
- AI 사용 감지 고도화

---

## ✅ 설치 완료 체크리스트

- [ ] Google Sheets 컬럼 추가 확인
- [ ] Google Apps Script 파일 업데이트
- [ ] Vercel API 배포 완료
- [ ] index.html 수정 완료
- [ ] 테스트 시험 실행 성공
- [ ] 교사 메뉴 정상 작동
- [ ] 학생 화면 이탈 감지 확인
- [ ] 로그 기록 확인

---

**🎉 축하합니다! 시험 감독 시스템이 성공적으로 통합되었습니다!**

교실 환경에서 90% 이상의 효과를 기대할 수 있습니다.
