import {renderDocument as render, diagramViewport} from './document.mjs';
import {verify} from './renderer.mjs';
import {sanitizeSvg} from './sanitize.mjs';
import {palettes} from './theme.mjs';
import {cases} from './cases.mjs';
import {payload} from 'preview-payload';
const root=document.getElementById('mermaid-design-preview');
const el=id=>root.querySelector('#md-'+id),stage=el('stage'),select=el('example'),source=el('source'),status=el('status'),error=el('error'),nodeSelect=el('node');
const items=cases;
for(const item of items){const option=document.createElement('option');option.value=item.id;option.textContent=item.label;select.append(option);}
let current,revision=0,view={x:0,y:0,w:736,h:520},fitMode=false,gesture;
function paintView(){const svg=stage.querySelector('svg');if(svg)svg.setAttribute('viewBox',`${view.x} ${view.y} ${view.w} ${view.h}`);const r=el('map').querySelector('[data-viewport]');if(r)for(const[k,v]of Object.entries({x:view.x,y:view.y,width:view.w,height:view.h}))r.setAttribute(k,v);}
function setView(fit){if(!current)return;fitMode=fit;
  const box=diagramViewport(current,stage.clientWidth,stage.clientHeight,fit);view={x:box.x,y:box.y,w:box.width,h:box.height};
  paintView();}
function zoom(factor){if(!current)return;fitMode=false;const limit=Math.max(current.width,current.height*stage.clientWidth/stage.clientHeight)*2,nw=Math.min(limit,Math.max(160,view.w*factor)),nh=nw*stage.clientHeight/stage.clientWidth;view={x:view.x+(view.w-nw)/2,y:view.y+(view.h-nh)/2,w:nw,h:nh};paintView();}
function focusNode(id){const node=[...stage.querySelectorAll('[data-node]')].find(n=>n.getAttribute('data-node')===id);if(!node)return;stage.querySelectorAll('[data-node]').forEach(n=>n.toggleAttribute('data-selected',n===node));const box=node.getBBox();view={x:box.x+box.width/2-stage.clientWidth/2,y:box.y+box.height/2-stage.clientHeight/2,w:stage.clientWidth,h:stage.clientHeight};fitMode=false;paintView();nodeSelect.value=id;}
const darkMode=()=>el('theme').value==='dark'||(el('theme').value==='auto'&&getComputedStyle(stage).colorScheme==='dark');
async function update(){endGesture();const ticket=++revision;root.dataset.renderStatus='rendering';error.hidden=true;status.textContent='렌더링 중…';try{const next=await render(source.value,{id:'preview',dark:darkMode()});if(next.model)verify(next);next.model||={nodes:[],edges:[],groups:[]};next.stats||={nodes:0,edges:0,groups:0};if(ticket!==revision)return;current=next;stage.hidden=false;el('help').hidden=false;for(const id of ['fit','read','in','out'])el(id).disabled=false;stage.replaceChildren(sanitizeSvg(next.svg,{dark:darkMode()}));
  nodeSelect.replaceChildren();const placeholder=document.createElement('option');placeholder.value='';placeholder.textContent='노드 선택';nodeSelect.append(placeholder);for(const n of next.model.nodes.filter(n=>!/^state(Start|End)$/.test(n.shape))){const option=document.createElement('option');option.value=n.id;option.textContent=n.label.replace(/\n/g,' · ');nodeSelect.append(option);}el('node-label').hidden=!next.model.nodes.length;
  status.textContent=next.stats.nodes?`${next.stats.nodes}개 노드 · ${next.model.sankey?.links.length??next.stats.edges}개 연결${next.stats.groups?' · '+next.stats.groups+'개 그룹':''}`:'입력 데이터 렌더링 완료';
  const map=el('map');map.hidden=next.width<stage.clientWidth*1.5&&next.height<stage.clientHeight*1.5;map.replaceChildren();
  if(!map.hidden){const mini=stage.querySelector('svg').cloneNode(true);mini.querySelectorAll('text,title,desc,defs').forEach(n=>n.remove());mini.querySelectorAll('[id],[marker-start],[marker-end]').forEach(n=>{n.removeAttribute('id');n.removeAttribute('marker-start');n.removeAttribute('marker-end');});mini.removeAttribute('aria-labelledby');const windowRect=document.createElementNS('http://www.w3.org/2000/svg','rect');windowRect.setAttribute('data-viewport','');windowRect.setAttribute('fill','var(--md-tint)');windowRect.setAttribute('fill-opacity','.3');windowRect.setAttribute('stroke','var(--md-accent)');windowRect.setAttribute('vector-effect','non-scaling-stroke');mini.append(windowRect);map.append(mini);}
  setView(false);root.dataset.renderStatus='ready';
}catch(e){if(ticket!==revision)return;current=null;stage.replaceChildren();stage.hidden=true;el('map').replaceChildren();el('map').hidden=true;nodeSelect.replaceChildren();el('node-label').hidden=true;el('help').hidden=true;for(const id of ['fit','read','in','out'])el(id).disabled=true;root.dataset.renderStatus='error';error.hidden=false;error.textContent=e.message;status.textContent='입력 확인 필요';}}
function choose(){const item=items.find(x=>x.id===select.value);source.value=item[el('case').value];el('purpose').textContent=item.purpose;update();}
select.addEventListener('change',choose);el('case').addEventListener('change',choose);
let timer;source.addEventListener('input',()=>{clearTimeout(timer);timer=setTimeout(update,300);});
el('theme').addEventListener('change',e=>{for(const target of[stage,el('measure'),el('map')])target.dataset.theme=e.target.value;void update();});
el('fit').addEventListener('click',()=>setView(true));el('read').addEventListener('click',()=>setView(false));el('in').addEventListener('click',()=>zoom(.7));el('out').addEventListener('click',()=>zoom(1/.7));nodeSelect.addEventListener('change',()=>focusNode(nodeSelect.value));
function endGesture(){
  const ended=gesture;if(!ended)return;
  gesture=null;delete ended.surface.dataset.dragging;
  if(ended.surface.hasPointerCapture(ended.pointerId))ended.surface.releasePointerCapture(ended.pointerId);
  return ended;
}
for(const surface of [stage,el('map')]){
  const mini=surface!==stage;
  surface.addEventListener('pointerdown',e=>{
    if(e.button!==0||e.isPrimary===false||gesture||!current||root.dataset.renderStatus!=='ready')return;
    const ctm=surface.querySelector('svg')?.getScreenCTM();if(!ctm)return;
    const matrix=ctm.inverse();if(![matrix.a,matrix.b,matrix.c,matrix.d,matrix.e,matrix.f].every(Number.isFinite))return;
    const point=new DOMPoint(e.clientX,e.clientY).matrixTransform(matrix);
    // Keep the grab offset inside the viewport; a click elsewhere recenters it.
    if(mini){
      if(point.x<view.x||point.x>view.x+view.w||point.y<view.y||point.y>view.y+view.h){view.x=point.x-view.w/2;view.y=point.y-view.h/2;}
      fitMode=false;paintView();
    }
    gesture={surface,pointerId:e.pointerId,x:e.clientX,y:e.clientY,point,matrix,vx:view.x,vy:view.y,moved:false,node:mini?null:e.target.closest('[data-node]')?.getAttribute('data-node')};
    e.preventDefault();surface.setPointerCapture(e.pointerId);surface.dataset.dragging='true';
  });
  const move=e=>{
    if(!gesture||gesture.surface!==surface||gesture.pointerId!==e.pointerId)return;
    if(!gesture.moved&&Math.hypot(e.clientX-gesture.x,e.clientY-gesture.y)<5)return;
    gesture.moved=true;fitMode=false;
    // Retain the initial transform as changing the main viewBox changes its CTM.
    const point=new DOMPoint(e.clientX,e.clientY).matrixTransform(gesture.matrix),direction=mini?1:-1;
    view.x=gesture.vx+direction*(point.x-gesture.point.x);view.y=gesture.vy+direction*(point.y-gesture.point.y);paintView();
  };
  surface.addEventListener('pointermove',move);
  surface.addEventListener('pointerup',e=>{
    if(gesture?.surface!==surface||gesture.pointerId!==e.pointerId)return;
    move(e);const ended=endGesture();if(!ended.moved&&ended.node)focusNode(ended.node);
  });
  for(const event of ['pointercancel','lostpointercapture'])surface.addEventListener(event,e=>{if(gesture?.surface===surface&&gesture.pointerId===e.pointerId)endGesture();});
}
root.addEventListener('keydown',e=>{if(!current||e.target.matches('input,textarea,select'))return;const d=40*view.w/stage.clientWidth;if(e.key==='ArrowLeft')view.x-=d;else if(e.key==='ArrowRight')view.x+=d;else if(e.key==='ArrowUp')view.y-=d;else if(e.key==='ArrowDown')view.y+=d;else return;e.preventDefault();fitMode=false;paintView();});
let lastSize='';new ResizeObserver(()=>{const size=stage.clientWidth+':'+stage.clientHeight;if(current&&lastSize&&size!==lastSize)setView(fitMode);lastSize=size;}).observe(stage);
const summary=payload.report;
el('check-summary').textContent=`자동 검사: 기본 ${summary.types.passed}/31 · 복잡 ${summary.complex.passed}/31 · 사용자 검토 대기`;
el('check-output').textContent='노드·연결·필드·수치 및 입력 오류 검사 결과입니다. 실제 볼트와 배포 사이트는 아직 적용하지 않았습니다.';
select.value=items[0].id;choose();

// This is intentionally user-triggered: initial rendering must not wait behind
// every validation example in Mermaid's shared parser queue.
el('run-checks').addEventListener('click',async()=>{
  const checks=[],measure=el('measure'),button=el('run-checks');button.disabled=true;root.dataset.browserChecks='running';
  for(const example of cases)for(const kind of ['basic','complex']){
    try{
      for(const theme of ['light','dark']){
        const result=await render(example[kind],{id:'check-'+example.id+'-'+kind+'-'+theme,dark:theme==='dark'});if(result.model)verify(result);
        measure.dataset.theme=theme;measure.replaceChildren(sanitizeSvg(result.svg,{dark:theme==='dark'}));
        await new Promise(requestAnimationFrame);
        const svg=measure.querySelector('svg'),outside=[],overlaps=[],overflow=[],small=[];
        const texts=[...svg.querySelectorAll('text')];
        for(const t of texts){const b=t.getBBox();if(t.textContent.trim()&&(!b.width||!b.height))outside.push('측정 실패: '+t.textContent);if(b.x<-.5||b.y<-.5||b.x+b.width>result.width+.5||b.y+b.height>result.height+.5)outside.push(t.textContent);if(+getComputedStyle(t).fontSize.replace('px','')<12)small.push(t.textContent);}
        const spans=[...svg.querySelectorAll('tspan')].map(t=>({text:t.textContent,b:t.getBBox(),el:t}));
        for(let i=0;i<spans.length;i++)for(let j=i+1;j<spans.length;j++){
          const a=spans[i],b=spans[j];if(a.el.parentNode===b.el.parentNode)continue;
          if(Math.min(a.b.x+a.b.width,b.b.x+b.b.width)-Math.max(a.b.x,b.b.x)>-4&&Math.min(a.b.y+a.b.height,b.b.y+b.b.height)-Math.max(a.b.y,b.b.y)>-4)overlaps.push([a.text,b.text]);
        }
        for(const n of svg.querySelectorAll('[data-shape]')){
          const b={x:+n.dataset.x,y:+n.dataset.y,width:+n.dataset.width,height:+n.dataset.height};
          for(const t of n.querySelectorAll('text')){const a=t.getBBox(),cap=/cylinder|database/.test(n.dataset.shape)?20:0;
            if(a.x<b.x+3||a.y<b.y+cap+2||a.x+a.width>b.x+b.width-3||a.y+a.height>b.y+b.height-2)overflow.push(t.textContent);
            const shape=n.firstElementChild;
            if(shape.isPointInFill)for(const span of t.querySelectorAll('tspan')){const r=span.getBBox();if(!r.width)continue;const corners=[[r.x,r.y],[r.x+r.width,r.y],[r.x,r.y+r.height],[r.x+r.width,r.y+r.height]];if(corners.some(([x,y])=>!shape.isPointInFill(new DOMPoint(x,y))))overflow.push('실제 도형 경계: '+span.textContent);}
          }
          for(const t of texts){if(t.closest('[data-node]')===n)continue;const a=t.getBBox();if(Math.min(a.x+a.width,b.x+b.width)-Math.max(a.x,b.x)>1&&Math.min(a.y+a.height,b.y+b.height)-Math.max(a.y,b.y)>1)overflow.push('도형과 겹침: '+t.textContent);}
        }
        for(const dot of svg.querySelectorAll('circle')){const r=+dot.getAttribute('r');if(dot.closest('defs')||r>6)continue;const x=+dot.getAttribute('cx'),y=+dot.getAttribute('cy');
          for(const t of spans){const b=t.b,dx=Math.max(b.x-x,0,x-b.x-b.width),dy=Math.max(b.y-y,0,y-b.y-b.height);if(Math.hypot(dx,dy)<r+4)overflow.push('점과 라벨 간격: '+t.text);}
        }
        const shapeNodes=new Map([...svg.querySelectorAll('[data-shape]')].map(n=>[n.dataset.node,n.firstElementChild]));
        for(const edge of svg.querySelectorAll('path[data-from][data-to]'))for(const [nodeId,distance]of [[edge.dataset.from,0],[edge.dataset.to,edge.getTotalLength()]]){
          const shape=shapeNodes.get(nodeId);if(!shape?.isPointInFill)continue;const p=edge.getPointAtLength(distance),inside=q=>shape.tagName==='circle'?Math.hypot(q.x- +shape.getAttribute('cx'),q.y- +shape.getAttribute('cy'))<=+shape.getAttribute('r'):shape.isPointInFill(q);
          const probes=Array.from({length:8},(_,i)=>inside(new DOMPoint(p.x+2*Math.cos(i*Math.PI/4),p.y+2*Math.sin(i*Math.PI/4))));
          if(!probes.some(Boolean)||probes.every(Boolean))overflow.push('연결 접점: '+nodeId);
        }
        // Measure CSS pixels in real SVG viewports, using the default reading scale.
        const sizes=[];
        for(const width of [360,640,1024]){
          const height=width<500?420:520,fit=result.width<=width&&result.height<=height;
          svg.style.width=width+'px';svg.style.height=height+'px';
          const ratio=width/height,vw=fit?Math.max(result.width,result.height*ratio):width;
          svg.setAttribute('viewBox',`0 0 ${vw} ${vw/ratio}`);
          const scale=svg.getScreenCTM().a,minimum=Math.min(...texts.map(t=>parseFloat(getComputedStyle(t).fontSize)*scale));
          if(minimum<11.99)small.push('viewport '+width+': '+minimum);sizes.push({width,minFont:Math.round(minimum*100)/100});
        }
        checks.push({id:example.id,kind,theme,ok:!outside.length&&!overlaps.length&&!overflow.length&&!small.length,outside,overlaps,overflow,small,sizes,measured:spans.length,sample:spans.slice(0,3).map(s=>({text:s.text,x:s.b.x,y:s.b.y,width:s.b.width,height:s.b.height})),...(example.id==='venn'?{labels:spans.map(s=>({text:s.text,x:s.b.x,y:s.b.y,width:s.b.width,height:s.b.height}))}:{})});
        measure.replaceChildren();
      }
    }catch(e){checks.push({id:example.id,kind,ok:false,error:e.message});}
    el('check-output').textContent=`화면 검사 ${checks.length}/124`;
    await new Promise(requestAnimationFrame);
  }
  // Exercise host appearance with the opposite inherited scheme as well.
  const themeChecks=[];measure.removeAttribute('data-theme');
  for(const [name,className,attribute,inherited,override,expected]of [
    ['obsidian-light','theme-light','','dark','','light'],['obsidian-dark','theme-dark','','light','','dark'],
    ['site-light','','light','dark','','light'],['site-dark','','dark','light','','dark'],['site-class-dark','dark','','light','','dark'],
    ['system-light','','','light','','light'],['system-dark','','','dark','','dark'],
    ['override-light','theme-dark','','dark','light','light'],['override-dark','theme-light','','light','dark','dark'],
  ]){measure.innerHTML='<div><div class="md-surface"><svg><rect width="1" height="1" fill="var(--md-paper)"/></svg></div></div>';const host=measure.firstElementChild,surface=host.firstElementChild;
    host.className=className;if(attribute)host.dataset.theme=attribute;host.style.colorScheme=inherited;if(override)surface.dataset.theme=override;
    const actual=getComputedStyle(surface).colorScheme;themeChecks.push({name,expected,actual,ok:actual===expected,paper:getComputedStyle(surface.querySelector('rect')).fill});
  }measure.replaceChildren();
  for(const theme of ['light','dark']){
    try{
      const result=await render('railroad-peg-beta\nExpression <- Term (("+" / "-") Term)* ;',{id:'check-railroad-'+theme,dark:theme==='dark'});
      measure.replaceChildren(sanitizeSvg(result.svg,{dark:theme==='dark'}));
      const svg=measure.querySelector('svg'),label=[...svg.querySelectorAll('text')].find(node=>node.textContent==='+');
      const terminal=label?.parentElement.querySelector('rect'),p=palettes[theme];
      themeChecks.push({name:'railroad-'+theme,ok:result.engine==='Mermaid'&&label?.getAttribute('fill')===p.ink&&terminal?.getAttribute('fill')===p.surface,
        label:label?.getAttribute('fill'),surface:terminal?.getAttribute('fill'),expected:{ink:p.ink,surface:p.surface}});
    }catch(error){themeChecks.push({name:'railroad-'+theme,ok:false,error:error.message});}
  }measure.replaceChildren();
  button.disabled=false;root.dataset.browserChecks=checks.every(c=>c.ok)&&themeChecks.every(c=>c.ok)?'passed':'failed';root.dataset.checkResults=JSON.stringify(checks);root.dataset.themeChecks=JSON.stringify(themeChecks);
  el('check-output').textContent=`브라우저 경계·겹침·읽기 크기: ${checks.filter(c=>c.ok).length}/${checks.length}\n앱·사이트 테마 규칙: ${themeChecks.filter(c=>c.ok).length}/${themeChecks.length}\n`+checks.filter(c=>!c.ok).map(c=>`${c.id} · ${c.kind} · ${c.theme||''}: ${c.error||[...c.outside,...c.overlaps.map(p=>p.join(' / ')),...c.overflow,...c.small].join(', ')}`).concat(themeChecks.filter(c=>!c.ok).map(c=>c.name+': '+c.actual)).join('\n');
});
