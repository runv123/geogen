/**
 * 地名生成器 - 工具函数
 * 包含随机、限制、混合、检测、过滤等功能
 */

/**
 * 从数组中随机选择一个元素
 * @param {Array} arr - 目标数组
 * @returns {*} 随机元素
 */
function randomChoice(arr) {
  if (!arr || arr.length === 0) return "";
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * 将值限制在指定范围内
 * @param {number} v - 待限制的值
 * @param {number} lo - 最小值
 * @param {number} hi - 最大值
 * @returns {number} 限制后的值
 */
function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

/**
 * 将单词拆分为多个部分（用于关联度混合）
 * @param {string} word - 要拆分的单词
 * @returns {Array} 拆分后的数组
 */
function wordParts(word) {
  if (word.length <= 1) return [word, word, word, word];
  return [
    word,
    word.slice(0, -1),
    word.slice(1),
    word[0] + word.slice(-1),
    word.slice(0, Math.ceil(word.length / 2)),
    word.slice(Math.floor(word.length / 2))
  ];
}

/**
 * 混合两个单词（基于关联度）
 * @param {string} seed - 基础词
 * @param {string} target - 目标词
 * @param {number} rel - 关联度 (0-1)
 * @returns {string} 混合后的词
 */
function blendWords(seed, target, rel) {
  if (rel >= 0.99) return target;
  if (rel <= 0.01) return target;

  const roll = Math.random();

  if (roll < rel * 0.35) {
    const half = Math.ceil(seed.length / 2);
    return seed.slice(0, half) + target.slice(Math.floor(target.length / 2));
  } else if (roll < rel * 0.65) {
    return seed.slice(0, Math.max(1, Math.floor(seed.length * rel))) + target[target.length - 1];
  } else if (roll < rel * 0.85) {
    const tHalf = Math.ceil(target.length / 2);
    return target.slice(0, tHalf) + seed[seed.length - 1];
  } else {
    return target;
  }
}

/**
 * 从 localStorage 读取数据
 * @param {string} key - 键名
 * @param {*} defaultValue - 默认值
 * @returns {*} 读取的数据
 */
function getStorage(key, defaultValue) {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch {
    return defaultValue;
  }
}

/**
 * 向 localStorage 写入数据
 * @param {string} key - 键名
 * @param {*} value - 要写入的值
 */
function setStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn('localStorage 写入失败:', e);
  }
}

/**
 * 检测字符串是否包含英文字符
 * @param {string} str - 要检测的字符串
 * @returns {boolean} 是否包含英文
 */
function containsEnglish(str) {
  return /[a-zA-Z]/.test(str);
}

/**
 * 检测字符串是否为纯中文
 * @param {string} str - 要检测的字符串
 * @returns {boolean} 是否为纯中文
 */
function isChineseOnly(str) {
  return /^[\u4e00-\u9fa5]+$/.test(str);
}

/**
 * 检测词汇是否包含敏感词
 * @param {string} word - 要检测的词汇
 * @returns {boolean} 是否包含敏感词
 */
function containsSensitiveWord(word) {
  if (!word) return false;
  return GeoNameData.sensitiveWords.some(sensitive => word.includes(sensitive));
}

/**
 * 验证词汇是否符合要求（中文、非敏感、字数范围）
 * @param {string} word - 要验证的词汇
 * @param {number} minChars - 最小字数
 * @param {number} maxChars - 最大字数
 * @returns {boolean} 是否符合要求
 */
function validateWord(word, minChars = 2, maxChars = 6) {
  if (!word) return false;
  word = word.trim();
  if (containsEnglish(word)) return false;
  if (containsSensitiveWord(word)) return false;
  if (word.length < minChars || word.length > maxChars) return false;
  return true;
}

/**
 * 过滤词汇数组（只保留符合要求的词）
 * @param {Array} words - 词汇数组
 * @param {number} minChars - 最小字数
 * @param {number} maxChars - 最大字数
 * @returns {Array} 过滤后的词汇数组
 */
function filterWords(words, minChars = 2, maxChars = 6) {
  if (!Array.isArray(words)) return [];
  return words.filter(w => validateWord(w, minChars, maxChars));
}

/**
 * 解析JSON格式的词库
 * @param {string} jsonStr - JSON字符串
 * @returns {Object} 解析后的对象
 */
function parseJSONWordBank(jsonStr) {
  try {
    const data = JSON.parse(jsonStr);
    if (typeof data !== 'object' || data === null) return null;
    return data;
  } catch {
    return null;
  }
}

/**
 * 解析TXT格式的词库（每行一个词）
 * @param {string} txtStr - TXT字符串
 * @returns {Array} 词汇数组
 */
function parseTXTWordBank(txtStr) {
  if (!txtStr) return [];
  return txtStr.split(/\n/).map(line => line.trim()).filter(line => line.length > 0);
}

/**
 * 解析CSV格式的词库（逗号分隔）
 * @param {string} csvStr - CSV字符串
 * @returns {Array} 词汇数组
 */
function parseCSVWordBank(csvStr) {
  if (!csvStr) return [];
  return csvStr.split(/[,，\n]/).map(item => item.trim()).filter(item => item.length > 0);
}

/**
 * 自动检测并解析词库格式
 * @param {string} input - 输入内容
 * @returns {Object} 解析结果 {type, data}
 */
function detectAndParseWordBank(input) {
  if (!input) return { type: null, data: null };

  input = input.trim();

  // 尝试JSON解析
  const jsonData = parseJSONWordBank(input);
  if (jsonData) {
    return { type: 'json', data: jsonData };
  }

  // 尝试CSV解析（包含逗号或中文逗号）
  if (/[，,]/.test(input)) {
    const csvData = parseCSVWordBank(input);
    if (csvData.length > 0) {
      return { type: 'csv', data: csvData };
    }
  }

  // 默认按TXT解析（每行一个词）
  const txtData = parseTXTWordBank(input);
  if (txtData.length > 0) {
    return { type: 'txt', data: txtData };
  }

  return { type: null, data: null };
}
