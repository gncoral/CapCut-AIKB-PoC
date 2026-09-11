/* Original procedural studies inspired by visual observation of FeralUI's Flow / Sky / Aurora.
   Available in generated backgrounds by default. No remote assets or source code dependency. */
(()=>{
 window.gradientStudiesEnabled=true;
 const entries=[['studyFlow','流动 · 试验'],['studySky','天空 · 试验'],['studyAurora','极光 · 试验']];
 for(const [key,name] of entries){templates.push([key,name]);fieldProfiles[key]=JSON.parse(JSON.stringify(fieldProfiles.soft));Object.assign(fieldProfiles[key],{motionSpeed:15,distortion:62,drift:42,height:84,spread:70});}
 const surface=document.createElement('canvas'),gl=surface.getContext('webgl',{preserveDrawingBuffer:true,alpha:false});
 if(!gl)return;
 const vertex='attribute vec2 a;varying vec2 uv;void main(){uv=a*.5+.5;gl_Position=vec4(a,0.,1.);}';
 const fragment=`precision highp float;
 varying vec2 uv;uniform vec2 res;uniform float kind,brand,seed,zoom,angle,softness,warm,grain,saturation,phase,time,bend,drift,height,spread;
 float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
 float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.),f.x),f.y);}
 float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<5;i++){v+=a*noise(p);p=mat2(.8,-.6,.6,.8)*p*2.03+7.1;a*=.5;}return v;}
 void main(){
 vec2 p=vec2(uv.x,1.-uv.y);vec2 q=p-.5;float t=angle*.0174533;q=mat2(cos(t),-sin(t),sin(t),cos(t))*q; q=q*zoom+.5;
 vec2 shift=vec2(mod(seed,97.)*.041,mod(seed,71.)*.063)+phase;
 vec2 wind=vec2(time*.13,time*.045)*drift;
 vec3 main=brand<.5?vec3(.384,.843,.988):vec3(.439,.251,1.);
 vec3 blue=brand<.5?vec3(.086,.545,1.):vec3(.439,.251,1.);
 vec3 pale=brand<.5?vec3(.89,.98,1.):vec3(.92,.87,1.);
 vec3 accent=brand<.5?vec3(1.,.68,.25):vec3(.53,.87,1.);
 vec3 col;
 if(kind<.5){
  vec2 f=vec2(noise(q*1.6+shift+wind),noise(q*1.6+shift+4.-wind));
  float n=noise(q*1.8+f*(.8+bend*2.9)+shift);
  float ribbon=q.y-.45+.27*sin(q.x*4.+f.x*3.+phase)+.18*(n-.5);
  float width=mix(.13,.27,softness);
  col=mix(blue,main,smoothstep(-.35,.4,ribbon));
  col=mix(col,pale,exp(-pow(ribbon/width,2.))*.96);

 }else if(kind<1.5){
  // Restore the clear sky composition from round two, retaining wind controls.
  float n=fbm(vec2(q.x*3.,q.y*3.8)+shift+wind);
  float edge=.3+.09*sin(q.x*6.+phase+time*.08)+(.12+.29*bend)*(n-.5);
  float cloud=1.-smoothstep(edge-.09,edge+.12+softness*.1,q.y);
  col=mix(main,blue,smoothstep(.25,1.1,q.y));
  col=mix(col,pale,cloud);
  float wisps=pow(fbm(q*5.+shift+13.+wind),2.)*.21*(1.-smoothstep(.4,.85,q.y));
  col=mix(col,vec3(1.),wisps);

 }else{
  // Restore the lower, separated soft shafts selected in the user's reference.
  float x=q.x+time*.07*drift;
  float fold=height+(.025+.065*bend)*sin(x*5.8+phase+time*.19)+.04*sin(x*11.2-phase-time*.24);
  float broad=noise(vec2(x*5.+shift.x,time*.24+shift.y));
  float threads=noise(vec2(x*120.+sin(x*9.+time*.19)*3.,shift.y+time*.07));
  float cluster=smoothstep(.20,.75,broad);
  fold=clamp(fold,.10,.94);
  float width=.065+.11*spread+.0275*sin(x*7.+phase);
  float d=p.y-fold;
  float core=exp(-pow(d/width,2.))*(.23+.75*cluster);
  float second=exp(-pow(d/(width*1.65),2.));
  float tail=exp(min(d,0.)/(.08+width))*(1.-smoothstep(-.04,.15,d));
  float bottom=smoothstep(max(.20,height-.38),max(.30,height+.04),p.y);
  float texture=.48+.52*threads;
  col=mix(blue,main,.18+.42*p.y);
  col=mix(col,pale,tail*.16*bottom);
  float glow=clamp((core*texture+second*.26*cluster)*bottom,0.,.94);
  col=mix(col,vec3(1.),glow);
  float lit=smoothstep(.71,.96,.5+.5*sin(x*5.2+phase+time*.23))*clamp(warm,0.,1.);
  vec3 fire=brand<.5?mix(vec3(1.,.937,.38),vec3(1.,.55,.14),smoothstep(.38,.75,broad)):accent;
  col=mix(col,fire,lit*smoothstep(.49,.83,glow)*.78);

 }
 // Flow stays unchanged; sky returns to its previous clear composition.
 if(kind<1.5){
  if(brand<.5){
   float corner=p.x*.64+p.y*.36+.015*sin(p.x*5.+phase)*p.y;
   corner-=(1.-clamp(warm,0.,1.))*.50;
   col=mix(col,vec3(1.),smoothstep(.56,.79,corner));
   vec3 warmColour=mix(vec3(1.,.937,.38),vec3(1.,.55,.14),smoothstep(.80,1.,p.x));
   col=mix(col,warmColour,smoothstep(.79,.96,corner));
  }else{
   float light=smoothstep(.45,.96,p.x*.64+p.y*.36);
   col=mix(col,vec3(.95,.93,1.),light*.88);
   col=mix(col,accent,smoothstep(.87,1.,p.x*.64+p.y*.36)*.45*clamp(warm,0.,1.));
  }
 }
 float l=dot(col,vec3(.2126,.7152,.0722));col=mix(vec3(l),col,saturation);
 float g=(hash(floor(uv*res)+shift)-.5)*grain;gl_FragColor=vec4(clamp(col+g,0.,1.),1.);
 }`;
 function shader(type,src){const sh=gl.createShader(type);gl.shaderSource(sh,src);gl.compileShader(sh);if(!gl.getShaderParameter(sh,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(sh));return sh;}
 const program=gl.createProgram();gl.attachShader(program,shader(gl.VERTEX_SHADER,vertex));gl.attachShader(program,shader(gl.FRAGMENT_SHADER,fragment));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));
 gl.useProgram(program);const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);const a=gl.getAttribLocation(program,'a');gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,2,gl.FLOAT,false,0,0);
 const locations=Object.fromEntries(['res','kind','brand','seed','zoom','angle','softness','warm','grain','saturation','phase','time','bend','drift','height','spread'].map(k=>[k,gl.getUniformLocation(program,k)]));
 let lastContrast=0,lastDisplayedTime=0;
 const previous=render;
 render=function(target=canvas,sceneKey=state.scene,scale=1){
  const index=entries.findIndex(([k])=>k===state.template);if(index<0)return previous(target,sceneKey,scale);
  const sc=scenes[sceneKey],factor=target===canvas&&scale===1?2:scale;
  const width=Math.max(1,Math.round(sc.size[0]*factor)),height=Math.max(1,Math.round(sc.size[1]*factor));
  if(surface.width!==width)surface.width=width;if(surface.height!==height)surface.height=height;gl.viewport(0,0,width,height);gl.useProgram(program);gl.uniform2f(locations.res,width/Math.max(1,state.grainSize),height/Math.max(1,state.grainSize));
  const vals={kind:index,brand:state.brand==='dreamina'?0:1,seed:state.seed,zoom:state.scale/100,angle:state.angle,softness:state.blur/100,warm:state.accent/100,grain:state.noise/100,saturation:state.sat/166,phase:fieldProfiles[state.template].phase*4.,time:state.studyTime||0,bend:fieldProfiles[state.template].distortion/100,drift:fieldProfiles[state.template].drift/100,height:fieldProfiles[state.template].height/100,spread:fieldProfiles[state.template].spread/100};
  for(const [k,v]of Object.entries(vals))gl.uniform1f(locations[k],v);
  gl.drawArrays(gl.TRIANGLES,0,6);if(target.width!==width)target.width=width;if(target.height!==height)target.height=height;target.getContext('2d').drawImage(surface,0,0);
  if(target===canvas)lastDisplayedTime=state.studyTime||0;
  if(target===canvas&&performance.now()-lastContrast>300){lastContrast=performance.now();updateContrast();}
 };
 const priorPaint=paintUI;paintUI=function(){priorPaint();document.querySelector('.templates .section-head span').textContent='6 类背景 + 3 个试验';};
 const style=document.createElement('style');style.textContent='.toolbar{flex-wrap:wrap}.toolbar-left,.toolbar-right{flex-wrap:wrap;min-width:0}.toolbar-right>.meta{display:none}#study-motion[hidden]{display:none!important}body[data-study-active="true"] #curve-toggle,body[data-study-active="true"] [data-field-anchor],body[data-study-active="true"] [data-color-anchor]{display:none!important}';document.head.append(style);
 const priorCopy=applyCopy;applyCopy=function(){priorCopy();document.body.dataset.studyActive=String(entries.some(([k])=>k===state.template));};
 const priorRandom=document.getElementById('random').onclick;document.getElementById('random').onclick=e=>{if(!entries.some(([k])=>k===state.template))return priorRandom(e);state.seed=Math.floor(Math.random()*1e8);fieldProfiles[state.template].phase=Math.random()*2;render();paintThumbs();};
 for(const id of ['templates','brands','scenes'])document.getElementById(id).addEventListener('click',()=>{document.querySelector('.templates .section-head span').textContent='6 类背景 + 3 个试验';document.body.dataset.studyActive=String(entries.some(([k])=>k===state.template));});
 const panel=document.createElement('div');panel.className='group workspace-effects';panel.id='study-motion';
 panel.innerHTML='<h3>流动调节</h3><button class="button" id="study-play" type="button">暂停流动</button><div id="study-motion-fields"></div>';
 document.querySelector('.workspace-tabs').after(panel);
 const labels={studyFlow:['扭曲','旋流'],studySky:['云层起伏','风力'],studyAurora:['光幕折叠','光束延展']};
 function syncMotion(){
  const active=Boolean(labels[state.template]);panel.hidden=!active;syncTransport();if(!active)return;
  const p=fieldProfiles[state.template];panel.querySelector('h3').textContent=entries.find(([k])=>k===state.template)[1].replace(' · 试验','')+'调节';
  const fields=panel.querySelector('#study-motion-fields');fields.replaceChildren();
  for(const [k,label]of [['distortion',labels[state.template][0]],['drift',labels[state.template][1]],...(state.template==='studyAurora'?[['height','光幕位置（向下）'],['spread','散开程度']]:[]),['motionSpeed','速度']]){
   const row=document.createElement('label');row.style.cssText='display:grid;gap:8px;margin-top:16px;font-size:12px';
   const text=document.createElement('span');text.textContent=label+' '+p[k]+'%';
   const input=document.createElement('input');input.type='range';input.min=0;input.max=100;input.value=p[k];input.setAttribute('aria-label',label);input.id='study-'+k;
   input.oninput=()=>{fieldProfiles[state.template][k]=Number(input.value);text.textContent=label+' '+input.value+'%';render();};row.append(text,input);fields.append(row);
  }
 }
 function syncTransport(){panel.querySelector('button').textContent=state.batchStatic?'播放流动':'暂停流动';}
 panel.querySelector('button').onclick=()=>{state.batchStatic=!state.batchStatic;if(state.batchStatic)state.studyTime=lastDisplayedTime;else window.gradientResetCandidateSelection?.();syncTransport();};

 const paintMotion=paintUI;paintUI=function(){paintMotion();syncMotion();};
 for(const id of ['templates','brands'])document.getElementById(id).addEventListener('click',()=>{state.batchStatic=false;syncMotion();});
 let last=performance.now(),drawAt=0;
 function animate(now){const dt=Math.min(.06,(now-last)/1000);last=now;const active=Boolean(labels[state.template]);
  if(active){syncTransport();
   if(!state.batchStatic&&!document.hidden){state.studyTime=(state.studyTime||0)+dt*fieldProfiles[state.template].motionSpeed/70;if(now-drawAt>40){drawAt=now;render();}}
  }
  requestAnimationFrame(animate);
 }
 requestAnimationFrame(animate);
 paintUI();fit();applyCopy();render();
})();
