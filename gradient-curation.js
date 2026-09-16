/* Brand-specific presentation choices. Archived renderers remain recoverable. */
(()=>{
 const allowed={
  dreamina:['soft','horizon','petal','petalShadow','petalStack','oilBrush','studyFlow','studySky','studyAurora'],
  pippit:['soft','ripple','prism','petal','petalShadow'],
 };
 window.gradientTemplateSummary=()=>`${allowed[state.brand].length} 种背景模板`;
 const css=document.createElement('style');css.textContent=Object.entries(allowed).map(([brand,keys])=>templates.filter(([k])=>!keys.includes(k)).map(([k])=>`body[data-curated-brand="${brand}"] #templates [data-template="${k}"]`).join(',')+'{display:none!important}').join('\n');document.head.append(css);
 const sync=()=>{
  document.body.dataset.curatedBrand=state.brand;
  if(state.template!=='featuredImage'&&!allowed[state.brand].includes(state.template)){state.template='soft';state.batchStatic=false;}
 };
 const prior=paintUI;paintUI=function(){sync();prior();document.querySelector('.templates .section-head span').textContent=gradientTemplateSummary();};
 for(const id of ['templates','brands','scenes'])document.getElementById(id).addEventListener('click',()=>{document.querySelector('.templates .section-head span').textContent=gradientTemplateSummary();});
 paintUI();applyCopy();render();
})();
