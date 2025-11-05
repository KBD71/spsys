# 디버그 테스트 가이드

## 즉시 확인해주세요

### 1. Vercel 배포 확인
1. https://vercel.com/dashboard 접속
2. 프로젝트 클릭
3. Deployments 탭
4. 가장 최근 배포의 상태가 "Ready" 인지 확인
5. 배포 시간이 최근(몇 분 전)인지 확인

### 2. API 직접 테스트
브라우저 주소창에 다음 URL 입력 (학번은 실제 학번으로 변경):

```
https://your-vercel-url.vercel.app/api/my-records?studentId=12345
```

**예상 응답:**
```json
{
  "success": true,
  "records": []
}
```

또는

```json
{
  "success": true,
  "records": [
    {
      "sheetName": "수학과제1",
      "label": "종합의견",
      "value": "잘했어요",
      "type": "comment",
      "hasSuggestion": false,
      "suggestion": ""
    }
  ]
}
```

**만약 에러가 나온다면:**
```json
{
  "success": false,
  "message": "에러 메시지"
}
```
→ 이 에러 메시지를 복사해주세요!

### 3. 브라우저 개발자 도구 (가장 중요!)

#### Network 탭 확인:
1. F12 → Network 탭
2. Ctrl+Shift+R (강력 새로고침)
3. "my-records" 찾기
4. 클릭 후 다음 확인:

```
Status Code: ??? (200? 500? 404?)
```

**Response 탭 내용:**
```
여기에 표시되는 JSON을 복사해주세요
```

**Headers 탭 → Request URL:**
```
실제 호출된 URL을 복사해주세요
```

### 4. Google Sheets 확인

#### '공개' 시트 스크린샷
다음 내용을 확인:
- [ ] A1셀: "과제공개"
- [ ] B1셀: "대상시트"
- [ ] C1셀: "대상반"
- [ ] D1셀: "의견공개"
- [ ] E1셀: "알림메시지"
- [ ] 2행부터 데이터가 있나요?

#### 예시 데이터:
| 과제공개 | 대상시트 | 대상반 | 의견공개 | 알림메시지 |
|---------|---------|--------|---------|-----------|
| TRUE | 수학과제1 | 전체 | TRUE | |
| TRUE | 영어과제1 | 101 | FALSE | 곧 공개됩니다 |

### 5. 환경변수 확인
Vercel Dashboard → Settings → Environment Variables:
- [ ] GOOGLE_SERVICE_ACCOUNT_EMAIL 있음
- [ ] GOOGLE_PRIVATE_KEY 있음
- [ ] SPREADSHEET_ID 있음
- [ ] 모두 Production 환경에 체크되어 있음

---

## 이 중 하나라도 다르면 알려주세요!

특히 **API 직접 테스트 결과**와 **Network 탭의 Response**를 알려주시면 바로 해결할 수 있습니다.
