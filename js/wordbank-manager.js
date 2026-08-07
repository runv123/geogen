/**
 * 地名生成器 - 词库管理器
 * 提供词库的增删改查功能
 */

const WordBankManager = {
  STORAGE_KEY: "place-wordbank-custom",

  custom: {
    coastal: {},
    north: {},
    south: {},
    mountain: {},
    modern: {},
    historic: {}
  },

  /**
   * 初始化
   */
  init() {
    this.custom = this.load();
  },

  /**
   * 从localStorage加载
   */
  load() {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      return data ? JSON.parse(data) : this.getDefault();
    } catch {
      return this.getDefault();
    }
  },

  /**
   * 默认词库结构
   */
  getDefault() {
    return {
      coastal: {},
      north: {},
      south: {},
      mountain: {},
      modern: {},
      historic: {}
    };
  },

  /**
   * 保存
   */
  save() {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.custom));
      return true;
    } catch {
      return false;
    }
  },

  /**
   * 获取合并后的词库
   * @param {string} region - 地域类型
   * @param {string} type - 名称类型
   * @returns {Array} 合并后的词库数组
   */
  getPool(region, type) {
    const original = GeoNameData.regions[region][type] || [];
    const customWords = this.custom[region]?.[type] || [];
    return [...new Set([...original, ...customWords])];
  },

  /**
   * 添加词汇
   * @param {string} region - 地域类型
   * @param {string} type - 名称类型
   * @param {string} word - 要添加的词
   * @returns {boolean} 是否成功
   */
  addWord(region, type, word) {
    if (!validateWord(word, 2, 6)) {
      return false;
    }
    if (!this.custom[region]) {
      this.custom[region] = {};
    }
    if (!this.custom[region][type]) {
      this.custom[region][type] = [];
    }
    if (!this.custom[region][type].includes(word)) {
      this.custom[region][type].push(word);
      this.save();
      return true;
    }
    return false;
  },

  /**
   * 删除词汇
   * @param {string} region - 地域类型
   * @param {string} type - 名称类型
   * @param {string} word - 要删除的词
   * @returns {boolean} 是否成功
   */
  removeWord(region, type, word) {
    if (this.custom[region]?.[type]) {
      this.custom[region][type] = this.custom[region][type].filter(w => w !== word);
      this.save();
      return true;
    }
    return false;
  },

  /**
   * 编辑词汇
   * @param {string} region - 地域类型
   * @param {string} type - 名称类型
   * @param {string} oldWord - 原词
   * @param {string} newWord - 新词
   * @returns {boolean} 是否成功
   */
  editWord(region, type, oldWord, newWord) {
    if (!validateWord(newWord, 2, 6)) {
      return false;
    }
    if (this.custom[region]?.[type]) {
      const index = this.custom[region][type].indexOf(oldWord);
      if (index !== -1) {
        this.custom[region][type][index] = newWord;
        this.save();
        return true;
      }
    }
    return false;
  },

  /**
   * 批量导入
   * @param {string} region - 地域类型
   * @param {string} type - 名称类型
   * @param {Array} words - 词汇数组
   * @returns {number} 成功导入的数量
   */
  batchImport(region, type, words) {
    let added = 0;
    words.forEach(word => {
      if (this.addWord(region, type, word)) added++;
    });
    return added;
  },

  /**
   * 获取指定地域/类型的所有自定义词
   * @param {string} region - 地域类型
   * @param {string} type - 名称类型
   * @returns {Array} 自定义词数组
   */
  getCustomWords(region, type) {
    return this.custom[region]?.[type] || [];
  },

  /**
   * 获取所有自定义词数量
   */
  getTotalCustomCount() {
    let total = 0;
    Object.values(this.custom).forEach(region => {
      Object.values(region).forEach(words => {
        total += words.length;
      });
    });
    return total;
  },

  /**
   * 检查是否有用户字库
   * @returns {boolean} 是否有用户字库
   */
  hasCustomWords() {
    return this.getTotalCustomCount() > 0;
  },

  /**
   * 导出JSON
   */
  exportJSON() {
    return JSON.stringify(this.custom, null, 2);
  },

  /**
   * 导入JSON
   * @param {string} jsonStr - JSON字符串
   * @returns {boolean} 是否成功
   */
  importJSON(jsonStr) {
    try {
      const data = JSON.parse(jsonStr);
      this.custom = data;
      this.save();
      return true;
    } catch {
      return false;
    }
  },

  /**
   * 重置为默认词库
   */
  reset() {
    this.custom = this.getDefault();
    this.save();
  }
};
