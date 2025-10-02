/**
 * 통합 테스트 스크립트
 * 전체 시스템의 기능을 테스트하는 함수들
 */

/**
 * 전체 시스템 통합 테스트
 */
function runIntegrationTests() {
  Logger.log('╔═══════════════════════════════════════════════╗');
  Logger.log('║     학생 포트폴리오 시스템 통합 테스트       ║');
  Logger.log('╚═══════════════════════════════════════════════╝\n');

  const results = {
    total: 0,
    passed: 0,
    failed: 0,
    tests: []
  };

  // 1. 설정 테스트
  results.tests.push(runTest('설정 로드', testConfigLoad));

  // 2. 보안 기능 테스트
  results.tests.push(runTest('비밀번호 해싱', testPasswordHashing));
  results.tests.push(runTest('비밀번호 검증', testPasswordVerification));

  // 3. Rate Limiting 테스트
  results.tests.push(runTest('Rate Limiting', testRateLimit));

  // 4. 학생 데이터 검색 테스트
  results.tests.push(runTest('학생 검색', testStudentSearch));

  // 5. 입력 검증 테스트
  results.tests.push(runTest('입력 검증', testInputValidation));

  // 6. 캐시 기능 테스트
  results.tests.push(runTest('캐시 기능', testCacheFunction));

  // 7. 시스템 진단 테스트
  results.tests.push(runTest('시스템 진단', testSystemDiagnosis));

  // 결과 집계
  results.total = results.tests.length;
  results.passed = results.tests.filter(t => t.passed).length;
  results.failed = results.total - results.passed;

  // 결과 출력
  Logger.log('\n' + '═'.repeat(50));
  Logger.log('테스트 결과 요약:');
  Logger.log(`  총 테스트: ${results.total}`);
  Logger.log(`  성공: ${results.passed} ✅`);
  Logger.log(`  실패: ${results.failed} ❌`);
  Logger.log('═'.repeat(50) + '\n');

  // 상세 결과
  Logger.log('상세 결과:');
  results.tests.forEach((test, index) => {
    const icon = test.passed ? '✅' : '❌';
    Logger.log(`  ${index + 1}. ${icon} ${test.name}: ${test.message}`);
  });

  Logger.log('\n╔═══════════════════════════════════════════════╗');
  Logger.log('║            통합 테스트 완료                   ║');
  Logger.log('╚═══════════════════════════════════════════════╝');

  return results;
}

/**
 * 테스트 실행 헬퍼 함수
 */
function runTest(name, testFunction) {
  try {
    const result = testFunction();
    return {
      name: name,
      passed: result.success,
      message: result.message
    };
  } catch (error) {
    return {
      name: name,
      passed: false,
      message: `오류: ${error.message}`
    };
  }
}

/**
 * 설정 로드 테스트
 */
function testConfigLoad() {
  try {
    const config = getPasswordConfig();
    const sheetNames = getSheetNames();
    const columnNames = getColumnNames();

    if (!config || !sheetNames || !columnNames) {
      return {
        success: false,
        message: '설정 객체를 로드할 수 없습니다.'
      };
    }

    if (!config.MIN_LENGTH || !config.MAX_LENGTH) {
      return {
        success: false,
        message: '비밀번호 설정이 불완전합니다.'
      };
    }

    return {
      success: true,
      message: `설정 로드 성공 (최소: ${config.MIN_LENGTH}, 최대: ${config.MAX_LENGTH})`
    };

  } catch (error) {
    return {
      success: false,
      message: error.message
    };
  }
}

/**
 * 비밀번호 해싱 테스트
 */
function testPasswordHashing() {
  try {
    const password = 'test1234';
    const hashed = hashPassword(password);

    if (!hashed || hashed.length === 0) {
      return {
        success: false,
        message: '해싱 실패'
      };
    }

    if (hashed === password) {
      return {
        success: false,
        message: '비밀번호가 해싱되지 않았습니다.'
      };
    }

    return {
      success: true,
      message: `해싱 성공 (길이: ${hashed.length})`
    };

  } catch (error) {
    return {
      success: false,
      message: error.message
    };
  }
}

/**
 * 비밀번호 검증 테스트
 */
function testPasswordVerification() {
  try {
    const password = 'test1234';
    const hashed = hashPassword(password);

    const validResult = verifyPassword(password, hashed);
    const invalidResult = verifyPassword('wrong', hashed);

    if (!validResult) {
      return {
        success: false,
        message: '올바른 비밀번호 검증 실패'
      };
    }

    if (invalidResult) {
      return {
        success: false,
        message: '잘못된 비밀번호가 통과됨'
      };
    }

    return {
      success: true,
      message: '검증 로직 정상'
    };

  } catch (error) {
    return {
      success: false,
      message: error.message
    };
  }
}

/**
 * Rate Limiting 테스트
 */
function testRateLimit() {
  try {
    const testId = 'test_' + new Date().getTime();

    // Rate Limit 리셋
    resetRateLimit(testId, 'login');

    // 첫 번째 시도 - 성공해야 함
    const result1 = checkRateLimit(testId, 'login');
    if (!result1.allowed) {
      return {
        success: false,
        message: '첫 번째 시도가 차단됨'
      };
    }

    // 정리
    resetRateLimit(testId, 'login');

    return {
      success: true,
      message: 'Rate Limiting 정상 작동'
    };

  } catch (error) {
    return {
      success: false,
      message: error.message
    };
  }
}

/**
 * 학생 검색 테스트
 */
function testStudentSearch() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_NAMES.STUDENTS);

    if (!sheet) {
      return {
        success: false,
        message: '학생명단 시트를 찾을 수 없습니다.'
      };
    }

    const lastRow = sheet.getLastRow();
    if (lastRow < 2) {
      return {
        success: true,
        message: '테스트할 데이터가 없습니다 (정상)'
      };
    }

    // 첫 번째 학생 데이터로 테스트
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const firstStudent = sheet.getRange(2, 1, 1, sheet.getLastColumn()).getValues()[0];

    const studentIdCol = headers.indexOf(COLUMN_NAMES.STUDENT_ID);
    const testStudentId = firstStudent[studentIdCol];

    if (!testStudentId) {
      return {
        success: false,
        message: '테스트 학번이 없습니다.'
      };
    }

    const result = findStudentData(testStudentId);

    if (!result.found) {
      return {
        success: false,
        message: `학생 검색 실패 (학번: ${testStudentId})`
      };
    }

    return {
      success: true,
      message: `학생 검색 성공 (${result.name || '이름없음'})`
    };

  } catch (error) {
    return {
      success: false,
      message: error.message
    };
  }
}

/**
 * 입력 검증 테스트
 */
function testInputValidation() {
  try {
    // XSS 테스트
    const xssInput = '<script>alert("xss")</script>';
    const xssResult = validateSecureInput(xssInput, 'general');

    if (xssResult.valid) {
      return {
        success: false,
        message: 'XSS 패턴이 차단되지 않음'
      };
    }

    // SQL Injection 테스트
    const sqlInput = "1' OR '1'='1";
    const sqlResult = validateSecureInput(sqlInput, 'general');

    if (sqlResult.valid) {
      return {
        success: false,
        message: 'SQL Injection 패턴이 차단되지 않음'
      };
    }

    // 정상 입력 테스트
    const validInput = '20240101';
    const validResult = validateSecureInput(validInput, 'studentId');

    if (!validResult.valid) {
      return {
        success: false,
        message: '정상 입력이 차단됨'
      };
    }

    return {
      success: true,
      message: '입력 검증 정상'
    };

  } catch (error) {
    return {
      success: false,
      message: error.message
    };
  }
}

/**
 * 캐시 기능 테스트
 */
function testCacheFunction() {
  try {
    const cache = CacheService.getScriptCache();
    const testKey = 'test_' + new Date().getTime();
    const testValue = 'test_value';

    // 캐시 저장
    cache.put(testKey, testValue, 10);

    // 캐시 조회
    const retrieved = cache.get(testKey);

    if (retrieved !== testValue) {
      return {
        success: false,
        message: '캐시 저장/조회 실패'
      };
    }

    // 캐시 삭제
    cache.remove(testKey);

    const afterRemove = cache.get(testKey);
    if (afterRemove !== null) {
      return {
        success: false,
        message: '캐시 삭제 실패'
      };
    }

    return {
      success: true,
      message: '캐시 기능 정상'
    };

  } catch (error) {
    return {
      success: false,
      message: error.message
    };
  }
}

/**
 * 시스템 진단 테스트
 */
function testSystemDiagnosis() {
  try {
    const diagnosis = diagnoseSystem();

    if (!diagnosis) {
      return {
        success: false,
        message: '진단 결과를 받을 수 없음'
      };
    }

    const issueCount = diagnosis.diagnosis.issues.length;

    return {
      success: issueCount === 0,
      message: issueCount === 0
        ? '시스템 정상'
        : `${issueCount}개의 문제 발견`
    };

  } catch (error) {
    return {
      success: false,
      message: error.message
    };
  }
}

/**
 * 성능 테스트
 */
function runPerformanceTests() {
  Logger.log('=== 성능 테스트 시작 ===\n');

  const results = [];

  // 1. 비밀번호 해싱 성능
  results.push(measurePerformance('비밀번호 해싱 (100회)', () => {
    for (let i = 0; i < 100; i++) {
      hashPassword('test1234');
    }
  }));

  // 2. 학생 검색 성능
  results.push(measurePerformance('학생 검색 (캐시 없음)', () => {
    findStudentData('20240101');
  }));

  // 3. 학생 검색 성능 (캐시 사용)
  results.push(measurePerformance('학생 검색 (캐시 사용)', () => {
    findStudentDataOptimized('20240101');
  }));

  // 결과 출력
  Logger.log('성능 테스트 결과:\n');
  results.forEach((result, index) => {
    Logger.log(`${index + 1}. ${result.name}: ${result.duration}ms`);
  });

  Logger.log('\n=== 성능 테스트 완료 ===');

  return results;
}

/**
 * 성능 측정 헬퍼 함수
 */
function measurePerformance(name, func) {
  const start = new Date().getTime();

  try {
    func();
  } catch (error) {
    Logger.log(`성능 측정 오류 (${name}): ${error.message}`);
  }

  const end = new Date().getTime();
  const duration = end - start;

  return {
    name: name,
    duration: duration
  };
}

/**
 * 스트레스 테스트
 */
function runStressTest() {
  Logger.log('=== 스트레스 테스트 시작 ===\n');

  const iterations = 100;
  const testStudentId = '99999';

  Logger.log(`${iterations}회 로그인 시도 테스트 시작...\n`);

  let successCount = 0;
  let failCount = 0;

  const start = new Date().getTime();

  for (let i = 0; i < iterations; i++) {
    try {
      const result = findStudentData(testStudentId);
      if (result.found) {
        successCount++;
      } else {
        failCount++;
      }
    } catch (error) {
      failCount++;
      Logger.log(`반복 ${i + 1} 오류: ${error.message}`);
    }
  }

  const end = new Date().getTime();
  const duration = end - start;

  Logger.log('스트레스 테스트 결과:');
  Logger.log(`  총 시도: ${iterations}회`);
  Logger.log(`  성공: ${successCount}회`);
  Logger.log(`  실패: ${failCount}회`);
  Logger.log(`  총 소요 시간: ${duration}ms`);
  Logger.log(`  평균 응답 시간: ${(duration / iterations).toFixed(2)}ms`);

  Logger.log('\n=== 스트레스 테스트 완료 ===');

  return {
    iterations: iterations,
    successCount: successCount,
    failCount: failCount,
    totalDuration: duration,
    averageDuration: duration / iterations
  };
}

/**
 * 모든 테스트 실행
 */
function runAllTests() {
  Logger.log('╔═══════════════════════════════════════════════╗');
  Logger.log('║         전체 테스트 스위트 실행               ║');
  Logger.log('╚═══════════════════════════════════════════════╝\n');

  // 1. 통합 테스트
  const integrationResults = runIntegrationTests();

  Logger.log('\n');

  // 2. 보안 테스트
  runSecurityTests();

  Logger.log('\n');

  // 3. 성능 테스트
  const performanceResults = runPerformanceTests();

  Logger.log('\n');

  // 4. 시스템 진단
  diagnoseSystem();

  Logger.log('\n╔═══════════════════════════════════════════════╗');
  Logger.log('║           전체 테스트 완료                    ║');
  Logger.log('╚═══════════════════════════════════════════════╝');

  return {
    integration: integrationResults,
    performance: performanceResults
  };
}
