/**
 * 地名生成器 - 核心生成逻辑
 */

/**
 * 创建单个名称
 * @param {string} type - 名称类型
 * @param {string} seed - 基础词（填字模式）
 * @param {number} rel - 关联度
 * @param {number} mixRatio - 词库混合比例（0-1，1=系统，0=用户）
 * @param {number} targetChars - 目标字数
 * @returns {string} 生成的名称
 */
function createName(type, seed, rel, mixRatio, targetChars) {
  const currentRegion = document.getElementById('region').value;
  const style = document.getElementById('style').value;

  // 根据混合比例决定使用哪个词库
  let pool;
  const systemPool = GeoNameData.regions[currentRegion][type] || [];
  const customPool = WordBankManager.getCustomWords(currentRegion, type) || [];

  // 随机决定使用系统还是用户词库
  if (mixRatio === 1) {
    pool = systemPool;
  } else if (mixRatio === 0) {
    pool = customPool;
  } else {
    // 混合模式：随机选择
    pool = Math.random() < mixRatio ? systemPool : customPool;
  }

  // 合并两个词库（去重）
  const mergedPool = [...new Set([...systemPool, ...customPool])].filter(w => validateWord(w, 1, 20));

  if (!mergedPool || mergedPool.length === 0) return "";

  // 关联度为0时，完全随机生成
  if (rel <= 0) {
    let name = randomChoice(mergedPool);
    if (name === seed && mergedPool.length > 1) {
      let attempts = 0;
      while (name === seed && attempts < 20) {
        name = randomChoice(mergedPool);
        attempts++;
      }
    }
    return applySuffixAndLength(name, type, targetChars);
  }

  // 关联度大于0时，使用基础词
  if (seed && seed.trim()) {
    const s = seed.trim();
    const roll = Math.random();

    if (roll < rel * 0.5) {
      // 直接使用词库中的词
      let name = randomChoice(mergedPool);
      return applySuffixAndLength(name, type, targetChars);
    } else if (roll < rel * 0.8) {
      // 基于种子词生成
      let prefix = s;
      const suffixPatterns = ["路", "大道", "街", "巷", "弄", "站", "中心", "医院", "广场", "机场", "桥", "码头", "公园"];
      for (const pat of suffixPatterns) {
        if (s.endsWith(pat)) {
          prefix = s.slice(0, -pat.length);
          break;
        }
      }

      let suffix = randomChoice(GeoNameData.suffixes[type]);
      let result = prefix + suffix;

      // 调整字数
      result = adjustLength(result, targetChars);
      return result;
    } else {
      // 混合生成
      const poolWord = randomChoice(mergedPool);
      const mixed = blendWords(s, poolWord, rel);
      let suffix = randomChoice(GeoNameData.suffixes[type]);
      let result = mixed + suffix;
      result = adjustLength(result, targetChars);
      return result;
    }
  }

  // 默认生成
  let name = randomChoice(mergedPool);
  return applySuffixAndLength(name, type, targetChars);
}

/**
 * 应用后缀并调整长度
 * @param {string} name - 原始名称
 * @param {string} type - 类型
 * @param {number} targetChars - 目标字数
 * @returns {string} 处理后的名称
 */
function applySuffixAndLength(name, type, targetChars) {
  // 检查是否已经包含后缀
  const suffixPatterns = {
    metro: ["站"],
    bus: ["站", "路口", "公交站"],
    airport: ["机场", "航站楼", "航空港"],
    hospital: ["医院", "中心", "社区卫生"],
    train: ["站"],
    highspeed: ["站"],
    road: ["路", "大道", "街", "巷"]
  };

  let result = name;
  const patterns = suffixPatterns[type] || [];

  // 如果没有后缀，添加一个
  if (!patterns.some(p => name.includes(p))) {
    const suffix = randomChoice(GeoNameData.suffixes[type]);
    result = name + suffix;
  }

  // 调整字数
  result = adjustLength(result, targetChars);
  return result;
}

/**
 * 智能调整名称字数到目标值
 * @param {string} name - 原始名称
 * @param {number} targetChars - 目标字数
 * @returns {string} 调整后的名称
 */
function adjustLength(name, targetChars) {
  if (name.length === targetChars) return name;
  
  if (name.length < targetChars) {
    // 智能扩展策略
    const expanders = ['中', '新', '大', '小', '上', '下', '东', '南', '西', '北', '前', '后'];
    const expanders2 = ['路', '街', '道', '园', '区', '港', '谷', '湾', '城', '镇'];
    
    let result = name;
    
    // 第一次扩展：加方位词
    if (result.length < targetChars) {
      result += randomChoice(expanders);
    }
    
    // 第二次扩展：加类型词
    if (result.length < targetChars) {
      result += randomChoice(expanders2);
    }
    
    // 第三次扩展：继续加方位词
    while (result.length < targetChars) {
      result += randomChoice(expanders);
    }
    
    return result.slice(0, targetChars);
  }
  
  // 字数超出，智能截断（保留核心部分）
  if (name.length > targetChars) {
    // 尝试在适当位置截断
    const possibleCuts = [
      name.length - 1,
      Math.max(2, Math.floor(name.length * 0.7)),
      Math.max(2, Math.floor(name.length * 0.8))
    ];
    
    for (const cut of possibleCuts) {
      if (cut <= targetChars) {
        return name.slice(0, cut);
      }
    }
  }
  
  return name.slice(0, targetChars);
}

/**
 * 构建详情数据
 * @param {Object} item - 生成的名称项
 * @returns {Object} 详情对象
 */
function buildDetail(item) {
  const seed = document.getElementById('seedInput').value || "";
  const rel = Number(document.getElementById('relevance').value) / 100;
  const regionText = document.getElementById('region').options[document.getElementById('region').selectedIndex].text;
  const name = item.name;
  const type = item.type;
  const isPlace = type === "区域地名";

  // 收集关联信息
  const relatedData = {
    roads: [],
    metros: [],
    buses: [],
    airports: [],
    hospitals: [],
    trains: [],
    highspeeds: []
  };

  const region = document.getElementById('region').value;
  GeoNameData.allTypes.forEach(t => {
    const pool = GeoNameData.regions[region][t] || [];
    const customPool = WordBankManager.getCustomWords(region, t) || [];
    const mergedPool = [...new Set([...pool, ...customPool])];

    mergedPool.forEach(w => {
      const common = name.split("").filter(c => w.includes(c)).length;
      const threshold = Math.max(1, Math.floor(name.length / 2));

      if (common >= threshold && w !== name) {
        const label = GeoNameData.typeLabels[t];
        const fullName = w + (t === "place" ? randomChoice(GeoNameData.suffixes.place) :
                              t === "metro" ? "站" :
                              t === "bus" ? "公交站" :
                              t === "airport" ? "机场" :
                              t === "hospital" ? "医院" :
                              t === "train" ? "站" :
                              t === "highspeed" ? "站" : "路");
        const entry = { name: fullName, raw: w };

        if (t === "road") relatedData.roads.push(entry);
        else if (t === "metro") relatedData.metros.push(entry);
        else if (t === "bus") relatedData.buses.push(entry);
        else if (t === "airport") relatedData.airports.push(entry);
        else if (t === "hospital") relatedData.hospitals.push(entry);
        else if (t === "train") relatedData.trains.push(entry);
        else if (t === "highspeed") relatedData.highspeeds.push(entry);
      }
    });
  });

  // 去重函数
  const unique = arr => {
    const seen = new Set();
    return arr.filter(x => {
      if (seen.has(x.name)) return false;
      seen.add(x.name);
      return true;
    });
  };

  // 构建详情
  const detail = {
    name,
    type,
    region: regionText,
    isPlace,
    seed,
    rel,
    roads: unique(relatedData.roads).slice(0, 6),
    metros: unique(relatedData.metros).slice(0, 6),
    buses: unique(relatedData.buses).slice(0, 6),
    airports: unique(relatedData.airports).slice(0, 4),
    hospitals: unique(relatedData.hospitals).slice(0, 4),
    trains: unique(relatedData.trains).slice(0, 4),
    highspeeds: unique(relatedData.highspeeds).slice(0, 4)
  };

  // 关联度低时补充随机关联
  if (rel < 0.5) {
    const roadPool = GeoNameData.regions[region].road || [];
    const extraRoad = randomChoice(roadPool);
    if (extraRoad && !detail.roads.find(r => r.raw === extraRoad)) {
      detail.roads.push({ name: extraRoad + "路", raw: extraRoad });
    }
    const metroPool = GeoNameData.regions[region].metro || [];
    const extraMetro = randomChoice(metroPool);
    if (extraMetro && !detail.metros.find(m => m.raw === extraMetro)) {
      detail.metros.push({ name: extraMetro + "站", raw: extraMetro });
    }
  }

  return detail;
}
