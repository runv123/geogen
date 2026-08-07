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
  
  // 只显示滨海城市的词汇（简化版）
  const words = WordBankManager.getCustomWords('coastal', 'place');
  if (words.length > 0) {
    html += '<h4 style="margin: 12px 0 8px; color: var(--primary);">区域地名</h4>';
    words.forEach(word => {
      html += `<span class="wb-word-chip">${word}</span>
               <button class="delete-btn" data-region="coastal" data-type="place" data-word="${word}" style="margin-left: 4px; background: #ff6b6b; color: white; border: none; border-radius: 50%; width: 20px; height: 20px; cursor: pointer; font-size: 12px;">×</button>`;
    });
  }
  
  this.elements.userWords.innerHTML = html;
  
  // 绑定删除事件
  this.elements.userWords.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const region = e.target.dataset.region;
      const type = e.target.dataset.type;
      const word = e.target.dataset.word;
      if (confirm(`确定删除「${word}」吗？`)) {
        WordBankManager.removeWord(region, type, word);
        this.renderUserWords();
      }
    });
  });
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
    window.updateWordbankMixUI && window.updateWordbankMixUI();
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
