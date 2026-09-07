(function initGradientPreferenceWorkbench() {
  const STORAGE_LOG = 'capcut-gradient-preference-log-v1';
  // v2 starts from the organic-rhythm model; keep the v1 override untouched so it remains recoverable.
  const STORAGE_MODEL = 'capcut-gradient-preference-local-model-v2';
  const STORAGE_MODE = 'capcut-gradient-workbench-mode-v1';
  const PILOT_TEMPLATE = 'petalStack';
  const LOCAL_WORKBENCH = location.hostname === '127.0.0.1' || location.hostname === 'localhost';
  const PUBLIC_PREVIEW = new URLSearchParams(location.search).get('preview') === 'public';
  const growthLabels = {
    'right-bottom': '右下生长',
    'bottom-right': '下方偏右',
    'right-side': '右侧生长',
  };
  const floralStyleLabels = ['局部大花瓣', '多层叠瓣', '虚化散开'];

  const style = document.createElement('style');
  style.textContent = `
    .pref-mode-switch{display:flex;padding:3px;border:1px solid #30333c;border-radius:9px;background:#15161b}
    .pref-mode-switch button{border:0;border-radius:6px;background:transparent;color:#8c8f99;padding:6px 10px;font-size:10px;cursor:pointer}
    .pref-mode-switch button.active{background:#f5f6f8;color:#111217}
    .pref-lab{margin-top:18px;padding-top:18px;border-top:1px solid var(--line)}
    .pref-lab-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin-bottom:12px}
    .pref-lab-title strong{display:block;font-size:12px;margin-bottom:5px}
    .pref-lab-title span{display:block;color:#777b85;font-size:9px;line-height:1.55;max-width:670px}
    .pref-actions{display:flex;align-items:center;justify-content:flex-end;gap:7px;flex-wrap:wrap}
    .pref-actions select,.pref-reason select{height:32px;border:1px solid #30333c;border-radius:8px;background:#17191f;color:#eceef3;padding:0 9px;font-size:10px}
    .pref-note{padding:14px;border:1px dashed #343741;border-radius:11px;color:#858995;font-size:10px;line-height:1.6;background:#111216}
    .pref-template-panel .pref-panel-note{margin:-5px 0 10px;color:#777b85;font-size:9px;line-height:1.5}
    .pref-template-fields{display:grid;grid-template-columns:1fr 1fr;gap:9px 8px}
    .pref-template-fields .field{margin:0}
    .pref-template-fields .field.pref-wide{grid-column:1/-1}
    .pref-template-fields .field-head{font-size:8px;margin-bottom:4px}
    .pref-range-ends{display:flex;justify-content:space-between;color:#777b85;font-size:9px;margin-top:3px}
    .pref-template-fields select{width:100%;height:31px;border:1px solid #30333c;border-radius:8px;background:#17191f;color:#eceef3;padding:0 8px;font-size:10px}
    .pref-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}
    .pref-card{min-width:0;border:1px solid #2a2d35;border-radius:10px;background:#121318;overflow:hidden;transition:border-color .16s,transform .16s}
    .pref-card:hover{border-color:#555a68;transform:translateY(-1px)}
    .pref-card.is-applied{border-color:#f2f4f7;box-shadow:0 0 0 1px #f2f4f722}
    .pref-card[data-decision="keep"]{border-color:#4ade80}
    .pref-card[data-decision="reject"]{opacity:.48}
    .pref-preview{position:relative;height:112px;background:#20222a;display:grid;place-items:center;overflow:hidden;cursor:pointer}
    .pref-preview[data-scene="banner"]{height:76px}
    .pref-preview[data-scene="app"],.pref-preview[data-scene="web"]{height:132px}
    .pref-preview canvas{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
    .pref-copy{position:absolute;inset:0;z-index:1;pointer-events:none;color:#111217;font-family:Arial,"PingFang SC",sans-serif;text-shadow:0 1px 7px #ffffff8c}
    .pref-copy-banner{display:flex;align-items:center;justify-content:space-between;padding:17px 13px 8px;gap:8px}
    .pref-copy-banner .pref-copy-lines{width:59%;min-width:0}
    .pref-copy-badges{display:flex;gap:3px;margin-bottom:4px}.pref-copy-badges i{padding:2px 4px;border-radius:999px;background:#fff;color:#111217;font-size:6px;font-style:normal;font-weight:700}
    .pref-copy-title{font-size:10px;font-weight:750;line-height:1.16;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .pref-copy-sub{margin-top:4px;font-size:8px;font-weight:700;line-height:1.15;color:var(--pref-accent,#e57b16);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .pref-countdown{display:flex;gap:2px;align-items:center}
    .pref-countdown i{display:flex;flex-direction:column;align-items:center;justify-content:center;width:20px;height:24px;border-radius:5px;background:#ffffffd9;color:#111217;font-size:8px;font-style:normal;font-weight:750}.pref-countdown small{font-size:4px;font-weight:500;opacity:.55}
    .pref-copy-product{display:grid;place-content:center;text-align:center;padding:22px}
    .pref-copy-product .pref-copy-title{font-size:11px}
    .pref-copy-product .pref-copy-sub{font-size:13px;color:var(--pref-accent,#ff8a1e);margin-top:5px}
    .pref-rank{position:absolute;left:7px;top:7px;padding:3px 6px;border-radius:999px;background:#0b0c10b8;color:white;font-size:9px;backdrop-filter:blur(8px)}
    .pref-score{position:absolute;right:7px;top:7px;padding:3px 6px;border-radius:999px;background:#0b0c10b8;color:#cfd2da;font-size:9px;backdrop-filter:blur(8px)}
    .pref-card-body{padding:8px}
    .pref-summary{display:flex;align-items:center;justify-content:space-between;gap:6px;margin-bottom:6px}
    .pref-summary strong{font-size:10px}.pref-summary span{font-size:9px;color:#8e929c}
    .pref-key-metrics{display:flex;gap:4px;margin-bottom:7px;overflow:hidden}
    .pref-key-metrics span{padding:3px 5px;border-radius:5px;background:#1b1d23;color:#999da7;font-size:8px;white-space:nowrap}
    .pref-details{margin:0 0 7px;border-top:1px solid #252830;padding-top:5px}
    .pref-details summary{color:#777b85;font-size:8px;cursor:pointer;list-style:none}
    .pref-details summary::-webkit-details-marker{display:none}
    .pref-details summary::after{content:' +';color:#a5a9b3}
    .pref-details[open] summary::after{content:' −'}
    .pref-params{display:grid;grid-template-columns:1fr 1fr;gap:4px 8px;margin-top:6px}
    .pref-params span{display:flex;justify-content:space-between;gap:8px;color:#777b85;font-size:8px;line-height:1.35}
    .pref-params b{color:#c9ccd4;font-weight:550;white-space:nowrap}
    .pref-card-actions{display:grid;grid-template-columns:1.15fr 1fr 1fr;gap:5px}
    .pref-card-actions .button{padding:6px 5px;font-size:8px;white-space:nowrap}
    .pref-lightbox{position:fixed;inset:0;z-index:9999;display:grid;place-items:center;padding:28px;background:#05060ae8;backdrop-filter:blur(14px)}
    .pref-lightbox[hidden]{display:none}
    .pref-lightbox-dialog{width:min(1080px,92vw);max-height:92vh;display:grid;gap:10px;padding:12px;border:1px solid #3b3f49;border-radius:14px;background:#111318;box-shadow:0 28px 90px #000b}
    .pref-lightbox-stage{position:relative;width:100%;max-height:76vh;margin:auto;overflow:hidden;border-radius:10px;background:#20222a}
    .pref-lightbox-stage canvas{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
    .pref-lightbox-stage .pref-copy-banner{padding:7% 5% 4%}.pref-lightbox-stage .pref-copy-title{font-size:clamp(18px,2.4vw,38px)}
    .pref-lightbox-stage .pref-copy-sub{font-size:clamp(14px,1.8vw,29px)}
    .pref-lightbox-stage .pref-countdown{gap:6px}.pref-lightbox-stage .pref-countdown i{width:52px;height:62px;font-size:22px;border-radius:10px}
    .pref-lightbox-stage .pref-copy-product .pref-copy-title{font-size:clamp(20px,3vw,42px)}
    .pref-lightbox-stage .pref-copy-product .pref-copy-sub{font-size:clamp(25px,4vw,58px)}
    .pref-lightbox-actions{display:flex;align-items:center;justify-content:space-between;gap:8px}
    .pref-lightbox-actions strong{font-size:11px}.pref-lightbox-actions div{display:flex;gap:7px}
    .pref-author-tools{display:none;margin:0 0 11px;padding:9px 10px;border:1px solid #292c34;border-radius:10px;background:#111216;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap}
    .pref-reason{display:flex;align-items:center;gap:7px;color:#8b8f99;font-size:9px}
    .pref-data-actions{display:flex;gap:6px;flex-wrap:wrap}
    .pref-stats{color:#777b85;font-size:9px}
    .all-copy-fields{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:12px 0}.all-copy-fields .field{margin:0}.all-copy-fields .field-head{margin-bottom:4px;font-size:8px}
    body[data-pref-mode="author"] .pref-author-tools{display:flex}
    body[data-pref-mode="author"] .pref-author-only{display:inline-flex}
    body[data-pref-mode="public"] .pref-author-only{display:none!important}
    body[data-pref-mode="public"] .pref-template-panel{display:block}
    body[data-pref-mode="public"] .pref-template-panel[hidden]{display:none!important}
    body[data-pref-mode="public"] .pref-template-fields .field:not(.pref-public-petal){display:none}
    body[data-pref-mode="public"] .pref-score,body[data-pref-mode="public"] .pref-rank,body[data-pref-mode="public"] .pref-details{display:none}
    body[data-pref-mode="public"] .pref-lab-title strong{font-size:13px}
    body[data-pref-mode="public"] .pref-lab-title span{display:none}
    body[data-pref-mode="public"] .pref-card{cursor:pointer}
    body[data-pref-mode="public"] .pref-card-body{display:none}
    body[data-pref-mode="public"] .pref-card-actions{display:none}
    body[data-pref-mode="public"] .curve-anchor,
    body[data-pref-mode="public"] .curve-overlay{display:none!important}
    @media(max-width:1460px){.pref-grid{grid-template-columns:repeat(3,minmax(0,1fr))}}
    @media(max-width:1050px){.pref-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
    @media(max-width:760px){.pref-grid{grid-template-columns:1fr}.pref-lab-head{flex-direction:column}.pref-actions{justify-content:flex-start}}
  `;
  document.head.append(style);

  const modeSwitch = document.createElement('div');
  modeSwitch.className = 'pref-mode-switch';
  modeSwitch.setAttribute('aria-label', '工作台模式');
  modeSwitch.innerHTML = `
    <button type="button" data-pref-mode="public">使用模式</button>
    <button type="button" data-pref-mode="author">我的模板工作台</button>
  `;
  document.querySelector('.header-actions').prepend(modeSwitch);
  modeSwitch.hidden = !LOCAL_WORKBENCH || PUBLIC_PREVIEW;

  const lab = document.createElement('section');
  lab.className = 'pref-lab';
  lab.id = 'preference-lab';
  lab.innerHTML = `
    <div class="pref-lab-head">
      <div class="pref-lab-title">
        <strong>批量候选与选择记录</strong>
        <span id="pref-description">微距花卉会在内部混合多种造花方法，每轮给出形态明显不同的候选；本地生成，不调用任何 AI API。</span>
      </div>
      <div class="pref-actions">
        <select id="pref-count" aria-label="候选数量">
          <option value="6">6 组</option>
          <option value="8">8 组</option>
          <option value="10" selected>10 组</option>
          <option value="12">12 组</option>
        </select>
        <button type="button" class="button primary" id="pref-generate">生成候选</button>
      </div>
    </div>
    <div class="pref-author-tools">
      <div class="pref-reason">
        <span>淘汰原因</span>
        <select id="pref-reject-reason">
          <option value="太均匀">太均匀</option>
          <option value="太乱">太乱</option>
          <option value="花瓣不明显">花瓣不明显</option>
          <option value="影响文字">影响文字</option>
          <option value="颜色比例不对">颜色比例不对</option>
          <option value="其他">其他</option>
        </select>
      </div>
      <span class="pref-stats" id="pref-stats">尚无选择记录</span>
      <div class="pref-data-actions">
        <button type="button" class="button" id="pref-train">根据本机选择更新排序</button>
        <button type="button" class="button" id="pref-export-log">导出选择记录</button>
        <button type="button" class="button" id="pref-export-model">导出排序模型</button>
        <button type="button" class="button ghost" id="pref-reset-model">恢复发布模型</button>
      </div>
    </div>
    <div class="pref-note" id="pref-note">请选择“微距花卉”。普通使用模式只需要生成、选择和导出。</div>
    <div class="pref-grid" id="pref-grid" hidden></div>
  `;
  document.querySelector('.templates').after(lab);

  const lightbox = document.createElement('div');
  lightbox.className = 'pref-lightbox';
  lightbox.hidden = true;
  lightbox.innerHTML = `
    <div class="pref-lightbox-dialog" role="dialog" aria-modal="true" aria-label="花卉候选大图">
      <div class="pref-lightbox-stage"></div>
      <div class="pref-lightbox-actions">
        <strong id="pref-lightbox-title">花卉候选</strong>
        <div><button type="button" class="button primary" id="pref-lightbox-use">使用这套</button><button type="button" class="button" id="pref-lightbox-close">关闭</button></div>
      </div>
    </div>`;
  document.body.append(lightbox);

  const templatePanel = document.createElement('div');
  templatePanel.className = 'group pref-template-panel';
  templatePanel.innerHTML = `
    <h3>当前模板专属参数</h3>
    <p class="pref-panel-note" id="pref-panel-note">这些参数仅在你的本机模板工作台中出现，不展示给普通使用者。</p>
    <div class="pref-template-fields" id="pref-template-fields"></div>
  `;
  const shapeGroup = [...document.querySelectorAll('.side > .group')].find(group => group.querySelector('h3')?.textContent === '形态与质感');
  if (shapeGroup) shapeGroup.before(templatePanel);

  const grid = lab.querySelector('#pref-grid');
  const note = lab.querySelector('#pref-note');
  const stats = lab.querySelector('#pref-stats');
  const countSelect = lab.querySelector('#pref-count');
  const rejectReason = lab.querySelector('#pref-reject-reason');
  const templateFields = templatePanel.querySelector('#pref-template-fields');
  const templatePanelNote = templatePanel.querySelector('#pref-panel-note');
  let publishedModel = null;
  let activeModel = null;
  let candidates = [];
  let appliedCandidateId = '';
  const editableCopy = {
    badge1: document.querySelector('#preview-badges i:nth-child(1)')?.textContent || '全球首发',
    badge2: document.querySelector('#preview-badges i:nth-child(2)')?.textContent || '抢先体验',
    miniBadge: document.querySelector('.mini-badge')?.textContent || 'Mini',
    qualityLabel: document.querySelector('.quality-stack b')?.textContent || '720P',
    launchLabel: document.querySelector('.quality-stack span')?.textContent || '首发',
    lowWord: document.querySelector('.low-word')?.textContent || '低至',
    priceUnit: document.querySelector('.price-unit')?.textContent || '元/秒',
    countdownValues: [...document.querySelectorAll('#countdown i b')].map(item => item.textContent),
    countdownLabels: [...document.querySelectorAll('#countdown i small')].map(item => item.textContent),
  };

  const copyFields = [
    ['badge1', '标签 1', 'banner'], ['badge2', '标签 2', 'banner'],
    ['miniBadge', '产品徽标', 'product'], ['qualityLabel', '清晰度', 'product'],
    ['launchLabel', '规格副标', 'product'], ['lowWord', '价格前缀', 'product'],
    ['priceUnit', '价格单位', 'product'],
  ];

  function editableCopyValue(key) {
    const [name, index] = key.split('.');
    return index === undefined ? editableCopy[name] : editableCopy[name][Number(index)];
  }

  function setEditableCopyValue(key, value) {
    const [name, index] = key.split('.');
    if (index === undefined) editableCopy[name] = value;
    else editableCopy[name][Number(index)] = value;
  }

  function applyEditableCopy() {
    const badges = document.querySelectorAll('#preview-badges i');
    if (badges[0]) badges[0].textContent = editableCopy.badge1;
    if (badges[1]) badges[1].textContent = editableCopy.badge2;
    const setText = (selector, value) => { const element = document.querySelector(selector); if (element) element.textContent = value; };
    setText('.mini-badge', editableCopy.miniBadge);
    setText('.quality-stack b', editableCopy.qualityLabel);
    setText('.quality-stack span', editableCopy.launchLabel);
    setText('.low-word', editableCopy.lowWord);
    setText('.price-unit', editableCopy.priceUnit);
    document.querySelectorAll('#countdown i').forEach((item, index) => {
      const value = item.querySelector('b');
      const label = item.querySelector('small');
      if (value) value.textContent = editableCopy.countdownValues[index] || '';
      if (label) label.textContent = editableCopy.countdownLabels[index] || '';
    });
  }

  const copyFieldGrid = document.createElement('div');
  copyFieldGrid.className = 'all-copy-fields';
  copyFields.forEach(([key, label, context]) => {
    const field = document.createElement('div');
    field.className = 'field';
    field.dataset.copyContext = context;
    field.innerHTML = `<div class="field-head"><span>${label}</span></div><input class="text-input" data-copy-field="${key}">`;
    const input = field.querySelector('input');
    input.value = editableCopyValue(key);
    input.addEventListener('input', () => {
      setEditableCopyValue(key, input.value);
      applyEditableCopy();
      refreshCandidateCopy();
    });
    copyFieldGrid.append(field);
  });
  const copySettingsGroup = document.querySelector('#title-input')?.closest('.group');
  copySettingsGroup?.querySelector('.switch-row')?.before(copyFieldGrid);

  function syncCopyFieldVisibility() {
    const context = state.scene === 'banner' ? 'banner' : 'product';
    copyFieldGrid.querySelectorAll('[data-copy-context]').forEach(field => {
      field.hidden = field.dataset.copyContext !== context;
    });
    applyEditableCopy();
  }
  const petalControlSchema = [
    { key: 'floralStyle', label: '内部造花方法', wide: true, options: [['0', '局部大花瓣'], ['1', '多层叠瓣'], ['2', '虚化散开']] },
    { key: 'layerCount', label: '花瓣层数', min: 1, max: 3, step: 1, integer: true, unit: '层' },
    { key: 'petalCount', label: '每层片数', min: 3, max: 4, step: 1, integer: true, unit: '片' },
    { key: 'petalWidth', label: '花瓣宽度', wide: true, min: .5, max: 1.6, step: .05, defaultValue: 1, ends: ['纤细', '饱满'] },
    { key: 'layerGap', label: '层间透气', min: .08, max: .26, step: .01 },
    { key: 'layerStagger', label: '层间错位', min: .08, max: .52, step: .01 },
    { key: 'rhythm', label: '疏密节奏', min: .58, max: .98, step: .01 },
    { key: 'sizeRatio', label: '主次大小比', min: .34, max: .76, step: .01 },
    { key: 'growthPositionT', label: '生长位置', wide: true, min: 0, max: 1, step: .01, defaultValue: .5, ends: ['下方偏右', '右下角', '右侧'] },
    { key: 'crop', label: '裁切比例', min: .20, max: .62, step: .01 },
    { key: 'overlap', label: '重合度', min: .16, max: .62, step: .01 },
    { key: 'asymmetry', label: '非对称度', min: .42, max: .98, step: .01 },
    { key: 'sharpness', label: '尖圆度', min: .20, max: .95, step: .01 },
    { key: 'curvature', label: '弯曲度', min: .16, max: .94, step: .01 },
    { key: 'fan', label: '开合度', min: .18, max: .96, step: .01 },
    { key: 'edgeDefinition', label: '边缘清晰度', min: .24, max: .92, step: .01 },
    { key: 'cyanShare', label: '青色占比', min: .42, max: .74, step: .01 },
    { key: 'lightArea', label: '白色/浅青', min: .18, max: .38, step: .01 },
    { key: 'warmArea', label: '黄橙面积', min: .09, max: .20, step: .01 },
    { key: 'depth', label: '远近虚实', min: .55, max: .94, step: .01 },
  ];
  const publicPetalControls = new Set(['layerCount', 'petalCount', 'petalWidth', 'layerGap', 'layerStagger', 'growthPositionT', 'depth']);

  function displayControlValue(control, value) {
    if (control.key === 'growthPositionT') return `${value < .25 ? '下方偏右' : value > .75 ? '右侧' : '右下角'} · ${Math.round(value * 100)}%`;
    return control.integer ? `${Math.round(value)} ${control.unit || ''}`.trim() : `${Math.round(value * 100)}%`;
  }

  function optionLabel(control, value) {
    return control.options?.find(([optionValue]) => String(optionValue) === String(value))?.[1] || String(value);
  }

  function buildPetalControls() {
    templateFields.innerHTML = '';
    petalControlSchema.forEach(control => {
      const field = document.createElement('div');
      field.className = `field${control.wide ? ' pref-wide' : ''}${publicPetalControls.has(control.key) ? ' pref-public-petal' : ''}`;
      const head = document.createElement('div');
      head.className = 'field-head';
      const label = document.createElement('span');
      label.textContent = control.label;
      const value = document.createElement('b');
      value.dataset.petalValue = control.key;
      head.append(label, value);
      let input;
      if (control.options) {
        input = document.createElement('select');
        control.options.forEach(([optionValue, optionLabel]) => {
          const option = document.createElement('option');
          option.value = optionValue;
          option.textContent = optionLabel;
          input.append(option);
        });
      } else {
        input = document.createElement('input');
        input.type = 'range';
        input.min = control.min;
        input.max = control.max;
        input.step = control.step;
      }
      input.dataset.petalParam = control.key;
      input.setAttribute('aria-label', control.label);
      field.append(head, input);
      if (control.ends) {
        const ends = document.createElement('div');
        ends.className = 'pref-range-ends';
        control.ends.forEach(text => {
          const label = document.createElement('span');
          label.textContent = text;
          ends.append(label);
        });
        field.append(ends);
      }
      templateFields.append(field);
    });
  }

  function syncPetalControlPanel() {
    const enabled = state.template === PILOT_TEMPLATE;
    templatePanel.hidden = !enabled;
    templateFields.hidden = !enabled;
    templatePanel.querySelector('h3').textContent = document.body.dataset.prefMode === 'public' ? '花卉细节' : '当前模板专属参数';
    templatePanelNote.textContent = enabled
      ? document.body.dataset.prefMode === 'public'
        ? '选好一套后，可继续调整花瓣数量、宽度、层次间距、生长位置和远近虚实。'
        : '内部造花方法、层数与每层片数会真正改变结构；层间透气、错位和虚实控制花瓣层次。'
      : '当前模板沿用通用形态控制；只有进入单独试点后才会显示匹配该形态的专属参数。';
    if (!enabled) return;
    const preference = fieldProfiles[PILOT_TEMPLATE].preference || {};
    petalControlSchema.forEach(control => {
      const input = templateFields.querySelector(`[data-petal-param="${control.key}"]`);
      const current = control.key === 'growthPositionT' ? floralGrowthProgress(preference)
        : preference[control.key] ?? activeModel?.templates?.[PILOT_TEMPLATE]?.targets?.[control.key] ?? control.defaultValue ?? control.min;
      input.value = current;
      const value = templateFields.querySelector(`[data-petal-value="${control.key}"]`);
      value.textContent = control.options ? optionLabel(control, current) : displayControlValue(control, current);
    });
  }

  function safeRead(key, fallback) {
    try {
      const value = localStorage.getItem(key);
      return value ? JSON.parse(value) : fallback;
    } catch (error) {
      console.warn('Local preference data unavailable', error);
      return fallback;
    }
  }

  function safeWrite(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.warn('Unable to store local preference data', error);
      return false;
    }
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function hydrateStoredModel(base, stored) {
    if (!stored?.templates?.[PILOT_TEMPLATE]) return clone(base);
    const baseCopy = clone(base);
    const storedTemplate = stored.templates[PILOT_TEMPLATE];
    baseCopy.modelId = stored.modelId || baseCopy.modelId;
    baseCopy.trainingState = stored.trainingState || baseCopy.trainingState;
    baseCopy.trainingMeta = stored.trainingMeta || baseCopy.trainingMeta;
    baseCopy.templates[PILOT_TEMPLATE] = {
      ...baseCopy.templates[PILOT_TEMPLATE],
      ...storedTemplate,
      targets: { ...baseCopy.templates[PILOT_TEMPLATE].targets },
      weights: { ...baseCopy.templates[PILOT_TEMPLATE].weights, ...(storedTemplate.weights || {}) },
      hardConstraints: { ...baseCopy.templates[PILOT_TEMPLATE].hardConstraints },
    };
    return baseCopy;
  }

  function prefRng(seed) {
    let value = seed >>> 0;
    return () => {
      value += 0x6D2B79F5;
      let result = value;
      result = Math.imul(result ^ result >>> 15, result | 1);
      result ^= result + Math.imul(result ^ result >>> 7, result | 61);
      return ((result ^ result >>> 14) >>> 0) / 4294967296;
    };
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function fitScore(value, target, radius) {
    return clamp(1 - Math.abs(value - target) / radius, 0, 1);
  }

  function featureVector(params, config) {
    const target = config.targets;
    return {
      countFit: fitScore(params.petalCount, target.petalCount, 2.1),
      layerFit: fitScore(params.layerCount, target.layerCount, 1.4),
      breathingFit: fitScore(params.layerGap, target.layerGap, .14),
      staggerFit: fitScore(params.layerStagger, target.layerStagger, .30),
      rhythmFit: fitScore(params.rhythm, target.rhythm, .25),
      hierarchyFit: fitScore(params.sizeRatio, target.sizeRatio, .28),
      cropFit: fitScore(params.crop, target.crop, .28),
      overlapFit: fitScore(params.overlap, target.overlap, .3),
      asymmetry: params.asymmetry,
      warmSafety: params.warmArea <= .18 ? fitScore(params.warmArea, target.warmArea, .09) : fitScore(params.warmArea, .15, .06),
      spreadFit: fitScore(params.spread, target.spread, .38),
      depthFit: fitScore(params.depth, target.depth, .32),
      sharpnessFit: fitScore(params.sharpness, target.sharpness, .42),
      curvatureFit: fitScore(params.curvature, target.curvature, .44),
      fanFit: fitScore(params.fan, target.fan, .44),
      edgeFit: fitScore(params.edgeDefinition, target.edgeDefinition, .38),
      cyanSafety: fitScore(params.cyanShare, target.cyanShare, .24),
      lightSafety: fitScore(params.lightArea, target.lightArea, .14),
      anchorSafety: params.growthPosition === 'right-bottom' ? 1 : params.growthPosition === 'bottom-right' ? .93 : .84,
      threeLayerFit: params.layerCount === 3 ? 1 : params.layerCount === 2 ? .35 : 0,
      ghostStyleFit: params.floralStyle === 2 ? 1 : params.floralStyle === 1 ? .24 : 0,
    };
  }

  function candidateScore(features, config) {
    return Object.entries(features).reduce((sum, [key, value]) => sum + value * (config.weights[key] || 0), 0);
  }

  function sampleParams(random, config) {
    const limits = config.hardConstraints;
    const positions = config.allowedGrowthPositions;
    const between = key => limits[key][0] + random() * (limits[key][1] - limits[key][0]);
    return {
      floralStyle: Math.floor(random() * 3),
      layerCount: Math.floor(limits.layerCount[0] + random() * (limits.layerCount[1] - limits.layerCount[0] + 1)),
      petalCount: Math.floor(limits.petalCount[0] + random() * (limits.petalCount[1] - limits.petalCount[0] + 1)),
      petalWidth: 1,
      layerGap: between('layerGap'),
      layerStagger: between('layerStagger'),
      rhythm: between('rhythm'),
      sizeRatio: between('sizeRatio'),
      growthPosition: positions[Math.floor(random() * positions.length)],
      crop: between('crop'),
      overlap: between('overlap'),
      asymmetry: between('asymmetry'),
      warmArea: between('warmArea'),
      spread: between('spread'),
      depth: between('depth'),
      sharpness: between('sharpness'),
      curvature: between('curvature'),
      fan: between('fan'),
      edgeDefinition: between('edgeDefinition'),
      cyanShare: between('cyanShare'),
      lightArea: between('lightArea'),
    };
  }

  function makeNodes(params, random) {
    const presets = {
      'right-bottom': {
        base: [1 + params.crop * .2, .94 + params.crop * .18],
        tips: [[.18, .50], [.43, .12], [.73, .18]],
      },
      'bottom-right': {
        base: [.78 + params.crop * .08, 1 + params.crop * .2],
        tips: [[.16, .54], [.46, .14], [.81, .28]],
      },
      'right-side': {
        base: [1 + params.crop * .2, .70],
        tips: [[.16, .40], [.46, .08], [.76, .32]],
      },
    };
    const preset = presets[params.growthPosition];
    const center = preset.tips.reduce((sum, node) => [sum[0] + node[0] / 3, sum[1] + node[1] / 3], [0, 0]);
    const separation = (.62 + params.spread * .72) * (1 - params.overlap * .12);
    const jitter = .105 * params.asymmetry;
    const tips = preset.tips.map((node, index) => [
      clamp(center[0] + (node[0] - center[0]) * separation + (random() - .5) * jitter * (index + 1) / 2, -.16, 1.12),
      clamp(center[1] + (node[1] - center[1]) * separation + (random() - .5) * jitter, -.18, 1.08),
    ]);
    return [tips[0], tips[1], tips[2], preset.base];
  }

  function applyPetalControls() {
    if (state.template !== PILOT_TEMPLATE) return;
    const profile = fieldProfiles[PILOT_TEMPLATE];
    const next = { ...(profile.preference || {}) };
    petalControlSchema.forEach(control => {
      const input = templateFields.querySelector(`[data-petal-param="${control.key}"]`);
      next[control.key] = control.options ? input.value : Number(input.value);
      const value = templateFields.querySelector(`[data-petal-value="${control.key}"]`);
      value.textContent = control.options ? optionLabel(control, input.value) : displayControlValue(control, next[control.key]);
    });
    // Keep the categorical value for compatibility with existing ranking logs;
    // rendering uses the full continuous position, without snapping to categories.
    next.growthPosition = next.growthPositionT < .25 ? 'bottom-right' : next.growthPositionT > .75 ? 'right-side' : 'right-bottom';
    profile.preference = next;
    profile.nodes = makeNodes(next, prefRng(state.seed || 1));
    appliedCandidateId = '';
    grid.querySelector('.pref-card.is-applied')?.classList.remove('is-applied');
    renderFieldAnchors();
    render();
  }

  function parameterDistance(a, b) {
    const positionDistance = a.growthPosition === b.growthPosition ? 0 : .8;
    const styleDistance = a.floralStyle === b.floralStyle ? 0 : 1.4;
    return (
      styleDistance +
      Math.abs(a.layerCount - b.layerCount) / 2 +
      Math.abs(a.petalCount - b.petalCount) / 3 +
      Math.abs(a.layerGap - b.layerGap) / .18 +
      Math.abs(a.layerStagger - b.layerStagger) / .44 +
      Math.abs(a.rhythm - b.rhythm) / .40 +
      Math.abs(a.sizeRatio - b.sizeRatio) / .42 +
      Math.abs(a.crop - b.crop) / .42 +
      Math.abs(a.overlap - b.overlap) / .46 +
      Math.abs(a.asymmetry - b.asymmetry) / .56 +
      Math.abs(a.spread - b.spread) / .58 +
      Math.abs(a.sharpness - b.sharpness) / .75 +
      Math.abs(a.curvature - b.curvature) / .78 +
      Math.abs(a.fan - b.fan) / .78 +
      Math.abs(a.edgeDefinition - b.edgeDefinition) / .68 +
      Math.abs(a.cyanShare - b.cyanShare) / .34 +
      Math.abs(a.lightArea - b.lightArea) / .20 +
      positionDistance
    ) / 18;
  }

  function generateCandidateSet() {
    if (!activeModel || state.template !== PILOT_TEMPLATE) return [];
    const config = activeModel.templates[PILOT_TEMPLATE];
    const desired = Number(countSelect.value) || config.candidateCount || 8;
    const batchSeed = (Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0;
    const pool = [];
    const poolSize = Math.max(config.samplePool || 48, desired * 4);
    for (let index = 0; index < poolSize; index += 1) {
      const seed = (batchSeed + Math.imul(index + 1, 2654435761)) >>> 0;
      const random = prefRng(seed);
      const params = sampleParams(random, config);
      const features = featureVector(params, config);
      pool.push({
        id: `${seed.toString(16)}-${index}`,
        seed,
        params,
        features,
        nodes: makeNodes(params, random),
        phase: random(),
        warp: .028 + random() * .045,
        score: candidateScore(features, config),
      });
    }
    pool.sort((a, b) => b.score - a.score);
    const selected = [];
    for (let floralStyle = 0; floralStyle < 3 && selected.length < desired; floralStyle += 1) {
      const representative = pool.find(candidate => candidate.params.floralStyle === floralStyle && !selected.includes(candidate));
      if (representative) {
        representative.batchRole = '结构';
        selected.push(representative);
      }
    }
    const stableCount = Math.ceil(desired * .62);
    for (const candidate of pool) {
      if (selected.length >= stableCount) break;
      if (selected.every(item => parameterDistance(item.params, candidate.params) >= .085)) {
        candidate.batchRole = '稳妥';
        selected.push(candidate);
      }
    }
    const explorationPool = pool.slice(0, Math.ceil(pool.length * .82)).filter(candidate => !selected.includes(candidate));
    while (selected.length < desired && explorationPool.length) {
      const high = pool[0].score;
      const low = pool[pool.length - 1].score;
      explorationPool.sort((a, b) => {
        const aDistance = Math.min(...selected.map(item => parameterDistance(item.params, a.params)));
        const bDistance = Math.min(...selected.map(item => parameterDistance(item.params, b.params)));
        const aQuality = (a.score - low) / Math.max(.001, high - low);
        const bQuality = (b.score - low) / Math.max(.001, high - low);
        return (bDistance * 2.4 + bQuality * .24) - (aDistance * 2.4 + aQuality * .24);
      });
      const candidate = explorationPool.shift();
      candidate.batchRole = '探索';
      selected.push(candidate);
    }
    return selected;
  }

  function snapshotProfile(templateKey) {
    const profile = fieldProfiles[templateKey];
    return {
      template: state.template,
      seed: state.seed,
      nodes: profile.nodes.map(node => [...node]),
      phase: profile.phase,
      warp: profile.warp,
      preference: clone(profile.preference || {}),
    };
  }

  function writeCandidateToProfile(candidate, templateKey = PILOT_TEMPLATE) {
    const profile = fieldProfiles[templateKey];
    profile.nodes = candidate.nodes.map(node => [...node]);
    profile.phase = candidate.phase;
    profile.warp = candidate.warp;
    profile.preference = clone(candidate.params);
    state.seed = candidate.seed;
  }

  function restoreProfile(snapshot, templateKey = PILOT_TEMPLATE) {
    const profile = fieldProfiles[templateKey];
    profile.nodes = snapshot.nodes;
    profile.phase = snapshot.phase;
    profile.warp = snapshot.warp;
    profile.preference = snapshot.preference;
    state.template = snapshot.template;
    state.seed = snapshot.seed;
  }

  function renderCandidateCanvas(candidate, target) {
    const snapshot = snapshotProfile(PILOT_TEMPLATE);
    state.template = PILOT_TEMPLATE;
    writeCandidateToProfile(candidate);
    const scene = scenes[state.scene];
    const maxWidth = 360;
    const outputScale = Math.min(.5, maxWidth / scene.size[0]);
    render(target, state.scene, outputScale);
    restoreProfile(snapshot);
  }

  function formatPercent(value) {
    return `${Math.round(value * 100)}%`;
  }

  function cardParameters(params) {
    return [
      ['造花方法', floralStyleLabels[params.floralStyle] || floralStyleLabels[1]],
      ['花瓣层数', `${params.layerCount} 层`],
      ['每层片数', `${params.petalCount} 片`],
      ['花瓣宽度', formatPercent(params.petalWidth ?? 1)],
      ['层间透气', formatPercent(params.layerGap)],
      ['层间错位', formatPercent(params.layerStagger)],
      ['疏密节奏', formatPercent(params.rhythm)],
      ['主次比', formatPercent(params.sizeRatio)],
      ['裁切', formatPercent(params.crop)],
      ['重合', formatPercent(params.overlap)],
      ['不规则', formatPercent(params.asymmetry)],
      ['暖色', formatPercent(params.warmArea)],
      ['展开', formatPercent(params.spread)],
      ['虚实差', formatPercent(params.depth)],
      ['尖圆度', formatPercent(params.sharpness)],
      ['弯曲度', formatPercent(params.curvature)],
      ['开合度', formatPercent(params.fan)],
      ['边缘清晰', formatPercent(params.edgeDefinition)],
      ['青色占比', formatPercent(params.cyanShare)],
      ['浅色面积', formatPercent(params.lightArea)],
    ];
  }

  function buildCandidateCopy() {
    const overlay = document.createElement('div');
    overlay.style.setProperty('--pref-accent', copyPresets[state.brand]?.accent || '#ff9828');
    const titleValue = document.querySelector('#title-input')?.value || '';
    const subValue = document.querySelector('#sub-input')?.value || '';
    const title = document.createElement('div');
    title.className = 'pref-copy-title';
    title.textContent = titleValue;
    const sub = document.createElement('div');
    sub.className = 'pref-copy-sub';
    sub.textContent = state.scene === 'banner'
      ? subValue
      : `${editableCopy.qualityLabel} ${editableCopy.launchLabel} · ${editableCopy.lowWord}${subValue}${editableCopy.priceUnit}`;
    if (state.scene === 'banner') {
      overlay.className = 'pref-copy pref-copy-banner';
      const lines = document.createElement('div');
      lines.className = 'pref-copy-lines';
      const badges = document.createElement('div');
      badges.className = 'pref-copy-badges';
      [editableCopy.badge1, editableCopy.badge2].forEach(value => {
        const badge = document.createElement('i');
        badge.textContent = value;
        badges.append(badge);
      });
      lines.append(badges, title, sub);
      const countdown = document.createElement('div');
      countdown.className = 'pref-countdown';
      editableCopy.countdownValues.forEach((value, index) => {
        const item = document.createElement('i');
        const number = document.createElement('b');
        number.textContent = value;
        const unit = document.createElement('small');
        unit.textContent = editableCopy.countdownLabels[index] || '';
        item.append(number, unit);
        countdown.append(item);
      });
      overlay.append(lines, countdown);
    } else {
      overlay.className = 'pref-copy pref-copy-product';
      overlay.append(title, sub);
    }
    return overlay;
  }

  function refreshCandidateCopy() {
    grid.querySelectorAll('.pref-copy').forEach(copy => copy.replaceWith(buildCandidateCopy()));
  }

  function openLargePreview(candidate) {
    const stage = lightbox.querySelector('.pref-lightbox-stage');
    const scene = scenes[state.scene];
    stage.innerHTML = '';
    stage.style.aspectRatio = `${scene.size[0]} / ${scene.size[1]}`;
    const previewCanvas = document.createElement('canvas');
    renderCandidateCanvas(candidate, previewCanvas);
    stage.append(previewCanvas, buildCandidateCopy());
    lightbox.querySelector('#pref-lightbox-title').textContent = `${floralStyleLabels[candidate.params.floralStyle] || '花卉'} · ${candidate.params.layerCount} 层 · 每层 ${candidate.params.petalCount} 片`;
    lightbox.querySelector('#pref-lightbox-use').onclick = () => {
      applyCandidate(candidate);
      lightbox.querySelector('#pref-lightbox-use').textContent = '已应用到上方大图';
    };
    lightbox.hidden = false;
  }

  function applyCandidate(candidate, announce = true) {
    if (state.template !== PILOT_TEMPLATE) selectPetalTemplate(PILOT_TEMPLATE);
    writeCandidateToProfile(candidate);
    appliedCandidateId = candidate.id;
    syncPetalControlPanel();
    renderCards();
    // Candidate-card rendering temporarily swaps the shared profile many times.
    // Re-apply the chosen profile afterwards so the large canvas always receives
    // the selected candidate rather than whichever preview rendered last.
    writeCandidateToProfile(candidate);
    renderFieldAnchors();
    if (typeof renderSelectedTemplatePreview === 'function') renderSelectedTemplatePreview();
    else render(canvas, state.scene, 2);
    requestAnimationFrame(() => {
      if (appliedCandidateId !== candidate.id) return;
      writeCandidateToProfile(candidate);
      if (typeof renderSelectedTemplatePreview === 'function') renderSelectedTemplatePreview();
      else render(canvas, state.scene, 2);
    });
    if (announce) toast(`已应用${floralStyleLabels[candidate.params.floralStyle] || '花卉'} · ${candidate.params.layerCount} 层`);
  }

  function getLogs() {
    return safeRead(STORAGE_LOG, []);
  }

  function recordDecision(candidate, label, reason = '') {
    const logs = getLogs();
    logs.push({
      schemaVersion: 1,
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      createdAt: new Date().toISOString(),
      modelId: activeModel?.modelId || 'unknown',
      brand: state.brand,
      template: PILOT_TEMPLATE,
      scene: state.scene,
      seed: candidate.seed,
      params: clone(candidate.params),
      features: clone(candidate.features),
      label,
      reason,
    });
    safeWrite(STORAGE_LOG, logs);
    candidate.decision = label;
    updateStats();
    renderCards();
  }

  function updateStats() {
    const logs = getLogs().filter(item => item.template === PILOT_TEMPLATE);
    const kept = logs.filter(item => item.label === 'keep').length;
    const rejected = logs.filter(item => item.label === 'reject').length;
    const used = logs.filter(item => item.label === 'use').length;
    const local = safeRead(STORAGE_MODEL, null);
    stats.textContent = `本机记录：保留 ${kept} · 淘汰 ${rejected} · 使用 ${used}${local ? ' · 已应用本机排序' : ' · 当前为发布排序'}`;
  }

  function renderCards() {
    grid.innerHTML = '';
    if (!candidates.length) {
      grid.hidden = true;
      return;
    }
    grid.hidden = false;
    candidates.forEach((candidate, index) => {
      const card = document.createElement('article');
      card.className = 'pref-card';
      if (candidate.id === appliedCandidateId) card.classList.add('is-applied');
      if (candidate.decision) card.dataset.decision = candidate.decision;
      const preview = document.createElement('div');
      preview.className = 'pref-preview';
      preview.dataset.scene = state.scene;
      const candidateCanvas = document.createElement('canvas');
      renderCandidateCanvas(candidate, candidateCanvas);
      preview.append(candidateCanvas, buildCandidateCopy());
      const rank = document.createElement('span');
      rank.className = 'pref-rank';
      rank.textContent = `候选 ${String(index + 1).padStart(2, '0')} · ${candidate.batchRole || '稳妥'}`;
      const scoreLabel = document.createElement('span');
      scoreLabel.className = 'pref-score';
      scoreLabel.textContent = `排序 ${candidate.score.toFixed(2)}`;
      preview.append(rank, scoreLabel);
      preview.addEventListener('click', event => {
        if (document.body.dataset.prefMode === 'public') return;
        event.stopPropagation();
        applyCandidate(candidate);
        openLargePreview(candidate);
      });

      const body = document.createElement('div');
      body.className = 'pref-card-body';
      const summary = document.createElement('div');
      summary.className = 'pref-summary';
      summary.innerHTML = `<strong>${floralStyleLabels[candidate.params.floralStyle] || floralStyleLabels[1]}</strong><span>${candidate.params.layerCount} 层 · 每层 ${candidate.params.petalCount} 片</span>`;
      const keyMetrics = document.createElement('div');
      keyMetrics.className = 'pref-key-metrics';
      keyMetrics.innerHTML = `<span>${candidate.params.sharpness > .64 ? '偏尖' : '偏圆'}</span><span>疏密 ${formatPercent(candidate.params.rhythm)}</span><span>虚实 ${formatPercent(candidate.params.depth)}</span>`;
      const details = document.createElement('details');
      details.className = 'pref-details';
      const detailsSummary = document.createElement('summary');
      detailsSummary.textContent = '查看完整参数';
      const params = document.createElement('div');
      params.className = 'pref-params';
      cardParameters(candidate.params).forEach(([label, value]) => {
        const item = document.createElement('span');
        item.innerHTML = `${label}<b>${value}</b>`;
        params.append(item);
      });
      details.append(detailsSummary, params);
      const actions = document.createElement('div');
      actions.className = 'pref-card-actions';
      const useButton = document.createElement('button');
      useButton.type = 'button';
      useButton.className = 'button primary pref-use';
      useButton.textContent = candidate.id === appliedCandidateId ? '正在使用' : '使用这套';
      useButton.addEventListener('click', () => {
        applyCandidate(candidate);
        if (document.body.dataset.prefMode === 'public') recordDecision(candidate, 'use');
      });
      const keepButton = document.createElement('button');
      keepButton.type = 'button';
      keepButton.className = 'button pref-author-only';
      keepButton.textContent = '保留';
      keepButton.addEventListener('click', () => {
        applyCandidate(candidate, false);
        recordDecision(candidate, 'keep');
        toast('已记录为保留样本');
      });
      const rejectButton = document.createElement('button');
      rejectButton.type = 'button';
      rejectButton.className = 'button ghost pref-author-only';
      rejectButton.textContent = '淘汰';
      rejectButton.addEventListener('click', () => {
        recordDecision(candidate, 'reject', rejectReason.value);
        toast(`已记录淘汰原因：${rejectReason.value}`);
      });
      actions.append(useButton, keepButton, rejectButton);
      body.append(summary, keyMetrics, details, actions);
      card.append(preview, body);
      card.addEventListener('click', event => {
        if (document.body.dataset.prefMode !== 'public') return;
        if (event.target.closest('button,details')) return;
        applyCandidate(candidate);
        recordDecision(candidate, 'use');
      });
      grid.append(card);
    });
  }

  function refreshCandidatePreviews() {
    if (candidates.length) renderCards();
  }

  function generateAndRender() {
    if (!activeModel) {
      toast('排序模型仍在加载');
      return;
    }
    if (state.template !== PILOT_TEMPLATE) {
      note.hidden = false;
      grid.hidden = true;
      toast('请先选择“微距花卉”');
      return;
    }
    note.hidden = true;
    candidates = generateCandidateSet();
    appliedCandidateId = '';
    renderCards();
    toast(`已在本地生成并排序 ${candidates.length} 组不同花卉`);
  }

  function setMode(mode, persist = true) {
    const normalized = LOCAL_WORKBENCH && mode === 'author' ? 'author' : 'public';
    document.body.dataset.prefMode = normalized;
    modeSwitch.querySelectorAll('button').forEach(button => button.classList.toggle('active', button.dataset.prefMode === normalized));
    if (persist) safeWrite(STORAGE_MODE, normalized);
    syncPetalControlPanel();
    renderCards();
  }

  function downloadJson(filename, value) {
    const blob = new Blob([`${JSON.stringify(value, null, 2)}\n`], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function trainLocalModel() {
    const logs = getLogs().filter(item => item.template === PILOT_TEMPLATE && (item.label === 'keep' || item.label === 'reject'));
    const positive = logs.filter(item => item.label === 'keep');
    const negative = logs.filter(item => item.label === 'reject');
    if (positive.length < 2 || negative.length < 2) {
      toast('至少需要 2 个保留和 2 个淘汰样本');
      return;
    }
    const next = clone(publishedModel);
    const config = next.templates[PILOT_TEMPLATE];
    const average = (items, key) => items.reduce((sum, item) => sum + Number(item.features?.[key] || 0), 0) / items.length;
    Object.keys(config.weights).forEach(key => {
      const delta = average(positive, key) - average(negative, key);
      config.weights[key] = Number(clamp(config.weights[key] + delta * 1.8, -.8, 2.8).toFixed(4));
    });
    next.modelId = `capcut-gradient-preference-local-${new Date().toISOString().slice(0, 10)}`;
    next.trainingState = 'locally-trained-from-pairwise-feedback';
    next.trainingMeta = {
      updatedAt: new Date().toISOString(),
      kept: positive.length,
      rejected: negative.length,
      method: 'mean-feature-difference-v1',
    };
    safeWrite(STORAGE_MODEL, next);
    activeModel = next;
    updateStats();
    generateAndRender();
    toast('已更新本机排序；公共网站文件尚未改变');
  }

  modeSwitch.addEventListener('click', event => {
    const button = event.target.closest('[data-pref-mode]');
    if (button) setMode(button.dataset.prefMode);
  });
  lightbox.querySelector('#pref-lightbox-close').addEventListener('click', () => { lightbox.hidden = true; });
  lightbox.addEventListener('click', event => { if (event.target === lightbox) lightbox.hidden = true; });
  buildPetalControls();
  templateFields.addEventListener('input', applyPetalControls);
  templateFields.addEventListener('change', applyPetalControls);
  lab.querySelector('#pref-generate').addEventListener('click', generateAndRender);
  countSelect.addEventListener('change', () => {
    if (state.template === PILOT_TEMPLATE) generateAndRender();
  });
  lab.querySelector('#pref-export-log').addEventListener('click', () => downloadJson(`gradient-preference-log-${new Date().toISOString().slice(0, 10)}.json`, getLogs()));
  lab.querySelector('#pref-export-model').addEventListener('click', () => downloadJson(`gradient-preference-model-${new Date().toISOString().slice(0, 10)}.json`, activeModel));
  lab.querySelector('#pref-train').addEventListener('click', trainLocalModel);
  lab.querySelector('#pref-reset-model').addEventListener('click', () => {
    try { localStorage.removeItem(STORAGE_MODEL); } catch (error) { console.warn(error); }
    activeModel = clone(publishedModel);
    updateStats();
    if (state.template === PILOT_TEMPLATE) generateAndRender();
    toast('已恢复网站随附的发布排序模型');
  });

  document.querySelector('#templates').addEventListener('click', event => {
    if (!event.target.closest('.template')) return;
    setTimeout(() => {
      if (state.template === PILOT_TEMPLATE) {
        note.hidden = true;
        generateAndRender();
      } else {
        candidates = [];
        note.hidden = false;
        grid.hidden = true;
      }
      syncPetalControlPanel();
    }, 0);
  });
  document.querySelector('#scenes').addEventListener('click', () => setTimeout(() => { syncCopyFieldVisibility(); refreshCandidatePreviews(); }, 0));
  document.querySelector('#scene-list').addEventListener('click', () => setTimeout(() => { syncCopyFieldVisibility(); refreshCandidatePreviews(); }, 0));
  document.querySelector('#brands').addEventListener('click', () => setTimeout(refreshCandidatePreviews, 0));
  document.querySelector('#title-input').addEventListener('input', refreshCandidateCopy);
  document.querySelector('#sub-input').addEventListener('input', refreshCandidateCopy);
  syncCopyFieldVisibility();

  fetch('./gradient-preference-model.json?v=organic-rhythm-1')
    .then(response => {
      if (!response.ok) throw new Error(`Preference model HTTP ${response.status}`);
      return response.json();
    })
    .then(model => {
      publishedModel = model;
      activeModel = hydrateStoredModel(model, safeRead(STORAGE_MODEL, null));
      updateStats();
      setMode(PUBLIC_PREVIEW ? 'public' : safeRead(STORAGE_MODE, 'public'), !PUBLIC_PREVIEW);
      if ((new URLSearchParams(location.search).get('v') || '').startsWith('floral-generator')) {
        selectPetalTemplate(PILOT_TEMPLATE);
      }
      syncPetalControlPanel();
      if (state.template === PILOT_TEMPLATE) generateAndRender();
    })
    .catch(error => {
      console.error('Preference model unavailable', error);
      note.hidden = false;
      note.textContent = '排序模型加载失败。页面其他编辑与导出功能仍可使用。';
    });
})();
