/**
 * 地名生成器 - UI渲染和交互
 */

// === 生成状态 ===
let generated = [];
let saved = getStorage("place-saved", []);

// === DOM元素缓存 ===
const uiElements = {
  randomHint: document.getElementById('randomHint'),
  fillSection: document.getElementById('fillSection'),
  seedInput: document.getElementById('seedInput'),
  region: document.getElementById('region'),
  style: document.getElementById('style'),
  count: document.getElementById('count'),
  countValue: document.getElementById('countValue'),
  relevance: document.getElementById('relevance'),
  relValue: document.getElementById('relValue'),
  relLabel: document.getElementById('relLabel'),
  charCount: document.getElementById('charCount'),
  charValue: document.getElementById('charValue'),
  charLabel: document.getElementById('charLabel'),
  wordbankMix: document.getElementById('wordbankMix'),
  mixValue: document.getElementById('mixValue'),
  mixLabel: document.getElementById('mixLabel'),
  generateBtn: document.getElementById('generateBtn'),
  results: document.getElementById('results'),
  resultTitle: document.getElementById('resultTitle'),
  resultSub: document.getElementById('resultSub'),
  copyBtn: document.getElementById('copyBtn'),
  clearBtn: document.getElementById('clearBtn'),
  exportBtn: document.getElementById('exportBtn'),
  clearSaved: document.getElementById('clearSaved'),
  savedList: document.getElementById('savedList'),
  modalOverlay: document.getElementById('modalOverlay'),
  modalBody: document.getElementById('modalBody'),
  modalClose: document.getElementById('modalClose')
};

/**
 * 渲染生成结果列表
 */
function render() {
  if (!generated.length) {
    uiElements.results.innerHTML = '<div class="empty">🌟 点击「立即生成名称」开始生成 🌟</div>';
    return;
  }

  uiElements.results.innerHTML = generated.map((item, idx) => `
    <article class="name-item ripple" style="--i:${idx}">
      <div class="name-meta">
        <span class="tag">${item.type}</span>
        <button class="star ${saved.includes(item.name) ? 'saved' : ''}"
          title="收藏"
          onclick="event.stopPropagation(); toggleSave(${idx})">
          ${saved.includes(item.name) ? '★' : '☆'}
        </button>
      </div>
      <div class="name-text">${item.name}</div>
      <div class="name-desc">${item.desc} · ${item.region}</div>
    </article>
  `).join('');
}

/**
 * 渲染收藏列表
 */
function renderSaved() {
  if (!saved.length) {
    uiElements.savedList.innerHTML = '<span class="small-label">点击名称右上角的 ☆ 可收藏结果</span>';
    return;
  }

  uiElements.savedList.innerHTML = saved.map((name, idx) => `
    <span class="history-chip" onclick="openSavedDetail(${idx})">
      ${name}
      <button title="删除收藏" onclick="event.stopPropagation(); removeSaved(${idx})">×</button>
    </span>
  `).join("");
}

/**
 * 切换收藏状态
 * @param {number} index - 生成的名称索引
 */
function toggleSave(index) {
  const name = generated[index].name;
  if (saved.includes(name)) {
    saved = saved.filter(n => n !== name);
    showToast('已取消收藏', 'info');
  } else {
    saved.unshift(name);
    showToast('已收藏', 'success');
  }
  setStorage("place-saved", saved);
  renderSaved();
  render();
}

/**
 * 删除收藏
 * @param {number} index - 收藏列表索引
 */
function removeSaved(index) {
  saved.splice(index, 1);
  setStorage("place-saved", saved);
  renderSaved();
  render();
  showToast('已删除', 'info');
}

/**
 * 清空收藏
 */
function clearSaved() {
  if (confirm('确定清空所有收藏吗？')) {
    saved = [];
    setStorage("place-saved", saved);
    renderSaved();
    render();
    showToast('收藏已清空', 'success');
  }
}

/**
 * 打开详情弹窗
 * @param {number} index - 生成的名称索引
 */
function openModal(index) {
  const item = generated[index];
  if (!item) return;

  const detail = buildDetail(item);
  uiElements.modalBody.innerHTML = buildModalHTML(detail, index);
  uiElements.modalOverlay.classList.add("open");
}

/**
 * 打开收藏详情
 * @param {number} index - 收藏列表索引
 */
function openSavedDetail(index) {
  const name = saved[index];
  if (!name) return;

  const region = document.getElementById('region').value;
  const regionText = document.getElementById('region').options[document.getElementById('region').selectedIndex].text;

  const detail = {
    name,
    type: "收藏名称",
    region: regionText,
    isPlace: false,
    seed: "",
    rel: 0,
    roads: [],
    metros: [],
    buses: [],
    airports: [],
    hospitals: [],
    trains: [],
    highspeeds: []
  };

  // 尝试查找关联
  GeoNameData.allTypes.forEach(t => {
    const pool = GeoNameData.regions[region][t] || [];
    const customPool = WordBankManager.getCustomWords(region, t) || [];
    const mergedPool = [...new Set([...pool, ...customPool])];

    mergedPool.forEach(w => {
      if (name.includes(w) || w.includes(name)) {
        const entry = { name: w + "站", raw: w };
        if (t === "road") detail.roads.push(entry);
        else if (t === "metro") detail.metros.push(entry);
        else if (t === "bus") detail.buses.push(entry);
      }
    });
  });

  uiElements.modalBody.innerHTML = buildModalHTML(detail, -1);
  uiElements.modalOverlay.classList.add("open");
}

/**
 * 关闭详情弹窗
 */
function closeModal() {
  uiElements.modalOverlay.classList.remove("open");
}

/**
 * 复制名称
 * @param {string} name - 要复制的名称
 */
async function copyName(name) {
  try {
    await navigator.clipboard.writeText(name);
    showToast('名称已复制', 'success');
  } catch {
    showToast('复制失败', 'error');
  }
}

/**
 * 构建模态框HTML
 * @param {Object} detail - 详情数据
 * @param {number} index - 生成的名称索引（-1表示收藏）
 * @returns {string} HTML字符串
 */
function buildModalHTML(detail, index) {
  let html = `
    <div class="modal-name">${detail.name}</div>
    <span class="modal-type">${detail.type}</span>
    <button class="modal-copy-btn" onclick="copyName('${detail.name}')">📋 复制名称</button>
  `;

  // 基本信息
  html += `
    <div class="modal-section">
      <h3>基本信息</h3>
      <div class="info-grid">
        <div class="info-item"><div class="label">所属地域</div><div class="value">${detail.region}</div></div>
        <div class="info-item"><div class="label">名称类型</div><div class="value">${detail.type}</div></div>
        <div class="info-item"><div class="label">关联度</div><div class="value">${Math.round(detail.rel * 100)}%</div></div>
        ${detail.seed ? `<div class="info-item"><div class="label">基础名称</div><div class="value">${detail.seed}</div></div>` : ""}
      </div>
    </div>
  `;

  // 区域类型展示所有关联设施
  if (detail.isPlace) {
    html += `
      <div class="modal-section">
        <h3>🚇 关联地铁站</h3>
        ${buildRelatedList(detail.metros, "暂无关联")}
      </div>
      <div class="modal-section">
        <h3>🚌 关联公交站</h3>
        ${buildRelatedList(detail.buses, "暂无关联")}
      </div>
      <div class="modal-section">
        <h3>✈️ 关联机场</h3>
        ${buildRelatedList(detail.airports, "暂无关联")}
      </div>
      <div class="modal-section">
        <h3>🏥 关联医院</h3>
        ${buildRelatedList(detail.hospitals, "暂无关联")}
      </div>
      <div class="modal-section">
        <h3>🚂 关联火车站</h3>
        ${buildRelatedList(detail.trains, "暂无关联")}
      </div>
      <div class="modal-section">
        <h3>🚄 关联高铁站</h3>
        ${buildRelatedList(detail.highspeeds, "暂无关联")}
      </div>
      <div class="modal-section">
        <h3>🛣️ 关联道路</h3>
        ${buildRelatedList(detail.roads, "暂无关联")}
      </div>
    `;
  } else {
    html += `
      <div class="modal-section">
        <h3>🛣️ 所属道路 / 区域</h3>
        ${buildRelatedList(detail.roads, "暂无关联道路")}
      </div>
      <div class="modal-section">
        <h3>🚇 附近地铁站</h3>
        ${buildRelatedList(detail.metros, "暂无关联")}
      </div>
      <div class="modal-section">
        <h3>🚌 附近公交站</h3>
        ${buildRelatedList(detail.buses, "暂无关联")}
      </div>
    `;
  }

  // 关联度说明
  let relDesc = "";
  if (detail.rel >= 0.8) relDesc = "名称与基础关键词高度相似，保留了关键词的核心部分";
  else if (detail.rel >= 0.4) relDesc = "名称与基础关键词有一定关联，部分保留了关键词元素";
  else if (detail.rel > 0) relDesc = "名称与基础关键词关联较弱，仅保留少量共同元素";
  else relDesc = "名称与基础关键词完全无关，独立生成";

  html += `
    <div class="modal-note">
      📌 关联度 ${Math.round(detail.rel * 100)}% ——
      ${relDesc}
      ${detail.seed ? `，基础关键词为「${detail.seed}」` : ""}
    </div>
  `;

  return html;
}

/**
 * 构建关联列表HTML
 * @param {Array} items - 关联项目数组
 * @param {string} emptyText - 空文本
 * @returns {string} HTML字符串
 */
function buildRelatedList(items, emptyText) {
  if (items.length === 0) {
    return `<div class="related-list"><span class="related-chip">${emptyText}</span></div>`;
  }
  return `<div class="related-list">${items.map(item => `<span class="related-chip">${item.name}</span>`).join("")}</div>`;
}

/**
 * 复制生成结果
 */
async function copyResults() {
  if (!generated.length) {
    showToast('请先生成名称', 'error');
    return;
  }

  const text = generated.map(item => `${item.name}  (${item.type})`).join("\n");

  try {
    await navigator.clipboard.writeText(text);
    showToast('已复制全部结果', 'success');
  } catch {
    showToast('复制失败，请手动选择复制', 'error');
  }
}

/**
 * 显示提示消息
 * @param {string} message - 消息内容
 * @param {string} type - 类型 (success/error/info)
 */
function showToast(message, type) {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 2000);
}

/**
 * 导出功能
 * @param {string} type - 导出类型 (saved/current/all)
 */
function exportData(type) {
  let content = "";
  let filename = "";
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

  if (type === 'saved') {
    if (!saved.length) {
      showToast('暂无收藏内容', 'error');
      return;
    }
    content = `===== 地名生成器导出 =====\n时间：${timestamp}\n===== 收藏名称 =====\n${saved.join('\n')}\n`;
    filename = `地名生成器-收藏-${timestamp}.txt`;
  } else if (type === 'current') {
    if (!generated.length) {
      showToast('暂无生成结果', 'error');
      return;
    }
    content = `===== 地名生成器导出 =====\n时间：${timestamp}\n===== 生成结果 =====\n${generated.map(item => `${item.name}  (${item.type})`).join('\n')}\n`;
    filename = `地名生成器-结果-${timestamp}.txt`;
  } else {
    content = `===== 地名生成器导出 =====\n时间：${timestamp}\n`;
    if (saved.length) {
      content += `\n===== 收藏名称 =====\n${saved.join('\n')}\n`;
    }
    if (generated.length) {
      content += `\n===== 生成结果 =====\n${generated.map(item => `${item.name}  (${item.type})`).join('\n')}\n`;
    }
    filename = `地名生成器-全部-${timestamp}.txt`;
  }

  downloadFile(content, filename, 'text/plain');
  showToast('导出成功', 'success');
}

/**
 * 下载文件
 * @param {string} content - 文件内容
 * @param {string} filename - 文件名
 * @param {string} type - 文件类型
 */
function downloadFile(content, filename, type) {
  const blob = new Blob([content], { type: `${type};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
