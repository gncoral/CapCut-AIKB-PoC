/* Fixed desktop editing surface: canvas never scrolls away from controls. */
(()=>{
 const main=document.querySelector('.main'),side=document.querySelector('.side');
 const shelf=document.createElement('div');shelf.className='workspace-shelf';
 for(const node of [...main.children])if(node.matches('.templates,.batch-panel,#preference-lab'))shelf.append(node);
 main.append(shelf);
 for(const group of side.querySelectorAll(':scope > .group')){
  const title=group.querySelector('h3')?.textContent||'';
  if(title==='场景套装')group.classList.add('workspace-scenes');
  else if(title.includes('文字'))group.classList.add('workspace-copy');
  else group.classList.add('workspace-effects');
 }
 const tabs=document.createElement('div');tabs.className='workspace-tabs';tabs.setAttribute('role','group');tabs.setAttribute('aria-label','调节面板');
 tabs.innerHTML='<button class="button active" aria-pressed="true" data-panel="effects">效果调节</button><button class="button" aria-pressed="false" data-panel="copy">文字内容</button>';
 side.prepend(tabs);side.dataset.panel='effects';
 tabs.onclick=e=>{const b=e.target.closest('[data-panel]');if(!b)return;side.dataset.panel=b.dataset.panel;tabs.querySelectorAll('button').forEach(x=>{x.classList.toggle('active',x===b);x.setAttribute('aria-pressed',String(x===b));});side.scrollTop=0;};
 const style=document.createElement('style');style.textContent=`
 .workspace-tabs{display:flex;gap:8px;position:sticky;top:-12px;background:#111216;padding:12px 0;z-index:25}.workspace-tabs .active{background:#f4f5f7;color:#101115}
 .side[data-panel="effects"] .workspace-copy,.side[data-panel="copy"] .workspace-effects{display:none!important}
 @media(min-width:901px){
 html,body{height:100%;overflow:hidden}.app{height:100dvh;min-height:0;display:flex;flex-direction:column}
 .header{height:56px;flex-shrink:0;padding:0 16px}.quick{padding:8px 16px;gap:6px 12px;flex-shrink:0}.quick .row{flex-wrap:nowrap}.quick #scenes{overflow-x:auto;padding-bottom:3px}.quick .chip{white-space:nowrap}.quick .ratio-note{overflow:hidden;white-space:nowrap;text-overflow:ellipsis}.quick .palette{flex-shrink:0}
 .workspace{flex:1;min-height:0;overflow:hidden;grid-template-columns:minmax(0,1fr) 330px}
 .main{min-height:0;overflow:hidden;padding:12px;display:grid;grid-template-rows:auto minmax(160px,1fr) auto minmax(150px,30%);gap:8px}
 .toolbar{margin:0;min-width:0;flex-wrap:wrap;gap:5px}.toolbar-right>.meta{display:none}.toolbar-left{min-width:0}.toolbar-left .meta{overflow:hidden;white-space:nowrap;text-overflow:ellipsis}
 #shell{height:100%;min-height:0;padding:16px}.status{margin:0}.status>.tip{display:none}
 .workspace-shelf{min-height:0;overflow:auto;overscroll-behavior:contain;border-top:1px solid #292b33;padding:10px 4px 10px 0}
 .workspace-shelf .templates{margin-top:0}.workspace-shelf .batch-panel{margin-top:12px;padding-top:8px}.workspace-shelf .batch-head h3{margin-top:4px;margin-bottom:4px}.workspace-shelf .batch-note{margin:6px 0 10px}
 .side{min-height:0;overflow:auto;overscroll-behavior:contain;padding:0 14px 16px}.side .workspace-scenes{display:none}.side .field{margin:10px 0}.side .group{padding-bottom:12px;margin-bottom:12px}
 }
 @media(max-width:900px){.workspace-shelf{display:contents}.workspace-tabs{top:0}.quick #scenes{flex-wrap:wrap}}
 `;document.head.append(style);
 requestAnimationFrame(()=>{fit();render();});
})();
