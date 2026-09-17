/* Compact template selection and immutable, browser-local export selections. */
(()=>{
 const copy=window.gradientCopyTools,clone=x=>JSON.parse(JSON.stringify(x));
 const items=new Map(),selected=new Set();let db=null,editing=null,busy=false,cleared=null;const urls=[];
 const row=document.createElement('div');row.className='row copy-template-row';
 row.innerHTML='<div class="copy-template-strip" aria-label="文字模板预览"></div><div class="copy-template-actions"><button class="chip" id="copy-library-open">全部模板</button><button class="button primary" id="delivery-add">加入导出清单</button><button class="button" id="delivery-cancel" hidden>结束编辑</button></div>';
 const label=document.createElement('div');label.className='quick-label';label.textContent='文字模板';document.querySelector('.quick').append(label,row);
 const queueButton=document.createElement('button');queueButton.className='button primary';queueButton.id='delivery-open';queueButton.textContent='导出清单 · 0';document.querySelector('.header-actions').append(queueButton);
 document.getElementById('download').textContent='下载当前纯背景';
 document.getElementById('pack').hidden=true;
 const library=document.createElement('dialog');library.className='delivery-dialog';library.id='copy-library';
 library.innerHTML='<header><div><h2>选择文字模板</h2><p>沿用当前背景，预览排版与高亮位置。</p></div><button class="button" data-close>关闭</button></header><div class="library-filters"><label>版本后缀 <select id="copy-suffix"><option value="numeric">数字 · 2.5</option><option value="english">英文 · 原稿后缀</option><option value="mini">英文 · Mini</option></select></label><span id="library-context"></span></div><nav class="copy-library-categories" aria-label="文字模板分类"></nav><div class="copy-library-grid"></div>';
 const queue=document.createElement('dialog');queue.className='delivery-dialog';queue.id='delivery-queue';
 queue.innerHTML='<header><div><h2>导出清单 <span id="delivery-count"></span></h2><p>每张保留加入时的背景、文案与配色，可返回单张继续编辑。</p></div><button class="button" data-close>继续编辑</button></header><div class="delivery-controls"><label><input type="checkbox" id="delivery-all"> 全选</label><label>导出内容 <select id="delivery-mode"><option value="composite">带文字成图</option><option value="background">纯背景</option></select></label><span id="delivery-selected"></span><button class="button primary" id="delivery-export">导出所选 ZIP</button></div><div class="delivery-grid"></div><footer class="delivery-footer"><p class="delivery-footnote">清单保存在当前浏览器，可稍后继续。每张使用加入时的导出倍率。</p><div class="delivery-footer-actions"><button class="button" id="delivery-clear" disabled>一键清空</button><button class="button" id="delivery-undo-clear" hidden>撤销清空</button></div></footer>';
 const zoom=document.createElement('dialog');zoom.className='delivery-dialog delivery-zoom';zoom.innerHTML='<header><h2>成图预览</h2><button class="button" data-close>关闭</button></header><img alt="所选成图预览">';
 document.body.append(library,queue,zoom);
 for(const dialog of [library,queue,zoom]){dialog.querySelector('[data-close]').onclick=()=>dialog.close();dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});}
 const transaction=(mode,fn)=>new Promise((resolve,reject)=>{if(!db)return reject(new Error('浏览器暂时无法保存导出清单'));const tx=db.transaction('items',mode),request=fn(tx.objectStore('items'));tx.oncomplete=()=>resolve(request?.result);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);});
 const ready=(async()=>{try{db=await new Promise((resolve,reject)=>{const req=indexedDB.open('gradient-export-queue-v1',1);req.onupgradeneeded=()=>req.result.createObjectStore('items',{keyPath:'id'});req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});const saved=await transaction('readonly',s=>s.getAll());for(const item of saved){items.set(item.id,item);selected.add(item.id);}sync();}catch(e){console.warn(e);queue.querySelector('.delivery-footnote').textContent='浏览器存储暂不可用，本次清单刷新后会丢失，请及时导出。';}})();
 window.gradientDeliveryReady=ready;
 const objectUrl=blob=>{const url=URL.createObjectURL(blob);urls.push(url);return url;};
 function sync(){
  scheduleStrip();
  queueButton.textContent=`导出清单 · ${items.size}`;
  document.getElementById('delivery-add').textContent=busy?'正在保存…':editing?'更新这张成图':'加入导出清单';document.getElementById('delivery-add').disabled=busy;document.getElementById('delivery-cancel').hidden=!editing;
 }
 function backgroundThumbnail(){const c=document.createElement('canvas');render(c,state.scene,1);const small=document.createElement('canvas');small.width=600;small.height=Math.max(1,600*c.height/c.width);small.getContext('2d').drawImage(c,0,0,small.width,small.height);return small.toDataURL();}
 // Lay out foregrounds at their design size, then shrink the entire artboard.
 // This preserves baselines and badges even in very short banner thumbnails.
 const thumbnailObserver=new ResizeObserver(entries=>{for(const {target,contentRect}of entries){const art=target.querySelector('.copy-preview-artboard');if(art)art.style.transform=`scale(${contentRect.width/Number(art.dataset.designWidth)})`;}});
 function appendThumbnail(stage,id,suffix){
  const [w,h]=scenes[state.scene].size,art=document.createElement('div');art.className='copy-preview-artboard';art.dataset.designWidth=w;art.style.width=w+'px';art.style.height=h+'px';
  const overlay=copy.preview(id,suffix);if(overlay)art.append(overlay);stage.append(art);thumbnailObserver.observe(stage);
 }
 function releaseThumbnails(root){for(const stage of root.querySelectorAll('.copy-mini-stage'))thumbnailObserver.unobserve(stage);}
 let stripSignature='',stripPending=false,stripBackground='',backgroundTimer;
 const strip=row.querySelector('.copy-template-strip');
 function scheduleStrip(){
  if(stripPending)return;stripPending=true;
  requestAnimationFrame(()=>{stripPending=false;drawStrip();});
 }
 function drawStrip(){
  const signature=JSON.stringify([state.brand,state.scene,window.gradientFeaturedExportInfo?.()?.id,copy.captureScene()]);
  if(signature===stripSignature)return;stripSignature=signature;
  const scroll=strip.scrollLeft,fragment=document.createDocumentFragment();
  for(const [id,name]of copy.list()){
   const card=document.createElement('button');card.type='button';card.className='copy-option copy-inline-option';card.dataset.preset=id;card.setAttribute('aria-label',name);card.setAttribute('aria-pressed',String(copy.current()===id));card.title=name+' · 点击切换';
   const viewport=document.createElement('div');viewport.className='copy-inline-viewport';
   const stage=document.createElement('div');stage.className='copy-mini-stage';const [w,h]=scenes[state.scene].size;stage.style.width=Math.min(128,64*w/h)+'px';stage.style.aspectRatio=w+' / '+h;stage.style.backgroundImage=stripBackground?`url("${stripBackground}")`:'';
   appendThumbnail(stage,id,copy.suffix());viewport.append(stage);
   const caption=document.createElement('span');caption.textContent=name;card.append(viewport,caption);
   card.onclick=()=>{copy.choose(id,copy.suffix());sync();fit();};fragment.append(card);
  }
  releaseThumbnails(strip);strip.replaceChildren(fragment);strip.scrollLeft=scroll;
 }
 function refreshStripBackground(){
  if(!canvas.width||!canvas.height)return;
  const small=document.createElement('canvas');small.width=Math.min(400,canvas.width);small.height=Math.max(1,Math.round(small.width*canvas.height/canvas.width));small.getContext('2d').drawImage(canvas,0,0,small.width,small.height);stripBackground=small.toDataURL();
  for(const stage of strip.querySelectorAll('.copy-mini-stage'))stage.style.backgroundImage=`url("${stripBackground}")`;
 }
 const previousRender=render;render=function(...args){const result=previousRender(...args);if(!args[0]||args[0]===canvas){clearTimeout(backgroundTimer);backgroundTimer=setTimeout(refreshStripBackground,120);}return result;};
 let libraryBackground='',category='all';
 const categoryFor=id=>['short','five','six','shortOnly','fiveOnly'].includes(id)?'single':['double','offer'].includes(id)?'double':['discount','price','floor'].includes(id)?'price':'source';
 function drawLibrary(){
  const nav=library.querySelector('.copy-library-categories');nav.replaceChildren();
  for(const [id,name] of [['all','全部'],['single','单行'],['double','双行'],['price','折扣与价格']]){const b=document.createElement('button');b.className='chip'+(category===id?' active':'');b.textContent=name;b.onclick=()=>{category=id;drawLibrary();};nav.append(b);}
  const grid=library.querySelector('.copy-library-grid');releaseThumbnails(grid);grid.replaceChildren();const suffix=document.getElementById('copy-suffix').value;
  document.getElementById('copy-suffix').disabled=!copy.supported();document.getElementById('library-context').textContent=brands[state.brand].name+' · '+scenes[state.scene].name;
  for(const [id,name]of copy.list(suffix).filter(([id])=>category==='all'||categoryFor(id)===category)){
   const card=document.createElement('button');card.type='button';card.className='copy-option';card.dataset.preset=id;card.setAttribute('aria-label',name);card.setAttribute('aria-pressed',String(copy.current()===id));
   const stage=document.createElement('div');stage.className='copy-mini-stage';stage.style.aspectRatio=scenes[state.scene].size.join(' / ');stage.style.backgroundImage=`url("${libraryBackground}")`;appendThumbnail(stage,id,suffix);const caption=document.createElement('span');caption.textContent=name;card.append(stage,caption);
   card.onclick=()=>{copy.choose(id,suffix);sync();library.close();fit();};grid.append(card);
  }
 }
 document.getElementById('copy-library-open').onclick=()=>{category='all';libraryBackground=backgroundThumbnail();document.getElementById('copy-suffix').value=copy.suffix();drawLibrary();library.showModal();};
 document.getElementById('copy-suffix').onchange=drawLibrary;
 function captureSnapshot(){return {state:clone(state),profiles:clone(fieldProfiles),adapter:clone(window.gradientBatchAdapters?.[state.template]?.get()||null),featured:clone(window.gradientFeaturedExportInfo?.()||null),copy:copy.captureScene()};}
 async function add(){
  if(busy)return;await ready;if(!editing&&items.size>=40){toast('清单最多保存 40 张，请先导出或移除部分成图');return;}
  busy=true;sync();
  try{
   const snapshot=captureSnapshot(),spec=copy.resolved(),sc=scenes[state.scene],size=[...sc.size],scale=state.exportScale||3;
   const meta={brand:state.brand,brandName:brands[state.brand].name,scene:state.scene,sceneName:sc.name,preset:copy.list().find(([id])=>id===copy.current())?.[1]||'设计稿',backgroundName:snapshot.featured?.name||templates.find(([id])=>id===state.template)?.[1]||state.template,size,scale};
   const bg=document.createElement('canvas');render(bg,state.scene,scale);
   const composite=await window.gradientComposeCopy(bg,spec);
   const [background,artwork]=await Promise.all([canvasBlob(bg),canvasBlob(composite)]);
   const entry={id:editing||crypto.randomUUID(),createdAt:items.get(editing)?.createdAt||Date.now(),updatedAt:Date.now(),...meta,snapshot,background,artwork};
   if(db)await transaction('readwrite',s=>s.put(entry));items.set(entry.id,entry);selected.add(entry.id);editing=null;toast('已加入导出清单，继续切换场景或文案即可添加下一张');
  }catch(e){console.error(e);toast('保存失败：'+e.message);}finally{busy=false;sync();}
 }
 document.getElementById('delivery-add').onclick=add;
 document.getElementById('delivery-cancel').onclick=()=>{editing=null;sync();};
 function updateSelection(){const count=[...selected].filter(id=>items.has(id)).length;document.getElementById('delivery-selected').textContent=`已选 ${count} / ${items.size} 张`;const all=document.getElementById('delivery-all');all.checked=items.size>0&&count===items.size;all.indeterminate=count>0&&count<items.size;document.getElementById('delivery-export').disabled=!count;document.getElementById('delivery-clear').disabled=busy||!items.size;const undo=document.getElementById('delivery-undo-clear');undo.hidden=!cleared;undo.disabled=busy;}
 function restore(entry){
  if(entry.snapshot.featured&&!window.gradientFeaturedHasAsset?.(entry.snapshot.featured.id)){toast('原背景图片尚未加载或已被移除，清单成图仍可导出');return false;}
  if(entry.scene?.startsWith('custom-'))window.gradientCustomSizes?.ensure(entry.size);
  const snap=clone(entry.snapshot);Object.keys(state).forEach(k=>delete state[k]);Object.assign(state,snap.state,{batchStatic:true});Object.keys(fieldProfiles).forEach(k=>delete fieldProfiles[k]);Object.assign(fieldProfiles,snap.profiles);
  window.gradientBatchAdapters?.[state.template]?.set(snap.adapter);
  for(const id of ['scale','angle','blur','sat','accent','noise','grainSize','exportScale']){const input=document.getElementById(id);if(input&&state[id]!=null)input.value=state[id];}
  syncValues();paintUI();
  if(snap.featured&&!window.gradientFeaturedRestoreComposition?.(snap.featured,state.scene)){toast('原背景图片已被移除，清单成图仍可导出');return false;}
  copy.restoreScene(snap.copy);fit();applyCopy();render();return true;
 }
 function drawQueue(){
  urls.splice(0).forEach(URL.revokeObjectURL);const grid=queue.querySelector('.delivery-grid');grid.replaceChildren();document.getElementById('delivery-count').textContent=`· ${items.size}`;
  if(!items.size){const empty=document.createElement('div');empty.className='delivery-empty';empty.textContent='还没有加入成图。回到画布，选好背景、场景和文字模板后，点击「加入导出清单」。';grid.append(empty);}
  for(const entry of [...items.values()].sort((a,b)=>a.createdAt-b.createdAt)){
   const card=document.createElement('article');card.className='delivery-card';card.dataset.item=entry.id;
   const heading=document.createElement('label'),check=document.createElement('input');check.type='checkbox';check.checked=selected.has(entry.id);check.setAttribute('aria-label','选择 '+entry.sceneName+' '+entry.preset);check.onchange=()=>{check.checked?selected.add(entry.id):selected.delete(entry.id);updateSelection();};heading.append(check,document.createTextNode(entry.brandName+' · '+entry.sceneName));
   const preview=document.createElement('button');preview.className='delivery-image';preview.setAttribute('aria-label','放大 '+entry.sceneName);const img=document.createElement('img');img.src=objectUrl(document.getElementById('delivery-mode').value==='background'?entry.background:entry.artwork);img.alt=entry.preset;preview.append(img);preview.onclick=()=>{zoom.querySelector('img').src=img.src;zoom.querySelector('h2').textContent=entry.sceneName+' · '+entry.preset;zoom.showModal();};
   const text=document.createElement('p');text.textContent=`${entry.preset} · ${entry.size.join('×')} · ${entry.scale}×`;
   const foot=document.createElement('div');foot.className='delivery-card-actions';const bg=document.createElement('span');bg.textContent=entry.backgroundName;
   const edit=document.createElement('button');edit.className='button';edit.textContent='编辑';edit.onclick=()=>{if(restore(entry)){editing=entry.id;queue.close();sync();}};
   const remove=document.createElement('button');remove.className='button';remove.textContent='移除';remove.onclick=async()=>{try{if(db)await transaction('readwrite',s=>s.delete(entry.id));items.delete(entry.id);selected.delete(entry.id);if(editing===entry.id)editing=null;sync();drawQueue();}catch{toast('移除失败，请重试');}};
   foot.append(bg,edit,remove);card.append(heading,preview,text,foot);grid.append(card);
  }updateSelection();
 }
 queueButton.onclick=async()=>{await ready;drawQueue();queue.showModal();};
 document.getElementById('delivery-clear').onclick=async()=>{
  await ready;if(busy||!items.size)return;
  busy=true;sync();updateSelection();
  try{const previous={entries:[...items.values()],selected:[...selected]};if(db)await transaction('readwrite',s=>s.clear());cleared=previous;items.clear();selected.clear();editing=null;toast('已清空导出清单，可在本页撤销');}
  catch(e){console.error(e);toast('清空失败，请重试');}
  finally{busy=false;sync();drawQueue();}
 };
 document.getElementById('delivery-undo-clear').onclick=async()=>{
  await ready;if(busy||!cleared)return;
  const previous=cleared,restoring=previous.entries.filter(entry=>!items.has(entry.id));
  if(items.size+restoring.length>40){toast('恢复后超过 40 张，请先移除部分成图');return;}
  busy=true;sync();updateSelection();
  try{if(db)await transaction('readwrite',s=>{for(const entry of restoring)s.put(entry);});for(const entry of restoring)items.set(entry.id,entry);for(const id of previous.selected)if(items.has(id))selected.add(id);cleared=null;toast('已恢复清空前的导出清单');}
  catch(e){console.error(e);toast('恢复失败，请重试');}
  finally{busy=false;sync();drawQueue();}
 };
 document.getElementById('delivery-mode').onchange=drawQueue;
 document.getElementById('delivery-all').onchange=e=>{selected.clear();if(e.target.checked)for(const id of items.keys())selected.add(id);drawQueue();};
 document.getElementById('delivery-export').onclick=async e=>{
  const button=e.currentTarget,chosen=[...items.values()].filter(i=>selected.has(i.id)),mode=document.getElementById('delivery-mode').value;if(!chosen.length)return;button.disabled=true;button.textContent='正在打包…';
  try{const entries=[],manifest=[];for(const [i,entry]of chosen.entries()){
   const name=`${String(i+1).padStart(2,'0')}-${entry.brandName}-${entry.sceneName}-${entry.preset}-${entry.size.join('x')}@${entry.scale}x-${mode==='composite'?'成图':'背景'}.png`.replace(/[\\/:*?"<>|]/g,'_');
   entries.push({name,data:new Uint8Array(await (mode==='composite'?entry.artwork:entry.background).arrayBuffer())});manifest.push({file:name,brand:entry.brandName,scene:entry.sceneName,template:entry.preset,background:entry.backgroundName,logicalSize:entry.size,exportSize:entry.size.map(v=>v*entry.scale),scale:entry.scale});
  }entries.push({name:'导出清单.json',data:zipEncoder.encode(JSON.stringify({mode,files:manifest},null,2))});const blob=makeZip(entries),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`品牌素材-${mode==='composite'?'带文字':'纯背景'}-${chosen.length}张.zip`;a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);toast(`已导出 ${chosen.length} 张`);
  }catch(err){console.error(err);toast('打包失败，请重试');}finally{button.textContent='导出所选 ZIP';updateSelection();}
 };
 const previousApply=applyCopy;applyCopy=function(){previousApply();sync();};
 for(const container of ['brands','scenes','templates','featured-gallery'])document.getElementById(container)?.addEventListener('click',()=>{if(editing){const original=items.get(editing);if(original&&(original.brand!==state.brand||original.scene!==state.scene))editing=null;}sync();});
 library.addEventListener('close',()=>{releaseThumbnails(library);library.querySelector('.copy-library-grid').replaceChildren();});
 new MutationObserver(scheduleStrip).observe(frame,{childList:true});
 sync();backgroundTimer=setTimeout(refreshStripBackground,120);
})();
