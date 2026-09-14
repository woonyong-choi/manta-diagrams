import {mountRunnableBlock} from 'product/src/ui.ts';
import {BrowserJavaScriptRunner} from 'product/src/runners/javascript-runner.ts';
import {configureDomAdapter} from 'product/src/dom.ts';
import {BROWSER_DOM_ADAPTER} from 'product/site/browser-dom-adapter.mts';
import {EditorView} from 'product/node_modules/@codemirror/view/dist/index.js';
import {frame, film, layout} from './host.mjs';
configureDomAdapter(BROWSER_DOM_ADAPTER);
const host=document.querySelector('#runtime');host.classList.add('code-runtime');
const source = 'const prices = [12, 18, 24];\nconst discount = 0;\n\nconst total = prices\n  .map(price => price * (1 - discount))\n  .reduce((sum, price) => sum + price, 0);\n\nconsole.log(`Total: $${total.toFixed(2)}`);';
const runner=new BrowserJavaScriptRunner();
const mounted=mountRunnableBlock(host,{code:source,language:'javascript',runner});
await mounted.refreshAvailability();await layout();
const editor=EditorView.findFromDOM(host.querySelector('.cm-editor'));
const frames=[frame(host,0,'Change a value. Run the example.')];
async function execute(at,expected){
 host.querySelector('.rcb__button--run').click();
 // Only retain a frame after the real Web Worker has supplied its output.
 for(let i=0;i<100;i++) {await layout();if(host.querySelector('.rcb__output')?.textContent.includes(expected)) break;}
 if(!host.querySelector('.rcb__output')?.textContent.includes(expected))throw Error('Actual code output missing: '+expected);
 frames.push(frame(host,at,'See the result beside the code.'));
}
await execute(.45,'54.00');
function edit(value,at){const code=source.replace('discount = 0;',`discount = ${value};`);editor.dispatch({changes:{from:0,to:editor.state.doc.length,insert:code+'\n\n'}});frames.push(frame(host,at,'Try a different value.'));}
edit('0.',1.3);edit('0.2',1.44);await execute(1.9,'43.20');
edit('0.',2.85);edit('0.3',2.99);edit('0.35',3.13);await execute(3.6,'35.10');
host.querySelector('.rcb__button--reset').click();await layout();frames.push(frame(host,4.6,'Reset to the original example.'));
frames.push({...frames[0],at:5.6});mounted.dispose();runner.dispose();film(frames);
