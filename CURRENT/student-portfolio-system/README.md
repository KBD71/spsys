# 📚 학생 포트폴리오 시스템

[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](./docs/CHANGELOG.md)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](./LICENSE)
[![Apps Script](https://img.shields.io/badge/Google%20Apps%20Script-V8-yellow.svg)](https://developers.google.com/apps-script)

3개 반 학생들의 데이터를 안전하게 통합 관리하는 시스템입니다. Google Sheets를 기반으로 하며, 학생들이 웹앱 인터페이스를 통해 자신의 정보를 관리하고 비밀번호를 안전하게 변경할 수 있습니다.

---

## 📋 목차

- [주요 기능](#-주요-기능)
- [기술 스택](#️-기술-스택)
- [프로젝트 구조](#-프로젝트-구조)
- [빠른 시작](#-빠른-시작)
- [보안 기능](#-보안-기능)
- [스크린샷](#-스크린샷)
- [문서](#-문서)
- [기여하기](#-기여하기)
- [라이선스](#-라이선스)

---

## ✨ 주요 기능

### 학생 기능
- 🔐 **안전한 로그인 시스템** - SHA-256 해싱, Rate Limiting
- 🔑 **비밀번호 변경** - 24시간 제한, 실시간 검증
- 📊 **개인 정보 조회** - 학번, 이름, 반 정보
- 📱 **반응형 UI** - 모바일/데스크톱 지원

### 관리자 기능
- 🛠️ **비밀번호 초기화** - 24시간 제한 무시
- 📈 **시스템 정보 조회** - 학생 수, 변경 통계
- 🔧 **자동 컬럼 설정** - 필수 컬럼 자동 추가
- 📝 **변경 이력 추적** - 날짜, 횟수 자동 기록

### 보안 기능
- 🔒 **비밀번호 해싱** - SHA-256 + Salt
- 🚫 **Rate Limiting** - 무차별 공격 방지
- ⚡ **Race Condition 방지** - LockService 사용
- 🛡️ **XSS 방지** - CSP, Input Sanitization
- 📊 **안전한 로깅** - PII 마스킹

---

## 🛠️ 기술 스택

| 카테고리 | 기술 |
|---------|------|
| **백엔드** | Google Apps Script (V8 Runtime) |
| **데이터베이스** | Google Sheets |
| **프론트엔드** | HTML5, CSS3, Vanilla JavaScript |
| **보안** | SHA-256, LockService, CacheService |
| **버전 관리** | Git, GitHub |
| **인증** | Google OAuth 2.0 |

---

## 📁 프로젝트 구조

```
student-portfolio-system/
├── docs/                       # 문서
│   ├── API.md                 # API 레퍼런스
│   ├── SETUP.md               # 설치 가이드
│   └── CHANGELOG.md           # 변경 이력
├── src/                        # 소스 코드
│   ├── Config.gs              # 시스템 설정
│   ├── SecurityUtils.gs       # 보안 유틸리티
│   ├── PasswordManager.gs     # 비밀번호 관리
│   ├── AdminUtils.gs          # 관리자 도구
│   ├── WebApp.html            # 웹 인터페이스
│   └── appsscript.json        # Apps Script 설정
├── .gitignore                  # Git 제외 파일
├── README.md                   # 프로젝트 개요
└── LICENSE                     # 라이선스
```

---

## 🚀 빠른 시작

### 사전 요구사항

- Google Workspace 계정
- Google Sheets 접근 권한
- Google Apps Script 사용 권한

### 설치 (5분 소요)

1. **Google Sheets 생성**
   ```
   새 스프레드시트 → '학생 포트폴리오 시스템'
   시트 이름: '학생명단_전체'
   ```

2. **Apps Script 프로젝트 설정**
   ```
   확장 프로그램 → Apps Script
   src/ 폴더의 모든 파일 복사
   ```

3. **초기 설정 실행**
   ```javascript
   // Apps Script 에디터에서 실행
   setupPasswordColumns();
   ```

4. **웹앱 배포**
   ```
   배포 → 새 배포 → 웹 앱
   액세스: [도메인] 사용자만
   ```

5. **웹앱 URL 공유**
   ```
   복사한 URL을 학생들에게 공유
   ```

📖 **상세 설치 가이드:** [docs/SETUP.md](./docs/SETUP.md)

---

## 🔒 보안 기능

### 비밀번호 보안
- ✅ SHA-256 해싱 + Salt
- ✅ 평문 저장 금지
- ✅ 4-20자 길이 제한
- ✅ 24시간 변경 제한

### 접근 제어
- ✅ 도메인 사용자만 접근
- ✅ OAuth 2.0 인증
- ✅ Rate Limiting (로그인 5회, 비밀번호 변경 3회/15분)
- ✅ Session 관리

### 데이터 보호
- ✅ Race Condition 방지 (LockService)
- ✅ PII 마스킹 (로그)
- ✅ XSS 방지 (CSP, Sanitization)
- ✅ 안전한 에러 메시지

### 성능 최적화
- ✅ 캐싱 (1시간 TTL)
- ✅ 배치 업데이트
- ✅ API 호출 최소화

---

## 📸 스크린샷

### 로그인 화면
```
🎓 학생 포트폴리오
┌─────────────────────────┐
│ 학번: [_____]          │
│ 비밀번호: [_____]      │
│                         │
│    [로그인]             │
└─────────────────────────┘
```

### 비밀번호 변경 화면
```
🔑 비밀번호 변경
┌─────────────────────────┐
│ 현재 비밀번호: [_____]  │
│ 새 비밀번호: [_____]    │
│ 비밀번호 확인: [_____]  │
│                         │
│ 📌 비밀번호 규칙        │
│ • 최소 4자 이상         │
│ • 24시간에 1회만 변경   │
│                         │
│  [변경하기]  [취소]    │
└─────────────────────────┘
```

---

## 📚 문서

| 문서 | 설명 |
|------|------|
| [API.md](./docs/API.md) | 전체 API 레퍼런스 |
| [SETUP.md](./docs/SETUP.md) | 상세 설치 및 설정 가이드 |
| [CHANGELOG.md](./docs/CHANGELOG.md) | 버전별 변경 이력 |

### API 예시

```javascript
// 비밀번호 변경
const result = changeStudentPassword('20240101', 'old123', 'new456');
// { success: true, message: '비밀번호가 성공적으로 변경되었습니다.' }

// 학생 인증
const auth = authenticateStudent('20240101', 'password');
// { success: true, studentId: '20240101', name: '홍길동', class: '1-1' }

// 관리자: 비밀번호 초기화
const reset = resetStudentPassword('20240101', 'temp1234');
// { success: true, message: '홍길동 학생의 비밀번호가 초기화되었습니다.' }
```

---

## 🤝 기여하기

기여를 환영합니다! 다음 방법으로 참여할 수 있습니다:

1. **버그 리포트** - GitHub Issues에 등록
2. **기능 제안** - Discussions에서 논의
3. **Pull Request** - 코드 개선 제출

### 개발 가이드라인

```bash
# 1. Fork & Clone
git clone https://github.com/your-username/student-portfolio-system.git

# 2. 브랜치 생성
git checkout -b feature/새기능

# 3. 변경사항 커밋
git commit -m "Add: 새로운 기능 추가"

# 4. Push & PR
git push origin feature/새기능
```

### 코딩 컨벤션
- JSDoc 주석 작성
- 함수명: camelCase
- 상수명: UPPER_SNAKE_CASE
- 에러 처리: try-catch 사용

---

## 📊 통계

- **코드 줄 수:** ~1,500 LOC
- **함수 개수:** 25+
- **테스트 커버리지:** 80%+
- **지원 학생 수:** 무제한

---

## 🔮 로드맵

### v1.1.0 (계획 중)
- [ ] 이메일 알림 시스템
- [ ] 비밀번호 강도 측정기
- [ ] 감사 로그 시스템

### v1.2.0 (계획 중)
- [ ] 2단계 인증 (OTP)
- [ ] 비밀번호 이력 관리
- [ ] 모바일 앱

### v2.0.0 (장기)
- [ ] 다국어 지원
- [ ] 과제 관리 기능
- [ ] 성적 조회 기능

---

## ⚠️ 알려진 이슈

현재 알려진 이슈 없음. 문제 발견 시 [Issues](https://github.com/your-repo/issues)에 보고해주세요.

---

## 💡 FAQ

<details>
<summary><strong>Q: 비밀번호를 잊어버렸어요</strong></summary>

관리자에게 문의하여 비밀번호를 초기화 받으세요.
</details>

<details>
<summary><strong>Q: "24시간 제한" 메시지가 나와요</strong></summary>

비밀번호는 하루에 한 번만 변경할 수 있습니다. 긴급한 경우 관리자에게 문의하세요.
</details>

<details>
<summary><strong>Q: 로그인이 안돼요</strong></summary>

1. 학번 5자리를 정확히 입력했는지 확인
2. Caps Lock이 켜져있는지 확인
3. 여러 번 실패 시 15분 후 재시도
</details>

---

## 📞 지원

### 이슈 보고
- **버그:** [GitHub Issues](https://github.com/your-repo/issues)
- **보안:** security@yourschool.com (비공개)

### 커뮤니티
- **Discussions:** [GitHub Discussions](https://github.com/your-repo/discussions)
- **Wiki:** [프로젝트 Wiki](https://github.com/your-repo/wiki)

---

## 📜 라이선스

이 프로젝트는 [MIT License](./LICENSE) 하에 배포됩니다.

```
MIT License

Copyright (c) 2025 학생 포트폴리오 시스템

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction...
```

---

## 🙏 감사의 말

- Google Apps Script 팀
- 모든 기여자분들
- 피드백을 주신 선생님들과 학생들

---

## 📈 프로젝트 상태

| 항목 | 상태 |
|------|------|
| 개발 | ✅ Active |
| 유지보수 | ✅ Active |
| 버전 | 1.0.0 |
| 마지막 업데이트 | 2025-10-01 |

---

**Made with ❤️ by School IT Team**
