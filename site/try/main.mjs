import DOMPurify from 'dompurify';
import {mountViewer} from '../../src/viewer.mjs';

const examples = {
  flow: 'flowchart LR\n  Request[Receive a request] --> Check{Valid input?}\n  Check -->|Yes| Queue[Queue the work]\n  Check -->|No| Revise[Explain what to fix]\n  Queue --> Save[(Save the result)]',
  er: 'erDiagram\n  direction LR\n  SOURCE ||--o{ NOTE : informs\n  NOTE ||--o{ REVISION : retains\n  SOURCE {\n    string id PK\n    string title\n  }\n  NOTE {\n    string id PK\n    string source_id FK\n  }\n  REVISION {\n    string id PK\n    string note_id FK\n    datetime created_at\n  }',
  sequence: 'sequenceDiagram\n  participant Reader\n  participant API\n  participant Store\n  Reader->>API: Open a document\n  API->>Store: Read current revision\n  Store-->>API: Source and revision\n  API-->>Reader: Show the document\n  Note over Reader,Store: Reading leaves the source unchanged',
  loop: '%% layout: loop\nflowchart LR\n  Read[Read the source] --> Explain[Explain the idea]\n  Explain --> Try[Try an example]\n  Try --> Review[Review the result]\n  Review --> Read',
  korean: '%% layout: flowchart\nflowchart TB\n  A[원자료와 기존 문서를 함께 확인] --> B{변경 내용을 검증했나요?}\n  B -->|예| C[검토한 내용을 문서에 반영]\n  B -->|아니요| D[문제가 있는 부분을 다시 확인]\n  D --> A',
  styled: '%% layout: flowchart\nflowchart LR\n  A[Open the documentation] --> B[Keep your own colours]\n  style A fill:#e8f0ed,stroke:#376454,color:#18352a\n  click A "https://mermaid.js.org/" "Mermaid documentation" _blank',
  pie: 'pie title Notes by topic\n  "Engineering" : 6\n  "Research" : 3\n  "Writing" : 2',
  mindmap: 'mindmap\n  root((A document))\n    Sources\n    Examples\n    Related notes',
  git: 'gitGraph\n  commit id: "first draft"\n  branch review\n  checkout review\n  commit id: "clarify"\n  checkout main\n  merge review',
  invalid: 'flowchart LR\n  A[An unfinished label',
};
const source = document.querySelector('#source');
const viewer = document.querySelector('#viewer');
let dispose, dark = false;
const render = () => {
  dispose?.();
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  dispose = mountViewer(viewer, source.value, {dark,
    sanitize: svg => DOMPurify.sanitize(svg, {RETURN_DOM_FRAGMENT: true, ADD_TAGS:['foreignObject'], ADD_ATTR:['target']})});
};
document.querySelector('#example').addEventListener('change', event => {source.value = examples[event.target.value]; render();});
document.querySelector('#render').addEventListener('click', render);
document.querySelector('#theme').addEventListener('click', event => {dark = !dark; event.target.textContent = dark ? 'Light theme' : 'Dark theme'; render();});
window.addEventListener('pagehide', () => dispose?.());
source.value = examples.flow;
render();
