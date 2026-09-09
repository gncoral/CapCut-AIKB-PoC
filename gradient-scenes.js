/* Latest resource cutouts: Figma HjEFKtMBDJm6Eessye8GjP / 341:44827.
 * Logical pixel sizes, not full-page screenshots or copy annotation frames.
 * Legacy scenes stay available to internal thumbnail renderers only.
 */
const gradientSceneCatalog = {
  dreamina: [
    ['banner','Web 订阅页 Banner',1320,162,'338:56455','banner'],
    ['webStrip','Web 首页横条',1440,40,'338:56706','strip'],
    ['popup','Web 首页弹窗媒体图',472,263,'338:53695'],
    ['retain','Web 支付挽留图',472,263,'338:57834'],
    ['leave','Web 订阅页离开挽留图',472,263,'338:57860'],
    ['app','App 首页弹窗',286,286,'338:58093'],
    ['appSubscription','App 订阅页横幅',390,80,'338:58009','compact'],
    ['appHome','App 首页 Banner',366,72,'338:58260','compact'],
  ],
  pippit: [
    ['banner','Web 订阅页 Banner',1384,162,'338:62333','banner'],
    ['webStrip','Web 首页横条',1628,40,'338:62779','strip'],
    ['popup','Web 首页弹窗媒体图',472,266,'338:62720'],
    ['retain','Web 支付挽留图',472,266,'338:64490'],
    ['leave','Web 订阅页离开挽留图',472,266,'338:64523'],
    ['app','App 首页弹窗',288,432,'338:66437'],
    ['appLottery','App 首页抽奖弹窗',273,234,'338:68710'],
    ['appHomeNew','App 首页 Banner（新版）',215,250,'338:68132'],
    ['appHome','App 首页 Banner',256,128,'338:66627'],
    ['appSave','App 保存完成弹窗媒体图',385,214,'338:67380'],
    ['appSubscription','App 订阅页横幅',393,80,'338:67582','compact'],
  ],
};
function gradientCreateScenes(){
  const result={};
  for(const row of Object.values(gradientSceneCatalog).flat()){
    const key=row[0];if(result[key])continue;
    const resolve=()=>gradientSceneCatalog[state.brand].find(r=>r[0]===key)||row;
    result[key]={
      get name(){return resolve()[1]},get size(){const r=resolve();return [r[2],r[3]]},
      get sourceNode(){return resolve()[4]},get layout(){return resolve()[5]||'product'},
      get radius(){return this.layout==='strip'?0:this.layout==='banner'?28:8},
      get copy(){const region=gradientCopyRegion(key);if(region)return region;return this.layout==='banner'?[.025,.14,.60,.72]:this.layout==='strip'?[.12,.16,.76,.68]:this.layout==='compact'?[.06,.14,.88,.72]:[.09,.22,.82,.50]},
      get safe(){return this.copy},
      get count(){return this.layout==='banner'?[.73,.17,.245,.66]:undefined},
    };
  }
  return result;
}
function gradientSceneEntries(){return gradientSceneCatalog[state.brand].map(([key])=>[key,scenes[key]])}
function gradientIsTextScene(){return ['banner','strip','compact'].includes(scenes[state.scene].layout)}
function gradientFitCopy(stage){
  const sc=scenes[state.scene],layout=sc.layout||'product';stage.dataset.layout=layout;
  if(!['banner','strip','compact'].includes(layout))return;
  // Scale by logical height as well as width, so ultra-wide strips never inherit poster typography.
  const title=stage.querySelector('.banner-copy h2'),sub=stage.querySelector('.banner-copy p');
  const px=layout==='strip'?14:layout==='compact'?Math.min(16,sc.size[1]*.22):24;
  for(const el of [title,sub])if(el)el.style.setProperty('font-size',`${px/sc.size[0]*100}cqw`,'important');
}
const gradientSceneStyle=document.createElement('style');
gradientSceneStyle.textContent=`
:is(.canvas-frame,.batch-preview)[data-layout="banner"] .preview-badges i{height:1.82cqw;font-size:.91cqw}
:is(.canvas-frame,.batch-preview)[data-layout="banner"] .preview-badges{margin-bottom:.6cqw}
:is(.canvas-frame,.batch-preview)[data-layout="banner"] .countdown b{font-size:2.73cqw}
:is(.canvas-frame,.batch-preview)[data-layout="banner"] .countdown small{font-size:.91cqw!important;margin-top:.3cqw}
:is(.canvas-frame,.batch-preview)[data-layout="strip"] .banner-copy,
:is(.canvas-frame,.batch-preview)[data-layout="compact"] .banner-copy{display:block!important;width:100%}
:is(.canvas-frame,.batch-preview)[data-layout="strip"] .product-lockup,
:is(.canvas-frame,.batch-preview)[data-layout="compact"] .product-lockup,
:is(.canvas-frame,.batch-preview)[data-layout="strip"] .preview-badges,
:is(.canvas-frame,.batch-preview)[data-layout="compact"] .preview-badges{display:none!important}
:is(.canvas-frame,.batch-preview)[data-layout="strip"] .banner-copy{display:flex!important;justify-content:center;align-items:center;gap:1cqw}
:is(.canvas-frame,.batch-preview)[data-layout="strip"] .banner-copy :is(h2,p){line-height:1.35}
:is(.canvas-frame,.batch-preview)[data-layout="compact"] .mock-copy{text-align:left;align-items:flex-start}
:is(.canvas-frame,.batch-preview)[data-layout="compact"] .banner-copy :is(h2,p){line-height:1.35}
@media(min-width:901px){.quick #scenes{flex-wrap:wrap!important;max-height:114px;overflow-y:auto!important}.quick #scenes .chip{font-size:10px;padding:6px 10px}}
`;
document.head.append(gradientSceneStyle);

function gradientCopyRegion(sceneKey){
 const layout=gradientCopyLayouts.find(s=>s.brand===state.brand&&s.scene===sceneKey);if(!layout)return null;
 const items=layout.items.filter(n=>n.type==='text'&&(sceneKey!=='banner'||n.x<layout.w*.65));if(!items.length)return null;
 const x=Math.min(...items.map(n=>n.x)),y=Math.min(...items.map(n=>n.y)),right=Math.max(...items.map(n=>n.x+n.w)),bottom=Math.max(...items.map(n=>n.y+n.h));
 return [Math.max(0,x/layout.w),Math.max(0,y/layout.h),Math.min(1,(right-x)/layout.w),Math.min(1,(bottom-y)/layout.h)];
}
