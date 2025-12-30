const https = require('https');

const SUPABASE_URL = 'vujhjwanowlassyinkpv.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ1amhqd2Fub3dsYXNzeWlua3B2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4MjUwNDcsImV4cCI6MjA3NTQwMTA0N30.9j5a8ga1eYR5uyK0J57MsGvS7hoxsmj_WS3OAFhFsWs';

// 추가 샘플 데이터 (15건)
const newAuctionItems = [
  // 인천/경기권
  {case_number:"2024타경62001",court:"인천지방법원",property_type:"APT",address:"인천 서구 청라동 123",sido:"인천",sigungu:"서구",dong:"청라동",apartment_name:"청라 센트럴파크",dong_ho:"101동 1203호",area_m2:84.5,appraisal_price:450000000,minimum_price:225000000,fail_count:2,auction_date:"2025-02-01",is_safe:true},
  {case_number:"2024타경62002",court:"수원지방법원",property_type:"APT",address:"경기 화성시 동탄동 456",sido:"경기",sigungu:"화성시",dong:"동탄동",apartment_name:"동탄 시범단지",dong_ho:"203동 805호",area_m2:102.3,appraisal_price:520000000,minimum_price:260000000,fail_count:2,auction_date:"2025-02-03",is_safe:true},
  {case_number:"2024타경62003",court:"의정부지방법원",property_type:"APT",address:"경기 남양주시 다산동 789",sido:"경기",sigungu:"남양주시",dong:"다산동",apartment_name:"다산 자연앤자이",dong_ho:"105동 1801호",area_m2:84.9,appraisal_price:480000000,minimum_price:240000000,fail_count:2,auction_date:"2025-02-05",is_safe:true},

  // 충청권
  {case_number:"2024타경62004",court:"대전지방법원",property_type:"APT",address:"대전 유성구 봉명동 234",sido:"대전",sigungu:"유성구",dong:"봉명동",apartment_name:"봉명 e편한세상",dong_ho:"102동 1502호",area_m2:76.8,appraisal_price:320000000,minimum_price:160000000,fail_count:2,auction_date:"2025-02-07",is_safe:true},
  {case_number:"2024타경62005",court:"청주지방법원",property_type:"APT",address:"충북 청주시 흥덕구 복대동 111",sido:"충북",sigungu:"청주시",dong:"복대동",apartment_name:"복대 푸르지오",dong_ho:"108동 702호",area_m2:84.2,appraisal_price:290000000,minimum_price:145000000,fail_count:2,auction_date:"2025-02-10",is_safe:true},

  // 호남권
  {case_number:"2024타경62006",court:"광주지방법원",property_type:"APT",address:"광주 광산구 수완동 567",sido:"광주",sigungu:"광산구",dong:"수완동",apartment_name:"수완 호반베르디움",dong_ho:"105동 903호",area_m2:84.9,appraisal_price:280000000,minimum_price:140000000,fail_count:2,auction_date:"2025-02-12",is_safe:true},
  {case_number:"2024타경62007",court:"전주지방법원",property_type:"APT",address:"전북 전주시 덕진구 송천동 222",sido:"전북",sigungu:"전주시",dong:"송천동",apartment_name:"송천 아이파크",dong_ho:"201동 1103호",area_m2:99.5,appraisal_price:350000000,minimum_price:175000000,fail_count:2,auction_date:"2025-02-14",is_safe:true},

  // 영남권
  {case_number:"2024타경62008",court:"부산지방법원",property_type:"APT",address:"부산 사하구 다대동 333",sido:"부산",sigungu:"사하구",dong:"다대동",apartment_name:"다대 포레나",dong_ho:"103동 1205호",area_m2:74.8,appraisal_price:250000000,minimum_price:125000000,fail_count:2,auction_date:"2025-02-16",is_safe:true},
  {case_number:"2024타경62009",court:"울산지방법원",property_type:"APT",address:"울산 남구 삼산동 444",sido:"울산",sigungu:"남구",dong:"삼산동",apartment_name:"삼산 롯데캐슬",dong_ho:"107동 1601호",area_m2:114.5,appraisal_price:420000000,minimum_price:210000000,fail_count:2,auction_date:"2025-02-18",is_safe:true},
  {case_number:"2024타경62010",court:"창원지방법원 마산지원",property_type:"APT",address:"경남 창원시 마산회원구 합성동 555",sido:"경남",sigungu:"창원시",dong:"합성동",apartment_name:"마산 센트럴자이",dong_ho:"102동 908호",area_m2:84.7,appraisal_price:310000000,minimum_price:155000000,fail_count:2,auction_date:"2025-02-20",is_safe:true},

  // 강원/제주
  {case_number:"2024타경62011",court:"원주지방법원",property_type:"APT",address:"강원 원주시 단구동 666",sido:"강원",sigungu:"원주시",dong:"단구동",apartment_name:"원주 더샵",dong_ho:"104동 1004호",area_m2:84.3,appraisal_price:260000000,minimum_price:130000000,fail_count:2,auction_date:"2025-02-22",is_safe:true},
  {case_number:"2024타경62012",court:"제주지방법원",property_type:"APT",address:"제주 제주시 노형동 777",sido:"제주",sigungu:"제주시",dong:"노형동",apartment_name:"노형 래미안",dong_ho:"101동 1502호",area_m2:99.8,appraisal_price:380000000,minimum_price:190000000,fail_count:2,auction_date:"2025-02-24",is_safe:true},

  // 신건/1회유찰 물건 (저렴한 실투자금)
  {case_number:"2024타경62013",court:"대구지방법원 서부지원",property_type:"APT",address:"대구 달서구 상인동 888",sido:"대구",sigungu:"달서구",dong:"상인동",apartment_name:"상인 힐스테이트",dong_ho:"106동 503호",area_m2:59.8,appraisal_price:220000000,minimum_price:176000000,fail_count:1,auction_date:"2025-02-26",is_safe:true},
  {case_number:"2024타경62014",court:"수원지방법원 안산지원",property_type:"APT",address:"경기 안산시 상록구 본오동 999",sido:"경기",sigungu:"안산시",dong:"본오동",apartment_name:"안산 그랑시티",dong_ho:"203동 1201호",area_m2:84.5,appraisal_price:350000000,minimum_price:280000000,fail_count:1,auction_date:"2025-02-28",is_safe:true},
  {case_number:"2024타경62015",court:"인천지방법원 부천지원",property_type:"APT",address:"경기 부천시 중동 1010",sido:"경기",sigungu:"부천시",dong:"중동",apartment_name:"중동 신도브래뉴",dong_ho:"101동 1702호",area_m2:76.2,appraisal_price:380000000,minimum_price:304000000,fail_count:1,auction_date:"2025-03-02",is_safe:true}
];

// 회전율 데이터 (삽입된 물건 ID에 맞춰 나중에 추가)
const turnoverRates = [
  {turnover_rate: 4.5, avg_deal_price: 430000000, deal_count: 45},
  {turnover_rate: 3.8, avg_deal_price: 510000000, deal_count: 38},
  {turnover_rate: 4.2, avg_deal_price: 460000000, deal_count: 42},
  {turnover_rate: 5.1, avg_deal_price: 310000000, deal_count: 51},
  {turnover_rate: 4.8, avg_deal_price: 285000000, deal_count: 48},
  {turnover_rate: 5.5, avg_deal_price: 270000000, deal_count: 55},
  {turnover_rate: 4.3, avg_deal_price: 340000000, deal_count: 43},
  {turnover_rate: 6.2, avg_deal_price: 240000000, deal_count: 62},
  {turnover_rate: 3.9, avg_deal_price: 410000000, deal_count: 39},
  {turnover_rate: 4.7, avg_deal_price: 300000000, deal_count: 47},
  {turnover_rate: 5.8, avg_deal_price: 250000000, deal_count: 58},
  {turnover_rate: 3.6, avg_deal_price: 370000000, deal_count: 36},
  {turnover_rate: 5.3, avg_deal_price: 215000000, deal_count: 53},
  {turnover_rate: 4.1, avg_deal_price: 345000000, deal_count: 41},
  {turnover_rate: 4.4, avg_deal_price: 375000000, deal_count: 44}
];

function makeRequest(path, method, data) {
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

async function main() {
  console.log('🚀 샘플 데이터 추가 시작...\n');

  // 1. 경매 물건 추가
  console.log('📦 경매 물건 15건 추가 중...');
  const insertedItems = await makeRequest('/rest/v1/auction_items', 'POST', newAuctionItems);

  if (Array.isArray(insertedItems)) {
    console.log(`✅ ${insertedItems.length}건 추가 완료!\n`);

    // 2. 회전율 데이터 추가
    console.log('📊 회전율 데이터 추가 중...');
    const turnoverData = insertedItems.map((item, idx) => ({
      auction_item_id: item.id,
      ...turnoverRates[idx]
    }));

    const insertedTurnover = await makeRequest('/rest/v1/turnover_rates', 'POST', turnoverData);

    if (Array.isArray(insertedTurnover)) {
      console.log(`✅ ${insertedTurnover.length}건 회전율 데이터 추가 완료!\n`);
    } else {
      console.log('회전율 응답:', insertedTurnover);
    }
  } else {
    console.log('경매 물건 응답:', insertedItems);
  }

  // 3. 전체 개수 확인
  const allItems = await makeRequest('/rest/v1/auction_items?select=id', 'GET', null);
  console.log(`\n📈 총 경매 물건 수: ${Array.isArray(allItems) ? allItems.length : '확인 불가'}건`);
}

main().catch(console.error);
