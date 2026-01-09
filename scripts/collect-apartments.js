/**
 * hauction API에서 아파트 데이터만 수집 (이미지 포함)
 * 여러 페이지를 검색하여 아파트 카테고리만 필터링
 */

const https = require('https');
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// 환경변수 또는 기본값 사용
const SUPABASE_URL = process.env.SUPABASE_URL || 'vujhjwanowlassyinkpv.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ1amhqd2Fub3dsYXNzeWlua3B2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4MjUwNDcsImV4cCI6MjA3NTQwMTA0N30.9j5a8ga1eYR5uyK0J57MsGvS7hoxsmj_WS3OAFhFsWs';

function fetchHauctionAPI(page = 1, size = 100) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.hauction.co.kr',
      path: `/api/v1/auction/realestate?page=${page}&size=${size}`,
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          reject(new Error(`JSON 파싱 실패: ${body.substring(0, 200)}`));
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

function supabaseRequest(method, path, data) {
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
      headers: headers,
      rejectUnauthorized: false
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });
    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

function transformApartment(item) {
  const address = item.address || '';
  const parts = address.split(' ');

  // 시도 정규화
  let sido = parts[0] || '';
  if (sido.includes('서울')) sido = '서울';
  else if (sido.includes('부산')) sido = '부산';
  else if (sido.includes('대구')) sido = '대구';
  else if (sido.includes('인천')) sido = '인천';
  else if (sido.includes('광주')) sido = '광주';
  else if (sido.includes('대전')) sido = '대전';
  else if (sido.includes('울산')) sido = '울산';
  else if (sido.includes('세종')) sido = '세종';
  else if (sido.includes('경기')) sido = '경기';
  else if (sido.includes('강원')) sido = '강원';
  else if (sido.includes('충북') || sido.includes('충청북')) sido = '충북';
  else if (sido.includes('충남') || sido.includes('충청남')) sido = '충남';
  else if (sido.includes('전북') || sido.includes('전라북')) sido = '전북';
  else if (sido.includes('전남') || sido.includes('전라남')) sido = '전남';
  else if (sido.includes('경북') || sido.includes('경상북')) sido = '경북';
  else if (sido.includes('경남') || sido.includes('경상남')) sido = '경남';
  else if (sido.includes('제주')) sido = '제주';

  const sigungu = parts[1] || '';
  const appraisalValue = item.apsl_amount || 0;
  const minimumBid = item.minb_amount || 0;
  const discountRate = appraisalValue > 0 ? Math.round((1 - minimumBid / appraisalValue) * 100) : 0;

  // 면적 계산
  const areaM2 = parseFloat(item.rt_sqm) || parseFloat(item.bldg_sqm) || 84;
  const areaPy = Math.round(areaM2 / 3.306);

  // 아파트 이름 추출
  let apartmentName = '아파트';
  const aptMatch = address.match(/([가-힣A-Za-z0-9]+(?:아파트|파크|빌|타워|하이츠|맨션|블루온|아델리움))/);
  if (aptMatch) apartmentName = aptMatch[1];

  // 동호 추출
  let dongHo = null;
  const dongMatch = address.match(/(\d+동\s*\d+층?\d*호?)/);
  if (dongMatch) dongHo = dongMatch[1];

  // 유찰 횟수 계산
  const minbRate = item.minb_rate || 100;
  let failCount = 0;
  if (minbRate < 100) failCount = 1;
  if (minbRate < 80) failCount = 2;
  if (minbRate < 64) failCount = 3;
  if (minbRate < 51) failCount = 4;

  // is_safe 계산 (discount_rate, area_py는 generated column이므로 제외)
  const isSafe = failCount <= 2 && discountRate <= 40;

  return {
    case_number: `apt_${item.unique_id || Date.now()}`,
    court: item.court_name || item.department || '정보없음',
    property_type: 'APT',
    address: address,
    sido: sido,
    sigungu: sigungu,
    dong: parts[2] || null,
    apartment_name: apartmentName,
    dong_ho: dongHo,
    area_m2: areaM2,
    appraisal_price: appraisalValue,
    minimum_price: minimumBid,
    fail_count: failCount,
    auction_date: item.bid_dttm ? item.bid_dttm.split('T')[0] : null,
    is_safe: isSafe,
    source_url: `https://www.hauction.co.kr/auction/item/${item.unique_id}`,
    image_urls: item.thumbnail ? [item.thumbnail] : null
  };
}

async function main() {
  console.log('='.repeat(50));
  console.log('🏠 hauction API 아파트 데이터 수집');
  console.log('='.repeat(50));
  console.log('');

  let totalApartments = 0;
  let totalInserted = 0;
  const collectedApartments = [];

  // 여러 페이지 범위를 검색 (아파트가 분산되어 있음)
  const pageRanges = [
    { start: 1, end: 50 },
    { start: 100, end: 150 },
    { start: 200, end: 300 },
    { start: 400, end: 500 },
    { start: 700, end: 800 },
    { start: 1000, end: 1100 }
  ];

  for (const range of pageRanges) {
    console.log(`\n📄 페이지 ${range.start}-${range.end} 검색 중...`);

    for (let page = range.start; page <= range.end; page += 10) {
      try {
        const apiResponse = await fetchHauctionAPI(page, 100);

        if (!apiResponse.results || apiResponse.results.length === 0) {
          continue;
        }

        // 아파트만 필터링 (아파트형공장 제외)
        const apartments = apiResponse.results.filter(item =>
          item.category === '아파트' &&
          item.thumbnail &&
          item.apsl_amount > 0
        );

        if (apartments.length > 0) {
          console.log(`   페이지 ${page}: 아파트 ${apartments.length}개 발견`);
          totalApartments += apartments.length;

          for (const apt of apartments) {
            collectedApartments.push(transformApartment(apt));
          }
        }

        // API 부하 방지
        await new Promise(r => setTimeout(r, 200));

        // 충분한 데이터 수집 시 중단
        if (collectedApartments.length >= 100) {
          console.log(`\n✅ 목표 수량(100개) 도달!`);
          break;
        }

      } catch (error) {
        console.error(`   페이지 ${page} 오류:`, error.message);
      }
    }

    if (collectedApartments.length >= 100) break;
  }

  console.log(`\n${'='.repeat(50)}`);
  console.log(`📊 수집 완료: 총 ${collectedApartments.length}개 아파트`);
  console.log(`${'='.repeat(50)}\n`);

  if (collectedApartments.length === 0) {
    console.log('❌ 수집된 아파트가 없습니다.');
    return;
  }

  // Supabase에 데이터 삽입
  console.log('💾 Supabase에 데이터 저장 중...\n');

  for (const apt of collectedApartments) {
    // 중복 체크
    const existCheck = await supabaseRequest(
      'GET',
      `/rest/v1/auction_items?case_number=eq.${encodeURIComponent(apt.case_number)}&select=id`
    );

    if (Array.isArray(existCheck.data) && existCheck.data.length > 0) {
      continue; // 이미 존재
    }

    // 삽입
    const insertRes = await supabaseRequest('POST', '/rest/v1/auction_items', apt);

    if (insertRes.status === 201) {
      totalInserted++;
      if (totalInserted % 10 === 0) {
        console.log(`   ✅ ${totalInserted}개 삽입 완료`);
      }
    } else {
      console.log(`   ❌ 삽입 실패 (${apt.case_number}):`, insertRes.status);
    }
  }

  console.log(`\n${'='.repeat(50)}`);
  console.log(`✅ 최종 결과`);
  console.log(`   총 발견: ${totalApartments}개`);
  console.log(`   신규 삽입: ${totalInserted}개`);
  console.log(`${'='.repeat(50)}\n`);

  // 최종 확인
  const finalCheck = await supabaseRequest('GET', '/rest/v1/auction_items?property_type=eq.APT&select=id,case_number,apartment_name,image_urls&order=id.desc&limit=10');
  console.log('📊 최근 아파트 데이터:');
  if (Array.isArray(finalCheck.data)) {
    finalCheck.data.forEach(item => {
      const hasImage = item.image_urls && item.image_urls.length > 0;
      console.log(`   ${item.apartment_name}: ${hasImage ? '✅ 이미지 있음' : '❌ 이미지 없음'}`);
    });
  }
}

main().catch(console.error);
