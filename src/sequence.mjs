import {assert,plain} from './parse.mjs';
import {esc,label,rect,line,token,wrap,textWidth,roundedPath} from './svg.mjs';
export function sequence(g,{id='md'}={}) {
  const actors=g.nodes,lane=Math.max(190,...g.messages.map(m=>Math.min(320,textWidth(plain(m.message),14)+50))),left=100,w=left*2+actors.length*lane;
  const x=new Map(actors.map((n,i)=>[n.id,left+i*lane+lane/2]));let y=114,body='',messages='',frames='',active='',stack=[],activations=new Map();
  actors.forEach(n=>body+=`<g data-node="${esc(n.id)}">${rect(x.get(n.id)-76,24,152,58,{fill:'surface'})}${label(n.label,x.get(n.id),57,{width:130})}</g>`);
  const starts={10:'loop',12:'alt',15:'opt',19:'par',22:'rect',27:'critical',30:'break',32:'par'},ends=new Set([11,14,16,21,23,29,31]);
  for(const m of g.messages){
    const text=plain(m.message),rows=wrap(text,Math.max(150,lane-30),14),height=Math.max(58,rows.length*20+26),sx=x.get(m.from),tx=x.get(m.to);
    if(starts[m.type]){stack.push({kind:starts[m.type],label:text,y,depth:stack.length});y+=40;continue;}
    if(ends.has(m.type)){const f=stack.pop();assert(f,'시퀀스 구간 닫기가 맞지 않습니다.');const inset=36+f.depth*16;frames+=rect(inset,f.y,w-inset*2,y-f.y+14,{fill:'none',stroke:'border',attr:`data-sequence-frame="${f.kind}" data-depth="${f.depth}"`})+label(f.kind+' '+f.label,inset+14,f.y+22,{anchor:'start',size:12,width:w-inset*2-28});y+=32;continue;}
    if([13,20,28].includes(m.type)){const inset=36+(stack.at(-1)?.depth||0)*16;frames+=line(inset,y,w-inset,y,{stroke:'border',dash:'4 4'})+label(text,inset+14,y+22,{size:12,anchor:'start',width:w-inset*2-28});y+=42;continue;}
    if(m.type===17){activations.set(m.from,[...(activations.get(m.from)||[]),y]);continue;}
    if(m.type===18){const start=activations.get(m.from)?.pop();assert(start!==undefined,'activation 구간이 닫히지 않았습니다.');active+=rect(x.get(m.from)-5,start,10,y-start,{fill:'surface',stroke:'border',radius:0});continue;}
    if(m.type===2){const from=x.get(Array.isArray(m.from)?m.from[0]:m.from)??left,to=x.get(Array.isArray(m.to)?m.to.at(-1):m.to)??from;messages+=rect(Math.min(from,to)-60,y-22,Math.abs(to-from)+120,height,{fill:'surface',stroke:'border'})+label(text,(from+to)/2,y,{size:14,lines:rows});y+=height+20;continue;}
    if(m.type===26){continue;}
    assert(sx!==undefined&&tx!==undefined,`알 수 없는 시퀀스 메시지 유형: ${m.type}`);
    const dotted=[1,4,6,25,34,51,52,53,54,55,56,57,58].includes(m.type),cross=[3,4].includes(m.type),dual=[33,34,61].includes(m.type);
    let path;if(sx===tx)path=roundedPath([{x:sx,y},{x:sx+84,y},{x:sx+84,y:y+36},{x:sx,y:y+36}]);else path=`M${sx} ${y} H${tx}`;
    messages+=`<g><path data-edge="${esc(m.id)}" data-from="${esc(m.from)}" data-to="${esc(m.to)}" d="${path}" fill="none" stroke="${token('muted')}" stroke-width="1.1"${dotted?' stroke-dasharray="5 4"':''}${[5,6].includes(m.type)?'':` marker-end="url(#${id}-${cross?'cross':'point'})"`}${dual?` marker-start="url(#${id}-point)"`:''}/>${label(text,sx===tx?sx+94:(sx+tx)/2,y-10-(rows.length-1)*20,{size:14,lines:rows,anchor:sx===tx?'start':'middle'})}</g>`;
    y+=height+(sx===tx?34:0);
  }
  assert(!stack.length,'시퀀스 구간이 닫히지 않았습니다.');const h=y+30;
  let lifelines='';actors.forEach(n=>lifelines+=line(x.get(n.id),82,x.get(n.id),h-24,{stroke:'border',dash:'4 5'}));
  for(const[name,opens]of activations)for(const start of opens)active+=rect(x.get(name)-5,start,10,h-start-24,{fill:'surface',stroke:'border',radius:0});
  return{body:lifelines+frames+active+messages+body,width:w,height:h};
}
