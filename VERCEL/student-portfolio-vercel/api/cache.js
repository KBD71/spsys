/**
 * 간단한 인메모리 캐시 시스템
 * - 동시 접속자 급증 시 Google Sheets API Rate Limit 회피
 * - TTL(Time To Live) 기반 자동 만료
 * - 메모리 관리를 위한 최대 캐시 크기 제한
 */

const cache = new Map();
const MAX_CACHE_SIZE = 200; // 최대 200개 항목 저장

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

    return `${endpoint}:${JSON.stringify(sortedParams)}`;
}

/**
 * 캐시에서 데이터 조회
 * @param {string} key - 캐시 키
 * @param {number} ttl - TTL(밀리초), 기본 60초
 * @returns {any|null} 캐시된 데이터 또는 null
 */
function getCache(key, ttl = 60000) {
    const item = cache.get(key);

    if (!item) {
        return null;
    }

    // TTL 초과 시 삭제 후 null 반환
    const age = Date.now() - item.timestamp;
    if (age > ttl) {
        cache.delete(key);
        console.log(`[캐시] 만료 삭제: ${key} (${Math.round(age / 1000)}초 경과)`);
        return null;
    }

    console.log(`[캐시] HIT: ${key} (${Math.round(age / 1000)}초 전 저장)`);
    return item.data;
}

/**
 * 캐시에 데이터 저장
 * @param {string} key - 캐시 키
 * @param {any} data - 저장할 데이터
 */
function setCache(key, data) {
    // 캐시 크기 제한 초과 시 가장 오래된 항목 삭제 (LRU 방식)
    if (cache.size >= MAX_CACHE_SIZE) {
        const oldestKey = cache.keys().next().value;
        cache.delete(oldestKey);
        console.log(`[캐시] 크기 제한으로 삭제: ${oldestKey}`);
    }

    cache.set(key, {
        data: data,
        timestamp: Date.now()
    });

    console.log(`[캐시] SET: ${key} (총 ${cache.size}개 항목)`);
}

/**
 * 특정 패턴과 일치하는 캐시 삭제
 * @param {string} pattern - 삭제할 캐시 키 패턴
 * @returns {number} 삭제된 항목 수
 */
function clearCache(pattern) {
    let deletedCount = 0;

    for (const key of cache.keys()) {
        if (key.includes(pattern)) {
            cache.delete(key);
            deletedCount++;
        }
    }

    if (deletedCount > 0) {
        console.log(`[캐시] 패턴 삭제: ${pattern} (${deletedCount}개 항목)`);
    }

    return deletedCount;
}

/**
 * 전체 캐시 초기화
 */
function clearAllCache() {
    const size = cache.size;
    cache.clear();
    console.log(`[캐시] 전체 삭제: ${size}개 항목`);
    return size;
}

/**
 * 캐시 통계 조회
 * @returns {object} 캐시 통계
 */
function getCacheStats() {
    const stats = {
        totalItems: cache.size,
        maxSize: MAX_CACHE_SIZE,
        items: []
    };

    for (const [key, value] of cache.entries()) {
        stats.items.push({
            key: key,
            age: Math.round((Date.now() - value.timestamp) / 1000), // 초 단위
            size: JSON.stringify(value.data).length // 대략적인 크기
        });
    }

    return stats;
}

/**
 * 오래된 캐시 자동 정리 (주기적 실행 권장)
 * @param {number} maxAge - 최대 보관 시간(밀리초), 기본 5분
 * @returns {number} 삭제된 항목 수
 */
function cleanupExpiredCache(maxAge = 300000) {
    let deletedCount = 0;
    const now = Date.now();

    for (const [key, value] of cache.entries()) {
        if (now - value.timestamp > maxAge) {
            cache.delete(key);
            deletedCount++;
        }
    }

    if (deletedCount > 0) {
        console.log(`[캐시] 자동 정리: ${deletedCount}개 만료 항목 삭제`);
    }

    return deletedCount;
}

// 5분마다 자동 정리 (메모리 관리)
setInterval(() => {
    cleanupExpiredCache(300000); // 5분 이상 된 캐시 삭제
}, 300000);

module.exports = {
    getCacheKey,
    getCache,
    setCache,
    clearCache,
    clearAllCache,
    getCacheStats,
    cleanupExpiredCache
};
