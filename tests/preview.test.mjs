import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {JSDOM} from 'jsdom';

test('preview pointer interactions',async t=>{
  const template=await readFile(process.env.MANTA_PREVIEW_FRAGMENT||new URL('../src/preview.html',import.meta.url),'utf8');
  const script=await readFile(new URL('../src/preview.mjs',import.meta.url),'utf8');
  const dom=new JSDOM(template,{runScripts:'outside-only'}),{window}=dom;
  t.after(()=>window.close());
  Object.assign(globalThis,{window,document:window.document,DOMParser:window.DOMParser});
  const {renderDocument:render}=await import('../src/document.mjs');
  const {verify}=await import('../src/renderer.mjs');
  const {sanitizeSvg}=await import('../src/sanitize.mjs');
  const {cases}=await import('../src/cases.mjs');
  const root=window.document.getElementById('mermaid-design-preview');
  const el=id=>root.querySelector('#md-'+id),stage=el('stage'),map=el('map');
  const errors=[];window.addEventListener('error',e=>errors.push(e.error));
  let width=736,height=520;
  for(const surface of [stage,map])Object.defineProperties(surface,{clientWidth:{get:()=>width},clientHeight:{get:()=>surface===stage?height:120}});
  // JSDOM has no layout or pointer capture. Model SVG transforms, including
  // minimap letterboxing, while executing the actual preview event handlers.
  window.DOMPoint=class{
    constructor(x,y){this.x=x;this.y=y;}
    matrixTransform(m){return new window.DOMPoint(m.a*this.x+m.c*this.y+m.e,m.b*this.x+m.d*this.y+m.f);}
  };
  window.SVGElement.prototype.getBBox=function(){return Object.fromEntries(['x','y','width','height'].map(k=>[k,Number(this.dataset[k]||0)]));};
  window.SVGElement.prototype.getScreenCTM=function(){
    const svg=this.ownerSVGElement||this,surface=svg.parentElement;
    const [x,y,w,h]=svg.getAttribute('viewBox').split(/\s+/).map(Number);
    const a=Math.min(surface.clientWidth/w,surface.clientHeight/h);
    const e=(surface.clientWidth-w*a)/2-x*a,f=(surface.clientHeight-h*a)/2-y*a;
    return{a,b:0,c:0,d:a,e,f,inverse:()=>({a:1/a,b:0,c:0,d:1/a,e:-e/a,f:-f/a})};
  };
  const captures=new Map();
  window.Element.prototype.setPointerCapture=function(id){captures.set(this,id);};
  window.Element.prototype.hasPointerCapture=function(id){return captures.get(this)===id;};
  window.Element.prototype.releasePointerCapture=function(id){if(this.hasPointerCapture(id))captures.delete(this);};
  window.ResizeObserver=class{observe(){}disconnect(){}};
  Object.assign(window,{render,verify,sanitizeSvg,cases:cases.filter(c=>c.id==='tree'),payload:{report:{types:{passed:0},complex:{passed:0}}}});
  for(const script of window.document.querySelectorAll('script:not([type])'))window.eval(script.textContent);
  window.eval(script.replace(/^import .*;\n/gm,''));
  const ready=async(expected='ready')=>{
    for(let i=0;i<500&&root.dataset.renderStatus!==expected;i++)await new Promise(resolve=>setTimeout(resolve,10));
    assert.equal(root.dataset.renderStatus,expected,el('error').textContent);
  };
  await ready();
  const view=()=>stage.querySelector('svg').getAttribute('viewBox').split(/\s+/).map(Number);
  const close=(actual,expected)=>assert.ok(Math.abs(actual-expected)<1e-6,`${actual} != ${expected}`);
  const point=(surface,x,y)=>new window.DOMPoint(x,y).matrixTransform(surface.querySelector('svg').getScreenCTM());
  const pointer=(target,type,x,y,options={})=>{
    const event=new window.MouseEvent(type,{bubbles:true,cancelable:true,clientX:x,clientY:y,button:options.button??0});
    Object.defineProperties(event,{pointerId:{value:options.id??1},isPrimary:{value:options.primary??true}});
    target.dispatchEvent(event);return event;
  };
  const reset=()=>{el('read').click();el('node').value='';stage.querySelectorAll('[data-selected]').forEach(n=>n.removeAttribute('data-selected'));};

  await t.test('drag the main canvas at reading and zoomed scales',()=>{
    for(const zoomed of [false,true]){
      reset();if(zoomed)el('out').click();
      const before=view(),scale=stage.querySelector('svg').getScreenCTM().a;
      assert(pointer(stage,'pointerdown',100,100).defaultPrevented);
      pointer(stage,'pointermove',140,120);pointer(stage,'pointerup',140,120);
      close(view()[0],before[0]-40/scale);close(view()[1],before[1]-20/scale);
      assert.deepEqual(view().slice(2),before.slice(2));assert.equal(captures.size,0);
    }
  });
  await t.test('node clicks focus; dragging out and back does not click',()=>{
    reset();const node=stage.querySelector('[data-node]'),label=node.querySelector('text');
    pointer(label,'pointerdown',100,100);pointer(stage,'pointermove',140,100);pointer(stage,'pointermove',100,100);pointer(stage,'pointerup',100,100);
    assert.equal(el('node').value,'');assert(!node.hasAttribute('data-selected'));
    pointer(label,'pointerdown',100,100);pointer(stage,'pointerup',102,101);
    assert.equal(el('node').value,node.dataset.node);assert(node.hasAttribute('data-selected'));
    const box=node.getBBox();close(view()[0],box.x+box.width/2-width/2);close(view()[1],box.y+box.height/2-height/2);
  });
  await t.test('minimap preserves grab offset and follows an outside drag',()=>{
    reset();assert(!map.hidden);const before=view(),start=point(map,before[0]+before[2]/4,before[1]+before[3]/4);
    const scale=map.querySelector('svg').getScreenCTM().a;
    pointer(map,'pointerdown',start.x,start.y);assert.deepEqual(view(),before);assert(map.hasPointerCapture(1));
    pointer(map,'pointermove',width+40,160);pointer(map,'pointerup',width+40,160);
    close(view()[0],before[0]+(width+40-start.x)/scale);close(view()[1],before[1]+(160-start.y)/scale);
    assert.deepEqual(view().slice(2),before.slice(2));assert.equal(captures.size,0);
    const viewport=map.querySelector('[data-viewport]');close(+viewport.getAttribute('x'),view()[0]);close(+viewport.getAttribute('y'),view()[1]);
  });
  await t.test('clicking outside the minimap viewport recenters it',()=>{
    reset();const before=view(),bounds=map.querySelector('svg').getAttribute('viewBox').split(/\s+/).map(Number);
    const x=bounds[2]-30,y=bounds[3]-30,start=point(map,x,y);
    assert(x>before[0]+before[2]||y>before[1]+before[3]);
    pointer(map,'pointerdown',start.x,start.y);pointer(map,'pointerup',start.x,start.y);
    close(view()[0],x-before[2]/2);close(view()[1],y-before[3]/2);
  });
  await t.test('secondary pointers are ignored; cancel and lost capture end dragging',()=>{
    for(const surface of [stage,map]){
      reset();const before=view();
      pointer(surface,'pointerdown',100,100,{button:2});pointer(surface,'pointerdown',100,100,{primary:false});
      assert.deepEqual(view(),before);assert.equal(captures.size,0);
      for(const end of ['pointercancel','lostpointercapture']){
        pointer(surface,'pointerdown',100,100);const started=view();
        pointer(surface,'pointermove',140,120,{id:2});pointer(surface,'pointerup',140,120,{id:2});
        assert.deepEqual(view(),started);assert(surface.hasPointerCapture(1));
        pointer(surface,end,100,100);pointer(surface,'pointermove',180,160);
        assert.deepEqual(view(),started);assert.equal(captures.size,0);assert(!surface.hasAttribute('data-dragging'));
      }
    }
  });
  await t.test('narrow viewports preserve movement scale',()=>{
    width=320;height=420;reset();const before=view(),scale=stage.querySelector('svg').getScreenCTM().a;
    pointer(stage,'pointerdown',100,100);pointer(stage,'pointermove',125,115);pointer(stage,'pointerup',125,115);
    close(view()[0],before[0]-25/scale);close(view()[1],before[1]-15/scale);
    width=736;height=520;reset();
  });
  await t.test('ordinary nodes use the shared renderer surface without preview-only paint',()=>{
    reset();const boxes=[...stage.querySelectorAll('[data-node] > rect:first-child')];
    assert(boxes.length>1);assert(boxes.every(box=>box.getAttribute('fill')==='#f6f8fa'));
    assert.equal([...window.document.styleSheets].flatMap(sheet=>[...sheet.cssRules]).some(rule=>rule.selectorText?.includes('[data-node]:not([data-selected])')),false);
  });
  if(el('box-polish'))await t.test('comparison can turn box and minimap polish off and back on',()=>{
    const rules=[...window.document.styleSheets].flatMap(sheet=>[...sheet.cssRules]);
    for(const [id,selector]of [['box-polish','#md-stage'],['map-polish','#md-map']]){
      const toggle=el(id),rule=rules.find(rule=>rule.selectorText?.includes(selector)&&rule.selectorText.includes('[fill="var(--md-paper)"]'));
      const box=root.querySelector(selector+' [data-node] > rect:first-child[fill="var(--md-paper)"]');
      assert(box.matches(rule.selectorText));toggle.checked=false;toggle.dispatchEvent(new window.Event('change'));assert(!box.matches(rule.selectorText));
      toggle.checked=true;toggle.dispatchEvent(new window.Event('change'));assert(box.matches(rule.selectorText));
    }
  });
  await t.test('render changes and invalid input release an active gesture',async()=>{
    pointer(stage,'pointerdown',100,100);el('source').value='not a diagram';el('source').dispatchEvent(new window.Event('input'));
    await new Promise(resolve=>setTimeout(resolve,320));
    assert.equal(captures.size,0);await ready('error');assert(stage.hidden);assert(map.hidden);
    pointer(stage,'pointermove',150,150);pointer(stage,'pointerup',150,150);
    el('case').value='complex';el('case').dispatchEvent(new window.Event('change'));await ready();
    assert(!stage.hidden);assert.equal(captures.size,0);assert.deepEqual(errors,[]);
  });
});
