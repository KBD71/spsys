/**
 * ==============================================
 * 시험 감독 시스템 - 프론트엔드 JavaScript
 * ==============================================
 * index.html의 <script> 태그 안에 추가할 코드입니다.
 * 
 * 이 코드는 다음 기능을 제공합니다:
 * 1. 전체화면 강제 및 이탈 감지
 * 2. 화면 전환 감지 (다른 탭/프로그램)
 * 3. 복사/붙여넣기 차단
 * 4. 주요 단축키 차단
 * 5. 이탈 로그 기록
 */

// ============================================
// 전역 변수
// ============================================
let examModeActive = false;
let violationCount = 0;
let maxViolations = 3;
let currentAssignmentId = null;
let fullscreenRequired = false;

// ============================================
// 시험 모드 활성화 함수
// ============================================
function activateExamMode(assignmentId, settings) {
    examModeActive = true;
    currentAssignmentId = assignmentId;
    violationCount = 0;
    maxViolations = settings.maxViolations || 3;
    fullscreenRequired = settings.forceFullscreen || false;
    
    console.log('🎯 시험 모드 활성화:', {
        assignmentId,
        maxViolations,
        fullscreenRequired
    });
    
    // 경고 메시지 표시
    showExamWarning();
    
    // 전체화면 요청
    if (fullscreenRequired) {
        requestFullscreenMode();
    }
    
    // 이벤트 리스너 등록
    attachExamEventListeners();
    
    // 시험 시작 로그
    logExamEvent('시험시작', 0, '시험 모드 활성화');
}

// ============================================
// 시험 모드 비활성화 함수
// ============================================
function deactivateExamMode() {
    if (!examModeActive) return;
    
    examModeActive = false;
    
    // 이벤트 리스너 제거
    detachExamEventListeners();
    
    // 전체화면 종료
    if (document.fullscreenElement) {
        document.exitFullscreen().catch(err => console.log('전체화면 종료 실패:', err));
    }
    
    // 시험 종료 로그
    logExamEvent('시험종료', 0, `총 위반 횟수: ${violationCount}회`);
    
    console.log('시험 모드 비활성화');
}

// ============================================
// 경고 메시지 표시
// ============================================
function showExamWarning() {
    const warningHtml = `
        <div id="examWarning" style="
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 12px 20px;
            text-align: center;
            z-index: 9999;
            box-shadow: 0 2px 10px rgba(0,0,0,0.2);
            font-weight: 600;
        ">
            🎯 시험 모드 | 화면 이탈 ${violationCount}/${maxViolations}회 | 
            <span style="color: #ffd700;">화면 전환 시 자동 기록됩니다</span>
        </div>
    `;
    
    // 기존 경고 제거
    const existing = document.getElementById('examWarning');
    if (existing) existing.remove();
    
    // 새 경고 추가
    document.body.insertAdjacentHTML('afterbegin', warningHtml);
}

// ============================================
// 경고 메시지 업데이트
// ============================================
function updateExamWarning() {
    const warning = document.getElementById('examWarning');
    if (warning) {
        warning.innerHTML = `
            🎯 시험 모드 | 화면 이탈 ${violationCount}/${maxViolations}회 | 
            <span style="color: ${violationCount >= maxViolations ? '#ff4444' : '#ffd700'};">
                ${violationCount >= maxViolations ? '⚠️ 제한 초과!' : '화면 전환 시 자동 기록됩니다'}
            </span>
        `;
    }
}

// ============================================
// 전체화면 요청
// ============================================
function requestFullscreenMode() {
    const elem = document.documentElement;
    
    if (elem.requestFullscreen) {
        elem.requestFullscreen().catch(err => {
            console.log('전체화면 요청 실패:', err);
            showMessage('submitMessage', '전체화면 모드를 허용해주세요.', 'info');
        });
    } else if (elem.webkitRequestFullscreen) {
        elem.webkitRequestFullscreen();
    } else if (elem.msRequestFullscreen) {
        elem.msRequestFullscreen();
    }
}

// ============================================
// 화면 이탈 처리
// ============================================
function handleVisibilityChange() {
    if (!examModeActive) return;
    
    if (document.hidden) {
        violationCount++;
        logExamEvent('화면이탈', 0, '다른 탭/프로그램으로 전환');
        
        if (violationCount >= maxViolations) {
            alert(`⚠️ 허용된 화면 이탈 횟수(${maxViolations}회)를 초과했습니다.\n시험이 자동 제출됩니다.`);
            autoSubmitExam();
        } else {
            alert(`⚠️ 경고 ${violationCount}/${maxViolations}\n화면 이탈이 감지되었습니다.`);
            updateExamWarning();
        }
    }
}

// ============================================
// 전체화면 이탈 처리
// ============================================
function handleFullscreenChange() {
    if (!examModeActive || !fullscreenRequired) return;
    
    if (!document.fullscreenElement) {
        violationCount++;
        logExamEvent('전체화면해제', 0, 'ESC 키 또는 수동으로 전체화면 해제');
        
        if (violationCount >= maxViolations) {
            alert(`⚠️ 허용된 화면 이탈 횟수(${maxViolations}회)를 초과했습니다.\n시험이 자동 제출됩니다.`);
            autoSubmitExam();
        } else {
            alert(`⚠️ 경고 ${violationCount}/${maxViolations}\n전체화면이 해제되었습니다.\n다시 전체화면으로 전환합니다.`);
            updateExamWarning();
            
            // 2초 후 다시 전체화면 요청
            setTimeout(() => {
                if (examModeActive) requestFullscreenMode();
            }, 2000);
        }
    }
}

// ============================================
// 단축키 차단
// ============================================
function handleKeyDown(e) {
    if (!examModeActive) return;
    
    // 차단할 단축키 목록
    const blockedKeys = [
        { ctrl: true, key: 'T' },  // 새 탭
        { ctrl: true, key: 'N' },  // 새 창
        { ctrl: true, key: 'W' },  // 탭 닫기
        { ctrl: true, shift: true, key: 'I' }, // 개발자 도구
        { key: 'F12' }  // 개발자 도구
    ];
    
    for (const blocked of blockedKeys) {
        if (e.key === blocked.key || e.code === blocked.key) {
            if ((!blocked.ctrl || e.ctrlKey || e.metaKey) &&
                (!blocked.shift || e.shiftKey)) {
                e.preventDefault();
                e.stopPropagation();
                
                logExamEvent('단축키시도', 0, `차단된 단축키: ${e.key}`);
                showMessage('submitMessage', '이 단축키는 시험 중 사용할 수 없습니다.', 'error');
                setTimeout(() => hideMessage('submitMessage'), 2000);
                return false;
            }
        }
    }
}

// ============================================
// 이벤트 리스너 등록
// ============================================
let visibilityChangeHandler = null;
let fullscreenChangeHandler = null;
let keyDownHandler = null;

function attachExamEventListeners() {
    // 화면 이탈 감지
    visibilityChangeHandler = handleVisibilityChange;
    document.addEventListener('visibilitychange', visibilityChangeHandler);
    
    // 전체화면 이탈 감지
    fullscreenChangeHandler = handleFullscreenChange;
    document.addEventListener('fullscreenchange', fullscreenChangeHandler);
    document.addEventListener('webkitfullscreenchange', fullscreenChangeHandler);
    document.addEventListener('mozfullscreenchange', fullscreenChangeHandler);
    document.addEventListener('MSFullscreenChange', fullscreenChangeHandler);
    
    // 단축키 차단
    keyDownHandler = handleKeyDown;
    document.addEventListener('keydown', keyDownHandler, true);
}

// ============================================
// 이벤트 리스너 제거
// ============================================
function detachExamEventListeners() {
    if (visibilityChangeHandler) {
        document.removeEventListener('visibilitychange', visibilityChangeHandler);
        visibilityChangeHandler = null;
    }
    
    if (fullscreenChangeHandler) {
        document.removeEventListener('fullscreenchange', fullscreenChangeHandler);
        document.removeEventListener('webkitfullscreenchange', fullscreenChangeHandler);
        document.removeEventListener('mozfullscreenchange', fullscreenChangeHandler);
        document.removeEventListener('MSFullscreenChange', fullscreenChangeHandler);
        fullscreenChangeHandler = null;
    }
    
    if (keyDownHandler) {
        document.removeEventListener('keydown', keyDownHandler, true);
        keyDownHandler = null;
    }
}

// ============================================
// 로그 전송
// ============================================
async function logExamEvent(eventType, duration, details) {
    if (!currentAssignmentId) return;
    
    try {
        await fetch(`${API_BASE}/exam-log`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                studentId: currentStudentId,
                assignmentId: currentAssignmentId,
                eventType: eventType,
                duration: duration,
                details: details
            })
        });
        
        console.log(`📊 로그 기록: ${eventType}`);
    } catch (error) {
        console.error('로그 전송 실패:', error);
    }
}

// ============================================
// 자동 제출
// ============================================
function autoSubmitExam() {
    deactivateExamMode();
    
    // 기존 제출 함수 호출
    const submitForm = document.getElementById('assignmentSubmitForm');
    if (submitForm) {
        submitAssignment();
    }
}

// ============================================
// 기존 showSubmitModal 함수 수정
// ============================================
// 이 함수는 index.html의 기존 showSubmitModal 함수를 대체합니다.
// async function showSubmitModal(assignmentId, assignmentName) {
//     ... 기존 코드 ...
//     
//     // ★★★ 시험 모드 확인 추가 ★★★
//     const response = await fetch(`${API_BASE}/assignment-detail?assignmentId=${assignmentId}&studentId=${currentStudentId}`);
//     const result = await response.json();
//     
//     // 시험 모드 확인
//     const assignmentsResponse = await fetch(`${API_BASE}/assignments?studentId=${currentStudentId}`);
//     const assignmentsData = await assignmentsResponse.json();
//     const currentAssignment = assignmentsData.assignments.find(a => a.id === assignmentId);
//     
//     if (currentAssignment && currentAssignment.examMode) {
//         activateExamMode(assignmentId, {
//             maxViolations: currentAssignment.maxViolations,
//             forceFullscreen: currentAssignment.forceFullscreen
//         });
//     }
//     
//     ... 나머지 기존 코드 ...
// }

// ============================================
// 기존 closeSubmitModal 함수 수정
// ============================================
// 이 함수는 index.html의 기존 closeSubmitModal 함수에 추가합니다.
// function closeSubmitModal() {
//     ... 기존 코드 ...
//     
//     // ★★★ 시험 모드 비활성화 추가 ★★★
//     deactivateExamMode();
// }
