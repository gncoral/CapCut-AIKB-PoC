/* Shared candidate workflow. Preview, selection and export use identical renderer state. */
(()=>{
 const families=['soft','diffuse','horizon','halo','fold','focus','ripple','prism'];
 const clone=v=>JSON.parse(JSON.stringify(v));
 const group=()=>families.includes(state.template)?'soft':state.template;
 const adapters=window.gradientBatchAdapters;
 const style=document.createElement('style');
 style.textContent=`#preference-lab{display:none!important}
 ${families.slice(1).map(k=>`.template[data-template="${k}"]`).join(',')}{display:none!important}
 .batch-panel{margin-top:24px;border-top:1px solid #30333a;padding-top:20px}.batch-head{display:flex;align-items:center;gap:12px;flex-wrap:wrap}.batch-head h3{margin-right:auto}.batch-note{color:#8d919b;font-size:12px;line-height:1.6}.batch-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}.batch-card{background:#15171d;border:1px solid #343741;border-radius:12px;overflow:hidden}.batch-card.active{outline:2px solid #fff}.batch-preview{position:relative;container-type:inline-size;overflow:hidden;isolation:isolate}.batch-preview canvas{width:100%;height:100%;display:block}.batch-preview .mock-copy{position:absolute}.batch-preview .countdown{position:absolute}.batch-preview h2,.batch-preview p{font-size:2.9cqw!important}.batch-preview[data-scene]:not([data-scene="banner"]) .mock-copy{align-items:center;justify-content:center;text-align:center}.batch-preview:not([data-scene="banner"]) .banner-copy,.batch-preview:not([data-scene="banner"]) .preview-badges{display:none!important}.batch-preview:not([data-scene="banner"]) .product-lockup{display:flex;flex-direction:column;align-items:center;gap:3.25cqw}.batch-actions{display:flex;gap:8px;padding:10px;align-items:center}.batch-actions span{font-size:12px;color:#b3b8c4;margin-right:auto}.batch-actions button{padding:6px 12px}.batch-grid:empty:after{content:'选择一个模板，点击“生成候选”；选好后可在右侧继续微调。';color:#8d919b;font-size:13px;padding:20px 0}@media(max-width:900px){.batch-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}`;
 style.textContent+='#batch-count{background:#191b22;color:#eee;border:1px solid #343741;border-radius:8px;padding:10px 14px}';
 document.head.append(style);
 const panel=document.createElement('section');panel.className='batch-panel';panel.id='gradient-batch';
 panel.innerHTML='<div class="batch-head"><h3>批量候选 · 先选再调</h3><select aria-label="批量候选数量" id="batch-count"><option>6</option><option selected>10</option><option>20</option></select><button class="button primary" id="batch-generate">生成候选</button></div><p class="batch-note">围绕当前设置生成变化，保留品牌、文字和暖色强度。虚实光场包含原基础渐变的多种结构。</p><div class="batch-grid"></div>';
 document.querySelector('.templates').after(panel);
 const grid=panel.querySelector('.batch-grid'),button=panel.querySelector('button');
 let context='',sceneContext='',epoch=0,busy=false,choices=[],applied=-1,viewIndex=0,refreshTimer=0;
 style.textContent+=`.batch-preview[role="button"]{cursor:zoom-in}.batch-preview:focus-visible{outline:3px solid #62d7fc;outline-offset:-3px}#batch-dialog{background:#17191f;color:#fff;border:1px solid #454954;border-radius:16px;padding:20px;width:min(1100px,94vw);max-height:94vh;overflow:auto}#batch-dialog::backdrop{background:#000b}.batch-dialog-head,.batch-dialog-actions{display:flex;align-items:center;gap:12px;flex-wrap:wrap}.batch-dialog-head h3{margin:0 auto 0 0}.batch-dialog-stage{display:flex;justify-content:center;align-items:center;min-height:160px;margin:20px 0}.batch-dialog-actions{justify-content:center}#batch-dialog select{background:#242730;color:#fff;padding:8px;border-radius:6px}.batch-help{font-size:12px;color:#aaa}`;
 const dialog=document.createElement('dialog');dialog.id='batch-dialog';dialog.setAttribute('aria-labelledby','batch-dialog-title');
 dialog.innerHTML='<div class="batch-dialog-head"><h3 id="batch-dialog-title"></h3><select aria-label="预览尺寸" id="batch-dialog-scene"></select><button class="button" id="batch-close">关闭</button></div><p class="batch-help">仅预览，不改变当前选图。切换尺寸仍是同一批候选。</p><div class="batch-dialog-stage"></div><div class="batch-dialog-actions"><button class="button" id="batch-prev">上一张</button><button class="button primary" id="batch-apply">使用这张</button><button class="button" id="batch-next">下一张</button></div>';
 document.body.append(dialog);
 const sceneSelect=dialog.querySelector('select');for(const [key,sc] of Object.entries(scenes)){const o=document.createElement('option');o.value=key;o.textContent=`${sc.name} · ${sc.size.join(' × ')}`;sceneSelect.append(o);}
 function snapshot(){return {state:clone(state),profiles:clone(fieldProfiles),extensions:Object.fromEntries(Object.entries(adapters).map(([k,a])=>[k,a.get()]))};}
 function restore(s){Object.assign(state,clone(s.state));Object.assign(fieldProfiles,clone(s.profiles));for(const [k,v] of Object.entries(s.extensions))adapters[k].set(v);}
 function refresh(){
  const key=[group(),state.brand].join(':');
  if(key!==context){context=key;epoch++;choices=[];applied=-1;grid.replaceChildren();dialog.close();}
  if(sceneContext!==state.scene){sceneContext=state.scene;epoch++;clearTimeout(refreshTimer);refreshTimer=setTimeout(()=>{drawCards();if(dialog.open)drawLarge();},0);}
  document.querySelector('.templates .section-head span').textContent='6 类背景模板';
  const soft=document.querySelector('.template[data-template="soft"]');soft.classList.toggle('active',group()==='soft');
 }
 function vary(index){
  state.seed=Math.floor(Math.random()*1e9);
  if(adapters[state.template]){adapters[state.template].vary();return;}
  if(state.template==='petalStack'&&window.gradientBatchFloral){window.gradientBatchFloral();return;}
  if(group()==='soft')state.template=families[index%families.length];
  const p=fieldProfiles[state.template];
  p.phase=Math.random();p.warp=.08+Math.random()*.15;
  p.nodes=p.nodes.map(n=>n.map((v,i)=>i<2?Math.max(.02,Math.min(.98,v+(Math.random()-.5)*.4)):v));
  state.angle=Math.round(-20+Math.random()*40);state.scale=Math.round(75+Math.random()*55);
 }
 function copyOverlay(stage){
  const c=document.querySelector('#copy').cloneNode(true);c.querySelectorAll('[id]').forEach(n=>n.removeAttribute('id'));c.removeAttribute('id');
  c.querySelectorAll('h2,p').forEach(n=>{n.style.fontSize='';if(state.template==='oilBrush')n.style.color='#10151c';});
  const accent=getComputedStyle(frame).getPropertyValue('--copy-accent');stage.style.setProperty('--copy-accent',accent);
  stage.append(c);
  if(state.scene==='banner'){const t=countdown.cloneNode(true);t.removeAttribute('id');stage.append(t);}
 }
 function stageFor(choice,large=false){
  const current=snapshot(),sceneKey=state.scene,sc=scenes[sceneKey];
  const stage=document.createElement('div');stage.className='batch-preview';stage.dataset.scene=sceneKey;stage.style.aspectRatio=sc.size.join('/');
  const c=document.createElement('canvas');
  try{restore(choice);state.scene=sceneKey;render(c,sceneKey,Math.min(large?2:1,(large?1600:400)/sc.size[0]));}finally{restore(current);}
  stage.append(c);copyOverlay(stage);
  if(large)stage.style.width=`min(100%, ${Math.min(1040,sc.size[0]/sc.size[1]*window.innerHeight*.58)}px)`;
  return stage;
 }
 function applyChoice(index){
  if(busy||!choices[index])return;
  const sceneKey=state.scene,exportScale=state.exportScale;
  restore(choices[index]);state.scene=sceneKey;state.exportScale=exportScale;
  const selected=snapshot();paintUI();restore(selected);state.batchStatic=true;
  for(const k of ['scale','angle','blur','sat','accent','noise','grainSize','exportScale'])document.getElementById(k).value=state[k];
  syncValues();fit();applyCopy();render();applied=index;markApplied();
  if(dialog.open)dialog.close();toast('已应用候选，可在右侧继续微调');
 }
 function drawLarge(){
  if(!choices[viewIndex])return;
  dialog.querySelector('h3').textContent=`候选 ${String(viewIndex+1).padStart(2,'0')} / ${choices.length}`;
  sceneSelect.value=state.scene;
  dialog.querySelector('.batch-dialog-stage').replaceChildren(stageFor(choices[viewIndex],true));
  dialog.querySelector('#batch-prev').disabled=viewIndex===0;
  dialog.querySelector('#batch-next').disabled=viewIndex===choices.length-1;
 }
 function openLarge(index){viewIndex=index;drawLarge();dialog.showModal();}
 function markApplied(){grid.querySelectorAll('.batch-card').forEach((card,i)=>{
  card.classList.toggle('active',applied===i);
  card.querySelector('[role="button"]').setAttribute('aria-pressed',String(applied===i));
  card.querySelector('.batch-actions span').textContent=`候选 ${String(i+1).padStart(2,'0')} · ${applied===i?'正在使用':'单击上屏'}`;
 });}
 function drawCards(){
  grid.replaceChildren();
  choices.forEach((choice,i)=>{
   const card=document.createElement('article');card.className='batch-card'+(applied===i?' active':'');card.dataset.candidate=String(choice.state.seed);
   const stage=stageFor(choice);stage.setAttribute('role','button');stage.tabIndex=0;stage.style.cursor='pointer';stage.setAttribute('aria-label',`应用候选 ${i+1}`);stage.onclick=()=>applyChoice(i);stage.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();applyChoice(i);}};card.append(stage);
   const actions=document.createElement('div');actions.className='batch-actions';const label=document.createElement('span');const zoom=document.createElement('button');zoom.className='button batch-zoom';zoom.textContent='放大';zoom.setAttribute('aria-label',`放大预览候选 ${i+1}`);zoom.onclick=()=>openLarge(i);actions.append(label,zoom);card.append(actions);grid.append(card);
  });
  markApplied();
 }
 dialog.querySelector('#batch-close').onclick=()=>dialog.close();
 dialog.onclick=e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}};
 dialog.querySelector('#batch-prev').onclick=()=>{viewIndex--;drawLarge();};
 dialog.querySelector('#batch-next').onclick=()=>{viewIndex++;drawLarge();};
 dialog.querySelector('#batch-apply').onclick=()=>applyChoice(viewIndex);
 sceneSelect.onchange=()=>{document.querySelector(`#scenes [data-scene="${sceneSelect.value}"]`).click();};
 async function generate(){
  if(busy)return;refresh();const token=epoch,base=snapshot();busy=true;button.disabled=true;choices=[];applied=-1;grid.replaceChildren();
  try{
   const count=Number(panel.querySelector('select').value);
   for(let i=0;i<count;i++){
    if(epoch!==token)break;
    try{restore(base);vary(i);choices.push(snapshot());}finally{restore(base);}
    button.textContent=`生成中 ${i+1}/${count}`;
    await new Promise(resolve=>setTimeout(resolve,0));
   }
  }catch(e){console.error(e);toast('候选生成失败，请重试');}finally{drawCards();busy=false;button.disabled=false;button.textContent='生成候选';}
 }
 button.onclick=generate;
 for(const id of ['templates','brands','scenes','scene-list'])document.getElementById(id)?.addEventListener('click',refresh);
 document.querySelector('.side').addEventListener('input',()=>{applied=-1;markApplied();});
 const oldPaint=paintUI;paintUI=function(){oldPaint();refresh();};
 refresh();
})();
