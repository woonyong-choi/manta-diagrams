import {JSDOM} from 'jsdom';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
const dom=new JSDOM('<!doctype html><body></body>');
globalThis.window=dom.window;globalThis.document=dom.window.document;globalThis.DOMParser=dom.window.DOMParser;
const {render,verify,supportedTypes}=await import('../src/renderer.mjs');
const {examples,legacyExamples}=await import('../src/examples.mjs');
const {cases}=await import('../src/cases.mjs');
const {canonicalType}=await import('../src/types.mjs');
const {themeCSS}=await import('../src/svg.mjs');
const failures=[],results=[];
assert.equal(examples.length,31);assert.equal(new Set(examples.map(e=>e.id)).size,31);assert(examples.every(e=>supportedTypes.includes(e.id)));
for(const example of examples){
  try{const result=await render(example.source,{id:'test-'+example.id});results.push({kind:'type',id:example.id,...verify(result),width:result.width,height:result.height});}
  catch(error){failures.push({kind:'type',id:example.id,error:error.message});}
}
for(const item of cases){
  try {const result=await render(item.complex,{id:'complex-'+item.id});results.push({kind:'complex',id:item.id,...verify(result),width:result.width,height:result.height});}
  catch(error){failures.push({kind:'complex',id:item.id,error:error.message});}
  try {await assert.rejects(()=>render(item.boundary));results.push({kind:'boundary',id:item.id});}
  catch(error){failures.push({kind:'boundary',id:item.id,error:error.message});}
}
for(const old of legacyExamples.filter(e=>canonicalType(e.id)!==e.id)){
  try{const result=await render(old.source);verify(result);assert.equal(result.type,canonicalType(old.id));results.push({kind:'alias',id:old.id});}
  catch(error){failures.push({kind:'alias',id:old.id,error:error.message});}
}
let corpus=[];
const batchIndex=process.argv.indexOf('--corpus-batch');let corpusStart=0;
if(batchIndex>=0){corpusStart=Number(process.argv[batchIndex+1]);const limit=Number(process.argv[batchIndex+2]);assert(Number.isInteger(corpusStart)&&corpusStart>=0&&Number.isInteger(limit)&&limit>0&&limit<=20,'배치 시작 위치와 1~20개의 개수가 필요합니다.');corpus=JSON.parse(await readFile(new URL('../.local/corpus.json',import.meta.url),'utf8')).slice(corpusStart,corpusStart+limit);}
for(const [index,example]of corpus.entries()){
  try{const result=await render(example.source,{id:'corpus-'+index});results.push({kind:'corpus',index:index+corpusStart,file:example.file,line:example.line,...verify(result),width:result.width,height:result.height});}
  catch(error){failures.push({kind:'corpus',index:index+corpusStart,file:example.file,error:error.message});}
}
const flow=examples.find(e=>e.id==='flowchart');
try{
  const palette=Object.fromEntries([...themeCSS.matchAll(/--md-(\w+):light-dark\((#[\da-f]+),(#[\da-f]+)\)/g)].map(m=>[m[1],[m[2],m[3]]]));
  const luminance=hex=>hex.slice(1).match(/../g).map(v=>parseInt(v,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0);
  for(const mode of [0,1])for(const background of ['paper','surface','tint','depth']){const a=luminance(palette.ink[mode]),b=luminance(palette[background][mode]);assert((Math.max(a,b)+.05)/(Math.min(a,b)+.05)>=4.5,`본문 대비: ${background} / ${mode}`);}
  const first=await render(flow.source,{id:'repeat'}),second=await render(flow.source,{id:'repeat'});assert.equal(first.svg,second.svg);
  const changed=await render(flow.source.replace('문서 갱신','문서 내용 갱신'));verify(changed);assert(changed.svg.includes('문서 내용 갱신'));
  const measured=await render(examples.find(e=>e.id==='bar').source);assert.throws(()=>verify({...measured,svg:measured.svg.replace(/data-value="[^"]+"/,'data-value="999999"')}),/수치가 원문/);
  const unicode=await render('sankey-beta\n"입력, 🐟",_md_unicode_d55c_,5');verify(unicode);
  assert.deepEqual(unicode.model.sankey.nodes.map(n=>n.id),['입력, 🐟','_md_unicode_d55c_']);
  const blockSource='block-beta\ncolumns 3\nA["First"] space B["Second"]\nspace:3\nC["Third"] space D["Fourth"]\nB-->A\nA-->C';
  const block=await render(blockSource,{id:'block-check'});verify(block);assert.equal(block.stats.nodes,4);assert(!block.svg.includes('data-shape="space"'));
  assert.equal(block.svg,(await render(blockSource,{id:'block-check'})).svg);
  const bd=new DOMParser().parseFromString(block.svg,'image/svg+xml'),box=id=>bd.querySelector(`[data-node="${id}"] rect`);
  assert.equal(box('A').getAttribute('y'),box('B').getAttribute('y'));assert.equal(box('A').getAttribute('x'),box('C').getAttribute('x'));assert(+box('C').getAttribute('y')>+box('A').getAttribute('y'));
  const dual=await render('sequenceDiagram\nA<<->>B: bidirectional');verify(dual);assert(dual.svg.includes('marker-start='));
  const compound=await render('flowchart LR\nsubgraph G\ndirection TB\nA-->|first|B\nend\nsubgraph H\ndirection TB\nC-->|second|D\nend\nG-->H');verify(compound);
  const cd=new DOMParser().parseFromString(compound.svg,'image/svg+xml'),a=cd.querySelector('[data-node="A"] rect'),b=cd.querySelector('[data-node="B"] rect');
  assert.equal(a.getAttribute('x'),b.getAttribute('x'));assert(+a.getAttribute('y')<+b.getAttribute('y'));
  // Direction changes must move the actual cards, including the schema alias.
  for(const exampleId of ['er','uml-class']){
    const original=examples.find(e=>e.id===exampleId).source;
    for(const dir of ['LR','RL','TB','BT']){
      const result=await render(original.replace('direction LR','direction '+dir));verify(result);assert.equal(result.model.direction,dir);
      const doc=new DOMParser().parseFromString(result.svg,'image/svg+xml'),nodes=[...doc.querySelectorAll('[data-shape]')];
      const first=nodes[0].dataset,second=nodes[1].dataset;
      if(dir==='LR')assert(+first.x<+second.x);if(dir==='RL')assert(+first.x>+second.x);
      if(dir==='TB')assert(+first.y<+second.y);if(dir==='BT')assert(+first.y>+second.y);
    }
  }
  const schema=await render(legacyExamples.find(e=>e.id==='db-schema').source);verify(schema);
  const schemaDoc=new DOMParser().parseFromString(schema.svg,'image/svg+xml');
  assert(schemaDoc.querySelector('[data-start-mark="zero_or_more"][data-end-mark="only_one"]'),'FK 연결에서도 ER cardinality를 유지한다');
  const story=await render(cases.find(e=>e.id==='story-map').complex);verify(story);
  const swim=await render(cases.find(e=>e.id==='swimlane').complex);assert.deepEqual(swim.model.groups.map(g=>g.id),['G0','G1','G2','G3','G4']);
  const sd=new DOMParser().parseFromString(story.svg,'image/svg+xml');assert.deepEqual([...sd.querySelectorAll('[data-item-count]')].map(n=>+n.getAttribute('data-item-count')),[8,8,8,8,8]);const boxes=[...sd.querySelectorAll('[data-shape]')].map(n=>n.dataset);
  for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++){const a=boxes[i],b=boxes[j];assert(!(+a.x<+b.x+ +b.width&&+a.x+ +a.width>+b.x&&+a.y<+b.y+ +b.height&&+a.y+ +a.height>+b.y),'같은 스토리맵 칸의 카드는 겹치면 안 된다');}
  await assert.rejects(()=>render('%% layout: invented\nflowchart LR\nA-->B'),/지원하지 않는/);
  await assert.rejects(()=>render('%% layout: loop\nflowchart LR\nA-->B'),/연결된 단계|순환/);
  await assert.rejects(()=>render(examples.find(e=>e.id==='waterfall').source.replace('135]','140]')),/총합/);
}catch(error){failures.push({kind:'behavior',error:error.message});}
const largest=results.filter(r=>r.kind==='corpus').sort((a,b)=>(b.nodes+b.edges)-(a.nodes+a.edges)||b.groups-a.groups)[0];
const report={types:{passed:results.filter(r=>r.kind==='type').length,total:31},complex:{passed:results.filter(r=>r.kind==='complex').length,total:31},boundary:{passed:results.filter(r=>r.kind==='boundary').length,total:31},aliases:{passed:results.filter(r=>r.kind==='alias').length,total:10},corpus:{passed:results.filter(r=>r.kind==='corpus').length,total:corpus.length},largest,failures,results};
await mkdir(new URL('../.local/',import.meta.url),{recursive:true});await writeFile(new URL('../.local/verification.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({...report,results:undefined},null,2));
if(failures.length)process.exitCode=1;
