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
