import {readFile,writeFile,mkdir,copyFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {build} from 'esbuild';
import {themeCSS} from '../src/svg.mjs';
const workspace=resolve(process.argv[2]||'..');
const template=await readFile('demo/intro.html','utf8');
const diagramTemplate=await readFile('demo/diagrams.html','utf8');
// Use the existing browser fixture's public host tokens; retain the product's own CSS.
let hostCss=(await readFile(resolve(workspace,'manta-calendar/tests/fixtures/link-calendar-dark.html'),'utf8')).split('<style>')[1].split('html, body,')[0];
hostCss=hostCss.replace('--background-primary: #191919','--background-primary: #0d1117').replace('--font-ui-smaller: 11px','--font-ui-smaller: 14px').replace('--font-ui-small: 12px','--font-ui-small: 16px').replace('--font-ui-medium: 13px','--font-ui-medium: 18px');
hostCss+=':root{--link-color:var(--interactive-accent);--background-modifier-border-focus:var(--interactive-accent);--background-modifier-border:var(--divider-color);--graph-line:var(--divider-color);--text-accent:var(--interactive-accent);--code-string:var(--text-normal);--code-value:var(--interactive-accent);--code-keyword:var(--interactive-accent)}html.theme-light{--text-faint:#62625f}';
hostCss+='html.theme-dark{--text-faint:#a8a8a5;--text-on-accent:#0d1117}html.theme-light{--color-green:#23723a;--text-success:#23723a}@font-face{font-family:"Apple SD Gothic Neo";src:local("Apple SD Gothic Neo")}@font-face{font-family:"Noto Sans KR";src:local("Noto Sans KR")}';
const products=[['calendar','Manta Calendar','A way back\nto the note.'],['graph','Manta Graph','Follow\nthe thread.'],['code-blocks','Manta Code Blocks','Read it.\nTry it.'],['diagrams','Manta Diagrams','Make the\nidea clear.']];
const selected=process.argv[3];
if(selected&&!products.some(([slug])=>slug===selected))throw new Error(`Unknown product: ${selected}`);
for(const [slug,name,title] of products.filter(([slug])=>!selected||slug===selected)){
 const product=resolve(workspace,'manta-'+slug), packageJson=JSON.parse(await readFile(product+'/package.json','utf8'));
 const dir='.local/loops/'+slug;await mkdir(dir+'/assets',{recursive:true});
 const alias={product};if(slug==='calendar')alias.obsidian=product+'/tests/obsidian-runtime.ts';if(slug==='graph')alias.obsidian=product+'/tests/fixtures/obsidian.ts';
 const result=await build({entryPoints:['demo/runtime/'+slug+'.mjs'],bundle:true,format:'esm',platform:'browser',target:'es2022',outfile:dir+'/assets/action.js',alias,metafile:true,minify:true});
 await copyFile('demo/assets/gsap.min.js',dir+'/assets/gsap.min.js');
 await writeFile(dir+'/assets/product.css',slug==='diagrams'?themeCSS:await readFile(product+'/styles.css','utf8'));
 const provenance=`${name} ${packageJson.version} ${slug==='diagrams'?'renderer':slug==='code-blocks'?'browser UI':'view fixture'}`;
 const values={NAME:name,TITLE:title,THEME:'theme-light',PROVENANCE:provenance,HOST_CSS:hostCss};let html=slug==='diagrams'?diagramTemplate:template;
 for(const [key,value]of Object.entries(values))html=html.replaceAll('__'+key+'__',value);
 await writeFile(dir+'/index.html',html);
 const inputs={product:name,version:packageJson.version,provenance:'Production UI with public sample data; Obsidian host boundary replaced for Graph and Calendar. Timing condensed; not a native Obsidian recording.',loop:true,duration:6,cursor:false,inputs:{}};
 for(const path of Object.keys(result.metafile.inputs).filter(p=>!p.includes('node_modules'))){inputs.inputs[path.replaceAll(workspace+'/','')]=createHash('sha256').update(await readFile(path)).digest('hex');}
 await writeFile(dir+'/inputs.json',JSON.stringify(inputs,null,2)+'\n');
 await writeFile(dir+'/index.motion.json',JSON.stringify({duration:6,assertions:[{kind:'appearsBy',selector:'.screen',bySec:.1},{kind:'staysInFrame',selector:'.screen'},{kind:'staysInFrame',selector:slug==='diagrams'?'#shot-0 .diagram-source':'.words'},{kind:'keepsMoving',withinSelector:'.screen',maxStaticSec:1.7}]},null,2)+'\n');
 const darkDir=dir+'-dark';await mkdir(darkDir+'/assets',{recursive:true});
 for(const asset of ['action.js','product.css','gsap.min.js'])await copyFile(dir+'/assets/'+asset,darkDir+'/assets/'+asset);
 await writeFile(darkDir+'/index.html',html.replace('class="theme-light"','class="theme-dark"'));
 for(const file of ['inputs.json','index.motion.json'])await copyFile(dir+'/'+file,darkDir+'/'+file);
 console.log(resolve(dir));
}
