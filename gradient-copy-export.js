/* Canvas foreground export. Resolves the same typography and paints as the editor. */
(()=>{
 const images=new Map();
 function image(src){if(!images.has(src))images.set(src,new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=()=>{images.delete(src);reject(new Error('文字素材加载失败'));};i.src=src;}));return images.get(src);}
 const color=p=>p?.color?`rgba(${Math.round(p.color.r*255)},${Math.round(p.color.g*255)},${Math.round(p.color.b*255)},${p.opacity??1})`:'transparent';
 const font=s=>`${/italic/i.test(s.font?.style)?'italic ':''}${s.weight||400} ${s.size}px ${s.cssFont}`;
 const lineHeight=(s,item)=>s.line?.unit==='PIXELS'?s.line.value:s.line?.unit==='PERCENT'?s.size*s.line.value/100:item.h/Math.max(1,item.text.split('\n').length);
 const spacing=s=>s.spacing?.unit==='PERCENT'?s.size*s.spacing.value/100:s.spacing?.value||0;
 function setFont(c,s){c.font=font(s);c.letterSpacing=spacing(s)+'px';c.fontKerning='normal';c.textBaseline='alphabetic';}
 async function draw(c,spec){
  await Promise.all(spec.items.filter(i=>i.type==='text').flatMap(i=>i.segments.map(s=>document.fonts.load(font(s),s.text||'字'))));
  for(const item of spec.items){
   c.save();
   try{
    if(item.id==='I338:56454;338:56476'){c.drawImage(await image('./gradient-assets/seedance-symbol.png'),item.x,item.y,item.w,item.h);continue;}
    if(item.type==='svg'){c.drawImage(await image('data:image/svg+xml;charset=utf-8,'+encodeURIComponent(item.svg)),item.x,item.y,item.w,item.h);continue;}
    if(item.type==='box'){
     c.globalAlpha=item.opacity??1;c.beginPath();c.roundRect(item.x,item.y,item.w,item.h,item.radius||0);c.fillStyle=color(item.fills?.at(-1));c.fill();
     if(item.strokes?.length){const sw=item.strokeWidth||1;c.beginPath();c.roundRect(item.x+sw/2,item.y+sw/2,Math.max(0,item.w-sw),Math.max(0,item.h-sw),Math.max(0,(item.radius||0)-sw/2));c.strokeStyle=color(item.strokes.at(-1));c.lineWidth=sw;c.stroke();}continue;
    }
    if(item.glyph){
     const im=await image(item.glyph),tmp=document.createElement('canvas');tmp.width=Math.ceil(item.w*4);tmp.height=Math.ceil(item.h*4);const t=tmp.getContext('2d');t.drawImage(im,0,0,tmp.width,tmp.height);t.globalCompositeOperation='source-in';t.fillStyle=item.glyphColor;t.fillRect(0,0,tmp.width,tmp.height);c.drawImage(tmp,item.x,item.y,item.w,item.h);continue;
    }
    if(item.wordmark){
     const im=await image('./gradient-assets/seedance-wordmark.svg'),tmp=document.createElement('canvas');tmp.width=1000;tmp.height=160;const t=tmp.getContext('2d');t.drawImage(im,0,0,tmp.width,tmp.height);t.globalCompositeOperation='source-in';t.fillStyle=item.wordmarkColor;t.fillRect(0,0,tmp.width,tmp.height);const scale=item.segments[0].size/20;
     c.drawImage(tmp,item.x+.796875*scale,item.y+6.51953125*scale+(item.h-28*scale)/2,98.15234375*scale,14.98046875*scale);continue;
    }
    if(item.type!=='text')continue;
    const lines=[[]];for(const seg of item.segments){const parts=seg.text.split('\n');parts.forEach((text,i)=>{if(i)lines.push([]);lines.at(-1).push({...seg,text});});}
    // CSS/Figma exclude trailing paragraph whitespace from centered alignment.
    for(const runs of lines){for(let j=runs.length-1;j>=0;j--){const original=runs[j].text;runs[j].text=original.replace(/[ \t]+$/,'');if(runs[j].text.length||!original.length)break;}}
    const measured=lines.map(runs=>{let width=0,above=0,below=0;for(const s of runs){setFont(c,s);const m=c.measureText(s.text);s.runWidth=m.width;const ascent=m.fontBoundingBoxAscent??s.size*.8,descent=m.fontBoundingBoxDescent??s.size*.2,leading=(lineHeight(s,item)-ascent-descent)/2;s.ascent=ascent;s.descent=descent;above=Math.max(above,ascent+leading);below=Math.max(below,descent+leading);width+=m.width;}return {runs,width,above,below,h:above+below};});
    const naturalWidth=item.w,scaleX=1,totalHeight=measured.reduce((n,l)=>n+l.h,0);
    const left=item.align==='CENTER'?item.x+(item.w-naturalWidth*scaleX)/2:item.align==='RIGHT'?item.x+item.w-naturalWidth*scaleX:item.x;
    c.translate(left,item.y+(item.valign==='CENTER'?(item.h-totalHeight)/2:item.valign==='BOTTOM'?item.h-totalHeight:0));c.scale(scaleX,1);let y=0;
    for(const l of measured){let x=item.align==='CENTER'?(naturalWidth-l.width)/2:item.align==='RIGHT'?naturalWidth-l.width:0;for(const s of l.runs){setFont(c,s);c.fillStyle=color(s.fills?.find(p=>p.type==='SOLID'&&p.visible!==false));c.fillText(s.text,x,y+l.above);if(s.decoration==='UNDERLINE'){c.fillRect(x,y+l.above+s.size*.1,s.runWidth,Math.max(1,s.size*.04));}x+=s.runWidth;}y+=l.h;}
   }finally{c.restore();}
  }
 }
 window.gradientComposeCopy=async(background,spec)=>{
  const out=document.createElement('canvas');out.width=background.width;out.height=background.height;const c=out.getContext('2d');c.drawImage(background,0,0);c.save();c.scale(out.width/spec.w,out.height/spec.h);await draw(c,spec);c.restore();return out;
 };
})();
