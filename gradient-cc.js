/* CC shares editable foreground geometry, while retaining its own copy and palette state. */
(()=>{
 brands.cc={name:'CC',colors:['#16C7DE','#16C7DE','#51D6E8','#F3F6FF','#A995F4','#BEAFF8','#F6C4E5','#E8DFFC'],weights:[24,21,10,22,8,10,3,2],base:'#0AC9E9',ratio:'青色为主 · 柔紫色域 · 少量粉色'};
 copyPresets.cc=JSON.parse(JSON.stringify(copyPresets.dreamina));
 // Import CC's own Figma text geometry; preserve other brands and stored edits.
 const ccSlots=new Set(window.gradientCCLegacySizes?[]:gradientSceneCatalog.cc.map(row=>row[0]));
 gradientCopyLayouts.push(...gradientCopyLayouts.filter(x=>x.brand==='dreamina'&&!ccSlots.has(x.scene)).map(x=>({...JSON.parse(JSON.stringify(x)),brand:'cc'})));
 if(!window.gradientCCLegacySizes)gradientCopyLayouts.push(...window.gradientCCOriginalLayouts);
 // Legacy templates remain available for user-created sizes only.
 window.gradientCopyTemplates.push(...window.gradientCopyTemplates.filter(x=>x.brand==='dreamina').map(x=>({...JSON.parse(JSON.stringify(x)),brand:'cc'})));
 const requestedBrand=new URLSearchParams(location.search).get('brand');
 if(['cc','dreamina','pippit'].includes(requestedBrand))state.brand=requestedBrand;
 paintUI();
})();
