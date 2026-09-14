import mermaid from 'mermaid';
import {canonicalType} from './types.mjs';

export const assert = (condition, message) => { if (!condition) throw new Error(message); };
export function plain(value) {
  const decoder = document.createElement('textarea');
  decoder.innerHTML = String(value ?? '').replace(/<br\s*\/?\s*>/gi, '\n');
  return decoder.value.replace(/\\([+~#*])/g, '$1');
}
const values = x => x instanceof Map ? [...x.values()] : Object.values(x || {});
const copy = x => structuredClone(x);
let queue = Promise.resolve();

// Mermaid uses mutable diagram databases. Serialize parsing, then copy only data.
export function parse(source) {
  const work = queue.catch(() => {}).then(() => parseOne(source));
  queue = work; return work;
}
async function parseOne(source) {
  assert(typeof source === 'string' && source.length <= 200000, '입력은 200,000자 이하의 Mermaid 문자열이어야 합니다.');
  const hints = {};
  for (const line of source.split('\n')) {
    const match = line.match(/^\s*%%\s*([a-z-]+)\s*:\s*(.*?)\s*$/);
    if (match) (hints[match[1]] ||= []).push(match[2]);
  }
  const one = key => { assert(!hints[key] || hints[key].length === 1, `중복 힌트: ${key}`); return hints[key]?.[0]; };
  mermaid.initialize({startOnLoad:false, securityLevel:'strict', suppressErrorRendering:true, flowchart:{htmlLabels:false}});
  // Mermaid 11's Sankey lexer is ASCII-only. Use collision-free ASCII tokens;
  // HTML entities cannot be used because Mermaid rewrites them before lexing.
  const isSankey=/^sankey-beta\b/.test(source.split('\n').filter(s=>s.trim()&&!s.trim().startsWith('%%')).join('\n').trim());
  let prefix='_md_unicode_';while(source.includes(prefix))prefix+='_';
  const parserSource=isSankey?source.replace(/[^\x00-\x7f]/gu,c=>prefix+c.codePointAt(0).toString(16)+'_'):source;
  const decodeSankey=value=>plain(value).replace(new RegExp(prefix+'([0-9a-f]+)_','g'),(_,code)=>String.fromCodePoint(parseInt(code,16)));
  const diagram = await mermaid.mermaidAPI.getDiagramFromText(parserSource), db=diagram.db;
  const typeMap = {sequence:'sequence',classDiagram:'uml-class',stateDiagram:'state',er:'er',block:'block',xychart:'bar',quadrantChart:'quadrant'};
  const layoutName=one('layout') || typeMap[diagram.type] || (diagram.type.startsWith('flowchart')?'flowchart':diagram.type);
  const result={type:canonicalType(layoutName),layoutName, syntax:diagram.type, hints, focus:one('focus'), hub:one('hub'), title:db.getAccTitle?.()||db.getDiagramTitle?.()||'', nodes:[], edges:[], groups:[]};
  if (diagram.type==='sequence') {
    result.actors=copy(values(db.getActors()));
    result.messages=copy(db.getMessages()); result.boxes=copy(db.getBoxes());
    result.nodes=result.actors.map(n=>({id:n.name,label:plain(n.description||n.name),shape:n.type||'actor'}));
    result.edges=result.messages.filter(m=>m.from&&m.to&&m.type!==2).map(m=>({id:m.id,start:m.from,end:m.to,label:plain(m.message),messageType:m.type}));
    return result;
  }
  if (diagram.type==='xychart') {result.chart=copy(db.getXYChartData());return result;}
  if (diagram.type==='radar') {result.axes=copy(db.getAxes());result.curves=copy(db.getCurves());result.options=copy(db.getOptions());return result;}
  if (diagram.type==='quadrantChart') {db.setWidth(640);db.setHeight(480);result.quadrant=copy(db.getQuadrantData());return result;}
  if (diagram.type==='treemap') {result.tree=copy(db.getRoot());return result;}
  if (diagram.type==='sankey') {const graph=copy(db.getGraph());result.sankey={nodes:graph.nodes.map(n=>({...n,id:decodeSankey(n.id)})),links:graph.links.map(e=>({...e,source:decodeSankey(e.source),target:decodeSankey(e.target)}))};result.nodes=result.sankey.nodes.map(n=>({id:n.id,label:n.id,shape:'sankey'}));return result;}
  if (['timeline','gantt','journey'].includes(diagram.type)) {
    result.tasks=copy(db.getTasks());result.sections=copy(db.getSections());
    if(diagram.type==='gantt'){result.dateFormat=db.getDateFormat();result.axisFormat=db.getAxisFormat();}
    return result;
  }
  let data;
  if (diagram.type==='block') {
    const blocks=copy(db.getBlocksFlat()); result.block=blocks.find(n=>n.id==='root');
    const parent=new Map(); for(const n of blocks)for(const c of n.children||[])parent.set(c.id,n.id==='root'?undefined:n.id);
    data={nodes:blocks.filter(n=>n.id!=='root'&&n.type!=='space').map(n=>({...n,shape:n.type,isGroup:n.type==='composite',parentId:parent.get(n.id)})),edges:copy(db.getEdges())};
  } else {
    assert(typeof db.getData==='function', `파서 데이터 연결이 없는 문법: ${diagram.type}`);
    const d=db.getData();data={nodes:copy(d.nodes),edges:copy(d.edges)};
  }
  for(const raw of data.nodes) {
    const node={...raw,label:plain(raw.label??raw.text??raw.id),shape:raw.shape||'rect'};
    node.fields = raw.attributes?.map(a=>({name:plain(a.name),type:plain(a.type),keys:a.keys||[],comment:plain(a.comment)}));
    node.members=raw.members?.map(a=>plain(a.text));node.methods=raw.methods?.map(a=>plain(a.text));
    (node.isGroup?result.groups:result.nodes).push(node);
  }
  result.edges=data.edges.map((e,i)=>({...e,id:e.id||`edge-${i}`,label:plain(e.label||''),startMark:e.arrowTypeStart||'none',endMark:e.arrowTypeEnd||'none',dashed:e.pattern==='dashed'||e.pattern==='dotted'||e.pattern==='dash',hidden:e.thickness==='invisible'}));
  if(db.getDirection)result.direction=db.getDirection();
  // Compact ER diagrams by default; keep an explicitly authored direction.
  if(diagram.type==='er'&&!/^\s*direction\s+(?:TB|BT|LR|RL)\b/m.test(source))result.direction='LR';
  if(db.getSubGraphs){const subgraphs=db.getSubGraphs();for(const sg of subgraphs){const g=result.groups.find(n=>n.id===sg.id);if(g)g.dir=sg.dir;}const order=new Map(subgraphs.map((g,i)=>[g.id,i]));result.groups.sort((a,b)=>order.get(a.id)-order.get(b.id));}
  const all=new Set([...result.nodes,...result.groups].map(n=>n.id));
  assert(result.edges.every(e=>all.has(e.start)&&all.has(e.end)), '존재하지 않는 노드를 가리키는 연결이 있습니다.');
  assert(!result.focus||all.has(result.focus), `강조 노드를 찾을 수 없습니다: ${result.focus}`);
  return result;
}
