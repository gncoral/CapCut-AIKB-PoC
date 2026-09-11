/* Restore current template and scene without discarding other scenes or candidate backgrounds. */
(()=>{
 const clone=value=>JSON.parse(JSON.stringify(value));
 const softFamily=['soft','diffuse','horizon','halo','fold','focus','ripple','prism'];
 const controls=['scale','angle','blur','sat','accent','noise','grainSize','exportScale'];
 const defaults=Object.fromEntries(controls.map(k=>[k,state[k]]));
 const profiles=clone(fieldProfiles);
 const resetShape=fieldReset.onclick;
 fieldReset.textContent='恢复默认';
 fieldReset.title='恢复当前模板效果、调节参数、导出倍率及当前资源位文案和字色';
 fieldReset.onclick=event=>{
  window.gradientResetCandidateSelection?.();
  if(softFamily.includes(state.template))state.template='soft';
  Object.assign(state,defaults,{seed:18,batchStatic:false,studyTime:0,autoText:true});
  if(profiles[state.template])fieldProfiles[state.template]=clone(profiles[state.template]);
  if(state.sceneTemplateControls[state.scene])state.sceneTemplateControls[state.scene]=cloneTemplateControls();
  for(const k of controls)document.getElementById(k).value=state[k];
  syncValues();
  // Extension reset handlers also restore their private seeds, presets and sliders.
  if(window.gradientBatchAdapters?.[state.template])resetShape(event);
  window.gradientSyncFloralControls?.();
  paintUI();fit();applyCopy();window.gradientResetCopy?.();
  renderFieldAnchors();render();paintThumbs();
  toast('已恢复当前模板默认效果、文案与字色');
 };
})();
