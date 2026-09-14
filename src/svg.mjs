import {assert} from './parse.mjs';
import {palettes, fontFamily} from './theme.mjs';

export const esc = s => String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
export const num = n => {assert(Number.isFinite(n),'그림 좌표가 유효하지 않습니다.');return Math.round(n*1000)/1000;};
export const token = key => `var(--md-${key})`;
export const colors = ['accent','series1','series2','series3','series4'];
export function textWidth(text,size=14) {
  // The browser measures with the same local font as the SVG. Node tests use a
  // conservative estimate; browser geometry verification remains authoritative.
  if(typeof window!=='undefined'&&!/jsdom/i.test(window.navigator?.userAgent||'')){
    const ctx=textWidth.context ||= document.createElement('canvas').getContext('2d');
    if(ctx){ctx.font=`${size}px ${fontFamily}`;return ctx.measureText(String(text)).width;}
  }
  return [...String(text)].reduce((sum,c)=>sum+size*(/[^\u0000-\u00ff]/.test(c)?1:/[MW@%]/.test(c)?.92:/[A-Z0-9]/.test(c)?.68:/[il.,:;'!| ]/.test(c)?.36:.62),0);
}
export function wrap(label,width=208,size=14) {
  return String(label).split('\n').flatMap(paragraph=>{
    let line='';const lines=[];
    for(const word of paragraph.match(/\s+|[^\s]+/gu)||['']) {
      if(textWidth(line+word,size)<=width){line+=word;continue;}
      if(line.trim()){lines.push(line.trimEnd());line='';}
      for(const char of word.trimStart()){
        if(line&&textWidth(line+char,size)>width){lines.push(line);line='';}
        line+=char;
      }
    }
    lines.push(line.trimEnd());return lines;
  });
}
export function label(text,x,y,{size=14,anchor='middle',fill='ink',lines,width=208,weight=400,mono=false,halo=false,attr=''}={}) {
  const rows=lines||wrap(text,width,size), step=size*1.5;
  return `<text x="${num(x)}" y="${num(y)}" text-anchor="${anchor}" fill="${token(fill)}" font-size="${size}" font-weight="${weight}"${mono?' font-family="ui-monospace, monospace"':''}${halo?' paint-order="stroke" stroke="var(--md-paper)" stroke-width="4" stroke-linejoin="round"':''} ${attr}>${rows.map((line,i)=>`<tspan x="${num(x)}" dy="${i?step:0}">${esc(line)}</tspan>`).join('')}</text>`;
}
export function rect(x,y,w,h,{fill='paper',stroke='border',radius=4,dash='',attr=''}={}) {
  return `<rect x="${num(x)}" y="${num(y)}" width="${num(w)}" height="${num(h)}" rx="${radius}" fill="${fill==='none'?'none':token(fill)}" stroke="${stroke==='none'?'none':token(stroke)}" stroke-width="1"${dash?` stroke-dasharray="${dash}"`:''} ${attr}/>`;
}
export function line(x1,y1,x2,y2,{stroke='muted',width=1,dash='',attr=''}={}) {
  return `<path d="M${num(x1)} ${num(y1)} L${num(x2)} ${num(y2)}" fill="none" stroke="${token(stroke)}" stroke-width="${width}"${dash?` stroke-dasharray="${dash}"`:''} ${attr}/>`;
}
export function circle(x,y,r,{fill='ink',stroke='none',attr=''}={}) {
  return `<circle cx="${num(x)}" cy="${num(y)}" r="${num(r)}" fill="${fill==='none'?'none':token(fill)}" stroke="${stroke==='none'?'none':token(stroke)}" ${attr}/>`;
}
export function roundedPath(points,radius=8) {
  if(!points.length)return '';
  let path=`M${num(points[0].x)} ${num(points[0].y)}`;
  for(let i=1;i<points.length-1;i++){
    const a=points[i-1],b=points[i],c=points[i+1];
    const d1=Math.hypot(b.x-a.x,b.y-a.y),d2=Math.hypot(c.x-b.x,c.y-b.y),r=Math.min(radius,d1/2,d2/2);
    if(!d1||!d2)continue;
    const p={x:b.x+(a.x-b.x)*r/d1,y:b.y+(a.y-b.y)*r/d1},q={x:b.x+(c.x-b.x)*r/d2,y:b.y+(c.y-b.y)*r/d2};
    path+=` L${num(p.x)} ${num(p.y)} Q${num(b.x)} ${num(b.y)} ${num(q.x)} ${num(q.y)}`;
  }
  return path+` L${num(points.at(-1).x)} ${num(points.at(-1).y)}`;
}
export function frame(body,width,height,type,id='md',title='') {
  const markers=['point','dependency','extension','composition','aggregation','cross','circle','only_one','zero_or_one','one_or_more','zero_or_more'];
  let defs='';
  for(const marker of markers){
    if(['only_one','zero_or_one','one_or_more','zero_or_more'].includes(marker)){
      const maximum=marker.endsWith('more')?'M22 2 L12 7 L22 12 M12 7 H22':'M22 2 V12';
      const minimum=marker.startsWith('zero')?'<circle cx="6" cy="7" r="3" fill="var(--md-paper)" stroke="var(--md-muted)"/>':'<path d="M6 2 V12" fill="none" stroke="var(--md-muted)"/>';
      defs+=`<marker id="${id}-${marker}" markerWidth="24" markerHeight="14" refX="23" refY="7" orient="auto-start-reverse" markerUnits="userSpaceOnUse"><path d="${maximum}" fill="none" stroke="var(--md-muted)"/>${minimum}</marker>`;
      continue;
    }
    const content=marker==='extension'?'<path d="M1 1 L11 6 L1 11 Z" fill="var(--md-paper)" stroke="var(--md-muted)"/>':
      marker==='composition'||marker==='aggregation'?`<path d="M0 6 L6 2 L12 6 L6 10 Z" fill="${marker==='composition'?'var(--md-muted)':'var(--md-paper)'}" stroke="var(--md-muted)"/>`:
      marker==='cross'?'<path d="M4 2 L10 10 M4 10 L10 2" stroke="var(--md-muted)"/>':
      marker==='circle'?'<circle cx="7" cy="6" r="4" fill="var(--md-paper)" stroke="var(--md-muted)"/>':
      '<path d="M1 2 L10 6 L1 10" fill="none" stroke="var(--md-muted)" stroke-width="1.2"/>';
    defs+=`<marker id="${id}-${marker}" markerWidth="14" markerHeight="12" refX="11" refY="6" orient="auto-start-reverse" markerUnits="userSpaceOnUse">${content}</marker>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" class="md-diagram" data-type="${esc(type)}" width="${num(width)}" height="${num(height)}" viewBox="0 0 ${num(width)} ${num(height)}" role="img" aria-labelledby="${id}-title ${id}-desc"><title id="${id}-title">${esc(title||type)}</title><desc id="${id}-desc">Mermaid 원문으로부터 생성한 ${esc(type)} 다이어그램.</desc><defs>${defs}</defs><rect width="100%" height="100%" fill="${token('paper')}"/>${body}</svg>`;
}
export const themeCSS = `
.md-surface{${Object.keys(palettes.light).map(key=>`--md-${key}:light-dark(${palettes.light[key]},${palettes.dark[key]});`).join('')}}
.theme-light .md-surface,[data-theme=light] .md-surface{color-scheme:light}.theme-dark .md-surface,.dark .md-surface,[data-theme=dark] .md-surface{color-scheme:dark}
.md-surface[data-theme=light]{color-scheme:light}.md-surface[data-theme=dark]{color-scheme:dark}
.md-diagram{font-family:${fontFamily};display:block}.md-diagram [data-edge]{vector-effect:non-scaling-stroke}
`;
