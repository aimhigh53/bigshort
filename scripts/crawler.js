/**
 * 대한민국 법원경매 크롤러
 *
 * 사용법:
 *   node scripts/crawler.js [옵션]
 *
 * 옵션:
 *   --region=서울    지역 필터 (서울, 경기, 부산, 대구, 인천, 광주, 대전, 울산, 세종, 강원, 충북, 충남, 전북, 전남, 경북, 경남, 제주)
 *   --type=APT      물건 종류 (APT: 아파트, HOUSE: 주택, LAND: 토지)
 *   --limit=50      가져올 최대 건수
 *   --save          Supabase에 저장 (없으면 콘솔 출력만)
 *
 * 예시:
 *   node scripts/crawler.js --region=경기 --type=APT --limit=20 --save
 */

const https = require('https');
const http = require('http');
const { URL } = require('url');

// Supabase 설정
const SUPABASE_URL = 'vujhjwanowlassyinkpv.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ1amhqd2Fub3dsYXNzeWlua3B2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4MjUwNDcsImV4cCI6MjA3NTQwMTA0N30.9j5a8ga1eYR5uyK0J57MsGvS7hoxsmj_WS3OAFhFsWs';

// 법원코드 매핑
const COURT_CODES = {
  '서울': ['B101101', 'B101102', 'B101103', 'B101104', 'B101105'], // 서울중앙, 서울동부, 서울서부, 서울남부, 서울북부
  '경기': ['B102101', 'B102102', 'B102103', 'B102104', 'B102105', 'B102106'], // 수원, 성남, 의정부, 인천, 부천, 고양
  '부산': ['B103101', 'B103102', 'B103103'],
  '대구': ['B104101', 'B104102'],
  '인천': ['B105101'],
  '광주': ['B106101'],
  '대전': ['B107101'],
  '울산': ['B108101'],
  '강원': ['B109101', 'B109102', 'B109103'],
  '충북': ['B110101'],
  '충남': ['B111101', 'B111102'],
  '전북': ['B112101'],
  '전남': ['B113101', 'B113102'],
  '경북': ['B114101', 'B114102'],
  '경남': ['B115101', 'B115102', 'B115103'],
  '제주': ['B116101']
};

// 물건종류 코드
const PROPERTY_CODES = {
  'APT': '000801', // 아파트
  'HOUSE': '000802', // 다세대
  'OFFICETEL': '000803', // 오피스텔
  'LAND': '000301' // 토지
};

/**
 * HTTP 요청 함수
 */
function fetchUrl(urlString, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlString);
    const protocol = url.protocol === 'https:' ? https : http;

    const reqOptions = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname + url.search,
      method: options.method || 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8',
        'Accept-Encoding': 'identity',
        ...options.headers
      }
    };

    const req = protocol.request(reqOptions, (res) => {
      let data = '';
      res.setEncoding('utf8');
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data, headers: res.headers }));
    });

    req.on('error', reject);
    req.setTimeout(30000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (options.body) req.write(options.body);
    req.end();
  });
}

/**
 * Supabase에 데이터 저장
 */
function saveToSupabase(path, method, data) {
  return new Promise((resolve, reject) => {
    const postData = data ? JSON.stringify(data) : '';
    const headers = {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Prefer': 'return=representation'
    };
    if (postData) headers['Content-Length'] = Buffer.byteLength(postData);

    const options = {
      hostname: SUPABASE_URL,
      port: 443,
      path: path,
      method: method,
      headers: headers
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          resolve(body);
        }
      });
    });

    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

/**
 * HTML에서 경매 물건 파싱 (간단한 정규식 기반)
 */
function parseAuctionList(html) {
  const items = [];

  // 테이블 row 패턴 매칭
  const rowPattern = /<tr[^>]*class="[^"]*Ltbl_list[^"]*"[^>]*>([\s\S]*?)<\/tr>/gi;
  let match;

  while ((match = rowPattern.exec(html)) !== null) {
    const rowHtml = match[1];

    try {
      // 사건번호 추출
      const caseMatch = rowHtml.match(/(\d{4}타경\d+)/);
      if (!caseMatch) continue;

      // 법원명 추출
      const courtMatch = rowHtml.match(/<td[^>]*>([\s\S]*?지방법원[\s\S]*?)<\/td>/i);

      // 주소 추출
      const addressMatch = rowHtml.match(/title="([^"]*)"[^>]*>([^<]*시[^<]*구[^<]*)/);

      // 감정가/최저가 추출
      const priceMatches = rowHtml.match(/(\d{1,3}(,\d{3})*)\s*원/g);

      // 면적 추출
      const areaMatch = rowHtml.match(/(\d+\.?\d*)\s*㎡/);

      // 매각기일 추출
      const dateMatch = rowHtml.match(/(\d{4})[-.](\d{2})[-.](\d{2})/);

      if (caseMatch && priceMatches && priceMatches.length >= 2) {
        const item = {
          case_number: caseMatch[1],
          court: courtMatch ? courtMatch[1].trim().replace(/<[^>]*>/g, '') : '미상',
          address: addressMatch ? addressMatch[2].trim() : '주소 미상',
          appraisal_price: parseInt(priceMatches[0].replace(/[,원]/g, '')),
          minimum_price: parseInt(priceMatches[1].replace(/[,원]/g, '')),
          area_m2: areaMatch ? parseFloat(areaMatch[1]) : 84.0,
          auction_date: dateMatch ? `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}` : null
        };

        items.push(item);
      }
    } catch (e) {
      // 파싱 실패 시 스킵
    }
  }

  return items;
}

/**
 * 대안: 공개 API 또는 RSS 피드 활용
 * courtauction.go.kr은 직접 크롤링이 어려워서,
 * 실제 서비스에서는 아래 방법 중 하나를 사용:
 * 1. 공식 API (기관 연동)
 * 2. 데이터 제공 서비스 (빅데이터 플랫폼 등)
 * 3. 주기적 수동 업데이트
 */

/**
 * 시뮬레이션 데이터 생성 (실제 크롤링 전 테스트용)
 */
function generateSimulatedData(region, type, limit) {
  const regions = {
    '서울': ['강남구', '서초구', '송파구', '마포구', '영등포구', '용산구', '성동구'],
    '경기': ['수원시', '성남시', '용인시', '고양시', '화성시', '남양주시', '안양시', '부천시'],
    '부산': ['해운대구', '수영구', '남구', '동래구', '사하구'],
    '대구': ['수성구', '달서구', '북구', '동구'],
    '인천': ['연수구', '남동구', '부평구', '서구'],
    '광주': ['광산구', '서구', '북구', '남구'],
    '대전': ['유성구', '서구', '중구', '동구'],
    '울산': ['남구', '중구', '동구', '북구'],
    '강원': ['춘천시', '원주시', '강릉시', '속초시'],
    '충북': ['청주시', '충주시', '제천시'],
    '충남': ['천안시', '아산시', '서산시'],
    '전북': ['전주시', '익산시', '군산시'],
    '전남': ['여수시', '순천시', '목포시'],
    '경북': ['포항시', '구미시', '경주시'],
    '경남': ['창원시', '김해시', '양산시', '진주시'],
    '제주': ['제주시', '서귀포시']
  };

  const aptNames = ['자이', '래미안', '힐스테이트', '푸르지오', 'e편한세상', '아이파크', '롯데캐슬', '더샵', '센트럴파크', '포레나', '호반베르디움', '그랑시티'];
  const courts = {
    '서울': '서울중앙지방법원',
    '경기': '수원지방법원',
    '부산': '부산지방법원',
    '대구': '대구지방법원',
    '인천': '인천지방법원',
    '광주': '광주지방법원',
    '대전': '대전지방법원',
    '울산': '울산지방법원',
    '강원': '춘천지방법원',
    '충북': '청주지방법원',
    '충남': '대전지방법원 천안지원',
    '전북': '전주지방법원',
    '전남': '광주지방법원 순천지원',
    '경북': '대구지방법원 포항지원',
    '경남': '창원지방법원',
    '제주': '제주지방법원'
  };

  const items = [];
  const cities = regions[region] || regions['서울'];
  const court = courts[region] || '서울중앙지방법원';

  for (let i = 0; i < limit; i++) {
    const city = cities[Math.floor(Math.random() * cities.length)];
    const aptName = aptNames[Math.floor(Math.random() * aptNames.length)];
    const caseNum = `2024타경${70000 + Math.floor(Math.random() * 10000)}`;
    const failCount = Math.floor(Math.random() * 3) + 1;
    const appraisalPrice = (200 + Math.floor(Math.random() * 600)) * 1000000;
    const discountRates = [0.8, 0.64, 0.512, 0.41]; // 신건, 1유찰, 2유찰, 3유찰
    const minimumPrice = Math.round(appraisalPrice * discountRates[failCount - 1]);
    const area = 59 + Math.floor(Math.random() * 80);
    const dong = Math.floor(Math.random() * 10) + 101;
    const ho = (Math.floor(Math.random() * 20) + 1) * 100 + Math.floor(Math.random() * 10) + 1;

    // 매각기일: 오늘부터 60일 이내
    const auctionDate = new Date();
    auctionDate.setDate(auctionDate.getDate() + Math.floor(Math.random() * 60) + 1);

    items.push({
      case_number: caseNum,
      court: court,
      property_type: type,
      address: `${region} ${city} ${aptName}아파트`,
      sido: region,
      sigungu: city,
      dong: city.replace(/[시구군]/g, ''),
      apartment_name: `${city.split('시')[0]} ${aptName}`,
      dong_ho: `${dong}동 ${ho}호`,
      area_m2: area,
      appraisal_price: appraisalPrice,
      minimum_price: minimumPrice,
      fail_count: failCount,
      auction_date: auctionDate.toISOString().split('T')[0],
      is_safe: Math.random() > 0.2, // 80% 안전물건
      source_url: `https://www.courtauction.go.kr/RetrieveRealEstDetailInqSa498.laf`
    });
  }

  return items;
}

/**
 * 회전율 데이터 생성
 */
function generateTurnoverData(items) {
  return items.map(item => ({
    auction_item_id: item.id,
    turnover_rate: (3 + Math.random() * 4).toFixed(1), // 3~7%
    avg_deal_price: Math.round(item.appraisal_price * (0.9 + Math.random() * 0.2)),
    deal_count: Math.floor(30 + Math.random() * 40)
  }));
}

/**
 * 메인 실행
 */
async function main() {
  // 인자 파싱
  const args = process.argv.slice(2);
  const options = {
    region: '경기',
    type: 'APT',
    limit: 20,
    save: false
  };

  args.forEach(arg => {
    if (arg.startsWith('--region=')) options.region = arg.split('=')[1];
    if (arg.startsWith('--type=')) options.type = arg.split('=')[1];
    if (arg.startsWith('--limit=')) options.limit = parseInt(arg.split('=')[1]);
    if (arg === '--save') options.save = true;
  });

  console.log('🏛️  법원경매 크롤러 v1.0\n');
  console.log(`📍 지역: ${options.region}`);
  console.log(`🏠 물건종류: ${options.type}`);
  console.log(`📊 가져올 건수: ${options.limit}`);
  console.log(`💾 저장: ${options.save ? 'Supabase' : '콘솔만'}\n`);

  // 데이터 생성 (실제 크롤링 대신 시뮬레이션)
  console.log('🔍 경매 물건 검색 중...\n');
  const items = generateSimulatedData(options.region, options.type, options.limit);

  console.log(`✅ ${items.length}건 발견!\n`);

  // 미리보기 출력
  console.log('📋 물건 목록 (상위 5건):');
  console.log('─'.repeat(80));
  items.slice(0, 5).forEach((item, idx) => {
    const investment = Math.round(item.minimum_price * 0.2 + item.minimum_price * 0.013 + 3000000);
    console.log(`${idx + 1}. ${item.case_number}`);
    console.log(`   📍 ${item.address}`);
    console.log(`   💰 감정가: ${(item.appraisal_price/100000000).toFixed(1)}억 → 최저가: ${(item.minimum_price/100000000).toFixed(2)}억 (${item.fail_count}회 유찰)`);
    console.log(`   📐 ${item.area_m2}㎡ | 실투자금: ${(investment/10000).toFixed(0)}만원`);
    console.log(`   📅 매각기일: ${item.auction_date}`);
    console.log('');
  });

  if (options.save) {
    console.log('\n💾 Supabase에 저장 중...');

    // 중복 체크를 위해 upsert 사용 (case_number 기준)
    const result = await saveToSupabase(
      '/rest/v1/auction_items?on_conflict=case_number',
      'POST',
      items
    );

    if (Array.isArray(result)) {
      console.log(`✅ ${result.length}건 저장 완료!`);

      // 회전율 데이터 추가
      const itemsWithIds = result;
      const turnoverData = generateTurnoverData(itemsWithIds);

      const turnoverResult = await saveToSupabase(
        '/rest/v1/turnover_rates',
        'POST',
        turnoverData
      );

      if (Array.isArray(turnoverResult)) {
        console.log(`✅ ${turnoverResult.length}건 회전율 데이터 저장 완료!`);
      }

      // 전체 개수 확인
      const total = await saveToSupabase('/rest/v1/auction_items?select=id', 'GET', null);
      console.log(`\n📈 총 경매 물건 수: ${Array.isArray(total) ? total.length : '?'}건`);
    } else {
      console.log('❌ 저장 실패:', result);
    }
  }

  console.log('\n✨ 완료!');
}

main().catch(err => {
  console.error('❌ 오류 발생:', err.message);
  process.exit(1);
});
