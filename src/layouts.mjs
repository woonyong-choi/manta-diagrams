import {assert} from './parse.mjs';
import {esc,num,token,label,rect,line,circle,roundedPath,textWidth,wrap} from './svg.mjs';
import {metrics,nodeBody,drawEdge,graphLayout,boundary} from './graph.mjs';

function renderPlaced(g,positions,{id='md',groups=''}={}) {
  const map=new Map(positions.map(p=>[p.id,p])),routes=[],channels=new Map();let body=groups;
  for(const e of g.edges){const a=map.get(e.start),b=map.get(e.end);assert(a&&b,'연결 배치 누락');
    let points;
    if(a.x+a.width+24<=b.x||b.x+b.width+24<=a.x){const right=b.x>a.x,sx=right?a.x+a.width:a.x,tx=right?b.x:b.x+b.width,sy=a.y+a.height/2,ty=b.y+b.height/2,mx=(sx+tx)/2;points=[{x:sx,y:sy},{x:mx,y:sy},{x:mx,y:ty},{x:tx,y:ty}];}
    else {const down=b.y>a.y,sx=a.x+a.width/2,tx=b.x+b.width/2,ay=down?a.y+a.height:a.y,by=down?b.y:b.y+b.height,my=(ay+by)/2;points=[{x:sx,y:ay},{x:sx,y:my},{x:tx,y:my},{x:tx,y:by}];}
    const route={e,points,a,b};routes.push(route);
    if(points[1].x===points[2].x&&points[1].y!==points[2].y){const key=Math.round(points[1].x/20),list=channels.get(key)||[];list.push(route);channels.set(key,list);}
  }
  for(const list of channels.values())list.forEach(({points},i)=>{const gap=Math.abs(points[3].x-points[0].x),step=Math.min(12,Math.max(0,gap-24)/list.length),offset=(i-(list.length-1)/2)*step;points[1].x+=offset;points[2].x+=offset;});
  for(const {e,points,a,b}of routes){points[0]=boundary(points[0],points[1],a);points[points.length-1]=boundary(points.at(-1),points.at(-2),b);body+=drawEdge(e,points,id);}
  for(const p of positions)body+=nodeBody(p,metrics(p,g.type),g.type,g.focus);
  return{body,width:Math.max(...positions.map(p=>p.x+p.width))+32,height:Math.max(...positions.map(p=>p.y+p.height))+32};
}
function chain(g,{cycle=false,withoutHub=false}={}) {
  const nodes=g.nodes.filter(n=>!withoutHub||n.id!==g.hub),ids=new Set(nodes.map(n=>n.id)),edges=g.edges.filter(e=>ids.has(e.start)&&ids.has(e.end));
  assert(edges.length===nodes.length-(cycle?0:1),'이 배치는 하나의 연결된 단계 순서를 요구합니다.');
  const start=cycle?nodes[0]:nodes.find(n=>!edges.some(e=>e.end===n.id));assert(start,'첫 단계를 찾을 수 없습니다.');
  const order=[],seen=new Set();let n=start;
  while(n&&!seen.has(n.id)){order.push(n);seen.add(n.id);const next=edges.filter(e=>e.start===n.id);assert(next.length<=1,'분기가 있는 경로에는 flowchart를 사용해 주세요.');n=next.length?nodes.find(v=>v.id===next[0].end):null;}
  assert(order.length===nodes.length&&(!cycle||n?.id===start.id),'모든 단계가 하나로 이어져야 합니다.');return order;
}
export function loop(g,{id='md'}={}) {
  const order=chain(g,{cycle:true,withoutHub:true}),hub=g.hub?g.nodes.find(n=>n.id===g.hub):null,N=order.length;
  assert(N>=3,'순환에는 최소 3개 단계가 필요합니다.');assert(!g.hub||hub,'중심 노드를 찾을 수 없습니다.');
  const ms=order.map(n=>metrics(n,g.type)),nw=Math.max(...ms.map(m=>m.width)),nh=Math.max(...ms.map(m=>m.height));
  const hm=hub?metrics(hub,g.type):null,R=Math.max(220,N*Math.max(nw,nh)/4),w=R*2+nw+64,h=R*2+nh+64,cx=w/2,cy=h/2;
  const nodes=order.map((n,i)=>({...n,x:cx+R*Math.cos(-Math.PI/2+i*2*Math.PI/N)-nw/2,y:cy+R*Math.sin(-Math.PI/2+i*2*Math.PI/N)-nh/2,width:nw,height:nh,angle:-Math.PI/2+i*2*Math.PI/N}));
  const map=new Map(nodes.map(n=>[n.id,n]));let body='';
  const pt=t=>({x:cx+R*Math.cos(t),y:cy+R*Math.sin(t)});
  function limit(n,sign){let lo=0,hi=Math.PI/N;for(let i=0;i<36;i++){const mid=(lo+hi)/2,p=pt(n.angle+sign*mid);if(p.x>=n.x&&p.x<=n.x+n.width&&p.y>=n.y&&p.y<=n.y+n.height)lo=mid;else hi=mid;}return n.angle+sign*(lo+hi)/2;}
  for(const e of g.edges){
    if(e.start===g.hub||e.end===g.hub){assert(e.end===g.hub,'loop의 중심 연결은 중심을 향해야 합니다.');const n=map.get(e.start),ux=Math.cos(n.angle),uy=Math.sin(n.angle);const dist=(hw,hh)=>Math.min(Math.abs(ux)>1e-8?hw/Math.abs(ux):Infinity,Math.abs(uy)>1e-8?hh/Math.abs(uy):Infinity);const d1=R-dist(nw/2,nh/2),d2=dist(hm.width/2,hm.height/2);
      body+=drawEdge(e,[{x:cx+d1*ux,y:cy+d1*uy},{x:cx+d2*ux,y:cy+d2*uy}],id);
    }else{const a=map.get(e.start),b=map.get(e.end),p=pt(limit(a,1)),q=pt(limit(b,-1));body+=`<path data-edge="${esc(e.id)}" data-from="${esc(e.start)}" data-to="${esc(e.end)}" d="M${num(p.x)} ${num(p.y)} A${num(R)} ${num(R)} 0 0 1 ${num(q.x)} ${num(q.y)}" fill="none" stroke="${token('muted')}" stroke-width="1.1"${e.dashed?' stroke-dasharray="5 4"':''} marker-end="url(#${id}-point)"/>`;
      if(e.label){const angle=(limit(a,1)+(limit(b,-1)<=limit(a,1)?limit(b,-1)+Math.PI*2:limit(b,-1)))/2;body+=label(e.label,cx+(R+30)*Math.cos(angle),cy+(R+30)*Math.sin(angle),{size:12,width:130});}
    }
  }
  nodes.forEach((n,i)=>body+=nodeBody(n,{...ms[i],lines:wrap(n.label,nw-32)},g.type,g.focus));
  if(hub){const x=cx-hm.width/2,y=cy-hm.height/2;body+=`<g data-node="${esc(hub.id)}">${rect(x,y,hm.width,hm.height,{fill:'ink',stroke:'ink'})}${label(hub.label,cx,cy-(hm.lines.length-1)*10.5+5,{lines:hm.lines,fill:'paper'})}</g>`;}
  return{body,width:w,height:h};
}
export function layers(g,options){const order=chain(g),maxW=Math.max(480,...order.map(n=>metrics(n,g.type).width)),positions=[];let y=32;
  for(const n of order){const m=metrics(n,g.type);positions.push({...n,...m,x:32,y,width:maxW});y+=m.height+32;}return renderPlaced(g,positions,options);
}
export function pyramid(g,{id='md'}={}) {
  const order=chain(g),rows=order.map(n=>wrap(n.label,210)),rh=Math.max(76,...rows.map(r=>r.length*21+32)),w=680,gap=28,h=64+order.length*(rh+gap);let body='';
  order.forEach((n,i)=>{const y=32+i*(rh+gap),top=260+300*i/order.length,bottom=260+300*(i+1)/order.length;
    body+=`<g data-node="${esc(n.id)}"><path d="M${num((w-top)/2)} ${y} H${num((w+top)/2)} L${num((w+bottom)/2)} ${y+rh} H${num((w-bottom)/2)} Z" fill="${token(n.id===g.focus||(!g.focus&&i===0)?'tint':'surface')}" stroke="${token('border')}"/>${label(n.label,w/2,y+rh/2-(rows[i].length-1)*10.5+5,{lines:rows[i]})}</g>`;
  });
  for(const e of g.edges){const a=order.findIndex(n=>n.id===e.start),b=order.findIndex(n=>n.id===e.end);body+=drawEdge(e,[{x:w/2,y:32+a*(rh+gap)+rh},{x:w/2,y:32+b*(rh+gap)}],id);}
  return{body,width:w,height:h};
}
export function venn(g) {assert(g.nodes.length===2||g.nodes.length===3,'벤 다이어그램은 2개 또는 3개 집합을 지원합니다.');assert(!g.groups.length,'벤 다이어그램은 그룹 대신 집합 노드를 사용합니다.');assert(g.edges.every(e=>['none','arrow_open'].includes(e.endMark)&&['none','arrow_open'].includes(e.startMark)),'집합 교집합은 방향 없는 --- 연결로 작성해 주세요.');
  const positions=g.nodes.length===2?[[235,230],[405,230]]:[[235,210],[405,210],[320,355]],r=155;let body='';
  g.nodes.forEach((n,i)=>{const[x,y]=positions[i];body+=`<g data-node="${esc(n.id)}"><circle cx="${x}" cy="${y}" r="${r}" fill="${token(i===0?'tint':'surface')}" fill-opacity=".32" stroke="${token(i===0?'accent':'border')}"/>${label(n.label,x+(i===0?-48:i===1?48:0),y+(i===2?66:-44),{width:120})}</g>`;});
  const pairs=new Set();
  for(const e of g.edges){const a=g.nodes.findIndex(n=>n.id===e.start),b=g.nodes.findIndex(n=>n.id===e.end),key=[a,b].sort().join(':');assert(a!==b&&!pairs.has(key),'벤 다이어그램은 서로 다른 두 집합의 교집합을 한 번씩 작성해 주세요.');pairs.add(key);
    const [x,y]=g.nodes.length===2?[320,230]:({'0:1':[320,160],'0:2':[240,302],'1:2':[400,302]}[key]);
    const lines=wrap(e.label||'∩',110,12);assert(lines.length<=3,'교집합 라벨은 3줄 이내로 줄여 주세요.');
    body+=`<g data-edge="${esc(e.id)}">${label(e.label||'∩',x,y-(lines.length-1)*9+4,{size:12,lines})}</g>`;
  }
  return{body,width:640,height:g.nodes.length===3?550:440};
}
export function matrix(g) {
  const rows=g.nodes.filter(n=>g.edges.some(e=>e.start===n.id)),cols=g.nodes.filter(n=>g.edges.some(e=>e.end===n.id));
  assert(rows.length&&cols.length,'역할과 리소스를 연결해 주세요.');
  assert(!rows.some(r=>cols.some(c=>c.id===r.id)),'권한 표는 역할에서 리소스로 향하는 관계를 요구합니다.');
  assert(rows.length+cols.length===g.nodes.length,'연결되지 않은 노드가 있습니다.');
  const cell=208,left=220,margin=24,header=Math.max(68,...cols.map(n=>wrap(n.label,cell-28,16).length*24+24)),top=margin+header;
  const rowHeights=rows.map(n=>Math.max(68,wrap(n.label,left-52,16).length*24+24,...g.edges.filter(e=>e.start===n.id).map(e=>wrap(e.label||'허용',cell-28).length*21+24)));
  const w=left+cols.length*cell+margin,h=top+rowHeights.reduce((a,b)=>a+b,0)+60;
  let body=rect(margin,margin,left-margin,header,{fill:'surface',stroke:'rule',radius:0})+label('역할 / 리소스',margin+16,margin+header/2+5,{anchor:'start',weight:500});
  cols.forEach((n,i)=>body+=`<g data-node="${esc(n.id)}">${rect(left+i*cell,margin,cell,header,{fill:'surface',stroke:'rule',radius:0})}${label(n.label,left+(i+.5)*cell,margin+header/2+5-(wrap(n.label,cell-28,16).length-1)*12,{width:cell-28,size:16,weight:500})}</g>`);
  let y=top;
  rows.forEach((n,i)=>{
    const rh=rowHeights[i],rl=wrap(n.label,left-52,16);
    body+=`<g data-node="${esc(n.id)}">${rect(margin,y,left-margin,rh,{fill:'surface',stroke:'rule',radius:0})}${label(n.label,margin+16,y+rh/2+5-(rl.length-1)*12,{anchor:'start',lines:rl,size:16,weight:500})}</g>`;
    cols.forEach((col,j)=>{
      const edges=g.edges.filter(e=>e.start===n.id&&e.end===col.id);assert(edges.length<=1,'같은 셀의 중복 관계를 하나의 라벨로 작성해 주세요.');
      const e=edges[0],text=e?.label|| (e?'허용':'—'),lines=wrap(text,cell-28);
      body+=rect(left+j*cell,y,cell,rh,{fill:i%2?'paper':'surface',stroke:'rule',radius:0});
      body+=`<g ${e?`data-edge="${esc(e.id)}"`:'data-empty-cell=""'}>${label(text,left+(j+.5)*cell,y+rh/2+5-(lines.length-1)*10.5,{lines,fill:e?'ink':'muted'})}</g>`;
    });y+=rh;
  });
  body+=label('— 관계 미지정',margin,h-18,{anchor:'start',size:12,fill:'muted'});
  return{body,width:w,height:h};
}
export function board(g) {
  const cols=g.groups,story=g.type==='story-map',rows=[...new Set((g.hints.slice||[]).map(h=>h.split(/\s+/).slice(1).join(' ')))];
  assert(cols.length,'열 그룹을 작성해 주세요.');assert(!g.edges.length,'칸반과 스토리 맵에는 연결선을 사용할 수 없습니다.');
  const slice=new Map((g.hints.slice||[]).map(h=>{const[i,...label]=h.split(/\s+/);return[i,label.join(' ')];}));
  if(story){assert(rows.length&&g.hints.cut?.length===1,'slice와 cut 힌트를 지정해 주세요.');assert(rows.includes(g.hints.cut[0]),'cut은 존재하는 릴리스를 가리켜야 합니다.');g.nodes.forEach(n=>assert(slice.has(n.id),'모든 스토리에 slice를 지정해 주세요.'));}
  const cw=Math.max(260,...g.nodes.map(n=>metrics(n,g.type).width+32)),left=story?196:24,gap=story?0:20,positions=[];
  const header=Math.max(72,...cols.map(c=>wrap(c.label,cw-32,16).length*24+48)),top=24+header,w=left+cols.length*(cw+gap)+24;
  const cellItems=(col,row)=>g.nodes.filter(n=>n.parentId===col.id&&(!story||row===undefined||slice.get(n.id)===row));
  const rowHeights=story?rows.map(row=>Math.max(120,...cols.map(col=>cellItems(col,row).reduce((sum,n)=>sum+metrics(n,g.type).height+16,32)))):[];
  const height=story?top+rowHeights.reduce((a,b)=>a+b,0)+24:top+Math.max(120,...cols.map(col=>cellItems(col).reduce((sum,n)=>sum+metrics(n,g.type).height+16,32)))+24;
  let body='';
  if(story){let y=top;rows.forEach((row,i)=>{body+=rect(24,y,left-24,rowHeights[i],{fill:row===g.hints.cut[0]?'tint':'surface',stroke:'rule',radius:0})+label(row,40,y+32,{anchor:'start',width:left-56,size:16,weight:500});y+=rowHeights[i];});}
  cols.forEach((col,i)=>{
    const x=left+i*(cw+gap),items=cellItems(col),wip=(g.hints.wip||[]).find(h=>h.startsWith(col.id+' '))?.split(/\s+/)[1];
    if(wip)assert(Number.isInteger(+wip)&&+wip>0,'WIP 한도는 양의 정수여야 합니다.');
    body+=`<g data-group="${esc(col.id)}">${rect(x,24,cw,height-48,{fill:'surface',stroke:'rule',radius:story?0:6})}${label(col.label,x+16,52,{anchor:'start',width:cw-32,size:16,weight:500,attr:'data-heading=""'})}${label(wip?`${items.length}개 · 한도 ${wip}`:`${items.length}개`,x+16,top-18,{anchor:'start',size:12,fill:wip&&items.length>+wip?'accent':'muted',attr:`data-item-count="${items.length}"`})}</g>`;
    let y=top;
    for(const [ri,row]of (story?rows:[undefined]).entries()){
      if(story)body+=rect(x,y,cw,rowHeights[ri],{fill:'none',stroke:'rule',radius:0});
      let py=y+16;
      for(const n of cellItems(col,row)){const m=metrics(n,g.type);positions.push({...n,...m,x:x+16,y:py,width:cw-32});py+=m.height+16;}
      if(story)y+=rowHeights[ri];
    }
  });
  for(const p of positions)body+=nodeBody(p,metrics(p,g.type),g.type,g.focus);
  assert(positions.length===g.nodes.length,'열에 속하지 않은 항목이 있습니다.');return{body,width:w,height};
}
export function wardley(g,{id='md'}={}){const w=800,h=600,left=130,right=700,top=60,bottom=500,positions=[];let body='';
  const coords=new Map((g.hints.position||[]).map(s=>{const[n,x,y,...extra]=s.split(/\s+/);assert(!extra.length&&Number.isFinite(+x)&&Number.isFinite(+y)&&+x>=0&&+x<=1&&+y>=0&&+y<=1,'position은 노드 ID와 0~1 좌표 두 개를 요구합니다.');return[n,[+x,+y]];}));
  body+=line(left,top,left,bottom)+line(left,bottom,right,bottom);
  ['발명','맞춤 제작','제품','범용 서비스'].forEach((s,i)=>{const x=left+(right-left)*i/4;body+=line(x,top,x,bottom,{stroke:'rule',dash:'3 5'});body+=label(s,x+(right-left)/8,bottom+30,{size:12,width:130});});
  body+=label('사용자와의 거리',16,top,{anchor:'start',width:96,size:12})+label('가까움',left-12,top+25,{anchor:'end',size:12})+label('멀음',left-12,bottom,{anchor:'end',size:12});
  for(const n of g.nodes){const c=coords.get(n.id);assert(c,`position이 없는 노드: ${n.id}`);positions.push({...n,x:left+c[0]*(right-left),y:bottom-c[1]*(bottom-top)});}
  const map=new Map(positions.map(n=>[n.id,n]));for(const e of g.edges){const a=map.get(e.start),b=map.get(e.end),my=(a.y+b.y)/2;body+=drawEdge(e,[a,{x:a.x,y:my},{x:b.x,y:my},b],id);}
  for(const n of positions)body+=`<g data-node="${esc(n.id)}">${circle(n.x,n.y,5,{fill:n.id===g.focus?'accent':'ink'})}${label(n.label,n.x+10,n.y-10,{anchor:'start',size:14,width:120})}</g>`;
  return{body,width:w,height:h};
}
export function swimlane(g,{id='md'}={}) {
  assert(g.groups.length,'담당별 subgraph를 작성해 주세요.');
  const indegree=new Map(g.nodes.map(n=>[n.id,0])),rank=new Map(g.nodes.map(n=>[n.id,0]));
  g.edges.forEach(e=>indegree.set(e.end,(indegree.get(e.end)||0)+1));const queue=g.nodes.filter(n=>!indegree.get(n.id)).map(n=>n.id);let visited=0;
  while(queue.length){const n=queue.shift();visited++;for(const e of g.edges.filter(e=>e.start===n)){rank.set(e.end,Math.max(rank.get(e.end)||0,rank.get(n)+1));indegree.set(e.end,indegree.get(e.end)-1);if(!indegree.get(e.end))queue.push(e.end);}}
  assert(visited===g.nodes.length,'스윔레인 순환 경로는 현재 지원하지 않습니다.');
  const vertical=['TB','TD','BT'].includes(g.direction),reverse=['RL','BT'].includes(g.direction),maxRank=Math.max(...rank.values());
  const cw=Math.max(240,...g.nodes.map(n=>metrics(n,g.type).width+48)),ch=Math.max(104,...g.nodes.map(n=>metrics(n,g.type).height+40));
  const cells=g.groups.map(lane=>Array.from({length:maxRank+1},(_,r)=>g.nodes.filter(n=>n.parentId===lane.id&&rank.get(n.id)===r)));
  const spans=cells.map(row=>Math.max(1,...row.map(c=>c.length))*(vertical?cw:ch)+32),left=vertical?24:208,top=vertical?104:24;
  const width=vertical?left+spans.reduce((a,b)=>a+b,0)+24:left+(maxRank+1)*cw+24,height=vertical?top+(maxRank+1)*ch+24:top+spans.reduce((a,b)=>a+b,0)+24;
  let groups='',offset=vertical?left:top;const positions=[];
  g.groups.forEach((lane,i)=>{
    const span=spans[i];groups+=`<g data-group="${esc(lane.id)}">`;
    groups+=vertical?rect(offset,24,span,height-48,{fill:i%2?'paper':'surface',stroke:'rule',radius:0})+label(lane.label,offset+16,52,{anchor:'start',size:16,weight:500,width:span-32}):rect(24,offset,width-48,span,{fill:i%2?'paper':'surface',stroke:'rule',radius:0})+rect(24,offset,left-24,span,{fill:'surface',stroke:'rule',radius:0})+label(lane.label,40,offset+32,{anchor:'start',size:16,weight:500,width:left-56});groups+='</g>';
    cells[i].forEach((items,r)=>items.forEach((n,j)=>{const m=metrics(n,g.type),step=reverse?maxRank-r:r;positions.push({...n,...m,x:vertical?offset+16+j*cw+(cw-m.width)/2:left+step*cw+(cw-m.width)/2,y:vertical?top+step*ch+(ch-m.height)/2:offset+16+j*ch+(ch-m.height)/2});}));offset+=span;
  });
  assert(positions.length===g.nodes.length,'단계가 담당 그룹에 속하지 않습니다.');return{...renderPlaced(g,positions,{id,groups}),width,height};
}
export function fishbone(g,{id='md'}={}) {
  const roots=g.nodes.filter(n=>!g.edges.some(e=>e.start===n.id));assert(roots.length===1,'원인들이 하나의 결과를 향해야 합니다.');
  const root=roots[0],cats=g.edges.filter(e=>e.end===root.id).map(e=>g.nodes.find(n=>n.id===e.start));assert(cats.length,'원인 분류가 없습니다.');
  const leaves=cat=>g.edges.filter(e=>e.end===cat.id),branchH=Math.max(230,...cats.map(cat=>leaves(cat).length*80+100)),cy=branchH+64,pairs=Math.ceil(cats.length/2),w=360+pairs*360+280,height=cy+branchH+64;
  let body=line(48,cy,w-280,cy,{attr:`marker-end="url(#${id}-point)"`});const rm=metrics(root,g.type),rx=w-264;
  body+=`<g data-node="${esc(root.id)}">${rect(rx,cy-rm.height/2,240,rm.height,{fill:'tint',stroke:'accent'})}${label(root.label,rx+120,cy+5-(rm.lines.length-1)*10.5,{lines:rm.lines,weight:500})}</g>`;
  const rendered=new Set([root.id]);
  cats.forEach((cat,i)=>{
    const sign=i%2?1:-1,x=240+Math.floor(i/2)*360,join={x:x+180,y:cy},y=cy+sign*branchH,cm=metrics(cat,g.type),cardY=sign<0?y-16:y-cm.height+16;
    rendered.add(cat.id);body+=`<g data-node="${esc(cat.id)}">${rect(x-100,cardY,240,cm.height,{fill:'surface',stroke:'border'})}${label(cat.label,x+20,cardY+cm.height/2+5-(cm.lines.length-1)*10.5,{lines:cm.lines,weight:500})}</g>`;
    const startY=sign<0?cardY+cm.height:cardY,edge=g.edges.find(e=>e.start===cat.id&&e.end===root.id);
    body+=`<path data-edge="${esc(edge.id)}" d="M${x+20} ${startY} L${join.x} ${cy}" fill="none" stroke="${token('muted')}"/>`;
    if(edge.label)body+=label(edge.label,x+110,startY-sign*24,{size:12,width:120});
    leaves(cat).forEach((e,j)=>{
      const n=g.nodes.find(n=>n.id===e.start);assert(!g.edges.some(e=>e.end===n.id),'현재 fishbone 입력은 원인·분류·결과의 세 단계입니다.');rendered.add(n.id);
      const yy=startY-sign*(72+j*80),xx=x+20+(join.x-x-20)*(yy-startY)/(cy-startY),rows=wrap(n.label,190);
      body+=`<g data-node="${esc(n.id)}">${label(n.label,xx-12,yy-12-(rows.length-1)*21,{anchor:'end',size:14,lines:rows})}</g><path data-edge="${esc(e.id)}" d="M${xx-200} ${yy} H${xx}" fill="none" stroke="${token('muted')}"/>`;
      if(e.label)body+=label(e.label,xx-12,yy+20,{anchor:'end',size:12,width:190});
    });
  });assert(rendered.size===g.nodes.length,'연결되지 않은 원인이 있습니다.');return{body,width:w,height};
}
export async function block(g,options){
  if(g.groups.length)return graphLayout(g,options);
  const columns=g.block?.columns>0?g.block.columns:Math.ceil(Math.sqrt(g.nodes.length)),cw=Math.max(40,...g.nodes.map(n=>(metrics(n,g.type).width+24)/(n.widthInColumns||1))),rh=Math.max(90,...g.nodes.map(n=>metrics(n,g.type).height+36));let col=0,row=0;
  const positions=[];
  for(const cell of g.block?.children||g.nodes){const span=cell.widthInColumns||1;if(col+span>columns){row++;col=0;}
    if(cell.type!=='space'){const n=g.nodes.find(n=>n.id===cell.id);assert(n,'블록 셀을 찾을 수 없습니다.');const m=metrics(n,g.type);positions.push({...n,...m,x:32+col*cw,y:32+row*rh,width:cw*span-24});}col+=span;
  }
  return renderPlaced(g,positions,options);
}
