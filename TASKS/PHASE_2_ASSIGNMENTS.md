# Phase 2: 과제 관리 시스템 구현 계획

## 📋 개요

학생들이 대시보드에서 과제를 선택하고 제출할 수 있는 시스템 구현

**구현 시점**: 사용자 지시 대기 중
**예상 작업 시간**: 2-3시간
**난이도**: 중급

---

## 🎯 목표 기능

### 교사용 기능
1. 과제 등록/수정/삭제
2. 과제 목록 관리
3. 제출 현황 확인
4. 마감일 관리

### 학생용 기능
1. 과제 목록 조회
2. 과제 선택 및 제출
3. 제출 내역 확인
4. 마감일 확인

---

## 📊 데이터 구조

### Google Sheets 구조

#### 시트 1: '학생명단_전체' (기존)
| 학번 | 이름 | 반 | 비밀번호 | 이메일 | 비밀번호변경일 | 변경횟수 |
|------|------|-----|----------|--------|---------------|----------|

#### 시트 2: '과제설정' (신규)
| 과제ID | 과제명 | 설명 | 마감일 | 배점 | 대상반 | 생성일 | 상태 |
|--------|--------|------|--------|------|--------|--------|------|
| A001 | 자기소개서 | 1000자 이내 | 2025-10-15 | 10 | 전체 | 2025-10-01 | 활성 |
| A002 | 수학 과제 | 1-5단원 문제 | 2025-10-20 | 15 | 1학년 | 2025-10-02 | 활성 |

**컬럼 설명**:
- **과제ID**: 자동 생성 (A001, A002...)
- **과제명**: 과제 제목
- **설명**: 과제 상세 설명
- **마감일**: YYYY-MM-DD 형식
- **배점**: 점수
- **대상반**: "전체", "1학년", "1-1" 등
- **생성일**: 과제 생성 날짜
- **상태**: "활성", "마감", "삭제"

#### 시트 3: '과제제출' (신규)
| 제출ID | 학번 | 과제ID | 제출일시 | 제출내용 | 점수 | 평가일 | 평가자 |
|--------|------|--------|----------|----------|------|--------|--------|
| S001 | 20240101 | A001 | 2025-10-02 10:00 | 안녕하세요... | 9 | 2025-10-03 | 홍교사 |

---

## 🔧 구현 계획

### 1단계: Google Sheets 설정

**작업 내용**:
```
1. Google Sheets 열기
2. 새 시트 추가: '과제설정'
3. 헤더 입력: 과제ID | 과제명 | 설명 | 마감일 | 배점 | 대상반 | 생성일 | 상태
4. 새 시트 추가: '과제제출'
5. 헤더 입력: 제출ID | 학번 | 과제ID | 제출일시 | 제출내용 | 점수 | 평가일 | 평가자
```

**테스트 데이터**:
```
과제설정:
A001 | 자기소개서 | 1000자 이내로 작성 | 2025-10-15 | 10 | 전체 | 2025-10-01 | 활성
A002 | 진로 계획서 | 5년 후 모습 | 2025-10-20 | 15 | 전체 | 2025-10-02 | 활성
```

---

### 2단계: API 구현

#### Apps Script 버전

**CURRENT/코드.gs에 추가**:

```javascript
// 과제 목록 조회
function getAssignments(studentId) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const studentSheet = ss.getSheetByName(CONFIG.SHEET_NAME);
    const assignmentSheet = ss.getSheetByName('과제설정');

    // 학생 정보 조회 (반 확인)
    const student = findStudentByIdInternal(studentId, studentSheet);
    if (!student) {
      return { success: false, message: '학생을 찾을 수 없습니다.' };
    }

    // 과제 목록 가져오기
    const data = assignmentSheet.getDataRange().getValues();
    const headers = data[0];
    const assignments = [];

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const assignment = {
        id: row[0],
        name: row[1],
        description: row[2],
        dueDate: row[3],
        points: row[4],
        targetClass: row[5],
        status: row[7]
      };

      // 상태가 '활성'이고, 대상반이 맞는 과제만
      if (assignment.status === '활성') {
        if (assignment.targetClass === '전체' ||
            assignment.targetClass === student.class.split('-')[0] + '학년' ||
            assignment.targetClass === student.class) {
          assignments.push(assignment);
        }
      }
    }

    return {
      success: true,
      assignments: assignments
    };

  } catch (error) {
    return {
      success: false,
      message: '과제 목록 조회 중 오류: ' + error.message
    };
  }
}

// 과제 제출
function submitAssignment(studentId, assignmentId, content) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const submissionSheet = ss.getSheetByName('과제제출');

    // 제출ID 생성 (S + 번호)
    const lastRow = submissionSheet.getLastRow();
    const submissionId = 'S' + String(lastRow).padStart(3, '0');

    // 제출일시
    const now = new Date();

    // 새 행 추가
    submissionSheet.appendRow([
      submissionId,
      studentId,
      assignmentId,
      now,
      content,
      '', // 점수 (나중에 평가)
      '', // 평가일
      ''  // 평가자
    ]);

    return {
      success: true,
      message: '과제가 제출되었습니다.',
      submissionId: submissionId
    };

  } catch (error) {
    return {
      success: false,
      message: '과제 제출 중 오류: ' + error.message
    };
  }
}

// 제출 내역 조회
function getMySubmissions(studentId) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const submissionSheet = ss.getSheetByName('과제제출');

    const data = submissionSheet.getDataRange().getValues();
    const submissions = [];

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (row[1] === studentId) { // 학번 매칭
        submissions.push({
          id: row[0],
          assignmentId: row[2],
          submitDate: row[3],
          content: row[4],
          score: row[5],
          evaluateDate: row[6],
          evaluator: row[7]
        });
      }
    }

    return {
      success: true,
      submissions: submissions
    };

  } catch (error) {
    return {
      success: false,
      message: '제출 내역 조회 중 오류: ' + error.message
    };
  }
}
```

#### Vercel 버전

**VERCEL/api/assignments.js** (신규):

```javascript
const { getSheetsClient } = require('./sheets');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    // 과제 목록 조회
    const { studentId } = req.query;

    try {
      const sheets = await getSheetsClient();
      const spreadsheetId = process.env.SPREADSHEET_ID;

      // 학생 정보 조회
      const studentResponse = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: '학생명단_전체!A:C'
      });

      const studentData = studentResponse.data.values;
      const student = studentData.find(row => row[0] === studentId);

      if (!student) {
        return res.status(404).json({
          success: false,
          message: '학생을 찾을 수 없습니다.'
        });
      }

      // 과제 목록 조회
      const assignmentResponse = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: '과제설정!A:H'
      });

      const assignmentData = assignmentResponse.data.values;
      const assignments = [];

      for (let i = 1; i < assignmentData.length; i++) {
        const row = assignmentData[i];
        if (row[7] === '활성') { // 상태
          const targetClass = row[5];
          const studentClass = student[2];

          if (targetClass === '전체' ||
              targetClass === studentClass.split('-')[0] + '학년' ||
              targetClass === studentClass) {
            assignments.push({
              id: row[0],
              name: row[1],
              description: row[2],
              dueDate: row[3],
              points: row[4],
              targetClass: row[5]
            });
          }
        }
      }

      return res.status(200).json({
        success: true,
        assignments
      });

    } catch (error) {
      return res.status(500).json({
        success: false,
        message: '과제 목록 조회 실패: ' + error.message
      });
    }
  }

  if (req.method === 'POST') {
    // 과제 제출
    const { studentId, assignmentId, content } = req.body;

    try {
      const sheets = await getSheetsClient();
      const spreadsheetId = process.env.SPREADSHEET_ID;

      // 제출ID 생성
      const submissionResponse = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: '과제제출!A:A'
      });

      const lastRow = submissionResponse.data.values?.length || 1;
      const submissionId = 'S' + String(lastRow).padStart(3, '0');

      // 제출
      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: '과제제출!A:H',
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [[
            submissionId,
            studentId,
            assignmentId,
            new Date().toISOString(),
            content,
            '', // 점수
            '', // 평가일
            ''  // 평가자
          ]]
        }
      });

      return res.status(200).json({
        success: true,
        message: '과제가 제출되었습니다.',
        submissionId
      });

    } catch (error) {
      return res.status(500).json({
        success: false,
        message: '과제 제출 실패: ' + error.message
      });
    }
  }

  return res.status(405).json({
    success: false,
    message: 'Method not allowed'
  });
};
```

---

### 3단계: UI 구현

#### 대시보드 화면 추가

**HTML 구조**:

```html
<!-- 로그인 후 대시보드 -->
<div id="dashboardSection" style="display: none;">
  <div class="dashboard-header">
    <h2>학생 포트폴리오</h2>
    <p>환영합니다, <span id="studentName"></span>님!</p>
  </div>

  <!-- 과제 목록 -->
  <div class="assignment-section">
    <h3>📝 과제 목록</h3>
    <div id="assignmentList"></div>
  </div>

  <!-- 제출 내역 -->
  <div class="submission-section">
    <h3>✅ 제출 내역</h3>
    <div id="submissionList"></div>
  </div>

  <!-- 비밀번호 변경 (기존) -->
  <div class="password-section">
    <h3>🔐 비밀번호 변경</h3>
    <!-- 기존 비밀번호 변경 폼 -->
  </div>
</div>
```

#### JavaScript 함수

```javascript
// 과제 목록 로드
async function loadAssignments() {
  const studentId = sessionStorage.getItem('studentId');

  try {
    // Apps Script 버전
    google.script.run
      .withSuccessHandler(function(result) {
        if (result.success) {
          displayAssignments(result.assignments);
        } else {
          alert(result.message);
        }
      })
      .getAssignments(studentId);

    // Vercel 버전 (주석 처리)
    /*
    const response = await fetch(`/api/assignments?studentId=${studentId}`);
    const result = await response.json();
    if (result.success) {
      displayAssignments(result.assignments);
    }
    */
  } catch (error) {
    alert('과제 목록 로드 실패: ' + error.message);
  }
}

// 과제 목록 표시
function displayAssignments(assignments) {
  const container = document.getElementById('assignmentList');

  if (assignments.length === 0) {
    container.innerHTML = '<p>등록된 과제가 없습니다.</p>';
    return;
  }

  let html = '<div class="assignments">';
  assignments.forEach(assignment => {
    html += `
      <div class="assignment-card">
        <h4>${assignment.name}</h4>
        <p>${assignment.description}</p>
        <p>마감: ${assignment.dueDate} | 배점: ${assignment.points}점</p>
        <button onclick="showSubmitForm('${assignment.id}', '${assignment.name}')">
          제출하기
        </button>
      </div>
    `;
  });
  html += '</div>';

  container.innerHTML = html;
}

// 제출 폼 표시
function showSubmitForm(assignmentId, assignmentName) {
  const content = prompt(`과제 "${assignmentName}" 제출\n\n내용을 입력하세요:`);

  if (content && content.trim()) {
    submitAssignment(assignmentId, content.trim());
  }
}

// 과제 제출
async function submitAssignment(assignmentId, content) {
  const studentId = sessionStorage.getItem('studentId');

  try {
    // Apps Script 버전
    google.script.run
      .withSuccessHandler(function(result) {
        if (result.success) {
          alert('과제가 제출되었습니다!');
          loadAssignments(); // 새로고침
          loadSubmissions(); // 제출 내역 새로고침
        } else {
          alert(result.message);
        }
      })
      .submitAssignment(studentId, assignmentId, content);

    // Vercel 버전 (주석 처리)
    /*
    const response = await fetch('/api/assignments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentId, assignmentId, content })
    });
    const result = await response.json();
    if (result.success) {
      alert('과제가 제출되었습니다!');
    }
    */
  } catch (error) {
    alert('과제 제출 실패: ' + error.message);
  }
}
```

---

### 4단계: CSS 스타일링

```css
.dashboard-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 2rem;
  border-radius: 12px;
  margin-bottom: 2rem;
}

.assignment-section, .submission-section, .password-section {
  background: white;
  padding: 1.5rem;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  margin-bottom: 1.5rem;
}

.assignment-card {
  border: 1px solid #e0e0e0;
  padding: 1rem;
  border-radius: 8px;
  margin-bottom: 1rem;
}

.assignment-card h4 {
  margin: 0 0 0.5rem 0;
  color: #333;
}

.assignment-card button {
  background: #667eea;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  cursor: pointer;
}

.assignment-card button:hover {
  background: #5568d3;
}
```

---

## ✅ 테스트 시나리오

### 1. 과제 목록 조회
```
1. 학생 로그인
2. 대시보드에서 과제 목록 확인
3. 본인 반에 해당하는 과제만 표시되는지 확인
4. 마감된 과제는 표시되지 않는지 확인
```

### 2. 과제 제출
```
1. 과제 "제출하기" 버튼 클릭
2. 내용 입력
3. 제출 완료 메시지 확인
4. 제출 내역에 추가되었는지 확인
```

### 3. 제출 내역 조회
```
1. 제출 내역 섹션 확인
2. 제출한 과제 목록 표시 확인
3. 제출일, 점수, 평가 여부 확인
```

---

## 📝 구현 체크리스트

### Google Sheets
- [ ] '과제설정' 시트 생성
- [ ] '과제제출' 시트 생성
- [ ] 테스트 데이터 입력

### Apps Script (CURRENT/)
- [ ] getAssignments() 함수 추가
- [ ] submitAssignment() 함수 추가
- [ ] getMySubmissions() 함수 추가
- [ ] 웹페이지.html에 대시보드 UI 추가
- [ ] JavaScript 함수 추가
- [ ] CSS 스타일 추가

### Vercel (VERCEL/)
- [ ] api/assignments.js 생성
- [ ] api/submissions.js 생성 (선택)
- [ ] index.html에 대시보드 UI 추가
- [ ] fetch() 기반 JavaScript 함수 추가
- [ ] CSS 스타일 추가

### 테스트
- [ ] 과제 목록 조회 테스트
- [ ] 과제 제출 테스트
- [ ] 제출 내역 조회 테스트
- [ ] 반별 과제 필터링 테스트
- [ ] 마감 과제 숨김 테스트

---

## 🚀 배포 후 작업

1. Google Sheets에 실제 과제 데이터 입력
2. 학생들에게 기능 안내
3. 제출 현황 모니터링
4. 피드백 수집

---

**사용자 지시가 있으면 이 계획대로 구현을 시작합니다.**

**마지막 업데이트**: 2025-10-02
