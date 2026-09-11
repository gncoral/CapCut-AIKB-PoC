/* Local raster templates. Original pixels stay immutable; each resource gets its own composition. */
(()=>{
 const KEY='featuredImage', STORAGE='gradient-featured-layouts-v1';
 fieldProfiles[KEY]=JSON.parse(JSON.stringify(fieldProfiles.soft));
 const assets=new Map(),layouts=new Map();let tab='generated',lastTemplate=state.template,db=null;
 try{for(const [k,v] of Object.entries(JSON.parse(localStorage.getItem(STORAGE)||'{}')))layouts.set(k,v);}catch{}
 const builtin={id:'dreamina-soft-curtain',name:'柔光织幕',brand:'dreamina',url:'./gradient-assets/featured/dreamina-soft-curtain.png',builtin:true};
 const active=()=>state.template===KEY;
 const current=()=>assets.get(state.featuredId);
 const layoutKey=(asset,scene)=>[asset.id,state.brand,scene].join(':');
 const templateNames=['浮光微澜','云间漫步','轻雾流纱','晨曦碎影','微风拂幕','梦境回声','光影涟漪','云朵来信','柔光漫游','雾里拾光','流光絮语','暮色轻舞','晴空织梦','浮云掠影','星河慢调','薄雾轻歌','风与云间','微光序曲','清晨余韵','云海漫映','光的褶皱','梦里浮游','时光轻漾','雾色回旋','流影成诗','天光漫卷','云端絮语','晨光轻叠','风中织影','光晕来信','浮梦轻纱','微澜序章'];
 function assignName(id,used){
  let hash=2166136261;for(const ch of id)hash=Math.imul(hash^ch.charCodeAt(0),16777619)>>>0;
  for(let n=0;;n++){
   const candidate=templateNames[(hash+n)%templateNames.length]+(n<templateNames.length?'':' '+String(Math.floor(n/templateNames.length)+1).padStart(2,'0'));
   if(!used.has(candidate)){used.add(candidate);return candidate;}
  }
 }
 function defaults(asset,scene){
  const strip=scenes[scene].size[0]/scenes[scene].size[1]>12;
  return {mode:strip?'left':'full',fit:'stretch',zoom:100,x:50,y:50,flip:strip,span:26,feather:48,clean:strip?0:35,noise:0,base:asset.brand==='pippit'?'#958CFA':strip?'#13A9F5':'#62D7FC'};
 }
 function settings(asset,scene){return {...defaults(asset,scene),...layouts.get(layoutKey(asset,scene))};}
 function save(){try{localStorage.setItem(STORAGE,JSON.stringify(Object.fromEntries(layouts)));}catch{toast('调整暂未保存，浏览器存储空间不足');}}
 const shelf=document.querySelector('.workspace-shelf'),generated=document.querySelector('.templates'),batch=document.querySelector('#gradient-batch');
 const tabs=document.createElement('div');tabs.className='featured-tabs';tabs.setAttribute('role','group');tabs.setAttribute('aria-label','背景来源');
 tabs.innerHTML='<button class="button" data-source="generated">生成背景</button><button class="button" data-source="featured">精选模板</button>';
 shelf.prepend(tabs);
 const gallery=document.createElement('section');gallery.id='featured-gallery';gallery.hidden=true;
 gallery.innerHTML='<div class="featured-head"><strong>精选模板</strong><button class="button" id="featured-upload">上传图片</button></div><input id="featured-file" type="file" accept="image/png,image/jpeg,image/webp,image/avif" multiple hidden><p class="help">保留成图原色。上传图片仅保存在当前浏览器；每个尺寸单独记住构图。</p><div class="featured-grid"></div><p class="help" id="featured-empty"></p>';
 tabs.after(gallery);
 const panel=document.createElement('section');panel.id='featured-settings';panel.className='group workspace-effects';panel.hidden=true;
 document.querySelector('.workspace-tabs').after(panel);
 const style=document.createElement('style');style.textContent=`
 .featured-tabs{display:flex;gap:8px;margin-bottom:12px}.featured-tabs .active{background:#f5f6f8;color:#111}
 #featured-gallery[hidden],#featured-settings[hidden]{display:none!important}.featured-head{display:flex;align-items:center;justify-content:space-between;gap:12px;font-size:12px}
 .featured-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:10px;margin:10px 0}.featured-item{min-width:0}.featured-card{width:100%;background:#15171d;border:1px solid #343741;border-radius:10px;padding:7px;text-align:left;color:inherit;cursor:pointer}.featured-card.active{border-color:white}.featured-card img{width:100%;height:62px;object-fit:cover;border-radius:5px;display:block;margin-bottom:6px}.featured-card span{font-size:11px;overflow-wrap:anywhere}.featured-remove{font-size:10px;background:none;color:#aaa;border:0;padding:6px;cursor:pointer}
 #featured-settings label{display:grid;gap:7px;font-size:11px;margin:13px 0}#featured-settings select{width:100%;padding:8px;border-radius:7px;background:#191b22;color:white;border:1px solid #343741}#featured-settings input[type=range]{width:100%;accent-color:#fff}#featured-settings input[type=color]{width:100%;height:30px;border:0;background:none}.featured-check{display:flex!important;align-items:center}.featured-check input{margin:0}.featured-row{display:flex;justify-content:space-between;gap:8px}.featured-actions{display:flex;gap:8px;flex-wrap:wrap}
 body[data-featured-active="true"] [data-field-anchor],body[data-featured-active="true"] [data-color-anchor],body[data-featured-active="true"] #curve-toggle,body[data-featured-active="true"] #curve-overlay{display:none!important}
 body[data-featured-active="true"] .side .workspace-effects:not(#featured-settings){display:none!important}
 `;document.head.append(style);
 function drawGallery(){
  const grid=gallery.querySelector('.featured-grid');grid.replaceChildren();
  for(const asset of assets.values()){
   if(asset.brand!==state.brand)continue;
   const item=document.createElement('div');item.className='featured-item';
   const card=document.createElement('button');card.className='featured-card'+(active()&&state.featuredId===asset.id?' active':'');card.setAttribute('aria-label','使用精选模板 '+asset.name);
   const img=document.createElement('img');img.src=asset.url;img.alt='';const label=document.createElement('span');label.textContent=asset.name;card.append(img,label);card.onclick=()=>select(asset);item.append(card);
   if(!asset.builtin){const remove=document.createElement('button');remove.className='featured-remove';remove.textContent='移除';remove.setAttribute('aria-label','移除 '+asset.name);remove.onclick=async()=>{
    try{if(db)await transaction('readwrite',store=>store.delete(asset.id));}catch{toast('移除失败，请重试');return;}
    assets.delete(asset.id);URL.revokeObjectURL(asset.url);for(const k of layouts.keys())if(k.startsWith(asset.id+':'))layouts.delete(k);save();
    if(active()&&state.featuredId===asset.id){state.template=lastTemplate;paintUI();fit();applyCopy();render();}drawGallery();
   };item.append(remove);}grid.append(item);
  }
  gallery.querySelector('#featured-empty').textContent=grid.children.length?'':'当前品牌还没有精选模板，可以上传 PNG、JPG、WebP 或 AVIF。';
 }
 function select(asset){
  if(!active())lastTemplate=state.template;
  state.template=KEY;state.featuredId=asset.id;state.batchStatic=true;tab='featured';
  window.gradientResetCandidateSelection?.();paintUI();fit();applyCopy();render();
 }
 function sync(){
  if(active()&&current()?.brand!==state.brand)state.template=lastTemplate;
  document.body.dataset.featuredActive=String(active());panel.hidden=!active();
  const ratio=document.querySelector('.ratio-note');if(ratio)ratio.textContent=active()?'精选成图 · 保留原图颜色':brands[state.brand].ratio;
  tabs.querySelectorAll('button').forEach(b=>{b.classList.toggle('active',b.dataset.source===tab);b.setAttribute('aria-pressed',String(b.dataset.source===tab));});
  generated.hidden=tab==='featured';batch.hidden=tab==='featured';gallery.hidden=tab!=='featured';
  if(active()){$$('.template').forEach(b=>b.classList.remove('active'));drawPanel();}
  drawGallery();
 }
 tabs.onclick=e=>{const b=e.target.closest('[data-source]');if(!b)return;tab=b.dataset.source;
  if(tab==='generated'&&active()){state.template=lastTemplate;state.batchStatic=false;paintUI();fit();applyCopy();render();}else sync();
 };
 function drawPanel(){
  const asset=current();if(!asset)return;const sc=scenes[state.scene],cfg=settings(asset,state.scene);
  panel.replaceChildren();const h=document.createElement('h3');h.textContent='图片构图';const note=document.createElement('p');note.className='help';note.textContent=asset.name+' · '+sc.name+' · '+sc.size.join(' × ');panel.append(h,note);
  const update=(key,value)=>{const next=settings(asset,state.scene);next[key]=value;layouts.set(layoutKey(asset,state.scene),next);save();render();};
  function selectField(label,key,options){const row=document.createElement('label');row.textContent=label;const input=document.createElement('select');input.setAttribute('aria-label',label);for(const [value,text]of options){const option=document.createElement('option');option.value=value;option.textContent=text;input.append(option);}input.value=cfg[key];input.onchange=()=>{update(key,input.value);drawPanel();};row.append(input);panel.append(row);}
  selectField('构图方式','mode',[['full','整图构图'],['left','重点色在左侧'],['right','重点色在右侧']]);
  selectField('图片适配','fit',[['stretch','适配画布（允许拉伸）'],['cover','等比裁切']]);
  function range(label,key,min,max){const row=document.createElement('label'),head=document.createElement('span');head.className='featured-row';const name=document.createElement('span');name.textContent=label;const value=document.createElement('b');value.textContent=cfg[key]+'%';head.append(name,value);const input=document.createElement('input');input.type='range';input.min=min;input.max=max;input.value=cfg[key];input.setAttribute('aria-label',label);input.oninput=()=>{value.textContent=input.value+'%';update(key,Number(input.value));};row.append(head,input);panel.append(row);}
  range('图片缩放','zoom',100,240);range('取景位置 · 横向','x',0,100);range('取景位置 · 纵向','y',0,100);
  const row=document.createElement('label');row.className='featured-check';const flip=document.createElement('input');flip.type='checkbox';flip.checked=cfg.flip;flip.setAttribute('aria-label','水平翻转');flip.onchange=()=>update('flip',flip.checked);row.append(flip,document.createTextNode('水平翻转'));panel.append(row);
  if(cfg.mode!=='full'){range('点缀占宽','span',10,65);range('边缘过渡','feather',10,90);}
  range('文字区纯净度','clean',0,100);
  range('噪点质感','noise',0,100);
  const baseRow=document.createElement('label');baseRow.textContent='留白底色';const color=document.createElement('input');color.type='color';color.value=cfg.base;color.setAttribute('aria-label','留白底色');color.oninput=()=>update('base',color.value);baseRow.append(color);panel.append(baseRow);
  const scaleRow=document.createElement('label');scaleRow.textContent='导出倍率';const scale=document.createElement('select');scale.setAttribute('aria-label','精选模板导出倍率');for(const n of [1,2,3]){const o=document.createElement('option');o.value=n;o.textContent=n+'×';scale.append(o);}scale.value=state.exportScale;scale.onchange=()=>{state.exportScale=Number(scale.value);document.getElementById('exportScale').value=scale.value;syncValues();fit();};scaleRow.append(scale);panel.append(scaleRow);
  const reset=document.createElement('button');reset.className='button';reset.textContent='恢复此尺寸构图';reset.onclick=()=>{layouts.delete(layoutKey(asset,state.scene));save();drawPanel();render();};panel.append(reset);
  const help=document.createElement('p');help.className='help';help.textContent='取景位置在缩放或裁切后生效。纯净度用留白底色柔和覆盖文字区域；噪点为黑白细颗粒，0% 关闭。各尺寸独立保存，套图导出沿用各自设置。';panel.append(help);
 }
 function paintImage(context,asset,cfg,w,h){
  const image=asset.image,iw=image.naturalWidth,ih=image.naturalHeight;
  let sw=iw/(cfg.zoom/100),sh=ih/(cfg.zoom/100);
  if(cfg.fit==='cover'){const aspect=w/h;if(sw/sh>aspect)sw=sh*aspect;else sh=sw/aspect;}
  const sx=(iw-sw)*cfg.x/100,sy=(ih-sh)*cfg.y/100;
  context.save();if(cfg.flip){context.translate(w,0);context.scale(-1,1);}
  context.drawImage(image,sx,sy,sw,sh,0,0,w,h);context.restore();
 }
 // Half-logical-pixel, high-frequency monochrome grain. Apply after image resampling
 // so grain stays crisp; never blur or sharpen the uploaded source itself.
 let grainTile;
 function paintGrain(context,strength,w,h,factor){
  const amount=Math.max(0,Math.min(100,Number(strength)||0))/100;if(!amount)return;
  const side=512,mask=side-1;
  if(!grainTile){
   const white=new Float32Array(side*side);grainTile=new Float32Array(side*side);let seed=91827;
   for(let i=0;i<white.length;i++){
    seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;
    white[i]=(seed>>>0)/4294967295*2-1;
   }
   // Suppress broad clumps, keeping the small light/dark flecks of print grain.
   for(let y=0;y<side;y++)for(let x=0;x<side;x++){
    const i=y*side+x,neighbors=(white[y*side+((x-1)&mask)]+white[y*side+((x+1)&mask)]+white[((y-1)&mask)*side+x]+white[((y+1)&mask)*side+x])*.25;
    grainTile[i]=(white[i]-neighbors)*.8;
   }
  }
  const pixels=context.getImageData(0,0,w,h),data=pixels.data,frequency=2/factor;
  const columns=new Uint16Array(w);for(let x=0;x<w;x++)columns[x]=Math.floor((x+.5)*frequency)&mask;
  for(let y=0;y<h;y++){
   const row=(Math.floor((y+.5)*frequency)&mask)*side;
   for(let x=0,i=y*w*4;x<w;x++,i+=4){
    const delta=grainTile[row+columns[x]]*amount*36;
    data[i]+=delta;data[i+1]+=delta;data[i+2]+=delta;
   }
  }
  context.putImageData(pixels,0,0);
 }
 function compose(asset,cfg,w,h,factor){
  const raster=document.createElement('canvas');raster.width=w;raster.height=h;
  const c=raster.getContext('2d');c.imageSmoothingEnabled=true;c.imageSmoothingQuality='high';
  c.fillStyle=cfg.base;c.fillRect(0,0,w,h);
  if(cfg.mode==='full')paintImage(c,asset,cfg,w,h);
  else{
   const layer=document.createElement('canvas');layer.width=Math.max(1,Math.round(w*cfg.span/100));layer.height=h;
   const lc=layer.getContext('2d');paintImage(lc,asset,cfg,layer.width,h);
   const fade=layer.width*cfg.feather/100;
   const mask=cfg.mode==='left'?lc.createLinearGradient(layer.width-fade,0,layer.width,0):lc.createLinearGradient(fade,0,0,0);
   mask.addColorStop(0,'rgba(0,0,0,1)');mask.addColorStop(1,'rgba(0,0,0,0)');
   lc.globalCompositeOperation='destination-in';lc.fillStyle=mask;lc.fillRect(0,0,layer.width,h);
   c.drawImage(layer,cfg.mode==='right'?w-layer.width:0,0);
  }
  if(cfg.clean>0){
   c.save();c.translate(w*.5,h*.5);c.scale(w*.62,h*.44);
   const gradient=c.createRadialGradient(0,0,0,0,0,1);
   const rgb=[1,3,5].map(i=>parseInt(cfg.base.slice(i,i+2),16)).join(',');
   gradient.addColorStop(0,'rgba('+rgb+','+cfg.clean/100+')');
   gradient.addColorStop(.45,'rgba('+rgb+','+cfg.clean/100+')');
   gradient.addColorStop(1,'rgba('+rgb+',0)');c.fillStyle=gradient;c.fillRect(-1,-1,2,2);c.restore();
  }
  paintGrain(c,cfg.noise,w,h,factor);
  return raster;
 }
 const originalRender=render;
 render=function(target=canvas,sceneKey=state.scene,scale=1){
  if(!active())return originalRender(target,sceneKey,scale);
  const asset=current();if(!asset?.image)return;
  const sc=scenes[sceneKey],cfg=settings(asset,sceneKey),factor=target===canvas&&scale===1?2:scale;
  const w=Math.max(1,Math.round(sc.size[0]*factor)),h=Math.max(1,Math.round(sc.size[1]*factor));
  if(target.width!==w)target.width=w;if(target.height!==h)target.height=h;
  const c=target.getContext('2d');c.clearRect(0,0,w,h);c.drawImage(compose(asset,cfg,w,h,factor),0,0);
  if(target===canvas)updateContrast();
 };
 const originalPaint=paintUI;paintUI=function(){if(active()&&current()?.brand!==state.brand)state.template=lastTemplate;originalPaint();sync();};
 const originalApply=applyCopy;applyCopy=function(){originalApply();sync();};
 for(const id of ['templates','brands','scenes','scene-list'])document.getElementById(id)?.addEventListener('click',()=>{if(id==='templates')tab='generated';sync();});
 const oldReset=document.getElementById('curve-reset').onclick;document.getElementById('curve-reset').onclick=e=>{if(!active())return oldReset(e);layouts.delete(layoutKey(current(),state.scene));save();window.gradientResetCopy?.();state.exportScale=3;document.getElementById('exportScale').value=3;syncValues();fit();drawPanel();render();toast('已恢复此尺寸构图、文案与字色');};
 window.gradientFeaturedExportInfo=()=>active()&&current()?{name:current().name,id:current().id,source:'精选模板',originalSize:[current().image.naturalWidth,current().image.naturalHeight],composition:Object.fromEntries(gradientSceneEntries().map(([key])=>[key,settings(current(),key)]))}:null;
 function transaction(mode,action){return new Promise((resolve,reject)=>{const tx=db.transaction('images',mode),request=action(tx.objectStore('images'));tx.oncomplete=()=>resolve(request?.result);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);});}
 async function load(asset){const image=new Image();image.src=asset.url;await image.decode();asset.image=image;assets.set(asset.id,asset);return asset;}
 gallery.querySelector('#featured-upload').onclick=()=>gallery.querySelector('input').click();
 gallery.querySelector('input').onchange=async e=>{
  const files=[...e.target.files],brand=state.brand;const button=gallery.querySelector('#featured-upload');button.disabled=true;let last;
  for(const file of files){
   if(!['image/png','image/jpeg','image/webp','image/avif'].includes(file.type)||file.size>25*1024*1024){toast('请使用不超过 25 MB 的 PNG、JPG、WebP 或 AVIF');continue;}
   const id=crypto.randomUUID(),generatedName=assignName(id,new Set([...assets.values()].map(a=>a.name)));
   const record={id,name:file.name.replace(/\.[^.]+$/,''),originalName:file.name,generatedName,brand,blob:file};const url=URL.createObjectURL(file);
   try{const asset=await load({...record,name:generatedName,url});try{if(db)await transaction('readwrite',store=>store.put(record));else toast('已导入，本次浏览可用；浏览器存储暂不可用');}catch{toast('已导入，但存储不足，刷新后需重新上传');}last=asset;}catch{URL.revokeObjectURL(url);toast('图片无法读取，请换一张图片');}
  }
  e.target.value='';button.disabled=false;if(last&&state.brand===brand)select(last);else drawGallery();
 };
 async function init(){
  try{await load(builtin);}catch{toast('精选模板图片加载失败');}
  try{
   const response=await fetch('./gradient-assets/featured/publisher/manifest.json');
   if(!response.ok)throw new Error('Publisher library unavailable');
   const records=await response.json();
   await Promise.all(records.map(async r=>{try{await load({id:r.id,name:r.name,originalName:r.originalName,brand:r.brand,builtin:true,url:'./gradient-assets/featured/publisher/'+encodeURIComponent(r.file)});}catch{toast('部分随包模板图片加载失败');}}));
  }catch{toast('随包精选图库加载失败，请通过本地预览网址打开');}
  try{
   db=await new Promise((resolve,reject)=>{const r=indexedDB.open('gradient-featured-v1',1);r.onupgradeneeded=()=>r.result.createObjectStore('images',{keyPath:'id'});r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
   const records=await transaction('readonly',store=>store.getAll());
   const used=new Set([...assets.values()].map(a=>a.name).concat(records.map(r=>r.generatedName).filter(Boolean))),renamed=[];
   for(const r of records)if(!r.generatedName){
    r.originalName=r.originalName||r.blob?.name||r.name;r.generatedName=assignName(r.id,used);renamed.push(r);
   }
   if(renamed.length)try{await transaction('readwrite',store=>{for(const r of renamed)store.put(r);});}catch{toast('图片已加载，模板名称暂未保存');}
   for(const r of records){if(assets.has(r.id))continue;try{await load({...r,name:r.generatedName,url:URL.createObjectURL(r.blob)});}catch{}}
  }catch{}
  if(new URLSearchParams(location.search).get('featured')==='1'&&!state.featuredId&&assets.has(builtin.id)&&state.brand==='dreamina')select(assets.get(builtin.id));else sync();
 }
 sync();init();
})();
