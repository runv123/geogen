/**
 * 地名生成器 - 词库管理UI逻辑
 */

const WordBankUI = {
  elements: {
    panel: document.getElementById('wbPanel'),
    close: document.getElementById('wbClose'),
    systemRegion: document.getElementById('wbSystemRegion'),
    systemType: document.getElementById('wbSystemType'),
    systemWords: document.getElementById('wbSystemWords'),
    userWords: document.getElementById('wbUserWords'),
    userNote: document.getElementById('wbUserNote'),
    importRegion: document.getElementById('wbImportRegion'),
    importType: document.getElementById('wbImportType'),
    importArea: document.getElementById('wbImportArea'),
    importBtn: document.getElementById('wbImportBtn'),
    clearImport: document.getElementById('wbClearImport'),
    tabs: document.querySelectorAll('.wb-tab'),
    contents: document.querySelectorAll('.wb-content')
  },

  init() {
    this.bindEvents();
    this.renderSystemWords();
    this.renderUserWords();
  },

  bindEvents() {
    // 打开面板
    document.getElementById('btnWordBank').addEventListener('click', () => {
      this.elements.panel.classList.add('open');
      this.renderSystemWords();
      this.renderUserWords();
    });

    // 关闭面板
    this.elements.close.addEventListener('click', () => {
      this.elements.panel.classList.remove('open');
    });
    this.elements.panel.addEventListener('click', e => {
      if (e.target === this.elements.panel) {
        this.elements.panel.classList.remove('open');
      }
    });

    // 标签切换
    this.elements.tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        this.elements.tabs.forEach(t => t.classList.remove('active'));
        this.elements.contents.forEach(c => c.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById(`wb${tab.dataset.tab.charAt(0).toUpperCase() + tab.dataset.tab.slice(1)}Tab`).classList.add('active');
      });
    });

    // 系统字库筛选
    this.elements.systemRegion.addEventListener('change', () => this.renderSystemWords());
    this.elements.systemType.addEventListener('change', () => this.renderSystemWords());

    // 导入功能
    this.elements.importBtn.addEventListener('click', () => this.import());
    this.elements.clearImport.addEventListener('click', () => {
      this.elements.importArea.value = '';
    });

    // Escape关闭
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && this.elements.panel.classList.contains('open')) {
        this.elements.panel.classList.remove('open');
      }
    });
  },

  /**
   * 渲染系统字库
   */
  renderSystemWords() {
    const region = this.elements.systemRegion.value;
    const type = this.elements.systemType.value;
    const words = GeoNameData.regions[region][type] || [];

    this.elements.systemWords.innerHTML = words.map(word =>
      `<span class="wb-word-chip system">${word}</span>`
    ).join('');
  },

  /**
   * 渲染用户字库
   */
  renderUserWords() {
    const hasWords = WordBankManager.hasCustomWords();

    if (!hasWords) {
      this.elements.userNote.style.display = 'block';
      this.elements.userWords.innerHTML = '';
      return;
    }

    this.elements.userNote.style.display = 'none';
    let html = '';

    GeoNameData.allTypes.forEach(type => {
      const words = WordBankManager.getCustomWords('coastal', type); // 简化展示
      if (words.length > 0) {
        html += `<h4 style="margin: 12px 0 8px; color: var(--primary);">${GeoNameData.typeLabels[type]}</h4>`;
        html += words.map(word =>
          `<span class="wb-word-chip">${word}</span>`
        ).join('');
      }
    });

    this.elements.userWords.innerHTML = html;
  },

  /**
   * 导入词库
   */
  import() {
    const input = this.elements.importArea.value.trim();
    if (!input) {
      showToast('请输入词库内容', 'error');
      return;
    }

    const region = this.elements.importRegion.value;
    const type = this.elements.importType.value;
    const targetChars = Number(document.getElementById('charCount').value);

    // 检测格式
    const { type: format, data } = detectAndParseWordBank(input);

    if (format === 'json') {
      // JSON格式
      const result = this.importJSON(data, region, type, targetChars);
      showToast(`导入成功，添加了 ${result.added} 个词`, 'success');
    } else if (format === 'csv' || format === 'txt') {
      // TXT/CSV格式
      const result = this.importList(data, region, type, targetChars);
      showToast(`导入成功，添加了 ${result.added} 个词`, 'success');
    } else {
      showToast('无法识别的格式', 'error');
      return;
    }

    this.elements.importArea.value = '';
    this.renderUserWords();
  },

  /**
   * 导入JSON格式
   */
  importJSON(data, region, type, targetChars) {
    let added = 0;

    // 检查是否有指定地域
    if (data[region] && data[region][type]) {
      const words = filterWords(data[region][type], 1, targetChars);
      added += WordBankManager.batchImport(region, type, words);
    } else {
      // 尝试所有地域
      Object.keys(data).forEach(r => {
        if (data[r][type]) {
          const words = filterWords(data[r][type], 1, targetChars);
          added += WordBankManager.batchImport(r, type, words);
        }
      });
    }

    return { added };
  },

  /**
   * 导入列表格式（TXT/CSV）
   */
  importList(words, region, type, targetChars) {
    const validWords = filterWords(words, 1, targetChars);
    const added = WordBankManager.batchImport(region, type, validWords);
    return { added };
  }
};
