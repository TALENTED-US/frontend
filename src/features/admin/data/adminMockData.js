export const adminDashboardStats = {
  range: { from: '2026-07-01', to: '2026-07-23' },
  metricRows: [
    [
      { key: 'totalMembers', label: '전체 회원 수', rawValue: 12480, unit: '명', scales: false, color: '#f1b94c', captions: [] },
      {
        key: 'activeMembers',
        label: '활성 회원 수',
        rawValue: 8742,
        unit: '명',
        scales: false,
        color: '#44d795',
        captions: ['활성 비율 70.0%'],
      },
      {
        key: 'dormantMembers',
        label: '휴면 회원 수',
        rawValue: 3738,
        unit: '명',
        scales: false,
        color: '#9aa3b2',
        captions: ['휴면 비율 30.0%'],
      },
    ],
    [
      {
        key: 'mydataConnections',
        label: '마이데이터 연결',
        rawValue: 6238,
        unit: '명',
        scales: false,
        color: '#93b2f8',
        captions: ['전체 회원 대비 연결 비율 50.0%'],
      },
      {
        key: 'simulationsCreated',
        label: '시뮬레이션 생성 수',
        rawValue: 4820,
        unit: '건',
        scales: false,
        color: '#8e7cc3',
        note: '시뮬레이션을 시작한 회원 수',
        captions: ['전체 회원 대비 생성 비율 38.6%'],
      },
      {
        key: 'finalPlanConfirmed',
        label: '최종 재정 계획 확정 수',
        rawValue: 3116,
        unit: '건',
        scales: false,
        color: '#0a1680',
        note: '시뮬레이션을 최종 확정한 회원 수',
        captions: ['전체 회원 대비 확정 비율 25.0%'],
      },
    ],
  ],
  questMetricRow: [
    { key: 'questsCreated', label: '생성된 퀘스트 건수', rawValue: 18540, unit: '개', scales: true, color: '#0a1680', captions: [] },
    { key: 'questCompletionRate', label: '퀘스트 완료율', rawValue: 62.4, unit: '%', scales: false, color: '#44d795', captions: [] },
  ],
  trend: {
    labels: ['5/1', '5/10', '5/18', '5/23', '6/1', '6/10', '6/18', '6/23', '7/1', '7/10', '7/18', '7/23'],
    series: [
      {
        key: 'totalMembers',
        label: '전체 회원 수',
        color: '#f1b94c',
        data: [
          11700, 11722, 11745, 11767, 11789, 11811, 11834, 11856, 11878, 11901, 11923, 11945, 11967, 11990, 12012, 12034, 12057,
          12079, 12101, 12123, 12146, 12168, 12190, 12213, 12235, 12257, 12279, 12302, 12324, 12346, 12369, 12391, 12413, 12435,
          12458, 12480,
        ],
      },
      {
        key: 'mydata',
        label: '마이데이터 연결',
        color: '#93b2f8',
        data: [
          5600, 5601, 5602, 5605, 5608, 5613, 5619, 5626, 5633, 5642, 5652, 5663, 5675, 5688, 5702, 5717, 5733, 5751, 5769, 5788,
          5808, 5830, 5852, 5876, 5900, 5926, 5952, 5980, 6008, 6038, 6069, 6101, 6133, 6167, 6202, 6238,
        ],
      },
      {
        key: 'simulationsCreated',
        label: '시뮬레이션 생성 수',
        color: '#8e7cc3',
        data: [
          4300, 4329, 4358, 4385, 4412, 4438, 4463, 4487, 4511, 4533, 4555, 4575, 4595, 4615, 4633, 4650, 4667, 4682, 4697, 4711,
          4724, 4737, 4748, 4759, 4769, 4778, 4786, 4793, 4799, 4805, 4809, 4813, 4816, 4818, 4820, 4820,
        ],
      },
      {
        key: 'planConfirmed',
        label: '계획 확정',
        color: '#0a1680',
        data: [
          2700, 2701, 2704, 2709, 2715, 2723, 2732, 2743, 2755, 2768, 2782, 2797, 2813, 2830, 2846, 2864, 2881, 2899, 2917, 2935,
          2952, 2970, 2986, 3003, 3019, 3034, 3048, 3061, 3073, 3084, 3093, 3101, 3107, 3112, 3115, 3116,
        ],
      },
    ],
  },
  operationLogs: [
    { id: 1, title: 'Mock 데이터 세트 갱신', status: 'success', time: '12분 전' },
    { id: 2, title: '정책 14건 자동 수집', status: 'success', time: '38분 전' },
    { id: 3, title: '정책 크롤링 3건 실패', status: 'fail', time: '45분 전', reason: '사유: 원본 사이트 응답 타임아웃', retryable: true },
    { id: 4, title: '퀘스트 생성 배치 완료', status: 'success', time: '2시간 전' },
  ],
}
