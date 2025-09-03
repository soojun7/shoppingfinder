# 🗄️ Supabase 설정 가이드

쇼핑파인더 앱에서 Supabase를 사용한 실제 계정 관리 시스템을 구축하는 방법입니다.

## 📋 목차
1. [Supabase 프로젝트 생성](#1-supabase-프로젝트-생성)
2. [데이터베이스 테이블 생성](#2-데이터베이스-테이블-생성)
3. [Authentication 설정](#3-authentication-설정)
4. [API 키 설정](#4-api-키-설정)
5. [앱 연동](#5-앱-연동)
6. [테스트](#6-테스트)

---

## 1. Supabase 프로젝트 생성

### 1.1 계정 생성 및 로그인
1. [https://supabase.com](https://supabase.com) 방문
2. "Start your project" 클릭
3. GitHub 계정으로 로그인 (권장)

### 1.2 새 프로젝트 생성
1. 대시보드에서 "New Project" 클릭
2. 프로젝트 정보 입력:
   - **Name**: `shopping-finder`
   - **Database Password**: 강력한 비밀번호 설정
   - **Region**: `Northeast Asia (Seoul)` 선택 (한국 사용자용)
3. "Create new project" 클릭
4. 프로젝트 생성 완료까지 1-2분 대기

---

## 2. 데이터베이스 테이블 생성

### 2.1 SQL Editor 접근
1. 좌측 메뉴에서 "SQL Editor" 클릭
2. "New query" 클릭

### 2.2 테이블 생성 SQL 실행
다음 SQL을 복사해서 실행하세요:

```sql
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
```

### 2.3 보안 정책 (RLS) 설정
```sql
-- RLS (Row Level Security) 활성화
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;

-- 사용자는 자신의 데이터만 접근 가능
CREATE POLICY "Users can view own profile" ON user_profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON user_profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON user_profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can manage own favorites" ON user_favorites
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own search history" ON search_history
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own credit transactions" ON credit_transactions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert credit transactions" ON credit_transactions
    FOR INSERT WITH CHECK (true);
```

### 2.4 자동 업데이트 트리거
```sql
-- updated_at 자동 업데이트 함수
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
```

---

## 3. Authentication 설정

### 3.1 기본 설정
1. 좌측 메뉴에서 "Authentication" 클릭
2. "Settings" 탭 선택
3. 다음 설정 확인:
   - **Site URL**: `http://localhost:3000` (개발용)
   - **Redirect URLs**: `http://localhost:3000/**`

### 3.2 이메일 설정 (선택사항)
1. "Email" 탭에서 이메일 템플릿 커스터마이징 가능
2. 개발 중에는 "Enable email confirmations" 비활성화 권장

### 3.3 소셜 로그인 설정 (선택사항)
1. "Providers" 탭에서 원하는 제공자 활성화
2. Google, GitHub, 카카오 등 설정 가능

---

## 4. API 키 설정

### 4.1 API 키 복사
1. 좌측 메뉴에서 "Settings" > "API" 클릭
2. 다음 정보 복사:
   - **Project URL**: `https://your-project-id.supabase.co`
   - **anon public key**: `eyJ...` (긴 JWT 토큰)

### 4.2 앱에 키 설정
`script.js` 파일에서 다음 부분을 수정하세요:

```javascript
// Supabase 설정
const SUPABASE_URL = 'https://your-project-id.supabase.co'; // 실제 URL로 변경
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'; // 실제 키로 변경
```

---

## 5. 앱 연동

### 5.1 설정 확인
브라우저 개발자 도구 콘솔에서 다음 메시지 확인:
- ✅ `Supabase 설정이 완료되었습니다!`
- ❌ `Supabase 초기화 실패` (설정 오류)

### 5.2 기능 테스트
1. **회원가입**: 새 계정 생성
2. **로그인**: 생성한 계정으로 로그인
3. **프로필**: 사용자 정보 표시 확인
4. **크레딧**: 크레딧 시스템 동작 확인

---

## 6. 테스트

### 6.1 데이터베이스 확인
1. Supabase 대시보드 > "Table Editor"
2. `user_profiles` 테이블에서 생성된 사용자 확인
3. `credit_transactions` 테이블에서 거래 내역 확인

### 6.2 인증 상태 확인
1. Supabase 대시보드 > "Authentication" > "Users"
2. 가입한 사용자 목록 확인
3. 이메일 인증 상태 확인

---

## 🔧 문제 해결

### 일반적인 오류들

#### 1. "Invalid API key" 오류
- API 키가 올바른지 확인
- 프로젝트 URL이 정확한지 확인
- 키에 불필요한 공백이 없는지 확인

#### 2. "Row Level Security" 오류
- RLS 정책이 올바르게 설정되었는지 확인
- 사용자 ID가 올바르게 전달되는지 확인

#### 3. "CORS" 오류
- Site URL이 올바르게 설정되었는지 확인
- Redirect URLs에 현재 도메인이 포함되어 있는지 확인

#### 4. 테이블 접근 오류
- 테이블이 올바르게 생성되었는지 확인
- RLS 정책이 활성화되어 있는지 확인

### 디버깅 팁

1. **브라우저 콘솔 확인**: 자세한 오류 메시지 확인
2. **Supabase 로그**: 대시보드에서 실시간 로그 확인
3. **네트워크 탭**: API 요청/응답 확인

---

## 🚀 프로덕션 배포

### 환경변수 설정
```bash
# .env 파일
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### 보안 설정
1. **Site URL 업데이트**: 실제 도메인으로 변경
2. **RLS 정책 검토**: 보안 정책 재확인
3. **API 키 보호**: 환경변수로 관리

---

## 📚 추가 자료

- [Supabase 공식 문서](https://supabase.com/docs)
- [JavaScript 클라이언트 가이드](https://supabase.com/docs/reference/javascript)
- [Row Level Security 가이드](https://supabase.com/docs/guides/auth/row-level-security)
- [Authentication 가이드](https://supabase.com/docs/guides/auth)

---

## 💡 팁

1. **개발 중**: 이메일 인증 비활성화로 빠른 테스트
2. **프로덕션**: 이메일 인증 활성화로 보안 강화
3. **백업**: 정기적인 데이터베이스 백업 설정
4. **모니터링**: Supabase 대시보드에서 사용량 모니터링

이제 Supabase를 통한 완전한 계정 관리 시스템이 준비되었습니다! 🎉
