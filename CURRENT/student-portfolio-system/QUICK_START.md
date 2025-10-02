# 🚀 빠른 시작 가이드

학생 포트폴리오 시스템을 5분 안에 배포하는 가이드입니다.

---

## ⚡ 5분 배포

### 1단계: Google Sheets 생성 (1분)

1. [Google Sheets](https://sheets.google.com) 접속
2. "빈 스프레드시트" 클릭
3. 이름: `학생 포트폴리오 시스템`
4. 첫 번째 시트 이름: `학생명단_전체`
5. 헤더 입력:

   | 학번 | 이름 | 반 | 비밀번호 | 이메일 |
   |------|------|-----|----------|--------|

### 2단계: Apps Script 설정 (2분)

1. `확장 프로그램` → `Apps Script`
2. 기본 `Code.gs` 삭제
3. 다음 파일들을 순서대로 추가:

   ```
   ✅ Main.gs
   ✅ Config.gs
   ✅ SecurityUtils.gs
   ✅ Security.gs
   ✅ PasswordManager.gs
   ✅ AdminUtils.gs
   ✅ Utils.gs
   ✅ Tests.gs
   ✅ WebApp.html
   ✅ appsscript.json
   ```

4. 각 파일 내용을 `src/` 폴더에서 복사

### 3단계: Salt 변경 (30초)

```javascript
// Apps Script에서 실행
generateRandomSalt();
```

1. 로그에서 Salt 복사
2. `Config.gs`의 `SECURITY_CONFIG.SALT`에 붙여넣기
3. 저장 (Ctrl+S)

### 4단계: 초기 설정 (1분)

```javascript
// 실행 함수: setupPasswordColumns
setupPasswordColumns();

// 실행 함수: validateDeploymentChecklist
validateDeploymentChecklist();
```

모든 항목이 ✅ 인지 확인!

### 5단계: 웹앱 배포 (30초)

1. `배포` → `새 배포`
2. 유형: **웹 앱**
3. 액세스 권한: **[도메인] 사용자만**
4. `배포` 클릭
5. **웹 앱 URL** 복사

---

## 🎯 배포 완료!

웹 앱 URL을 학생들에게 공유하세요:

```
https://script.google.com/macros/s/[YOUR_ID]/exec
```

---

## 📝 초기 비밀번호 설정

### 방법 1: 개별 설정

```javascript
function setPasswords() {
  resetStudentPassword('20240101', 'temp1234');
  resetStudentPassword('20240102', 'temp5678');
}
```

### 방법 2: 일괄 설정

```javascript
function bulkSet() {
  const students = ['20240101', '20240102', '20240103'];
  bulkResetPasswords('temp1234', students);
}
```

---

## ✅ 확인 사항

배포 전 확인:

- [ ] Salt 변경 완료
- [ ] `setupPasswordColumns()` 실행
- [ ] `validateDeploymentChecklist()` 통과
- [ ] 웹앱 배포 완료
- [ ] 초기 비밀번호 설정 완료

---

## 🧪 테스트

```javascript
// 전체 테스트 실행
runAllTests();
```

모든 테스트 통과 확인!

---

## 📚 다음 단계

- [상세 설치 가이드](./docs/SETUP.md)
- [배포 가이드](./docs/DEPLOYMENT.md)
- [함수 레퍼런스](./docs/FUNCTIONS.md)
- [API 문서](./docs/API.md)

---

## 🆘 문제 해결

### "권한이 없습니다" 오류
→ `appsscript.json`의 `oauthScopes` 확인

### 웹앱이 로드되지 않음
→ URL이 `/exec`로 끝나는지 확인

### 비밀번호 변경 안됨
→ 관리자 함수로 초기화:
```javascript
resetStudentPassword('학번', '새비밀번호');
```

---

## 💡 팁

1. **정기 백업**
   ```javascript
   backupStudentData();
   ```

2. **통계 확인**
   ```javascript
   getPasswordChangeStats();
   ```

3. **시스템 진단**
   ```javascript
   diagnoseSystem();
   ```

---

**배포 성공을 기원합니다! 🎉**
