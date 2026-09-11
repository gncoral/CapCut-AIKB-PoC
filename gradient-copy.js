/* Scene-specific Figma foreground. Background renderers and downloads stay independent. */
(()=>{
 const originals=new Map(gradientCopyLayouts.map(x=>[`${x.brand}:${x.scene}`,x]));
 const edits=new Map(),colorEdits=new Map();
 const palettes={dreamina:[['黑','#000000'],['白','#FFFFFF'],['黄','#FFEF61'],['橙','#FF6A00']],pippit:[['黑','#000000'],['白','#FFFFFF'],['紫','#7040FF']]};
 const chosenColor=item=>colorEdits.get(key())?.[item.id];
 function textPaint(item,seg){
  const hex=chosenColor(item);if(!hex)return seg.fills?.find(p=>p.type==='SOLID'&&p.visible!==false);
  return {type:'SOLID',opacity:1,color:{r:parseInt(hex.slice(1,3),16)/255,g:parseInt(hex.slice(3,5),16)/255,b:parseInt(hex.slice(5,7),16)/255}};
 }
 const key=()=>`${state.brand}:${state.scene}`;
 const layout=()=>originals.get(key());
 const rgba=p=>{const c=p?.color;return c?`rgba(${Math.round(c.r*255)},${Math.round(c.g*255)},${Math.round(c.b*255)},${p.opacity??1})`:'transparent'};
 const weight=font=>font?.variationSettings?.wght||(/semibold|demibold/i.test(font?.style)?600:/bold/i.test(font?.style)?700:/medium/i.test(font?.style)?500:/light/i.test(font?.style)?300:400);
 const family=font=>`"${font?.family||'PingFang SC'}",${font?.family==='Byte Sans'?'"CapCut Sans Text",':font?.family?.includes('Serif')?'"Songti SC",':font?.family?.includes('YaShiSong')?'"Songti SC",':''}"PingFang SC",sans-serif`;
 function content(item){return edits.get(key())?.[item.id]??item.text}
 function makeLayer(){
  const spec=layout();if(!spec)return null;
  const layer=document.createElement('div');layer.className='figma-copy-layer';layer.dataset.copyKey=key();layer.setAttribute('aria-label',`${scenes[state.scene].name}设计稿文案`);
  for(const item of spec.items){
   const isSeedanceSymbol=item.id==='I338:56454;338:56476';
   const el=document.createElement(item.type==='svg'||isSeedanceSymbol?'img':'div');el.className=`figma-copy-${item.type}`;el.dataset.copyNode=item.id;
   Object.assign(el.style,{left:item.x/spec.w*100+'%',top:item.y/spec.h*100+'%',width:item.w/spec.w*100+'%',height:item.h/spec.h*100+'%'});
   if(isSeedanceSymbol){el.src='./gradient-assets/seedance-symbol.png';el.alt='Seedance 标志';el.className='figma-copy-symbol';el.style.objectFit='contain';}
   else if(item.type==='svg'){el.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(item.svg);el.alt='';}
   else if(item.type==='box'){
    const paints=item.fills||[];el.style.background=paints.length?rgba(paints.at(-1)):'transparent';
    el.style.borderRadius=(item.radius||0)/spec.w*100+'cqw';el.style.opacity=item.opacity??1;
    if(item.strokes?.length)el.style.border=`${(item.strokeWidth||1)/spec.w*100}cqw solid ${rgba(item.strokes.at(-1))}`;
   }else{
    const line=document.createElement('div');line.className='figma-copy-lines';el.style.textAlign=item.align.toLowerCase();el.style.justifyContent=item.valign==='BOTTOM'?'flex-end':item.valign==='CENTER'?'center':'flex-start';
    const text=content(item),changed=text!==item.text;
    // Keep the source rich-text spans and explicit line breaks. Edited copy keeps its emphasis positions.
    const segments=changed?item.segments.map((s,i)=>({...s,text:text.slice(s.start,i===item.segments.length-1?undefined:s.end)})):item.segments;
    for(const seg of segments){
     const span=document.createElement('span');span.textContent=seg.text;
     Object.assign(span.style,{fontFamily:family(seg.font),fontWeight:weight(seg.font),fontStyle:/italic/i.test(seg.font?.style)?'italic':'normal',fontSize:seg.size/spec.w*100+'cqw',color:rgba(textPaint(item,seg))});
     span.style.letterSpacing=(seg.spacing.unit==='PERCENT'?seg.size*seg.spacing.value/100:seg.spacing.value||0)/spec.w*100+'cqw';
     const lh=seg.line.unit==='PIXELS'?seg.line.value:seg.line.unit==='PERCENT'?seg.size*seg.line.value/100:item.h/Math.max(1,item.text.split('\n').length);
     span.style.lineHeight=lh/spec.w*100+'cqw';
     if(seg.decoration==='UNDERLINE')span.style.textDecoration='underline';
     line.append(span);
    }
    el.append(line);
    if(!changed&&item.text==='Seedance'&&item.segments[0].font.family==='Byte Sans'){
     line.style.visibility='hidden';const mark=document.createElement('span');mark.setAttribute('role','img');mark.setAttribute('aria-label','Seedance');mark.className='figma-seedance-mark';
     mark.style.backgroundColor=chosenColor(item)||'#000000';mark.style.mask='url("./gradient-assets/seedance-wordmark.svg") center / 100% 100% no-repeat';mark.style.webkitMask=mark.style.mask;
     const scale=item.segments[0].size/20;
     Object.assign(mark.style,{position:'absolute',left:.796875*scale/item.w*100+'%',top:(6.51953125*scale+(item.h-28*scale)/2)/item.h*100+'%',width:98.15234375*scale/item.w*100+'%',height:14.98046875*scale/item.h*100+'%'});el.append(mark);
    }
   }
   layer.append(el);
  }
  return layer;
 }
 let fitPending=0;
 function queueFit(){if(fitPending)return;fitPending=requestAnimationFrame(()=>{fitPending=0;document.querySelectorAll('.figma-copy-text').forEach(el=>{const line=el.querySelector('.figma-copy-lines');line.style.transform='';const width=el.clientWidth;if(!width||!line.scrollWidth)return;const scale=Math.min(1,width/line.scrollWidth);line.style.transform=`scaleX(${scale})`;line.style.transformOrigin=el.style.textAlign==='center'?'center':el.style.textAlign==='right'?'right':'left';});});}
 function updateAll(){
  const main=frame.querySelector('.figma-copy-layer');const fresh=makeLayer();if(main)main.replaceWith(fresh);else if(fresh)frame.append(fresh);
  document.querySelectorAll('.batch-preview').forEach(stage=>{stage.querySelector('.figma-copy-layer')?.remove();const l=makeLayer();if(l)stage.append(l);});queueFit();
  document.getElementById('copy-source-note').textContent='可逐项修改内容和字色，切换资源位保留本页修改。「原稿」保留设计稿多色排版。';
 }
 window.gradientCopyOverlay=stage=>{const layer=makeLayer();if(layer)stage.append(layer);queueFit();return Boolean(layer)};
 const group=document.getElementById('title-input').closest('.group');
 Array.from(group.children).filter(n=>n.tagName!=='H3'&&n.id!=='copy-source-note').forEach(n=>n.hidden=true);
 const editor=document.createElement('div');editor.className='figma-copy-editor';group.querySelector('h3').after(editor);
 const reset=document.createElement('button');reset.type='button';reset.className='button';reset.textContent='恢复设计稿文案与字色';group.append(reset);
 window.gradientResetCopy=()=>{edits.delete(key());colorEdits.delete(key());renderEditor();updateAll();updateContrast();};
 reset.onclick=window.gradientResetCopy;
 let editorKey='';
 function renderEditor(){
  const spec=layout();if(!spec)return;editorKey=key();editor.replaceChildren();
  const textItems=spec.items.filter(x=>x.type==='text');
  for(const [i,item]of textItems.entries()){
   const field=document.createElement('div');field.className='figma-copy-field';
   const label=document.createElement('span');label.textContent=item.text.length>22?item.text.slice(0,20).replace(/\n/g,' / ')+'…':item.text.replace(/\n/g,' / ')||`文字 ${i+1}`;
   const input=document.createElement('textarea');input.className='text-input';input.rows=Math.max(1,item.text.split('\n').length);input.value=content(item);input.dataset.copyInput=item.id;input.setAttribute('aria-label',label.textContent);
   input.oninput=()=>{const changes=edits.get(key())||{};changes[item.id]=input.value;edits.set(key(),changes);updateAll();updateContrast();};
   const colors=document.createElement('div');colors.className='figma-copy-colors';colors.setAttribute('role','group');colors.setAttribute('aria-label',label.textContent+'字色');
   for(const [name,hex]of [['原稿',null],...palettes[state.brand]]){
    const button=document.createElement('button');button.type='button';button.className='figma-copy-color';button.dataset.copyColor=hex||'source';button.title=hex?name+' '+hex:'恢复此项设计稿字色';button.setAttribute('aria-pressed',String((chosenColor(item)||null)===hex));
    if(hex){const chip=document.createElement('span');chip.style.backgroundColor=hex;chip.className='figma-color-chip';button.append(chip);}
    button.append(document.createTextNode(name));
    button.onclick=()=>{const changes=colorEdits.get(key())||{};if(hex)changes[item.id]=hex;else delete changes[item.id];colorEdits.set(key(),changes);colors.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));updateAll();updateContrast();};colors.append(button);
   }
   field.append(label,input,colors);editor.append(field);
  }
  document.getElementById('copy-source-note').textContent='按当前资源位的设计稿显示文案与排版；可逐项修改内容和字色，切换资源位保留本页修改。「原稿」保留原有多色排版。';
 }
 const oldContrast=updateContrast;
 updateContrast=function(){
  oldContrast();const spec=layout();if(!spec||!canvas.width||!canvas.height)return;
  let ratio=Infinity;const boxes=[];
  const blend=(base,paint)=>{const c=paint.color,a=paint.opacity??1;return base.map((v,i)=>v*(1-a)+[c.r,c.g,c.b][i]*255*a)};
  for(const item of spec.items){
   if(item.type==='box'){boxes.push(item);continue;}if(item.type!=='text')continue;
   const paints=item.segments.map(s=>textPaint(item,s)).filter(Boolean);
   for(const ux of [.2,.5,.8])for(const uy of [.3,.7]){
    const x=item.x+item.w*ux,y=item.y+item.h*uy;
    const px=Math.max(0,Math.min(canvas.width-1,Math.round(x/spec.w*canvas.width))),py=Math.max(0,Math.min(canvas.height-1,Math.round(y/spec.h*canvas.height)));
    let bg=Array.from(ctx.getImageData(px,py,1,1).data).slice(0,3);
    for(const box of boxes)if(x>=box.x&&x<=box.x+box.w&&y>=box.y&&y<=box.y+box.h)for(const fill of box.fills||[])bg=blend(bg,{...fill,opacity:(fill.opacity??1)*(box.opacity??1)});
    for(const paint of paints)ratio=Math.min(ratio,cr(lum(...bg),lum(...blend(bg,paint))));
   }
  }
  if(!Number.isFinite(ratio))return;$('#ratio').textContent=ratio.toFixed(1)+' : 1';$('#advice').textContent='按当前字色评估';$('#grade').textContent=ratio>=4.5?'AA 通过':ratio>=3?'仅大字通过':'对比度不足';$('#score-dot').style.background=ratio>=4.5?'var(--ok)':ratio>=3?'var(--warn)':'var(--bad)';
 };
 const oldApply=applyCopy;applyCopy=function(){oldApply();if(editorKey!==key())renderEditor();updateAll();};
 const oldFit=fit;fit=function(){oldFit();if(editorKey!==key())renderEditor();updateAll();};
 const style=document.createElement('style');style.textContent=`
 @font-face{font-family:FZYaShiSongS;src:local('FZYASSS-L--GB1-0');font-weight:300}
 @font-face{font-family:FZYaShiSongS;src:local('FZYASSS-M--GB1-0');font-weight:500}
 .figma-copy-layer{position:absolute;inset:0;pointer-events:none;z-index:7;overflow:hidden}
 .figma-copy-layer>div,.figma-copy-layer>img{position:absolute;box-sizing:border-box}
 .figma-copy-text{display:flex;flex-direction:column;overflow:visible}
 .figma-copy-lines{width:100%;white-space:pre;line-height:0;font-synthesis:none}
 .figma-copy-lines span{font-kerning:normal}
 #frame>.mock{display:none!important}
 #frame.background-only>.figma-copy-layer,#frame.preview-off>.figma-copy-layer{display:none}
 .figma-copy-editor{display:grid;gap:12px;margin-bottom:12px}.figma-copy-field{display:grid;gap:6px}
 .figma-copy-field>span{font-size:10px;color:#a5a9b4;line-height:1.5}
 .figma-copy-field textarea{resize:vertical;min-height:36px;line-height:1.5;font-size:11px}
 .figma-copy-colors{display:flex;flex-wrap:wrap;gap:5px}
 .figma-copy-color{display:inline-flex;align-items:center;gap:5px;padding:5px 7px;border:1px solid #383b45;border-radius:7px;background:#191b22;color:#c8cbd3;font:inherit;font-size:11px;cursor:pointer}
 .figma-copy-color[aria-pressed="true"]{border-color:#a69aff;background:#302b47;color:#fff}
 .figma-copy-color:focus-visible{outline:2px solid #a69aff;outline-offset:2px}
 .figma-color-chip{width:12px;height:12px;border-radius:50%;border:1px solid #777;box-sizing:border-box}
 .workspace-copy>[hidden]{display:none!important}
 `;document.head.append(style);
 renderEditor();updateAll();updateContrast();document.fonts.ready.then(queueFit);
 const requested=new URLSearchParams(location.search).get('scene');
 if(requested&&gradientSceneEntries().some(([k])=>k===requested))document.querySelector(`#scenes [data-scene="${requested}"]`)?.click();
})();
