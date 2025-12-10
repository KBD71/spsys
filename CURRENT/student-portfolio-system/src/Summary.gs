/**
 * ==============================================
 * Summary.gs - 데이터 종합 기능 (New)
 * ==============================================
 * 여러 과제 시트에서 특정 열을 선택하여 하나의 시트로 모으는 기능을 담당합니다.
 * 학번(ID)을 기준으로 데이터를 병합하여 학생 정보가 섞이지 않도록 합니다.
 */

/**
 * '과제설정' 시트에 등록된 과제 목록을 가져옵니다.
 * @returns {Array<string>} 과제 시트 이름 목록
 */
function getAssignmentSheetList() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const settingsSheet = ss.getSheetByName('과제설정');
    if (!settingsSheet || settingsSheet.getLastRow() < 2) return [];

    const data = settingsSheet.getDataRange().getValues();
    const headers = data[0];
    const targetSheetIndex = headers.indexOf('대상시트');

    if (targetSheetIndex === -1) return [];

    // 2행부터 마지막 행까지 '대상시트' 열의 값을 추출하여 유효한 시트 이름만 필터링
    const sheetNames = data.slice(1)
      .map(row => row[targetSheetIndex])
      .filter(name => name && ss.getSheetByName(name));

    return sheetNames;
  } catch (e) {
    Logger.log("getAssignmentSheetList Error: " + e.message);
    throw new Error("과제 목록을 불러오는 중 오류가 발생했습니다.");
  }
}

/**
 * 특정 시트의 헤더 목록을 가져옵니다.
 * @param {string} sheetName - 대상 시트 이름
 * @returns {Array<string>} 헤더 목록
 */
function getSheetHeaders(sheetName) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) throw new Error(`'${sheetName}' 시트를 찾을 수 없습니다.`);

    const lastCol = sheet.getLastColumn();
    if (lastCol < 1) return [];

    const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
    return headers.map(String); // 모든 헤더를 문자열로 변환
  } catch (e) {
    Logger.log(`getSheetHeaders Error (${sheetName}): ` + e.message);
    throw new Error(`'${sheetName}' 시트의 헤더를 가져오는 중 오류가 발생했습니다.`);
  }
}

/**
 * 선택된 시트와 컬럼들을 종합하여 새로운 시트를 생성합니다.
 * @param {string} title - 생성할 시트의 제목
 * @param {Array<Object>} selections - 선택 정보 배열 [{ sheetName: "...", header: "..." }, ...]
 * @returns {string} 결과 메시지
 */
function generateSummarySheet(title, selections) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ui = SpreadsheetApp.getUi();

  try {
    if (!title) throw new Error("시트 제목을 입력해주세요.");
    if (!selections || selections.length === 0) throw new Error("선택된 데이터가 없습니다.");

    // 1. 전체 학생 명단 가져오기 (기준 데이터)
    // Dashboard.gs의 getFullStudentList_v18 함수 재사용 (또는 직접 구현)
    // 여기서는 직접 구현하여 의존성을 줄임 (하지만 로직은 동일하게 유지)
    const studentSheet = ss.getSheetByName("학생명단_전체");
    if (!studentSheet || studentSheet.getLastRow() < 2) throw new Error("'학생명단_전체' 시트가 없습니다.");

    const studentData = studentSheet.getRange(2, 1, studentSheet.getLastRow() - 1, 4).getValues();
    // Map 구조: Key=학번(ID), Value={ 기본정보배열, 추가데이터배열 }
    const studentMap = new Map();
    
    // 기본 학생 정보 로드
    studentData.forEach(row => {
      const id = String(row[0]).trim(); // 학번
      if (id) {
        // [학번, 반, 번호, 이름]
        studentMap.set(id, { 
          basicInfo: [row[0], row[1], row[2], row[3]], 
          addedData: [] 
        });
      }
    });

    // 2. 선택된 시트들의 데이터 로드 및 매핑
    const newHeaders = ["학번", "반", "번호", "이름"];

    selections.forEach(sel => {
        const sheetName = sel.sheetName;
        const targetHeader = sel.header;
        
        // 헤더에 시트명 포함하여 구분 (예: [과제1] 종합의견)
        newHeaders.push(`[${sheetName}] ${targetHeader}`);

        const sourceSheet = ss.getSheetByName(sheetName);
        if (!sourceSheet) return; // 시트가 없으면 건너뜀

        const sourceData = sourceSheet.getDataRange().getValues();
        if (sourceData.length < 2) return;

        const sourceHeaders = sourceData[0];
        const idIndex = sourceHeaders.indexOf("학번"); // 학번 컬럼 찾기 (학번 기준 매칭)
        const targetIndex = sourceHeaders.indexOf(targetHeader);

        if (idIndex === -1 || targetIndex === -1) {
            // 해당 시트에 학번이나 목표 컬럼이 없으면 모든 학생에게 빈 값 처리
            return; 
        }

        // 해당 시트의 데이터를 Map으로 임시 저장 (빠른 조회를 위해)
        const sourceMap = new Map();
        for (let i = 1; i < sourceData.length; i++) {
            const row = sourceData[i];
            const id = String(row[idIndex]).trim();
            const value = row[targetIndex];
            sourceMap.set(id, value);
        }

        // 전체 학생 Map 순회하며 데이터 추가
        studentMap.forEach((val, key) => {
            const matchedValue = sourceMap.has(key) ? sourceMap.get(key) : "";
            val.addedData.push(matchedValue);
        });
    });

    // 3. 결과 데이터 배열 생성
    const resultRows = [];
    studentMap.forEach((val, key) => {
        resultRows.push([...val.basicInfo, ...val.addedData]);
    });

    // 학번 등 기준 정렬 (옵션) - 현재는 학생명단 순서(입력순) 유지

    // 4. 새 시트 생성 및 쓰기
    let finalSheetName = title;
    let counter = 1;
    while (ss.getSheetByName(finalSheetName)) {
        finalSheetName = `${title} (${counter++})`;
    }

    // AI 생성을 위한 컬럼 및 건의사항(학생용) 추가
    newHeaders.push("종합의견", "초안생성", "건의사항");

    const newSheet = ss.insertSheet(finalSheetName);
    
    // 헤더 쓰기
    newSheet.getRange(1, 1, 1, newHeaders.length)
        .setValues([newHeaders])
        .setFontWeight("bold")
        .setBackground("#E0E0E0")
        .setBorder(true, true, true, true, true, true);

    // 데이터 쓰기
    if (resultRows.length > 0) {
        // 결과 행에 빈 값 추가 (종합의견, 초안생성, 건의사항)
        const extendedRows = resultRows.map(row => [...row, "", false, ""]);
        newSheet.getRange(2, 1, extendedRows.length, extendedRows[0].length).setValues(extendedRows);
    }

    // 포맷팅
    newSheet.autoResizeColumns(1, newHeaders.length);
    newSheet.setFrozenRows(1);
    newSheet.setFrozenColumns(4); // 기본 정보 고정

    // 초안생성 열에 체크박스 삽입
    const draftColIndex = newHeaders.indexOf("초안생성") + 1;
    if (draftColIndex > 0) {
        newSheet.getRange(2, draftColIndex, newSheet.getMaxRows() - 1, 1).insertCheckboxes();
    }

    // 종합의견 열 너비 조정
    const opinionColIndex = newHeaders.indexOf("종합의견") + 1;
    if (opinionColIndex > 0) {
        newSheet.setColumnWidth(opinionColIndex, 300);
        newSheet.setWrap(true);
    }
    
    // 건의사항 열 너비 조정
    const suggestionColIndex = newHeaders.indexOf("건의사항") + 1;
    if (suggestionColIndex > 0) {
        newSheet.setColumnWidth(suggestionColIndex, 200);
        newSheet.setWrap(true);
    }

    // 5. '공개' 시트에 등록
    const publicSheet = ss.getSheetByName('공개');
    if (publicSheet) {
        // [과제공개, 대상시트, 대상반, 의견공개, 알림메시지]
        // 기본값: 과제공개(False), 전체, 의견공개(False)
        publicSheet.appendRow([false, finalSheetName, '전체', false, '']);
        
        const lastRow = publicSheet.getLastRow();
        // 체크박스 추가 (1열: 과제공개, 4열: 의견공개)
        publicSheet.getRange(lastRow, 1).insertCheckboxes();
        publicSheet.getRange(lastRow, 4).insertCheckboxes();
    }

    return `'${finalSheetName}' 시트가 생성되었습니다.\n(공개 시트에 등록됨)`;

  } catch (e) {
    Logger.log("generateSummarySheet Error: " + e.message + "\n" + e.stack);
    throw new Error("종합 시트 생성 실패: " + e.message);
  }
}
