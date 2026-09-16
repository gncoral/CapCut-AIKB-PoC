/* Publisher-selected Dreamina macro-floral default, captured from the live editor. */
(()=>{
 const preset={settings:{seed:969316042,scale:100,angle:10,blur:60,sat:166,accent:100,noise:2,grainSize:1},profile:{nodes:[[0.1488122532931481,0.4864321553512549],[0.4416636937939848,0.11538157700337244],[0.7659991735933146,0.1746397254499789],[1.074,1.0066]],phase:0.5159725951962173,warp:0.04038355650450103,mode:14,preference:{floralStyle:'0',layerCount:2,petalCount:3,petalWidth:1,layerGap:0.19,layerStagger:0.12,rhythm:0.68,sizeRatio:0.75,growthPosition:'right-bottom',crop:0.37,overlap:0.21,asymmetry:0.71,warmArea:0.09,spread:0.659006296680309,depth:0.85,sharpness:0.95,curvature:0.44,fan:0.55,edgeDefinition:0.69,cyanShare:0.59,lightArea:0.31,growthPositionT:0.55}}};
 let initialized=false;
 window.gradientApplyFloralDefault=()=>{
  if(state.brand!=='dreamina'||state.template!=='petalStack')return false;
  Object.assign(state,preset.settings,{batchStatic:true});fieldProfiles.petalStack=JSON.parse(JSON.stringify(preset.profile));initialized=true;
  for(const key of Object.keys(preset.settings)){const input=document.getElementById(key);if(input)input.value=state[key];}
  syncValues();window.gradientSyncFloralControls?.();return true;
 };
 document.getElementById('templates').addEventListener('click',event=>{
  if(event.target.closest('[data-template="petalStack"]')&&!initialized){window.gradientApplyFloralDefault();fit();applyCopy();render();}
 });
 // Thumbnails should present the saved default before the first use, without changing live state.
 const priorRender=render;render=function(target=canvas,...args){
  if(!initialized&&target!==canvas&&state.brand==='dreamina'&&state.template==='petalStack'){
   const settings=Object.fromEntries(Object.keys(preset.settings).map(k=>[k,state[k]])),profile=fieldProfiles.petalStack;
   try{Object.assign(state,preset.settings);fieldProfiles.petalStack=JSON.parse(JSON.stringify(preset.profile));return priorRender(target,...args);}
   finally{Object.assign(state,settings);fieldProfiles.petalStack=profile;}
  }return priorRender(target,...args);
 };
 if(state.template==='petalStack'){gradientApplyFloralDefault();render();}
})();
