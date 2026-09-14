import {parse,assert} from './parse.mjs';
import {frame} from './svg.mjs';
import {graphLayout} from './graph.mjs';
import * as layouts from './layouts.mjs';
import * as charts from './charts.mjs';
import {sequence} from './sequence.mjs';
import {aliases,canonicalType,families} from './types.mjs';
export {families};
export {themeCSS} from './svg.mjs';
export {parse};

const graphTypes=['architecture','flowchart','state','er','nested','tree','uml-class'];
const dispatch={...Object.fromEntries(graphTypes.map(type=>[type,graphLayout])),sequence,loop:layouts.loop,layers:layouts.layers,pyramid:layouts.pyramid,venn:layouts.venn,'dp-security-matrix':layouts.matrix,wardley:layouts.wardley,swimlane:layouts.swimlane,fishbone:layouts.fishbone,kanban:layouts.board,'story-map':layouts.board,block:layouts.block,bar:charts.xy,line:charts.xy,scatter:charts.xy,waterfall:charts.xy,polar:charts.polar,radar:charts.radar,quadrant:charts.quadrant,treemap:charts.treemap,sankey:charts.sankey,timeline:charts.timeline,gantt:charts.gantt,journey:charts.journey};
export const supportedTypes=[...Object.keys(dispatch),...Object.keys(aliases)];

/** Parse editable Mermaid and return a deterministic, theme-aware SVG. No network or note writes. */
export async function render(source,{id='diagram'}={}) {
  assert(/^[a-zA-Z][\w-]*$/.test(id),'SVG ID는 문자로 시작하는 영문 식별자여야 합니다.');
  const model=typeof source==='string'?await parse(source):{...source,type:canonicalType(source.type)};
  assert(dispatch[model.type],`지원하지 않는 layout: ${model.type}`);
  const layout=await dispatch[model.type](model,{id});
  assert(layout.width>0&&layout.height>0&&Number.isFinite(layout.width+layout.height),'유효하지 않은 다이어그램 크기입니다.');
  return{svg:frame(layout.body,layout.width,layout.height,model.type,id,model.title),type:model.type,width:layout.width,height:layout.height,model,stats:{nodes:model.nodes.length,edges:model.edges.length,groups:model.groups.length}};
}

/** Check rendered content against parsed input; this does not replace visual inspection. */
export function verify(result) {
  const doc=new DOMParser().parseFromString(result.svg,'image/svg+xml');assert(!doc.querySelector('parsererror'),'생성한 SVG 문법이 잘못되었습니다.');
  const {model:g}=result;
  const shown=(attr,value)=>[...doc.querySelectorAll(`[${attr}]`)].filter(n=>n.getAttribute(attr)===String(value));
  for(const n of g.nodes){const elements=shown('data-node',n.id);assert(elements.length===1,`노드 출력 누락·중복: ${n.id}`);const text=elements[0].textContent.replace(/\s/g,'');assert(text.includes(n.label.replace(/\s/g,''))||/stateStart|stateEnd/.test(n.shape),`라벨 출력 누락: ${n.id}`);
    for(const f of n.fields||[])assert(text.includes(f.name.replace(/\s/g,''))&&text.includes(f.type.replace(/\s/g,'')),`필드 출력 누락: ${n.id}.${f.name}`);
    for(const member of [...n.members||[],...n.methods||[]])assert(text.includes(member.replace(/\s/g,'')),`멤버 출력 누락: ${n.id}`);
  }
  for(const e of g.edges)assert(shown('data-edge',e.id).length===1,`연결 출력 누락·중복: ${e.id}`);
  for(const group of g.groups)assert(shown('data-group',group.id).length===1,`그룹 출력 누락·중복: ${group.id}`);
  const visible=[...doc.querySelectorAll('text')].map(n=>n.textContent).join('').replace(/\s/g,'');
  for(const e of g.edges)assert(!e.label||visible.includes(e.label.replace(/\s/g,'')),`연결 라벨 출력 누락: ${e.id}`);
  const expectedPoints=g.chart?g.chart.plots.reduce((n,p)=>n+p.data.length,0):g.curves?g.curves.reduce((n,c)=>n+c.entries.length,0):g.quadrant?g.quadrant.points.length:g.tasks?g.tasks.length:g.sankey?g.sankey.links.length:undefined;
  if(expectedPoints!==undefined)assert(doc.querySelectorAll('[data-point]').length===expectedPoints,'측정값·사건 출력 개수가 원문과 다릅니다.');
  const value=(id,expected)=>{const point=shown('data-point',id);assert(point.length===1&&point[0].hasAttribute('data-value')&&Number(point[0].getAttribute('data-value'))===expected,`수치가 원문과 다릅니다: ${id}`);};
  g.chart?.plots.forEach((p,i)=>p.data.forEach((d,j)=>value(`${i}:${j}`,d[1])));
  g.curves?.forEach((c,i)=>c.entries.forEach((v,j)=>value(`${i}:${j}`,v)));
  g.sankey?.links.forEach((e,i)=>value(`edge:${i}`,e.value));
  if(g.type==='journey')g.tasks.forEach((t,i)=>value(`0:${i}`,t.score));
  if(g.tree){const leaves=[];const visit=n=>n.children?.length?n.children.forEach(visit):leaves.push(n);visit(g.tree);const points=[...doc.querySelectorAll('[data-point]')];assert(points.length===leaves.length,'트리맵 항목 수가 원문과 다릅니다.');for(const leaf of leaves)assert(points.some(p=>Number(p.getAttribute('data-value'))===leaf.value&&p.textContent.replace(/\s/g,'').includes(leaf.name.replace(/\s/g,''))),`트리맵 값이 원문과 다릅니다: ${leaf.name}`);}
  for(const el of doc.querySelectorAll('[marker-start],[marker-end]'))for(const attr of ['marker-start','marker-end']){const ref=el.getAttribute(attr)?.match(/^url\(#(.+)\)$/)?.[1];if(ref)assert(doc.getElementById(ref),`화살표 정의 누락: ${ref}`);}
  assert(!/\b(?:NaN|Infinity)\b/.test(result.svg),'유효하지 않은 숫자가 SVG에 있습니다.');
  return{nodes:g.nodes.length,edges:g.edges.length,groups:g.groups.length,points:doc.querySelectorAll('[data-point]').length};
}
