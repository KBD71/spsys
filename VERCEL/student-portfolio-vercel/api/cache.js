/**
 * Vercel KV (Redis) 기반 캐시 시스템
 * - 인스턴스 간 캐시 공유 (Serverless 콜드 스타트 문제 해결)
 * - 동시 접속자 급증 시 Google Sheets API Rate Limit 회피
 * - TTL(Time To Live) 기반 자동 만료
 * - Vercel KV 무료 티어: 256MB, 10,000 commands/day
 */

let kv;
let useRedis = false;

// Vercel KV 초기화 (환경변수 체크)
try {
  if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
    const { kv: kvClient } = require('@vercel/kv');
    kv = kvClient;
    useRedis = true;
    console.log('[캐시] Vercel KV (Redis) 활성화됨');
  } else {
    console.log('[캐시] Vercel KV 환경변수 없음 - In-memory 폴백 사용');
  }
} catch (error) {
  console.log('[캐시] Vercel KV 로드 실패 - In-memory 폴백 사용:', error.message);
}

// In-memory 폴백 (로컬 개발용)
const memoryCache = new Map();
const MAX_CACHE_SIZE = 200;

/**
 * 캐시 키 생성
 * @param {string} endpoint - API 엔드포인트 이름
 * @param {object} params - 파라미터 객체
 * @returns {string} 고유한 캐시 키
 */
function getCacheKey(endpoint, params) {
    // 파라미터를 정렬하여 일관된 키 생성
    const sortedParams = Object.keys(params || {})
        .sort()
        .reduce((acc, key) => {
            acc[key] = params[key];
            return acc;
        }, {});

    // 버전 번호 추가: v4 (대시보드 새로고침 문제 해결 - 2025-11-05)
    return `v4:${endpoint}:${JSON.stringify(sortedParams)}`;
}

/**
 * 캐시에서 데이터 조회
 * @param {string} key - 캐시 키
 * @param {number} ttl - TTL(밀리초), 기본 60초
 * @returns {Promise<any|null>} 캐시된 데이터 또는 null
 */
async function getCache(key, ttl = 60000) {
    try {
        if (useRedis) {
            // Redis에서 조회 (TTL은 Redis에서 자동 관리)
            const data = await kv.get(key);
            if (data) {
                console.log(`[캐시] Redis HIT: ${key}`);
                return data;
            }
            return null;
        } else {
            // In-memory 폴백
            const item = memoryCache.get(key);
            if (!item) return null;

            const age = Date.now() - item.timestamp;
            if (age > ttl) {
                memoryCache.delete(key);
                console.log(`[캐시] 만료 삭제: ${key} (${Math.round(age / 1000)}초 경과)`);
                return null;
            }

            console.log(`[캐시] Memory HIT: ${key} (${Math.round(age / 1000)}초 전 저장)`);
            return item.data;
        }
    } catch (error) {
        console.error(`[캐시] 조회 오류: ${key}`, error.message);
        return null;
    }
}

/**
 * 캐시에 데이터 저장
 * @param {string} key - 캐시 키
 * @param {any} data - 저장할 데이터
 * @param {number} ttlSeconds - TTL(초), 기본 60초
 * @returns {Promise<void>}
 */
async function setCache(key, data, ttlSeconds = 60) {
    try {
        if (useRedis) {
            // Redis에 TTL과 함께 저장
            await kv.set(key, data, { ex: ttlSeconds });
            console.log(`[캐시] Redis SET: ${key} (TTL: ${ttlSeconds}초)`);
        } else {
            // In-memory 폴백
            if (memoryCache.size >= MAX_CACHE_SIZE) {
                const oldestKey = memoryCache.keys().next().value;
                memoryCache.delete(oldestKey);
                console.log(`[캐시] 크기 제한으로 삭제: ${oldestKey}`);
            }

            memoryCache.set(key, {
                data: data,
                timestamp: Date.now()
            });

            console.log(`[캐시] Memory SET: ${key} (총 ${memoryCache.size}개 항목)`);
        }
    } catch (error) {
        console.error(`[캐시] 저장 오류: ${key}`, error.message);
    }
}

/**
 * 특정 패턴과 일치하는 캐시 삭제 또는 특정 키 삭제
 * @param {string} keyOrPattern - 삭제할 캐시 키 또는 패턴
 * @returns {Promise<number>} 삭제된 항목 수
 */
async function clearCache(keyOrPattern) {
    try {
        if (useRedis) {
            // Redis: 정확한 키만 삭제 (패턴은 성능 이슈로 미지원)
            try {
                await kv.del(keyOrPattern);
                console.log(`[캐시] Redis 삭제: ${keyOrPattern}`);
                return 1;
            } catch {
                return 0;
            }
        } else {
            // In-memory: 패턴 매칭 지원
            let deletedCount = 0;
            for (const key of memoryCache.keys()) {
                if (key.includes(keyOrPattern)) {
                    memoryCache.delete(key);
                    deletedCount++;
                }
            }

            if (deletedCount > 0) {
                console.log(`[캐시] Memory 패턴 삭제: ${keyOrPattern} (${deletedCount}개 항목)`);
            }
            return deletedCount;
        }
    } catch (error) {
        console.error(`[캐시] 삭제 오류: ${keyOrPattern}`, error.message);
        return 0;
    }
}

/**
 * 전체 캐시 초기화 (주의: Redis는 지원하지 않음)
 * @returns {Promise<number>} 삭제된 항목 수
 */
async function clearAllCache() {
    try {
        if (useRedis) {
            console.log('[캐시] Redis 전체 삭제는 지원하지 않습니다.');
            return 0;
        } else {
            const size = memoryCache.size;
            memoryCache.clear();
            console.log(`[캐시] Memory 전체 삭제: ${size}개 항목`);
            return size;
        }
    } catch (error) {
        console.error('[캐시] 전체 삭제 오류:', error.message);
        return 0;
    }
}

/**
 * 캐시 통계 조회
 * @returns {Promise<object>} 캐시 통계
 */
async function getCacheStats() {
    try {
        if (useRedis) {
            return {
                type: 'Redis (Vercel KV)',
                message: '통계는 Vercel Dashboard에서 확인하세요',
                url: 'https://vercel.com/dashboard'
            };
        } else {
            const stats = {
                type: 'In-Memory',
                totalItems: memoryCache.size,
                maxSize: MAX_CACHE_SIZE,
                items: []
            };

            for (const [key, value] of memoryCache.entries()) {
                stats.items.push({
                    key: key,
                    age: Math.round((Date.now() - value.timestamp) / 1000),
                    size: JSON.stringify(value.data).length
                });
            }

            return stats;
        }
    } catch (error) {
        console.error('[캐시] 통계 조회 오류:', error.message);
        return { error: error.message };
    }
}

/**
 * 오래된 캐시 자동 정리 (In-memory 전용)
 * Redis는 TTL로 자동 관리되므로 불필요
 * @param {number} maxAge - 최대 보관 시간(밀리초), 기본 5분
 * @returns {number} 삭제된 항목 수
 */
function cleanupExpiredCache(maxAge = 300000) {
    if (useRedis) return 0; // Redis는 TTL로 자동 관리

    let deletedCount = 0;
    const now = Date.now();

    for (const [key, value] of memoryCache.entries()) {
        if (now - value.timestamp > maxAge) {
            memoryCache.delete(key);
            deletedCount++;
        }
    }

    if (deletedCount > 0) {
        console.log(`[캐시] Memory 자동 정리: ${deletedCount}개 만료 항목 삭제`);
    }

    return deletedCount;
}

// Serverless 환경에서는 setInterval 사용하지 않음
// 수동 호출 또는 API 호출 시에만 정리 수행

module.exports = {
    getCacheKey,
    getCache,
    setCache,
    clearCache,
    clearAllCache,
    getCacheStats,
    cleanupExpiredCache
};
