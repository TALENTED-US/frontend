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
  totalAssets: 3000000,
  liquidAssets: 2240000,
  monthlyIncome: 0,
  monthlyExpense: 800000,
  survivalMonths: 3.8,
  targetMonths: 6,
  shortage: 1760000,
  achievementRate: 63,
}

export const transactions = [
  { id: 1, date: '2026-07-24', title: '카페 라떼', category: '식비', amount: -5200 },
  { id: 2, date: '2026-07-24', title: '지하철', category: '교통', amount: -1450 },
  { id: 3, date: '2026-07-23', title: '넷플릭스', category: '구독', amount: -17000 },
  { id: 4, date: '2026-07-22', title: '스터디 환급', category: '수입', amount: 50000 },
  { id: 5, date: '2026-07-21', title: '교재 구매', category: '교육', amount: -32000 },
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
    title: '생존기간 변동 안내',
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
