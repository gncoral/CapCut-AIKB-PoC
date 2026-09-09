/* Oil-brush colour fields, bristle drag and canvas tooth. No external image assets. */
(() => {
  const KEY='oilBrush';
  const defaults={density:48,width:95,length:125,direction:-4,wetness:66,relief:26,texture:32,quiet:65};
  const presets=[
    ['薄涂拖刷',defaults],
    ['干刷肌理',{...defaults,density:68,width:65,length:95,wetness:22,relief:56,texture:58,quiet:72}],
    ['柔融叠色',{...defaults,density:30,width:145,length:165,wetness:88,relief:12,texture:20,quiet:60,warmCorner:true}],
  ];
  let params={...defaults},seed=82731,selected=0,pending=0;
  const cache=new Map();
  const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
  const mix=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*clamp(t));
  const smooth=(a,b,v)=>{const t=clamp((v-a)/(b-a));return t*t*(3-2*t);};
  const make=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c;};
  function noiseMaker() {
    const random=rng(seed), grid=Float32Array.from({length:16384},()=>random());
    const at=(x,y)=>grid[((x&127)+((y&127)<<7))];
    return (x,y)=>{
      const ix=Math.floor(x),iy=Math.floor(y),u=smooth(0,1,x-ix),v=smooth(0,1,y-iy);
      return (at(ix,iy)*(1-u)+at(ix+1,iy)*u)*(1-v)+(at(ix,iy+1)*(1-u)+at(ix+1,iy+1)*u)*v;
    };
  }
  function ramp(stops,t) {
    let i=1;while(i<stops.length-1&&t>stops[i][0])i++;
    return mix(stops[i-1][1],stops[i][1],smooth(stops[i-1][0],stops[i][0],t));
  }
  function oilRender(target,sceneKey,scale) {
    const scene=scenes[sceneKey],w=Math.round(scene.size[0]*scale),h=Math.round(scene.size[1]*scale);
    const key=JSON.stringify([w,h,sceneKey,state.brand,state.accent,params,seed]);
    target.width=w;target.height=h;const out=target.getContext('2d');
    if(cache.has(key)){out.drawImage(cache.get(key),0,0);return;}
    const pal=brands[state.brand].colors.map(hex),dream=state.brand==='dreamina',white=pal[3];
    const stops=dream?[[0,pal[7]],[.34,pal[2]],[.57,pal[0]],[.83,mix(pal[0],white,.75)],[1,white]]
      :[[0,pal[0]],[.36,pal[1]],[.72,pal[2]],[1,white]];
    const fw=Math.min(w,960),fh=Math.max(1,Math.round(h*fw/w));
    const field=make(fw,fh),fc=field.getContext('2d'),im=fc.createImageData(fw,fh),data=im.data;
    const noise=noiseMaker(),angle=params.direction*Math.PI/180,cs=Math.cos(angle),sn=Math.sin(angle);
    const freq=(3+params.density*.085)/(params.width/100),long=params.length/100,wet=params.wetness/100;
    const copy=scene.copy;
    // Follow the brush flow across both copy and countdown, with broad feathering.
    const textCalm=(nx,ny)=>{
      const strength=clamp(params.quiet/65*.9);
      const cx=copy[0]+copy[2]*.5,cy=copy[1]+copy[3]*.5,dx=nx-cx;
      const curve=sceneKey==='banner'?-.08*dx-.07*dx*dx:-.15*dx-.20*dx*dx;
      const d=Math.pow(dx/(copy[2]*.65+.08),4)+Math.pow((ny-cy-curve)/(copy[3]*.62+.06),4);
      const main=strength*Math.exp(-1.7*d);
      if(!scene.count)return main;
      const r=scene.count,xx=nx-r[0]-r[2]/2,yy=ny-r[1]-r[3]/2+.10*xx+.10*xx*xx;
      const distance=Math.pow(xx/(r[2]*.65+.045),4)+Math.pow(yy/(r[3]*.67+.075),4);
      return 1-(1-main)*(1-strength*Math.exp(-1.7*distance));
    };
    for(let y=0;y<fh;y++)for(let x=0;x<fw;x++){
      const nx=x/fw,ny=y/fh;
      const u=(nx-.5)*cs+(ny-.5)*sn,v=-(nx-.5)*sn+(ny-.5)*cs+.32*u+.28*u*u;
      const bend=(noise(u*1.4+21,v*1.2+9)-.5)*.25;
      const broad=noise(u*1.35/long+36,(v+bend)*freq+22);
      const strokes=noise(u*5/long+7,(v+bend)*freq*3.5+43);
      const ridges=noise(u*9/long+19,(v+bend)*freq*24+6);
      const dx=(nx-copy[0]-copy[2]*.5)/Math.max(.22,copy[2]*.75);
      const dy=(ny-copy[1]-copy[3]*.5)/Math.max(.23,copy[3]*.85);
      const calm=Math.exp(-2*(dx*dx+dy*dy))*params.quiet/100;
      const shape=broad*.78+strokes*.22;
      const dry=smooth(.29,.71,shape);
      let tone=.20+((dry*(1-wet)+shape*wet)-.2)*1.22;
      tone=clamp(tone+(ridges-.5)*(.20-wet*.14)*(1-calm));
      tone=tone*(1-calm*.7)+.69*calm*.7;
      const focus=textCalm(nx,ny);
      tone=tone*(1-focus)+(.66+.025*(broad-.5))*focus;
      let color=ramp(stops,tone);
      // Approved sparse warm brushwork: pigment, exposed ground and bristles share an arc.
      const brushCourse=v+bend;
      const load=noise(u*2.8/long+5,brushCourse*freq*1.6+51);
      const brokenEdge=(load-.5)*.34+(strokes-.5)*.14;
      const exposed=smooth(.58,.83,noise(u*3.4/long+45,brushCourse*freq*2.8+3))*.28;
      const cornerWarm=dream&&params.warmCorner;
      const warmth=smooth(cornerWarm?.30:.14,cornerWarm?.68:.63,brushCourse+brokenEdge)*(.34+.66*smooth(-.60,.22,u))*(1-exposed)*state.accent/100;
      if(warmth>0){
        const pigmentTone=cornerWarm?.22+.47*smooth(.26,.70,broad*.65+strokes*.35):tone;
        const warmTone=dream?ramp([[0,pal[4]],[.40,mix(pal[4],pal[6],.2)],[.64,pal[6]],[.88,mix(pal[6],white,.78)],[1,white]],pigmentTone)
          :ramp([[0,pal[4]],[.65,mix(pal[4],white,.3)],[1,white]],tone);
        color=ramp([[0,color],[.36,mix(color,white,.52)],[.57,mix(white,dream?pal[5]:pal[4],.10)],[cornerWarm?.95:1,warmTone]],warmth);
        if(cornerWarm){
          // Keep the yellow brushwork intact; strengthen only the tiny orange tip.
          const tip=smooth(.90,.995,nx)*smooth(.88,.995,ny+(strokes-.5)*.045);
          color=mix(color,pal[4],tip*.78*clamp(state.accent/100));
        }
      }
      const i=(y*fw+x)*4;data[i]=color[0];data[i+1]=color[1];data[i+2]=color[2];data[i+3]=255;
    }
    fc.putImageData(im,0,0);
    const result=make(w,h),c=result.getContext('2d');
    c.drawImage(field,0,0,w,h);
    const pixels=c.getImageData(0,0,w,h),p=pixels.data;
    const random=rng(seed^57219),tex=params.texture/100,relief=params.relief/100;
    // Directional micro-ridges plus fine canvas grain: no global desaturation.
    for(let y=0;y<h;y++)for(let x=0;x<w;x++){
      const nx=x/w,ny=y/h,u=(nx-.5)*cs+(ny-.5)*sn,v=-(nx-.5)*sn+(ny-.5)*cs+.32*u+.28*u*u;
      const dx=(nx-copy[0]-copy[2]*.5)/Math.max(.22,copy[2]*.75),dy=(ny-copy[1]-copy[3]*.5)/Math.max(.23,copy[3]*.85);
      const local=1-Math.exp(-2*(dx*dx+dy*dy))*params.quiet/100*.72;
      const q=v+(noise(u*1.4+21,v*1.2+9)-.5)*.25;
      const groove=noise(u*7/long+18,q*scene.size[1]*.52+31);
      const drag=noise(u*2.1+49,q*scene.size[1]*.17+2);
      const bristle=(groove-.5)*relief*(8+(1-wet)*25)*local;
      const tooth=(random()+random()-1)*tex*17;
      const weave=(Math.sin(x/scale*3.1)*Math.sin(y/scale*3.7))*tex*1.8;
      const highlight=(bristle+tooth+weave)*(.65+drag*.65)*(1-textCalm(nx,ny)*.88);
      const i=(y*w+x)*4;
      for(let ch=0;ch<3;ch++)p[i+ch]=highlight>0?p[i+ch]+(255-p[i+ch])*highlight/140:p[i+ch]*(1+highlight/125);
    }
    c.putImageData(pixels,0,0);cache.set(key,result);if(cache.size>5)cache.delete(cache.keys().next().value);
    out.drawImage(result,0,0);
  }

  templates.push([KEY,'油画笔触']);
  fieldDefaults[KEY]=[[.1,.2],[.8,.2],[.3,.7],[.9,.85]];
  fieldProfiles[KEY]={nodes:fieldDefaults[KEY].map(p=>[...p]),phase:.4,warp:.1,mode:0};
  templateControlDefaults[KEY]=templateControlDefaults.soft.map(p=>[...p]);
  Object.values(state.sceneTemplateControls).forEach(s=>s[KEY]=templateControlDefaults[KEY].map(p=>[...p]));
  const style=document.createElement('style');style.textContent=`
    .oil-panel[hidden]{display:none!important}.oil-presets{display:flex;gap:5px;margin-bottom:16px}
    .oil-presets button{flex:1;background:#191b22;color:#aeb3c0;border:1px solid #343741;border-radius:7px;padding:8px 3px;font-size:10px;cursor:pointer}
    .oil-presets button.active{background:#f2f5fa;color:#15171d}.oil-note{font-size:10px;line-height:1.7;color:#8d919b;margin:0 0 14px}
    .oil-panel .field{margin-bottom:17px}.oil-ends{display:flex;justify-content:space-between;font-size:9px;color:#747985;margin-top:4px}
    body[data-oil-active="true"] #preference-lab,body[data-oil-active="true"] .tree-panel,
    body[data-oil-active="true"] .oil-shared-duplicate,body[data-oil-active="true"] #curve-toggle,
    body[data-oil-active="true"] [data-color-anchor],body[data-oil-active="true"] [data-field-anchor],
    body[data-oil-active="true"] .curve-anchor,body[data-oil-active="true"] .toolbar-right>.meta{display:none!important}
    body[data-oil-active="true"] #preview-title,body[data-oil-active="true"] #preview-sub{color:#10151c!important}
    body[data-oil-active="true"] .countdown i{background:rgba(255,255,255,.96)!important}
    body[data-oil-active="true"] .countdown small{color:#303844!important;opacity:1!important;font-weight:600!important;font-size:1.3cqw!important}
  `;document.head.append(style);
  const panel=document.createElement('div');panel.className='group oil-panel';panel.hidden=true;
  panel.innerHTML='<h3>油画笔触细节</h3><p class="oil-note">横向拖刷、层层叠色与细密画布纹理。品牌色保持不变，用干湿和留白调节画面。</p><div class="oil-presets"></div><div class="oil-fields"></div><button type="button" class="button" id="oil-shuffle">换一组笔触</button>';
  const shared=[...document.querySelectorAll('.side>.group')].find(g=>g.querySelector('h3')?.textContent==='形态与质感');
  shared.before(panel);
  ['scale','angle','blur','sat','noise','grainSize'].forEach(id=>document.getElementById(id).closest('.field').classList.add('oil-shared-duplicate'));
  shared.querySelector('.help')?.classList.add('oil-shared-duplicate');
  const controls=[
    ['density','笔触疏密',15,100,'疏朗','密集'],['width','笔刷宽度',45,180,'细刷','宽刷'],
    ['length','拖刷长度',45,190,'短促','绵长'],['direction','运笔方向',-75,75,'左倾','右倾'],
    ['wetness','颜料干湿',0,100,'干刷留痕','湿润融合'],['relief','颜料厚度',0,85,'薄涂','堆叠'],
    ['texture','画布纹理',0,80,'细腻','粗粝'],['quiet','文案清晰度',0,100,'保留笔触','文案与倒计时更清晰'],
  ];
  controls.forEach(([key,label,min,max,left,right])=>{
    const field=document.createElement('div');field.className='field';
    field.innerHTML=`<div class="field-head"><label for="oil-${key}">${label}</label><b data-oil-value="${key}"></b></div><input id="oil-${key}" type="range" min="${min}" max="${max}" step="1"><div class="oil-ends"><span>${left}</span><span>${right}</span></div>`;
    field.querySelector('input').addEventListener('input',e=>{params[key]=Number(e.target.value);selected=-1;syncPanel();if(!pending)pending=requestAnimationFrame(()=>{pending=0;render();});});
    field.querySelector('input').addEventListener('change',()=>thumbnail());
    panel.querySelector('.oil-fields').append(field);
  });
  presets.forEach(([name,values],i)=>{const b=document.createElement('button');b.type='button';b.textContent=name;b.onclick=()=>{params={...values};selected=i;syncPanel();render();thumbnail();};panel.querySelector('.oil-presets').append(b);});
  function syncPanel(){controls.forEach(([k])=>{panel.querySelector(`#oil-${k}`).value=params[k];panel.querySelector(`[data-oil-value="${k}"]`).textContent=params[k]+(k==='direction'?'°':'%');});panel.querySelectorAll('.oil-presets button').forEach((b,i)=>b.classList.toggle('active',i===selected));}
  const priorRender=render;
  render=function(target=canvas,sceneKey=state.scene,scale=1){
    if(state.template!==KEY)return priorRender(target,sceneKey,scale);
    oilRender(target,sceneKey,target===canvas&&scale===1?2:scale);if(target===canvas)updateContrast();
  };
  function thumbnail(){const t=document.querySelector(`[data-template="${KEY}"] .thumb`);if(t){const c=make(128,77);oilRender(c,'pc',.32);t.style.backgroundImage=`url(${c.toDataURL('image/jpeg',.9)})`;}}
  function sync(){
    const active=state.template===KEY;document.body.dataset.oilActive=String(active);panel.hidden=!active;
    document.querySelector('.templates .section-head span').textContent=`${templates.length} 种背景模板`;
    const b=document.querySelector(`[data-template="${KEY}"]`);
    if(b)b.onclick=()=>{state.template=KEY;paintUI();fit();applyCopy();render();};
    if(active)document.querySelectorAll('.template').forEach(t=>t.classList.toggle('active',t.dataset.template===KEY));
  }
  const priorPaint=paintUI;paintUI=function(){priorPaint();sync();thumbnail();};
  const b=document.createElement('button');b.className='template';b.dataset.template=KEY;b.innerHTML='<div class="thumb"></div><span>油画笔触</span>';document.getElementById('templates').append(b);
  ['templates','brands','scenes'].forEach(id=>document.getElementById(id).addEventListener('click',()=>{sync();}));
  const shuffle=()=>{seed=Math.floor(Math.random()*1e9);render();thumbnail();toast('已换一组油画笔触');};
  panel.querySelector('#oil-shuffle').onclick=shuffle;
  const priorRandom=document.getElementById('random').onclick;document.getElementById('random').onclick=e=>state.template===KEY?shuffle():priorRandom(e);
  const priorReset=fieldReset.onclick;fieldReset.onclick=e=>{if(state.template!==KEY)return priorReset(e);params={...defaults};seed=82731;selected=0;syncPanel();render();thumbnail();toast('已恢复油画笔触默认效果');};
  window.gradientBatchAdapters=window.gradientBatchAdapters||{};
  window.gradientBatchAdapters[KEY]={
    get:()=>({params:{...params},seed,selected}),
    set:v=>{params={...v.params};seed=v.seed;selected=v.selected;syncPanel();},
    vary:()=>{seed=Math.floor(Math.random()*1e9);selected=-1;for(const [k,,min,max] of controls){if(k==='quiet')continue;params[k]=Math.round(clamp(params[k]+(Math.random()-.5)*(max-min)*.45,min,max));}syncPanel();}
  };
  syncPanel();sync();thumbnail();
  if(new URLSearchParams(location.search).get('template')===KEY){
    if(new URLSearchParams(location.search).get('oilPreset')==='soft'){params={...presets[2][1]};selected=2;syncPanel();}
    state.template=KEY;paintUI();fit();applyCopy();render();
  }
})();
