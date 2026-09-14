import {scaleLinear,scalePoint,scaleTime,extent,line as d3Line,hierarchy,treemap as d3Treemap,timeFormat,format} from 'd3';
import {sankey as d3Sankey,sankeyLinkHorizontal} from 'd3-sankey';
import {assert,plain} from './parse.mjs';
import {esc,num,token,label,rect,line,circle,colors,wrap,textWidth} from './svg.mjs';
const number=format('~g');
export function xy(g) {
  const chart=g.chart;assert(chart&&chart.plots?.length,'XY chart 데이터가 필요합니다.');
  const points=chart.plots.flatMap(p=>p.data);assert(points.every(p=>Number.isFinite(p[1])),'누락되거나 숫자가 아닌 측정값이 있습니다.');
  const categories=chart.xAxis.categories||[...new Set(points.map(p=>p[0]))],band=chart.xAxis.type==='band';
  const bottom=Math.max(92,...categories.map(c=>wrap(c,84,12).length*18+68));
  const w=Math.max(760,categories.length*104+128),h=360+bottom,L=96,R=w-40,T=52,B=360;
  let min=Math.min(chart.yAxis.min??0,...points.map(p=>p[1])),max=Math.max(chart.yAxis.max??0,...points.map(p=>p[1]));
  if(min===max)max=min+1;
  const x=band?scalePoint(categories,[L+28,R-28]):scaleLinear([chart.xAxis.min,chart.xAxis.max],[L+20,R-20]);
  const y=scaleLinear([min,max],[B,T]);let body='';
  for(const v of y.ticks(5)){body+=line(L,y(v),R,y(v),{stroke:v===0?'muted':'rule'});body+=label(number(v),L-12,y(v)+4,{size:12,anchor:'end'});}
  body+=label(chart.yAxis.title||'값',L,T-20,{anchor:'start',size:12})+label(chart.xAxis.title||'',(L+R)/2,h-12,{size:12});
  const xticks=band?categories:x.ticks(5);xticks.forEach(v=>body+=label(v,x(band?v:+v),B+26,{size:12,width:(R-L)/Math.max(1,xticks.length)-8}));
  chart.plots.forEach((plot,pi)=>{
    const color=colors[pi%colors.length],seriesName=plot.title||`${plot.type} ${pi+1}`;
    const values=plot.data.map(([a,v])=>({label:String(a),x:x(band?a:+a),v}));
    if((g.type==='line'||plot.type==='line')&&g.type!=='scatter'&&g.type!=='waterfall')body+=`<path d="${d3Line().x(d=>d.x).y(d=>y(d.v))(values)}" fill="none" stroke="${token(color)}" stroke-width="1.6"/>`;
    let total=0;const totals=new Set((g.hints.totals?.[0]||'0').split(',').map(Number));
    values.forEach((d,i)=>{
      let from=0,to=d.v;
      if(g.type==='waterfall'){assert(chart.plots.length===1,'워터폴은 하나의 수열만 받습니다.');if(totals.has(i)){if(i)assert(Math.abs(total-d.v)<1e-8,'총합 막대의 값이 앞선 증감의 합계와 다릅니다.');total=d.v;}else{from=total;to=total+d.v;total=to;}assert(Math.min(from,to)>=min&&Math.max(from,to)<=max,'워터폴 누적 합계가 y-axis 범위를 벗어납니다.');}
      const isBar=g.type==='waterfall'||(plot.type==='bar'&&g.type!=='scatter'&&g.type!=='line');
      const bw=Math.min(60,(R-L)/categories.length*.48/chart.plots.length),offset=(pi-(chart.plots.length-1)/2)*(bw+4);
      body+=`<g data-point="${pi}:${i}" data-value="${d.v}" aria-label="${esc(seriesName+' '+d.label+' '+d.v)}">`;
      if(isBar){body+=rect(d.x-bw/2+offset,Math.min(y(from),y(to)),bw,Math.abs(y(from)-y(to)),{fill:color,stroke:'none',radius:1});if(g.type==='waterfall'&&i+1<values.length)body+=line(d.x+bw/2,y(to),values[i+1].x-bw/2,y(to),{stroke:'soft',dash:'3 3'});}
      else body+=circle(d.x,y(d.v),g.type==='scatter'?5:3.5,{fill:color});
      body+=`<title>${esc(seriesName+' · '+d.label+' · '+number(d.v))}</title>`;
      if(chart.plots.length===1||isBar)body+=label(number(d.v),d.x+offset,isBar?Math.min(y(from),y(to))-10:y(d.v)-14,{size:12,halo:true});body+='</g>';
    });
    if(chart.plots.length>1)body+=label(seriesName,L+pi*180,h-36,{size:12,anchor:'start',fill:color});
  });return{body,width:w,height:h};
}
export function polar(g) {
  assert(g.chart?.plots.length===1,'극좌표 차트는 수열 한 개를 받습니다.');const data=g.chart.plots[0].data,N=data.length;
  assert(N>=3&&data.every(d=>Number.isFinite(d[1])&&d[1]>=0),'극좌표 값은 0 이상의 숫자여야 합니다.');
  const max=Math.max(g.chart.yAxis.max||0,...data.map(d=>d[1]));assert(max>0&&(!g.chart.yAxis.min||g.chart.yAxis.min===0),'극좌표 척도는 0부터 시작해야 합니다.');
  const R=Math.max(200,N*26),cx=R+210,cy=R+150;let body='';
  for(let k=1;k<=5;k++)body+=circle(cx,cy,R*k/5,{fill:'none',stroke:'rule'})+label(number(max*k/5),cx-8,cy-R*k/5-4,{size:12,anchor:'end',fill:'muted'});
  data.forEach(([name,v],i)=>{const angle=-Math.PI/2+i*Math.PI*2/N,ux=Math.cos(angle),uy=Math.sin(angle),x=cx+R*v/max*ux,y=cy+R*v/max*uy;
    body+=line(cx,cy,cx+R*ux,cy+R*uy,{stroke:'rule'});body+=`<g data-point="0:${i}" data-value="${v}">${line(cx,cy,x,y,{stroke:i===0?'accent':'muted',width:2})}${circle(x,y,5,{fill:i===0?'accent':'ink'})}${label(name+'\n'+number(v),cx+(R+60)*ux,cy+(R+60)*uy,{anchor:ux>.25?'start':ux<-.25?'end':'middle',size:14,width:150})}</g>`;
  });return{body,width:cx*2,height:cy*2};
}
export function radar(g) {assert(g.axes?.length>=3&&g.curves?.length,'레이더 축과 수열이 필요합니다.');const N=g.axes.length,max=g.options.max??Math.max(...g.curves.flatMap(c=>c.entries)),min=g.options.min??0;assert(min===0&&max>0,'레이더 척도는 0부터 시작해야 합니다.');const R=Math.max(200,N*28),cx=R+200,cy=R+120;const point=(i,v)=>[cx+R*v/max*Math.cos(-Math.PI/2+i*2*Math.PI/N),cy+R*v/max*Math.sin(-Math.PI/2+i*2*Math.PI/N)];let body='';
  for(let k=1;k<=5;k++){body+=`<polygon points="${g.axes.map((_,i)=>point(i,max*k/5).map(num).join(',')).join(' ')}" fill="none" stroke="${token('rule')}"/>`;body+=label(number(max*k/5),cx-8,cy-R*k/5-4,{size:12,anchor:'end'});}
  g.axes.forEach((a,i)=>{const p=point(i,max),q=point(i,max*1.18),cos=Math.cos(-Math.PI/2+i*2*Math.PI/N);body+=line(cx,cy,p[0],p[1],{stroke:'rule'})+label(a.label||a.name,q[0],q[1],{anchor:cos>.25?'start':cos<-.25?'end':'middle',size:14,width:115});});
  g.curves.forEach((c,j)=>{assert(c.entries.length===N&&c.entries.every(v=>Number.isFinite(v)&&v>=0&&v<=max),'레이더 수열의 값 또는 축 개수가 맞지 않습니다.');const color=colors[j%colors.length];body+=`<polygon points="${c.entries.map((v,i)=>point(i,v).map(num).join(',')).join(' ')}" fill="${token(color)}" fill-opacity=".15" stroke="${token(color)}" stroke-width="1.5"/>`;
    c.entries.forEach((v,i)=>{const[x,y]=point(i,v);body+=`<g data-point="${j}:${i}" data-value="${v}">${circle(x,y,j===g.curves.length-1?3.5:1.5,{fill:color})}<title>${esc((c.label||c.name)+' · '+(g.axes[i].label||g.axes[i].name)+' '+v)}</title></g>`;});
    body+=rect(40+j*220,cy+R+94,18,8,{fill:color,stroke:'none',radius:0})+label(c.label||c.name,66+j*220,cy+R+104,{anchor:'start',size:14});
  });return{body,width:Math.max(cx*2,60+g.curves.length*220),height:cy+R+144};
}
export function quadrant(g) {const q=g.quadrant,all=q.quadrants,minX=Math.min(...all.map(x=>x.x)),minY=Math.min(...all.map(x=>x.y)),fullW=all[0].width*2,fullH=all[0].height*2,L=110,R=650,T=55,B=465;const x=v=>L+(v-minX)/fullW*(R-L),y=v=>T+(v-minY)/fullH*(B-T);let body=line((L+R)/2,T,(L+R)/2,B,{stroke:'border'})+line(L,(T+B)/2,R,(T+B)/2,{stroke:'border'});
  const occupied=q.points.flatMap(p=>{const rows=wrap(p.text.text,150,14);return [{x:x(p.x)-5,y:y(p.y)-5,w:10,h:10},{x:x(p.x)+10,y:y(p.y)-23,w:Math.max(...rows.map(r=>textWidth(r,14))),h:rows.length*21-4}];});
  all.forEach(v=>{const rows=wrap(v.text.text,180,12),w=Math.max(...rows.map(r=>textWidth(r,12))),h=rows.length*18-3,left=x(v.x),top=y(v.y),right=x(v.x+v.width),bottom=y(v.y+v.height);
    const candidates=[[left+12,top+12],[right-w-12,top+12],[left+12,bottom-h-12],[right-w-12,bottom-h-12]];
    const place=candidates.find(([px,py])=>occupied.every(b=>px+w+8<=b.x||b.x+b.w+8<=px||py+h+8<=b.y||b.y+b.h+8<=py));
    assert(place,'사분면 제목과 점 라벨이 겹칩니다. 라벨을 줄이거나 사례를 나누어 주세요.');
    body+=label(v.text.text,place[0],place[1]+11,{size:12,fill:'muted',anchor:'start',lines:rows});
  });
  q.points.forEach((p,i)=>body+=`<g data-point="0:${i}">${circle(x(p.x),y(p.y),4.5,{fill:i===q.points.length-1?'accent':'ink'})}${label(p.text.text,x(p.x)+10,y(p.y)-10,{size:14,anchor:'start',width:150,halo:true})}</g>`);
  const names=q.axisLabels.map(a=>a.text);body+=label(names[0],L,B+32,{anchor:'start',size:12})+label(names[1],R,B+32,{anchor:'end',size:12})+label(names[2],L-16,B-12,{anchor:'end',size:12,width:85})+label(names[3],L-16,T+16,{anchor:'end',size:12,width:85});return{body,width:750,height:540};
}
export function treemap(g) {
  const root=hierarchy(g.tree).sum(d=>d.children?0:d.value);assert(root.value>0&&root.leaves().every(n=>Number.isFinite(n.value)&&n.value>0),'트리맵의 값은 0보다 큰 숫자여야 합니다.');
  let width=720,height=420,readable=false;
  for(let attempt=0;attempt<10;attempt++){
    d3Treemap().size([width,height]).paddingInner(6).paddingOuter(6).paddingTop(d=>d.depth&&d.children?40:6)(root);
    readable=root.leaves().every(n=>{const w=n.x1-n.x0,h=n.y1-n.y0;return w>=100&&h>=wrap(n.data.name,w-24,14).length*21+54;});
    if(readable)break;width=Math.ceil(width*1.25);height=Math.ceil(height*1.25);
  }
  assert(readable,'트리맵의 값 차이가 너무 커 작은 항목을 읽을 수 없습니다. 입력 범위를 나누어 주세요.');
  let body='';
  root.descendants().filter(n=>n.depth).forEach((n,i)=>{const x=24+n.x0,y=24+n.y0,w=n.x1-n.x0,h=n.y1-n.y0;
    if(n.children){body+=label(n.data.name,x+10,y+24,{anchor:'start',size:16,weight:500,width:w-20});return;}
    const rows=wrap(n.data.name,w-24,14);body+=`<g data-point="0:${i}" data-value="${n.value}">${rect(x,y,w,h,{fill:i===1?'tint':'surface',stroke:'border',radius:0})}${label(n.data.name,x+12,y+26,{anchor:'start',size:14,lines:rows})}${label(number(n.value),x+12,y+26+rows.length*21,{anchor:'start',size:12,fill:'muted'})}</g>`;
  });return{body,width:width+48,height:height+48};
}
export function sankey(g){
  const graph=structuredClone(g.sankey);assert(graph.links.length&&graph.links.every(l=>Number.isFinite(l.value)&&l.value>0),'생키 값은 0보다 커야 합니다.');
  const flow=d3Sankey().nodeId(n=>n.id).nodeWidth(8).nodePadding(44);
  const width=Math.max(920,graph.nodes.length*56),height=Math.max(480,graph.nodes.length*48);
  flow.extent([[200,56],[width-210,height-56]])(graph);
  const layers=new Map();graph.nodes.forEach(n=>{const group=layers.get(n.depth)||[];group.push(n);layers.set(n.depth,group);});
  // Reserve vertical label space independently of a tiny flow's ribbon height.
  for(const nodes of layers.values()){
    let next=32;for(const n of nodes.sort((a,b)=>a.y0-b.y0)){
      const lines=wrap(n.id,156,14),lh=lines.length*21+22;n.labelY=Math.max((n.y0+n.y1)/2-lh/2,next);next=n.labelY+lh+16;
    }
  }
  let body='';
  graph.links.forEach((e,i)=>body+=`<path data-point="edge:${i}" data-value="${e.value}" d="${sankeyLinkHorizontal()(e)}" fill="none" stroke="${token(i===0?'accent':'soft')}" stroke-opacity=".4" stroke-width="${num(e.width)}"><title>${esc(e.source.id+' → '+e.target.id+' '+e.value)}</title></path>`);
  graph.nodes.forEach(n=>{
    const left=n.depth===0,x=left?n.x0-16:n.x1+16,anchor=left?'end':'start',rows=wrap(n.id,156,14);
    body+=`<g data-node="${esc(n.id)}">${rect(n.x0,n.y0,n.x1-n.x0,n.y1-n.y0,{fill:n.depth===0?'accent':'soft',stroke:'none',radius:0,attr:'fill-opacity=".65"'})}${label(n.id,x,n.labelY+14,{anchor,size:14,lines:rows})}${label(number(n.value),x,n.labelY+14+rows.length*21,{anchor,size:12,fill:'muted'})}</g>`;
  });
  return{body,width,height:Math.max(height,...graph.nodes.map(n=>n.labelY+wrap(n.id,156,14).length*21+56))};
}
export function timeline(g){
  const tasks=g.tasks,N=tasks.length;assert(N,'타임라인 항목이 없습니다.');
  const stamps=tasks.map(t=>{const s=t.task.trim();return /^\d{4}$/.test(s)?Date.UTC(+s,0,1):/^\d{4}-\d\d-\d\d$/.test(s)?Date.parse(s+'T00:00:00Z'):NaN;});
  const temporal=stamps.every(Number.isFinite),textH=Math.max(...tasks.map(t=>wrap(t.events.join('\n'),164,14).length*21)),cy=textH+112;
  const domain=temporal?extent(stamps):[0,N-1];if(domain[0]===domain[1])domain[1]++;
  const gaps=temporal?[...new Set(stamps)].sort((a,b)=>a-b).slice(1).map((v,i)=>v-[...new Set(stamps)].sort((a,b)=>a-b)[i]):[1];
  const w=Math.max(760,N*190,temporal&&gaps.length?(domain[1]-domain[0])/Math.min(...gaps)*190+200:0),x=scaleLinear(domain,[100,w-100]),h=cy+textH+124;let body=line(40,cy,w-40,cy,{stroke:'border'});
  tasks.forEach((t,i)=>{const px=x(temporal?stamps[i]:i),above=i%2===0;
    body+=`<g data-point="0:${i}">${circle(px,cy,4,{fill:i===N-1?'accent':'ink'})}${line(px,cy,px,above?cy-14:cy+16,{stroke:'border'})}${label(t.task.trim(),px,above?cy-28:cy+44,{size:14,weight:500})}${label(t.events.join('\n'),px,above?32:cy+76,{size:14,width:164})}</g>`;
  });if(!temporal)body+=label('사건 순서',w-24,h-20,{anchor:'end',size:12});return{body,width:w,height:h};
}
export function gantt(g){
  const tasks=g.tasks;assert(tasks.length&&tasks.every(t=>+t.endTime>=+t.startTime),'간트 시작·종료 날짜가 유효하지 않습니다.');
  const [start,end]=extent(tasks.flatMap(t=>[new Date(t.startTime),new Date(t.endTime)])),left=276,right=960,top=76;
  const rowHeights=tasks.map(t=>wrap(t.task.trim(),left-48,14).length*21+wrap(t.section||'',left-48,12).length*18+36),h=top+rowHeights.reduce((a,b)=>a+b,0)+32,x=scaleTime([start,end],[left,right]);let body='';
  x.ticks(6).forEach(d=>body+=line(x(d),top-14,x(d),h-24,{stroke:'rule'})+label(timeFormat('%m/%d')(d),x(d),top-28,{size:12}));
  let y=top;
  tasks.forEach((t,i)=>{const lines=wrap(t.task.trim(),left-48,14);
    body+=`<g data-point="0:${i}" data-node="${esc(t.id)}">${label(t.task.trim(),24,y+24,{anchor:'start',size:14,lines})}${label(t.section||'',24,y+30+lines.length*21,{anchor:'start',size:12,fill:'muted',width:left-48})}${rect(x(new Date(t.startTime)),y+(rowHeights[i]-28)/2,Math.max(2,x(new Date(t.endTime))-x(new Date(t.startTime))),28,{fill:t.crit?'tint':t.done?'surface':'series2',stroke:t.crit?'accent':'none',radius:3})}<title>${esc(timeFormat('%Y-%m-%d')(new Date(t.startTime))+' → '+timeFormat('%Y-%m-%d')(new Date(t.endTime)))}</title></g>`;y+=rowHeights[i];
  });return{body,width:right+32,height:h};
}
export function journey(g){const tasks=g.tasks;assert(tasks.length&&tasks.every(t=>Number.isFinite(t.score)&&t.score>=1&&t.score<=5),'여정 점수는 1~5여야 합니다.');const cw=180,L=150,w=L+tasks.length*cw+30,top=90,B=280;let body='';const y=scaleLinear([1,5],[B,top]);[['좋음',5],['보통',3],['불편',1]].forEach(([name,v])=>body+=label(name,L-18,y(v)+5,{anchor:'end',size:12})+line(L,y(v),w-30,y(v),{stroke:'rule'}));
  const points=tasks.map((t,i)=>[L+(i+.5)*cw,y(t.score)]),low=tasks.findIndex(t=>t.score===Math.min(...tasks.map(t=>t.score)));body+=`<path d="${d3Line()(points)}" fill="none" stroke="${token('muted')}" stroke-width="1.5"/>`;
  tasks.forEach((t,i)=>{const[x,py]=points[i];body+=`<g data-point="0:${i}" data-value="${t.score}">${label(t.task,x,42,{width:cw-20,size:14})}${circle(x,py,5,{fill:i===low?'accent':'ink'})}${label(t.section,x,330,{width:cw-20,size:12,fill:'muted'})}${label((t.people||[]).join(', '),x,360,{width:cw-20,size:12})}</g>`;});body+=label('단계',20,42,{anchor:'start',size:12})+label('구간',20,330,{anchor:'start',size:12})+label('참여자',20,360,{anchor:'start',size:12});return{body,width:w,height:410};}
