import {families} from './types.mjs';
const graph = `flowchart LR
  User[사용자] --> App[애플리케이션]
  App --> API[API]
  API --> DB[(데이터베이스)]
  API --> Cache[(캐시)]`;
const grouped = `flowchart LR
  subgraph Client[클라이언트]
    User[사용자] --> Web[웹 화면]
  end
  subgraph Service[서비스]
    API[API] --> Worker[작업 실행]
  end
  subgraph Storage[저장소]
    DB[(데이터베이스)]
    Files[(파일)]
  end
  Web --> API
  Worker --> DB
  Worker --> Files`;
const tree = `flowchart TB
  Root[제품 개발] --> Research[사용자 조사]
  Root --> Build[구현]
  Root --> Verify[검증]
  Build --> Editor[편집기]
  Build --> Renderer[렌더러]`;
const steps = `flowchart LR
  A[자료 수집] --> B[분석]
  B --> C[작성]
  C --> D[검토]
  D --> E[반영]`;
const xy = `xychart-beta
  x-axis ["월", "화", "수", "목", "금"]
  y-axis "처리 건수" 0 --> 100
  bar [32, 48, 40, 76, 88]`;
const er = `erDiagram
  direction LR
  USER ||--o{ NOTE : owns
  NOTE ||--o{ REVISION : contains
  USER {
    int id PK
    string name
  }
  NOTE {
    int id PK
    int user_id FK
    string title
  }
  REVISION {
    int id PK
    int note_id FK
    string body
  }`;
const classes = `classDiagram
  direction LR
  class Source {
    +String text
    +read() String
  }
  class Renderer {
    +render(source) Diagram
  }
  class Diagram {
    +String svg
    +String[] warnings
  }
  Source --> Renderer : 입력
  Renderer --> Diagram : 생성`;
const raw = [
  ['architecture','아키텍처',grouped],
  ['it-state','현재 IT 구성',grouped],
  ['flowchart','흐름도',`flowchart LR
    A[자료 입력] --> B{기존 문서가 있는가?}
    B -->|있음| C[문서 갱신]
    B -->|없음| D[문서 생성]
    C --> E[검토]
    D --> E
    E --> F[저장]`],
  ['sequence','시퀀스',`sequenceDiagram
    participant U as 사용자
    participant A as 앱
    participant S as 저장소
    U->>A: 문서 열기
    A->>S: 내용 조회
    S-->>A: 문서 반환
    A-->>U: 화면 표시
    U->>A: 수정
    A->>S: 저장
    S-->>A: 완료`],
  ['state','상태 전이',`stateDiagram-v2
    [*] --> Draft
    Draft --> Review: 검토 요청
    Review --> Draft: 수정 요청
    Review --> Published: 승인
    Published --> Archived: 보관
    Archived --> [*]`],
  ['er','ER 모델',er],
  ['timeline','타임라인',`timeline
    2023 : 문제 발견
    2024 : 첫 구현
    2026 : 공개 검증
    2028 : 확장`],
  ['swimlane','스윔레인',`flowchart LR
    subgraph User[사용자]
      A[자료 입력]
      D[결과 검토]
    end
    subgraph App[앱]
      B[내용 분석]
      C[수정안 생성]
    end
    subgraph Storage[저장소]
      E[저장]
    end
    A --> B --> C --> D --> E`],
  ['quadrant','사분면',`quadrantChart
    x-axis 적은 노력 --> 많은 노력
    y-axis 낮은 효과 --> 높은 효과
    quadrant-1 큰 투자
    quadrant-2 먼저 실행
    quadrant-3 유지
    quadrant-4 재검토
    입력 개선: [0.22, 0.78]
    동기화: [0.73, 0.68]
    색상 추가: [0.3, 0.24]
    전체 재작성: [0.83, 0.16]`],
  ['radar','레이더',`radar-beta
    axis a["정확성"], b["속도"], c["가독성"], d["호환성"], e["유지보수"]
    curve before["기존"] {6,8,4,9,6}
    curve after["개선안"] {8,7,9,9,8}
    max 10`],
  ['polar','극좌표',xy],
  ['loop','순환',`%% hub: W
%% focus: C
flowchart LR
  A[자료 수집] --> B[내용 정리] --> C[검토] --> D[반영] --> E[재사용] --> F[개선] --> A
  W[Wiki]
  A & B & C & D & E & F -.-> W`],
  ['nested','중첩 범위',`flowchart TB
    subgraph Org[조직]
      subgraph Team[팀]
        subgraph Project[프로젝트]
          subgraph Module[모듈]
            Rules[적용 규칙]
          end
        end
      end
    end`],
  ['tree','트리',tree],
  ['org-chart','조직·역할',`%% focus: Lead
flowchart TB
  Lead[제품 담당] --> Design[디자인]
  Lead --> Dev[개발]
  Lead --> QA[품질 검증]
  Dev --> Client[클라이언트 담당]
  Dev --> Server[서버 담당]`],
  ['layers','계층',`flowchart TB
    UI[사용자 화면] --> Agent[작업 조정]
    Agent --> Prompt[프롬프트]
    Prompt --> SDK[SDK 및 클라이언트]
    SDK --> Model[모델 실행]`],
  ['venn','벤 다이어그램',`flowchart LR
    A[개발] ---|자동화| B[기록]
    B ---|지식 공유| C[학습]
    C ---|실험| A`],
  ['pyramid','피라미드',`flowchart TB
    A[검증된 지식] --> B[종합 문서]
    B --> C[정리된 기록]
    C --> D[원자료]`],
  ['bar','막대',xy],
  ['waterfall','워터폴',`%% totals: 0,4
xychart-beta
  x-axis ["시작", "유입", "이탈", "복구", "최종"]
  y-axis "사용자 수" 0 --> 160
  bar [100, 45, -20, 10, 135]`],
  ['treemap','트리맵',`treemap-beta
    "자료 구성"
      "개발": 45
      "학습": 30
      "기록": 15
      "기타": 10`],
  ['line','선',xy.replace('bar [','line [')],
  ['gantt','간트',`gantt
    dateFormat YYYY-MM-DD
    section 구현
    파서 연결 :a, 2026-09-01, 3d
    배치 구현 :b, after a, 4d
    section 검증
    호환성 검사 :c, 2026-09-06, 3d
    화면 검사 :d, after c, 2d`],
  ['scatter','산점도',`xychart-beta
    x-axis "작업 시간" 1 --> 5
    y-axis "처리 건수" 0 --> 100
    line [32, 48, 40, 76, 88]`],
  ['high-level','전체 시스템',grouped],
  ['process','프로세스',steps],
  ['medallion','데이터 정제 단계',`flowchart LR
    Raw[원자료] --> Bronze[Bronze<br/>수집 데이터]
    Bronze --> Silver[Silver<br/>검증 데이터]
    Silver --> Gold[Gold<br/>활용 데이터]
    Gold --> Consumer[분석 및 서비스]`],
  ['data-flow','데이터 흐름',`flowchart LR
    subgraph Input[입력]
      A[문서]
      B[대화]
    end
    subgraph Process[처리]
      C[분석]
      D[정리]
    end
    subgraph Output[결과]
      E[Wiki]
    end
    A --> C
    B --> C
    C --> D --> E`],
  ['dp-integration','데이터 플랫폼 통합',grouped],
  ['dp-security-matrix','접근 권한 표',`flowchart LR
    Guest[방문자] -->|읽기| Public[공개 문서]
    Member[구성원] -->|읽기| Public
    Member -->|읽기·쓰기| Draft[초안]
    Admin[관리자] -->|전체| Public
    Admin -->|전체| Draft
    Admin -->|관리| Settings[설정]`],
  ['sankey','생키',`sankey-beta
입력,자동 처리,80
입력,수동 검토,20
자동 처리,완료,75
자동 처리,재시도,5
수동 검토,완료,18
수동 검토,재시도,2`],
  ['fishbone','원인 분석',`flowchart LR
    A[설명 누락] --> Content[내용]
    B[출처 누락] --> Content
    C[라벨 겹침] --> Design[표현]
    D[작은 글자] --> Design
    E[검증 부족] --> Process[절차]
    Content --> Problem[반복 수정]
    Design --> Problem
    Process --> Problem`],
  ['wardley','Wardley 지도',`%% position: User 0.55 0.92
%% position: Product 0.3 0.72
%% position: Renderer 0.55 0.48
%% position: Storage 0.9 0.18
flowchart TB
    User[사용자] --> Product[Wiki 도구]
    Product --> Renderer[렌더링]
    Renderer --> Storage[저장소]`],
  ['kanban','칸반',`%% wip: Doing 2
kanban
  Todo[예정]
    A[소스 확인]
    B[디자인 비교]
  Doing[진행]
    C[렌더러 구현]
    D[호환성 검증]
  Done[완료]
    E[예제 검증]`],
  ['journey','사용자 여정',`journey
    section 첫 사용
    설치: 5: 사용자
    자료 입력: 4: 사용자
    오류 수정: 2: 사용자
    결과 확인: 4: 사용자
    section 재사용
    다음 자료 추가: 5: 사용자`],
  ['deployment','배포 구성',grouped],
  ['dependency','의존 관계',`flowchart LR
    App[앱] --> Core[공통 렌더러]
    Web[웹 Wiki] --> Core
    Core --> Parser[Mermaid 파서]
    Core --> Layout[배치 계산]
    Layout --> Tokens[디자인 토큰]`],
  ['uml-class','UML 클래스',classes],
  ['story-map','사용자 스토리 맵',`%% slice: A MVP
%% slice: B MVP
%% slice: C 다음 릴리스
%% slice: D 다음 릴리스
%% cut: MVP
flowchart LR
    subgraph Capture[자료 넣기]
      A[텍스트 입력]
      C[파일 가져오기]
    end
    subgraph Organize[결과 보기]
      B[다이어그램 확인]
      D[변경 비교]
    end`],
  ['db-schema','데이터베이스 스키마',`%% fk: NOTE.user_id -> USER.id : ON DELETE CASCADE
%% fk: REVISION.note_id -> NOTE.id : ON DELETE CASCADE
${er}`],
];
export const legacyExamples = raw.map(([id,label,source]) => ({id,label,source:`%% layout: ${id}\n${source}`}));
export const examples=families.map(f=>({...f,source:f.id==='block'?`block-beta
columns 3
A["입력"] space B["결과"]
C["검토 범위"]:3
A-->C
C-->B`:legacyExamples.find(e=>e.id===f.id).source}));
export const types=Object.fromEntries(families.map(({id,label})=>[id,label]));
