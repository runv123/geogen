/**
 * 地名生成器 - 主入口和事件绑定
 * 版本：v1.2.0
 * 包含：初始化、事件监听、生成逻辑、统计、历史记录、主题管理
 */

// === 当前状态 ===
let currentType = "all";
let currentMode = "random";

// === 统计数据 ===
let stats = {
  totalGenerated: 0,
  todayGenerated: 0,
  todayDate: new Date().toDateString()
};

// === 初始化 ===
document.addEventListener("DOMContentLoaded", () => {
  // 初始化词库管理器
  WordBankManager.init();
  // 初始化词库 UI
  WordBankUI.init();
  
  // 初始化统计数据
  initStats();
  
  // 绑定所有事件
  initEventListeners();
  
  // 渲染收藏列表
  renderSaved();
  
  // 渲染统计面板
  renderStats();
  
  // 更新词库混合滑块状态
  updateWordbankMixUI();
  
  // 首次生成
  generate();
});

/**
 * 初始化统计数据
 */
function initStats() {
  try {
    const saved = getStorage("place-stats", {});
    if (saved.totalGenerated !== undefined) {
      stats.totalGenerated = saved.totalGenerated;
      const today = new Date().toDateString();
      if (saved.todayDate === today) {
        stats.todayGenerated = saved.todayGenerated || 0;
      } else {
        stats.todayGenerated = 0;
        stats.todayDate = today;
      }
    }
  } catch (e) {
    console.warn("统计初始化失败:", e);
  }
}

/**
 * 更新统计数据
 */
function updateStats() {
  stats.totalGenerated++;
  stats.todayGenerated++;
  stats.todayDate = new Date().toDateString();
  setStorage("place-stats", stats);
}

/**
 * 渲染统计面板
 */
function renderStats() {
  const todayEl = document.getElementById('statToday');
  const totalEl = document.getElementById('statTotal');
  const savedEl = document.getElementById('statSaved');
  const wordsEl = document.getElementById('statWords');
  
  if (todayEl) todayEl.textContent = stats.todayGenerated;
  if (totalEl) totalEl.textContent = stats.totalGenerated;
  if (savedEl) savedEl.textContent = saved.length;
  if (wordsEl) wordsEl.textContent = WordBankManager.getTotalCustomCount();
}

/**
 * 初始化事件监听
 */
function initEventListeners() {
  // === 模式切换 ===
  document.querySelectorAll(".mode-btn[data-mode]").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".mode-btn[data-mode]").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      currentMode = btn.dataset.mode;
      uiElements.randomHint.classList.toggle("show", currentMode === "random");
      uiElements.fillSection.classList.toggle("show", currentMode === "fill");
      if (currentMode === "random") uiElements.seedInput.value = "";
      generate();
    });
  });

  // === 类型选择 ===
  document.querySelectorAll(".chip").forEach(chip => {
    chip.addEventListener("click", () => {
      document.querySelectorAll(".chip").forEach(c => c.classList.remove("active"));
      chip.classList.add("active");
      currentType = chip.dataset.type;
      generate();
    });
  });

  // === 数量滑块 ===
  uiElements.count.addEventListener("input", () => {
    uiElements.countValue.textContent = uiElements.count.value;
  });

  // === 关联度滑块 ===
  uiElements.relevance.addEventListener("input", () => {
    const v = uiElements.relevance.value;
    uiElements.relValue.textContent = v + "%";
    uiElements.relLabel.textContent = v + "%";
  });

  // === 字数滑块 ===
  uiElements.charCount.addEventListener("input", () => {
    const v = uiElements.charCount.value;
    uiElements.charValue.textContent = v + "字";
    uiElements.charLabel.textContent = v + "字";
  });

  // === 词库混合滑块 ===
  uiElements.wordbankMix.addEventListener("input", () => {
    const v = uiElements.wordbankMix.value;
    uiElements.mixValue.textContent = v + "%";
    if (v == 100) {
      uiElements.mixLabel.textContent = "系统字库 100%";
    } else if (v == 0) {
      uiElements.mixLabel.textContent = "用户字库 100%";
    } else {
      uiElements.mixLabel.textContent = `混合 ${v}%`;
    }
  });

  // === 生成按钮 ===
  uiElements.generateBtn.addEventListener("click", generate);

  // === 清空按钮 ===
  uiElements.clearBtn.addEventListener("click", () => {
    generated = [];
    render();
  });

  // === 复制按钮 ===
  uiElements.copyBtn.addEventListener("click", copyResults);

  // === 导出按钮 ===
  uiElements.exportBtn.addEventListener("click", () => {
    document.getElementById('exportPanel').classList.add('open');
  });

  // === 清空收藏 ===
  uiElements.clearSaved.addEventListener("click", clearSaved);

  // === 种子输入框回车 ===
  uiElements.seedInput.addEventListener("keydown", e => {
    if (e.key === "Enter") generate();
  });

  // === 详情弹窗关闭 ===
  uiElements.modalClose.addEventListener("click", closeModal);
  uiElements.modalOverlay.addEventListener("click", e => {
    if (e.target === uiElements.modalOverlay) closeModal();
  });

  // === 顶部功能按钮 ===
  document.getElementById('btnUpdateLog').addEventListener('click', openUpdatePanel);
  document.getElementById('btnDeveloper').addEventListener('click', openDeveloperPanel);
  document.getElementById('btnColorTheme').addEventListener('click', openThemePanel);
  document.getElementById('btnHistory').addEventListener('click', openHistoryPanel);

  // === 颜色主题 ===
  document.getElementById('themeClose').addEventListener('click', () => {
    document.getElementById('themePanel').classList.remove('open');
  });
  document.querySelectorAll('.theme-apply').forEach(btn => {
    btn.addEventListener('click', () => {
      const theme = btn.dataset.theme;
      applyTheme(theme);
      document.getElementById('themePanel').classList.remove('open');
    });
  });

  // === 开发者 ===
  document.getElementById('developerClose').addEventListener('click', () => {
    document.getElementById('developerPanel').classList.remove('open');
  });

  // === 更新日志 ===
  document.getElementById('updateClose').addEventListener('click', () => {
    document.getElementById('updatePanel').classList.remove('open');
  });

  // === 导出 ===
  document.getElementById('exportClose').addEventListener('click', () => {
    document.getElementById('exportPanel').classList.remove('open');
  });
  document.getElementById('exportSaved').addEventListener('click', () => {
    exportData('saved');
    document.getElementById('exportPanel').classList.remove('open');
  });
  document.getElementById('exportCurrent').addEventListener('click', () => {
    exportData('current');
    document.getElementById('exportPanel').classList.remove('open');
  });
  document.getElementById('exportAll').addEventListener('click', () => {
    exportData('all');
    document.getElementById('exportPanel').classList.remove('open');
  });

  // === 历史记录 ===
  document.getElementById('historyClose').addEventListener('click', () => {
    document.getElementById('historyPanel').classList.remove('open');
  });
  document.getElementById('historyPanel').addEventListener('click', (e) => {
    if (e.target.id === 'historyPanel') {
      document.getElementById('historyPanel').classList.remove('open');
    }
  });

  // === 全局退出键 ===
  document.addEventListener('keydown', e => {
    if (e.key === "Escape") {
      closeModal();
      closeAllPanels();
    }
  });

  // === 点击面板外部关闭 ===
  ['wbPanel', 'themePanel', 'developerPanel', 'updatePanel', 'exportPanel', 'historyPanel'].forEach(id => {
    const panel = document.getElementById(id);
    if (panel) {
      panel.addEventListener('click', e => {
        if (e.target === panel) {
          panel.classList.remove('open');
        }
      });
    }
  });
}

/**
 * 更新词库混合滑块 UI 状态
 * 暴露给全局以便词库 UI 调用
 */
function updateWordbankMixUI() {
  const field = document.getElementById('wordbankMixField');
  if (!field) return;
  
  const hasWords = WordBankManager.hasCustomWords();
  if (hasWords) {
    field.classList.remove('disabled');
    uiElements.wordbankMix.disabled = false;
  } else {
    field.classList.add('disabled');
    uiElements.wordbankMix.disabled = true;
    uiElements.mixLabel.textContent = "未导入用户字库，无法使用";
  }
}
// 暴露到全局，供 wordbank-ui.js 调用
window.updateWordbankMixUI = updateWordbankMixUI;

/**
 * 生成名称（核心逻辑）
 */
function generate() {
  const typeName = GeoNameData.typeLabels;
  const activeTypes = currentType === "all" ? GeoNameData.allTypes : [currentType];
  const amount = clamp(Number(uiElements.count.value) / activeTypes.length, 1, 24);
  const rel = Number(uiElements.relevance.value) / 100;
  const mixRatio = Number(uiElements.wordbankMix.value) / 100;
  const targetChars = Number(uiElements.charCount.value);
  const seed = currentMode === "fill" ? (uiElements.seedInput.value || "") : "";
  const regionText = uiElements.region.options[uiElements.region.selectedIndex].text;

  // 验证输入
  if (currentMode === "fill" && seed) {
    if (containsEnglish(seed)) {
      showToast('请使用中文输入，英文将被过滤', 'error');
      return;
    }
    if (containsSensitiveWord(seed)) {
      showToast('包含敏感词，无法生成', 'error');
      return;
    }
  }

  generated = [];
  const used = new Set();

  activeTypes.forEach(type => {
    let generatedForType = 0;
    const targetCount = Math.max(1, Math.round(amount));
    let attempts = 0;

    while (generatedForType < targetCount && attempts < targetCount * 5) {
      const name = createName(type, seed, rel, mixRatio, targetChars);

      if (!name || used.has(name)) {
        attempts++;
        continue;
      }

      // 验证敏感词
      if (containsSensitiveWord(name)) {
        attempts++;
        continue;
      }

      used.add(name);
      generated.push({
        name,
        type: typeName[type] || type,
        desc: randomChoice(GeoNameData.descriptions[type]),
        region: regionText
      });
      generatedForType++;
      attempts++;
    }
  });

  // 填字模式且关联度>0 时，确保种子本身出现在结果中
  if (seed && rel > 0 && !used.has(seed) && isChineseOnly(seed) && !containsSensitiveWord(seed)) {
    generated.unshift({
      name: seed,
      type: "参考名称",
      desc: "您输入的基础名称",
      region: regionText
    });
  }

  // 更新 UI
  uiElements.resultTitle.textContent = "生成结果";
  uiElements.resultSub.textContent = `${generated.length} 个名称 · 关联度 ${Math.round(rel * 100)}%`;
  render();

  // 更新统计和历史
  updateStats();
  renderStats();
  saveHistory();
}

// === 历史记录管理 ===

/**
 * 保存当前生成结果到历史
 */
function saveHistory() {
  if (!generated.length) return;
  
  try {
    const historyList = getStorage(GeoNameData.historyStorageKey, []);
    
    const record = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      count: generated.length,
      names: generated.map(item => item.name),
      preview: generated.map(item => item.name).join(', ')
    };
    
    historyList.unshift(record);
    
    // 最多保留 50 条
    if (historyList.length > 50) {
      historyList.pop();
    }
    
    setStorage(GeoNameData.historyStorageKey, historyList);
  } catch (e) {
    console.warn("历史保存失败:", e);
  }
}

/**
 * 打开历史弹窗
 */
function openHistoryPanel() {
  const panel = document.getElementById('historyPanel');
  const body = document.getElementById('historyBody');
  
  try {
    const historyList = getStorage(GeoNameData.historyStorageKey, []);
    
    if (!historyList.length) {
      body.innerHTML = '<div class="history-empty">📭 暂无生成历史，先点击生成按钮试试吧！</div>';
      panel.classList.add('open');
      return;
    }
    
    body.innerHTML = `
      <div class="history-list">
        ${historyList.map((record, idx) => {
          const time = new Date(record.timestamp);
          const timeStr = `${time.getMonth()+1}月${time.getDate()}日 ${time.getHours()}:${String(time.getMinutes()).padStart(2, '0')}`;
          return `
            <div class="history-item">
              <span class="history-time">${timeStr}</span>
              <span class="history-preview">${record.preview}</span>
              <div class="history-actions">
                <button class="history-restore-btn" onclick="event.stopPropagation(); restoreHistory(${idx})">📋 恢复</button>
                <button class="history-delete-btn" onclick="event.stopPropagation(); deleteHistory(${idx})">🗑️</button>
              </div>
            </div>
          `;
        }).join('')}
      </div>
      <button class="history-clear-all-btn" onclick="clearAllHistory()">🗑️ 清空全部历史</button>
    `;
    
    panel.classList.add('open');
  } catch (e) {
    showToast('历史记录加载失败', 'error');
  }
}

/**
 * 从历史恢复生成结果
 * @param {number} index - 历史索引
 */
function restoreHistory(index) {
  try {
    const historyList = getStorage(GeoNameData.historyStorageKey, []);
    const record = historyList[index];
    if (!record) return;
    
    generated = record.names.map(name => ({
      name,
      type: "历史结果",
      desc: "从历史记录恢复",
      region: "历史记录"
    }));
    
    render();
    renderStats();
    document.getElementById('historyPanel').classList.remove('open');
    showToast('已从历史记录恢复', 'success');
  } catch (e) {
    showToast('恢复失败', 'error');
  }
}

/**
 * 删除单条历史
 * @param {number} index - 历史索引
 */
function deleteHistory(index) {
  if (!confirm('确定删除这条历史记录吗？')) return;
  
  try {
    const historyList = getStorage(GeoNameData.historyStorageKey, []);
    historyList.splice(index, 1);
    setStorage(GeoNameData.historyStorageKey, historyList);
    openHistoryPanel();
    showToast('历史记录已删除', 'info');
  } catch (e) {
    showToast('删除失败', 'error');
  }
}

/**
 * 清空全部历史
 */
function clearAllHistory() {
  if (!confirm('确定清空全部历史记录吗？此操作不可恢复！')) return;
  
  try {
    setStorage(GeoNameData.historyStorageKey, []);
    openHistoryPanel();
    showToast('历史记录已清空', 'success');
  } catch (e) {
    showToast('清空失败', 'error');
  }
}

// === 面板管理 ===

/**
 * 打开更新日志面板
 */
function openUpdatePanel() {
  const panel = document.getElementById('updatePanel');
  const body = document.getElementById('updateBody');
  
  try {
    body.innerHTML = GeoNameData.updateLog.map(log => `
      <div class="update-version">
        <h3>${log.version} <span>${log.date}</span></h3>
        <ul class="update-changelog">
          ${log.changes.map(change => `<li>${change}</li>`).join('')}
        </ul>
      </div>
    `).join('');
    panel.classList.add('open');
  } catch (e) {
    showToast('更新日志加载失败', 'error');
  }
}

/**
 * 打开开发者面板
 */
function openDeveloperPanel() {
  document.getElementById('developerPanel').classList.add('open');
}

/**
 * 打开颜色主题面板
 */
function openThemePanel() {
  document.getElementById('themePanel').classList.add('open');
}

/**
 * 应用主题
 * @param {string} theme - 主题名称
 */
function applyTheme(theme) {
  try {
    document.body.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    showToast('主题已切换', 'success');
  } catch (e) {
    showToast('主题切换失败', 'error');
  }
}

/**
 * 恢复保存的主题
 */
function restoreTheme() {
  try {
    const theme = localStorage.getItem('theme');
    if (theme) {
      document.body.setAttribute('data-theme', theme);
    }
  } catch (e) {
    console.warn("主题恢复失败:", e);
  }
}

/**
 * 关闭所有面板
 */
function closeAllPanels() {
  ['wbPanel', 'themePanel', 'developerPanel', 'updatePanel', 'exportPanel', 'historyPanel', 'modalOverlay'].forEach(id => {
    const panel = document.getElementById(id);
    if (panel) panel.classList.remove('open');
  });
}

// === 启动时恢复主题 ===
restoreTheme();