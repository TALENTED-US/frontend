# BUTTIE Frontend

취업 준비 기간의 자산과 현금 흐름을 관리하는 **BUTTIE**의 프론트엔드 애플리케이션 저장소입니다.

> 현재 개발 진행 중인 프로젝트입니다. 기능, 화면 구성, API 연동 방식은 개발 상황에 따라 변경될 수 있습니다.

---

## 1. 프로젝트 소개

### 프로젝트명

`BUTTIE(버티)`

### 프로젝트 개요

BUTTIE는 취업 준비 기간에 발생하는 소득 공백을 대비할 수 있도록 사용자의 자산과 소비 내역을 분석하고, 현실적인 재정 계획 수립을 돕는 취준 자산 시뮬레이션 서비스입니다.

마이데이터로 수집한 금융 정보를 바탕으로 현재 재정 상태와 예상 생존 기간을 보여주며, 지출 절감·수입 확대·정책 혜택을 조합한 시뮬레이션을 제공합니다. 사용자는 계획 적용 전후의 월별 현금 흐름과 버틸 수 있는 기간을 비교할 수 있습니다.

### 주요 사용자

- 취업 준비로 소득 공백을 경험하고 있는 사용자
- 현재 자산으로 버틸 수 있는 기간을 확인하려는 사용자
- 소비 절감과 추가 수입 계획을 구체적으로 세우려는 사용자
- 자신에게 맞는 청년 지원 정책을 찾으려는 사용자

### 개발 기간

- 시작일: `2026-07-28` (프론트엔드 저장소 최초 커밋 기준)
- 현재 상태: 개발 및 QA 진행 중

---

## 2. 개발 진행 상태

| 구분 | 기능 | 상태 |
| --- | --- | --- |
| 공통 | Vue 프로젝트 및 공통 레이아웃 | 완료 |
| 인증 | 회원가입, 로그인, 계정 찾기, 비밀번호 재설정 | 완료 |
| 사용자 | 온보딩, 마이페이지, 취업 준비 정보 관리 | 완료 |
| 마이데이터 | 금융기관 연결, 자산 선택, 거래내역 동기화 | 완료 |
| 재정 | 자산·수입·지출 분석, 거래내역 및 고정지출 관리 | 완료 |
| 시뮬레이션 | 지출·수입·정책 적용 및 확정 결과 조회 | QA 진행 중 |
| 정책 | 조건별 정책 검색, 상세 조회, AI 맞춤 추천 | QA 진행 중 |
| 성장 | 퀘스트, 경험치, 버티 레벨 표시 | 완료 |
| 알림 | 알림 조회, 읽음 처리, 알림 설정 | 완료 |
| 관리자 | 회원·금융데이터·정책·경험치 관리 UI | API 연동 예정 |

상태는 다음 기준으로 작성합니다.

- 예정
- 진행 중
- QA 진행 중
- 완료
- 보류

---

## 3. 기술 스택

### Frontend

| 구분 | 기술 | 용도 |
| --- | --- | --- |
| Framework | Vue.js 3 | Composition API 기반 사용자 화면 구현 |
| Language | JavaScript | 애플리케이션 로직 작성 |
| Build Tool | Vite | 개발 서버 및 프로덕션 빌드 |
| State Management | Pinia | 인증, 재정, 시뮬레이션 등 전역 상태 관리 |
| Routing | Vue Router | 사용자·관리자 페이지 라우팅 및 접근 제어 |
| HTTP Client | Axios | 백엔드 API 요청과 인증 인터셉터 처리 |
| Identity Verification | PortOne Browser SDK | 회원가입 및 계정 복구 본인인증 |
| UI | CSS3, CSS Custom Properties | 반응형 UI와 디자인 토큰 관리 |
| Formatter | Prettier | 코드 스타일 통일 |
| Package Manager | npm | 패키지 및 스크립트 관리 |

### 개발 및 협업 도구

| 구분 | 도구 |
| --- | --- |
| IDE | Visual Studio Code |
| Version Control | Git, GitHub |
| Issue Management | GitHub Issues, Jira |
| API Documentation | Notion API 명세서 |
| Design | Figma |
| Collaboration | Notion, Slack |
| CI/CD | Jenkins |
| Web Server | Nginx |

---

## 4. 주요 기능

### 공통 기능

- 데스크톱 사이드바와 모바일 하단 내비게이션
- 공통 헤더, 푸터, 아이콘 및 버티 이미지 컴포넌트
- 화면 크기에 대응하는 반응형 레이아웃
- 인증 상태에 따른 페이지 접근 제어
- API 로딩, 오류, 빈 상태 처리

### 회원 및 인증

- 로그인과 로그아웃
- 본인인증 기반 회원가입
- 이메일·닉네임 중복 확인
- 아이디 찾기와 비밀번호 재설정
- Access Token 재발급 및 인증 세션 복원
- 회원 정보 및 취업 준비 정보 관리
- 비밀번호 변경과 회원 탈퇴

### 재정 및 마이데이터

- 마이데이터 연결 및 금융기관별 자산 선택
- 계좌·카드 거래내역 동기화
- 총자산, 월평균 수입·지출, 순현금 흐름 분석
- 거래내역 조회·등록·수정·삭제
- 소비 카테고리 분류와 메모 관리
- 고정지출 후보 조회 및 고정지출 등록·해제
- 월별 캘린더와 재정 타임라인 조회

### 취준 자산 시뮬레이션

- 시뮬레이션 시작일과 목표 취업 시점 설정
- 지출 절감, 수입 확대, 정책 혜택 항목 적용
- 사용자 입력 기반 AI 맞춤 계획 추천
- 적용 전후 월평균 수입·지출과 순현금 흐름 비교
- 예상 생존 기간과 월별 재정 타임라인 표시
- 임시 시뮬레이션 저장·수정·삭제 및 최종 확정

### 정책 검색 및 추천

- 취업 준비 상태, 지역, 가구원 수 기반 정책 조회
- 키워드와 상세 조건을 이용한 정책 필터링
- 정책 상세 내용 및 지원 금액 확인
- 시뮬레이션에 적용할 AI 맞춤 정책 추천

### 퀘스트와 버티 성장

- 재정 관리 활동 기반 퀘스트 제공
- 퀘스트 완료 및 실행 취소
- 누적 경험치에 따른 버티 레벨 표시
- 재정 위험도와 레벨에 따른 버티 캐릭터 변화

### 관리자 기능

- 주요 운영 지표와 처리 이력 대시보드
- 금융 페르소나 데이터 세트 관리
- 회원 조회와 상태 변경
- 정부지원정책 등록·수정·삭제 및 변경 이력 조회
- 경험치 기준, 퀘스트 보상, 수동 경험치 지급 관리

---

## 5. 화면 구성

### 사용자 화면

| 경로 | 페이지 | 설명 | 인증 |
| --- | --- | --- | --- |
| `/` | 랜딩 페이지 | 서비스 소개 및 로그인 이동 | 불필요 |
| `/auth/login` | 로그인 | 사용자 로그인 | 불필요 |
| `/auth/signup` | 회원가입 | 본인인증 기반 신규 회원가입 | 불필요 |
| `/auth/find-id` | 아이디 찾기 | 본인인증 기반 가입 이메일 확인 | 불필요 |
| `/auth/find-password` | 비밀번호 찾기 | 본인인증 기반 비밀번호 재설정 | 불필요 |
| `/onboarding` | 온보딩 | 취업 준비 정보와 마이데이터 연결 | 필요 |
| `/dashboard` | 대시보드 | 재정 현황, 버티 상태, 퀘스트 조회 | 필요 |
| `/finance` | 내 재정 | 자산·수입·지출 및 거래내역 분석 | 필요 |
| `/finance/fixed` | 고정지출 | 고정지출 조회 및 관리 | 필요 |
| `/simulation` | 시뮬레이션 | 시뮬레이션 현황과 진입 흐름 | 필요 |
| `/simulation/new` | 새 시뮬레이션 | 기간 설정 및 맞춤 계획 생성 | 필요 |
| `/simulation/:category` | 계획 항목 선택 | 지출·수입·정책 항목 적용 | 필요 |
| `/simulation/:category/preview` | 결과 미리보기 | 계획 적용 전후 재정 결과 비교 | 필요 |
| `/simulation/confirm` | 시뮬레이션 확정 | 최종 계획 확인 및 확정 | 필요 |
| `/timeline` | 재정 타임라인 | 월별 자산과 현금 흐름 조회 | 필요 |
| `/search` | 정책 | 조건별 정책 목록 및 검색 | 필요 |
| `/search/:policyId` | 정책 상세 | 정책 지원 조건과 상세 내용 조회 | 필요 |
| `/notifications` | 알림함 | 알림 조회와 읽음 처리 | 필요 |
| `/mypage` | 마이페이지 | 프로필, 취업 준비 정보, 버티 레벨 조회 | 필요 |
| `/mypage/info` | 내 정보 | 사용자 정보 확인 및 수정 | 필요 |
| `/mypage/security` | 비밀번호·보안 | 비밀번호 변경과 보안 기능 | 필요 |
| `/mypage/data` | 데이터 관리 | 마이데이터 연결 자산 관리 | 필요 |
| `/mypage/withdraw` | 회원 탈퇴 | 사용자 계정 탈퇴 | 필요 |

### 관리자 화면

| 경로 | 페이지 | 설명 | 인증 |
| --- | --- | --- | --- |
| `/admin/dashboard` | 관리자 대시보드 | 운영 지표와 오류 이력 조회 | 필요 |
| `/admin/finance-data` | 금융데이터 관리 | 데이터 세트 및 회원 배정 관리 | 필요 |
| `/admin/policies` | 정책 관리 | 정책 등록·수정·삭제 | 필요 |
| `/admin/policies/history` | 정책 변경 이력 | 정책 변경 및 검수 이력 조회 | 필요 |
| `/admin/members` | 회원 관리 | 회원 조회 및 상태 변경 | 필요 |
| `/admin/level` | 경험치 관리 | 레벨 기준과 퀘스트 경험치 관리 | 필요 |

---

## 6. 프로젝트 디렉터리 구조

```text
src/
├─ api/                    # 사용자 서비스 API 요청 모듈
├─ assets/                 # 이미지, 로고, 아이콘 등 정적 자원
├─ components/
│  ├─ navigation/         # 헤더, 사이드바, 하단 내비게이션
│  └─ ui/                 # 공통 UI 컴포넌트
├─ constants/              # 카테고리 등 공통 상수
├─ data/                   # 공통 메시지와 목 데이터
├─ features/
│  ├─ admin/              # 관리자 화면, 컴포넌트, API
│  ├─ auth/               # 로그인, 회원가입, 계정 복구
│  ├─ dashboard/          # 사용자 대시보드
│  ├─ finance/            # 재정 분석과 고정지출
│  ├─ landing/            # 랜딩 페이지
│  ├─ mydata/             # 마이데이터 연결 상태
│  ├─ mypage/             # 마이페이지와 계정 관리
│  ├─ notification/       # 알림 조회와 설정
│  ├─ onboarding/         # 초기 사용자 정보 설정
│  ├─ quest/              # 퀘스트와 경험치
│  ├─ search/             # 정책 검색과 상세 조회
│  ├─ simulation/         # 재정 시뮬레이션 전체 흐름
│  └─ timeline/           # 월별 재정 타임라인
├─ layouts/                # 사용자 및 인증 공통 레이아웃
├─ mappers/                # API 응답을 화면 모델로 변환
├─ router/                 # Vue Router 설정과 접근 제어
├─ stores/                 # 공통 Pinia 스토어
├─ styles/                 # 디자인 토큰, 전역 및 초기화 스타일
├─ utils/                  # 날짜, URL, 기간 계산 유틸리티
├─ App.vue
└─ main.js
```

### 디렉터리 역할

| 디렉터리 | 설명 |
| --- | --- |
| `api` | Axios 기반 사용자 서비스 API 요청 함수 |
| `assets` | 이미지, 로고, 아이콘 등 정적 자원 |
| `components` | 여러 기능에서 재사용하는 내비게이션과 UI 컴포넌트 |
| `constants` | 화면과 API에서 공통으로 사용하는 상수 |
| `features` | 기능 단위 페이지, 컴포넌트, store, API 구성 |
| `layouts` | 사용자·인증 페이지 공통 레이아웃 |
| `mappers` | 서버 응답을 프론트엔드 데이터 형태로 변환 |
| `router` | 페이지 경로, 인증 가드, 페이지 제목 관리 |
| `stores` | 세션과 공통 상태를 관리하는 Pinia 스토어 |
| `styles` | 디자인 토큰과 전역 스타일 |
| `utils` | 날짜와 기간 등 공통 계산 함수 |

---

## 7. 개발 환경 설정

### 필수 설치 항목

- Node.js
- npm
- Git

### 지원 Node.js 버전

```text
Node.js: 22.18.x 또는 24.12 이상
```

설치된 버전은 다음 명령어로 확인합니다.

```bash
node -v
npm -v
git --version
```

---

## 8. 프로젝트 설치 및 실행

### 저장소 복제

```bash
git clone https://github.com/TALENTED-US/frontend.git
```

### 프로젝트 디렉터리 이동

```bash
cd frontend
```

### 패키지 설치

```bash
npm install
```

### 개발 서버 실행

```bash
npm run dev
```

실행 후 브라우저에서 다음 주소로 접속합니다.

```text
http://localhost:5173
```

### 프로덕션 빌드

```bash
npm run build
```

### 빌드 결과 미리 보기

```bash
npm run preview
```

### 코드 포맷팅

```bash
npm run format
```

---

## 9. 환경 변수 설정

프로젝트 루트의 `.env.example`을 참고하여 실행 환경에 맞는 환경 변수 파일을 생성합니다.

```dotenv
# 로컬에서는 인증 쿠키 처리를 위해 Vite 프록시 경로를 사용합니다.
VITE_API_BASE_URL=/backend

# 실제 백엔드 서버 주소를 입력합니다.
VITE_API_PROXY_TARGET=http://localhost:8080

# 목 API를 사용하려면 true로 설정합니다.
VITE_USE_MOCK_API=false
```

환경 변수의 역할은 다음과 같습니다.

| 변수 | 설명 |
| --- | --- |
| `VITE_API_BASE_URL` | Axios가 사용하는 API 기본 경로 |
| `VITE_API_PROXY_TARGET` | 개발 환경 Vite 프록시가 전달할 백엔드 주소 |
| `VITE_USE_MOCK_API` | 인증 등 일부 기능의 목 API 사용 여부 |

환경 변수 파일에는 API Key, 비밀번호, Access Token과 같은 민감 정보를 커밋하지 않습니다.

---

## 10. API 요청 구조

공통 Axios 인스턴스는 `src/api/client.js`에서 관리합니다.

```javascript
export const apiClient = axios.create({
  baseURL: normalizedBaseUrl,
  withCredentials: true,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
})
```

### 요청 처리 원칙

- API Base URL은 `VITE_API_BASE_URL`로 관리합니다.
- Access Token은 `sessionStorage`에 보관하고 요청 인터셉터에서 `Authorization` 헤더에 추가합니다.
- Refresh Token 쿠키 처리를 위해 `withCredentials: true`를 사용합니다.
- `401 Unauthorized` 발생 시 Access Token 재발급을 한 번만 수행합니다.
- 서버 공통 응답은 `unwrapApiResponse()`로 해제합니다.
- HTTP 및 네트워크 오류는 `normalizeApiError()`로 동일한 형태로 변환합니다.
- 각 도메인 API는 `src/api` 또는 해당 `features/*/api`에 분리합니다.

API 함수는 다음과 같이 동작을 나타내는 동사와 `Api` 접미사를 사용합니다.

```javascript
export function getCurrentSimulationApi() {
  return requestResult(() => apiClient.get('simulation'))
}

export function createSimulationApi(payload) {
  return requestResult(() => apiClient.post('simulation', payload))
}
```

---

## 11. 라우터 작성 규칙

라우터는 `src/router/index.js`에서 관리하며 페이지 컴포넌트는 동적 import를 사용합니다.

```javascript
{
  path: '/simulation',
  name: 'simulation',
  meta: { refreshMyData: true },
  component: () => import('@/features/simulation/pages/SimulationPage.vue'),
}
```

라우터 작성 시 다음 규칙을 사용합니다.

- 라우트 `name`은 기능을 설명하는 camelCase로 작성합니다.
- 인증이 필요한 상위 라우트에는 `meta.requiresAuth`를 설정합니다.
- 최신 마이데이터가 필요한 페이지에는 `meta.refreshMyData`를 설정합니다.
- 같은 레이아웃을 사용하는 페이지는 children으로 묶습니다.
- 페이지 컴포넌트는 동적 import하여 초기 번들 크기를 분리합니다.
- 존재하지 않는 경로는 랜딩 페이지로 리다이렉트합니다.
- 페이지 이름은 `router.afterEach()`에서 문서 제목에 반영합니다.

---

## 12. 컴포넌트 작성 규칙

### 컴포넌트 이름

Vue 컴포넌트 파일은 PascalCase를 사용합니다.

```text
ButtieImage.vue
MyDataConnectModal.vue
SimulationTimelineChart.vue
```

### 페이지 컴포넌트

라우터에 직접 등록하는 컴포넌트에는 `Page` 접미사를 사용합니다.

```text
DashboardPage.vue
SimulationPage.vue
AdminMemberListPage.vue
```

### 공통 컴포넌트

- 내비게이션 컴포넌트는 `src/components/navigation`에 작성합니다.
- 여러 기능에서 사용하는 UI는 `src/components/ui`에 작성합니다.
- 특정 기능에서만 사용하는 컴포넌트는 `src/features/{기능}/components`에 작성합니다.
- 화면 로직은 `<script setup>`과 Composition API를 사용합니다.
- Props는 외부에서 전달받는 값, Emits는 부모에게 전달할 이벤트로 구분합니다.

---

## 13. 코드 작성 규칙

프로젝트의 현재 코드 스타일을 기준으로 다음 규칙을 사용합니다.

### 변수와 함수

camelCase를 사용합니다.

```javascript
const currentUser = {}
const loadCurrentUser = async () => {}
```

### 상수

대문자와 언더스코어를 사용합니다.

```javascript
const ACCESS_TOKEN_KEY = 'buttie-access-token'
const MAX_RETRY_COUNT = 1
```

### Boolean 변수

`is`, `has`, `can`, `should` 등 상태를 나타내는 접두사를 사용합니다.

```javascript
const isAuthenticated = true
const hasPermission = false
const canSubmit = true
```

### 이벤트 처리 함수

사용자 또는 컴포넌트 이벤트 처리 함수에는 `handle` 접두사를 사용합니다.

```javascript
const handleSubmit = () => {}
const handleModalClose = () => {}
```

### API 함수

동작을 나타내는 동사로 시작하고 `Api` 접미사를 사용합니다.

```javascript
getTransactionsApi()
createSimulationApi()
updateEmploymentPreparationApi()
```

### Store

Pinia store 함수는 `use{도메인}Store` 형식을 사용합니다.

```javascript
useSessionStore()
useSimulationStore()
useQuestStore()
```

### Prettier

```json
{
  "semi": false,
  "singleQuote": true,
  "printWidth": 100
}
```

---

## 14. Git 브랜치 전략

| 브랜치 | 설명 |
| --- | --- |
| `main` | 배포 가능한 안정 버전 |
| `develop` | 기능 통합 및 다음 배포 준비 브랜치 |
| `feature/*` | Jira/GitHub Issue 기반 기능 및 문서 작업 |
| `fix/*` | 일반 오류 수정 |
| `hotfix/*` | 운영 환경 긴급 수정 |

작업 브랜치는 Jira 티켓 번호와 영문 작업명을 포함합니다.

```text
feature/BUT-123-simulation-api-completion
feature/BUT-150-policy-api-integration
feature/BUT-186-frontend-readme
```

### 작업 브랜치 생성

GitHub Issue를 생성하면 GitHub Actions가 `develop`을 기준으로 feature 브랜치를 생성합니다. 직접 생성할 때는 다음 순서로 진행합니다.

```bash
git switch develop
git pull origin develop
git switch -c feature/BUT-000-task-name
```

### 작업 완료 후 Push

```bash
git add .
git commit -m "docs: 프론트엔드 README 문서화"
git push origin feature/BUT-000-task-name
```

`main`과 `develop` 브랜치에는 직접 Push하지 않습니다.

---

## 15. 커밋 메시지 규칙

커밋 메시지는 다음 형식을 사용합니다.

```text
타입: 작업 내용
```

### 커밋 타입

| 타입 | 설명 |
| --- | --- |
| `feat` | 새로운 기능 추가 |
| `fix` | 오류 수정 |
| `design` | UI 및 스타일 변경 |
| `refactor` | 기능 변경 없는 코드 구조 개선 |
| `docs` | README 등 문서 변경 |
| `test` | 테스트 코드 작성 및 수정 |
| `chore` | 빌드, 패키지, 환경 설정 변경 |
| `rename` | 파일명 또는 경로 변경 |
| `remove` | 파일 또는 코드 삭제 |

예시:

```text
feat: 시뮬레이션 API 연동
fix: 토큰 만료 시 로그인 이동 오류 수정
design: 모바일 정책 카드 스타일 개선
refactor: 사용자 프로필 매핑 로직 분리
docs: 프론트엔드 README 문서화
```

커밋에는 하나의 논리적인 변경 단위만 포함합니다.

---

## 16. Pull Request 규칙

Pull Request는 기능 또는 문서 작업 단위로 작성하며 `develop` 브랜치를 대상으로 생성합니다.

### PR 제목

```text
docs: 프론트엔드 README 문서화
```

### PR 본문

저장소의 `.github/PULL_REQUEST_TEMPLATE.md` 양식을 사용합니다.

```markdown
## 📄 PR 요약

> 변경 목적을 간단히 설명합니다.

## ✍🏻 PR 상세

1. 주요 변경 사항을 작성합니다.

## 👀 참고사항

- 리뷰 시 확인할 내용을 작성합니다.

## ✅ 체크리스트

- [ ] PR 양식에 맞게 작성했습니다.
- [ ] 모든 테스트가 통과했습니다.
- [ ] 프로그램이 정상적으로 작동합니다.
- [ ] 적절한 라벨을 설정했습니다.
- [ ] 불필요한 코드를 제거했습니다.

## 🚪 연관된 이슈 번호

Closes #{이슈 번호}
```

### PR 확인 사항

- 불필요한 콘솔 출력과 사용하지 않는 import 제거
- 환경 변수 및 비밀 정보 포함 여부 확인
- `npm run build` 실행 확인
- 변경 기능의 정상·오류·빈 상태 확인
- 데스크톱 및 모바일 화면 확인
- `develop`과의 충돌 여부 확인
- GitHub Issue와 Jira 티켓 연결 확인

---

## 17. 협업 절차

1. GitHub Issue를 생성하고 상위 Jira Ticket Number와 영문 브랜치명을 입력합니다.
2. GitHub Actions가 Jira 이슈를 생성하고 Issue 제목에 Jira Key를 반영합니다.
3. `develop`을 기준으로 `feature/{Jira Key}-{branchName}` 브랜치를 생성합니다.
4. 기능 구현 또는 문서 작업을 진행합니다.
5. 로컬에서 포맷팅, 빌드, 기능 확인을 수행합니다.
6. 작업 내용을 커밋한 뒤 원격 브랜치에 Push합니다.
7. `develop` 브랜치를 대상으로 Pull Request를 생성합니다.
8. Pull Request 본문에 `Closes #{GitHub Issue 번호}`를 작성합니다.
9. 코드 리뷰 의견을 반영하고 승인 후 병합합니다.
10. GitHub Actions가 Jira 상태를 Pull Request 진행 상태와 동기화합니다.

---

## 18. 개발 시 주의사항

- `main`, `develop` 브랜치에 직접 Push하지 않습니다.
- API 주소를 컴포넌트에 직접 작성하지 않습니다.
- API 요청 함수는 `src/api` 또는 `features/*/api`로 분리합니다.
- Access Token, API Key, 비밀번호, 운영 환경 변수를 커밋하지 않습니다.
- 페이지 진입 시 필요한 서버 상태와 Pinia 상태의 동기화 여부를 확인합니다.
- API 응답 필드는 mapper 또는 store에서 화면 데이터로 변환합니다.
- 로딩, 오류, 빈 상태를 각각 처리합니다.
- 공통 UI는 `components`로 분리하고 기능 전용 UI는 해당 `features`에 작성합니다.
- UI 변경 시 요청·응답 DTO와 기존 API 사용처의 영향을 함께 확인합니다.
- 모바일 하단 내비게이션과 데스크톱 레이아웃을 모두 확인합니다.
- 작업 완료 전 `npm run build`를 실행합니다.

---

## 19. TODO

### 사용자 서비스

- [x] 회원가입, 로그인, 로그아웃
- [x] 본인인증 기반 계정 찾기와 비밀번호 재설정
- [x] 마이데이터 연결 및 금융 데이터 동기화
- [x] 거래내역과 고정지출 관리
- [x] 재정 대시보드와 타임라인
- [x] 지출·수입·정책 기반 재정 시뮬레이션
- [x] 정책 검색과 AI 맞춤 추천
- [x] 퀘스트와 버티 성장 정보 연동
- [x] 알림 조회와 설정
- [ ] 시뮬레이션과 정책 추천 흐름 최종 QA
- [ ] 자동화된 프론트엔드 테스트 환경 구축

### 관리자 서비스

- [x] 관리자 공통 레이아웃
- [x] 운영 대시보드 UI
- [x] 금융데이터 관리 UI
- [x] 회원 관리 UI
- [x] 정책 관리 UI
- [x] 경험치 및 레벨 관리 UI
- [ ] 관리자 기능 백엔드 API 연동

---

## 20. 알려진 문제

| 문제 | 원인 | 상태 |
| --- | --- | --- |
| 일부 관리자 화면이 목 데이터로 동작함 | 관리자 API 모듈이 로컬 mock 데이터를 사용 | API 연동 예정 |
| 자동화된 단위·컴포넌트 테스트를 실행할 수 없음 | 테스트 도구와 npm test 스크립트 미구성 | 구축 예정 |
| 확정 시뮬레이션 상태에 따라 신규 생성 결과가 달라질 수 있음 | 서버의 시뮬레이션과 월별 전망 데이터 정합성 의존 | 백엔드 협의 중 |

---

## 21. 팀원 및 담당 기능

| 이름 | 역할 | 담당 기능 |
| --- | --- | --- |
| 남우현 | PL, Frontend | 사용자 UI 구현 및 API 연동, QA 및 개선점 파악·수정, UX 개선에 따른 API 구조 정립 |
| 김서연 | Frontend, 기획 | 와이어프레임 제작, UI/UX 개선 및 설계, 관리자 UI 구현 및 API 연동, 서비스 기획 |

담당 기능은 개발 상황에 따라 변경될 수 있습니다.

---

## 22. 관련 문서

- API 명세서: [Notion API 명세서](https://app.notion.com/p/phurray/API-3911aef33b80804ab691e0a297c86576?source=copy_link)
- Figma: [BUTTIE App](https://www.figma.com/design/payAhB7xdeA65cqvXQkRJP/Buttie-App-?t=1bZeMur7rrtbxnN0-0)
- Jira 프로젝트: [BUT 프로젝트](https://pjt22-2.atlassian.net/jira/software/projects/BUT/boards/1/timeline)
- Notion 문서: [BUTTIE 프로젝트 문서](https://app.notion.com/p/phurray/3911aef33b808079ba77fe1c4ca97894?source=copy_link)
- Backend 저장소: [TALENTED-US/backend](https://github.com/TALENTED-US/backend)

---

## 23. 문의

프로젝트 관련 문의와 오류 제보는 [GitHub Issues](https://github.com/TALENTED-US/frontend/issues)를 이용합니다.
