export const adminDashboardStats = {
  range: { from: '2026-07-01', to: '2026-07-23' },
  metrics: [
    { key: 'totalMembers', label: '전체 회원 수', value: '12,480명', tone: 'primary', caption: '신규 가입자 326명' },
    { key: 'activeMembers', label: '활성 회원 수', value: '8,742명', tone: 'success', caption: '활성 비율 70.0%' },
    { key: 'mydataConnections', label: '마이데이터 연결', value: '6,238명', tone: 'primary', caption: '연결 비율 50.0%' },
    { key: 'simulationsCreated', label: '시뮬레이션 생성', value: '4,820건', tone: 'success', caption: '최종 계획 확정 3,116건' },
    { key: 'questsCreated', label: '생성된 퀘스트', value: '18,540개', tone: 'primary', caption: '완료율 62.4%' },
    { key: 'finalPlanRate', label: '최종 계획 확정률', value: '64.6%', tone: 'primary', caption: '시뮬레이션 기준' },
  ],
  trend: {
    labels: ['7/1', '7/10', '7/18', '7/23'],
    series: [
      { key: 'signup', label: '신규 가입', color: '#fcb01d', data: [12, 18, 15, 24, 20, 26, 22, 30, 28, 34, 31, 38] },
      { key: 'mydata', label: '마이데이터 연결', color: '#93b2f8', data: [8, 12, 10, 16, 14, 19, 17, 23, 21, 27, 25, 31] },
      { key: 'planConfirmed', label: '계획 확정', color: '#0a1680', data: [4, 6, 7, 10, 11, 14, 15, 18, 19, 22, 24, 27] },
    ],
  },
  operationLogs: [
    { id: 1, title: 'Mock 데이터 세트 갱신', status: 'success', time: '12분 전' },
    { id: 2, title: '정책 14건 자동 수집', status: 'success', time: '38분 전' },
    { id: 3, title: '정책 크롤링 3건 실패', status: 'fail', time: '45분 전', reason: '사유: 원본 사이트 응답 타임아웃', retryable: true },
    { id: 4, title: '퀘스트 생성 배치 완료', status: 'success', time: '2시간 전' },
  ],
}

export const adminMemberSummary = {
  total: 12480,
  normal: 12184,
  restricted: 84,
  withdrawn: 212,
}

export const adminMembers = [
  {
    id: 'jijun01',
    nickname: '재준',
    email: 'user@email.com',
    joinedAt: '2026-03-12',
    lastLoginAt: '2026-07-16 09:42',
    status: 'normal',
    statusHistory: [],
  },
  {
    id: 'minsu22',
    nickname: '민수',
    email: 'minsu@email.com',
    joinedAt: '2026-02-28',
    lastLoginAt: '2026-07-10 21:15',
    status: 'restricted',
    statusHistory: [{ status: 'restricted', reason: '이상 거래 패턴 감지', changedAt: '2026-07-11T10:00:00+09:00' }],
  },
  {
    id: 'soyeon88',
    nickname: '소연',
    email: 'soyeon@email.com',
    joinedAt: '2025-11-03',
    lastLoginAt: null,
    status: 'withdrawn',
    statusHistory: [{ status: 'withdrawn', reason: '회원 탈퇴 요청', changedAt: '2026-02-01T00:00:00+09:00' }],
  },
  {
    id: 'hyunwoo55',
    nickname: '현우',
    email: 'hyunwoo@email.com',
    joinedAt: '2026-05-20',
    lastLoginAt: '2026-07-15 08:03',
    status: 'normal',
    statusHistory: [],
  },
  {
    id: 'yuri_kim',
    nickname: '유리',
    email: 'yuri@email.com',
    joinedAt: '2026-06-02',
    lastLoginAt: '2026-07-14 19:30',
    status: 'normal',
    statusHistory: [],
  },
  {
    id: 'dohyun77',
    nickname: '도현',
    email: 'dohyun@email.com',
    joinedAt: '2026-01-18',
    lastLoginAt: '2026-07-12 11:05',
    status: 'normal',
    statusHistory: [],
  },
  {
    id: 'areum_lee',
    nickname: '아름',
    email: 'areum@email.com',
    joinedAt: '2026-04-09',
    lastLoginAt: '2026-06-30 20:11',
    status: 'restricted',
    statusHistory: [{ status: 'restricted', reason: '신고 누적 3회', changedAt: '2026-07-01T09:30:00+09:00' }],
  },
  {
    id: 'jiwoo99',
    nickname: '지우',
    email: 'jiwoo@email.com',
    joinedAt: '2026-07-01',
    lastLoginAt: '2026-07-23 08:00',
    status: 'normal',
    statusHistory: [],
  },
]

export const adminFinanceDatasets = [
  { key: 'jobseeker-basic', label: '취업준비생 기본 세트' },
  { key: 'jobseeker-active', label: '구직활동 활발 세트' },
  { key: 'employed-transition', label: '재직·이직 준비 세트' },
]

export const adminFinanceDataByUser = {
  jijun01: {
    userId: 'jijun01',
    email: 'user@email.com',
    nickname: '재준',
    datasetKey: 'jobseeker-basic',
    accounts: [
      { id: 'acc-1', bank: 'KB국민은행', type: '입출금', balance: 3200000, status: 'connected', updatedAt: '2026-07-20T09:00:00+09:00' },
      { id: 'acc-2', bank: '신한은행', type: '예·적금', balance: 5000000, status: 'normal', updatedAt: '2026-07-18T09:00:00+09:00' },
      { id: 'acc-3', bank: '카카오뱅크', type: '입출금', balance: 850000, status: 'normal', updatedAt: '2026-07-16T09:00:00+09:00' },
    ],
    cards: [
      {
        id: 'card-1',
        issuer: '삼성카드',
        type: '신용카드',
        usedAmount: 320000,
        limit: 500000,
        linkedAccountId: 'acc-1',
        linkedAccountLabel: 'KB국민은행 입출금',
        status: 'normal',
      },
    ],
    transactions: [
      { id: 'txn-1', date: '2026-07-16', merchant: '카카오뱅크', amount: 500000, kind: 'income', category: '급여' },
      { id: 'txn-2', date: '2026-07-16', merchant: '점심 식사', amount: -12000, kind: 'expense', category: '식비' },
      { id: 'txn-3', date: '2026-07-15', merchant: '주택도시기금', amount: -320000, kind: 'expense', category: '대출상환' },
      {
        id: 'txn-4',
        date: '2026-07-14',
        merchant: '온라인 강의 결제',
        amount: -45000,
        kind: 'expense',
        category: '교육비',
        transactionKey: 'TXN-20260714-0031',
        duplicateSuspect: true,
        duplicateOf: {
          id: 'txn-4-original',
          date: '2026-07-14',
          merchant: '온라인 강의 결제',
          amount: -45000,
          transactionKey: 'TXN-20260714-0031',
        },
      },
      { id: 'txn-5', date: '2026-07-10', merchant: '스타벅스', amount: -6500, kind: 'expense', category: '식비' },
    ],
    history: [
      { id: 1, target: 'jijun01', item: 'KB국민은행 입출금', action: 'create', summary: '신규 계좌 등록 (3,200,000원)', actor: '관리자 김재준', at: '2026-07-16T10:32:00+09:00' },
      { id: 2, target: 'jijun01', item: '점심 식사', action: 'update', summary: '카테고리 기타→식비로 변경', actor: '관리자 김재준', at: '2026-07-15T14:02:00+09:00' },
      { id: 3, target: 'jijun01', item: '온라인 강의 결제', action: 'delete', summary: '중복 거래 삭제 (검수 승인)', actor: '관리자 김재준', at: '2026-07-14T09:18:00+09:00' },
      { id: 4, target: 'jijun01', item: '삼성카드', action: 'update', summary: '한도 400,000원→500,000원 변경', actor: '관리자 김재준', at: '2026-07-12T16:47:00+09:00' },
      { id: 5, target: 'jijun01', item: '주말 카페 아르바이트', action: 'create', summary: '신규 거래 등록 (+300,000원)', actor: '관리자 김재준', at: '2026-07-10T11:47:00+09:00' },
    ],
  },
}

export const adminPolicyCategories = ['자산형성', '구직활동', '주거', '창업', '교육']
export const adminPolicyRegions = ['전국', '서울', '경기', '부산']

export const adminPolicies = [
  {
    id: 'pol-1',
    name: '청년내일저축계좌',
    target: '만 19~34세 근로소득 청년',
    category: '자산형성',
    region: '전국',
    amount: '일시 60만원',
    period: '2026.07.01 ~ 2026.08.31',
    status: 'open',
    source: 'crawl',
    sourceUrl: '',
    ageCondition: '만 19~34세',
    incomeCondition: '연소득 2,600만원 이하',
    requiredDocs: '소득 증빙서류, 신분증',
    applyMethod: '복지로 온라인 신청',
    excludedFromRecommend: false,
  },
  {
    id: 'pol-2',
    name: '청년구직활동지원금',
    target: '구직활동 중인 청년',
    category: '구직활동',
    region: '전국',
    amount: '월 30만원 × 6개월',
    period: '상시',
    status: 'open',
    source: 'crawl',
    sourceUrl: '',
    ageCondition: '',
    incomeCondition: '',
    requiredDocs: '',
    applyMethod: '',
    excludedFromRecommend: false,
  },
  {
    id: 'pol-3',
    name: '청년 전세자금 대출',
    target: '만 19~34세 무주택 세대주',
    category: '주거',
    region: '전국',
    amount: '최대 2억원',
    period: '상시',
    status: 'closing-soon',
    source: 'manual',
    sourceUrl: '',
    ageCondition: '',
    incomeCondition: '',
    requiredDocs: '',
    applyMethod: '',
    excludedFromRecommend: false,
  },
  {
    id: 'pol-4',
    name: '국민취업지원제도',
    target: '취업 준비 중인 청년',
    category: '구직활동',
    region: '전국',
    amount: '월 10만원 × 6개월',
    period: '상시',
    status: 'closed',
    source: 'crawl',
    sourceUrl: '',
    ageCondition: '',
    incomeCondition: '',
    requiredDocs: '',
    applyMethod: '',
    excludedFromRecommend: true,
  },
]

export const adminPolicyHistory = [
  { id: 1, at: '2026-07-16T03:00:00+09:00', summary: '청년내일저축계좌 신청기간 갱신 (크롤링)', type: 'auto' },
  { id: 2, at: '2026-07-15T14:20:00+09:00', summary: '청년 전세자금 대출 상태 "마감임박"으로 수정', type: 'manual' },
  { id: 3, at: '2026-07-14T03:00:00+09:00', summary: '국민취업지원제도 상태 "마감"으로 자동 변경', type: 'auto' },
  { id: 4, at: '2026-07-10T11:02:00+09:00', summary: '청년구직활동지원금 지원금액 수정 (관리자 김재준)', type: 'manual' },
]

export const adminPolicyReviewQueue = [
  { id: 'pol-new-1', name: '청년 월세 지원', category: '자산형성', status: 'open', excludedFromRecommend: false },
]

export const adminLevelStats = {
  grantCount: 142,
  revokeCount: 356,
  accuracy: 94.6,
  questCompleteUsers: 318,
}

export const adminFinancialStates = [
  { key: 'stable', label: '안정', color: '#22c55e', description: '목표 이상 달성' },
  { key: 'caution', label: '주의', color: '#f59e0b', description: '목표 대비 3개월 이내 부족' },
  { key: 'risk', label: '위험', color: '#ef4444', description: '목표 대비 3개월 이상 부족' },
]

export const adminLevels = [
  { level: 1, exp: 0 },
  { level: 2, exp: 50 },
  { level: 3, exp: 100 },
  { level: 4, exp: 250 },
  { level: 5, exp: 500 },
]

export const adminActiveLevel = 5

export const adminQuestCategories = [
  { id: 'q1', category: '지출줄이기', tone: 'danger', example: '"식비 5만원 줄이기" · 소비 카테고리별 절약 목표 달성 시', exp: 30, active: true },
  { id: 'q2', category: '수입늘리기', tone: 'warning', example: '"주말 카페 아르바이트" · 정기 수입 항목 등록 시', exp: 30, active: true },
  { id: 'q3', category: '수입늘리기', tone: 'warning', example: '"프로젝트 원고료" · 일회성 수입 항목 등록 시', exp: 15, active: true },
  { id: 'q4', category: '정책혜택', tone: 'purple', example: '"청년내일저축계좌" · 추천 정책 신청 완료 시', exp: 50, active: true },
]

export const adminRewardHistory = [
  { id: 1, at: '2026-07-23T14:32:00+09:00', member: 'jijun01 · 김재준', reason: '소비 리포트 확인 완료', delta: 40, actor: '시스템 자동' },
  { id: 2, at: '2026-07-23T13:10:00+09:00', member: 'seoyeon01 · 이서연', reason: '지급 오류로 인한 회수', delta: -40, actor: '관리자 김재준' },
]

export const adminRewardErrors = [
  { id: 'err1', member: 'jijun01 · 김재준', reason: '퀘스트 완료 처리 후 EXP 미지급', at: '2026-07-23T15:10:00+09:00', exp: 40, type: 'under' },
  { id: 'err2', member: 'minsu22 · 민수', reason: '중복 완료 처리로 EXP 초과 지급', at: '2026-07-22T11:32:00+09:00', exp: 30, type: 'over' },
  { id: 'err3', member: 'soyeon88 · 소연', reason: '자동 지급 로직 오류로 EXP 누락', at: '2026-07-21T09:05:00+09:00', exp: 50, type: 'under' },
]
