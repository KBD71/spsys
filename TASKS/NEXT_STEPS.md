# 다음 단계 가이드 (NEXT STEPS)

## 🎯 지금 바로 할 수 있는 작업

### 1. Apps Script 버전 배포 (가장 빠름)

**예상 시간**: 15분

**단계**:
1. `CURRENT/코드.gs` 파일 열기
2. Google Apps Script 에디터에 복사
3. `CURRENT/웹페이지.html` 파일 열기
4. Apps Script에 HTML 파일로 추가
5. `CURRENT/배포가이드.md` 따라 배포

**완료 후**:
- ✅ 즉시 사용 가능한 웹앱
- ✅ HTTPS 자동 제공
- ✅ 학생들에게 URL 공유

---

### 2. Vercel 버전 배포 (더 강력함)

**예상 시간**: 30분

**단계**:
1. Google Cloud Console 설정
   - 프로젝트 생성
   - Google Sheets API 활성화
   - 서비스 계정 생성 및 키 다운로드
2. Google Sheets에 서비스 계정 이메일 공유
3. `VERCEL/` 폴더에서 작업
4. `.env` 파일 설정
5. `vercel --prod` 실행

**완료 후**:
- ✅ 고성능 웹앱
- ✅ 커스텀 도메인 가능
- ✅ 높은 트래픽 처리 가능

**자세한 가이드**: `VERCEL/README.md` 참조

---

## 🔄 다른 노트북에서 작업 시작하기

### 첫 설정 (한 번만)

```bash
# 1. 저장소 클론
cd Documents
git clone https://github.com/KBD71/spsys.git
cd spsys

# 2. 현재 상태 확인
cat WORKSPACE.md
cat TASKS/TODO.md

# 3. Vercel 배포용이면 Node.js 설치
npm install
```

### 작업 시작 전 항상 실행

```bash
# 최신 변경사항 가져오기
git pull origin main

# 현재 상태 확인
cat TASKS/TODO.md
cat TASKS/NEXT_STEPS.md
```

### 작업 완료 후 항상 실행

```bash
# 변경사항 저장
git add .
git commit -m "작업 내용 설명"
git push origin main
```

---

## 📋 Phase 2 준비가 되었을 때

**사용자가 지시하면 시작**:

1. `TASKS/PHASE_2_ASSIGNMENTS.md` 읽기
2. Google Sheets에 '과제설정' 시트 추가
3. API 엔드포인트 구현
4. 대시보드 UI 추가

**예상 작업 시간**: 2-3시간

---

## 🛠️ 문제 발생 시

### Apps Script 버전

**문제**: "시트를 찾을 수 없습니다"
```
해결:
1. Google Sheets 열기
2. 시트 이름이 정확히 '학생명단_전체'인지 확인
3. 코드.gs의 CONFIG.SHEET_NAME 확인
```

**문제**: "학번을 찾을 수 없습니다"
```
해결:
1. Google Sheets에서 헤더 확인: 학번 | 이름 | 반 | 비밀번호 | 이메일 | 비밀번호변경일 | 변경횟수
2. 학번이 5자리 숫자인지 확인
3. 학번 열이 텍스트 형식인지 확인 (앞의 0이 사라지지 않도록)
```

### Vercel 버전

**문제**: "Service account not found"
```
해결:
1. Google Cloud Console → IAM 및 관리자 → 서비스 계정
2. 이메일 주소 정확히 복사
3. .env 파일의 GOOGLE_SERVICE_ACCOUNT_EMAIL 확인
```

**문제**: "Permission denied"
```
해결:
1. Google Sheets 열기
2. 공유 버튼 클릭
3. 서비스 계정 이메일 추가 (편집자 권한)
```

**문제**: "Invalid private key"
```
해결:
1. JSON 키 파일에서 private_key 값을 그대로 복사
2. \n이 실제 줄바꿈이 아닌 문자열로 있어야 함
3. .env 파일에 큰따옴표로 감싸기
```

---

## 🔍 환경별 체크리스트

### 🏠 집 노트북

- [ ] 저장소 클론 완료
- [ ] WORKSPACE.md 읽음
- [ ] Node.js 설치 (Vercel용)
- [ ] Git 설정 완료

### 🏫 학교 노트북

- [ ] 저장소 클론 완료
- [ ] WORKSPACE.md 읽음
- [ ] Node.js 설치 (Vercel용)
- [ ] Git 설정 완료

### ☁️ 배포 환경

**Apps Script**:
- [ ] 코드.gs 업로드
- [ ] 웹페이지.html 업로드
- [ ] 웹앱 배포 완료
- [ ] URL 테스트 완료

**Vercel**:
- [ ] Google Cloud 설정 완료
- [ ] 서비스 계정 생성 완료
- [ ] 환경 변수 설정 완료
- [ ] 배포 완료
- [ ] URL 테스트 완료

---

## 💡 빠른 참조

### 중요 파일 위치

```
현재 작업 상태: Documents/spsys/WORKSPACE.md
할 일 목록: Documents/spsys/TASKS/TODO.md
다음 단계: Documents/spsys/TASKS/TODO.md (이 파일)

Apps Script 버전: Documents/spsys/CURRENT/
Vercel 버전: Documents/spsys/VERCEL/
```

### 자주 사용하는 명령어

```bash
# 상태 확인
git status

# 최신 변경사항 가져오기
git pull

# 변경사항 저장
git add .
git commit -m "메시지"
git push

# Vercel 로컬 테스트
cd VERCEL
npm run dev

# Vercel 배포
cd VERCEL
vercel --prod
```

---

## 📞 도움이 필요할 때

1. **WORKSPACE.md** 읽기 - 프로젝트 전체 현황
2. **TODO.md** 읽기 - 완료/진행 중/예정 작업
3. **이 파일 (NEXT_STEPS.md)** 읽기 - 구체적인 다음 단계
4. **PHASE_2_ASSIGNMENTS.md** 읽기 - Phase 2 구현 계획

---

**다음 작업을 시작할 준비가 되면 사용자에게 알려주세요!**

**마지막 업데이트**: 2025-10-02
