import {examples} from './examples.mjs';

const range=n=>Array.from({length:n},(_,i)=>i);
const flow=(type,body,dir='LR')=>`%% layout: ${type}\nflowchart ${dir}\n${body}`;
const xy=(kind,values,extra='')=>`%% layout: ${kind}\n${extra}\nxychart-beta\n x-axis [${values.map((_,i)=>`"${i+1}차 검증"`).join(',')}]\n y-axis "처리 건수" -40 --> 180\n ${kind==='bar'||kind==='waterfall'?'bar':'line'} [${values.join(',')}]`;
const big={};
const componentNames=[
 ['사용자 요청','계정 인증','입력 형식 검사','접근 권한 확인','첨부 자료 분석','작업 접수','접수 기록'],
 ['분석 작업 큐','본문 추출','출처 해석','주장 후보 수집','키워드 추출','문서 연결','분석 결과'],
 ['검증 작업 큐','기존 문서 조회','원문 대조','중복 확인','충돌 확인','검토 결과 병합','검증 기록'],
 ['변경 요청','문서 저장','revision 저장','첨부 저장','해시 검증','복구 지점 생성','문서 저장소'],
 ['색인 요청','본문 색인','키워드 색인','링크 색인','접근 권한 색인','검색 결과 병합','검색 색인'],
 ['감사 이벤트','실행 시간 수집','오류 수집','사용량 집계','재시도 판단','복구 요청','감사 저장소'],
];
big.architecture=flow('architecture',componentNames.map((names,i)=>`subgraph G${i}[${['접수와 사용자 인증','비동기 분석 서비스','정리와 품질 검증','문서 저장과 복구','검색과 연결 색인','운영과 감사 기록'][i]}]\ndirection TB\n${names.map((name,j)=>`N${i}_${j}${j===6?`[(${name})]`:`[${name}]`}`).join('\n')}\n${[[0,1],[0,2],[1,3],[2,4],[3,5],[4,5],[5,6]].map(([a,b])=>`N${i}_${a} --> N${i}_${b}`).join('\n')}\nend`).join('\n')+'\n'+[[0,1],[0,2],[0,3],[0,4],[1,5],[2,5],[3,5],[4,5]].map(([a,b])=>`N${a}_6 -->|처리 결과| N${b}_0`).join('\n')+'\nN0_1 --> N1_1\nN0_2 --> N2_1\nN0_3 --> N3_1\nN0_4 --> N4_1\nN2_4 --> N5_3\nN5_4 -.->|복구 요청| N0_0','TB');
big.flowchart=flow('flowchart',range(42).map(i=>`N${i}${i%7===3?`{${i+1}단계 검증 조건을 만족하는가?}`:`[${i+1}단계 자료 분석과 변경 기록]`}`).join('\n')+'\n'+range(35).map(i=>`N${i} -->${i%7===3?'|통과|':''} N${i+7}`).join('\n')+'\n'+range(5).flatMap(level=>[1,3,5].map(col=>`N${level*7+col} -->|추가 확인| N${(level+1)*7+col+1}`)).join('\n')+'\nN24 -.->|다시 검토| N10\nN38 -.->|복구| N17','TB');
big.tree=flow('tree','Root[제품 개발과 운영 책임]\n'+range(6).map(i=>`Root --> T${i}[${i+1}번째 담당 조직]\n`+range(6).map(j=>`T${i} --> N${i}_${j}[${i+1}.${j+1} 자료 분석 및 품질 책임]`).join('\n')).join('\n'),'LR');
big.er=`erDiagram\n direction TB\n`+range(12).map(i=>` ENTITY_${i} {\n int id PK\n int parent_id FK\n string external_reference_key UK\n string display_name\n string source_document_path\n string revision_hash\n datetime created_at\n datetime verified_at\n }`).join('\n')+'\n'+range(11).map(i=>`ENTITY_${Math.floor(i/3)} ||--o{ ENTITY_${i+1} : "${i+1}단계 자료 연결"`).join('\n')+'\nENTITY_0 |o--o{ ENTITY_4 : optional_owner\nENTITY_2 ||--|{ ENTITY_8 : revisions\nENTITY_3 ||--o| ENTITY_10 : latest\nENTITY_7 ||--o{ ENTITY_7 : parent';
big['uml-class']=`classDiagram\n direction TB\n`+range(12).map(i=>` class Component${i} {\n ${i===0?'<<interface>>\n':''}+String identifier\n +String sourceDocumentPath\n -int revisionNumber\n +validate(source) ValidationResult\n +render(document, options) DiagramResult\n +rollback(revision) void\n }`).join('\n')+'\n'+range(11).map(i=>`Component${Math.floor(i/3)} ${['<|--','*--','o--','..>','-->'][i%5]} Component${i+1} : ${['구현','소유','참조','의존','호출'][i%5]}`).join('\n')+'\nComponent2 ..> Component9 : 재검증\nComponent5 --> Component5 : 내부 재시도';
big.nested=flow('nested',`subgraph O[조직의 공통 정책]\n subgraph T[플랫폼 팀의 작업 범위]\n  subgraph P[자료 정리 프로젝트]\n   subgraph M[문서 검증 모듈]\n    subgraph R[요청 한 건의 실행 범위]\n     A[입력 자료를 검증]\n     B[변경을 적용]\n     A --> B\n    end\n    C[모듈에 적용되는 예외 정책]\n   end\n   D[프로젝트의 공통 용어]\n  end\n  E[팀의 자료 접근 규칙]\n end\n F[조직의 감사 기록]\nend`,'TB');
big['dp-security-matrix']=flow('dp-security-matrix',range(8).map(i=>`R${i}[${['방문자','일반 구성원','문서 편집자','자료 검토자','프로젝트 관리자','보안 감사자','운영 담당자','최고 관리자'][i]}]`).join('\n')+'\n'+range(7).map(j=>`C${j}[${['공개 문서','내부 초안','변경 기록','자동화 설정','계정 정보','복구 데이터','감사 보고서'][j]}]`).join('\n')+'\n'+range(8).flatMap(i=>range(7).filter(j=>j<=i||i===7).map(j=>`R${i} -->|${i>5?'조회 · 변경 · 복구':j%2?'조회 · 검토':'읽기'}| C${j}`)).join('\n'));
big.sankey='sankey-beta\n'+range(4).flatMap(layer=>range(4).flatMap(i=>range(2).map(j=>`${['원자료 접수','문서 분류','내용 검증','변경 적용','최종 결과'][layer]} ${i+1},${['원자료 접수','문서 분류','내용 검증','변경 적용','최종 결과'][layer+1]} ${(i+j)%4+1},${j?5:95}`))).join('\n');
big.sequence='sequenceDiagram\n'+range(8).map(i=>`participant P${i} as ${['사용자','접수 API','작업 큐','분석기','검증기','저장소','검색기','감사 기록'][i]}`).join('\n')+'\n'+range(3).map(i=>`loop ${i+1}번째 자료 묶음\n P0->>P1: ${i+1}. 입력 자료와 요청 조건 전달\n activate P1\n P1->>P2: 처리 작업 등록\n P2->>P3: 입력 내용 분석\n alt 검증 대상 있음\n  P3->>P4: 출처와 변경 내용을 검토\n  P4->>P4: 기존 규칙과 다시 비교\n  par 저장\n   P4->>P5: 검증된 변경 기록\n   P5-->>P4: 저장한 revision 반환\n  and 색인\n   P4->>P6: 검색 색인 갱신\n   P6-->>P4: 갱신 결과 반환\n  end\n else 검증 대상 없음\n  P3-->>P1: 보류 사유 전달\n end\n P4->>P7: 처리 결과와 오류 기록\n Note over P1,P4: 원문과 revision을 함께 대조\n P7-->>P1: 감사 기록 완료\n P1-->>P0: 변경 내역 안내\n deactivate P1\nend`).join('\n');
big.state='stateDiagram-v2\n direction LR\n[*] --> S0\n'+range(18).map(i=>`state "${i+1}단계 자료 처리 상태" as S${i}`).join('\n')+'\n'+range(17).map(i=>`S${i} --> S${i+1} : ${i%3===0?'검증 완료':'다음 단계'}`).join('\n')+'\nS8 --> S3 : 재검토\nS13 --> S9 : 복구\nS17 --> [*]';
big.swimlane=flow('swimlane',range(5).map(i=>`subgraph G${i}[${['자료를 제공하는 사용자','문서 수집 담당','내용 분석 담당','변경 검토 담당','저장과 복구 담당'][i]}]\n`+range(6).map(j=>`N${i}_${j}[${j+1}차 ${i+1}번 자료 처리와 검토]`).join('\n')+'\nend').join('\n')+'\n'+range(5).flatMap(i=>range(5).map(j=>`N${i}_${j} --> N${i}_${j+1}`)).join('\n')+'\n'+range(4).flatMap(i=>range(4).map(j=>`N${i}_${j} --> N${i+1}_${j+1}`)).join('\n'));
big.kanban='%% wip: Doing 8\nkanban\n'+['Todo','Ready','Doing','Review','Done'].map((col,i)=>` ${col}[${['예정','준비 완료','진행 중','검토 중','완료'][i]}]\n`+range(8-i).map(j=>`  K${i}_${j}[${j+1}번째 문서 분석과 ${i%2?'긴 자료 제목의 수정 사항 검토':'수집 결과 확인'}]`).join('\n')).join('\n');
big['story-map']=flow('story-map',range(5).flatMap(i=>range(8).map(j=>`%% slice: S${i}_${j} ${['MVP','다음 릴리스','운영 개선'][Math.floor(j/3)]}`)).join('\n')+'\n%% cut: MVP\n'+range(5).map(i=>`subgraph G${i}[${['자료 넣기','내용 정리','결과 검토','변경 적용','기록 재사용'][i]}]\n`+range(8).map(j=>`S${i}_${j}[${j+1}번째 ${['입력 형식 확인','출처 정보 대조','긴 문서 제목과 수정 항목 확인'][j%3]}]`).join('\n')+'\nend').join('\n'));
big.fishbone=flow('fishbone','P[같은 문서의 반복 수정]\n'+['내용','절차','표현','연결','입력','검증'].map((name,i)=>`C${i}[${name}의 문제] --> P\n`+range(6).map(j=>`L${i}_${j}[${['원문 조건 누락','출처를 잘못 연결','긴 라벨이 서로 겹침','예외 사례 확인 부족','처리 순서를 잘못 적용','복구 결과를 확인하지 않음'][j]}] --> C${i}`).join('\n')).join('\n'));
big.loop=flow('loop','%% hub: H\nH[공유된 검증 기록]\n'+range(12).map(i=>`N${i}[${i+1}차 ${['자료 수집','검증 기준 확인','변경 검토','결과 재사용'][i%4]}] --> N${(i+1)%12}`).join('\n')+'\n'+range(12).map(i=>`N${i} -.-> H`).join('\n'));
for(const type of ['layers','pyramid'])big[type]=flow(type,range(8).map(i=>`N${i}[${i+1}단계 ${['검증된 결과','정리된 문서','분석 중인 자료','원문과 출처'][i%4]}]`).join('\n')+'\n'+range(7).map(i=>`N${i} --> N${i+1}`).join('\n'),'TB');
big.venn=flow('venn','A[개발과 자동화] ---|지식을 도구에 반영| B[학습과 검증]\nB ---|검증한 내용을 공유| C[기록과 공유]\nC ---|반복 작업을 개선| A');
big.block='block-beta\ncolumns 5\n'+range(5).map(i=>`A${i}["${i+1}차 자료 분석"]:2 space B${i}["${i+1}차 검토와 반영"]:2`).join('\n')+'\n'+range(5).map(i=>`A${i} --> B${i}`).join('\n');
big.wardley=flow('wardley',range(12).map(i=>`%% position: N${i} ${.12+(i%4)*.22} ${.88-Math.floor(i/4)*.34}\nN${i}[${['사용자 요구','자료 검색','내용 검증','변경 기록','편집 화면','자동 분류','연결 분석','자료 수집','공통 규칙','파일 저장','작업 큐','운영 지표'][i]}]`).join('\n')+'\n'+range(8).map(i=>`N${i} --> N${i+4}`).join('\n'),'TB');
big.timeline='timeline\n'+range(12).map(i=>` ${2014+i} : ${i+1}차 입력 형식 정리\n : 출처 확인과 검증 범위 확장`).join('\n');
big.gantt='gantt\n dateFormat YYYY-MM-DD\n'+range(3).map(s=>` section ${['초기 구현','확장 검증','운영 개선'][s]}\n`+range(6).map(i=>` ${i+1}차 자료 처리와 복구 경로 확인 :${s===1&&i===2?'crit, ':''}a${s}_${i}, 2026-09-${String(1+s*6+i).padStart(2,'0')}, ${2+i%4}d`).join('\n')).join('\n');
big.journey='journey\n'+range(3).map(s=>` section ${['첫 사용','반복 작업','오류 복구'][s]}\n`+range(4).map(i=>` ${i+1}차 ${['자료 입력과 출처 확인','분류 결과를 다시 검토','변경을 적용하고 기록','복구 결과를 직접 확인'][i]}: ${1+(s+i)%5}: 사용자, 검토자`).join('\n')).join('\n');
big.bar=xy('bar',range(15).map(i=>24+i*7))+'\n bar ['+range(15).map(i=>17+i*8).join(',')+']';
big.line=xy('line',range(16).map(i=>80+Math.round(Math.sin(i/2)*54)))+'\n line ['+range(16).map(i=>60+Math.round(Math.cos(i/3)*40)).join(',')+']';
big.scatter='%% layout: scatter\nxychart-beta\nx-axis "검토 시간 (분)" 1 --> 16\ny-axis "수정 건수" 0 --> 160\nline ['+range(16).map(i=>14+i*7+(i%3)*9).join(',')+']';
big.waterfall=xy('waterfall',[100,12,-18,24,-9,14,-20,16,-8,6,117],'%% totals: 0,10');
big.radar='radar-beta\n axis '+range(10).map(i=>`a${i}["${['정확성','응답 속도','글자 가독성','기존 호환성','복구 가능성','정보 보존','색상 대비','연결 정확성','작은 화면','편집 반영'][i]}"]`).join(', ')+'\n'+range(4).map(j=>`curve c${j}["${j+1}차 구현"] {${range(10).map(i=>4+(i+j*2)%7).join(',')}}`).join('\n')+'\nmax 10';
big.polar=xy('polar',range(12).map(i=>10+(i*17)%130)).replace('-40 --> 180','0 --> 160');
big.quadrant='quadrantChart\nx-axis 적은 노력 --> 많은 노력\ny-axis 낮은 효과 --> 높은 효과\nquadrant-1 큰 투자\nquadrant-2 먼저 실행\nquadrant-3 유지\nquadrant-4 재검토\n'+range(12).map(i=>`${i+1}차 ${['출처 대조','입력 개선','복구 검증'][i%3]}: [${.12+(i%4)*.23}, ${.15+Math.floor(i/4)*.31}]`).join('\n');
big.treemap='treemap-beta\n"자료의 구성"\n'+range(4).map(i=>` "${['개발 기록','학습 자료','검증 결과','운영 자료'][i]}"\n`+range(4).map(j=>`  "${j+1}차 ${['소스 분석','문서 정리','오류 재현','개선 결과'][j]}": ${8+i*5+j*3}`).join('\n')).join('\n');

const invalid={
  architecture:flow('architecture',''),flowchart:flow('flowchart',''),tree:flow('tree',''),nested:flow('nested',''),
  er:'erDiagram\nENTITY {\n string\n}', 'uml-class':'classDiagram\nclass A {',state:'stateDiagram-v2\nA -->',
  sequence:'sequenceDiagram\nA->>B: 호출\ndeactivate B',block:'block-beta\ncolumns 2\nA["미완료',
  timeline:'timeline',gantt:'gantt\ndateFormat YYYY-MM-DD\n잘못된 기간 : 2026-09-12, 2026-09-01',
  bar:'xychart-beta\nbar [1,missing]',line:'%% layout: line\nxychart-beta\nline [1,missing]',
  scatter:'%% layout: scatter\nxychart-beta\nline [1,missing]',quadrant:'quadrantChart\n범위 밖: [1.2,0.5]',
  loop:flow('loop','A-->B'),layers:flow('layers','A-->B\nA-->C'),pyramid:flow('pyramid','A-->B\nA-->C'),
  venn:flow('venn','A---B\nB---C\nC---D'),
  'dp-security-matrix':flow('dp-security-matrix','A-->B\nB-->C'),
  kanban:'%% layout: kanban\nflowchart LR\nA-->B',
  'story-map':flow('story-map','subgraph G\nA\nend'),
  fishbone:flow('fishbone','A-->B\nC-->D'),
  wardley:flow('wardley','A-->B'),swimlane:flow('swimlane','subgraph G\nA-->B-->A\nend'),
  sankey:'sankey-beta\nA,B,-1',
  waterfall:big.waterfall.replace('117]','118]'),
  radar:'radar-beta\naxis a, b\ncurve c {1,2}',
  polar:xy('polar',[1,-2,3]),treemap:'treemap-beta\n"빈 값": 0',
  journey:'journey\nsection 시작\n검토: 9: 사용자',
};
// These are deterministic inputs, not generated images. Each remains editable Mermaid.
export const cases=examples.map(e=>({...e,basic:e.source,complex:big[e.id],boundary:invalid[e.id]||'not-a-mermaid-diagram',expectedError:true}));
