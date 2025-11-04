# Vercel KV (Redis) 캐시 설정 가이드

## 🎯 목적
Serverless 환경에서 콜드 스타트마다 캐시가 초기화되는 문제를 해결하고, 인스턴스 간 캐시를 공유하여 성능을 향상시킵니다.

## 📊 기대 효과
- **캐시 히트율**: 10-20% → 80-90%
- **API 응답 시간**: 0.5-1초 → 0.1-0.2초 (80% 단축)
- **Google Sheets API 호출**: 일일 사용량 70-80% 절감
- **동시 접속 지원**: 30명 → 100명 이상

---

## 🚀 Vercel KV 설정 방법 (무료 티어)

### 1. Vercel Dashboard에서 KV Database 생성

1. [Vercel Dashboard](https://vercel.com/dashboard) 접속
2. 프로젝트 선택
3. **Storage** 탭 클릭
4. **Create Database** 버튼 클릭
5. **KV** 선택
6. Database 이름 입력 (예: `spsys-cache`)
7. 리전 선택: **Asia Pacific (Seoul)** (한국에 가장 가까움)
8. **Create** 클릭

### 2. 환경 변수 자동 설정 확인

KV Database 생성 후 다음 환경변수가 자동으로 추가됩니다:

```env
KV_REST_API_URL=https://your-kv-url.upstash.io
KV_REST_API_TOKEN=your_kv_token_here
KV_REST_API_READ_ONLY_TOKEN=your_readonly_token_here
```

### 3. 로컬 개발 환경 설정 (선택사항)

로컬에서도 Redis 캐시를 사용하려면 `.env` 파일에 추가:

```bash
# Vercel Dashboard > Storage > KV Database > .env.local 탭에서 복사
KV_REST_API_URL=https://your-kv-url.upstash.io
KV_REST_API_TOKEN=your_kv_token_here
```

**주의:** 로컬 개발 시 환경변수가 없으면 자동으로 In-memory 캐시로 폴백됩니다.

---

## 📦 무료 티어 제한 (Vercel KV)

| 항목 | 무료 티어 | 초과 시 |
|------|----------|---------|
| 저장 용량 | 256 MB | Hobby 플랜으로 업그레이드 필요 |
| 일일 명령 수 | 10,000 commands | 제한 초과 시 캐시 미사용 (에러 없음) |
| 대역폭 | 100 MB/day | 제한 초과 시 속도 제한 |

**참고:** 학생 30명 기준 일일 약 3,000-5,000 commands 사용 예상 (충분)

---

## 🔧 작동 방식

### Redis 사용 시 (프로덕션)
```javascript
// 1. 캐시 조회
const data = await kv.get('assignments:{"studentId":"12345"}');

// 2. 캐시 저장 (TTL 60초)
await kv.set('assignments:{"studentId":"12345"}', data, { ex: 60 });

// 3. 캐시 삭제
await kv.del('assignments:{"studentId":"12345"}');
```

### In-memory 폴백 (로컬 개발)
```javascript
// 환경변수가 없으면 자동으로 In-memory Map 사용
const memoryCache = new Map();
memoryCache.set(key, { data, timestamp });
```

---

## 📈 성능 모니터링

### Vercel Dashboard에서 확인
1. **Storage** > 해당 KV Database 선택
2. **Metrics** 탭에서 다음 확인:
   - Commands per second
   - Latency (p50, p99)
   - Hit rate
   - Storage usage

### 로그에서 확인
```bash
# Redis 사용 시
[캐시] Vercel KV (Redis) 활성화됨
[캐시] Redis HIT: assignments:{"studentId":"12345"}
[캐시] Redis SET: assignments:{"studentId":"12345"} (TTL: 30초)

# In-memory 사용 시
[캐시] Vercel KV 환경변수 없음 - In-memory 폴백 사용
[캐시] Memory HIT: assignments:{"studentId":"12345"} (5초 전 저장)
```

---

## 🛠️ 트러블슈팅

### 문제 1: "Vercel KV 로드 실패"
**원인:** `@vercel/kv` 패키지 미설치

**해결:**
```bash
npm install @vercel/kv
```

### 문제 2: Redis 연결 안 됨
**원인:** 환경변수 누락

**확인:**
```bash
# Vercel CLI로 환경변수 확인
vercel env ls

# 또는 Dashboard에서 Settings > Environment Variables 확인
```

**해결:** Vercel Dashboard에서 KV Database 재생성 또는 환경변수 수동 추가

### 문제 3: 캐시가 작동하지 않는 것 같음
**확인:**
1. Vercel 로그에서 `[캐시] Redis` 메시지 확인
2. `getCacheStats()` API로 캐시 타입 확인
3. Network 탭에서 API 응답 시간 확인

---

## 🔄 배포 체크리스트

- [ ] `npm install` 실행하여 `@vercel/kv` 설치
- [ ] Vercel Dashboard에서 KV Database 생성
- [ ] 환경변수 자동 설정 확인
- [ ] 배포 후 로그에서 "Vercel KV (Redis) 활성화됨" 확인
- [ ] 테스트: 학생 로그인 → 과제 목록 조회 (2회) → 두 번째 조회 시 캐시 HIT 확인

---

## 📚 참고 문서

- [Vercel KV 공식 문서](https://vercel.com/docs/storage/vercel-kv)
- [Upstash Redis 문서](https://docs.upstash.com/)
- [Redis 명령어 참고](https://redis.io/commands)

---

## 🎓 대안: Upstash Redis (직접 연동)

Vercel KV 대신 Upstash를 직접 사용할 수도 있습니다:

1. [Upstash Console](https://console.upstash.com/) 가입
2. **Create Database** (Region: Seoul)
3. **REST API** 탭에서 환경변수 복사
4. Vercel에 환경변수 수동 추가

**차이점:**
- Vercel KV: Vercel과 자동 통합, 편리함
- Upstash 직접: 더 많은 제어 옵션, 다른 플랫폼에서도 사용 가능

---

## ✅ 결론

Vercel KV를 설정하면 **별도 코드 수정 없이** 자동으로 Redis 캐시를 사용합니다.
로컬 개발 시에는 In-memory 캐시로 폴백되어 개발 경험에 영향이 없습니다.

프로덕션 배포만 하면 즉시 성능 향상 효과를 체감할 수 있습니다!
