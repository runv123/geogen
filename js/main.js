/**
 * 地名生成器 - 主入口和事件绑定
 */

// === 当前状态 ===
let currentType = "all";
let currentMode = "random";

// === 初始化 ===
document.addEventListener("DOMContentLoaded", () => {
  WordBankManager.init();
  WordBankUI.init();

  initEventListeners();
  renderSaved();
  updateWordbankMixUI();
  generate();
});

/**
 * 初始化事件监听
 */
function initEventListeners() {
  // 模式切换
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

  // 类型选择
  document.querySelectorAll(".chip").forEach(chip => {
    chip.addEventListener("click", () => {
      document.querySelectorAll(".chip").forEach(c => c.classList.remove("active"));
      chip.classList.add("active");
      currentType = chip.dataset.type;
      generate();
    });
  });

  // 数量滑块
  uiElements.count.addEventListener("input", () => {
    uiElements.countValue.textContent = uiElements.count.value;
  });

  // 关联度滑块
  uiElements.relevance.addEventListener("input", () => {
    const v = uiElements.relevance.value;
    uiElements.relValue.textContent = v + "%";
    uiElements.relLabel.textContent = v + "%";
  });

  // 字数滑块
  uiElements.charCount.addEventListener("input", () => {
    const v = uiElements.charCount.value;
    uiElements.charValue.textContent = v + "字";
    uiElements.charLabel.textContent = v + "字";
  });

  // 词库混合滑块
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

  // 生成按钮
  uiElements.generateBtn.addEventListener("click", generate);

  // 清空按钮
  uiElements.clearBtn.addEventListener("click", () => {
    generated = [];
    render();
  });

  // 复制按钮
  uiElements.copyBtn.addEventListener("click", copyResults);

  // 导出按钮
  uiElements.exportBtn.addEventListener("click", () => {
    document.getElementById('exportPanel').classList.add('open');
  });

  // 清空收藏
  uiElements.clearSaved.addEventListener("click", clearSaved);

  // 种子输入框回车
  uiElements.seedInput.addEventListener("keydown", e => {
    if (e.key === "Enter") generate();
  });

  // 弹窗关闭
  uiElements.modalClose.addEventListener("click", closeModal);
  uiElements.modalOverlay.addEventListener("click", e => {
    if (e.target === uiElements.modalOverlay) closeModal();
  });

  // 退出键关闭弹窗
  document.addEventListener("keydown", e => {
    if (e.key === "Escape") {
      closeModal();
      closeAllPanels();
    }
  });

  // 顶部按钮事件
  document.getElementById('btnUpdateLog').addEventListener('click', openUpdatePanel);
  document.getElementById('btnDeveloper').addEventListener('click', openDeveloperPanel);
  document.getElementById('btnColorTheme').addEventListener('click', openThemePanel);

  // 颜色主题
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

  // 开发者
  document.getElementById('developerClose').addEventListener('click', () => {
    document.getElementById('developerPanel').classList.remove('open');
  });

  // 更新日志
  document.getElementById('updateClose').addEventListener('click', () => {
    document.getElementById('updatePanel').classList.remove('open');
  });

  // 导出
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

  // 退出键关闭所有面板
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      closeAllPanels();
    }
  });

  // 点击面板外部关闭
  ['wbPanel', 'themePanel', 'developerPanel', 'updatePanel', 'exportPanel'].forEach(id => {
    const panel = document.getElementById(id);
    panel.addEventListener('click', e => {
      if (e.target === panel) {
        panel.classList.remove('open');
      }
    });
  });
}

/**
 * 更新词库混合滑块UI
 */
function updateWordbankMixUI() {
  const field = document.getElementById('wordbankMixField');
  if (!WordBankManager.hasCustomWords()) {
    field.classList.add('disabled');
    uiElements.wordbankMix.disabled = true;
    uiElements.mixLabel.textContent = "未导入用户字库，无法使用";
  } else {
    field.classList.remove('disabled');
    uiElements.wordbankMix.disabled = false;
  }
}

/**
 * 生成名称
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

  // 填字模式且关联度>0时，确保种子本身出现在结果中
  if (seed && rel > 0 && !used.has(seed) && isChineseOnly(seed) && !containsSensitiveWord(seed)) {
    generated.unshift({
      name: seed,
      type: "参考名称",
      desc: "您输入的基础名称",
      region: regionText
    });
  }

  uiElements.resultTitle.textContent = "生成结果";
  uiElements.resultSub.textContent = `${generated.length} 个名称 · 关联度 ${Math.round(rel * 100)}%`;
  render();
}

/**
 * 打开更新日志面板
 */
function openUpdatePanel() {
  const panel = document.getElementById('updatePanel');
  const body = document.getElementById('updateBody');

  body.innerHTML = GeoNameData.updateLog.map(log => `
    <div class="update-version">
      <h3>${log.version} <span>${log.date}</span></h3>
      <ul class="update-changelog">
        ${log.changes.map(change => `<li>${change}</li>`).join('')}
      </ul>
    </div>
  `).join('');

  panel.classList.add('open');
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
  document.body.setAttribute('data-theme', theme);
  localStorage.setItem('theme', theme);
  showToast('主题已切换', 'success');
}

/**
 * 恢复保存的主题
 */
function restoreTheme() {
  const theme = localStorage.getItem('theme');
  if (theme) {
    document.body.setAttribute('data-theme', theme);
  }
}

/**
 * 关闭所有面板
 */
function closeAllPanels() {
  ['wbPanel', 'themePanel', 'developerPanel', 'updatePanel', 'exportPanel', 'modalOverlay'].forEach(id => {
    const panel = document.getElementById(id);
    if (panel) panel.classList.remove('open');
  });
}

// 恢复主题
restoreTheme();
