export const user = {
  name: '김재준',
  nickname: '닉넴뭐하지',
  email: 'jaejun.kim@email.com',
  phone: '010-1234-5678',
  birth: '1998-03-15',
  level: 5,
  exp: 1240,
  nextExp: 1400,
  targetDate: '2027.01.01',
  jobType: 'again',
  startDate: '2026-05-01',
  goalDate: '2027-01-01',
  region: '서울특별시',
  family: 1,
}

export const mockCredentials = {
  email: user.email,
  password: 'qwer@123',
}

export const myData = {
  connected: true,
  lastUpdated: '2026-07-29T09:12:00+09:00',
}

export const dashboard = {
  initialAssets: 3000000,
  totalAssets: 3000000,
  liquidAssets: 2240000,
  monthlyIncome: 0,
  monthlyExpense: 800000,
  survivalMonths: 3.8,
  targetMonths: 6,
  shortage: 1760000,
  achievementRate: 63,
}

const curatedTransactions = [
  { id: 1, date: '2026-07-30', time: '09:42', title: '국민취업지원금', category: '급여', payment: '우리은행', amount: 600000, memo: '취업지원금 입금', fixed: false },
  { id: 2, date: '2026-07-30', time: '08:50', title: '컴포즈커피', category: '식비', payment: '카드', amount: -3000, memo: '아메리카노', fixed: false },
  { id: 3, date: '2026-07-30', time: '00:17', title: '쿠팡이츠', category: '식비', payment: '카드', amount: -12400, memo: '야식 주문', fixed: false },
  { id: 4, date: '2026-07-29', time: '18:23', title: '친구 정산', category: '기타', payment: '우리은행', amount: -9300, memo: '모임 비용 정산', fixed: false },
  { id: 5, date: '2026-07-28', time: '12:07', title: '써브웨이', category: '식비', payment: '카드', amount: -16600, memo: '점심 식사', fixed: false },
  { id: 6, date: '2026-07-26', time: '20:55', title: '배달의민족', category: '식비', payment: '카드', amount: -15900, memo: '저녁 배달', fixed: false },
  { id: 7, date: '2026-07-26', time: '16:26', title: '고속버스', category: '교통', payment: '카드', amount: -30000, memo: '고속버스 승차권', fixed: false },
  { id: 8, date: '2026-07-23', time: '16:15', title: '세븐일레븐', category: '식비', payment: '카드', amount: -55150, memo: '생활용품 및 장보기', fixed: false },
  { id: 9, date: '2026-07-23', time: '09:18', title: '동네의원', category: '의료', payment: '카드', amount: -8600, memo: '진료비', fixed: false },
  { id: 10, date: '2026-07-22', time: '17:49', title: '카드 캐시백', category: '급여', payment: '카드', amount: 100, memo: '카드 이용 캐시백', fixed: false },
  { id: 11, date: '2026-07-22', time: '09:27', title: '토스페이', category: '쇼핑', payment: '토스', amount: -18400, memo: '온라인 쇼핑', fixed: false },
  { id: 12, date: '2026-07-18', time: '10:57', title: '쿠팡이츠', category: '식비', payment: '카드', amount: -10050, memo: '점심 배달', fixed: false },
  { id: 13, date: '2026-07-17', time: '17:48', title: '카드 캐시백', category: '급여', payment: '카드', amount: 100, memo: '카드 이용 캐시백', fixed: false },
  { id: 14, date: '2026-07-16', time: '18:44', title: '토스페이', category: '쇼핑', payment: '토스', amount: -14800, memo: '생활용품 구매', fixed: false },
  { id: 15, date: '2026-07-16', time: '17:59', title: '세븐일레븐', category: '식비', payment: '카드', amount: -50150, memo: '장보기', fixed: false },
  { id: 16, date: '2026-07-12', time: '09:27', title: '중고거래 판매', category: '급여', payment: '우리은행', amount: 9900, memo: '중고 물품 판매', fixed: false },
  { id: 17, date: '2026-07-10', time: '16:42', title: '교통비', category: '교통', payment: '티머니', amount: -73200, memo: '월 대중교통 이용대금', fixed: true, fixedDay: 10 },
  { id: 18, date: '2026-07-18', time: '16:03', title: 'GPT 구독비', category: '구독', payment: '해외결제', amount: -28000, originalAmount: '$20', memo: '$20 월 구독', fixed: true, fixedDay: 18 },
  { id: 19, date: '2026-07-20', time: '10:19', title: '유튜브 프리미엄', category: '구독', payment: '카드', amount: -14900, memo: '월 정기 구독', fixed: true, fixedDay: 20 },
  { id: 20, date: '2026-07-14', time: '09:00', title: '넷플릭스', category: '구독', payment: '카드', amount: -17000, memo: '월 정기 구독', fixed: true, fixedDay: 14 },
  { id: 21, date: '2026-07-01', time: '09:00', title: '월세', category: '주거', payment: '자동이체', amount: -500000, memo: '7월 월세', fixed: true, fixedDay: 1 },

  { id: 22, date: '2026-06-28', time: '14:20', title: '주말 아르바이트', category: '급여', payment: '우리은행', amount: 320000, memo: '카페 아르바이트 급여', fixed: false },
  { id: 23, date: '2026-06-27', time: '19:10', title: 'CGV', category: '여가', payment: '카드', amount: -15000, memo: '영화 관람', fixed: false },
  { id: 24, date: '2026-06-25', time: '12:35', title: '김밥천국', category: '식비', payment: '카드', amount: -8500, memo: '점심 식사', fixed: false },
  { id: 25, date: '2026-06-23', time: '18:40', title: '다이소', category: '쇼핑', payment: '카드', amount: -23800, memo: '생활용품 구매', fixed: false },
  { id: 26, date: '2026-06-20', time: '09:00', title: '유튜브 프리미엄', category: '구독', payment: '카드', amount: -14900, memo: '월 정기 구독', fixed: true, fixedDay: 20 },
  { id: 27, date: '2026-06-18', time: '08:30', title: '메가커피', category: '식비', payment: '카드', amount: -2500, memo: '아메리카노', fixed: false },
  { id: 28, date: '2026-06-15', time: '13:05', title: '쿠팡', category: '쇼핑', payment: '카드', amount: -34200, memo: '취업 준비용품', fixed: false },
  { id: 29, date: '2026-06-18', time: '17:25', title: 'GPT 구독비', category: '구독', payment: '해외결제', amount: -28000, originalAmount: '$20', memo: '$20 월 구독', fixed: true, fixedDay: 18 },
  { id: 30, date: '2026-06-10', time: '10:19', title: '교통비', category: '교통', payment: '티머니', amount: -68400, memo: '월 대중교통 이용대금', fixed: true, fixedDay: 10 },
  { id: 31, date: '2026-06-07', time: '19:45', title: '배달의민족', category: '식비', payment: '카드', amount: -17800, memo: '저녁 배달', fixed: false },
  { id: 32, date: '2026-06-14', time: '09:00', title: '넷플릭스', category: '구독', payment: '카드', amount: -17000, memo: '월 정기 구독', fixed: true, fixedDay: 14 },
  { id: 33, date: '2026-06-01', time: '09:00', title: '월세', category: '주거', payment: '자동이체', amount: -500000, memo: '6월 월세', fixed: true, fixedDay: 1 },

  { id: 34, date: '2026-05-29', time: '09:30', title: '국민취업지원금', category: '급여', payment: '우리은행', amount: 500000, memo: '취업지원금 입금', fixed: false },
  { id: 35, date: '2026-05-27', time: '13:10', title: '이마트24', category: '식비', payment: '카드', amount: -12600, memo: '간식 및 생필품', fixed: false },
  { id: 36, date: '2026-05-24', time: '16:20', title: '친구 정산', category: '기타', payment: '우리은행', amount: 24000, memo: '모임 비용 돌려받음', fixed: false },
  { id: 37, date: '2026-05-22', time: '11:45', title: '알라딘', category: '교육', payment: '카드', amount: -31500, memo: '취업 준비 도서', fixed: false },
  { id: 38, date: '2026-05-20', time: '09:00', title: '유튜브 프리미엄', category: '구독', payment: '카드', amount: -14900, memo: '월 정기 구독', fixed: true, fixedDay: 20 },
  { id: 39, date: '2026-05-18', time: '20:15', title: '배달의민족', category: '식비', payment: '카드', amount: -22400, memo: '저녁 배달', fixed: false },
  { id: 40, date: '2026-05-15', time: '14:40', title: '스타벅스', category: '식비', payment: '카드', amount: -5900, memo: '카페 이용', fixed: false },
  { id: 41, date: '2026-05-10', time: '08:10', title: '교통비', category: '교통', payment: '티머니', amount: -62100, memo: '월 대중교통 이용대금', fixed: true, fixedDay: 10 },
  { id: 42, date: '2026-05-09', time: '15:30', title: '올리브영', category: '쇼핑', payment: '카드', amount: -27800, memo: '생활용품 구매', fixed: false },
  { id: 43, date: '2026-05-07', time: '12:25', title: '서브웨이', category: '식비', payment: '카드', amount: -11800, memo: '점심 식사', fixed: false },
  { id: 44, date: '2026-05-14', time: '09:00', title: '넷플릭스', category: '구독', payment: '카드', amount: -17000, memo: '월 정기 구독', fixed: true, fixedDay: 14 },
  { id: 45, date: '2026-05-18', time: '17:50', title: 'GPT 구독비', category: '구독', payment: '해외결제', amount: -28000, originalAmount: '$20', memo: '$20 월 구독', fixed: true, fixedDay: 18 },
  { id: 46, date: '2026-05-01', time: '09:00', title: '월세', category: '주거', payment: '자동이체', amount: -500000, memo: '5월 월세', fixed: true, fixedDay: 1 },
]

const supplementalTransactionTemplates = [
  { title: '메가커피', category: '식비', payment: '카드', amount: -2500, memo: '아메리카노' },
  { title: '컴포즈커피', category: '식비', payment: '카드', amount: -3000, memo: '카페 이용' },
  { title: '동네 분식집', category: '식비', payment: '카드', amount: -7500, memo: '점심 식사' },
  { title: '김밥천국', category: '식비', payment: '카드', amount: -8500, memo: '간단한 식사' },
  { title: '쿠팡이츠', category: '식비', payment: '카드', amount: -13900, memo: '배달 주문' },
  { title: '배달의민족', category: '식비', payment: '카드', amount: -16800, memo: '저녁 배달' },
  { title: '이마트24', category: '식비', payment: '카드', amount: -6200, memo: '간식 구매' },
  { title: 'CU 편의점', category: '식비', payment: '카드', amount: -9400, memo: '식료품 구매' },
  { title: '동네마트', category: '식비', payment: '체크카드', amount: -32700, memo: '주간 장보기' },
  { title: '교통카드', category: '교통', payment: '티머니', amount: -1400, memo: '지하철 이용' },
  { title: '버스 이용', category: '교통', payment: '티머니', amount: -1500, memo: '시내버스 이용' },
  { title: '카카오T', category: '교통', payment: '카드', amount: -12800, memo: '택시 이용' },
  { title: '따릉이', category: '교통', payment: '카드', amount: -2000, memo: '공공자전거 이용' },
  { title: '다이소', category: '쇼핑', payment: '카드', amount: -11300, memo: '생활용품 구매' },
  { title: '쿠팡', category: '쇼핑', payment: '카드', amount: -24800, memo: '온라인 쇼핑' },
  { title: '올리브영', category: '쇼핑', payment: '카드', amount: -18600, memo: '화장품 및 생활용품' },
  { title: '무신사', category: '쇼핑', payment: '토스', amount: -42900, memo: '의류 구매' },
  { title: '알라딘', category: '교육', payment: '카드', amount: -21900, memo: '취업 준비 도서' },
  { title: '스터디카페', category: '교육', payment: '카드', amount: -10000, memo: '스터디카페 이용' },
  { title: '온라인 강의', category: '교육', payment: '카드', amount: -29900, memo: '취업 강의 수강' },
  { title: '동네약국', category: '의료', payment: '카드', amount: -7800, memo: '의약품 구매' },
  { title: '동네의원', category: '의료', payment: '카드', amount: -12600, memo: '진료비' },
  { title: 'CGV', category: '여가', payment: '카드', amount: -15000, memo: '영화 관람' },
  { title: '코인노래방', category: '여가', payment: '카드', amount: -6000, memo: '문화생활' },
  { title: '게임 콘텐츠', category: '여가', payment: '토스', amount: -9900, memo: '게임 아이템 구매' },
  { title: '세탁소', category: '기타', payment: '카드', amount: -7000, memo: '의류 세탁' },
  { title: '미용실', category: '기타', payment: '카드', amount: -23000, memo: '헤어 커트' },
  { title: '친구 정산', category: '기타', payment: '우리은행', amount: -12500, memo: '모임 비용 정산' },
  { title: '카드 캐시백', category: '급여', payment: '카드', amount: 500, memo: '카드 이용 캐시백' },
  { title: '중고거래 판매', category: '급여', payment: '우리은행', amount: 28000, memo: '중고 물품 판매' },
  { title: '설문조사 사례비', category: '급여', payment: '토스', amount: 10000, memo: '온라인 설문 참여' },
  { title: '주말 아르바이트', category: '급여', payment: '우리은행', amount: 85000, memo: '단기 아르바이트 급여' },
]

function createSupplementalTransactions(month, startId, count, templateOffset) {
  const daysInMonth = new Date(2026, Number(month), 0).getDate()

  return Array.from({ length: count }, (_, index) => {
    const template = supplementalTransactionTemplates[(index + templateOffset) % supplementalTransactionTemplates.length]
    const day = 1 + ((index * 7 + templateOffset * 3) % daysInMonth)
    const hour = 8 + ((index * 5 + templateOffset) % 15)
    const minute = (index * 13 + templateOffset * 7) % 60
    const variation = template.amount > 0 ? (index % 3) * 1000 : -(index % 4) * 500

    return {
      id: startId + index,
      date: `2026-${month}-${String(day).padStart(2, '0')}`,
      time: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
      title: template.title,
      category: template.category,
      payment: template.payment,
      amount: template.amount + variation,
      memo: template.memo,
      fixed: false,
    }
  })
}

function createCompletedMonthTransactions(month, startId, templateOffset, transportAmount) {
  const fixedRows = [
    { day: 1, title: '월세', category: '주거', payment: '자동이체', amount: -500000, memo: `${Number(month)}월 월세` },
    { day: 10, title: '교통비', category: '교통', payment: '티머니', amount: -transportAmount, memo: '월 대중교통 이용대금' },
    { day: 14, title: '넷플릭스', category: '구독', payment: '카드', amount: -17000, memo: '월 정기 구독' },
    { day: 18, title: 'GPT 구독비', category: '구독', payment: '해외결제', amount: -28000, originalAmount: '$20', memo: '$20 월 구독' },
    { day: 20, title: '유튜브 프리미엄', category: '구독', payment: '카드', amount: -14900, memo: '월 정기 구독' },
  ].map((row, index) => ({
    id: startId + index,
    date: `2026-${month}-${String(row.day).padStart(2, '0')}`,
    time: `${String(9 + index).padStart(2, '0')}:00`,
    title: row.title,
    category: row.category,
    payment: row.payment,
    amount: row.amount,
    originalAmount: row.originalAmount,
    memo: row.memo,
    fixed: true,
    fixedDay: row.day,
  }))

  return [
    ...fixedRows,
    ...createSupplementalTransactions(month, startId + fixedRows.length, 45, templateOffset),
  ]
}

function formatLocalDate(date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-')
}

function createCurrentMonthTransactions(date) {
  const monthKey = formatLocalDate(date).slice(0, 7)
  const existingMonthKeys = new Set([
    '2026-01',
    '2026-02',
    '2026-03',
    '2026-04',
    '2026-05',
    '2026-06',
    '2026-07',
  ])
  if (existingMonthKeys.has(monthKey)) return []

  const currentDay = Math.max(1, date.getDate())
  const yearMonthId = date.getFullYear() * 100 + date.getMonth() + 1
  const fixedRows = [
    { title: '월세', category: '주거', payment: '자동이체', amount: -500000, memo: '이번 달 월세', fixedDay: 1 },
    { title: '교통비', category: '교통', payment: '티머니', amount: -(60000 + ((date.getMonth() * 3700) % 20001)), memo: '월 대중교통 이용대금', fixedDay: 10 },
    { title: '넷플릭스', category: '구독', payment: '카드', amount: -17000, memo: '월 정기 구독', fixedDay: 14 },
    { title: 'GPT 구독비', category: '구독', payment: '해외결제', amount: -28000, originalAmount: '$20', memo: '$20 월 구독', fixedDay: 18 },
    { title: '유튜브 프리미엄', category: '구독', payment: '카드', amount: -14900, memo: '월 정기 구독', fixedDay: 20 },
  ].filter((row) => row.fixedDay <= currentDay).map((row, index) => ({
    ...row,
    id: yearMonthId * 1000 + index,
    date: `${monthKey}-${String(Math.min(row.fixedDay, currentDay)).padStart(2, '0')}`,
    time: `${String(8 + index).padStart(2, '0')}:00`,
    fixed: true,
  }))

  const variableCount = Math.max(2, Math.min(46, Math.round(currentDay * 1.6)))
  const variableRows = Array.from({ length: variableCount }, (_, index) => {
    const template = supplementalTransactionTemplates[(index + date.getMonth()) % supplementalTransactionTemplates.length]
    const day = 1 + ((index * 5 + date.getDate()) % currentDay)
    const hour = 8 + ((index * 7 + date.getMonth()) % 15)
    const minute = (index * 11 + date.getDate()) % 60
    const variation = template.amount > 0 ? (index % 3) * 1000 : -(index % 5) * 400

    return {
      id: yearMonthId * 1000 + 100 + index,
      date: `${monthKey}-${String(day).padStart(2, '0')}`,
      time: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
      title: template.title,
      category: template.category,
      payment: template.payment,
      amount: template.amount + variation,
      memo: template.memo,
      fixed: false,
    }
  })

  return [...fixedRows, ...variableRows]
}

const currentDate = new Date()
const currentDateKey = formatLocalDate(currentDate)
const completedMonthTransactions = [
  ...createCompletedMonthTransactions('01', 4001, 3, 64700),
  ...createCompletedMonthTransactions('02', 5001, 7, 71800),
  ...createCompletedMonthTransactions('03', 6001, 11, 60300),
  ...createCompletedMonthTransactions('04', 7001, 15, 79600),
  ...curatedTransactions,
  ...createSupplementalTransactions('05', 1001, 37, 0),
  ...createSupplementalTransactions('06', 2001, 38, 9),
  ...createSupplementalTransactions('07', 3001, 29, 18),
]

export const transactions = [
  ...completedMonthTransactions.filter((row) => row.date <= currentDateKey),
  ...createCurrentMonthTransactions(currentDate),
]

export const simulationOptions = [
  { id: 1, category: '지출', title: '외식 주 2회로 줄이기', amount: 80000, months: 0.7 },
  { id: 2, category: '수입', title: '주말 카페 아르바이트', amount: 500000, months: 1.4 },
  { id: 3, category: '정책', title: '청년 구직활동지원금', amount: 600000, months: 0.8 },
  { id: 4, category: '금융', title: '청년 우대 적금', amount: 57500, months: 0.2 },
]

export const policies = [
  {
    id: 1,
    type: '정책',
    title: '청년 월세 특별지원',
    provider: '국토교통부',
    benefit: '월 최대 20만원',
    deadline: 'D-7',
    tag: '주거',
  },
  {
    id: 2,
    type: '정책',
    title: '국민취업지원제도',
    provider: '고용노동부',
    benefit: '월 50만원 × 6개월',
    deadline: '상시',
    tag: '취업',
  },
  {
    id: 3,
    type: '정책',
    title: '서울 청년수당',
    provider: '서울특별시',
    benefit: '월 50만원',
    deadline: 'D-21',
    tag: '생활',
  },
  {
    id: 4,
    type: '금융',
    title: 'KB 청년도약계좌',
    provider: 'KB국민은행',
    benefit: '최대 연 6.0%',
    deadline: '판매 중',
    tag: '적금',
  },
  {
    id: 5,
    type: '금융',
    title: '청년 주택드림 통장',
    provider: 'KB국민은행',
    benefit: '최대 연 4.5%',
    deadline: '판매 중',
    tag: '주거',
  },
]

export const notifications = [
  {
    id: 1,
    title: '목표 재설정 경고',
    message: '목표 취업일 기준 부족 금액을 확인해 주세요.',
    time: '방금',
    read: false,
  },
  {
    id: 2,
    title: '청년 월세 지원 마감',
    message: '신청 마감일이 7일 남았어요.',
    time: '오늘',
    read: false,
  },
  {
    id: 3,
    title: '버티는 기간 변동 안내',
    message: '이번 달 지출을 반영해 준비 기간을 다시 계산했어요.',
    time: '어제',
    read: false,
  },
  {
    id: 4,
    title: '금융 연결 완료',
    message: '연결한 계좌 3개의 데이터를 불러왔어요.',
    time: '7월 20일',
    read: true,
  },
]
