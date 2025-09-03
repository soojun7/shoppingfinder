// Supabase 설정 파일
// 실제 사용 시 환경변수나 별도 설정 파일로 관리하세요

const SUPABASE_CONFIG = {
    // 실제 Supabase 프로젝트 URL로 변경하세요
    url: 'https://your-project-id.supabase.co',
    
    // 실제 Supabase anon key로 변경하세요
    anonKey: 'your-anon-key-here',
    
    // 테이블 설정
    tables: {
        userProfiles: 'user_profiles',
        favorites: 'user_favorites',
        searchHistory: 'search_history',
        creditTransactions: 'credit_transactions'
    }
};

// Supabase 프로젝트 설정 가이드
const SETUP_GUIDE = {
    step1: {
        title: "1. Supabase 프로젝트 생성",
        description: "https://supabase.com 에서 새 프로젝트를 생성하세요",
        actions: [
            "Supabase 대시보드에 로그인",
            "'New Project' 클릭",
            "프로젝트 이름과 비밀번호 설정",
            "데이터베이스 지역 선택"
        ]
    },
    
    step2: {
        title: "2. 데이터베이스 테이블 생성",
        description: "SQL Editor에서 다음 테이블들을 생성하세요",
        sql: `
-- 사용자 프로필 테이블
CREATE TABLE user_profiles (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    email TEXT NOT NULL,
    full_name TEXT,
    display_name TEXT,
    credits INTEGER DEFAULT 1250,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 즐겨찾기 테이블
CREATE TABLE user_favorites (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    video_id TEXT NOT NULL,
    video_data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 검색 기록 테이블
CREATE TABLE search_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    query TEXT NOT NULL,
    country_code TEXT,
    results_count INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 크레딧 거래 내역 테이블
CREATE TABLE credit_transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL,
    transaction_type TEXT NOT NULL, -- 'charge', 'deduct', 'bonus'
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS (Row Level Security) 정책 설정
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;

-- 사용자는 자신의 데이터만 접근 가능
CREATE POLICY "Users can view own profile" ON user_profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON user_profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can view own favorites" ON user_favorites
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own search history" ON search_history
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own credit transactions" ON credit_transactions
    FOR SELECT USING (auth.uid() = user_id);

-- 트리거 함수: updated_at 자동 업데이트
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 트리거 설정
CREATE TRIGGER update_user_profiles_updated_at
    BEFORE UPDATE ON user_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
        `
    },
    
    step3: {
        title: "3. Authentication 설정",
        description: "Authentication 탭에서 설정을 구성하세요",
        actions: [
            "Settings > Authentication 이동",
            "Email confirmations 설정 (선택사항)",
            "소셜 로그인 제공자 설정 (Google, 카카오 등)",
            "Site URL 설정: http://localhost:3000 (개발용)"
        ]
    },
    
    step4: {
        title: "4. API 키 복사",
        description: "Settings > API에서 키를 복사하세요",
        actions: [
            "Project URL 복사",
            "anon/public key 복사",
            "supabase-config.js 파일의 SUPABASE_CONFIG 업데이트"
        ]
    },
    
    step5: {
        title: "5. 환경변수 설정 (프로덕션용)",
        description: "보안을 위해 환경변수 사용을 권장합니다",
        example: `
// .env 파일
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here

// JavaScript에서 사용
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
        `
    }
};

// 설정 확인 함수
function validateSupabaseConfig() {
    const issues = [];
    
    if (SUPABASE_CONFIG.url === 'https://your-project-id.supabase.co') {
        issues.push('Supabase URL이 기본값입니다. 실제 프로젝트 URL로 변경해주세요.');
    }
    
    if (SUPABASE_CONFIG.anonKey === 'your-anon-key-here') {
        issues.push('Supabase anon key가 기본값입니다. 실제 키로 변경해주세요.');
    }
    
    if (issues.length > 0) {
        console.warn('⚠️ Supabase 설정 문제:', issues);
        console.log('📖 설정 가이드:', SETUP_GUIDE);
        return false;
    }
    
    console.log('✅ Supabase 설정이 완료되었습니다!');
    return true;
}

// 개발 모드에서 설정 확인
if (typeof window !== 'undefined') {
    validateSupabaseConfig();
}

// 설정 내보내기
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SUPABASE_CONFIG, SETUP_GUIDE };
}
