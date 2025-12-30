# BigShort 설정 가이드

## 1. Supabase 프로젝트 설정

### 1.1 Supabase 프로젝트 생성
1. https://supabase.com 접속
2. 새 프로젝트 생성
3. 프로젝트 이름: `bigshort` (또는 원하는 이름)
4. 데이터베이스 비밀번호 설정

### 1.2 데이터베이스 스키마 생성
Supabase Dashboard > SQL Editor에서 다음 파일 순서대로 실행:

```bash
# 1. 테이블 및 인덱스 생성
supabase/migrations/001_initial_schema.sql

# 2. 테스트 데이터 삽입 (선택사항)
supabase/migrations/002_seed_data.sql
```

### 1.3 환경 변수 설정
`.env.local` 파일 생성:

```bash
cp .env.local.example .env.local
```

Supabase Dashboard > Settings > API에서 값 복사:
- `NEXT_PUBLIC_SUPABASE_URL`: Project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: anon public key

## 2. 하옥션 크롤러 설정

### 2.1 환경 변수 추가
`.env.local`에 추가:

```env
HAUCTION_EMAIL=kakaa22@naver.com
HAUCTION_PASSWORD=your_password
```

### 2.2 크롤러 실행
```bash
npm run crawl
```

## 3. 국토부 실거래 API 설정

### 3.1 API 키 발급
1. https://www.data.go.kr 접속
2. "국토교통부_아파트매매 실거래 상세 자료" 검색
3. API 활용 신청
4. 발급받은 키를 `.env.local`에 추가:

```env
MOLIT_API_KEY=your_api_key
```

## 4. 개발 서버 실행

```bash
npm run dev
```

http://localhost:3000 접속

## 5. Vercel 배포

### 5.1 Vercel CLI 설치
```bash
npm i -g vercel
```

### 5.2 배포
```bash
vercel
```

### 5.3 환경 변수 설정
Vercel Dashboard > Settings > Environment Variables에서 설정:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `HAUCTION_EMAIL`
- `HAUCTION_PASSWORD`
- `MOLIT_API_KEY`

## 6. 프로젝트 구조

```
bigshort/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   └── auctions/route.ts    # 경매물건 API
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx                  # 메인 대시보드
│   ├── components/
│   │   ├── AuctionCard.tsx          # 물건 카드
│   │   ├── BottomNav.tsx            # 하단 네비게이션
│   │   ├── FilterPanel.tsx          # 필터 패널
│   │   └── index.ts
│   ├── lib/
│   │   ├── calculator.ts            # 수익 계산기
│   │   ├── sampleData.ts            # 샘플 데이터
│   │   ├── supabase.ts              # Supabase 클라이언트
│   │   └── utils.ts                 # 유틸 함수
│   └── types/
│       └── auction.ts               # TypeScript 타입
├── supabase/
│   └── migrations/
│       ├── 001_initial_schema.sql   # DB 스키마
│       └── 002_seed_data.sql        # 시드 데이터
├── scripts/
│   └── crawler.ts                   # 하옥션 크롤러
└── package.json
```

## 7. 필터링 알고리즘

6단계 필터링:
1. **기본 타겟팅**: 지방 대형 아파트 (전용 59㎡ 이상)
2. **입찰 차수**: 신건~3회 유찰 물건
3. **유동성**: 거래 회전율 3% 이상
4. **실투자금**: 최저가 기준 5000만원 이하
5. **권리 안전**: 인수사항 없는 물건
6. **특수물건 배제**: 지분매각, 토지별도등기 제외
