import {render,verify} from '../../src/renderer.mjs';
import {palettes} from '../../src/theme.mjs';
import {frame,film} from './host.mjs';
const host=document.querySelector('#runtime');host.classList.add('diagram-runtime','md-surface');
const code=document.createElement('pre'), drawing=document.createElement('div');code.className='diagram-source';drawing.className='diagram-output';host.append(code,drawing);
const base='flowchart LR\n  Read[Read the source] --> Explain[Explain the idea]\n  Explain --> Try[Try an example]\n  Try --> Review[Review the result]\n  Review --> Read';
const frames=[];
for(const [i,layout] of ['flowchart','loop','flowchart','loop','flowchart'].entries()){
 const source=`%% layout: ${layout}\n${base}`;
 const result=await render(source,{id:'movie-'+i});verify(result);
 code.textContent=source;drawing.innerHTML=result.svg;
 const svg=drawing.firstElementChild;svg.style.width='100%';svg.style.height='100%';
 for(const [key,value] of Object.entries(palettes[document.documentElement.classList.contains('theme-dark')?'dark':'light']))host.style.setProperty('--md-'+key,value);
 frames.push(frame(host,[0,.8,1.9,3.05,4.35][i],['Keep the source. Choose the layout.','Give a cycle room to breathe.','Follow the process from left to right.','Every label stays in the source.','One source. A clearer view.'][i]));
}
frames.push({...frames[0],at:5.6});film(frames);
