import {renderDocument as render} from '../../src/document.mjs';
import {sanitizeSvg} from '../../src/sanitize.mjs';
import {palettes} from '../../src/theme.mjs';
import {frame,film} from './host.mjs';
const host=document.querySelector('#runtime');host.classList.add('diagram-runtime','md-surface');
const pane=document.createElement('section'),code=document.createElement('pre'),drawing=document.createElement('div');
pane.className='diagram-code-pane';code.className='diagram-source';drawing.className='diagram-output';
const heading=document.createElement('p');heading.className='diagram-pane-title';heading.textContent='Mermaid source';pane.append(heading,code);host.append(pane,drawing);
const dark=document.documentElement.classList.contains('theme-dark');
for(const [key,value] of Object.entries(palettes[dark?'dark':'light']))document.querySelector('#manta-intro').style.setProperty('--md-'+key,value);
const original='flowchart LR\n  A[Source]\n  B[Review]\n  A --> B';
let current=original;const frames=[],checks=[];
await document.fonts.ready;
const capture=(at,source,caption)=>{code.textContent=source;frames.push(frame(host,at,caption));};
async function complete(source,at,caption){
 const result=await render(source,{id:'movie-'+checks.length,dark});
 drawing.replaceChildren(sanitizeSvg(result.svg,{dark}));
 const title=heading.cloneNode(true);title.textContent='Rendered result';drawing.prepend(title);
 const svg=drawing.querySelector('svg');svg.style.width='100%';svg.style.height='100%';
 const labels=[...svg.querySelectorAll('text')].map(t=>t.textContent);
 if(!labels.includes('Source')&&!labels.includes('Note'))throw new Error('Source label missing');
 const minimum=Math.min(...[...svg.querySelectorAll('text')].map(t=>parseFloat(getComputedStyle(t).fontSize)*svg.getScreenCTM().a/2));
 if(minimum<14)throw new Error(`Label below 14px at an 800px README width: ${minimum}`);
 checks.push({at,source,labels,nodes:result.stats.nodes,edges:result.stats.edges,minimumLabelAt800:minimum});
 current=source;capture(at,source,caption);
}
// Replay rapid source edits, then the actual render after the preview's 300ms debounce.
// Nodes change only when the renderer returns; no interpolated node motion is implied.
async function edit(next,at,duration,caption){
 let start=0,end=0;
 while(start<current.length&&start<next.length&&current[start]===next[start])start++;
 while(end<current.length-start&&end<next.length-start&&current.at(-1-end)===next.at(-1-end))end++;
 const prefix=next.slice(0,start),suffix=end?next.slice(-end):'',insert=next.slice(start,next.length-end);
 const steps=Math.max(1,Math.ceil(insert.length/2));
 for(let i=0;i<=steps;i++)capture(at+duration*i/steps,prefix+insert.slice(0,Math.ceil(insert.length*i/steps))+suffix,caption);
 await complete(next,at+duration+.3,caption);
}
await complete(original,0,'Edit the source. The diagram follows.');
await edit(original.replace('Review','Check'),.4,.32,'Rename a label.');
await edit(current+'\n  C[Save]\n  B --> C',1.6,.4,'Add a connected step.');
await edit(current.replace('Source','Note'),2.95,.28,'Keep the diagram in sync with the text.');
await edit(current.split('\n  C[Save]')[0],4.15,.16,'Remove the extra step.');
await edit(original,4.85,.35,'Edit the source. The diagram follows.');
frames.push({...frames[0],at:5.6});film(frames);
document.body.dataset.renderChecks=JSON.stringify(checks);
