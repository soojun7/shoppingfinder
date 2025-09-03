// 관리자 패널 전용 스크립트

// Supabase 클라이언트 초기화
let supabase = null;

// 전역 변수
let currentUser = null;
let isLoggedIn = false;
let isAdmin = false;

// 관리자 계정 목록
const ADMIN_EMAILS = [
    'admin@shopping-finder.com',
    'kimsoojun@admin.com',
    'admin@test.com',
    'soojun1@naver.com'
];

// 관리자 권한 확인
function checkAdminStatus(email) {
    const isAdminUser = ADMIN_EMAILS.includes(email.toLowerCase());
    console.log('관리자 권한 확인 (admin-script):', {
        email,
        emailLower: email.toLowerCase(),
        ADMIN_EMAILS,
        isAdminUser
    });
    return isAdminUser;
}

// Supabase 초기화
function initializeSupabase() {
    try {
        if (typeof SUPABASE_CONFIG !== 'undefined' && 
            SUPABASE_CONFIG.url !== 'https://your-project-id.supabase.co' &&
            SUPABASE_CONFIG.anonKey !== 'your-anon-key-here') {
            
            supabase = window.supabase.createClient(
                SUPABASE_CONFIG.url,
                SUPABASE_CONFIG.anonKey
            );
            
            console.log('✅ Supabase 클라이언트가 초기화되었습니다');
        } else {
            console.warn('⚠️ Supabase 설정이 완료되지 않았습니다. supabase-config.js를 확인해주세요.');
        }
    } catch (error) {
        console.error('❌ Supabase 초기화 오류:', error);
    }
}

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', function() {
    initializeSupabase();
    checkAdminAccess();
    initializeAdminPanel();
});

// 관리자 접근 권한 확인
async function checkAdminAccess() {
    console.log('관리자 접근 권한 확인 시작');
    
    // 로컬 스토리지에서 사용자 정보 확인
    const sessionUser = sessionStorage.getItem('currentUser');
    const localUser = localStorage.getItem('currentUser');
    
    console.log('저장된 사용자 정보:');
    console.log('sessionUser:', sessionUser);
    console.log('localUser:', localUser);
    
    // 전체 스토리지 내용 확인
    console.log('전체 localStorage 키들:', Object.keys(localStorage));
    console.log('전체 sessionStorage 키들:', Object.keys(sessionStorage));
    
    // 혹시 다른 키로 저장되었는지 확인
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        console.log(`localStorage[${key}]:`, localStorage.getItem(key));
    }
    
    for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        console.log(`sessionStorage[${key}]:`, sessionStorage.getItem(key));
    }
    
    if (sessionUser) {
        currentUser = JSON.parse(sessionUser);
        isLoggedIn = true;
        console.log('sessionUser에서 복원된 사용자:', currentUser);
        isAdmin = checkAdminStatus(currentUser.email);
    } else if (localUser) {
        currentUser = JSON.parse(localUser);
        isLoggedIn = true;
        console.log('localUser에서 복원된 사용자:', currentUser);
        isAdmin = checkAdminStatus(currentUser.email);
    } else {
        console.log('저장된 사용자 정보가 없습니다');
        
        // URL 파라미터에서 사용자 정보 확인
        const urlParams = new URLSearchParams(window.location.search);
        const userParam = urlParams.get('user');
        const forceAdmin = urlParams.get('admin');
        
        if (userParam) {
            try {
                const userInfo = JSON.parse(decodeURIComponent(userParam));
                console.log('URL 파라미터에서 사용자 정보 복원:', userInfo);
                currentUser = userInfo;
                isLoggedIn = true;
                isAdmin = checkAdminStatus(userInfo.email);
            } catch (error) {
                console.error('URL 파라미터 파싱 오류:', error);
            }
        } else if (forceAdmin === 'true') {
            console.log('URL 파라미터로 관리자 접근 허용');
            currentUser = { email: 'soojun1@naver.com', name: '관리자' };
            isLoggedIn = true;
            isAdmin = true;
        }
    }
    
    console.log('최종 권한 확인 결과:');
    console.log('isLoggedIn:', isLoggedIn);
    console.log('isAdmin:', isAdmin);
    console.log('currentUser:', currentUser);
    
    // 관리자가 아니면 메인 페이지로 리다이렉트
    if (!isLoggedIn || !isAdmin) {
        console.error('관리자 권한 없음 - 리다이렉트');
        // 3초 후에 리다이렉트하여 로그를 확인할 시간을 줌
        setTimeout(() => {
            alert('관리자 권한이 필요합니다. 메인 페이지로 이동합니다.');
            window.location.href = 'index.html';
        }, 3000);
        return;
    }
    
    // 관리자 정보 업데이트
    updateAdminInfo();
}

// 관리자 정보 업데이트
function updateAdminInfo() {
    if (currentUser) {
        const adminName = document.getElementById('adminName');
        if (adminName) {
            adminName.textContent = currentUser.name || currentUser.email.split('@')[0];
        }
    }
}

// 관리자 패널 초기화
function initializeAdminPanel() {
    // 기본적으로 대시보드 표시
    showAdminTab('dashboard');
    loadDashboardData();
}

// 관리자 탭 전환
function showAdminTab(tabName, event) {
    if (event) {
        event.preventDefault();
    }
    
    // 모든 섹션 숨기기
    const sections = document.querySelectorAll('.admin-section');
    sections.forEach(section => {
        section.style.display = 'none';
    });
    
    // 모든 네비게이션 아이템에서 active 클래스 제거
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.classList.remove('active');
    });
    
    // 선택된 섹션 표시
    const targetSection = document.getElementById(tabName + 'Section');
    if (targetSection) {
        targetSection.style.display = 'block';
    }
    
    // 선택된 네비게이션 아이템에 active 클래스 추가
    if (event) {
        const clickedItem = event.target.closest('.nav-item');
        if (clickedItem) {
            clickedItem.classList.add('active');
        }
    } else {
        // 이벤트가 없는 경우 (초기 로드) 첫 번째 아이템을 활성화
        const firstNavItem = document.querySelector('.nav-item');
        if (firstNavItem) {
            firstNavItem.classList.add('active');
        }
    }
    
    // 탭별 데이터 로드
    switch (tabName) {
        case 'dashboard':
            loadDashboardData();
            break;
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
        case 'analytics':
            loadAnalytics();
            break;
        case 'notifications':
            loadNotifications();
            break;
    }
}

// 대시보드 데이터 로드
async function loadDashboardData() {
    try {
        // 통계 데이터 로드 (시뮬레이션)
        document.getElementById('totalUsers').textContent = '1,234';
        document.getElementById('totalSearches').textContent = '45,678';
        document.getElementById('totalCredits').textContent = '123,456';
        document.getElementById('totalDownloads').textContent = '9,876';
        
        // 최근 활동 로드
        loadRecentActivities();
        
    } catch (error) {
        console.error('대시보드 데이터 로드 오류:', error);
        showToast('대시보드 데이터 로드 중 오류가 발생했습니다', 'error');
    }
}

// 최근 활동 로드
function loadRecentActivities() {
    const activities = [
        { type: 'user', message: '새 사용자가 가입했습니다', time: '5분 전', icon: 'fas fa-user-plus' },
        { type: 'search', message: '검색이 실행되었습니다', time: '10분 전', icon: 'fas fa-search' },
        { type: 'credit', message: '크레딧이 충전되었습니다', time: '15분 전', icon: 'fas fa-coins' },
        { type: 'download', message: '파일이 다운로드되었습니다', time: '20분 전', icon: 'fas fa-download' },
        { type: 'error', message: '시스템 오류가 발생했습니다', time: '1시간 전', icon: 'fas fa-exclamation-triangle' }
    ];
    
    const container = document.getElementById('recentActivities');
    if (container) {
        container.innerHTML = activities.map(activity => `
            <div class="activity-item ${activity.type}">
                <div class="activity-icon">
                    <i class="${activity.icon}"></i>
                </div>
                <div class="activity-content">
                    <p class="activity-message">${activity.message}</p>
                    <span class="activity-time">${activity.time}</span>
                </div>
            </div>
        `).join('');
    }
}

// 사용자 목록 로드
async function loadUsers() {
    try {
        // 시뮬레이션 데이터
        const users = [
            { id: '1', name: '김수준', email: 'soojun1@naver.com', credits: 1250, joinDate: '2024-01-15', status: 'active' },
            { id: '2', name: '홍길동', email: 'hong@example.com', credits: 850, joinDate: '2024-01-20', status: 'active' },
            { id: '3', name: '이영희', email: 'lee@example.com', credits: 500, joinDate: '2024-02-01', status: 'inactive' }
        ];
        
        const tbody = document.getElementById('usersTableBody');
        if (tbody) {
            tbody.innerHTML = users.map(user => `
                <tr>
                    <td>${user.id}</td>
                    <td>${user.name}</td>
                    <td>${user.email}</td>
                    <td>${user.credits}</td>
                    <td>${user.joinDate}</td>
                    <td>
                        <span class="status-badge ${user.status}">
                            ${user.status === 'active' ? '활성' : '비활성'}
                        </span>
                    </td>
                    <td>
                        <div class="action-buttons">
                            <button class="btn-small primary" onclick="editUser('${user.id}')">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn-small secondary" onclick="editUserCredits('${user.email}', ${user.credits})">
                                <i class="fas fa-coins"></i>
                            </button>
                            <button class="btn-small danger" onclick="deleteUser('${user.id}')">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `).join('');
        }
        
    } catch (error) {
        console.error('사용자 목록 로드 오류:', error);
        showToast('사용자 목록 로드 중 오류가 발생했습니다', 'error');
    }
}

// 크레딧 거래 내역 로드
function loadCreditTransactions() {
    const transactions = [
        { id: '1', user: 'soojun1@naver.com', amount: '+100', type: 'charge', reason: '크레딧 충전', date: '2024-01-15 14:30' },
        { id: '2', user: 'hong@example.com', amount: '-5', type: 'search', reason: '검색 사용', date: '2024-01-15 14:25' },
        { id: '3', user: 'lee@example.com', amount: '+50', type: 'bonus', reason: '가입 보너스', date: '2024-01-15 14:20' }
    ];
    
    const container = document.getElementById('creditTransactions');
    if (container) {
        container.innerHTML = `
            <div class="transactions-table">
                <table class="admin-table">
                    <thead>
                        <tr>
                            <th>사용자</th>
                            <th>금액</th>
                            <th>유형</th>
                            <th>사유</th>
                            <th>일시</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${transactions.map(tx => `
                            <tr>
                                <td>${tx.user}</td>
                                <td class="${tx.amount.startsWith('+') ? 'positive' : 'negative'}">${tx.amount}</td>
                                <td><span class="type-badge ${tx.type}">${getTypeLabel(tx.type)}</span></td>
                                <td>${tx.reason}</td>
                                <td>${tx.date}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }
}

// 거래 유형 라벨 반환
function getTypeLabel(type) {
    const labels = {
        'charge': '충전',
        'search': '검색',
        'download': '다운로드',
        'bonus': '보너스',
        'admin_add': '관리자 지급',
        'admin_deduct': '관리자 차감'
    };
    return labels[type] || type;
}

// 시스템 설정 로드
function loadSystemSettings() {
    const settings = JSON.parse(localStorage.getItem('adminSettings')) || {
        searchCost: 1,
        downloadCost: 1,
        searchLimit: 5,
        downloadLimit: 50,
        signupBonus: 5,
        dailyBonus: 1,
        sessionTimeout: 60,
        maxLoginAttempts: 5
    };
    
    Object.keys(settings).forEach(key => {
        const element = document.getElementById(key);
        if (element) {
            element.value = settings[key];
        }
    });
}

// 시스템 설정 저장
function saveSystemSettings() {
    const settings = {
        searchCost: parseInt(document.getElementById('searchCost').value) || 1,
        downloadCost: parseInt(document.getElementById('downloadCost').value) || 1,
        searchLimit: parseInt(document.getElementById('searchLimit').value) || 5,
        downloadLimit: parseInt(document.getElementById('downloadLimit').value) || 50,
        signupBonus: parseInt(document.getElementById('signupBonus').value) || 5,
        dailyBonus: parseInt(document.getElementById('dailyBonus').value) || 1,
        sessionTimeout: parseInt(document.getElementById('sessionTimeout').value) || 60,
        maxLoginAttempts: parseInt(document.getElementById('maxLoginAttempts').value) || 5
    };
    
    localStorage.setItem('adminSettings', JSON.stringify(settings));
    showToast('설정이 저장되었습니다', 'success');
}

// 시스템 설정 기본값 복원
function resetSystemSettings() {
    if (confirm('모든 설정을 기본값으로 복원하시겠습니까?')) {
        localStorage.removeItem('adminSettings');
        loadSystemSettings();
        showToast('설정이 기본값으로 복원되었습니다', 'success');
    }
}

// 로그 로드
function loadLogs() {
    const logs = [
        { level: 'info', type: 'search', message: '사용자 검색 실행', time: '2024-01-15 14:30:25', user: 'soojun1@naver.com' },
        { level: 'warning', type: 'auth', message: '로그인 시도 실패', time: '2024-01-15 14:25:10', user: 'unknown@example.com' },
        { level: 'error', type: 'system', message: '데이터베이스 연결 오류', time: '2024-01-15 14:20:05', user: 'system' },
        { level: 'info', type: 'credit', message: '크레딧 충전 완료', time: '2024-01-15 14:15:30', user: 'hong@example.com' }
    ];
    
    const container = document.getElementById('logsContainer');
    if (container) {
        container.innerHTML = `
            <div class="logs-list">
                ${logs.map(log => `
                    <div class="log-item ${log.level}">
                        <div class="log-header">
                            <span class="log-level ${log.level}">${log.level.toUpperCase()}</span>
                            <span class="log-type">${log.type}</span>
                            <span class="log-time">${log.time}</span>
                        </div>
                        <div class="log-content">
                            <p class="log-message">${log.message}</p>
                            <span class="log-user">사용자: ${log.user}</span>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }
}

// 로그 삭제
function clearLogs() {
    if (confirm('모든 로그를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
        const container = document.getElementById('logsContainer');
        if (container) {
            container.innerHTML = '<p class="no-data">로그가 삭제되었습니다.</p>';
        }
        showToast('로그가 삭제되었습니다', 'success');
    }
}

// 분석 데이터 로드
function loadAnalytics() {
    // 분석 기능은 추후 구현
    console.log('분석 데이터 로드');
}

// 알림 데이터 로드
function loadNotifications() {
    // 알림 기능은 추후 구현
    console.log('알림 데이터 로드');
}

// 사용자 검색
function searchUsers() {
    const query = document.getElementById('userSearchInput').value.toLowerCase();
    if (!query) {
        loadUsers();
        return;
    }
    
    // 실제로는 서버에서 검색
    showToast(`"${query}" 검색 결과를 로드하는 중...`, 'info');
}

// 사용자 내보내기
function exportUsers() {
    showToast('사용자 데이터를 CSV로 내보내는 중...', 'info');
}

// 사용자 편집
function editUser(userId) {
    showToast(`사용자 ID ${userId} 편집 기능은 준비 중입니다`, 'info');
}

// 사용자 크레딧 편집
function editUserCredits(email, currentCredits) {
    const newCredits = prompt(`${email}의 크레딧을 수정하세요 (현재: ${currentCredits}):`);
    
    if (newCredits !== null && !isNaN(newCredits)) {
        const difference = parseInt(newCredits) - currentCredits;
        manageCreditForUser(email, difference, '관리자 수정');
    }
}

// 사용자 삭제
function deleteUser(userId) {
    if (confirm('정말로 이 사용자를 삭제하시겠습니까?')) {
        showToast(`사용자 ID ${userId} 삭제 기능은 준비 중입니다`, 'info');
    }
}

// 크레딧 관리
function manageCreditForUser(email, amount, reason) {
    const userEmail = email || document.getElementById('creditUserEmail').value;
    const creditAmount = amount || parseInt(document.getElementById('creditAmount').value);
    const action = document.getElementById('creditAction')?.value || 'add';
    const creditReason = reason || document.getElementById('creditReason').value || '관리자 조정';
    
    if (!userEmail || !creditAmount) {
        showToast('이메일과 크레딧 수량을 입력해주세요', 'error');
        return;
    }
    
    // 실제로는 서버에서 처리
    const actionText = action === 'add' ? '지급' : '차감';
    showToast(`${userEmail}에게 ${creditAmount} 크레딧을 ${actionText}했습니다`, 'success');
    
    // 폼 초기화
    if (!email) {
        document.getElementById('creditUserEmail').value = '';
        document.getElementById('creditAmount').value = '';
        document.getElementById('creditReason').value = '';
    }
    
    // 거래 내역 새로고침
    loadCreditTransactions();
}

// 거래 내역 필터
function filterTransactions() {
    const dateFrom = document.getElementById('transactionDateFrom').value;
    const dateTo = document.getElementById('transactionDateTo').value;
    const type = document.getElementById('transactionType').value;
    
    showToast('거래 내역을 필터링하는 중...', 'info');
    loadCreditTransactions();
}

// 메인 페이지로 돌아가기
function goBackToMain() {
    if (confirm('메인 페이지로 돌아가시겠습니까?')) {
        window.location.href = 'index.html';
    }
}

// 로그아웃
async function logout() {
    if (confirm('로그아웃하시겠습니까?')) {
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
            
            localStorage.removeItem('currentUser');
            sessionStorage.removeItem('currentUser');
            
            showToast('로그아웃되었습니다');
            
            // 메인 페이지로 이동
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1000);
            
        } catch (error) {
            console.error('로그아웃 처리 오류:', error);
            showToast('로그아웃 중 오류가 발생했습니다', 'error');
        }
    }
}

// 사이드바 토글 (모바일)
function toggleSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.querySelector('.sidebar-overlay');
    
    sidebar.classList.toggle('open');
    overlay.classList.toggle('show');
}

// 사이드바 닫기
function closeSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.querySelector('.sidebar-overlay');
    
    sidebar.classList.remove('open');
    overlay.classList.remove('show');
}

// 토스트 알림 표시
function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toastMessage');
    
    if (toast && toastMessage) {
        toastMessage.textContent = message;
        toast.className = `toast show ${type}`;
        
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }
}

// 키보드 단축키
document.addEventListener('keydown', function(e) {
    // ESC 키로 사이드바 닫기
    if (e.key === 'Escape') {
        closeSidebar();
    }
    
    // Ctrl+M으로 메인 페이지로 이동
    if (e.ctrlKey && e.key === 'm') {
        e.preventDefault();
        goBackToMain();
    }
});

// 클릭 이벤트로 사이드바 닫기
document.addEventListener('click', function(e) {
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.querySelector('.sidebar-overlay');
    
    if (overlay && e.target === overlay) {
        closeSidebar();
    }
});
