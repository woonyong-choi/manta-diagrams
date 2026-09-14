import ELK from 'elkjs/lib/elk.bundled.js';
import {assert} from './parse.mjs';
import {esc,num,token,label,rect,line,circle,roundedPath,textWidth,wrap} from './svg.mjs';
const elk=new ELK();
const direction={LR:'RIGHT',RL:'LEFT',TB:'DOWN',TD:'DOWN',BT:'UP'};
const mark=x=>({arrow_point:'point',arrow_barb:'point',arrow_circle:'circle',arrow_cross:'cross'}[x]||x);
const noMark=x=>!x||['none','arrow_open','open'].includes(x);

// ELK routes to rectangular ports. Continue that segment to the actual shape.
export function boundary(point,neighbor,node){
  if(!node)return point;
  const cx=node.x+node.width/2,cy=node.y+node.height/2,terminal=/^state(Start|End)$/.test(node.shape),hw=terminal?(node.shape==='stateStart'?8:11):node.width/2,hh=terminal?hw:node.height/2;
  if(/cylinder|database/.test(node.shape)){
    if(Math.abs(neighbor.x-point.x)>Math.abs(neighbor.y-point.y))return point;
    const cap=10,dy=cap*Math.sqrt(Math.max(0,1-((point.x-cx)/hw)**2));
    return {...point,y:point.y<cy?node.y+cap-dy:node.y+node.height-cap+dy};
  }
  if(!terminal&&!['diamond','circle','doublecircle'].includes(node.shape))return point;
  if(Math.abs(neighbor.x-point.x)>Math.abs(neighbor.y-point.y)){
    const dy=Math.min(1,Math.abs(point.y-cy)/hh),dx=hw*(node.shape==='diamond'?1-dy:Math.sqrt(1-dy*dy));
    return{x:cx+Math.sign(point.x-cx||neighbor.x-cx)*dx,y:point.y};
  }
  const dx=Math.min(1,Math.abs(point.x-cx)/hw),dy=hh*(node.shape==='diamond'?1-dx:Math.sqrt(1-dx*dx));
  return{x:point.x,y:cy+Math.sign(point.y-cy||neighbor.y-cy)*dy};
}
function onBox(p,n){return n&&p.x>=n.x-1&&p.x<=n.x+n.width+1&&p.y>=n.y-1&&p.y<=n.y+n.height+1&&Math.min(Math.abs(p.x-n.x),Math.abs(p.x-n.x-n.width),Math.abs(p.y-n.y),Math.abs(p.y-n.y-n.height))<=1;}

export function metrics(n,type) {
  if(/stateStart|stateEnd/.test(n.shape))return{width:24,height:24,lines:[],rows:[]};
  const fields=n.fields?.map(f=>({id:f.name,text:[f.name,f.type,...f.keys,f.comment].filter(Boolean).join('  ')}))||[];
  const members=[...(n.annotations||[]).map(x=>({text:`«${x}»`,section:'annotation'})),...(n.members||[]).map(text=>({text,section:'member'})),...(n.methods||[]).map(text=>({text,section:'method'}))];
  const rows=[...fields.map(f=>({...f,section:'field'})),...members].map(row=>({...row,lines:wrap(row.text,280,14)}));
  const lines=wrap(n.label,240),longest=Math.max(64,...lines.map(x=>textWidth(x)),...rows.flatMap(x=>x.lines.map(s=>textWidth(s,14))));
  const headerHeight=16+lines.length*21;
  let width=Math.ceil((longest+32)/4)*4,height=rows.length?headerHeight:Math.max(44,headerHeight);
  rows.forEach(row=>{row.height=row.lines.length*21+12;row.y=height+row.height/2;height+=row.height;});
  if(/cylinder|database/.test(n.shape))height=Math.max(60,lines.length*21+38);
  if(n.shape==='diamond'){width=Math.max(120,width*1.8);height=Math.max(96,headerHeight*2);}
  if(/circle/i.test(n.shape)){width=height=Math.max(width,height);}
  return{width,height,headerHeight,lines,rows};
}
export function nodeBody(n,m,type,focus) {
  const {x,y,width:w,height:h}=n,cx=x+w/2,cy=y+h/2;
  const fill=n.id===focus?'tint':'surface',stroke=n.id===focus?'accent':'border';
  let body='';
  if(n.shape==='stateStart')body=circle(cx,cy,8);
  else if(n.shape==='stateEnd')body=circle(cx,cy,11,{fill:'none',stroke:'ink'})+circle(cx,cy,7);
  else if(n.shape==='diamond')body=`<path d="M${num(cx)} ${num(y)} L${num(x+w)} ${num(cy)} L${num(cx)} ${num(y+h)} L${num(x)} ${num(cy)} Z" fill="${token(fill)}" stroke="${token(stroke)}"/>`;
  else if(/circle/i.test(n.shape)){body=circle(cx,cy,Math.min(w,h)/2,{fill,stroke});if(/double/i.test(n.shape))body+=circle(cx,cy,Math.min(w,h)/2-5,{fill:'none',stroke});}
  else if(/cylinder|database/.test(n.shape))body=`<path data-cylinder-body="" d="M${num(x)} ${num(y+10)} A${num(w/2)} 10 0 0 1 ${num(x+w)} ${num(y+10)} V${num(y+h-10)} A${num(w/2)} 10 0 0 1 ${num(x)} ${num(y+h-10)} Z" fill="${token(fill)}" stroke="${token(stroke)}"/><ellipse data-cylinder-cap="" cx="${num(cx)}" cy="${num(y+10)}" rx="${num(w/2)}" ry="10" fill="${token(fill)}" stroke="${token(stroke)}"/>`;
  else if(/hexagon/.test(n.shape))body=`<path d="M${num(x+14)} ${num(y)} H${num(x+w-14)} L${num(x+w)} ${num(cy)} L${num(x+w-14)} ${num(y+h)} H${num(x+14)} L${num(x)} ${num(cy)} Z" fill="${token(fill)}" stroke="${token(stroke)}"/>`;
  else if(/lean|trapezoid/.test(n.shape)){
    const inverse=/inv|lean-left|lean_left/.test(n.shape),top=inverse?0:12,bottom=inverse?12:0;
    body=`<path d="M${num(x+top)} ${num(y)} H${num(x+w-top)} L${num(x+w-bottom)} ${num(y+h)} H${num(x+bottom)} Z" fill="${token(fill)}" stroke="${token(stroke)}"/>`;
  } else {
    body=rect(x,y,w,h,{fill,stroke,radius:/stadium|pill/.test(n.shape)?h/2:/square/.test(n.shape)?3:5});
    if(/subroutine/.test(n.shape))body+=line(x+7,y,x+7,y+h)+line(x+w-7,y,x+w-7,y+h);
  }
  if(m.rows.length){
    body+=rect(x+1,y+1,w-2,m.headerHeight-1,{fill:n.id===focus?'tint':'surface',stroke:'none',radius:3});
    body+=label(n.label,cx,y+m.headerHeight/2+5-(m.lines.length-1)*10.5,{lines:m.lines,weight:500,attr:'data-heading=""'});
    body+=line(x,y+m.headerHeight,x+w,y+m.headerHeight,{stroke:'rule'});
    for(const [i,row]of m.rows.entries()){
      if(i&&m.rows[i-1].section!==row.section)body+=line(x,y+row.y-row.height/2,x+w,y+row.y-row.height/2,{stroke:'rule'});
      body+=label(row.text,x+16,y+row.y-(row.lines.length-1)*10.5+5,{lines:row.lines,size:14,anchor:'start',attr:row.id?`data-field="${esc(n.id+'.'+row.id)}"`:''});
      if(n.fields&&i<m.rows.length-1)body+=line(x+12,y+row.y+row.height/2,x+w-12,y+row.y+row.height/2,{stroke:'rule',width:.6});
    }
  }else if(m.lines.length)body+=label(n.label,cx,cy-(m.lines.length-1)*10.5+5+(/cylinder|database/.test(n.shape)?5:0),{lines:m.lines});
  return `<g data-node="${esc(n.id)}" data-shape="${esc(n.shape)}" data-x="${x}" data-y="${y}" data-width="${w}" data-height="${h}" data-header-height="${m.headerHeight}">${body}</g>`;
}
export function drawEdge(e,points,prefix,labelAt) {
  if(e.hidden)return `<path data-edge="${esc(e.id)}" data-hidden="true" d="${roundedPath(points)}" visibility="hidden"/>`;
  const arrows=(noMark(e.startMark)?'':` marker-start="url(#${prefix}-${esc(mark(e.startMark))})"`)+(noMark(e.endMark)?'':` marker-end="url(#${prefix}-${esc(mark(e.endMark))})"`);
  let body=`<path data-edge="${esc(e.id)}" data-from="${esc(e.start)}" data-to="${esc(e.end)}" data-start-mark="${esc(e.startMark)}" data-end-mark="${esc(e.endMark)}" d="${roundedPath(points)}" fill="none" stroke="${token('muted')}" stroke-width="${e.thickness==='thick'?2:1.1}"${e.dashed?' stroke-dasharray="5 4"':''}${arrows}/>`;
  if(e.label){
    const rows=wrap(e.label,160,12),w=Math.max(...rows.map(s=>textWidth(s,12)))+12,h=rows.length*18+6;
    let p=labelAt;
    if(!p){let best=0;for(let i=1;i<points.length;i++){const length=Math.hypot(points[i].x-points[i-1].x,points[i].y-points[i-1].y);if(length>best){best=length;p={x:(points[i].x+points[i-1].x)/2-w/2,y:(points[i].y+points[i-1].y)/2-h-8};}}}
    body+=`<g data-edge-label="${esc(e.id)}">${rect(p.x,p.y,w,h,{fill:'paper',stroke:'none',radius:2})}${label(e.label,p.x+w/2,p.y+15,{size:12,lines:rows,fill:'muted'})}</g>`;
  }
  return body;
}
export async function graphLayout(g,{id='md'}={}) {
  assert(g.nodes.length+g.groups.length>0,'다이어그램에 노드나 그룹을 하나 이상 작성해 주세요.');
  const measurements=new Map(g.nodes.map(n=>[n.id,metrics(n,g.type)]));
  const entries=new Map([...g.groups,...g.nodes].map(n=>[n.id,n]));
  const groupHeader=n=>24+wrap(n.label,260,16).length*24;
  const elkNodes=new Map([...entries].map(([key,n])=>[key,{id:key,...(n.isGroup?{}:measurements.get(key)),children:[],layoutOptions:{'elk.direction':direction[n.dir]||direction[g.direction]||'RIGHT','elk.padding':n.isGroup?`[top=${groupHeader(n)},left=24,bottom=24,right=24]`:'[top=0,left=0,bottom=0,right=0]',...(n.isGroup?{'elk.nodeSize.constraints':'MINIMUM_SIZE','elk.nodeSize.minimum':`(${Math.ceil(Math.max(...wrap(n.label,260,16).map(t=>textWidth(t,16))))+48},${groupHeader(n)+48})`}:{})}}]));
  const root={id:'__root',children:[],edges:[],layoutOptions:{'elk.algorithm':'layered','elk.direction':direction[g.direction]||'RIGHT','elk.hierarchyHandling':'INCLUDE_CHILDREN','elk.edgeRouting':'ORTHOGONAL','elk.spacing.nodeNode':'40','elk.layered.spacing.nodeNodeBetweenLayers':'68','elk.spacing.edgeNode':'24','elk.layered.spacing.edgeNodeBetweenLayers':'24','elk.layered.considerModelOrder.strategy':'NODES_AND_EDGES','elk.layered.nodePlacement.strategy':'NETWORK_SIMPLEX','elk.layered.edgeLabels.sideSelection':'ALWAYS_UP','elk.padding':'[top=32,left=32,bottom=32,right=32]'}};
  const inside=(id,group)=>{let n=entries.get(id);while(n?.parentId){if(n.parentId===group)return true;n=entries.get(n.parentId);}return false;};
  const crosses=g.groups.some(group=>g.edges.some(e=>inside(e.start,group.id)!==inside(e.end,group.id)));
  if(!crosses)root.layoutOptions['elk.hierarchyHandling']='SEPARATE_CHILDREN';
  for(const [key,n]of entries){const child=elkNodes.get(key);const parent=n.parentId&&elkNodes.get(n.parentId);(parent?parent.children:root.children).push(child);}
  for(const n of elkNodes.values())if(!n.children.length)delete n.children;
  const fks=new Map();
  if(g.layoutName==='db-schema'||g.hints.fk?.length){
    for(const hint of g.hints.fk||[]){const m=hint.match(/^(\S+)\.(\S+)\s*->\s*(\S+)\.(\S+)\s*:\s*(.+)$/);assert(m,'fk 힌트는 Table.column -> Table.column : action 형식이어야 합니다.');
      const from=g.nodes.find(n=>n.label===m[1]||n.id===m[1]),to=g.nodes.find(n=>n.label===m[3]||n.id===m[3]);assert(from&&to,'FK 테이블을 찾지 못했습니다.');
      const fromRow=measurements.get(from.id).rows.find(r=>r.id===m[2]),toRow=measurements.get(to.id).rows.find(r=>r.id===m[4]);assert(fromRow&&toRow,'FK 컬럼을 찾지 못했습니다.');
      const edge=g.edges.find(e=>!fks.has(e.id)&&((e.start===from.id&&e.end===to.id)||(e.end===from.id&&e.start===to.id)));assert(edge,'FK에 대응하는 사용하지 않은 ER 관계가 없습니다.');
      fks.set(edge.id,{from:from.id,to:to.id,fromRow,toRow,action:m[5]});
    }
    if(g.layoutName==='db-schema')assert(fks.size===g.edges.length,'모든 ER 관계에 fk 컬럼 연결을 지정해 주세요.');
  }
  const routedEdges=g.edges.map(edge=>{
    const fk=fks.get(edge.id);if(!fk)return edge;
    const reversed=edge.start!==fk.from;
    const e={...edge,start:fk.from,end:fk.to,label:edge.label+' · '+fk.action,startMark:reversed?edge.endMark:edge.startMark,endMark:reversed?edge.startMark:edge.endMark};
    const port=(nodeId,row,side,suffix)=>{const n=elkNodes.get(nodeId),pid=edge.id+'-'+suffix;n.ports||=[];n.ports.push({id:pid,x:side==='EAST'?n.width:0,y:row.y,width:0,height:0,layoutOptions:{'elk.port.side':side}});n.layoutOptions['elk.portConstraints']='FIXED_POS';return pid;};
    const reverse=g.direction==='RL';e.sourcePort=port(e.start,fk.fromRow,reverse?'WEST':'EAST','from');e.targetPort=port(e.end,fk.toRow,reverse?'EAST':'WEST','to');return e;
  });
  for(const e of routedEdges){
    const rows=wrap(e.label,160,12),w=Math.max(0,...rows.map(s=>textWidth(s,12)))+16;
    root.edges.push({id:e.id,sources:[e.sourcePort||e.start],targets:[e.targetPort||e.end],...(e.label?{labels:[{id:e.id+'-label',text:e.label,width:w,height:rows.length*18+10,layoutOptions:{'elk.edgeLabels.placement':'CENTER','elk.edgeLabels.inline':'false'}}]}:{})});
  }
  const layout=await elk.layout(root),positions=new Map(),routes=new Map();
  function collect(n,x=0,y=0){const nx=x+(n.x||0),ny=y+(n.y||0);if(n.id!=='__root')positions.set(n.id,{...entries.get(n.id),...n,x:nx,y:ny});for(const e of n.edges||[])routes.set(e.id,{...e,offset:{x:nx,y:ny}});for(const c of n.children||[])collect(c,nx,ny);}
  collect(layout);
  // ELK may retain an edge in root.edges while its coordinates belong to a group.
  for(const r of routes.values()){const container=positions.get(r.container);if(container)r.offset={x:container.x,y:container.y};}
  let body='';
  const depth=n=>n.parentId?1+depth(entries.get(n.parentId)):0;
  for(const group of [...g.groups].sort((a,b)=>depth(a)-depth(b))){const p=positions.get(group.id);assert(p,'그룹 배치가 누락됐습니다.');const d=depth(group);body+=`<g data-group="${esc(group.id)}" data-depth="${d}">${rect(p.x,p.y,p.width,p.height,{fill:'depth',stroke:'border',radius:6,attr:`fill-opacity="${g.type==='nested'?.10+d*.045:.07+d*.03}"`})}${label(group.label,p.x+18,p.y+28,{anchor:'start',size:16,weight:500,width:p.width-36,attr:'data-heading=""'})}</g>`;}
  for(const edge of routedEdges){
    const r=routes.get(edge.id);assert(r?.sections?.length,`배치가 누락된 연결: ${edge.id}`);
    let e=edge;
    for(const section of r.sections){
      let points=[section.startPoint,...section.bendPoints||[],section.endPoint].map(p=>({x:p.x+r.offset.x,y:p.y+r.offset.y}));
      assert(onBox(points[0],positions.get(edge.start))&&onBox(points.at(-1),positions.get(edge.end)),`연결선이 원문의 노드에 닿지 않습니다: ${edge.id}`);
      points[0]=boundary(points[0],points[1],positions.get(edge.start));
      points[points.length-1]=boundary(points.at(-1),points.at(-2),positions.get(edge.end));
      const el=r.labels?.[0];
      body+=drawEdge(e,points,id,el?{x:el.x+r.offset.x,y:el.y+r.offset.y-6}:undefined);
    }
  }
  for(const node of g.nodes){const position=positions.get(node.id);assert(position,`노드 배치 누락: ${node.id}`);body+=nodeBody(position,measurements.get(node.id),g.type,g.focus);}
  return{body,width:layout.width,height:layout.height,positions,measurements,routes};
}
