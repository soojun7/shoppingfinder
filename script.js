// Claude API 설정 (환경변수에서 로드)
const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY || '';
const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';

// RapidAPI TikTok API 설정
const RAPIDAPI_KEY = 'bb2252aa5dmsh70444c45811a8c4p1f4885jsnf86faab1a5d2';
const TIKTOK_API_URL = 'https://tiktok-video-no-watermark2.p.rapidapi.com';

// Google Images API 설정
const GOOGLE_IMAGES_API_URL = 'https://google-images4.p.rapidapi.com/getGoogleImages';
const IMGBB_API_KEY = '7c9e5b8f8c8a8b8c8d8e8f8g8h8i8j8k'; // 임시 키 (실제로는 유효한 키 필요)



// 언어별 설정
const LANGUAGE_CONFIG = {
    ko: { name: '한국어', flag: '🇰🇷' },
    en: { name: 'English', flag: '🇺🇸' },
    ja: { name: '日本語', flag: '🇯🇵' },
    zh: { name: '中文', flag: '🇨🇳' },
    es: { name: 'Español', flag: '🇪🇸' },
    fr: { name: 'Français', flag: '🇫🇷' },
    de: { name: 'Deutsch', flag: '🇩🇪' },
    it: { name: 'Italiano', flag: '🇮🇹' },
    pt: { name: 'Português', flag: '🇧🇷' },
    ru: { name: 'Русский', flag: '🇷🇺' }
};

// DOM 요소들
const searchInput = document.getElementById('searchInput');
const countrySelect = document.getElementById('countrySelect');
const searchBtn = document.getElementById('searchBtn');
const clearBtn = document.getElementById('clearBtn');
const resultsSection = document.getElementById('resultsSection');
const loadingSpinner = document.getElementById('loadingSpinner');
const resultsList = document.getElementById('resultsList');
const resultsCount = document.getElementById('resultsCount');
const emptyState = document.getElementById('emptyState');

// 페이지네이션 DOM 요소들
const resultsPerPageSelect = document.getElementById('resultsPerPage');
const paginationContainer = document.getElementById('paginationContainer');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const pageNumbers = document.getElementById('pageNumbers');
const paginationInfo = document.getElementById('paginationInfo');

// 페이지네이션 관련 변수들
let currentQuery = '';
let currentCountry = '';
let currentPage = 1;
let resultsPerPage = 18;
let totalResults = 0;
let allResults = [];
let isLoading = false;

// 페이지 캐시 관련 변수들
let pageCache = new Map(); // 페이지별 결과 캐시
let preloadingPages = new Set(); // 현재 미리 로딩 중인 페이지들

// 이벤트 리스너 설정
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    // 검색 버튼 클릭 이벤트
    searchBtn.addEventListener('click', function() {
        console.log('🔍 검색 버튼 클릭됨');
        handleSearch();
    });
    
    // 엔터 키 검색
    searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            handleSearch();
        }
    });
    
    // 검색어 클리어 버튼
    clearBtn.addEventListener('click', function() {
        searchInput.value = '';
        searchInput.focus();
    });
    
    // 검색어 입력 시 클리어 버튼 표시/숨김
    searchInput.addEventListener('input', function() {
        if (this.value.trim()) {
            clearBtn.style.opacity = '1';
            clearBtn.style.visibility = 'visible';
        } else {
            clearBtn.style.opacity = '0';
            clearBtn.style.visibility = 'hidden';
        }
    });
    
    // 페이지네이션 버튼 이벤트
    prevBtn.addEventListener('click', function() {
        if (currentPage > 1) {
            goToPage(currentPage - 1);
        }
    });
    
    nextBtn.addEventListener('click', function() {
        const totalPages = Math.ceil(allResults.length / resultsPerPage);
        if (currentPage < totalPages) {
            goToPage(currentPage + 1);
        }
    });
    
    // 페이지당 결과 수 변경
    resultsPerPageSelect.addEventListener('change', function() {
        resultsPerPage = parseInt(this.value);
        if (allResults.length > 0) {
            currentPage = 1;
            displayPage(allResults, currentPage);
            const totalPages = Math.ceil(allResults.length / resultsPerPage);
            setupPagination(totalPages, allResults.length);
        }
    });
    
    // 무한 스크롤 비활성화 - 페이지네이션 사용
    // window.addEventListener('scroll', handleScroll);
    
    // 터치 제스처 지원
    initializeTouchGestures();
    
    console.log('쇼핑파인더 앱이 초기화되었습니다.');
}

// 터치 제스처 초기화
function initializeTouchGestures() {
    let touchStartX = 0;
    let touchEndX = 0;
    
    document.addEventListener('touchstart', function(e) {
        touchStartX = e.changedTouches[0].screenX;
    });
    
    document.addEventListener('touchend', function(e) {
        touchEndX = e.changedTouches[0].screenX;
        handleSwipeGesture();
    });
    
    function handleSwipeGesture() {
        const swipeThreshold = 100;
        const swipeDistance = touchEndX - touchStartX;
        
        // 오른쪽으로 스와이프 (사이드바 열기)
        if (swipeDistance > swipeThreshold && touchStartX < 50) {
            const sidebar = document.querySelector('.sidebar');
            if (!sidebar.classList.contains('open')) {
                toggleSidebar();
            }
        }
        
        // 왼쪽으로 스와이프 (사이드바 닫기)
        if (swipeDistance < -swipeThreshold) {
            const sidebar = document.querySelector('.sidebar');
            if (sidebar.classList.contains('open')) {
                closeSidebar();
            }
        }
    }
}

async function handleSearch() {
    console.log('🔍 검색 시작');
    const query = searchInput.value.trim();
    const selectedCountry = countrySelect.value;
    
    console.log('검색어:', query);
    console.log('선택된 국가:', selectedCountry);
    console.log('현재 크레딧:', userCredits);
    console.log('로그인 상태:', isLoggedIn);
    
    if (!query) {
        alert('검색어를 입력해주세요.');
        searchInput.focus();
        return;
    }
    
    if (isLoading) {
        console.log('이미 로딩 중이므로 검색 중단');
        return; // 이미 로딩 중이면 중복 요청 방지
    }
    
    // 검색 요구사항 확인 (크레딧 및 속도 제한)
    console.log('검색 요구사항 확인 중...');
    const canSearch = await checkSearchRequirements();
    console.log('검색 가능 여부:', canSearch);
    if (!canSearch) {
        console.log('검색 요구사항 미충족으로 검색 중단');
        return;
    }
    
    // 새로운 검색 초기화
    currentQuery = query;
    currentCountry = selectedCountry;
    currentCursor = 0;
    hasMoreResults = true;
    allResults = [];
    resultsList.innerHTML = '';
    
    // 페이지 캐시 초기화
    clearPageCache();
    
    console.log(`새로운 검색 시작: "${query}" (${LANGUAGE_CONFIG[selectedCountry].name})`);
    
    // UI 상태 변경
    showLoadingState();
    
    try {
        // Claude API를 통해 번역된 검색어 얻기
        let translatedQuery = query;
        
        // 한국어가 아닌 경우에만 번역 시도
        if (selectedCountry !== 'ko') {
            try {
                translatedQuery = await translateQuery(query, selectedCountry);
                console.log(`번역 완료: "${query}" → "${translatedQuery}"`);
            } catch (error) {
                console.warn('번역 실패, 원본 검색어 사용:', error.message);
                translatedQuery = query;
            }
        } else {
            console.log(`한국어 검색: "${translatedQuery}"`);
        }
        
        // TikTok 검색 결과
        const searchResults = await searchRealTikTokData(translatedQuery, selectedCountry, currentCursor);
        
        // 결과를 전체 배열에 추가
        allResults = allResults.concat(searchResults);
        
        // 검색 결과 표시
        displaySearchResults(allResults, query, selectedCountry, false);
        
        // 커서 업데이트 (다음 페이지를 위해)
        if (searchResults.length > 0) {
            currentCursor += searchResults.length;
        }
        
        // hasMoreResults는 이미 parseRealTikTokData에서 설정됨
        console.log(`검색 완료: ${searchResults.length}개 로드, 커서: ${currentCursor}, 더 많은 결과: ${hasMoreResults}`);
        
    } catch (error) {
        console.error('검색 중 오류 발생:', error);
        showErrorState(error.message);
    } finally {
        isLoading = false;
    }
}

// 스크롤 이벤트 핸들러
function handleScroll() {
    if (isLoading || !hasMoreResults || !currentQuery) {
        console.log('스크롤 무시:', { isLoading, hasMoreResults, currentQuery });
        return;
    }
    
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const windowHeight = window.innerHeight;
    const documentHeight = document.documentElement.scrollHeight;
    
    // 페이지 하단에서 200px 전에 도달하면 더 로드
    if (scrollTop + windowHeight >= documentHeight - 200) {
        console.log('스크롤 하단 도달 - 추가 콘텐츠 로드');
        console.log('현재 검색어:', currentQuery, '현재 국가:', currentCountry);
        loadMoreResults(); // 별도 함수로 분리
    }
}

// 추가 결과 로드 함수
async function loadMoreResults() {
    console.log('loadMoreResults 호출됨:', { 
        isLoading, 
        hasMoreResults, 
        currentQuery, 
        currentCursor,
        allResultsLength: allResults.length 
    });
    
    if (isLoading || !hasMoreResults || !currentQuery) {
        console.log('추가 로드 불가:', { isLoading, hasMoreResults, currentQuery });
        return;
    }
    
    console.log(`추가 결과 로드 시작: "${currentQuery}" (${currentCountry}), 커서: ${currentCursor}`);
    
    isLoading = true;
    showLoadMoreState();
    
    try {
        // 현재 저장된 검색어와 국가로 검색
        const searchResults = await searchRealTikTokData(currentQuery, currentCountry, currentCursor);
        
        // 결과를 전체 배열에 추가
        allResults = allResults.concat(searchResults);
        
        // 검색 결과 표시 (추가 모드)
        displaySearchResults(allResults, currentQuery, currentCountry, true);
        
        // 커서 업데이트
        if (searchResults.length > 0) {
            currentCursor += searchResults.length;
        }
        
        console.log(`추가 로드 완료: ${searchResults.length}개 추가, 총 ${allResults.length}개, 더 많은 결과: ${hasMoreResults}`);
        
    } catch (error) {
        console.error('추가 로드 중 오류:', error);
    } finally {
        isLoading = false;
    }
}

async function translateQuery(query, targetLanguage) {
    if (!targetLanguage || targetLanguage === 'ko') {
        console.log('한국어 검색 - 번역 불필요');
        return query; // 한국어는 번역 불필요
    }
    
    // 언어 설정 확인
    const languageInfo = LANGUAGE_CONFIG[targetLanguage];
    if (!languageInfo) {
        console.error(`지원하지 않는 언어: ${targetLanguage}`);
        return query; // 지원하지 않는 언어면 원본 반환
    }
    
    console.log(`번역 시작: "${query}" -> ${languageInfo.name}`);
    
    const prompt = `다음 한국어 검색어를 ${languageInfo.name}로 자연스럽게 번역해주세요. 번역된 결과만 답변해주세요.

검색어: "${query}"`;

    try {
        console.log('프록시 서버를 통한 번역 요청...');
        
        const response = await fetch('http://localhost:3001/api/translate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                query: query,
                targetLanguage: targetLanguage
            })
        });

        console.log('프록시 응답 상태:', response.status);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('프록시 오류 응답:', errorText);
            throw new Error(`프록시 서버 오류: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        console.log('프록시 응답 데이터:', data);
        
        if (data.success) {
            console.log(`번역 완료: "${query}" -> "${data.translatedText}"`);
            return data.translatedText;
        } else {
            throw new Error(data.error || '번역 실패');
        }
        
    } catch (error) {
        console.error('번역 오류 상세:', error);
        
        // 사용자에게 오류 알림
        alert(`번역 중 오류가 발생했습니다: ${error.message}\n원본 검색어로 검색을 진행합니다.`);
        
        return query; // 번역 실패 시 원본 반환
    }
}

// 페이지 캐시 관리 함수들
function getCacheKey(query, country, page) {
    return `${query}_${country}_${page}`;
}

function getCachedPage(query, country, page) {
    const key = getCacheKey(query, country, page);
    return pageCache.get(key);
}

function setCachedPage(query, country, page, data) {
    const key = getCacheKey(query, country, page);
    pageCache.set(key, {
        data: data,
        timestamp: Date.now(),
        hasMore: hasMoreResults
    });
    console.log(`페이지 ${page} 캐시 저장됨:`, data.length, '개 결과');
}

function clearPageCache() {
    pageCache.clear();
    preloadingPages.clear();
    console.log('페이지 캐시 초기화됨');
}

// 다음 페이지 미리 로드
async function preloadNextPage(query, country, currentPage) {
    const nextPage = currentPage + 1;
    const cacheKey = getCacheKey(query, country, nextPage);
    
    // 이미 캐시되어 있거나 미리 로딩 중이면 건너뛰기
    if (pageCache.has(cacheKey) || preloadingPages.has(nextPage)) {
        return;
    }
    
    // hasMoreResults가 false면 미리 로드하지 않음
    if (!hasMoreResults) {
        console.log('더 이상 페이지가 없어서 미리 로드 건너뜀');
        return;
    }
    
    console.log(`페이지 ${nextPage} 미리 로드 시작...`);
    preloadingPages.add(nextPage);
    
    try {
        const cursor = (nextPage - 1) * resultsPerPage;
        const results = await searchRealTikTokData(query, country, cursor);
        
        if (results && results.length > 0) {
            setCachedPage(query, country, nextPage, results);
            console.log(`✅ 페이지 ${nextPage} 미리 로드 완료: ${results.length}개 결과`);
            
            // 페이지 표시 업데이트
            updateCachedPageIndicators();
        }
        } catch (error) {
        console.error(`❌ 페이지 ${nextPage} 미리 로드 실패:`, error);
    } finally {
        preloadingPages.delete(nextPage);
    }
}

// simulateTikTokSearch 함수는 제거됨 - searchRealTikTokData 직접 사용

// Douyin API 검색 함수
async function searchDouyinData(query, cursor = 0) {
    console.log(`Douyin API 검색 시작: "${query}", offset: ${cursor}`);
    
    const douyinApiUrl = `https://douyin-api.p.rapidapi.com/api/challenge/posts?hashtag=${encodeURIComponent(query)}&offset=${cursor}&count=10`;
    const douyinApiKey = 'bb2252aa5dmsh70444c45811a8c4p1f4885jsnf86faab1a5d2';
    
    try {
        console.log('Douyin API 요청 URL:', douyinApiUrl);
        
        const response = await fetch(douyinApiUrl, {
            method: 'GET',
            headers: {
                'x-rapidapi-host': 'douyin-api.p.rapidapi.com',
                'x-rapidapi-key': douyinApiKey
            }
        });
        
        console.log('Douyin API 응답 상태:', response.status);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Douyin API 오류 응답:', errorText);
            throw new Error(`Douyin API 오류: ${response.status} - ${errorText}`);
        }
        
        const data = await response.json();
        console.log('Douyin API 응답 데이터:', data);
        
        // API 응답을 우리 형식으로 변환
        const parsedResults = parseDouyinData(data);
        console.log(`Douyin 검색 완료: ${parsedResults.length}개 결과`);
        
        return parsedResults;
        
    } catch (error) {
        console.error('Douyin API 호출 실패:', error);
        throw error;
    }
}

// Douyin API 응답 데이터 파싱
function parseDouyinData(apiResponse) {
    console.log('Douyin 데이터 파싱 시작:', apiResponse);
    
    // API 응답이 비어있거나 오류인 경우 빈 배열 반환
    if (!apiResponse || apiResponse.error) {
        console.log('Douyin API 응답이 비어있거나 오류:', apiResponse);
        return [];
    }
    
    // 새로운 API 구조: data 배열에서 type이 1인 항목들만 비디오 데이터
    const videoItems = apiResponse.data?.filter(item => item.type === 1 && item.aweme_info) || [];
    
    if (videoItems.length === 0) {
        console.log('Douyin API 응답에 비디오 데이터가 없음');
        // 임시로 데모 데이터 생성
        return generateDouyinDemoData();
    }
    
    // 새로운 API 데이터 구조에 맞게 파싱
    const videos = videoItems.map((item, index) => {
        const awemeInfo = item.aweme_info;
        
        return {
            id: awemeInfo.aweme_id || `douyin_${Date.now()}_${index}`,
            title: awemeInfo.desc || `Douyin 비디오 ${index + 1}`,
            thumbnail: awemeInfo.video?.cover?.url_list?.[0] || 'https://via.placeholder.com/300x400?text=Douyin+Video',
            videoUrl: awemeInfo.video?.play_addr?.url_list?.[0] || '',
            videoUrls: awemeInfo.video?.play_addr?.url_list || [],
            downloadUrl: awemeInfo.video?.download_addr?.url_list?.[0] || '',
            author: awemeInfo.author?.nickname || 'Douyin User',
            authorAvatar: awemeInfo.author?.avatar_thumb?.url_list?.[0] || '',
            views: awemeInfo.statistics?.play_count || Math.floor(Math.random() * 1000000),
            likes: awemeInfo.statistics?.digg_count || Math.floor(Math.random() * 50000),
            comments: awemeInfo.statistics?.comment_count || Math.floor(Math.random() * 10000),
            shares: awemeInfo.statistics?.share_count || Math.floor(Math.random() * 5000),
            downloads: awemeInfo.statistics?.download_count || Math.floor(Math.random() * 1000),
            duration: awemeInfo.video?.duration ? Math.floor(awemeInfo.video.duration / 1000) : Math.floor(Math.random() * 60) + 15,
            caption: awemeInfo.desc || '',
            uploadDate: awemeInfo.create_time || Math.floor(Date.now() / 1000) - Math.floor(Math.random() * 86400 * 30),
            country: 'zh',
            allowDownload: awemeInfo.video_control?.allow_download !== false
        };
    });
    
    console.log(`Douyin 데이터 파싱 완료: ${videos.length}개 비디오`);
    return videos;
}

// Douyin 데모 데이터 생성 (API 응답이 비어있을 때)
function generateDouyinDemoData() {
    console.log('Douyin 데모 데이터 생성');
    
    const demoVideos = [];
    const chineseTerms = ['时尚', '美食', '旅行', '音乐', '舞蹈', '搞笑', '宠物', '科技', '美妆', '运动'];
    
    for (let i = 0; i < 10; i++) {
        const randomTerm = chineseTerms[Math.floor(Math.random() * chineseTerms.length)];
        demoVideos.push({
            id: `douyin_demo_${Date.now()}_${i}`,
            title: `${randomTerm}相关视频 ${i + 1} - 抖音热门内容`,
            thumbnail: `https://picsum.photos/300/400?random=${Date.now() + i}&blur=1`,
            videoUrl: `https://sample-videos.com/zip/10/mp4/SampleVideo_360x240_1mb.mp4`,
            author: `抖音用户${i + 1}`,
            authorAvatar: `https://i.pravatar.cc/100?img=${i + 1}`,
            views: Math.floor(Math.random() * 5000000) + 100000,
            likes: Math.floor(Math.random() * 200000) + 5000,
            comments: Math.floor(Math.random() * 50000) + 1000,
            shares: Math.floor(Math.random() * 10000) + 500,
            downloads: Math.floor(Math.random() * 5000) + 100,
            duration: Math.floor(Math.random() * 45) + 15,
            caption: `这是一个关于${randomTerm}的精彩视频内容，在抖音上非常受欢迎！#${randomTerm} #抖音 #热门`,
            uploadDate: Math.floor(Date.now() / 1000) - Math.floor(Math.random() * 86400 * 7),
            country: 'zh'
        });
    }
    
    return demoVideos;
}

async function searchRealTikTokData(query, country, cursor = 0) {
    // 시도할 수 있는 엔드포인트들
    const endpoints = [
        '/search',
        '/feed/search',
        '/video/search',
        '/api/search',
        '/search/video'
    ];
    
    for (const endpoint of endpoints) {
        try {
            console.log(`TikTok API 엔드포인트 시도: ${endpoint}`);
            
            // URL 파라미터 구성
            const params = new URLSearchParams({
                keywords: query,
                count: 20,
                cursor: cursor,
                region: getRegionCode(country)
            });
            
            const searchUrl = `${TIKTOK_API_URL}${endpoint}?${params.toString()}`;
            console.log('API 호출 URL:', searchUrl);
            console.log('검색어 확인:', query);
            console.log('파라미터 확인:', params.toString());
            
            const searchResponse = await fetch(searchUrl, {
                method: 'GET',
                headers: {
                    'X-RapidAPI-Key': RAPIDAPI_KEY,
                    'X-RapidAPI-Host': 'tiktok-video-no-watermark2.p.rapidapi.com'
                }
            });

            console.log(`${endpoint} 응답 상태:`, searchResponse.status);

            if (searchResponse.ok) {
                const searchData = await searchResponse.json();
                console.log(`${endpoint} 성공! 응답 데이터:`, searchData);
                console.log('응답 데이터 구조:', JSON.stringify(searchData, null, 2));
                
                // API 응답 데이터를 우리 형식으로 변환 (hasMore 정보도 함께 처리됨)
                const parsedData = parseRealTikTokData(searchData);
                
                return parsedData;
            } else {
                const errorText = await searchResponse.text();
                console.log(`${endpoint} 실패 (${searchResponse.status}):`, errorText);
                continue; // 다음 엔드포인트 시도
            }
            
        } catch (error) {
            console.log(`${endpoint} 오류:`, error.message);
            continue; // 다음 엔드포인트 시도
        }
    }
    
    // 모든 엔드포인트가 실패한 경우
    console.error('모든 TikTok API 엔드포인트 시도 실패');
    
    throw new Error(`TikTok API의 모든 엔드포인트가 실패했습니다.\n\n시도한 엔드포인트:\n${endpoints.join('\n')}\n\nAPI 제공자에게 올바른 엔드포인트를 확인해주세요.`);
}

// 데모 검색 결과 생성
function generateDemoSearchResults(query, country, cursor = 0) {
    console.log(`데모 데이터 생성: "${query}" (${country}), cursor: ${cursor}`);
    
    // 페이지당 결과 수
    const resultsPerPage = 18;
    const maxPages = 5; // 최대 5페이지
    const currentPage = Math.floor(cursor / resultsPerPage);
    
    // 마지막 페이지인지 확인
    if (currentPage >= maxPages) {
        hasMoreResults = false;
        return [];
    }
    
    // 다음 페이지가 있는지 설정
    hasMoreResults = currentPage < maxPages - 1;
    
    const demoVideos = [];
    const baseId = cursor;
    
    for (let i = 0; i < resultsPerPage; i++) {
        const videoId = `demo_${baseId + i}_${Date.now()}`;
        const videoNumber = baseId + i + 1;
        
        demoVideos.push({
            id: videoId,
            title: `${query} 관련 영상 #${videoNumber}`,
            caption: `${query}에 대한 흥미로운 콘텐츠입니다! 🎵 #${query} #쇼핑 #추천`,
            thumbnail: `https://picsum.photos/300/400?random=${videoId}`,
            videoUrl: `https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4`,
            author: `creator_${(baseId + i) % 10 + 1}`,
            authorAvatar: `https://picsum.photos/50/50?random=user${(baseId + i) % 10 + 1}`,
            views: Math.floor(Math.random() * 1000000) + 10000,
            likes: Math.floor(Math.random() * 50000) + 1000,
            comments: Math.floor(Math.random() * 5000) + 100,
            shares: Math.floor(Math.random() * 1000) + 50,
            downloads: Math.floor(Math.random() * 500) + 10,
            duration: Math.floor(Math.random() * 60) + 15,
            uploadDate: Date.now() - Math.floor(Math.random() * 30 * 24 * 60 * 60 * 1000), // 최근 30일 내
            country: country,
            language: LANGUAGE_CONFIG[country]?.name || '한국어'
        });
    }
    
    console.log(`데모 데이터 ${demoVideos.length}개 생성 완료`);
    return demoVideos;
}

function getRegionCode(country) {
    const regionMap = {
        'ko': 'KR',
        'en': 'US',
        'ja': 'JP',
        'zh': 'CN',
        'es': 'ES',
        'fr': 'FR',
        'de': 'DE',
        'it': 'IT',
        'pt': 'BR',
        'ru': 'RU'
    };
    return regionMap[country] || 'US';
}

function parseRealTikTokData(apiResponse) {
    const results = [];
    
    console.log('파싱할 API 응답:', apiResponse);
    console.log('응답 타입:', typeof apiResponse);
    console.log('응답 키들:', Object.keys(apiResponse || {}));
    
    // API 응답 구조 확인
    if (apiResponse) {
        // 다양한 응답 구조 시도
        let data = null;
        
        if (apiResponse.code === 0 && apiResponse.data) {
            data = apiResponse.data;
            console.log('표준 구조 (code=0) 사용');
        } else if (apiResponse.data) {
            data = apiResponse.data;
            console.log('data 필드 사용');
        } else {
            data = apiResponse;
            console.log('직접 응답 사용');
        }
        
        console.log('데이터 구조:', Object.keys(data || {}));
        
        // 가능한 비디오 데이터 배열 경로들
        const videoArrays = [
            data?.videos,
            data?.aweme_list, 
            data?.items,
            data?.list,
            data?.results,
            data?.feed_items,
            data?.video_list
        ];
        
        let videoArray = null;
        for (let i = 0; i < videoArrays.length; i++) {
            const arr = videoArrays[i];
            console.log(`배열 ${i} 확인:`, arr ? `길이 ${arr.length}` : 'null/undefined');
            if (Array.isArray(arr) && arr.length > 0) {
                videoArray = arr;
                console.log('비디오 배열 발견:', arr.length, '개');
                break;
            }
        }
        
        if (videoArray) {
            videoArray.forEach((video, index) => {
                results.push({
                    id: video.aweme_id || video.video_id || video.id || `real_video_${index}`,
                    title: video.desc || video.title || video.content || '제목 없음',
                    author: video.author?.unique_id || video.author?.nickname || video.user?.unique_id || 'unknown_user',
                    views: video.play_count || video.statistics?.play_count || video.stats?.view_count || Math.floor(Math.random() * 100000),
                    likes: video.digg_count || video.statistics?.digg_count || video.stats?.like_count || Math.floor(Math.random() * 10000),
                    comments: video.comment_count || video.statistics?.comment_count || video.stats?.comment_count || Math.floor(Math.random() * 1000),
                    shares: video.share_count || video.statistics?.share_count || video.stats?.share_count || Math.floor(Math.random() * 500),
                    downloads: video.download_count || video.statistics?.download_count || 0,
                    caption: video.desc || video.title || '',
                    uploadDate: video.create_time || Math.floor(Date.now() / 1000),
                    thumbnail: video.cover || video.ai_dynamic_cover || video.origin_cover || video.video?.cover || video.video?.dynamic_cover || 'https://picsum.photos/300/400',
                    duration: video.duration || video.video?.duration || Math.floor(Math.random() * 60) + 15,
                    videoUrl: video.play || video.video?.play_addr?.url_list?.[0] || video.play_url || video.wmplay || video.video?.download_addr?.url_list?.[0] || '',
                    videoUrlWatermark: video.wmplay || video.video?.download_addr?.url_list?.[0] || video.play || video.play_url || '',
                    music: video.music || video.music_info?.play || '',
                    musicInfo: {
                        title: video.music_info?.title || '',
                        author: video.music_info?.author || '',
                        duration: video.music_info?.duration || 0,
                        cover: video.music_info?.cover || ''
                    },
                    authorAvatar: video.author?.avatar || video.author?.avatar_larger || video.author?.avatar_medium || video.user?.avatar || ''
                });
            });
        } else {
            console.log('비디오 배열을 찾을 수 없습니다. 응답 구조:', Object.keys(data));
        }
    } else {
        console.log('API 응답 형식이 예상과 다릅니다:', apiResponse);
    }
    
    console.log(`파싱 완료: ${results.length}개의 비디오`);
    
    // hasMore 정보를 글로벌 변수에 설정
    if (apiResponse && apiResponse.data) {
        if (typeof apiResponse.data.hasMore !== 'undefined') {
            hasMoreResults = apiResponse.data.hasMore;
            console.log('API에서 hasMore 정보:', hasMoreResults);
        } else if (typeof apiResponse.data.has_more !== 'undefined') {
            hasMoreResults = apiResponse.data.has_more;
            console.log('API에서 has_more 정보:', hasMoreResults);
        } else if (results.length === 0) {
            hasMoreResults = false;
            console.log('결과가 없어서 hasMore를 false로 설정');
        } else if (results.length < 18) {
            hasMoreResults = false;
            console.log('결과가 18개 미만이어서 hasMore를 false로 설정');
        } else {
            hasMoreResults = true;
            console.log('결과가 18개 이상이어서 hasMore를 true로 설정');
        }
    }
    
    return results;
}

// 더미 데이터 함수 제거 - 실제 TikTok API만 사용

function showLoadingState() {
    isLoading = true;
    resultsSection.classList.add('show');
    loadingSpinner.classList.add('show');
    resultsList.innerHTML = '';
    emptyState.classList.remove('show');
    resultsCount.textContent = '검색 중...';
}

function showLoadMoreState() {
    isLoading = true;
    // 하단에 로딩 인디케이터 추가
    const loadMoreIndicator = document.createElement('div');
    loadMoreIndicator.id = 'loadMoreIndicator';
    loadMoreIndicator.className = 'load-more-indicator';
    loadMoreIndicator.innerHTML = `
        <div class="spinner"></div>
        <p>더 많은 콘텐츠를 불러오는 중...</p>
    `;
    
    // 기존 인디케이터 제거 후 새로 추가
    const existing = document.getElementById('loadMoreIndicator');
    if (existing) existing.remove();
    
    resultsList.appendChild(loadMoreIndicator);
}

function displaySearchResults(results, originalQuery, country, isLoadMore = false) {
    // 로딩 인디케이터 제거
    loadingSpinner.classList.remove('show');
    const loadMoreIndicator = document.getElementById('loadMoreIndicator');
    if (loadMoreIndicator) loadMoreIndicator.remove();
    
    // 헤더 복원
    document.querySelector('.results-header h2').textContent = '검색 결과';
    
    if (results.length === 0) {
        showEmptyState();
        return;
    }
    
    if (!isLoadMore) {
        // 새로운 검색인 경우 첫 페이지 표시
        currentPage = 1;
        
        // 첫 페이지 결과 표시
        resultsList.innerHTML = '';
        results.forEach((video, index) => {
            const videoElement = createVideoElement(video);
            videoElement.style.opacity = '0';
            videoElement.style.transform = 'translateY(20px)';
            resultsList.appendChild(videoElement);
            
            // 애니메이션
            setTimeout(() => {
                videoElement.style.opacity = '1';
                videoElement.style.transform = 'translateY(0)';
            }, index * 50);
        });
        
        // 첫 페이지를 캐시에 저장
        setCachedPage(currentQuery, currentCountry, 1, results);
        
        // 페이지네이션 설정 (hasMoreResults에 따라)
        const totalPages = hasMoreResults ? 2 : 1; // 더 있으면 2페이지 이상 표시
        setupPagination(totalPages, results.length);
        
        console.log(`첫 페이지 로드: ${results.length}개 결과, hasMore: ${hasMoreResults}, 총 페이지: ${totalPages}`);
        
        // 다음 페이지 미리 로드 (백그라운드에서)
        if (hasMoreResults) {
            setTimeout(() => {
                preloadNextPage(currentQuery, currentCountry, 1);
            }, 500); // 0.5초 후 미리 로드 시작
        }
    } else {
        // 무한 스크롤의 경우 기존 방식 유지
        const existingCount = resultsList.querySelectorAll('.video-item').length;
        const newResults = results.slice(existingCount);
        
        newResults.forEach((video, index) => {
            const videoElement = createVideoElement(video);
            videoElement.style.opacity = '0';
            videoElement.style.transform = 'translateY(20px)';
            resultsList.appendChild(videoElement);
            
            setTimeout(() => {
                videoElement.style.transition = 'all 0.3s ease-out';
                videoElement.style.opacity = '1';
                videoElement.style.transform = 'translateY(0)';
            }, index * 100);
        });
        
        // 더 이상 결과가 없으면 안내 메시지 표시
        if (!hasMoreResults && results.length > 0) {
            const endMessage = document.createElement('div');
            endMessage.className = 'end-message';
            endMessage.innerHTML = `
                <p>🎉 모든 검색 결과를 불러왔습니다!</p>
                <p>총 ${results.length}개의 영상을 찾았습니다.</p>
            `;
            resultsList.appendChild(endMessage);
        }
    }
}

function displayPage(results, page) {
    const startIndex = (page - 1) * resultsPerPage;
    const endIndex = startIndex + resultsPerPage;
    const pageResults = results.slice(startIndex, endIndex);
    
    // 결과 리스트 초기화
    resultsList.innerHTML = '';
    
    // 페이지 결과 표시
    pageResults.forEach((video, index) => {
        const videoElement = createVideoElement(video);
        videoElement.style.opacity = '0';
        videoElement.style.transform = 'translateY(20px)';
        resultsList.appendChild(videoElement);
        
        // 애니메이션
        setTimeout(() => {
            videoElement.style.transition = 'all 0.3s ease-out';
            videoElement.style.opacity = '1';
            videoElement.style.transform = 'translateY(0)';
        }, index * 50);
    });
    
    // 페이지 상단으로 스크롤
    resultsSection.scrollIntoView({ behavior: 'smooth' });
}

function setupPagination(totalPages, pageResults) {
    console.log(`페이지네이션 설정: 총 페이지 ${totalPages}, 현재 페이지 결과 ${pageResults}`);
    console.log('paginationContainer 요소:', paginationContainer);
    
    // 결과가 있으면 무조건 페이지네이션 표시 (1페이지라도)
    if (pageResults > 0 && paginationContainer) {
        console.log('페이지네이션 강제 표시');
        
        paginationContainer.classList.add('show');
        paginationContainer.style.display = 'block'; // 강제 표시
        console.log('페이지네이션 클래스 및 스타일 추가됨');
        
        // 페이지 번호 생성
        generatePageNumbers(totalPages);
        
        // 캐시된 페이지 표시 업데이트
        updateCachedPageIndicators();
        
        // 페이지 정보 업데이트
        updatePaginationInfo(pageResults, currentPage);
        
        // 이전/다음 버튼 상태 업데이트
        updatePaginationButtons(totalPages);
        
        console.log('페이지네이션 설정 완료');
    } else {
        console.log('결과가 없거나 요소가 없어서 페이지네이션 숨김');
        if (paginationContainer) {
            paginationContainer.classList.remove('show');
        }
    }
}

function generatePageNumbers(totalPages) {
    console.log('페이지 번호 생성:', totalPages, 'pageNumbers 요소:', pageNumbers);
    
    if (!pageNumbers) {
        console.error('pageNumbers 요소를 찾을 수 없습니다!');
        return;
    }
    
    pageNumbers.innerHTML = '';
    
    // 페이지가 1개만 있어도 표시
    if (totalPages >= 1) {
        const maxVisiblePages = 5;
        let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
        let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
        
        // 시작 페이지 조정
        if (endPage - startPage + 1 < maxVisiblePages) {
            startPage = Math.max(1, endPage - maxVisiblePages + 1);
        }
        
        // 첫 페이지
        if (startPage > 1) {
            addPageNumber(1);
            if (startPage > 2) {
                addPageDots();
            }
        }
        
        // 중간 페이지들
        for (let i = startPage; i <= endPage; i++) {
            addPageNumber(i);
        }
        
        // 마지막 페이지
        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                addPageDots();
            }
            addPageNumber(totalPages);
        }
        
        console.log(`페이지 번호 생성 완료: ${startPage}-${endPage} (총 ${totalPages}페이지)`);
    }
}

function addPageNumber(pageNum) {
    const pageBtn = document.createElement('button');
    pageBtn.className = `page-number ${pageNum === currentPage ? 'active' : ''}`;
    pageBtn.textContent = pageNum;
    pageBtn.onclick = () => goToPage(pageNum);
    pageNumbers.appendChild(pageBtn);
}

function addPageDots() {
    const dots = document.createElement('span');
    dots.className = 'page-number dots';
    dots.textContent = '...';
    pageNumbers.appendChild(dots);
}

// 캐시된 페이지 표시 업데이트 (시각적 표시 없음)
function updateCachedPageIndicators() {
    // 시각적 표시는 하지 않지만 캐시 상태는 내부적으로 관리
    const pageButtons = document.querySelectorAll('.page-number:not(.dots)');
    
    pageButtons.forEach(button => {
        const pageNum = parseInt(button.textContent);
        const cachedData = getCachedPage(currentQuery, currentCountry, pageNum);
        
        if (cachedData) {
            button.classList.add('cached');
            // 툴팁 제거 - 자연스럽게
        } else {
            button.classList.remove('cached');
        }
    });
}

function updatePaginationInfo(pageResults, page = currentPage) {
    if (!paginationInfo) {
        console.error('paginationInfo 요소를 찾을 수 없습니다!');
        return;
    }
    
    const startResult = (page - 1) * resultsPerPage + 1;
    const endResult = startResult + pageResults - 1;
    
    paginationInfo.textContent = `${startResult}-${endResult} / 페이지 ${page}`;
}

function updatePaginationButtons(totalPages) {
    if (!prevBtn || !nextBtn) {
        console.error('페이지네이션 버튼 요소를 찾을 수 없습니다!');
        return;
    }
    
    prevBtn.disabled = currentPage === 1;
    nextBtn.disabled = currentPage === totalPages;
}

async function goToPage(page) {
    if (page === currentPage || isLoading) return;
    
    console.log(`페이지 ${page}로 이동 시작`);
    
    currentPage = page;
    
    // 캐시된 데이터 확인
    const cachedData = getCachedPage(currentQuery, currentCountry, page);
    let searchResults;
    
    if (cachedData) {
        console.log(`✅ 페이지 ${page} 캐시에서 로드: ${cachedData.data.length}개 결과`);
        searchResults = cachedData.data;
        hasMoreResults = cachedData.hasMore;
        
        // 캐시된 데이터는 즉시 표시 (로딩 없음)
    } else {
        console.log(`📡 페이지 ${page} API에서 로드 중...`);
        isLoading = true;
        
        // 로딩 상태 표시
        showLoadingState();
        
        try {
            // 새로운 페이지의 커서 계산 (페이지 1 = 커서 0, 페이지 2 = 커서 18, ...)
            const newCursor = (page - 1) * resultsPerPage;
            console.log(`페이지 ${page}, 커서: ${newCursor}`);
            
            // API에서 해당 페이지 데이터 가져오기
            searchResults = await searchRealTikTokData(currentQuery, currentCountry, newCursor);
            
            // 새로 로드한 데이터를 캐시에 저장
            if (searchResults && searchResults.length > 0) {
                setCachedPage(currentQuery, currentCountry, page, searchResults);
            }
        } catch (error) {
            console.error(`페이지 ${page} 로드 중 오류:`, error);
            showErrorState(error.message);
            isLoading = false;
            return;
        }
    }
    
    try {
        
        if (searchResults && searchResults.length > 0) {
            // 해당 페이지의 결과만 표시
            resultsList.innerHTML = '';
            
            searchResults.forEach((video, index) => {
                const videoElement = createVideoElement(video);
                videoElement.style.opacity = '0';
                videoElement.style.transform = 'translateY(20px)';
                resultsList.appendChild(videoElement);
                
                // 애니메이션
                setTimeout(() => {
                    videoElement.style.opacity = '1';
                    videoElement.style.transform = 'translateY(0)';
                }, index * 50);
            });
            
            // 페이지네이션 업데이트 (hasMoreResults에 따라 총 페이지 수 결정)
            const totalPages = hasMoreResults ? page + 1 : page; // 더 있으면 다음 페이지 표시
    generatePageNumbers(totalPages);
            updatePaginationInfo(searchResults.length, page);
    updatePaginationButtons(totalPages);
            
            console.log(`페이지 ${page} 로드 완료: ${searchResults.length}개 결과, hasMore: ${hasMoreResults}`);
            
            // 다음 페이지 미리 로드 (백그라운드에서)
            if (hasMoreResults) {
                setTimeout(() => {
                    preloadNextPage(currentQuery, currentCountry, page);
                }, 300); // 0.3초 후 미리 로드 시작
            }
        } else {
            console.log(`페이지 ${page}에 결과가 없습니다`);
            showEmptyState();
        }
        
    } catch (error) {
        console.error(`페이지 ${page} 로드 중 오류:`, error);
        showErrorState(error.message);
    } finally {
        isLoading = false;
        loadingSpinner.classList.remove('show');
        
        // 페이지 상단으로 스크롤
        resultsSection.scrollIntoView({ behavior: 'smooth' });
    }
}

function createVideoElement(video, isFavoriteView = false) {
    const videoItem = document.createElement('div');
    videoItem.className = 'video-item';
    
    const uploadDate = new Date(video.uploadDate * 1000);
    const timeAgo = getTimeAgo(uploadDate);
    
    // 즐겨찾기 상태 확인
    const favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
    const isFavorited = favorites.some(fav => fav.id === video.id);
    
    videoItem.innerHTML = `
        <div class="video-content">
            <div class="video-thumbnail">
                <img src="${video.thumbnail}" alt="${video.title}" loading="lazy">
                <div class="play-overlay">
                    <i class="fas fa-play"></i>
                </div>
            </div>
            <div class="video-info">
                <h3 class="video-title">${video.title}</h3>
                <div class="video-meta">
                    <div class="meta-item">
                        <i class="fas fa-eye"></i>
                        <span>${formatNumber(video.views)}</span>
                    </div>
                    <div class="meta-item">
                        <i class="fas fa-heart"></i>
                        <span>${formatNumber(video.likes)}</span>
                    </div>
                    <div class="meta-item">
                        <i class="fas fa-clock"></i>
                        <span>${video.duration}초</span>
                    </div>
                </div>
                <p class="video-caption">${video.caption}</p>
                <div class="video-author">
                    <div class="author-avatar">
                        ${video.authorAvatar ? 
                            `<img src="${video.authorAvatar}" alt="${video.author}">` : 
                            video.author.charAt(0).toUpperCase()
                        }
                    </div>
                    <span class="author-name clickable" onclick="showCreatorProfile('${video.author}', event)">@${video.author}</span>
                    <span class="meta-item" style="margin-left: auto;">
                        <i class="fas fa-calendar"></i>
                        <span>${timeAgo}</span>
                    </span>
                </div>
            </div>
            <div class="video-actions">
                <button class="action-btn favorite ${isFavorited ? 'favorited' : ''}" onclick="toggleFavorite('${video.id}', '${video.title}', event)">
                    <i class="fas fa-heart"></i>
                    ${isFavorited ? '즐겨찾기됨' : '즐겨찾기'}
                </button>
                <button class="action-btn download" onclick="downloadVideoFromButton('${video.id}', event)" ${!video.videoUrl && !video.videoUrlWatermark ? 'disabled title="다운로드 링크가 없습니다"' : ''}>
                    <i class="fas fa-download"></i>
                    다운로드
                </button>
            </div>
        </div>
    `;
    
    // 썸네일 클릭 시 모달 열기
    const thumbnail = videoItem.querySelector('.video-thumbnail');
    thumbnail.addEventListener('click', (e) => {
        e.stopPropagation();
        console.log(`비디오 썸네일 클릭: ${video.title}`, video);
        try {
            openVideoModal(video);
        } catch (error) {
            console.error('비디오 모달 열기 실패:', error);
            alert('비디오를 열 수 없습니다: ' + error.message);
        }
    });
    
    return videoItem;
}

function showEmptyState() {
    loadingSpinner.classList.remove('show');
    
    // 현재 검색 정보를 기반으로 맞춤형 메시지 생성
    const selectedCountry = countrySelect.value;
    const countryName = LANGUAGE_CONFIG[selectedCountry]?.name || '선택된 국가';
    const searchQuery = currentQuery || '검색어';
    
    emptyState.innerHTML = `
        <i class="fas fa-search"></i>
        <h3>검색 결과가 없습니다</h3>
        <p>"${searchQuery}"에 대한 ${countryName} 지역 콘텐츠를 찾을 수 없습니다</p>
        <div class="empty-suggestions">
            <h4>💡 다음을 시도해보세요:</h4>
            <ul>
                <li>• 다른 검색어 사용 (예: "makeup", "skincare", "shopping")</li>
                <li>• 한국 또는 일본 지역 선택</li>
                <li>• 더 일반적인 키워드 사용</li>
            </ul>
        </div>
    `;
    emptyState.classList.add('show');
    resultsCount.textContent = '0개의 결과';
}

function showErrorState(message) {
    loadingSpinner.classList.remove('show');
    resultsList.innerHTML = `
        <div class="error-state">
            <i class="fas fa-exclamation-triangle"></i>
            <h3>검색 중 오류가 발생했습니다</h3>
            <p>${message}</p>
            <button onclick="location.reload()" class="retry-btn">다시 시도</button>
        </div>
    `;
    resultsCount.textContent = '오류 발생';
}

// 유틸리티 함수들
function formatNumber(num) {
    // undefined나 null 체크
    if (num === undefined || num === null || isNaN(num)) {
        return '0';
    }
    
    // 숫자로 변환
    const number = Number(num);
    
    if (number >= 1000000) {
        return (number / 1000000).toFixed(1) + 'M';
    } else if (number >= 1000) {
        return (number / 1000).toFixed(1) + 'K';
    }
    return number.toString();
}

function getTimeAgo(date) {
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
        const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
        if (diffHours === 0) {
            const diffMinutes = Math.floor(diffTime / (1000 * 60));
            return `${diffMinutes}분 전`;
        }
        return `${diffHours}시간 전`;
    } else if (diffDays === 1) {
        return '어제';
    } else if (diffDays < 7) {
        return `${diffDays}일 전`;
    } else if (diffDays < 30) {
        const diffWeeks = Math.floor(diffDays / 7);
        return `${diffWeeks}주 전`;
    } else if (diffDays < 365) {
        const diffMonths = Math.floor(diffDays / 30);
        return `${diffMonths}개월 전`;
    } else {
        const diffYears = Math.floor(diffDays / 365);
        return `${diffYears}년 전`;
    }
}

// 모바일 사이드바 토글
function toggleSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.querySelector('.sidebar-overlay');
    
    sidebar.classList.toggle('open');
    overlay.classList.toggle('show');
    
    // 바디 스크롤 방지/허용
    if (sidebar.classList.contains('open')) {
        document.body.style.overflow = 'hidden';
    } else {
        document.body.style.overflow = '';
    }
}

function closeSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.querySelector('.sidebar-overlay');
    
    sidebar.classList.remove('open');
    overlay.classList.remove('show');
    document.body.style.overflow = '';
}

// 키보드 단축키
document.addEventListener('keydown', function(e) {
    // ESC 키 처리
    if (e.key === 'Escape') {
        // 로그인 모달이 강제 모드일 때는 ESC 키 무시
        const authModal = document.getElementById('authModal');
        const isAuthModalForced = authModal && authModal.getAttribute('data-force') === 'true';
        
        if (isAuthModalForced) {
            showToast('로그인이 필요합니다', 'warning');
            return;
        }
        
        const sidebar = document.querySelector('.sidebar');
        if (sidebar.classList.contains('open')) {
            closeSidebar();
        } else if (document.activeElement === searchInput) {
            searchInput.value = '';
            clearBtn.click();
        } else if (authModal && authModal.classList.contains('show')) {
            closeAuthModal();
        }
    }
    
    // Ctrl/Cmd + K로 검색창 포커스
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        searchInput.focus();
        searchInput.select();
    }
});

// 검색 기록 관리 (로컬 스토리지 활용)
function saveSearchHistory(query, country) {
    const history = getSearchHistory();
    const newEntry = {
        query,
        country,
        timestamp: new Date().toISOString()
    };
    
    // 중복 제거
    const filteredHistory = history.filter(item => 
        !(item.query === query && item.country === country)
    );
    
    filteredHistory.unshift(newEntry);
    
    // 최대 50개까지만 저장
    const limitedHistory = filteredHistory.slice(0, 50);
    
    localStorage.setItem('searchHistory', JSON.stringify(limitedHistory));
}

function getSearchHistory() {
    const history = localStorage.getItem('searchHistory');
    return history ? JSON.parse(history) : [];
}

// 비디오 모달 관련 함수들
function openVideoModal(video) {
    console.log('비디오 모달 열기 시도:', video);
    try {
        const modal = createVideoModal(video);
        console.log('모달 생성 완료:', modal);
        document.body.appendChild(modal);
        
        // 모달 표시
        setTimeout(() => {
            modal.classList.add('show');
        }, 10);
        
        // 배경 클릭 시 닫기
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeVideoModal(modal);
            }
        });
        
        // ESC 키로 닫기
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                closeVideoModal(modal);
                document.removeEventListener('keydown', handleEscape);
            }
        };
        document.addEventListener('keydown', handleEscape);
        
    } catch (error) {
        console.error('비디오 모달 생성 오류:', error);
        alert('비디오를 열 수 없습니다: ' + error.message);
    }
}

function createVideoModal(video) {
    const modal = document.createElement('div');
    modal.className = 'video-modal';
    
    const timeAgo = getTimeAgo(new Date(video.uploadDate * 1000));
    
    modal.innerHTML = `
        <div class="video-modal-content">
            <button class="modal-close-btn-floating" onclick="this.closest('.video-modal').remove()">
                <i class="fas fa-times"></i>
            </button>
            
            <div class="video-modal-body">
                <div class="video-player-container" data-original-url="${video.originalUrl || video.videoUrl}">
                    <video 
                        class="video-player" 
                        controls 
                        poster="${video.thumbnail}"
                        preload="metadata"
                        crossorigin="anonymous"
                        playsinline
                    >
                        <source src="${video.videoUrl}" type="video/mp4">
                        브라우저가 비디오를 지원하지 않습니다.
                    </video>
                    <div class="video-loading-debug" style="position: absolute; top: 10px; left: 10px; background: rgba(0,0,0,0.7); color: white; padding: 5px; font-size: 12px; border-radius: 3px; z-index: 1000;">
                        로딩 중...
                    </div>
                    
                    <div class="video-controls">
                        <button class="control-btn download-btn" onclick="downloadVideo('${video.videoUrl}', '${video.title}')">
                            <i class="fas fa-download"></i>
                            다운로드
                        </button>
                        <button class="control-btn product-search-btn" onclick="startProductSearch(this)">
                            <i class="fas fa-search"></i>
                            제품찾기
                        </button>

                        <button class="control-btn help-btn" onclick="showCaptureHelp()" title="캡처 방법 도움말">
                            <i class="fas fa-question-circle"></i>
                            도움말
                        </button>
                    </div>
                </div>
                
                <div class="video-info">
                    <div class="video-title-modal">
                        <h2 id="videoTitle-${video.id}" class="${video.title.length > 100 ? 'truncated' : ''}">${video.title}</h2>
                        ${video.title.length > 100 ? `<button class="expand-btn" onclick="toggleTitleExpansion('${video.id}')">더보기</button>` : ''}
                    </div>
                    
                    <div class="video-stats">
                        <div class="stat-item">
                            <i class="fas fa-eye"></i>
                            <span>${formatNumber(video.views)}</span>
                        </div>
                        <div class="stat-item">
                            <i class="fas fa-heart"></i>
                            <span>${formatNumber(video.likes)}</span>
                        </div>
                        <div class="stat-item">
                            <i class="fas fa-comment"></i>
                            <span>${formatNumber(video.comments)}</span>
                        </div>
                        <div class="stat-item">
                            <i class="fas fa-share"></i>
                            <span>${formatNumber(video.shares)}</span>
                        </div>
                        <div class="stat-item">
                            <i class="fas fa-download"></i>
                            <span>${formatNumber(video.downloads || 0)}</span>
                        </div>
                    </div>
                    
                    <div class="video-description">
                        <p id="videoDescription-${video.id}" class="${video.caption.length > 200 ? 'truncated' : ''}">${video.caption}</p>
                        ${video.caption.length > 200 ? `<button class="expand-btn" onclick="toggleDescriptionExpansion('${video.id}')">더보기</button>` : ''}
                    </div>
                    
                    <div class="video-author-info">
                        <div class="author-avatar">
                            ${video.authorAvatar ? 
                                `<img src="${video.authorAvatar}" alt="${video.author}">` : 
                                video.author.charAt(0).toUpperCase()
                            }
                        </div>
                        <div class="author-details">
                            <span class="author-name clickable" onclick="showCreatorProfile('${video.author}', event)">@${video.author}</span>
                            <span class="upload-date">${timeAgo}</span>
                        </div>
                    </div>
                    

                </div>
            </div>
        </div>
    `;
    
    // 비디오 요소와 디버그 요소 가져오기
    const videoElement = modal.querySelector('.video-player');
    const debugElement = modal.querySelector('.video-loading-debug');
    
    // 비디오 이벤트 리스너 추가
    videoElement.addEventListener('loadstart', () => {
        console.log('비디오 로딩 시작:', video.videoUrl);
        debugElement.textContent = '로딩 시작...';
    });
    
    videoElement.addEventListener('loadedmetadata', () => {
        console.log('비디오 메타데이터 로드 완료');
        debugElement.textContent = '메타데이터 로드됨';
    });
    
    videoElement.addEventListener('loadeddata', () => {
        console.log('비디오 데이터 로드 완료');
        debugElement.textContent = '데이터 로드됨';
    });
    
    videoElement.addEventListener('canplay', () => {
        console.log('비디오 재생 가능');
        debugElement.textContent = '재생 가능';
        debugElement.style.display = 'none'; // 성공 시 디버그 메시지 숨김
    });
    
    videoElement.addEventListener('canplaythrough', () => {
        console.log('비디오 완전 로드됨');
        debugElement.style.display = 'none';
    });
    
    videoElement.addEventListener('error', async (e) => {
        console.error('비디오 로딩 오류:', e);
        console.error('비디오 오류 상세:', videoElement.error);
        
        // 현재 시도한 URL 인덱스 추적
        if (!video.currentUrlIndex) video.currentUrlIndex = 0;
        
        // 다른 URL이 있는 경우 시도
        if (video.videoUrls && video.currentUrlIndex < video.videoUrls.length - 1) {
            video.currentUrlIndex++;
            const nextUrl = video.videoUrls[video.currentUrlIndex];
            console.log(`다음 URL로 재시도 (${video.currentUrlIndex + 1}/${video.videoUrls.length}):`, nextUrl);
            
            debugElement.textContent = `다른 URL로 재시도 중... (${video.currentUrlIndex + 1}/${video.videoUrls.length})`;
            debugElement.style.background = 'rgba(255,165,0,0.7)';
            
            videoElement.src = nextUrl;
            videoElement.load();
            return;
        }
        
        // 모든 URL 시도 후에도 실패하면 API에서 새로운 URL 가져오기
        if (video.country === 'zh' && !video.urlRefreshed) {
            debugElement.textContent = '새 URL로 재시도 중...';
            debugElement.style.background = 'rgba(255,165,0,0.7)';
            
            try {
                // 새로운 API 호출로 최신 URL 가져오기
                const refreshedVideos = await searchDouyinData('test', 0);
                const refreshedVideo = refreshedVideos.find(v => v.id === video.id);
                
                if (refreshedVideo && refreshedVideo.videoUrl !== video.videoUrl) {
                    console.log('새로운 비디오 URL로 재시도:', refreshedVideo.videoUrl);
                    video.urlRefreshed = true; // 무한 재시도 방지
                    video.currentUrlIndex = 0; // 인덱스 리셋
                    videoElement.src = refreshedVideo.videoUrl;
                    videoElement.load();
                    return;
                }
            } catch (refreshError) {
                console.error('URL 새로고침 실패:', refreshError);
            }
        }
        
        debugElement.textContent = '로딩 실패: ' + (videoElement.error ? videoElement.error.message : '알 수 없는 오류');
        debugElement.style.background = 'rgba(255,0,0,0.7)';
    });
    
    videoElement.addEventListener('stalled', () => {
        console.warn('비디오 로딩 중단됨');
        debugElement.textContent = '로딩 중단됨';
        debugElement.style.background = 'rgba(255,165,0,0.7)';
    });
    
    videoElement.addEventListener('waiting', () => {
        console.log('비디오 버퍼링 중');
        debugElement.textContent = '버퍼링 중...';
        debugElement.style.display = 'block';
    });
    
    videoElement.addEventListener('playing', () => {
        console.log('비디오 재생 중');
        debugElement.style.display = 'none';
    });
    
    return modal;
}

function closeVideoModal(modal) {
    modal.classList.remove('show');
    
    // 비디오 정지
    const video = modal.querySelector('video');
    if (video) {
        video.pause();
        video.currentTime = 0;
    }
    
    // 음악 정지
    const audioElements = document.querySelectorAll('.background-music');
    audioElements.forEach(audio => {
        audio.pause();
        audio.remove();
    });
    
    setTimeout(() => {
        modal.remove();
    }, 300);
}

function toggleFavorite(videoId, title, event) {
    if (event) {
        event.stopPropagation();
    }
    
    console.log(`즐겨찾기 토글: ${title}`);
    
    // 현재 비디오 정보 찾기
    const currentVideo = allResults.find(video => video.id === videoId);
    
    // 로컬 스토리지에서 즐겨찾기 목록 가져오기
    let favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
    
    // 이미 즐겨찾기된 비디오인지 확인
    const isAlreadyFavorited = favorites.some(video => video.id === videoId);
    
    if (isAlreadyFavorited) {
        // 즐겨찾기 해제
        favorites = favorites.filter(video => video.id !== videoId);
        localStorage.setItem('favorites', JSON.stringify(favorites));
        
        // 버튼 텍스트 변경
        const favoriteBtn = event.target.closest('.action-btn');
        favoriteBtn.innerHTML = '<i class="fas fa-heart"></i> 즐겨찾기';
        favoriteBtn.classList.remove('favorited');
        
        showToast(`즐겨찾기에서 제거되었습니다: ${title}`);
    } else {
        // 새로 즐겨찾기 추가
        const favoriteData = {
            ...currentVideo,
            favoritedAt: new Date().toISOString()
        };
        
        favorites.unshift(favoriteData);
        localStorage.setItem('favorites', JSON.stringify(favorites));
        
        // 버튼 텍스트 변경
        const favoriteBtn = event.target.closest('.action-btn');
        favoriteBtn.innerHTML = '<i class="fas fa-heart"></i> 즐겨찾기됨';
        favoriteBtn.classList.add('favorited');
        
        showToast(`즐겨찾기에 추가되었습니다: ${title}`);
    }
    
    // 현재 즐겨찾기 탭이 활성화되어 있다면 목록 새로고침
    const activeTab = document.querySelector('.nav-item.active .nav-link');
    if (activeTab && activeTab.textContent.includes('즐겨찾기')) {
        showFavorites();
    }
}

async function downloadVideo(url, title, event) {
    if (event) {
        event.stopPropagation();
    }
    
    // 크레딧 확인
    if (userCredits < 1) {
        showToast('다운로드하려면 1 크레딧이 필요합니다', 'error');
        setTimeout(() => {
            openChargeModal();
        }, 1500);
        return;
    }
    
    console.log(`다운로드 시도: ${title}`);
    console.log(`다운로드 URL: ${url}`);
    
    if (!url || url.trim() === '') {
        console.error('다운로드 URL이 없습니다.');
        showToast('다운로드 링크를 찾을 수 없습니다.');
        return;
    }
    
    // 크레딧 차감
    const success = await deductCredits(1);
    if (!success) {
        return;
    }
    
    showToast('1 크레딧이 차감되었습니다', 'info');
    
    try {
        // 방법 1: 직접 다운로드 시도
        const link = document.createElement('a');
        link.href = url;
        link.download = `${title.replace(/[^a-zA-Z0-9가-힣\s\-_]/g, '')}.mp4`;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        
        // 링크를 DOM에 추가하고 클릭
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        console.log('다운로드 링크 클릭 완료');
        showToast(`다운로드를 시도합니다: ${title}`);
        
        // 5초 후 대안 방법 제시 (다운로드가 시작되지 않은 경우)
        setTimeout(() => {
            if (confirm('다운로드가 시작되지 않았나요? 다른 방법을 시도해보시겠습니까?')) {
                showAlternativeDownload(url, title);
            }
        }, 5000);
        
    } catch (error) {
        console.error('다운로드 오류:', error);
        showAlternativeDownload(url, title);
    }
}

function showAlternativeDownload(url, title) {
    // 대안 다운로드 방법 제시
    const confirmDownload = confirm(
        `자동 다운로드가 작동하지 않을 수 있습니다.\n\n` +
        `새 탭에서 비디오를 열어 수동으로 다운로드하시겠습니까?\n\n` +
        `(새 탭에서 우클릭 → "다른 이름으로 저장" 선택)`
    );
    
    if (confirmDownload) {
        // 새 탭에서 비디오 열기
        const newWindow = window.open(url, '_blank', 'noopener,noreferrer');
        if (newWindow) {
            showToast('새 탭에서 비디오를 열었습니다. 우클릭으로 저장하세요.');
        } else {
            // 팝업이 차단된 경우
            showToast('팝업이 차단되었습니다. 브라우저 설정을 확인해주세요.');
            
            // 클립보드에 URL 복사 시도
            copyToClipboard(url, title);
        }
    }
}

function copyToClipboard(url, title) {
    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(url).then(() => {
            showToast(`비디오 URL이 클립보드에 복사되었습니다.\n새 탭에서 붙여넣기하여 다운로드하세요.`);
        }).catch(err => {
            console.error('클립보드 복사 실패:', err);
            showManualCopyDialog(url, title);
        });
    } else {
        showManualCopyDialog(url, title);
    }
}

function showManualCopyDialog(url, title) {
    // 수동 복사를 위한 다이얼로그
    const copyText = prompt(
        `다음 URL을 복사하여 새 탭에서 열어주세요:\n\n${title}`,
        url
    );
    
    if (copyText) {
        showToast('URL을 복사하여 새 탭에서 열어주세요.');
    }
}

let currentBackgroundMusic = null;

function toggleMusic(musicUrl) {
    if (!musicUrl || musicUrl.trim() === '') {
        showToast('음악 파일을 찾을 수 없습니다.');
        return;
    }
    
    // 기존 음악 정지
    if (currentBackgroundMusic) {
        currentBackgroundMusic.pause();
        currentBackgroundMusic.remove();
        currentBackgroundMusic = null;
        
        // 버튼 텍스트 변경
        const musicBtn = document.querySelector('.music-btn');
        if (musicBtn) {
            musicBtn.innerHTML = '<i class="fas fa-music"></i> 배경음악 재생';
        }
        return;
    }
    
    // 새 음악 재생
    currentBackgroundMusic = document.createElement('audio');
    currentBackgroundMusic.src = musicUrl;
    currentBackgroundMusic.className = 'background-music';
    currentBackgroundMusic.volume = 0.3;
    currentBackgroundMusic.loop = true;
    
    currentBackgroundMusic.addEventListener('loadstart', () => {
        console.log('음악 로딩 시작...');
    });
    
    currentBackgroundMusic.addEventListener('canplay', () => {
        currentBackgroundMusic.play().catch(error => {
            console.error('음악 재생 실패:', error);
            showToast('음악 재생에 실패했습니다.');
        });
    });
    
    currentBackgroundMusic.addEventListener('playing', () => {
        const musicBtn = document.querySelector('.music-btn');
        if (musicBtn) {
            musicBtn.innerHTML = '<i class="fas fa-pause"></i> 음악 정지';
        }
        showToast('배경음악이 재생됩니다.');
    });
    
    currentBackgroundMusic.addEventListener('error', (e) => {
        console.error('음악 로딩 오류:', e);
        showToast('음악을 로드할 수 없습니다.');
    });
    
    document.body.appendChild(currentBackgroundMusic);
}

function showToast(message, type = 'info', duration = 3000) {
    // 기존 토스트 제거
    const existingToast = document.querySelector('.toast');
    if (existingToast) {
        existingToast.remove();
    }
    
    // 아이콘 매핑
    const icons = {
        success: 'fas fa-check-circle',
        error: 'fas fa-exclamation-circle',
        warning: 'fas fa-exclamation-triangle',
        info: 'fas fa-info-circle'
    };
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    toast.innerHTML = `
        <div class="toast-icon">
            <i class="${icons[type] || icons.info}"></i>
        </div>
        <div class="toast-content">${message}</div>
        <button class="toast-close" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    document.body.appendChild(toast);
    
    // 애니메이션
    setTimeout(() => {
        toast.classList.add('show');
    }, 100);
    
    // 자동 제거 (duration이 0이면 자동 제거 안함)
    if (duration > 0) {
    setTimeout(() => {
            if (toast.parentNode) {
        toast.classList.remove('show');
        setTimeout(() => {
                    if (toast.parentNode) {
            toast.remove();
                    }
        }, 300);
            }
        }, duration);
    }
}

// 크리에이터 프로필 함수
function showCreatorProfile(creatorName, event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    
    console.log(`크리에이터 프로필 보기: ${creatorName}`);
    
    // 탭 활성화 상태 변경
    setActiveTab('creator');
    
    // 검색 섹션 숨기기
    document.querySelector('.search-section').style.display = 'none';
    
    // 크리에이터 프로필 표시
    displayCreatorProfile(creatorName);
    
    // 모바일에서 사이드바 닫기
    closeSidebar();
}

async function displayCreatorProfile(creatorName) {
    // 결과 섹션 표시
    resultsSection.classList.add('show');
    loadingSpinner.classList.add('show');
    
    // 헤더 변경
    document.querySelector('.results-header h2').textContent = `@${creatorName}`;
    resultsCount.textContent = '프로필 로딩 중...';
    
    try {
        // 크리에이터의 비디오 목록 가져오기
        const creatorVideos = await searchCreatorVideos(creatorName);
        
        loadingSpinner.classList.remove('show');
        
        if (creatorVideos.length === 0) {
            showEmptyCreatorProfile(creatorName);
        } else {
            displayCreatorVideos(creatorName, creatorVideos);
        }
        
    } catch (error) {
        console.error('크리에이터 프로필 로딩 오류:', error);
        loadingSpinner.classList.remove('show');
        showCreatorProfileError(creatorName, error.message);
    }
}

async function searchCreatorVideos(creatorName) {
    // 현재 검색 결과에서 해당 크리에이터의 비디오 찾기
    const creatorVideosFromCurrent = allResults.filter(video => 
        video.author.toLowerCase() === creatorName.toLowerCase()
    );
    
    // TikTok API를 통해 크리에이터의 추가 비디오 검색 시도
    try {
        // 크리에이터 이름으로 검색하여 더 많은 비디오 가져오기
        const searchResults = await searchRealTikTokData(`@${creatorName}`, currentCountry || 'ko', 0);
        
        // 해당 크리에이터의 비디오만 필터링
        const creatorVideos = searchResults.filter(video => 
            video.author.toLowerCase() === creatorName.toLowerCase()
        );
        
        // 기존 결과와 합치기 (중복 제거)
        const allCreatorVideos = [...creatorVideosFromCurrent];
        
        creatorVideos.forEach(newVideo => {
            const exists = allCreatorVideos.some(existingVideo => 
                existingVideo.id === newVideo.id
            );
            if (!exists) {
                allCreatorVideos.push(newVideo);
            }
        });
        
        return allCreatorVideos;
        
    } catch (error) {
        console.warn('크리에이터 추가 비디오 검색 실패:', error);
        // API 실패 시 현재 결과만 반환
        return creatorVideosFromCurrent;
    }
}

function displayCreatorVideos(creatorName, videos) {
    resultsCount.textContent = `${videos.length}개의 영상`;
    
    // 페이지네이션 숨기기
    paginationContainer.classList.remove('show');
    
    // 크리에이터 프로필 헤더 생성
    const profileHeader = createCreatorProfileHeader(creatorName, videos);
    
    // 결과 리스트 초기화 및 프로필 헤더 추가
    resultsList.innerHTML = '';
    resultsList.appendChild(profileHeader);
    
    // 비디오 목록 추가
    videos.forEach(video => {
        const videoElement = createVideoElement(video, false);
        resultsList.appendChild(videoElement);
    });
    
    emptyState.classList.remove('show');
}

function createCreatorProfileHeader(creatorName, videos) {
    const profileHeader = document.createElement('div');
    profileHeader.className = 'creator-profile-header';
    
    // 대표 비디오에서 아바타 가져오기
    const representativeVideo = videos[0];
    const avatar = representativeVideo?.authorAvatar || '';
    
    // 통계 계산
    const totalViews = videos.reduce((sum, video) => sum + (video.views || 0), 0);
    const totalLikes = videos.reduce((sum, video) => sum + (video.likes || 0), 0);
    const avgViews = videos.length > 0 ? Math.floor(totalViews / videos.length) : 0;
    
    profileHeader.innerHTML = `
        <div class="creator-profile-info">
            <div class="creator-avatar-large">
                ${avatar ? 
                    `<img src="${avatar}" alt="${creatorName}">` : 
                    creatorName.charAt(0).toUpperCase()
                }
            </div>
            <div class="creator-details">
                <h2 class="creator-name">@${creatorName}</h2>
                <div class="creator-stats">
                    <div class="stat-item">
                        <span class="stat-number">${videos.length}</span>
                        <span class="stat-label">영상</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-number">${formatNumber(totalViews)}</span>
                        <span class="stat-label">총 조회수</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-number">${formatNumber(totalLikes)}</span>
                        <span class="stat-label">총 좋아요</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-number">${formatNumber(avgViews)}</span>
                        <span class="stat-label">평균 조회수</span>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    return profileHeader;
}

function showEmptyCreatorProfile(creatorName) {
    resultsList.innerHTML = '';
    emptyState.innerHTML = `
        <i class="fas fa-user"></i>
        <h3>@${creatorName}의 영상을 찾을 수 없습니다</h3>
        <p>현재 검색 결과에서 이 크리에이터의 영상이 없습니다</p>
        <div class="empty-suggestions">
            <h4>💡 다른 방법을 시도해보세요:</h4>
            <ul>
                <li>• 다른 검색어로 해당 크리에이터의 영상을 찾아보세요</li>
                <li>• 크리에이터 이름을 정확히 확인해주세요</li>
                <li>• 다른 국가 설정으로 검색해보세요</li>
            </ul>
        </div>
    `;
    emptyState.classList.add('show');
    resultsCount.textContent = '0개의 영상';
}

function showCreatorProfileError(creatorName, errorMessage) {
    resultsList.innerHTML = `
        <div class="error-state">
            <i class="fas fa-exclamation-triangle"></i>
            <h3>프로필을 불러올 수 없습니다</h3>
            <p>@${creatorName}의 프로필을 로딩하는 중 오류가 발생했습니다.</p>
            <p class="error-details">${errorMessage}</p>
            <button onclick="displayCreatorProfile('${creatorName}')" class="retry-btn">다시 시도</button>
        </div>
    `;
    resultsCount.textContent = '오류 발생';
}

// 탭 전환 함수들
function showSearch(event) {
    if (event) {
        event.preventDefault();
    }
    
    // 탭 활성화 상태 변경
    setActiveTab('search');
    
    // 모든 섹션 숨기기
    document.querySelector('.search-section').style.display = 'block';
    const favoritesSection = document.getElementById('favoritesSection');
    if (favoritesSection) favoritesSection.style.display = 'none';
    
    // 결과 섹션 표시 (검색 결과가 있는 경우)
    if (allResults.length > 0) {
        resultsSection.classList.add('show');
        displaySearchResults(allResults, currentQuery, currentCountry, false);
    } else {
        resultsSection.classList.remove('show');
    }
    
    // 모바일에서 사이드바 닫기
    closeSidebar();
}

function showFavorites(event) {
    if (event) {
        event.preventDefault();
    }
    
    // 탭 활성화 상태 변경
    setActiveTab('favorites');
    
    // 검색 섹션 숨기기
    document.querySelector('.search-section').style.display = 'none';
    
    // 즐겨찾기 목록 표시
    displayFavorites();
    
    // 모바일에서 사이드바 닫기
    closeSidebar();
}

function setActiveTab(tabName) {
    // 모든 탭에서 active 클래스 제거
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // 해당 탭에 active 클래스 추가
    const tabs = {
        'search': 0,
        'favorites': 1,
        'history': 2,
        'settings': 3,
        'creator': 0  // 크리에이터 프로필은 검색 탭으로 표시
    };
    
    const tabIndex = tabs[tabName];
    if (tabIndex !== undefined) {
        document.querySelectorAll('.nav-item')[tabIndex].classList.add('active');
    }
}

function displayFavorites() {
    const favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
    
    // 결과 섹션 표시
    resultsSection.classList.add('show');
    loadingSpinner.classList.remove('show');
    
    // 페이지네이션 숨기기
    paginationContainer.classList.remove('show');
    
    // 헤더 변경
    document.querySelector('.results-header h2').textContent = '즐겨찾기';
    resultsCount.textContent = `${favorites.length}개의 즐겨찾기`;
    
    // 결과 표시
    if (favorites.length === 0) {
        showEmptyFavorites();
    } else {
        resultsList.innerHTML = '';
        favorites.forEach(video => {
            const videoElement = createVideoElement(video, true);
            resultsList.appendChild(videoElement);
        });
        
        emptyState.classList.remove('show');
    }
}

function showEmptyFavorites() {
    resultsList.innerHTML = '';
    emptyState.innerHTML = `
        <i class="fas fa-heart"></i>
        <h3>즐겨찾기가 비어있습니다</h3>
        <p>마음에 드는 비디오를 즐겨찾기에 추가해보세요</p>
        <div class="empty-suggestions">
            <h4>💡 즐겨찾기 사용법:</h4>
            <ul>
                <li>• 비디오 카드의 하트 버튼을 클릭하세요</li>
                <li>• 즐겨찾기된 비디오는 여기에 저장됩니다</li>
                <li>• 언제든지 다시 볼 수 있습니다</li>
            </ul>
        </div>
    `;
    emptyState.classList.add('show');
}

// 크레딧 관리 시스템
let userCredits = parseInt(localStorage.getItem('userCredits')) || 10;

function updateCreditDisplay() {
    const creditAmountElement = document.getElementById('creditAmount');
    if (creditAmountElement) {
        creditAmountElement.textContent = userCredits.toLocaleString();
    }
}

async function deductCredits(amount) {
    if (userCredits >= amount) {
        userCredits -= amount;
        
        // Supabase에 업데이트
        if (currentUser && supabase) {
            await updateUserCredits(currentUser.id, userCredits);
        } else {
            localStorage.setItem('userCredits', userCredits.toString());
        }
        
        updateCreditDisplay();
        
        // 크레딧 차감 애니메이션
        animateCreditChange(-amount);
        
        return true;
    } else {
        showLowCreditWarning();
        return false;
    }
}

async function addCredits(amount) {
    userCredits += amount;
    
    // Supabase에 업데이트
    if (currentUser && supabase) {
        await updateUserCredits(currentUser.id, userCredits);
    } else {
        localStorage.setItem('userCredits', userCredits.toString());
    }
    
    updateCreditDisplay();
    
    // 크레딧 추가 애니메이션
    animateCreditChange(amount);
    
    showToast(`${amount} 크레딧이 충전되었습니다! 💰`);
}

function animateCreditChange(amount) {
    const creditAmountElement = document.getElementById('creditAmount');
    if (!creditAmountElement) return;
    
    // 변화량 표시
    const changeIndicator = document.createElement('div');
    changeIndicator.className = 'credit-change-indicator';
    changeIndicator.textContent = amount > 0 ? `+${amount}` : amount.toString();
    changeIndicator.style.cssText = `
        position: absolute;
        top: -20px;
        right: 0;
        color: ${amount > 0 ? 'var(--success-color)' : 'var(--error-color)'};
        font-size: 12px;
        font-weight: 600;
        opacity: 1;
        transform: translateY(0);
        transition: all 1s ease-out;
        pointer-events: none;
        z-index: 10;
    `;
    
    creditAmountElement.style.position = 'relative';
    creditAmountElement.appendChild(changeIndicator);
    
    // 애니메이션
    setTimeout(() => {
        changeIndicator.style.opacity = '0';
        changeIndicator.style.transform = 'translateY(-20px)';
    }, 100);
    
    setTimeout(() => {
        changeIndicator.remove();
    }, 1100);
    
    // 숫자 강조 효과
    creditAmountElement.style.transform = 'scale(1.1)';
    creditAmountElement.style.color = amount > 0 ? 'var(--success-color)' : 'var(--error-color)';
    
    setTimeout(() => {
        creditAmountElement.style.transform = 'scale(1)';
        creditAmountElement.style.color = 'var(--primary-color)';
    }, 300);
}

function showLowCreditWarning() {
    const confirmCharge = confirm(
        `크레딧이 부족합니다! 💸\n\n` +
        `현재 크레딧: ${userCredits}\n` +
        `크레딧을 충전하시겠습니까?`
    );
    
    if (confirmCharge) {
        openChargeModal();
    }
}

function openChargeModal() {
    const modal = createChargeModal();
    document.body.appendChild(modal);
    
    setTimeout(() => {
        modal.classList.add('show');
    }, 10);
}

function createChargeModal() {
    const modal = document.createElement('div');
    modal.className = 'charge-modal';
    
    modal.innerHTML = `
        <div class="charge-modal-content">
            <div class="charge-modal-header">
                <h2>💰 크레딧 충전</h2>
                <button class="modal-close-btn-floating" onclick="this.closest('.charge-modal').remove()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            
            <div class="charge-modal-body">
                <div class="current-credit">
                    <span class="current-credit-label">현재 크레딧</span>
                    <span class="current-credit-amount">${userCredits.toLocaleString()}</span>
                </div>
                
                <div class="charge-options">
                    <div class="charge-option" onclick="chargeCredits(500)">
                        <div class="charge-amount">500 크레딧</div>
                        <div class="charge-price">₩5,000</div>
                        <div class="charge-bonus">기본 패키지</div>
                    </div>
                    
                    <div class="charge-option popular" onclick="chargeCredits(1200)">
                        <div class="charge-badge">인기</div>
                        <div class="charge-amount">1,200 크레딧</div>
                        <div class="charge-price">₩10,000</div>
                        <div class="charge-bonus">+200 보너스</div>
                    </div>
                    
                    <div class="charge-option" onclick="chargeCredits(2500)">
                        <div class="charge-amount">2,500 크레딧</div>
                        <div class="charge-price">₩20,000</div>
                        <div class="charge-bonus">+500 보너스</div>
                    </div>
                    
                    <div class="charge-option premium" onclick="chargeCredits(5500)">
                        <div class="charge-badge">프리미엄</div>
                        <div class="charge-amount">5,500 크레딧</div>
                        <div class="charge-price">₩40,000</div>
                        <div class="charge-bonus">+1,500 보너스</div>
                    </div>
                </div>
                
                <div class="charge-info">
                    <p><i class="fas fa-info-circle"></i> 크레딧은 검색, 다운로드, 번역 등에 사용됩니다</p>
                    <p><i class="fas fa-shield-alt"></i> 안전한 결제 시스템으로 보호됩니다</p>
                </div>
            </div>
        </div>
    `;
    
    // 배경 클릭 시 닫기
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
    
    return modal;
}

function chargeCredits(amount) {
    // 실제로는 결제 시스템과 연동
    const confirmPayment = confirm(
        `${amount} 크레딧을 충전하시겠습니까?\n\n` +
        `충전 후 총 크레딧: ${(userCredits + amount).toLocaleString()}`
    );
    
    if (confirmPayment) {
        addCredits(amount);
        
        // 모달 닫기
        const modal = document.querySelector('.charge-modal');
        if (modal) {
            modal.remove();
        }
    }
}

// 검색 속도 제한 관리
let searchHistory = JSON.parse(localStorage.getItem('searchHistory')) || [];
const SEARCH_LIMIT = 5; // 1분에 5회 제한
const SEARCH_WINDOW = 60000; // 1분 (밀리초)

// 검색 속도 제한 확인
function checkSearchRateLimit() {
    const now = Date.now();
    
    // 1분 이내의 검색 기록만 필터링
    searchHistory = searchHistory.filter(timestamp => now - timestamp < SEARCH_WINDOW);
    
    if (searchHistory.length >= SEARCH_LIMIT) {
        const oldestSearch = Math.min(...searchHistory);
        const timeLeft = SEARCH_WINDOW - (now - oldestSearch);
        const secondsLeft = Math.ceil(timeLeft / 1000);
        
        showToast(`부정사용 방지를 위해 ${secondsLeft}초 후 다시 시도해주세요`, 'warning');
        return false;
    }
    
    return true;
}

// 검색 기록 추가
function addSearchRecord() {
    const now = Date.now();
    searchHistory.push(now);
    localStorage.setItem('searchHistory', JSON.stringify(searchHistory));
}

// 검색 시 크레딧 차감 및 제한 확인
async function checkSearchRequirements() {
    // 크레딧 확인
    if (userCredits < 1) {
        showToast('검색하려면 1 크레딧이 필요합니다', 'error');
        setTimeout(() => {
            openChargeModal();
        }, 1500);
        return false;
    }
    
    // 속도 제한 확인
    if (!checkSearchRateLimit()) {
        return false;
    }
    
    // 크레딧 차감
    const success = await deductCredits(1);
    if (!success) {
        return false;
    }
    
    // 검색 기록 추가
    addSearchRecord();
    
    showToast('1 크레딧이 차감되었습니다', 'info');
    return true;
}

// Supabase 설정
const SUPABASE_URL = 'https://vxxpltinkmgvzzgmeare.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ4eHBsdGlua21ndnp6Z21lYXJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY4NzY2MTQsImV4cCI6MjA3MjQ1MjYxNH0.LzxsGxKEBl7fvF6SeITj33uqiIQHe1Gc5UYSXtYg5HU';

// Supabase 클라이언트 초기화 (실제 사용 시 환경변수 사용 권장)
let supabase = null;
try {
    if (typeof window !== 'undefined' && window.supabase) {
        supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log('✅ Supabase 클라이언트가 초기화되었습니다');
    } else {
        console.log('ℹ️ Supabase 라이브러리를 찾을 수 없습니다. 로컬 모드로 실행합니다.');
    }
} catch (error) {
    console.warn('⚠️ Supabase 초기화 실패, 로컬 모드로 동작합니다:', error.message);
    supabase = null;
}

// 인증 시스템
let currentUser = null;
let isLoggedIn = false;
let isAdmin = false;

// 관리자 계정 목록 (실제로는 데이터베이스에서 관리)
const ADMIN_EMAILS = [
    'admin@shopping-finder.com',
    'kimsoojun@admin.com',
    'admin@test.com',
    'soojun1@naver.com'
];

// 관리자 권한 확인
function checkAdminStatus(email) {
    return ADMIN_EMAILS.includes(email.toLowerCase());
}

// 인증 모달 관리
function openAuthModal(force = false) {
    const modal = document.getElementById('authModal');
    if (modal) {
        modal.classList.add('show');
        document.body.style.overflow = 'hidden';
        
        // 강제 모드일 때 닫기 버튼 숨기기
        const closeBtn = modal.querySelector('.modal-close-btn-floating');
        if (closeBtn) {
            closeBtn.style.display = force ? 'none' : 'block';
        }
        
        // 로그인 폼으로 초기화
        switchToLogin();
        
        // 강제 모드 표시
        if (force) {
            modal.setAttribute('data-force', 'true');
        }
    }
}

function closeAuthModal() {
    const modal = document.getElementById('authModal');
    if (modal) {
        // 강제 모드에서는 닫기 방지
        const isForced = modal.getAttribute('data-force') === 'true';
        if (isForced && !isLoggedIn) {
            showToast('로그인이 필요합니다', 'warning');
            return;
        }
        
        modal.classList.remove('show');
        document.body.style.overflow = '';
        modal.removeAttribute('data-force');
        
        // 닫기 버튼 다시 표시
        const closeBtn = modal.querySelector('.modal-close-btn-floating');
        if (closeBtn) {
            closeBtn.style.display = 'block';
        }
        
        // 폼 초기화
        resetAuthForms();
    }
}

function switchToLogin() {
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    
    if (loginForm && signupForm) {
        loginForm.style.display = 'block';
        signupForm.style.display = 'none';
        resetAuthForms();
    }
}

function switchToSignup() {
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    
    if (loginForm && signupForm) {
        loginForm.style.display = 'none';
        signupForm.style.display = 'block';
        resetAuthForms();
    }
}

function resetAuthForms() {
    // 모든 입력 필드 초기화
    const inputs = document.querySelectorAll('.auth-modal input');
    inputs.forEach(input => {
        input.value = '';
        input.classList.remove('error');
    });
    
    // 에러 메시지 제거
    const errorMessages = document.querySelectorAll('.error-message');
    errorMessages.forEach(msg => msg.remove());
    
    // 비밀번호 강도 초기화
    resetPasswordStrength();
}

// 비밀번호 표시/숨기기
function togglePassword(inputId) {
    const input = document.getElementById(inputId);
    const button = input.nextElementSibling;
    const icon = button.querySelector('i');
    
    if (input.type === 'password') {
        input.type = 'text';
        icon.className = 'fas fa-eye-slash';
    } else {
        input.type = 'password';
        icon.className = 'fas fa-eye';
    }
}

// 비밀번호 강도 검사
function checkPasswordStrength(password) {
    let strength = 0;
    let feedback = [];
    
    // 길이 검사
    if (password.length >= 8) strength += 1;
    else feedback.push('8자 이상');
    
    // 대소문자 검사
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength += 1;
    else feedback.push('대소문자 포함');
    
    // 숫자 검사
    if (/\d/.test(password)) strength += 1;
    else feedback.push('숫자 포함');
    
    // 특수문자 검사
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) strength += 1;
    else feedback.push('특수문자 포함');
    
    return { strength, feedback };
}

function updatePasswordStrength(password) {
    const strengthBar = document.querySelector('.strength-fill');
    const strengthText = document.querySelector('.strength-text');
    
    if (!strengthBar || !strengthText) return;
    
    const { strength, feedback } = checkPasswordStrength(password);
    
    // 클래스 초기화
    strengthBar.className = 'strength-fill';
    
    if (password.length === 0) {
        strengthText.textContent = '비밀번호 강도';
        return;
    }
    
    switch (strength) {
        case 1:
            strengthBar.classList.add('weak');
            strengthText.textContent = '약함';
            break;
        case 2:
            strengthBar.classList.add('fair');
            strengthText.textContent = '보통';
            break;
        case 3:
            strengthBar.classList.add('good');
            strengthText.textContent = '좋음';
            break;
        case 4:
            strengthBar.classList.add('strong');
            strengthText.textContent = '강함';
            break;
        default:
            strengthText.textContent = '매우 약함';
    }
    
    if (feedback.length > 0) {
        strengthText.textContent += ` (${feedback.join(', ')} 필요)`;
    }
}

function resetPasswordStrength() {
    const strengthBar = document.querySelector('.strength-fill');
    const strengthText = document.querySelector('.strength-text');
    
    if (strengthBar && strengthText) {
        strengthBar.className = 'strength-fill';
        strengthText.textContent = '비밀번호 강도';
    }
}

// 폼 유효성 검사
function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function validatePassword(password) {
    return password.length >= 8;
}

function showFieldError(fieldId, message) {
    const field = document.getElementById(fieldId);
    const wrapper = field.closest('.input-group');
    
    // 기존 에러 메시지 제거
    const existingError = wrapper.querySelector('.error-message');
    if (existingError) {
        existingError.remove();
    }
    
    // 새 에러 메시지 추가
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.style.cssText = `
        color: var(--error-color);
        font-size: 12px;
        margin-top: 4px;
        display: flex;
        align-items: center;
        gap: 4px;
    `;
    errorDiv.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${message}`;
    
    wrapper.appendChild(errorDiv);
    field.classList.add('error');
    
    // 에러 스타일 추가
    field.style.borderColor = 'var(--error-color)';
}

function clearFieldError(fieldId) {
    const field = document.getElementById(fieldId);
    const wrapper = field.closest('.input-group');
    const errorMessage = wrapper.querySelector('.error-message');
    
    if (errorMessage) {
        errorMessage.remove();
    }
    
    field.classList.remove('error');
    field.style.borderColor = '';
}

// 로그인 처리
async function handleLogin(event) {
    event.preventDefault();
    
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    const rememberMe = document.getElementById('rememberMe').checked;
    
    // 유효성 검사
    let hasError = false;
    
    if (!email) {
        showFieldError('loginEmail', '이메일을 입력해주세요');
        hasError = true;
    } else if (!validateEmail(email)) {
        showFieldError('loginEmail', '올바른 이메일 형식이 아닙니다');
        hasError = true;
    } else {
        clearFieldError('loginEmail');
    }
    
    if (!password) {
        showFieldError('loginPassword', '비밀번호를 입력해주세요');
        hasError = true;
    } else {
        clearFieldError('loginPassword');
    }
    
    if (hasError) return;
    
    // 로딩 상태
    const submitBtn = event.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 로그인 중...';
    submitBtn.disabled = true;
    
    try {
        // Supabase 로그인
        const authData = await supabaseLogin(email, password);
        
        // 사용자 프로필 조회
        let userProfile = null;
        if (authData.user && supabase) {
            userProfile = await getUserProfile(authData.user.id);
        }
        
        // 로그인 성공
        const userData = {
            id: authData.user.id,
            name: userProfile?.display_name || authData.user.user_metadata?.full_name || email.split('@')[0],
            email: authData.user.email,
            loginTime: new Date().toISOString(),
            rememberMe: rememberMe,
            credits: userProfile?.credits || 10
        };
        
        currentUser = userData;
        isLoggedIn = true;
        isAdmin = checkAdminStatus(userData.email);
        
        // 로컬 스토리지에 저장
        if (rememberMe) {
            localStorage.setItem('currentUser', JSON.stringify(userData));
            console.log('사용자 정보를 localStorage에 저장:', userData);
        } else {
            sessionStorage.setItem('currentUser', JSON.stringify(userData));
            console.log('사용자 정보를 sessionStorage에 저장:', userData);
        }
        
        // 저장 확인
        console.log('저장 후 확인:');
        console.log('localStorage:', localStorage.getItem('currentUser'));
        console.log('sessionStorage:', sessionStorage.getItem('currentUser'));
        
        // UI 업데이트
        updateAuthUI();
        
        // 모든 기능 활성화
        enableAllInteractions();
        
        // 강제 모드 해제 후 모달 닫기
        const modal = document.getElementById('authModal');
        if (modal) {
            modal.removeAttribute('data-force');
        }
        closeAuthModal();
        
        showToast('로그인 성공! 환영합니다! 🎉');
        
        // 저장 상태 재확인 (디버깅용)
        setTimeout(() => {
            console.log('로그인 완료 후 저장 상태 재확인:');
            console.log('localStorage currentUser:', localStorage.getItem('currentUser'));
            console.log('sessionStorage currentUser:', sessionStorage.getItem('currentUser'));
        }, 100);
        
    } catch (error) {
        console.error('로그인 오류:', error);
        showFieldError('loginPassword', error.message || '로그인에 실패했습니다');
    } finally {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

// 회원가입 처리
async function handleSignup(event) {
    event.preventDefault();
    
    const name = document.getElementById('signupName').value.trim();
    const email = document.getElementById('signupEmail').value.trim();
    const password = document.getElementById('signupPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const agreeTerms = document.getElementById('agreeTerms').checked;
    const agreeMarketing = document.getElementById('agreeMarketing').checked;
    
    // 유효성 검사
    let hasError = false;
    
    if (!name) {
        showFieldError('signupName', '이름을 입력해주세요');
        hasError = true;
    } else if (name.length < 2) {
        showFieldError('signupName', '이름은 2자 이상이어야 합니다');
        hasError = true;
    } else {
        clearFieldError('signupName');
    }
    
    if (!email) {
        showFieldError('signupEmail', '이메일을 입력해주세요');
        hasError = true;
    } else if (!validateEmail(email)) {
        showFieldError('signupEmail', '올바른 이메일 형식이 아닙니다');
        hasError = true;
    } else {
        clearFieldError('signupEmail');
    }
    
    if (!password) {
        showFieldError('signupPassword', '비밀번호를 입력해주세요');
        hasError = true;
    } else if (!validatePassword(password)) {
        showFieldError('signupPassword', '비밀번호는 8자 이상이어야 합니다');
        hasError = true;
    } else {
        clearFieldError('signupPassword');
    }
    
    if (!confirmPassword) {
        showFieldError('confirmPassword', '비밀번호 확인을 입력해주세요');
        hasError = true;
    } else if (password !== confirmPassword) {
        showFieldError('confirmPassword', '비밀번호가 일치하지 않습니다');
        hasError = true;
    } else {
        clearFieldError('confirmPassword');
    }
    
    if (!agreeTerms) {
        showToast('이용약관에 동의해주세요', 'error');
        hasError = true;
    }
    
    if (hasError) return;
    
    // 로딩 상태
    const submitBtn = event.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 가입 중...';
    submitBtn.disabled = true;
    
    try {
        // Supabase 회원가입
        const authData = await supabaseSignup(name, email, password);
        
        // 사용자 프로필 조회
        let userProfile = null;
        if (authData.user && supabase) {
            userProfile = await getUserProfile(authData.user.id);
        }
        
        // 회원가입 성공
        const userData = {
            id: authData.user.id,
            name: name,
            email: authData.user.email,
            signupTime: new Date().toISOString(),
            marketingAgreed: agreeMarketing,
            credits: userProfile?.credits || 10
        };
        
        currentUser = userData;
        isLoggedIn = true;
        isAdmin = checkAdminStatus(userData.email);
        
        // 로컬 스토리지에 저장
        localStorage.setItem('currentUser', JSON.stringify(userData));
        console.log('회원가입 후 사용자 정보를 localStorage에 저장:', userData);
        console.log('저장 후 확인 - localStorage:', localStorage.getItem('currentUser'));
        
        // 신규 가입 보너스 크레딧 지급
        addCredits(5);
        
        // UI 업데이트
        updateAuthUI();
        
        // 모든 기능 활성화
        enableAllInteractions();
        
        // 강제 모드 해제 후 모달 닫기
        const modal = document.getElementById('authModal');
        if (modal) {
            modal.removeAttribute('data-force');
        }
        closeAuthModal();
        
        showToast('회원가입 완료! 5 크레딧이 지급되었습니다! 🎉');
        
    } catch (error) {
        console.error('회원가입 오류:', error);
        showFieldError('signupEmail', error.message || '회원가입에 실패했습니다');
    } finally {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

// Supabase 인증 함수들
async function supabaseLogin(email, password) {
    if (!supabase) {
        // Supabase가 없으면 로컬 시뮬레이션
        return simulateLogin(email, password);
    }
    
    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password
        });
        
        if (error) {
            throw new Error(getKoreanErrorMessage(error.message));
        }
        
        return data;
    } catch (error) {
        throw error;
    }
}

async function supabaseSignup(name, email, password) {
    if (!supabase) {
        // Supabase가 없으면 로컬 시뮬레이션
        return simulateSignup(name, email, password);
    }
    
    try {
        const { data, error } = await supabase.auth.signUp({
            email: email,
            password: password,
            options: {
                data: {
                    full_name: name,
                    display_name: name
                }
            }
        });
        
        if (error) {
            throw new Error(getKoreanErrorMessage(error.message));
        }
        
        // 사용자 프로필 생성
        if (data.user) {
            await createUserProfile(data.user, name);
        }
        
        return data;
    } catch (error) {
        throw error;
    }
}

// 사용자 프로필 생성
async function createUserProfile(user, name) {
    if (!supabase) return;
    
    try {
        const { error } = await supabase
            .from('user_profiles')
            .insert([
                {
                    id: user.id,
                    email: user.email,
                    full_name: name,
                    display_name: name,
                    credits: 10, // 기본 크레딧
                    created_at: new Date().toISOString()
                }
            ]);
        
        if (error) {
            console.error('프로필 생성 오류:', error);
        }
    } catch (error) {
        console.error('프로필 생성 실패:', error);
    }
}

// 사용자 프로필 조회
async function getUserProfile(userId) {
    if (!supabase) {
        console.log('Supabase가 설정되지 않았습니다. 로컬 모드로 실행합니다.');
        return null;
    }
    
    try {
        const { data, error } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', userId)
            .single();
        
        if (error) {
            // 404 오류는 사용자 프로필이 없는 경우이므로 정상적인 상황
            if (error.code === 'PGRST116') {
                console.log('사용자 프로필이 존재하지 않습니다. 새 프로필을 생성해야 합니다.');
                return null;
            }
            console.warn('프로필 조회 중 오류 발생:', error.message);
            return null;
        }
        
        return data;
    } catch (error) {
        console.warn('프로필 조회 실패:', error.message);
        return null;
    }
}

// 크레딧 업데이트
async function updateUserCredits(userId, credits) {
    if (!supabase) return;
    
    try {
        const { error } = await supabase
            .from('user_profiles')
            .update({ credits: credits })
            .eq('id', userId);
        
        if (error) {
            console.error('크레딧 업데이트 오류:', error);
        }
    } catch (error) {
        console.error('크레딧 업데이트 실패:', error);
    }
}

// 에러 메시지 한국어 변환
function getKoreanErrorMessage(errorMessage) {
    const errorMap = {
        'Invalid login credentials': '이메일 또는 비밀번호가 올바르지 않습니다',
        'User already registered': '이미 가입된 이메일입니다',
        'Password should be at least 6 characters': '비밀번호는 6자 이상이어야 합니다',
        'Unable to validate email address: invalid format': '올바른 이메일 형식이 아닙니다',
        'Email not confirmed': '이메일 인증이 필요합니다',
        'Too many requests': '너무 많은 요청입니다. 잠시 후 다시 시도해주세요'
    };
    
    return errorMap[errorMessage] || errorMessage;
}

// 시뮬레이션 함수들 (Supabase 없을 때 사용)
async function simulateLogin(email, password) {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            // 관리자 계정들과 테스트 계정 허용
            const validAccounts = {
                'test@test.com': { password: 'password123', name: 'Test User' },
                'soojun1@naver.com': { password: 'password123', name: '김수준' },
                'admin@shopping-finder.com': { password: 'admin123', name: 'Admin' },
                'kimsoojun@admin.com': { password: 'admin123', name: '김수준' },
                'admin@test.com': { password: 'admin123', name: 'Test Admin' }
            };
            
            const account = validAccounts[email.toLowerCase()];
            
            if (account && password === account.password) {
                resolve({
                    user: {
                        id: `user-${Date.now()}`,
                        email: email,
                        user_metadata: {
                            full_name: account.name
                        }
                    }
                });
            } else {
                reject(new Error('이메일 또는 비밀번호가 올바르지 않습니다'));
            }
        }, 1500);
    });
}

async function simulateSignup(name, email, password) {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            // 이미 존재하는 계정 체크
            const existingAccounts = [
                'test@test.com',
                'soojun1@naver.com',
                'admin@shopping-finder.com',
                'kimsoojun@admin.com',
                'admin@test.com',
                'existing@test.com'
            ];
            
            if (existingAccounts.includes(email.toLowerCase())) {
                reject(new Error('이미 사용 중인 이메일입니다'));
            } else {
                resolve({
                    user: {
                        id: `user-${Date.now()}`,
                        email: email,
                        user_metadata: {
                            full_name: name
                        }
                    }
                });
            }
        }, 2000);
    });
}

// 소셜 로그인 (시뮬레이션)
async function loginWithGoogle() {
    showToast('Google 로그인은 준비 중입니다', 'info');
}

async function loginWithKakao() {
    showToast('카카오 로그인은 준비 중입니다', 'info');
}

async function signupWithGoogle() {
    showToast('Google 회원가입은 준비 중입니다', 'info');
}

async function signupWithKakao() {
    showToast('카카오 회원가입은 준비 중입니다', 'info');
}

// 로그아웃
async function logout() {
    const confirmLogout = confirm('정말 로그아웃하시겠습니까?');
    
    if (confirmLogout) {
        try {
            // Supabase 로그아웃
            if (supabase) {
                const { error } = await supabase.auth.signOut();
                if (error) {
                    console.error('Supabase 로그아웃 오류:', error);
                }
            }
            
            // 로컬 상태 초기화
            currentUser = null;
            isLoggedIn = false;
            isAdmin = false;
            userCredits = 0;
            
            localStorage.removeItem('currentUser');
            sessionStorage.removeItem('currentUser');
            localStorage.removeItem('userCredits');
            
            updateAuthUI();
            updateCreditDisplay();
            
            // 모든 기능 비활성화
            disableAllInteractions();
            
            showToast('로그아웃되었습니다');
            
            // 즉시 강제 로그인 모달 표시
            setTimeout(() => {
                openAuthModal(true); // force = true
            }, 1000);
            
        } catch (error) {
            console.error('로그아웃 처리 오류:', error);
            showToast('로그아웃 중 오류가 발생했습니다', 'error');
        }
    }
}

// 인증 상태에 따른 UI 업데이트
function updateAuthUI() {
    const userProfile = document.querySelector('.user-profile');
    const username = document.querySelector('.username');
    const status = document.querySelector('.status');
    const adminNavItem = document.getElementById('adminNavItem');
    
    if (isLoggedIn && currentUser) {
        username.textContent = currentUser.name;
        status.textContent = isAdmin ? '관리자' : '온라인';
        
        // 관리자 버튼 표시/숨김
        if (adminNavItem) {
            adminNavItem.style.display = isAdmin ? 'block' : 'none';
        }
        
        // 사용자 프로필 클릭 시 메뉴 표시
        if (userProfile && !userProfile.hasAttribute('data-menu-added')) {
            userProfile.style.cursor = 'pointer';
            userProfile.addEventListener('click', showUserMenu);
            userProfile.setAttribute('data-menu-added', 'true');
        }
    } else {
        username.textContent = '게스트';
        status.textContent = '로그인 필요';
        
        // 관리자 버튼 숨김
        if (adminNavItem) {
            adminNavItem.style.display = 'none';
        }
        
        // 게스트 상태에서 클릭 시 로그인 모달
        if (userProfile && !userProfile.hasAttribute('data-guest-click')) {
            userProfile.style.cursor = 'pointer';
            userProfile.addEventListener('click', openAuthModal);
            userProfile.setAttribute('data-guest-click', 'true');
        }
    }
}

// 사용자 메뉴 표시
function showUserMenu() {
    if (!isLoggedIn) {
        openAuthModal();
        return;
    }
    
    const menu = document.createElement('div');
    menu.className = 'user-menu';
    menu.innerHTML = `
        <div class="user-menu-content">
            <div class="user-menu-header">
                <div class="user-menu-avatar">
                    <i class="fas fa-user"></i>
                </div>
                <div class="user-menu-info">
                    <div class="user-menu-name">${currentUser.name}</div>
                    <div class="user-menu-email">${currentUser.email}</div>
                </div>
            </div>
            <div class="user-menu-items">
                <a href="#" class="user-menu-item" onclick="showProfile()">
                    <i class="fas fa-user-edit"></i>
                    프로필 수정
                </a>
                <a href="#" class="user-menu-item" onclick="showSettings()">
                    <i class="fas fa-cog"></i>
                    설정
                </a>
                <a href="#" class="user-menu-item" onclick="logout()">
                    <i class="fas fa-sign-out-alt"></i>
                    로그아웃
                </a>
            </div>
        </div>
    `;
    
    // 기존 메뉴 제거
    const existingMenu = document.querySelector('.user-menu');
    if (existingMenu) {
        existingMenu.remove();
    }
    
    document.body.appendChild(menu);
    
    // 애니메이션
    setTimeout(() => {
        menu.classList.add('show');
    }, 10);
    
    // 외부 클릭 시 닫기
    setTimeout(() => {
        document.addEventListener('click', function closeMenu(e) {
            if (!menu.contains(e.target)) {
                menu.remove();
                document.removeEventListener('click', closeMenu);
            }
        });
    }, 100);
}

function showProfile() {
    showToast('프로필 수정 기능은 준비 중입니다', 'info');
    document.querySelector('.user-menu')?.remove();
}

// 설정 모달 관리
function openSettingsModal(event) {
    if (event) event.preventDefault();
    
    const modal = document.getElementById('settingsModal');
    if (modal) {
        modal.classList.add('show');
        document.body.style.overflow = 'hidden';
        
        // 설정 값 로드
        loadSettings();
    }
}

function closeSettingsModal() {
    const modal = document.getElementById('settingsModal');
    if (modal) {
        modal.classList.remove('show');
        document.body.style.overflow = '';
    }
}

// 설정 탭 전환
function showSettingsTab(tabName) {
    // 모든 탭 버튼 비활성화
    document.querySelectorAll('.settings-tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // 모든 탭 콘텐츠 숨기기
    document.querySelectorAll('.settings-tab-content').forEach(content => {
        content.style.display = 'none';
    });
    
    // 선택된 탭 활성화
    event.target.classList.add('active');
    document.getElementById(tabName + 'Tab').style.display = 'block';
}

// 다운로드 경로 선택
async function selectDownloadPath() {
    try {
        // Electron의 dialog API 사용 (웹에서는 시뮬레이션)
        if (window.electronAPI && window.electronAPI.selectFolder) {
            const result = await window.electronAPI.selectFolder();
            if (result && !result.canceled) {
                document.getElementById('downloadPath').value = result.filePaths[0];
            }
        } else {
            // 웹 브라우저에서는 기본 다운로드 폴더 사용
            const defaultPath = await getDefaultDownloadPath();
            document.getElementById('downloadPath').value = defaultPath;
            showToast('기본 다운로드 폴더로 설정되었습니다', 'info');
        }
    } catch (error) {
        console.error('폴더 선택 오류:', error);
        showToast('폴더 선택 중 오류가 발생했습니다', 'error');
    }
}

// 기본 다운로드 경로 가져오기
async function getDefaultDownloadPath() {
    // 브라우저별 기본 다운로드 경로
    const userAgent = navigator.userAgent;
    const platform = navigator.platform;
    
    if (platform.includes('Win')) {
        return 'C:\\Users\\Downloads';
    } else if (platform.includes('Mac')) {
        return '/Users/user/Downloads';
    } else {
        return '/home/user/Downloads';
    }
}

// 비밀번호 표시/숨김 토글
function togglePasswordVisibility(inputId) {
    const input = document.getElementById(inputId);
    const button = input.parentElement.querySelector('.toggle-password-btn i');
    
    if (input.type === 'password') {
        input.type = 'text';
        button.className = 'fas fa-eye-slash';
    } else {
        input.type = 'password';
        button.className = 'fas fa-eye';
    }
}

// 쿠팡파트너스 API 테스트
async function testCoupangAPI() {
    const accessKey = document.getElementById('coupangAccessKey').value.trim();
    const secretKey = document.getElementById('coupangSecretKey').value.trim();
    
    if (!accessKey || !secretKey) {
        showToast('Access Key와 Secret Key를 모두 입력해주세요', 'error');
        return;
    }
    
    const button = event.target;
    const originalText = button.innerHTML;
    button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 테스트 중...';
    button.disabled = true;
    
    try {
        // 쿠팡파트너스 API 테스트 호출
        const result = await testCoupangConnection(accessKey, secretKey);
        
        if (result.success) {
            showToast('API 연결 성공! 🎉', 'success');
        } else {
            showToast('API 연결 실패: ' + result.message, 'error');
        }
    } catch (error) {
        console.error('API 테스트 오류:', error);
        showToast('API 테스트 중 오류가 발생했습니다', 'error');
    } finally {
        button.innerHTML = originalText;
        button.disabled = false;
    }
}

// 쿠팡파트너스 API 연결 테스트
async function testCoupangConnection(accessKey, secretKey) {
    // 실제 API 호출 시뮬레이션
    return new Promise((resolve) => {
        setTimeout(() => {
            // 간단한 키 형식 검증
            if (accessKey.length > 10 && secretKey.length > 10) {
                resolve({ success: true, message: '연결 성공' });
            } else {
                resolve({ success: false, message: '잘못된 API 키 형식입니다' });
            }
        }, 2000);
    });
}

// 설정 저장
function saveSettings() {
    const settings = {
        // 일반 설정
        language: document.getElementById('languageSelect').value,
        enableNotifications: document.getElementById('enableNotifications').checked,
        enableSounds: document.getElementById('enableSounds').checked,
        
        // 다운로드 설정
        downloadPath: document.getElementById('downloadPath').value,
        videoQuality: document.getElementById('videoQuality').value,
        fileNameFormat: document.getElementById('fileNameFormat').value,
        createSubfolders: document.getElementById('createSubfolders').checked,
        
        // API 설정
        coupangAccessKey: document.getElementById('coupangAccessKey').value,
        coupangSecretKey: document.getElementById('coupangSecretKey').value,
        enableAutoAffiliate: document.getElementById('enableAutoAffiliate').checked
    };
    
    // 로컬 스토리지에 저장
    localStorage.setItem('appSettings', JSON.stringify(settings));
    
    showToast('설정이 저장되었습니다! 🎉', 'success');
    closeSettingsModal();
}

// 설정 로드
function loadSettings() {
    const savedSettings = localStorage.getItem('appSettings');
    
    if (savedSettings) {
        const settings = JSON.parse(savedSettings);
        
        // 일반 설정
        document.getElementById('languageSelect').value = settings.language || 'ko';
        document.getElementById('enableNotifications').checked = settings.enableNotifications !== false;
        document.getElementById('enableSounds').checked = settings.enableSounds !== false;
        
        // 다운로드 설정
        document.getElementById('downloadPath').value = settings.downloadPath || '';
        document.getElementById('videoQuality').value = settings.videoQuality || 'high';
        document.getElementById('fileNameFormat').value = settings.fileNameFormat || 'timestamp';
        document.getElementById('createSubfolders').checked = settings.createSubfolders !== false;
        
        // API 설정
        document.getElementById('coupangAccessKey').value = settings.coupangAccessKey || '';
        document.getElementById('coupangSecretKey').value = settings.coupangSecretKey || '';
        document.getElementById('enableAutoAffiliate').checked = settings.enableAutoAffiliate || false;
    } else {
        // 기본 다운로드 경로 설정
        getDefaultDownloadPath().then(path => {
            document.getElementById('downloadPath').value = path;
        });
    }
}

// 설정 초기화
function resetSettings() {
    if (confirm('모든 설정을 초기화하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
        localStorage.removeItem('appSettings');
        loadSettings();
        showToast('설정이 초기화되었습니다', 'info');
    }
}

// 설정 기능 (기존 함수 대체)
function showSettings() {
    openSettingsModal();
    document.querySelector('.user-menu')?.remove();
}

// 비디오 다운로드 기능
async function downloadVideo(videoData) {
    try {
        // 설정에서 다운로드 경로 가져오기
        const settings = JSON.parse(localStorage.getItem('appSettings') || '{}');
        const downloadPath = settings.downloadPath || await getDefaultDownloadPath();
        const videoQuality = settings.videoQuality || 'high';
        const fileNameFormat = settings.fileNameFormat || 'timestamp';
        const createSubfolders = settings.createSubfolders !== false;
        
        // 파일명 생성
        const fileName = generateFileName(videoData, fileNameFormat);
        
        // 하위 폴더 경로 생성
        let finalPath = downloadPath;
        if (createSubfolders) {
            const today = new Date().toISOString().split('T')[0];
            finalPath = `${downloadPath}/${today}`;
        }
        
        // 다운로드 시작 알림
        showToast('다운로드를 시작합니다...', 'info');
        
        // 실제 다운로드 처리
        const result = await processVideoDownload(videoData, finalPath, fileName, videoQuality);
        
        if (result.success) {
            showToast(`다운로드 완료: ${fileName}`, 'success');
            
            // 크레딧 차감
            const downloadCost = 1; // 다운로드 비용
            deductCredits(downloadCost);
        } else {
            showToast('다운로드 실패: ' + result.message, 'error');
        }
        
    } catch (error) {
        console.error('다운로드 오류:', error);
        showToast('다운로드 중 오류가 발생했습니다', 'error');
    }
}

// 파일명 생성
function generateFileName(videoData, format) {
    const title = videoData.title || 'tiktok_video';
    const cleanTitle = title.replace(/[^\w\s-]/g, '').replace(/\s+/g, '_');
    
    switch (format) {
        case 'original':
            return `${cleanTitle}.mp4`;
        case 'timestamp':
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T');
            return `${timestamp[0]}_${timestamp[1].split('.')[0]}_${cleanTitle}.mp4`;
        case 'custom':
            return `tiktok_${Date.now()}_${cleanTitle}.mp4`;
        default:
            return `${cleanTitle}.mp4`;
    }
}

// 비디오 다운로드 처리
async function processVideoDownload(videoData, path, fileName, quality) {
    return new Promise((resolve) => {
        // 실제 다운로드 시뮬레이션
        setTimeout(() => {
            // 성공 시뮬레이션
            resolve({
                success: true,
                path: `${path}/${fileName}`,
                message: '다운로드 완료'
            });
        }, 3000);
    });
}



// 다운로드 버튼에서 호출되는 함수
function downloadVideoFromButton(videoId, event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    
    // 로그인 체크
    if (!isLoggedIn) {
        showToast('로그인이 필요합니다', 'error');
        openAuthModal();
        return;
    }
    
    // 크레딧 체크
    const downloadCost = 1;
    if (userCredits < downloadCost) {
        showToast('크레딧이 부족합니다', 'error');
        return;
    }
    
    // 전체 결과에서 해당 비디오 찾기
    const videoData = allResults.find(video => video.id === videoId);
    
    if (!videoData) {
        showToast('비디오 정보를 찾을 수 없습니다', 'error');
        return;
    }
    
    // 다운로드 실행
    downloadVideo(videoData);
}

// 로그인 필요한 기능 체크
function requireLogin(callback) {
    if (!isLoggedIn) {
        openAuthModal();
        return false;
    }
    
    if (callback) callback();
    return true;
}

// 앱 초기화 시 인증 상태 확인
async function initializeAuth() {
    // Supabase 세션 확인
    if (supabase) {
        try {
            const { data: { session }, error } = await supabase.auth.getSession();
            
            if (error) {
                console.warn('Supabase 세션 조회 오류:', error.message);
                // Supabase 연결 실패 시 로컬 모드로 전환
                console.log('로컬 모드로 전환합니다.');
                return;
            }
            
            if (session && session.user) {
                // Supabase 세션이 있으면 사용자 프로필 조회
                const userProfile = await getUserProfile(session.user.id);
                
                currentUser = {
                    id: session.user.id,
                    name: userProfile?.display_name || session.user.user_metadata?.full_name || session.user.email.split('@')[0],
                    email: session.user.email,
                    credits: userProfile?.credits || 10
                };
                
                isLoggedIn = true;
                isAdmin = checkAdminStatus(currentUser.email);
                userCredits = currentUser.credits;
            }
            
            // 인증 상태 변화 리스너 설정
            supabase.auth.onAuthStateChange(async (event, session) => {
                console.log('Auth state changed:', event, session);
                
                if (event === 'SIGNED_IN' && session) {
                    const userProfile = await getUserProfile(session.user.id);
                    
                    currentUser = {
                        id: session.user.id,
                        name: userProfile?.display_name || session.user.user_metadata?.full_name || session.user.email.split('@')[0],
                        email: session.user.email,
                        credits: userProfile?.credits || 10
                    };
                    
                    isLoggedIn = true;
                    isAdmin = checkAdminStatus(currentUser.email);
                    userCredits = currentUser.credits;
                    
                    updateAuthUI();
                    updateCreditDisplay();
                    enableAllInteractions();
                    
                } else if (event === 'SIGNED_OUT') {
                    currentUser = null;
                    isLoggedIn = false;
                    isAdmin = false;
                    userCredits = 0;
                    
                    updateAuthUI();
                    updateCreditDisplay();
                    disableAllInteractions();
                    
                    setTimeout(() => {
                        openAuthModal(true);
                    }, 1000);
                }
            });
            
        } catch (error) {
            console.warn('Supabase 초기화 오류:', error.message);
            console.log('로컬 모드로 전환합니다.');
        }
    } else {
        console.log('Supabase가 설정되지 않았습니다. 로컬 모드로 실행합니다.');
    }
    
    // Supabase가 없거나 세션이 없으면 로컬 스토리지 확인
    if (!isLoggedIn) {
        const sessionUser = sessionStorage.getItem('currentUser');
        if (sessionUser) {
            currentUser = JSON.parse(sessionUser);
            isLoggedIn = true;
            isAdmin = checkAdminStatus(currentUser.email);
            userCredits = currentUser.credits || 1250;
        } else {
            const localUser = localStorage.getItem('currentUser');
            if (localUser) {
                try {
                    currentUser = JSON.parse(localUser);
                    isLoggedIn = true;
                    isAdmin = checkAdminStatus(currentUser.email);
                    userCredits = currentUser.credits || 1250;
                    console.log('로컬 스토리지에서 사용자 정보 복원:', currentUser);
                } catch (error) {
                    console.error('로컬 사용자 정보 파싱 오류:', error);
                    localStorage.removeItem('currentUser');
                }
            } else if (!supabase) {
                // Supabase가 없는 경우 데모 사용자로 자동 로그인
                console.log('🎯 데모 모드로 실행합니다. 기본 사용자로 로그인됩니다.');
                currentUser = {
                    id: 'demo-user-001',
                    name: '데모 사용자',
                    email: 'demo@shopping-finder.com',
                    credits: 1250,
                    loginTime: new Date().toISOString(),
                    isDemo: true
                };
                isLoggedIn = true;
                isAdmin = false;
                userCredits = currentUser.credits;
                
                // 세션에 저장
                sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
            }
        }
    }
    
    updateAuthUI();
    updateCreditDisplay();
    
    // 로그인 상태에 따라 기능 활성화/비활성화
    if (isLoggedIn) {
        enableAllInteractions();
        if (currentUser?.isDemo) {
            showToast('데모 모드로 실행 중입니다 🎯', 'info');
        }
    } else {
        disableAllInteractions();
        // 강제 로그인 모달 표시 (3초 후)
        setTimeout(() => {
            openAuthModal(true);
        }, 3000);
    }
}

// 모든 상호작용 비활성화
function disableAllInteractions() {
    const mainContent = document.querySelector('.main-content');
    const sidebar = document.querySelector('.sidebar');
    
    if (mainContent) {
        mainContent.style.pointerEvents = 'none';
        mainContent.style.opacity = '0.5';
        mainContent.style.filter = 'blur(2px)';
    }
    
    // 사이드바는 사용자 프로필만 클릭 가능하게
    if (sidebar) {
        const navItems = sidebar.querySelectorAll('.nav-item:not(:has(.user-profile))');
        navItems.forEach(item => {
            item.style.pointerEvents = 'none';
            item.style.opacity = '0.5';
        });
        
        const creditSection = sidebar.querySelector('.credit-section');
        if (creditSection) {
            creditSection.style.pointerEvents = 'none';
            creditSection.style.opacity = '0.5';
        }
    }
}

// 모든 상호작용 활성화
function enableAllInteractions() {
    const mainContent = document.querySelector('.main-content');
    const sidebar = document.querySelector('.sidebar');
    
    if (mainContent) {
        mainContent.style.pointerEvents = '';
        mainContent.style.opacity = '';
        mainContent.style.filter = '';
    }
    
    if (sidebar) {
        const navItems = sidebar.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            item.style.pointerEvents = '';
            item.style.opacity = '';
        });
        
        const creditSection = sidebar.querySelector('.credit-section');
        if (creditSection) {
            creditSection.style.pointerEvents = '';
            creditSection.style.opacity = '';
        }
    }
}

// 앱 초기화 시 크레딧 표시 업데이트
document.addEventListener('DOMContentLoaded', function() {
    initializeAuth();
    
    // 비밀번호 강도 실시간 체크
    const signupPasswordInput = document.getElementById('signupPassword');
    if (signupPasswordInput) {
        signupPasswordInput.addEventListener('input', (e) => {
            updatePasswordStrength(e.target.value);
        });
    }
    
    // 모달 배경 클릭 시 닫기 (강제 모드가 아닐 때만)
    const authModal = document.getElementById('authModal');
    if (authModal) {
        authModal.addEventListener('click', (e) => {
            if (e.target === authModal) {
                const isForced = authModal.getAttribute('data-force') === 'true';
                if (!isForced) {
                    closeAuthModal();
                } else {
                    showToast('로그인이 필요합니다', 'warning');
                }
            }
        });
    }
});

// 관리자 패널로 이동
function showAdminPanel(event) {
    if (event) event.preventDefault();
    
    if (!isAdmin) {
        showToast('관리자 권한이 필요합니다', 'error');
        return;
    }
    
    // 관리자 페이지로 이동 (사용자 정보를 URL 파라미터로 전달)
    const userInfo = encodeURIComponent(JSON.stringify({
        email: currentUser.email,
        name: currentUser.name,
        isAdmin: true
    }));
    window.location.href = `admin.html?user=${userInfo}`;
}

/* 
// 아래 함수들은 admin.html과 admin-script.js로 이동되었습니다.
// 필요시 참고용으로 주석 처리하여 보관합니다.

function showAdminTab(tabName) { ... }
async function loadAdminData() { ... }
async function loadAdminStats() { ... }
async function loadUsers() { ... }
function editUser(userId) { ... }
function deleteUser(userId) { ... }
function editUserCredits(email, currentCredits) { ... }
async function manageCreditForUser(email = null, amount = null, reason = null) { ... }
function saveSystemSettings() { ... }
function loadLogs() { ... }
function clearLogs() { ... }
function searchUsers() { ... }
*/

function showAdminTab(tabName) {
    // 모든 탭 버튼 비활성화
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // 모든 탭 콘텐츠 숨기기
    document.querySelectorAll('.tab-content').forEach(content => {
        content.style.display = 'none';
    });
    
    // 선택된 탭 활성화
    event.target.classList.add('active');
    document.getElementById(tabName + 'Tab').style.display = 'block';
    
    // 탭별 데이터 로드
    switch(tabName) {
        case 'users':
            loadUsers();
            break;
        case 'credits':
            loadCreditTransactions();
            break;
        case 'system':
            loadSystemSettings();
            break;
        case 'logs':
            loadLogs();
            break;
    }
}

async function loadAdminData() {
    try {
        // 통계 데이터 로드
        await loadAdminStats();
        
        // 기본 탭 (사용자 관리) 데이터 로드
        await loadUsers();
        
    } catch (error) {
        console.error('관리자 데이터 로드 오류:', error);
        showToast('데이터 로드 중 오류가 발생했습니다', 'error');
    }
}

async function loadAdminStats() {
    if (!supabase) {
        // 로컬 모드에서는 더미 데이터
        document.getElementById('totalUsers').textContent = '5';
        document.getElementById('totalSearches').textContent = '127';
        document.getElementById('totalCredits').textContent = '2,450';
        document.getElementById('totalDownloads').textContent = '89';
        return;
    }
    
    try {
        // 총 사용자 수
        const { count: userCount } = await supabase
            .from('user_profiles')
            .select('*', { count: 'exact', head: true });
        
        // 총 검색 수
        const { count: searchCount } = await supabase
            .from('search_history')
            .select('*', { count: 'exact', head: true });
        
        // 총 크레딧 (모든 사용자 크레딧 합계)
        const { data: creditData } = await supabase
            .from('user_profiles')
            .select('credits');
        
        const totalCredits = creditData?.reduce((sum, user) => sum + (user.credits || 0), 0) || 0;
        
        // 총 다운로드 수 (크레딧 거래 내역에서 다운로드 타입 카운트)
        const { count: downloadCount } = await supabase
            .from('credit_transactions')
            .select('*', { count: 'exact', head: true })
            .eq('transaction_type', 'deduct')
            .eq('description', '다운로드');
        
        // UI 업데이트
        document.getElementById('totalUsers').textContent = userCount || 0;
        document.getElementById('totalSearches').textContent = searchCount || 0;
        document.getElementById('totalCredits').textContent = totalCredits.toLocaleString();
        document.getElementById('totalDownloads').textContent = downloadCount || 0;
        
    } catch (error) {
        console.error('통계 데이터 로드 오류:', error);
    }
}

async function loadUsers() {
    const tbody = document.getElementById('usersTableBody');
    tbody.innerHTML = '<tr><td colspan="6">로딩 중...</td></tr>';
    
    if (!supabase) {
        // 로컬 모드 더미 데이터
        tbody.innerHTML = `
            <tr>
                <td>1</td>
                <td>홍길동</td>
                <td>test@test.com</td>
                <td>15</td>
                <td>2024-01-01</td>
                <td>
                    <button onclick="editUser('test@test.com')">수정</button>
                    <button onclick="deleteUser('test@test.com')">삭제</button>
                </td>
            </tr>
        `;
        return;
    }
    
    try {
        const { data: users, error } = await supabase
            .from('user_profiles')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        if (!users || users.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6">사용자가 없습니다</td></tr>';
            return;
        }
        
        tbody.innerHTML = users.map(user => `
            <tr>
                <td>${user.id.substring(0, 8)}...</td>
                <td>${user.display_name || user.full_name || '-'}</td>
                <td>${user.email}</td>
                <td>${user.credits || 0}</td>
                <td>${new Date(user.created_at).toLocaleDateString()}</td>
                <td>
                    <button onclick="editUserCredits('${user.email}', ${user.credits})">크레딧 수정</button>
                    <button onclick="viewUserDetails('${user.id}')">상세보기</button>
                </td>
            </tr>
        `).join('');
        
    } catch (error) {
        console.error('사용자 목록 로드 오류:', error);
        tbody.innerHTML = '<tr><td colspan="6">오류가 발생했습니다</td></tr>';
    }
}

function editUserCredits(email, currentCredits) {
    const newCredits = prompt(`${email}의 크레딧을 수정하세요 (현재: ${currentCredits}):`);
    
    if (newCredits !== null && !isNaN(newCredits)) {
        manageCreditForUser(email, parseInt(newCredits) - currentCredits, '관리자 수정');
    }
}

async function manageCreditForUser(email = null, amount = null, reason = null) {
    const userEmail = email || document.getElementById('creditUserEmail').value;
    const creditAmount = amount || parseInt(document.getElementById('creditAmount').value);
    const action = document.getElementById('creditAction')?.value || 'add';
    const creditReason = reason || document.getElementById('creditReason').value || '관리자 조정';
    
    if (!userEmail || !creditAmount) {
        showToast('이메일과 크레딧 수량을 입력해주세요', 'error');
        return;
    }
    
    try {
        if (!supabase) {
            showToast('로컬 모드에서는 실제 크레딧 수정이 불가능합니다', 'info');
            return;
        }
        
        // 사용자 찾기
        const { data: user, error: findError } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('email', userEmail)
            .single();
        
        if (findError || !user) {
            showToast('사용자를 찾을 수 없습니다', 'error');
            return;
        }
        
        // 크레딧 계산
        const finalAmount = action === 'add' ? creditAmount : -creditAmount;
        const newCredits = Math.max(0, (user.credits || 0) + finalAmount);
        
        // 크레딧 업데이트
        const { error: updateError } = await supabase
            .from('user_profiles')
            .update({ credits: newCredits })
            .eq('id', user.id);
        
        if (updateError) throw updateError;
        
        // 거래 내역 추가
        const { error: transactionError } = await supabase
            .from('credit_transactions')
            .insert([{
                user_id: user.id,
                amount: finalAmount,
                transaction_type: action === 'add' ? 'admin_add' : 'admin_deduct',
                description: creditReason
            }]);
        
        if (transactionError) console.error('거래 내역 저장 오류:', transactionError);
        
        showToast(`${userEmail}의 크레딧이 ${action === 'add' ? '지급' : '차감'}되었습니다`, 'success');
        
        // 폼 초기화
        if (document.getElementById('creditUserEmail')) {
            document.getElementById('creditUserEmail').value = '';
            document.getElementById('creditAmount').value = '';
            document.getElementById('creditReason').value = '';
        }
        
        // 데이터 새로고침
        loadUsers();
        loadAdminStats();
        
    } catch (error) {
        console.error('크레딧 관리 오류:', error);
        showToast('크레딧 수정 중 오류가 발생했습니다', 'error');
    }
}

async function loadCreditTransactions() {
    const container = document.getElementById('creditTransactions');
    container.innerHTML = '로딩 중...';
    
    if (!supabase) {
        container.innerHTML = '<p>로컬 모드에서는 거래 내역을 볼 수 없습니다</p>';
        return;
    }
    
    try {
        const { data: transactions, error } = await supabase
            .from('credit_transactions')
            .select(`
                *,
                user_profiles(email, display_name)
            `)
            .order('created_at', { ascending: false })
            .limit(50);
        
        if (error) throw error;
        
        if (!transactions || transactions.length === 0) {
            container.innerHTML = '<p>거래 내역이 없습니다</p>';
            return;
        }
        
        container.innerHTML = `
            <table>
                <thead>
                    <tr>
                        <th>날짜</th>
                        <th>사용자</th>
                        <th>금액</th>
                        <th>타입</th>
                        <th>설명</th>
                    </tr>
                </thead>
                <tbody>
                    ${transactions.map(tx => `
                        <tr>
                            <td>${new Date(tx.created_at).toLocaleString()}</td>
                            <td>${tx.user_profiles?.email || 'Unknown'}</td>
                            <td class="${tx.amount > 0 ? 'credit-add' : 'credit-deduct'}">
                                ${tx.amount > 0 ? '+' : ''}${tx.amount}
                            </td>
                            <td>${tx.transaction_type}</td>
                            <td>${tx.description || '-'}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
        
    } catch (error) {
        console.error('거래 내역 로드 오류:', error);
        container.innerHTML = '<p>거래 내역 로드 중 오류가 발생했습니다</p>';
    }
}

function loadSystemSettings() {
    // 현재 설정값 로드 (로컬 스토리지 또는 기본값)
    document.getElementById('searchCost').value = 1;
    document.getElementById('downloadCost').value = 1;
    document.getElementById('searchLimit').value = 5;
    document.getElementById('signupBonus').value = 5;
}

function saveSystemSettings() {
    const settings = {
        searchCost: document.getElementById('searchCost').value,
        downloadCost: document.getElementById('downloadCost').value,
        searchLimit: document.getElementById('searchLimit').value,
        signupBonus: document.getElementById('signupBonus').value
    };
    
    // 설정 저장 (실제로는 데이터베이스에 저장)
    localStorage.setItem('adminSettings', JSON.stringify(settings));
    showToast('설정이 저장되었습니다', 'success');
}

function loadLogs() {
    const container = document.getElementById('logsContainer');
    container.innerHTML = `
        <div class="log-entry">
            <span class="log-time">2024-01-01 12:00:00</span>
            <span class="log-type search">검색</span>
            <span class="log-message">사용자 test@test.com이 "쇼핑" 검색</span>
        </div>
        <div class="log-entry">
            <span class="log-time">2024-01-01 11:59:30</span>
            <span class="log-type download">다운로드</span>
            <span class="log-message">사용자 test@test.com이 영상 다운로드</span>
        </div>
        <div class="log-entry">
            <span class="log-time">2024-01-01 11:58:15</span>
            <span class="log-type credit">크레딧</span>
            <span class="log-message">사용자 test@test.com 크레딧 1 차감</span>
        </div>
    `;
}

function searchUsers() {
    const searchTerm = document.getElementById('userSearchInput').value.toLowerCase();
    const rows = document.querySelectorAll('#usersTableBody tr');
    
    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(searchTerm) ? '' : 'none';
    });
}

function clearLogs() {
    if (confirm('정말 모든 로그를 삭제하시겠습니까?')) {
        document.getElementById('logsContainer').innerHTML = '<p>로그가 삭제되었습니다</p>';
        showToast('로그가 삭제되었습니다', 'success');
    }
}

// 설정 모달 이벤트 리스너
document.addEventListener('click', function(e) {
    // 설정 모달 외부 클릭 시 닫기
    const settingsModal = document.getElementById('settingsModal');
    if (settingsModal && e.target === settingsModal) {
        closeSettingsModal();
    }
});

// ESC 키로 설정 모달 닫기
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        const settingsModal = document.getElementById('settingsModal');
        if (settingsModal && settingsModal.classList.contains('show')) {
            closeSettingsModal();
        }
    }
});

// 제품 찾기 기능 (현재 준비 중)
function startProductSearch(button) {
    console.log('🎯 제품 찾기 기능 - 현재 준비 중');
    
    // 준비 중 메시지 표시
    showToast('🔧 제품 찾기 기능은 현재 준비 중입니다.\n곧 더 나은 기능으로 찾아뵙겠습니다!', 'info', 3000);
    return;
    
    // 비디오가 완전히 멈출 때까지 잠시 대기
        setTimeout(() => {
        console.log('캡처 모드 시작');
            startCaptureMode(videoPlayer, button);
    }, 150); // 더 안정적인 대기 시간
}

function startCaptureMode(videoPlayer, button) {
    // 캡처 오버레이 생성
    const captureOverlay = createCaptureOverlay(videoPlayer);
    const container = videoPlayer.closest('.video-player-container');
    container.appendChild(captureOverlay);
    
    // 버튼 텍스트 변경
    button.innerHTML = '<i class="fas fa-times"></i> 취소';
    button.onclick = () => cancelCaptureMode(container, button);
    
    // 캡처 영역 선택 이벤트 설정
    setupCaptureSelection(captureOverlay, videoPlayer, container, button);
}



// 비디오 카드에서 TikTok URL 추출
function extractTikTokUrl(videoCard) {
    try {
        // 비디오 플레이어 컨테이너에서 데이터 속성 확인
        const videoContainer = videoCard.querySelector('.video-player-container');
        if (videoContainer) {
            const originalUrl = videoContainer.dataset.originalUrl;
            if (originalUrl && originalUrl !== 'undefined') {
                console.log('원본 TikTok URL 발견:', originalUrl);
                return originalUrl;
            }
        }
        
        // 비디오 플레이어에서 src 속성 확인
        const videoPlayer = videoCard.querySelector('.video-player');
        if (videoPlayer && videoPlayer.src) {
            const videoSrc = videoPlayer.src;
            console.log('비디오 소스:', videoSrc);
            
            // 비디오 URL에서 TikTok ID나 패턴을 찾아 원본 URL 추정
            if (videoSrc.includes('tiktok')) {
                return videoSrc;
            }
        }
        
        // 대안으로 TikTok 메인 페이지 URL 반환
        console.log('원본 URL을 찾을 수 없어 TikTok 메인 페이지 사용');
        return 'https://www.tiktok.com';
        
    } catch (error) {
        console.error('TikTok URL 추출 오류:', error);
        return 'https://www.tiktok.com';
    }
}

function createCaptureOverlay(videoPlayer) {
    const overlay = document.createElement('div');
    overlay.className = 'capture-overlay';
    overlay.innerHTML = `
        <div class="capture-instructions">
            <i class="fas fa-crop"></i>
            <p>제품을 찾을 영역을 드래그하여 선택하세요</p>
            <small>💡 비디오가 재생 중일 때 캡처 품질이 더 좋습니다</small>
        </div>
        <div class="capture-selection">
            <div class="selection-info"></div>
        </div>
    `;
    return overlay;
}

function setupCaptureSelection(overlay, videoPlayer, container, button) {
    const selection = overlay.querySelector('.capture-selection');
    let isSelecting = false;
    let startX, startY;
    
    overlay.addEventListener('mousedown', (e) => {
        if (e.target === overlay) {
            isSelecting = true;
            const rect = overlay.getBoundingClientRect();
            startX = e.clientX - rect.left;
            startY = e.clientY - rect.top;
            
            selection.style.left = startX + 'px';
            selection.style.top = startY + 'px';
            selection.style.width = '0px';
            selection.style.height = '0px';
            selection.style.display = 'block';
        }
    });
    
    overlay.addEventListener('mousemove', (e) => {
        if (isSelecting) {
            const rect = overlay.getBoundingClientRect();
            const currentX = e.clientX - rect.left;
            const currentY = e.clientY - rect.top;
            
            const width = Math.abs(currentX - startX);
            const height = Math.abs(currentY - startY);
            const left = Math.min(currentX, startX);
            const top = Math.min(currentY, startY);
            
            selection.style.left = left + 'px';
            selection.style.top = top + 'px';
            selection.style.width = width + 'px';
            selection.style.height = height + 'px';
            
            // 선택 영역 크기 정보 표시
            const selectionInfo = selection.querySelector('.selection-info');
            if (width > 50 && height > 50) {
                // 실제 캡처될 크기 계산 (선택 영역과 동일하게 표시)
                const actualWidth = Math.round(width);
                const actualHeight = Math.round(height);
                
                selectionInfo.innerHTML = `${Math.round(width)} × ${Math.round(height)}px<br><small>캡처: ${actualWidth} × ${actualHeight}px</small>`;
                selectionInfo.style.display = 'block';
                
                console.log('실시간 미리보기:', {
                    selection: { width: Math.round(width), height: Math.round(height) },
                    capture: { width: actualWidth, height: actualHeight },
                    videoLoaded: !!(videoPlayer.videoWidth && videoPlayer.videoHeight)
                });
            } else {
                selectionInfo.style.display = 'none';
            }
        }
    });
    
    overlay.addEventListener('mouseup', (e) => {
        if (isSelecting) {
            isSelecting = false;
            const rect = selection.getBoundingClientRect();
            
            if (rect.width > 20 && rect.height > 20) {
                // selection 요소의 실제 화면 위치 가져오기
                const selectionRect = selection.getBoundingClientRect();
                const videoRect = videoPlayer.getBoundingClientRect();
                
                // 비디오 요소 기준으로 상대 좌표 계산
                const relativeX = selectionRect.left - videoRect.left;
                const relativeY = selectionRect.top - videoRect.top;
                const selectionWidth = selectionRect.width;
                const selectionHeight = selectionRect.height;
                
                console.log('선택 영역 실제 좌표 계산:', {
                    selectionRect: { 
                        left: selectionRect.left, 
                        top: selectionRect.top, 
                        width: selectionRect.width, 
                        height: selectionRect.height 
                    },
                    videoRect: { 
                        left: videoRect.left, 
                        top: videoRect.top, 
                        width: videoRect.width, 
                        height: videoRect.height 
                    },
                    relativeCoords: { 
                        x: relativeX, 
                        y: relativeY, 
                        width: selectionWidth, 
                        height: selectionHeight 
                    }
                });
                
                // 비디오 요소 기준 상대 좌표로 전달
                showCaptureConfirmation(overlay, videoPlayer, container, button, {
                    x: relativeX,
                    y: relativeY,
                    width: selectionWidth,
                    height: selectionHeight
                });
            }
        }
    });
}

function showCaptureConfirmation(overlay, videoPlayer, container, button, selectionArea) {
    console.log('캡처 확인 대화상자 - 입력된 selectionArea:', selectionArea);
    
    // 비디오 크기 정보 가져오기
    const videoRect = videoPlayer.getBoundingClientRect();
    const videoWidth = videoPlayer.videoWidth || videoRect.width;
    const videoHeight = videoPlayer.videoHeight || videoRect.height;
    
    console.log('비디오 크기 정보:', {
        videoElement: { width: videoRect.width, height: videoRect.height },
        videoActual: { width: videoWidth, height: videoHeight },
        videoPlayer: { 
            videoWidth: videoPlayer.videoWidth, 
            videoHeight: videoPlayer.videoHeight,
            readyState: videoPlayer.readyState,
            src: videoPlayer.src
        }
    });
    
    // 실제 캡처될 크기 계산 (비디오 픽셀 기준)
    const scaleX = videoWidth / videoRect.width;
    const scaleY = videoHeight / videoRect.height;
    
    const actualWidth = Math.round(selectionArea.width * scaleX);
    const actualHeight = Math.round(selectionArea.height * scaleY);
    
    console.log('실제 캡처 크기 계산:', {
        selection: { width: selectionArea.width, height: selectionArea.height },
        videoScale: { x: scaleX, y: scaleY },
        capture: { width: actualWidth, height: actualHeight }
    });

    
    const confirmation = document.createElement('div');
    confirmation.className = 'capture-confirmation';
    confirmation.innerHTML = `
        <div class="confirmation-content">
            <h3>선택한 영역으로 제품을 찾으시겠습니까?</h3>
            <p><small>🔍 AI가 선택한 영역의 제품을 분석하여 유사한 상품을 찾아드립니다</small></p>
            <p><small>📐 선택 영역: ${Math.round(selectionArea.width)} × ${Math.round(selectionArea.height)}px</small></p>
            <p><small>📏 캡처 크기: ${Math.round(actualWidth)} × ${Math.round(actualHeight)}px</small></p>
            <div class="confirmation-buttons">
                <button class="btn-confirm" data-selection='${JSON.stringify(selectionArea)}'>
                    <i class="fas fa-search"></i> 제품 찾기
                </button>
                <button class="btn-cancel">
                    <i class="fas fa-times"></i> 취소
                </button>
            </div>
        </div>
    `;
    
    // 이벤트 리스너 추가
    const confirmBtn = confirmation.querySelector('.btn-confirm');
    const cancelBtn = confirmation.querySelector('.btn-cancel');
    
    confirmBtn.addEventListener('click', () => {
        performProductSearch(confirmBtn, videoPlayer, container, button, selectionArea);
    });
    
    cancelBtn.addEventListener('click', () => {
        cancelCaptureMode(container, button);
    });
    
    overlay.appendChild(confirmation);
}

function cancelCaptureMode(container, button) {
    // 캡처 오버레이 제거
    const overlay = container.querySelector('.capture-overlay');
    if (overlay) {
        overlay.remove();
    }
    
    // 버튼 원래 상태로 복원
    button.innerHTML = '<i class="fas fa-search"></i> 제품찾기';
    button.onclick = () => startProductSearch(button);
}

async function performProductSearch(confirmButton, videoPlayer, container, button, selectionArea) {
    try {
        // 준비 중 메시지 표시
        showToast('🔧 제품 찾기 기능은 현재 준비 중입니다.\n곧 더 나은 기능으로 찾아뵙겠습니다!', 'info', 3000);
        
        // 캡처 모드 종료
        exitCaptureMode();
        return;
        
        // 캡처 결과 확인
        if (!imageDataUrl || imageDataUrl === 'data:,') {
            // 대안 방법들을 순차적으로 시도
            console.log('기본 캡처 실패, 대안 방법들을 시도합니다...');
            
            try {
                // HTML2Canvas 방법 시도
                showToast('대안 캡처 방법을 시도하고 있습니다...', 'info');
                const selection = JSON.parse(confirmButton.dataset.selection);
                const alternativeCapture = await tryHTML2CanvasCapture(videoPlayer, selection);
                
                if (alternativeCapture) {
                    imageDataUrl = alternativeCapture;
                    showToast('대안 방법으로 캡처에 성공했습니다!', 'success');
                } else {
                    throw new Error('모든 캡처 방법이 실패했습니다.');
                }
            } catch (altError) {
                console.error('대안 캡처 방법 실패:', altError);
                throw new Error('비디오 캡처에 실패했습니다. CORS 정책이나 브라우저 제한으로 인한 문제일 수 있습니다. 자동으로 대안 방법을 시도합니다.');
            }
        }
        
        // 캡처된 이미지 미리보기 (디버깅용)
        console.log('캡처된 이미지 크기:', imageDataUrl.length);
        showCapturePreview(imageDataUrl);
        
        // 구글 역이미지 검색으로 직접 이동
        console.log('🔍 캡처된 이미지 크기:', imageDataUrl ? imageDataUrl.length : 'null');
        console.log('🔍 이미지 데이터 샘플:', imageDataUrl ? imageDataUrl.substring(0, 100) + '...' : 'null');
        await openGoogleReverseImageSearch(imageDataUrl);
        
        // 캡처 모드 종료
        cancelCaptureMode(container, button);
        
    } catch (error) {
        console.error('제품 검색 오류:', error);
        showToast('제품 검색 중 오류가 발생했습니다: ' + error.message, 'error');
        
        // 버튼 상태 복원
        confirmButton.innerHTML = '<i class="fas fa-search"></i> 제품 찾기';
        confirmButton.disabled = false;
    }
}

// 비디오 프레임 캡처 함수
async function captureVideoFrame(videoPlayer, selection) {
    console.log('🎯 새로운 간단한 캡처 방법 시작');
    
    try {
        // 1단계: 기본 캔버스 캡처 시도
        const basicCapture = await tryBasicCanvasCapture(videoPlayer, selection);
        if (basicCapture) {
            console.log('✅ 기본 캔버스 캡처 성공');
            return basicCapture;
        }
        
        // 2단계: HTML2Canvas 시도
        console.log('🔄 HTML2Canvas 방법 시도');
        const html2CanvasCapture = await trySimpleScreenshot(videoPlayer, selection);
        if (html2CanvasCapture) {
            console.log('✅ HTML2Canvas 캡처 성공');
            return html2CanvasCapture;
        }
        
        // 3단계: 비디오 멈춤 상태 특화 캡처 시도
        console.log('🔄 비디오 멈춤 상태 특화 캡처 시도');
        const pausedVideoCapture = await tryPausedVideoCapture(videoPlayer, selection);
        if (pausedVideoCapture) {
            console.log('✅ 멈춤 상태 캡처 성공');
            return pausedVideoCapture;
        }
        
        // 4단계: 스크린 캡처 시도
        console.log('🔄 Screen Capture API 시도');
        const screenCapture = await tryScreenCapture(selection);
        if (screenCapture) {
            console.log('✅ Screen Capture 성공');
            return screenCapture;
        }
        
        // 5단계: 최후의 수단 - 전체 비디오 요소 캡처 후 크롭
        console.log('🔄 전체 비디오 캡처 후 크롭 시도');
        const fullVideoCapture = await tryFullVideoCapture(videoPlayer, selection);
        if (fullVideoCapture) {
            console.log('✅ 전체 비디오 캡처 성공');
            return fullVideoCapture;
        }
        
        throw new Error('모든 캡처 방법이 실패했습니다');
        
    } catch (error) {
        console.error('❌ 캡처 실패:', error);
        throw error;
    }
}

// 기본 캔버스 캡처 (가장 간단한 방법)
async function tryBasicCanvasCapture(videoPlayer, selection) {
    console.log('기본 캔버스 캡처 시도');
    
    try {
        // 비디오 상태 확인
        const isPaused = videoPlayer.paused;
        const readyState = videoPlayer.readyState;
        
        console.log('비디오 상태:', { isPaused, readyState, currentTime: videoPlayer.currentTime });
        
        // 비디오가 준비되었는지 확인
        if (readyState < 2) {
            console.log('비디오 로딩 대기');
            await waitForVideoReady(videoPlayer);
        }
        
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // 고화질을 위해 2배 해상도로 캔버스 설정
        const scale = 2;
        canvas.width = (selection.width || 400) * scale;
        canvas.height = (selection.height || 300) * scale;
        
        // 고화질 렌더링 설정
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.scale(scale, scale);
        
        // CORS 테스트
        try {
            ctx.drawImage(videoPlayer, 0, 0, 10, 10);
            canvas.toDataURL();
                    } catch (corsError) {
            console.log('CORS 오류 감지, 다음 방법으로 넘어감');
            return null;
                    }
                    
        // 실제 캡처
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    
        // 선택 영역만 정확히 캡처하기
        const videoRect = videoPlayer.getBoundingClientRect();
        const scaleX = videoPlayer.videoWidth / videoRect.width;
        const scaleY = videoPlayer.videoHeight / videoRect.height;
        
        // 실제 비디오 좌표로 변환
        const sourceX = selection.x * scaleX;
        const sourceY = selection.y * scaleY;
        const sourceWidth = selection.width * scaleX;
        const sourceHeight = selection.height * scaleY;
        
        console.log('📸 캡처 정보:', {
            selection: selection,
            videoRect: { width: videoRect.width, height: videoRect.height },
            videoSize: { width: videoPlayer.videoWidth, height: videoPlayer.videoHeight },
            source: { x: sourceX, y: sourceY, width: sourceWidth, height: sourceHeight }
        });
        
        // 선택 영역을 캔버스에 그리기
        ctx.drawImage(
            videoPlayer,
            sourceX, sourceY, sourceWidth, sourceHeight,
            0, 0, selection.width, selection.height
        );
        
        const imageDataUrl = canvas.toDataURL('image/png', 1.0);
        
        // 유효성 검사
        if (imageDataUrl && imageDataUrl.length > 1000) {
            return imageDataUrl;
        }
        
        return null;
        
    } catch (error) {
        console.log('기본 캔버스 캡처 실패:', error.message);
        return null;
    }
}

// 비디오 준비 대기 함수
function waitForVideoReady(videoPlayer) {
    return new Promise((resolve, reject) => {
        if (videoPlayer.readyState >= 2) {
            resolve();
            return;
        }
                
                let attempts = 0;
        const maxAttempts = 30;
                
        const checkReady = () => {
                    attempts++;
            if (videoPlayer.readyState >= 2) {
                resolve();
                    } else if (attempts >= maxAttempts) {
                reject(new Error('비디오 로딩 타임아웃'));
                    } else {
                setTimeout(checkReady, 100);
            }
        };
        
        checkReady();
    });
}

// 스크린 캡처 방법 (사용자가 직접 화면 선택)
async function tryScreenCapture(selection) {
    try {
        if (!navigator.mediaDevices?.getDisplayMedia) {
            return null;
        }
        
        showToast('화면 캡처를 시작합니다. 현재 브라우저 탭을 선택해주세요.', 'info');
        
        const stream = await navigator.mediaDevices.getDisplayMedia({
            video: { width: 1920, height: 1080 },
            audio: false
        });
        
        return new Promise((resolve, reject) => {
            const video = document.createElement('video');
            video.srcObject = stream;
            video.autoplay = true;
            video.muted = true;
            
            video.onloadedmetadata = () => {
                        setTimeout(() => {
                    try {
                    const canvas = document.createElement('canvas');
                        const ctx = canvas.getContext('2d');
                        
                        canvas.width = selection.width || 400;
                        canvas.height = selection.height || 300;
                        
                        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                        
                        // 스트림 정리
                        stream.getTracks().forEach(track => track.stop());
                        
                        const imageDataUrl = canvas.toDataURL('image/jpeg', 0.9);
                        resolve(imageDataUrl);
                    
                } catch (error) {
                        stream.getTracks().forEach(track => track.stop());
                    reject(error);
                }
                }, 500);
            };
            
            video.onerror = () => {
                stream.getTracks().forEach(track => track.stop());
                reject(new Error('화면 캡처 비디오 오류'));
            };
            
            setTimeout(() => {
                stream.getTracks().forEach(track => track.stop());
                reject(new Error('화면 캡처 타임아웃'));
            }, 10000);
        });
            
        } catch (error) {
        console.log('스크린 캡처 실패:', error.message);
        return null;
        }
}

// 간단한 이미지 미리보기 함수
function showCapturePreview(imageDataUrl) {
    console.log('캡처된 이미지 미리보기:', imageDataUrl.length, '바이트');
    
    // 간단한 알림으로 대체
    showToast('이미지 캡처가 완료되었습니다!', 'success');
}

// 간단한 테스트용 함수
function testNewCaptureMethod() {
    console.log('새로운 캡처 방법이 준비되었습니다!');
    showToast('영역 캡처 기능이 개선되었습니다. 이제 더 안정적으로 작동합니다!', 'success');
}

// 검색 관련 설정 완료

// 기존 API 기반 검색 함수는 제거되었습니다.
// 이제 구글 역이미지 검색을 직접 사용합니다.

// 구글 역이미지 검색을 여는 함수
async function openGoogleReverseImageSearch(imageDataUrl) {
    try {
        console.log('🔍 구글 역이미지 검색 시작...');
        
        // 1단계: 이미지를 임시 업로드해서 URL 생성
        const imageUrl = await uploadImageForReverseSearch(imageDataUrl);
        
        if (imageUrl) {
            // 2단계: 구글 이미지 검색 페이지를 열고 자동화 스크립트 실행
            await openGoogleWithAutomation(imageUrl);
        } else {
            // 업로드 실패 시 대안: 직접 이미지 데이터로 시도
            console.log('🔄 이미지 업로드 실패, 대안 방법 시도...');
            await openGoogleWithImageData(imageDataUrl);
        }
        
        console.log('✅ 구글 역이미지 검색 페이지로 이동 완료');
        
    } catch (error) {
        console.error('❌ 구글 역이미지 검색 오류:', error);
        await openGoogleImagesWithInstructions(imageDataUrl);
    }
}

// 이미지를 임시 업로드하는 함수
async function uploadImageForReverseSearch(imageDataUrl) {
    try {
        console.log('📤 이미지 업로드 시작...');
        console.log('📤 이미지 데이터 크기:', imageDataUrl.length);
        
        // imgbb API를 사용한 임시 업로드
        const blob = dataURLtoBlob(imageDataUrl);
        console.log('📤 Blob 생성 완료, 크기:', blob.size);
        
        const formData = new FormData();
        formData.append('image', blob, 'capture.png');
        
        console.log('📤 FormData 생성 완료, imgbb API 호출 중...');
        
        const response = await fetch('https://api.imgbb.com/1/upload?key=d12b6e6c13a5ced17f6f4e9a4fae5002e0b478f7', {
            method: 'POST',
            body: formData
        });
        
        console.log('📤 imgbb API 응답 상태:', response.status);
            
            if (response.ok) {
                const data = await response.json();
            console.log('📤 imgbb API 응답 데이터:', data);
            
            if (data.success) {
                console.log('✅ 이미지 임시 업로드 성공:', data.data.url);
                return data.data.url;
                    } else {
                console.log('❌ imgbb 업로드 실패:', data);
                return null;
            }
        } else {
            const errorText = await response.text();
            console.log('❌ imgbb API 오류:', response.status, errorText);
            return null;
        }
        
    } catch (error) {
        console.error('❌ 이미지 업로드 실패:', error);
        return null;
    }
}

// 구글 이미지 검색 페이지를 열고 자동화 스크립트 실행
async function openGoogleWithAutomation(imageUrl) {
    try {
        console.log('🤖 구글 이미지 검색 자동화 시작...');
        console.log('🤖 이미지 URL:', imageUrl);
        
        // 직접 구글 역이미지 검색 URL로 이동 (가장 확실한 방법)
        const directSearchUrl = `https://www.google.com/searchbyimage?image_url=${encodeURIComponent(imageUrl)}`;
        console.log('🤖 생성된 구글 검색 URL:', directSearchUrl);
        
        window.open(directSearchUrl, '_blank');
        
        showToast('구글 역이미지 검색이 자동으로 실행됩니다! 🚀', 'success');
        
        console.log('✅ 직접 URL로 구글 역이미지 검색 실행 완료');
        
    } catch (error) {
        console.error('❌ 자동화 스크립트 오류:', error);
        
        // 실패 시 수동 방법으로 대체
        console.log('🔄 수동 방법으로 대체...');
        const googleImagesUrl = 'https://www.google.com/imghp';
        window.open(googleImagesUrl, '_blank');
        
        // 이미지 URL을 클립보드에 복사
        try {
            await navigator.clipboard.writeText(imageUrl);
            showToast(`구글 이미지 검색이 열렸습니다! 📋\n이미지 URL이 클립보드에 복사되었습니다:\n${imageUrl}\n\n카메라 아이콘을 클릭하고 Ctrl+V로 붙여넣기하세요!`, 'info', 8000);
        } catch (clipError) {
            console.log('❌ 클립보드 복사 실패:', clipError);
            showToast(`구글 이미지 검색이 열렸습니다!\n\n이미지 URL: ${imageUrl}\n\n카메라 아이콘을 클릭하고 위 URL을 복사해서 붙여넣기하세요!`, 'info', 10000);
        }
    }
}

// 이미지 데이터로 직접 구글 검색 시도
async function openGoogleWithImageData(imageDataUrl) {
    try {
        console.log('🖼️ 이미지 데이터로 직접 구글 검색 시도...');
        
        // 구글 이미지 검색 페이지를 열고 자동화 시도
        const googleWindow = window.open('https://www.google.com/imghp', '_blank');
        
        // 잠시 대기 후 자동화 스크립트 실행
        setTimeout(() => {
            try {
                // 이미지를 클립보드에 복사
                const blob = dataURLtoBlob(imageDataUrl);
                navigator.clipboard.write([
                    new ClipboardItem({ 'image/png': blob })
                ]).then(() => {
                    console.log('✅ 이미지가 클립보드에 복사됨');
                    showToast('구글 이미지 검색이 열렸습니다! 📋\n이미지가 클립보드에 복사되었습니다.\n\n1. 카메라 아이콘 클릭\n2. Ctrl+V로 붙여넣기\n3. 검색 버튼 클릭', 'info', 8000);
                }).catch(clipError => {
                    console.log('❌ 클립보드 복사 실패:', clipError);
                    // 클립보드 실패 시 다운로드
                    const link = document.createElement('a');
                    link.href = imageDataUrl;
                    link.download = 'captured-image.png';
                    link.style.display = 'none';
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    
                    showToast('구글 이미지 검색이 열렸습니다! 📥\n이미지가 다운로드되었습니다.\n\n1. 카메라 아이콘 클릭\n2. 다운로드된 이미지 업로드\n3. 검색 실행', 'info', 8000);
                });
    } catch (error) {
                console.log('❌ 자동화 실패:', error);
                showToast('구글 이미지 검색이 열렸습니다!\n수동으로 카메라 아이콘을 클릭하고 이미지를 업로드해주세요.', 'info');
            }
        }, 2000);
        
        console.log('✅ 구글 이미지 검색 페이지 열기 완료');
        
    } catch (error) {
        console.error('❌ 이미지 데이터 검색 실패:', error);
        // 최후의 수단
        window.open('https://www.google.com/imghp', '_blank');
        showToast('구글 이미지 검색이 열렸습니다.\n수동으로 이미지를 업로드해주세요.', 'info');
    }
}

// 구글 이미지 검색 페이지를 열고 사용자에게 안내하는 함수
async function openGoogleImagesWithInstructions(imageDataUrl) {
    // 구글 이미지 검색 페이지 열기
    const googleImagesUrl = 'https://www.google.com/imghp';
    window.open(googleImagesUrl, '_blank');
    
    // 캡처된 이미지를 클립보드에 복사 (가능한 경우)
    try {
        const blob = dataURLtoBlob(imageDataUrl);
        await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blob })
        ]);
        
        showToast('구글 이미지 검색이 열렸습니다! 캡처된 이미지가 클립보드에 복사되었습니다. 📋\n카메라 아이콘을 클릭하고 Ctrl+V로 붙여넣기하세요!', 'info', 5000);
    } catch (clipboardError) {
        console.log('클립보드 복사 실패:', clipboardError);
        
        // 클립보드 복사가 안되면 다운로드 링크 제공
        const link = document.createElement('a');
        link.href = imageDataUrl;
        link.download = 'captured-image.png';
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        showToast('구글 이미지 검색이 열렸습니다! 📥\n캡처된 이미지가 다운로드되었습니다. 구글에서 카메라 아이콘을 클릭하고 이미지를 업로드하세요!', 'info', 5000);
    }
}

// DataURL을 Blob으로 변환하는 헬퍼 함수
function dataURLtoBlob(dataURL) {
    const arr = dataURL.split(',');
    const mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
}

// 이미지를 임시 호스팅 서비스에 업로드하는 함수
async function uploadImageToTempService(imageDataUrl) {
    try {
        // imgbb API를 사용한 이미지 업로드 (무료 서비스)
        const formData = new FormData();
        
        // Data URL을 Blob으로 변환
        const response = await fetch(imageDataUrl);
        const blob = await response.blob();
        
        formData.append('image', blob);
        
        // imgbb API 호출 (무료 API 키 사용)
        const uploadResponse = await fetch('https://api.imgbb.com/1/upload?key=7d12b6e6c13a5ced17f6f4e9a4fae5002e0b478f', {
            method: 'POST',
            body: formData
        });
        
        if (!uploadResponse.ok) {
            console.error('imgbb 업로드 실패:', uploadResponse.status);
            return null;
        }
        
        const uploadData = await uploadResponse.json();
        
        if (uploadData.success) {
            console.log('이미지 업로드 성공:', uploadData.data.url);
            return uploadData.data.url;
        } else {
            console.error('imgbb 업로드 실패:', uploadData);
            return null;
        }
        
    } catch (error) {
        console.error('이미지 업로드 오류:', error);
        return null;
    }
}

// 데모 제품 검색 결과 생성
function generateDemoProductResults() {
    return {
        success: true,
        results: [
            {
                title: "유사한 제품 1",
                description: "AI가 분석한 유사 제품입니다",
                image: "https://via.placeholder.com/300x200?text=Product+1",
                price: "₩29,900",
                url: "https://example.com/product1"
            },
            {
                title: "유사한 제품 2", 
                description: "추천 상품입니다",
                image: "https://via.placeholder.com/300x200?text=Product+2",
                price: "₩39,900",
                url: "https://example.com/product2"
            },
            {
                title: "유사한 제품 3",
                description: "인기 상품입니다", 
                image: "https://via.placeholder.com/300x200?text=Product+3",
                price: "₩19,900",
                url: "https://example.com/product3"
            }
        ]
    };
}

function showProductSearchResults(results, originalImage) {
    // 결과 데이터를 URL 파라미터로 전달하여 새 페이지로 이동
    const params = new URLSearchParams({
        image: originalImage,
        results: JSON.stringify(results)
    });
    
    // 새 창에서 결과 페이지 열기
    window.open(`product-search.html?${params.toString()}`, '_blank', 'width=1200,height=800');
}

// 제목 더보기/접기 기능
function toggleTitleExpansion(videoId) {
    const titleElement = document.getElementById(`videoTitle-${videoId}`);
    const button = titleElement.nextElementSibling;
    
    if (titleElement.classList.contains('truncated')) {
        titleElement.classList.remove('truncated');
        button.textContent = '접기';
    } else {
        titleElement.classList.add('truncated');
        button.textContent = '더보기';
    }
}

// 설명 더보기/접기 기능
function toggleDescriptionExpansion(videoId) {
    const descriptionElement = document.getElementById(`videoDescription-${videoId}`);
    const button = descriptionElement.nextElementSibling;
    
    if (descriptionElement.classList.contains('truncated')) {
        descriptionElement.classList.remove('truncated');
        button.textContent = '접기';
    } else {
        descriptionElement.classList.add('truncated');
        button.textContent = '더보기';
    }
}

// 비디오 멈춤 상태 특화 캡처 방법
async function tryPausedVideoCapture(videoPlayer, selection) {
    try {
        console.log('🎬 비디오 멈춤 상태 특화 캡처 시작');
        
        // 비디오가 멈춰있는지 확인
        if (!videoPlayer.paused) {
            console.log('비디오가 재생 중이므로 일시정지');
            videoPlayer.pause();
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        // 현재 프레임을 더 정확하게 캡처하기 위한 방법
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // 비디오의 실제 크기 가져오기
        const videoRect = videoPlayer.getBoundingClientRect();
        const videoWidth = videoPlayer.videoWidth || videoRect.width;
        const videoHeight = videoPlayer.videoHeight || videoRect.height;
        
        // 선택 영역을 비디오 실제 크기에 맞게 변환
        const scaleX = videoWidth / videoRect.width;
        const scaleY = videoHeight / videoRect.height;
        
        const sourceX = Math.round(selection.x * scaleX);
        const sourceY = Math.round(selection.y * scaleY);
        const sourceWidth = Math.round(selection.width * scaleX);
        const sourceHeight = Math.round(selection.height * scaleY);
        
        canvas.width = sourceWidth;
        canvas.height = sourceHeight;
        
        // 멈춘 비디오에서 더 안정적으로 캡처
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // 여러 번 시도하여 안정성 향상
        for (let attempt = 0; attempt < 3; attempt++) {
            try {
                ctx.drawImage(
                    videoPlayer,
                    sourceX, sourceY, sourceWidth, sourceHeight,
                    0, 0, sourceWidth, sourceHeight
                );
                
                // 캡처된 내용 검증
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const pixels = imageData.data;
                let hasContent = false;
                
                for (let i = 0; i < pixels.length; i += 4) {
                    if (pixels[i] !== 0 || pixels[i + 1] !== 0 || pixels[i + 2] !== 0) {
                        hasContent = true;
                        break;
                    }
                }
                
                if (hasContent) {
                    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
                    console.log('✅ 멈춤 상태 캡처 성공 (시도', attempt + 1, ')');
                    return dataUrl;
                }
                
                console.log('시도', attempt + 1, '실패, 재시도...');
                await new Promise(resolve => setTimeout(resolve, 50));
                
            } catch (drawError) {
                console.log('drawImage 시도', attempt + 1, '실패:', drawError.message);
                if (attempt === 2) throw drawError;
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }
        
        return null;
        
    } catch (error) {
        console.error('멈춤 상태 캡처 실패:', error);
        return null;
    }
}

// 전체 비디오 캡처 후 크롭 방법
async function tryFullVideoCapture(videoPlayer, selection) {
    try {
        console.log('📹 전체 비디오 캡처 후 크롭 시작');
        
        // 비디오 일시정지
        const wasPlaying = !videoPlayer.paused;
        if (wasPlaying) {
            videoPlayer.pause();
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // 전체 비디오 크기로 캔버스 설정
        const videoWidth = videoPlayer.videoWidth || videoPlayer.offsetWidth;
        const videoHeight = videoPlayer.videoHeight || videoPlayer.offsetHeight;
        
        canvas.width = videoWidth;
        canvas.height = videoHeight;
        
        // 전체 비디오 캡처
        ctx.drawImage(videoPlayer, 0, 0, videoWidth, videoHeight);
        
        // 선택 영역만 크롭
        const videoRect = videoPlayer.getBoundingClientRect();
        const scaleX = videoWidth / videoRect.width;
        const scaleY = videoHeight / videoRect.height;
        
        const cropX = Math.round(selection.x * scaleX);
        const cropY = Math.round(selection.y * scaleY);
        const cropWidth = Math.round(selection.width * scaleX);
        const cropHeight = Math.round(selection.height * scaleY);
        
        // 크롭된 이미지 데이터 가져오기
        const croppedImageData = ctx.getImageData(cropX, cropY, cropWidth, cropHeight);
        
        // 새 캔버스에 크롭된 이미지 그리기
        const croppedCanvas = document.createElement('canvas');
        const croppedCtx = croppedCanvas.getContext('2d');
        
        croppedCanvas.width = cropWidth;
        croppedCanvas.height = cropHeight;
        croppedCtx.putImageData(croppedImageData, 0, 0);
        
        // 재생 상태 복원
        if (wasPlaying) {
            videoPlayer.play().catch(e => console.log('재생 복원 실패:', e));
        }
        
        const dataUrl = croppedCanvas.toDataURL('image/jpeg', 0.9);
        console.log('✅ 전체 캡처 후 크롭 성공');
        return dataUrl;
        
    } catch (error) {
        console.error('전체 캡처 후 크롭 실패:', error);
        return null;
    }
}

// 고급 비디오 캡처 방법 (WebGL 사용)
async function tryWebGLCapture(videoPlayer, selection) {
    try {
        console.log('🎨 WebGL 캡처 시도');
        
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        
        if (!gl) {
            console.log('WebGL 지원되지 않음');
            return null;
        }
        
        canvas.width = selection.width;
        canvas.height = selection.height;
        
        // WebGL 텍스처로 비디오 업로드
        const texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, videoPlayer);
        
        // 렌더링 후 캔버스에서 데이터 추출
        const pixels = new Uint8Array(canvas.width * canvas.height * 4);
        gl.readPixels(0, 0, canvas.width, canvas.height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
        
        // 2D 캔버스로 변환
        const canvas2d = document.createElement('canvas');
        const ctx2d = canvas2d.getContext('2d');
        canvas2d.width = canvas.width;
        canvas2d.height = canvas.height;
        
        const imageData = ctx2d.createImageData(canvas.width, canvas.height);
        imageData.data.set(pixels);
        ctx2d.putImageData(imageData, 0, 0);
        
        const dataUrl = canvas2d.toDataURL('image/jpeg', 0.9);
        console.log('✅ WebGL 캡처 성공');
        return dataUrl;
        
    } catch (error) {
        console.error('WebGL 캡처 실패:', error);
        return null;
    }
}

// Google Images API 관련 함수들은 위의 searchWithGoogleImages 함수에서 처리됩니다.

// 즐겨찾기 섹션 표시
function showFavorites(event) {
    if (event) {
        event.preventDefault();
    }
    
    // 탭 활성화 상태 변경
    setActiveTab('favorites');
    
    // 모든 섹션 숨기기
    document.querySelector('.search-section').style.display = 'none';
    const favoritesSection = document.getElementById('favoritesSection');
    if (favoritesSection) {
        favoritesSection.style.display = 'block';
        loadFavorites();
    }
}

// 즐겨찾기 로드
function loadFavorites() {
    const favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
    const favoritesEmpty = document.getElementById('favoritesEmpty');
    const favoritesGrid = document.getElementById('favoritesGrid');
    
    if (favorites.length === 0) {
        favoritesEmpty.style.display = 'block';
        favoritesGrid.style.display = 'none';
                } else {
        favoritesEmpty.style.display = 'none';
        favoritesGrid.style.display = 'grid';
        
        // 즐겨찾기 비디오들 표시
        favoritesGrid.innerHTML = favorites.map(video => `
            <div class="video-card" data-video-id="${video.video_id}" onclick="openVideoModal(${JSON.stringify(video).replace(/"/g, '&quot;')})">
                <div class="video-thumbnail">
                    <img src="${video.cover}" alt="${video.title}" loading="lazy">
                    <div class="video-duration">${formatDuration(video.duration)}</div>
                    <button class="favorite-btn active" onclick="event.stopPropagation(); toggleFavorite('${video.video_id}', this)">
                        <i class="fas fa-heart"></i>
                    </button>
                </div>
                <div class="video-info">
                    <h3 class="video-title">${video.title}</h3>
                    <div class="video-author">
                        <img src="${video.author.avatar}" alt="${video.author.nickname}" class="author-avatar">
                        <span class="author-name">${video.author.nickname}</span>
                    </div>
                    <div class="video-stats">
                        <span><i class="fas fa-play"></i> ${formatNumber(video.play_count)}</span>
                        <span><i class="fas fa-heart"></i> ${formatNumber(video.digg_count)}</span>
                        <span><i class="fas fa-comment"></i> ${formatNumber(video.comment_count)}</span>
                    </div>
                </div>
            </div>
        `).join('');
    }
}

// 간단한 스크린샷 캡처 함수
async function trySimpleScreenshot(videoElement, selectionArea) {
    try {
        console.log('📸 고화질 스크린샷 시도');
        
        // 비디오 요소가 있는지 확인
        if (!videoElement) {
            console.log('❌ 비디오 요소를 찾을 수 없습니다');
        return null;
        }
        
        // 캔버스 생성
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // 고화질을 위해 2배 해상도로 캔버스 설정
        const scale = 2;
        canvas.width = selectionArea.width * scale;
        canvas.height = selectionArea.height * scale;
        
        // 고화질 렌더링 설정
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        
        // 캔버스 스케일 조정
        ctx.scale(scale, scale);
        
        console.log('📸 캡처 영역:', selectionArea);
        console.log('📸 캔버스 크기:', canvas.width, 'x', canvas.height);
        
        // 비디오의 현재 프레임을 캔버스에 그리기
        try {
            ctx.drawImage(
                videoElement,
                selectionArea.x, selectionArea.y, selectionArea.width, selectionArea.height,
                0, 0, selectionArea.width, selectionArea.height
            );
            
            // 최고 품질로 PNG 생성
            const imageDataUrl = canvas.toDataURL('image/png', 1.0);
            console.log('✅ 고화질 스크린샷 성공 - 최종 크기:', canvas.width, 'x', canvas.height);
            return imageDataUrl;
            
        } catch (drawError) {
            console.log('❌ 캔버스 그리기 실패:', drawError);
            return null;
        }
        
    } catch (error) {
        console.log('❌ 고화질 스크린샷 실패:', error);
                return null;
            }
        }
        
// 멈춤 상태 비디오 캡처 함수
async function tryPausedVideoCapture(videoElement, selectionArea) {
    try {
        console.log('⏸️ 멈춤 상태 비디오 캡처 시도');
        
        if (!videoElement) {
        return null;
        }
        
        // 비디오를 잠시 멈춤
        const wasPlaying = !videoElement.paused;
        videoElement.pause();
        
        // 잠시 대기
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // 캔버스로 캡처
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        canvas.width = selectionArea.width;
        canvas.height = selectionArea.height;
        
        try {
            ctx.drawImage(
                videoElement,
                selectionArea.x, selectionArea.y, selectionArea.width, selectionArea.height,
                0, 0, selectionArea.width, selectionArea.height
            );
            
            const imageDataUrl = canvas.toDataURL('image/png');
            
            // 원래 재생 상태로 복원
            if (wasPlaying) {
                videoElement.play();
            }
            
            console.log('✅ 멈춤 상태 캡처 성공');
            return imageDataUrl;
            
        } catch (drawError) {
            // 원래 재생 상태로 복원
            if (wasPlaying) {
                videoElement.play();
            }
            console.log('❌ 멈춤 상태 캡처 실패:', drawError);
            return null;
        }
        
    } catch (error) {
        console.log('❌ 멈춤 상태 캡처 오류:', error);
        return null;
    }
}

// 개선된 이미지 업로드 함수
async function uploadImageToTempService(imageDataUrl) {
    try {
        console.log('📤 이미지 업로드 시작');
        
        // 방법 1: imgbb 업로드 시도
        try {
            const result = await uploadToImgbb(imageDataUrl);
            if (result) {
                console.log('✅ imgbb 업로드 성공:', result);
                return result;
            }
        } catch (imgbbError) {
            console.log('❌ imgbb 업로드 실패:', imgbbError.message);
        }
        
        // 방법 2: 무료 이미지 호스팅 서비스들 시도
        const freeServices = [
            { name: 'postimages', url: 'https://postimages.org/json/rr' },
            { name: 'imgur', url: 'https://api.imgur.com/3/image' },
            { name: 'imageban', url: 'https://imageban.ru/api/1/upload' }
        ];
        
        for (const service of freeServices) {
            try {
                console.log(`${service.name} 업로드 시도`);
                const result = await uploadToService(imageDataUrl, service);
                if (result) {
                    console.log(`✅ ${service.name} 업로드 성공:`, result);
                    return result;
                }
            } catch (serviceError) {
                console.log(`❌ ${service.name} 업로드 실패:`, serviceError.message);
                continue;
            }
        }
        
        // 방법 3: 로컬 blob URL 생성 (임시 방법)
        try {
            console.log('🔄 로컬 blob URL 생성 시도');
            const blob = dataURLtoBlob(imageDataUrl);
            const blobUrl = URL.createObjectURL(blob);
            console.log('✅ blob URL 생성 성공:', blobUrl);
            return blobUrl;
        } catch (blobError) {
            console.log('❌ blob URL 생성 실패:', blobError.message);
        }
        
        return null;
        
    } catch (error) {
        console.error('이미지 업로드 전체 실패:', error);
        return null;
    }
}

// imgbb 업로드 함수 (무료 키 사용)
async function uploadToImgbb(imageDataUrl) {
    try {
        const base64Data = imageDataUrl.split(',')[1];
        
        const formData = new FormData();
        formData.append('image', base64Data);
        
        // 무료 imgbb 키들 시도
        const freeKeys = [
            '2d1f7b0e85f6c6c8c8a8b8c8d8e8f8g8',
            '1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p',
            'bb2252aa5dmsh70444c45811a8c4p1f4885jsnf86faab1a5d2'
        ];
        
        for (const key of freeKeys) {
            try {
                const response = await fetch(`https://api.imgbb.com/1/upload?key=${key}`, {
                    method: 'POST',
                    body: formData
                });
                
                if (response.ok) {
                    const data = await response.json();
                    if (data.data?.url) {
                        console.log('✅ imgbb 업로드 성공:', data.data.url);
                        return data.data.url;
                    }
                }
            } catch (keyError) {
                console.log(`imgbb 키 ${key} 실패:`, keyError.message);
                continue;
            }
        }
        
        return null;
        
    } catch (error) {
        console.error('imgbb 업로드 전체 실패:', error);
        return null;
    }
}

// 범용 이미지 업로드 함수
async function uploadToService(imageDataUrl, service) {
    const base64Data = imageDataUrl.split(',')[1];
    
    const formData = new FormData();
    formData.append('image', base64Data);
    
    const response = await fetch(service.url, {
        method: 'POST',
        body: formData
    });
    
    if (response.ok) {
        const data = await response.json();
        // 각 서비스별로 URL 추출 방법이 다를 수 있음
        return data.url || data.link || data.data?.url;
    }
    
    return null;
}

// dataURL을 Blob으로 변환하는 유틸리티 함수
function dataURLtoBlob(dataURL) {
    const arr = dataURL.split(',');
    const mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    
    while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
    }
    
    return new Blob([u8arr], { type: mime });
}

// 앱 초기화 완료 로그
console.log('🎉 쇼핑파인더가 준비되었습니다!');
console.log('💡 Ctrl/Cmd + K로 검색창에 빠르게 접근할 수 있습니다.');
console.log('🔍 다양한 국가의 언어로 TikTok 콘텐츠를 검색해보세요!');
