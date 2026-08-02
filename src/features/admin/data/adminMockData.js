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
