import {LinkedGraphView} from 'product/src/view.ts';
import {parseDocumentLinks} from 'product/src/model.ts';
import {normalizeSettings} from 'product/src/settings.ts';
import {frame, film, layout} from './host.mjs';
const notes = {
 'Learning map':'## Learn\n- [[Read the source]]\n- [[Map the system]]\n- [[Try the example]]\n- [[Review the result]]',
 'Read the source':'## Continue\n- [[Learning map]]\n- [[Source notes]]\n- [[Open questions]]',
 'Map the system':'## Explain\n- [[Learning map]]\n- [[API boundary]]\n- [[Data model]]\n- [[Request flow]]',
 'Try the example':'## Practice\n- [[Learning map]]\n- [[Run the code]]\n- [[Compare outputs]]',
 'Review the result':'## Review\n- [[Learning map]]\n- [[Open questions]]\n- [[Next steps]]',
};
const file = name => ({path:`${name}.md`,basename:name,extension:'md'});
let current=file('Learning map'), history=[];
const host=document.querySelector('#runtime');
const plugin={preferences:normalizeSettings({mode:'graph'}),activeSource:()=>current,
 graphFor:async f=>parseDocumentLinks(notes[f.basename]||'- [[Learning map]]',f.path,f.basename,name=>`${name}.md`),
 historyState:()=>({canBack:history.length>0,canForward:false}),parentFor:()=>null,
 fileForPath:path=>file(path.replace(/\.md$/,'')),savePreferences:async()=>{},nodeKindForPath:path=>path.includes('map')?'hub':'topic',
 openLinkedNote:async name=>{history.push(current);current=file(name);await view.refresh(current);},
 navigateHistory:async()=>{current=history.pop()||file('Learning map');await view.refresh(current);},
};
const view=new LinkedGraphView({},plugin);host.append(view.contentEl);await view.onOpen();await layout();
function settle(){const graph=view.graphSurface;graph.simulation.stop().tick(160);graph.resizeObserver.disconnect();graph.updateNodes();graph.fitGraph(false);return graph;}
settle();const frames=[frame(host,0,'Start with the note you are reading.')];
async function preview(name,at){
 const g=settle();await g.showPreview(g.leaves.find(node=>node.label===name));await layout();g.simulation.stop();
 // Sample the real layout solver, condensing its settling motion into 320 ms.
 for(let i=0;i<8;i++){g.simulation.tick(5);g.updateNodes();frames.push(frame(host,at+i*.04,'Look one connection further.'));}
}
await preview('Map the system',.55);
view.contentEl.querySelector('[data-graph-node-id="'+view.graphSurface.leaves.find(n=>n.label==='Map the system').id+'"]')?.click();
await layout();settle();frames.push(frame(host,1.65,'Open the next note. Keep the context.'));
await preview('Data model',2.1);
await plugin.navigateHistory();await layout();settle();frames.push(frame(host,3.0,'Step back and follow another connection.'));
await preview('Try the example',3.5);
view.contentEl.querySelector('.linked-graph-mode').click();frames.push(frame(host,4.6,'Switch to an outline when you need the list.'));
await view.onClose();frames.push({...frames[0],at:5.6});film(frames);
