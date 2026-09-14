import {readFile,writeFile,mkdir,copyFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {JSDOM} from 'jsdom';
const {window} = new JSDOM('<!doctype html><body></body>');
Object.assign(globalThis,{window,document:window.document,DOMParser:window.DOMParser});
const {render,verify} = await import('../src/renderer.mjs');
const {themeCSS} = await import('../src/svg.mjs');
const products=JSON.parse(await readFile('demo/products.json','utf8'));
const workspace=resolve(process.argv[2]||'..');
const template=await readFile('demo/intro.html','utf8');
const sha=data=>createHash('sha256').update(data).digest('hex');
const escape=text=>text.replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
for(const p of products){
  const dir=`.local/intros/${p.slug}`;await mkdir(dir+'/assets',{recursive:true});
  const inputs=[];
  for(const [i,path] of p.images.entries()){
    const file=resolve(workspace,'manta-'+p.slug,path),raw=await readFile(file);
    if(p.hashes && sha(raw)!==p.hashes[i])throw new Error('Capture changed: '+file);
    let data=raw;
    if(p.slug==='diagrams'){
      const result=await render(raw.toString(),{id:'intro-'+i});verify(result);
      const palette=Object.fromEntries([...themeCSS.matchAll(/--md-(\w+):light-dark\((#[\da-f]+),/g)].map(m=>['--md-'+m[1],m[2]]));
      const css=Object.entries(palette).map(([k,v])=>`${k}:${v}`).join(';')+';font-family:system-ui,sans-serif';
      data=Buffer.from(result.svg.replace('<svg ','<svg style="'+css+'" '));
    }
    const target=`assets/screen${i+1}.${p.slug==='diagrams'?'svg':'png'}`;
    await writeFile(dir+'/'+target,data);inputs.push({source:`manta-${p.slug}/${path}`,source_sha256:sha(raw),asset:target,sha256:sha(data)});
  }
  await copyFile('demo/assets/gsap.min.js',dir+'/assets/gsap.min.js');
  let html=template;for(const [key,value]of Object.entries({NAME:p.name,TITLE:p.title,FIRST:p.first,SECOND:p.second,CAPTURE:p.capture,EXT:p.slug==='diagrams'?'svg':'png'}))html=html.replaceAll('__'+key+'__',escape(value));
  await writeFile(dir+'/index.html',html);
  await writeFile(dir+'/inputs.json',JSON.stringify({product:p.name,capture:p.capture,inputs},null,2)+'\n');
  await writeFile(dir+'/index.motion.json',JSON.stringify({duration:10,assertions:[{kind:'appearsBy',selector:'.words',bySec:1},{kind:'appearsBy',selector:'#screen2',bySec:5.2},{kind:'staysInFrame',selector:'.words'},{kind:'keepsMoving',withinSelector:'.progress',maxStaticSec:2}]},null,2)+'\n');
  console.log(resolve(dir));
}
