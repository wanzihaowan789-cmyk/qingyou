(function () {
  'use strict';

  window.__QY_APP_LOADED = true;

  var data = window.QY_DATA || null;
  var CUSTOM_ITEMS_KEY = 'qingyou_custom_items_v1';
  var STORAGE_KEY = 'qingyou_state_v1';

  var tabs = Array.prototype.slice.call(document.querySelectorAll('.tab'));
  var views = Array.prototype.slice.call(document.querySelectorAll('.view'));
  var toastEl = document.getElementById('toast');
  var noticeEl = document.getElementById('cards-notice');
  var guideEl = document.getElementById('cards-guide');
  var quizModal = document.getElementById('quiz-modal');
  var quizTitle = document.getElementById('quiz-title');
  var quizProgress = document.getElementById('quiz-progress');
  var quizBody = document.getElementById('quiz-body');
  var quizClose = document.getElementById('quiz-close');
  var toastTimer = null;
  var noticeTimer = null;
  var currentView = 'today';
  var selectedChapter = '';

  var CHAPTER_ALIAS = {
    '集合': '集合与常用逻辑用语',
    '逻辑': '集合与常用逻辑用语',
    '函数': '函数的概念与性质'
  };

  var CHAPTER_ORDER = [
    '集合与常用逻辑用语',
    '一元二次函数、方程和不等式',
    '函数的概念与性质',
    '指数函数与对数函数',
    '三角函数',
    '平面向量及其应用',
    '复数',
    '立体几何初步',
    '统计',
    '概率',
    '空间向量与立体几何',
    '直线和圆的方程',
    '圆锥曲线的方程',
    '数列',
    '一元函数的导数及其应用',
    '计数原理',
    '随机变量及其分布',
    '成对数据的统计分析'
  ];

  var LAYERS = [
    { id: 'L0', label: '概念没懂', hint: '定义、公式没记住' },
    { id: 'L1', label: '方法想不到', hint: '知道考什么，但不知从哪下手' },
    { id: 'L2', label: '算错了', hint: '思路对，数字算错了' },
    { id: 'L3', label: '看错题漏条件', hint: '漏了定义域、范围、单位' },
    { id: 'L4', label: '会但没时间', hint: '会做，但来不及写完' }
  ];

  var STAGE_LABELS = {
    new: '新错题',
    learning: '学习中',
    scheduled: '待复习',
    reviewing: '复习中',
    mastered: '已掌握',
    lapsed: '已遗忘'
  };

  var quiz = {
    items: [],
    index: 0,
    selected: null,
    answered: false,
    returnView: 'cards',
    masteryRecordId: null,
    masteryPassed: false,
    reviewRecordId: null,
    hintUsed: false
  };

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) {
      node.className = className;
    }
    if (text !== undefined && text !== null) {
      node.textContent = String(text);
    }
    return node;
  }

  /* ============================================================
     数学写法排版：√(...)、a/b 竖排分数、^上标、_下标
     仅做展示，不改动数据；不支持的写法原样保留
     ============================================================ */

  function matchPair(text, openIndex, openChar, closeChar) {
    var open = openChar || '(';
    var close = closeChar || ')';
    var depth = 0;
    for (var i = openIndex; i < text.length; i += 1) {
      var ch = text.charAt(i);
      if (ch === open) {
        depth += 1;
      } else if (ch === close) {
        depth -= 1;
        if (depth === 0) {
          return i;
        }
      }
    }
    return -1;
  }

  function findOpenBracket(text, closeIndex) {
    var depth = 0;
    for (var i = closeIndex; i >= 0; i -= 1) {
      var ch = text.charAt(i);
      if (ch === ')') {
        depth += 1;
      } else if (ch === '(') {
        depth -= 1;
        if (depth === 0) {
          return i;
        }
      }
    }
    return -1;
  }

  /* 读上标/下标内容：^{...}、^(...)、^2、^x */
  function readScript(text, start) {
    var ch = text.charAt(start);
    if (ch === '{') {
      var closeBrace = matchPair(text, start, '{', '}');
      if (closeBrace > -1) {
        return { text: text.slice(start + 1, closeBrace), end: closeBrace + 1 };
      }
    }
    if (ch === '(') {
      var closeParen = matchPair(text, start);
      if (closeParen > -1) {
        return { text: text.slice(start + 1, closeParen), end: closeParen + 1 };
      }
    }
    var digits = /^[0-9]+/.exec(text.slice(start));
    if (digits) {
      return { text: digits[0], end: start + digits[0].length };
    }
    var letter = /^[a-zA-Z]/.exec(text.slice(start));
    if (letter) {
      return { text: letter[0], end: start + letter[0].length };
    }
    return null;
  }

  /* 从左缓冲尾部取分子：数字、单字母、(括号组)（可带前置 √） */
  function takeNumerator(buffer) {
    if (!buffer) {
      return null;
    }
    var word = /(\d+(?:\.\d+)?|[a-zA-Z])$/.exec(buffer);
    if (word) {
      var rawWord = word[1];
      /* 避免把 "2x" 里的 x 单独当分子、把系数丢掉 */
      var before = buffer.charAt(buffer.length - rawWord.length - 1);
      if (/[0-9a-zA-Z)]/.test(before) && /^[a-zA-Z]$/.test(rawWord)) {
        return null;
      }
      return { raw: rawWord, text: rawWord };
    }
    if (buffer.charAt(buffer.length - 1) === ')') {
      var open = findOpenBracket(buffer, buffer.length - 1);
      if (open > -1) {
        var from = open;
        if (open > 0 && buffer.charAt(open - 1) === '√') {
          from = open - 1;
        }
        var rawGroup = buffer.slice(from);
        return { raw: rawGroup, text: rawGroup };
      }
    }
    return null;
  }

  /* 从 / 之后读分母 */
  function readDenominator(text, start) {
    var i = start;
    while (text.charAt(i) === ' ') {
      i += 1;
    }
    if (text.charAt(i) === '(') {
      var close = matchPair(text, i);
      if (close > -1) {
        return { text: text.slice(i + 1, close), end: close + 1 };
      }
      return null;
    }
    var num = /^\d+(?:\.\d+)?/.exec(text.slice(i));
    if (num) {
      return { text: num[0], end: i + num[0].length };
    }
    var letter = /^[a-zA-Z]/.exec(text.slice(i));
    if (letter) {
      return { text: letter[0], end: i + 1 };
    }
    return null;
  }

  function buildFraction(numerator, denominator) {
    var frac = document.createElement('span');
    frac.className = 'math-frac';
    frac.setAttribute('role', 'math');
    frac.setAttribute('aria-label', denominator + ' 分之 ' + numerator);
    var top = document.createElement('span');
    top.className = 'frac-top';
    top.appendChild(mathFragment(numerator));
    var bottom = document.createElement('span');
    bottom.className = 'frac-bottom';
    bottom.appendChild(mathFragment(denominator));
    frac.appendChild(top);
    frac.appendChild(bottom);
    return frac;
  }

  function buildSqrt(inner) {
    var wrap = document.createElement('span');
    wrap.className = 'math-sqrt';
    wrap.setAttribute('role', 'math');
    wrap.setAttribute('aria-label', '根号 ' + inner);
    var sign = document.createElement('span');
    sign.className = 'sqrt-sign';
    sign.textContent = '√';
    var body = document.createElement('span');
    body.className = 'sqrt-body';
    body.appendChild(mathFragment(inner));
    wrap.appendChild(sign);
    wrap.appendChild(body);
    return wrap;
  }

  function buildScriptNode(kind, inner) {
    var node = document.createElement(kind === 'sup' ? 'sup' : 'sub');
    node.className = 'math-script';
    node.appendChild(mathFragment(inner));
    return node;
  }

  function mathFragment(text) {
    var source = text === null || text === undefined ? '' : String(text);
    var frag = document.createDocumentFragment();
    var buffer = '';
    var i = 0;

    function flush() {
      if (buffer) {
        frag.appendChild(document.createTextNode(buffer));
        buffer = '';
      }
    }

    function push(node) {
      flush();
      frag.appendChild(node);
    }

    while (i < source.length) {
      var ch = source.charAt(i);

      if (ch === '√') {
        var end = i + 1;
        var inner = null;
        if (source.charAt(end) === '(') {
          var closeParen = matchPair(source, end);
          if (closeParen > -1) {
            inner = source.slice(end + 1, closeParen);
            end = closeParen + 1;
          }
        }
        if (inner === null) {
          var sqrtWord = /^[a-zA-Z0-9]+/.exec(source.slice(end));
          if (sqrtWord) {
            inner = sqrtWord[0];
            end += sqrtWord[0].length;
          }
        }
        if (inner !== null && inner !== '') {
          push(buildSqrt(inner));
          i = end;
          continue;
        }
      }

      if (ch === '^' || ch === '_') {
        var script = readScript(source, i + 1);
        if (script && script.text !== '') {
          push(buildScriptNode(ch === '^' ? 'sup' : 'sub', script.text));
          i = script.end;
          continue;
        }
      }

      if (ch === '/') {
        var numerator = takeNumerator(buffer);
        var denominator = numerator ? readDenominator(source, i + 1) : null;
        if (numerator && denominator) {
          buffer = buffer.slice(0, buffer.length - numerator.raw.length);
          push(buildFraction(numerator.text, denominator.text));
          i = denominator.end;
          continue;
        }
      }

      buffer += ch;
      i += 1;
    }

    flush();
    return frag;
  }

  /* 用排版结果替换元素文字；纯文本时退化为 textContent */
  function setMathText(node, text) {
    node.textContent = '';
    node.appendChild(mathFragment(text));
    return node;
  }

  /* 建元素并直接写入排版文本 */
  function mathEl(tag, className, text) {
    return setMathText(el(tag, className), text);
  }

  /* 调试钩子：仅当 window.QY_DEBUG 为真时导出，便于自动化验收排版 */
  if (window.QY_DEBUG) {
    window.QY_MATH = mathFragment;
    window.QY_ANSWER = {
      normalize: normalizeAnswer,
      candidates: answerCandidates,
      correct: isAnswerCorrect
    };
  }

  function pad2(value) {
    return value < 10 ? '0' + value : String(value);
  }

  function formatDate(date) {
    return date.getFullYear() + '-' + pad2(date.getMonth() + 1) + '-' + pad2(date.getDate());
  }

  function addDays(date, days) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
  }

  function tomorrowStr() {
    return formatDate(addDays(new Date(), 1));
  }

  function genId(prefix) {
    return prefix + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }

  function defaultState() {
    return {
      version: 1,
      profile: {},
      records: [],
      history: []
    };
  }

  function seededState() {
    var now = new Date();
    var at = now.toISOString();
    var today = formatDate(now);
    var later = formatDate(addDays(now, 3));
    var records = [
      {
        id: 'r_seed_1', itemId: 'q_0005', kpId: 'K3.2', at: at, correct: false,
        layer: 'L0', ef: 2.3, interval: 1, dueAt: today, stage: 'lapsed', reviews: 0, streak: 0
      },
      {
        id: 'r_seed_2', itemId: 'q_0011', kpId: 'K3.3', at: at, correct: false,
        layer: 'L1', ef: 2.3, interval: 1, dueAt: today, stage: 'lapsed', reviews: 0, streak: 0
      },
      {
        id: 'r_seed_3', itemId: 'q_0019', kpId: 'K3.6', at: at, correct: false,
        layer: 'L0', ef: 2.3, interval: 1, dueAt: later, stage: 'scheduled', reviews: 0, streak: 0
      }
    ];
    return {
      version: 1,
      profile: {},
      records: records,
      history: [
        { id: 'h_seed_1', itemId: 'q_0005', kpId: 'K3.2', at: at, correct: false, layer: 'L0' },
        { id: 'h_seed_2', itemId: 'q_0011', kpId: 'K3.3', at: at, correct: false, layer: 'L1' },
        { id: 'h_seed_3', itemId: 'q_0019', kpId: 'K3.6', at: at, correct: false, layer: 'L0' }
      ]
    };
  }

  function loadState() {
    try {
      var raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return defaultState();
      }
      var parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object' || parsed.version !== 1) {
        return defaultState();
      }
      if (isUntouchedSeed(parsed)) {
        return defaultState();
      }
      return {
        version: 1,
        profile: parsed.profile && typeof parsed.profile === 'object' ? parsed.profile : {},
        records: Array.isArray(parsed.records) ? parsed.records : [],
        history: Array.isArray(parsed.history) ? parsed.history : []
      };
    } catch (error) {
      return defaultState();
    }
  }

  function isUntouchedSeed(parsed) {
    if (!Array.isArray(parsed.records) || !parsed.records.length) {
      return false;
    }
    var i;
    for (i = 0; i < parsed.records.length; i += 1) {
      if (!/^r_seed_/.test(parsed.records[i].id || '')) {
        return false;
      }
    }
    var history = Array.isArray(parsed.history) ? parsed.history : [];
    for (i = 0; i < history.length; i += 1) {
      if (!/^h_seed_/.test(history[i].id || '')) {
        return false;
      }
    }
    return true;
  }

  var state = loadState();
  var customItems = loadCustomItems();
  mergeCustomItems(customItems);

  function loadCustomItems() {
    try {
      var raw = window.localStorage.getItem(CUSTOM_ITEMS_KEY);
      if (!raw) {
        return [];
      }
      var parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      return [];
    }
  }

  function mergeCustomItems(items) {
    if (!data || !Array.isArray(data.items) || !Array.isArray(items)) {
      return;
    }
    var existing = {};
    data.items.forEach(function (item) {
      existing[item.id] = true;
    });
    items.forEach(function (item) {
      if (item && item.id && !existing[item.id]) {
        data.items.push(item);
        existing[item.id] = true;
      }
    });
  }

  function saveCustomItems() {
    try {
      window.localStorage.setItem(CUSTOM_ITEMS_KEY, JSON.stringify(customItems));
      return true;
    } catch (error) {
      showToast('浏览器不允许保存自定义题库');
      return false;
    }
  }

  function saveState() {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      return true;
    } catch (error) {
      showToast('浏览器不允许保存数据，请检查是否禁用了本地存储');
      return false;
    }
  }

  function showToast(message) {
    if (!toastEl) {
      return;
    }
    toastEl.textContent = message;
    toastEl.hidden = false;
    if (toastTimer) {
      window.clearTimeout(toastTimer);
    }
    toastTimer = window.setTimeout(function () {
      toastEl.hidden = true;
    }, 2200);
  }

  function showNotice(message) {
    if (!noticeEl) {
      return;
    }
    noticeEl.textContent = message;
    noticeEl.hidden = false;
    if (noticeTimer) {
      window.clearTimeout(noticeTimer);
    }
    noticeTimer = window.setTimeout(function () {
      noticeEl.hidden = true;
    }, 3200);
  }

  function switchView(name) {
    currentView = name;
    views.forEach(function (section) {
      section.classList.toggle('is-active', section.getAttribute('data-view') === name);
    });
    tabs.forEach(function (tab) {
      var active = tab.getAttribute('data-view') === name;
      tab.classList.toggle('is-active', active);
      tab.setAttribute('aria-selected', active ? 'true' : 'false');
    });
    renderView(name);
  }

  tabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      switchView(tab.getAttribute('data-view'));
    });
  });

  function findKp(kpId) {
    if (!data || !Array.isArray(data.knowledge)) {
      return null;
    }
    for (var i = 0; i < data.knowledge.length; i += 1) {
      if (data.knowledge[i].id === kpId) {
        return data.knowledge[i];
      }
    }
    return null;
  }

  function kpName(kpId) {
    var kp = findKp(kpId);
    return kp ? kp.name : '未知考点';
  }

  function kpWeight(kpId) {
    var kp = findKp(kpId);
    return kp && typeof kp.weight === 'number' ? kp.weight : 0;
  }

  function findItem(itemId) {
    if (!data || !Array.isArray(data.items)) {
      return null;
    }
    for (var i = 0; i < data.items.length; i += 1) {
      if (data.items[i].id === itemId) {
        return data.items[i];
      }
    }
    return null;
  }

  function findRecordByItem(itemId) {
    for (var i = 0; i < state.records.length; i += 1) {
      if (state.records[i].itemId === itemId) {
        return state.records[i];
      }
    }
    return null;
  }

  function normalizeAnswer(value) {
    var text = String(value === null || value === undefined ? '' : value);
    if (typeof text.normalize === 'function') {
      text = text.normalize('NFKC');
    }
    return text
      .toLowerCase()
      .replace(/不等于/g, '≠')
      .replace(/大于等于/g, '≥')
      .replace(/小于等于/g, '≤')
      .replace(/不小于/g, '≥')
      .replace(/不大于/g, '≤')
      .replace(/大于/g, '>')
      .replace(/小于/g, '<')
      .replace(/>=/g, '≥')
      .replace(/<=/g, '≤')
      .replace(/正无穷大|正无穷|\+无穷/g, '+∞')
      .replace(/负无穷大|负无穷|-无穷/g, '-∞')
      .replace(/无穷大|无穷/g, '∞')
      .replace(/[\u2212\u2010-\u2015]/g, '-')
      .replace(/[×✕✖]/g, '*')
      .replace(/÷/g, '/')
      .replace(/空\s*集/g, '∅')
      .replace(/\s+/g, '')
      .replace(/[，、]/g, ',')
      .replace(/；/g, ';')
      .replace(/：/g, ':')
      .replace(/^\{\}$/, '∅');
  }

  function pushUnique(list, value) {
    if (value && list.indexOf(value) === -1) {
      list.push(value);
    }
  }

  /* (1,3] → 1<x≤3、3≥x>1；[2,+∞) → x≥2 */
  function intervalToInequalities(text) {
    var out = [];
    var m = /^([\[(])([^,]+),([^\])]+)([\])])$/.exec(text);
    if (!m) {
      return out;
    }
    var leftBracket = m[1];
    var low = m[2];
    var high = m[3];
    var rightBracket = m[4];
    var lowIsInf = low === '-∞';
    var highIsInf = high === '+∞' || high === '∞';
    if (lowIsInf && highIsInf) {
      return out;
    }
    if (lowIsInf) {
      pushUnique(out, 'x' + (rightBracket === ']' ? '≤' : '<') + high);
      return out;
    }
    if (highIsInf) {
      pushUnique(out, 'x' + (leftBracket === '[' ? '≥' : '>') + low);
      return out;
    }
    /* 正向：a<x≤b */
    pushUnique(out, low + (leftBracket === '[' ? '≤' : '<') + 'x' +
      (rightBracket === ']' ? '≤' : '<') + high);
    /* 反向：b≥x>a */
    pushUnique(out, high + (rightBracket === ']' ? '≥' : '>') + 'x' +
      (leftBracket === '[' ? '≥' : '>') + low);
    return out;
  }

  /* x>1 → (1,+∞)；a<x≤b → (a,b] */
  function inequalityToIntervals(text) {
    var out = [];
    var single = /^x([<>≤≥])(.+)$/.exec(text);
    if (single) {
      var sign = single[1];
      var value = single[2];
      if (/^-?\d+(?:\.\d+)?$/.test(value)) {
        if (sign === '>') {
          pushUnique(out, '(' + value + ',+∞)');
        } else if (sign === '≥') {
          pushUnique(out, '[' + value + ',+∞)');
        } else if (sign === '<') {
          pushUnique(out, '(-∞,' + value + ')');
        } else {
          pushUnique(out, '(-∞,' + value + ']');
        }
      }
      return out;
    }
    var double = /^(.+?)([<>≤≥])x([<>≤≥])(.+)$/.exec(text);
    if (double) {
      pushUnique(out, (double[2] === '<' ? '(' : '[') + double[1] +
        ',' + double[4] + (double[3] === '<' ? ')' : ']'));
      return out;
    }
    /* 1<x、1≤x、3>x 这类“数字在左”的写法 */
    var numLeft = /^(-?\d+(?:\.\d+)?)([<>≤≥])x$/.exec(text);
    if (numLeft) {
      var bound = numLeft[1];
      var cmp = numLeft[2];
      if (cmp === '<') {
        pushUnique(out, '(' + bound + ',+∞)');
      } else if (cmp === '≤') {
        pushUnique(out, '[' + bound + ',+∞)');
      } else if (cmp === '>') {
        pushUnique(out, '(-∞,' + bound + ')');
      } else {
        pushUnique(out, '(-∞,' + bound + ']');
      }
    }
    return out;
  }

  /* {2,4} → {2,4} 的排序版本；含 x、| 等描述式的集合原样返回空 */
  function sortSetMembers(text) {
    var m = /^\{([^{}]*)\}$/.exec(text);
    if (!m) {
      return '';
    }
    var inner = m[1];
    if (!inner || inner.indexOf('|') !== -1 || /[x≠<>≤≥]/.test(inner)) {
      return '';
    }
    var parts = inner.split(',');
    var cleaned = [];
    for (var i = 0; i < parts.length; i += 1) {
      if (parts[i] !== '') {
        cleaned.push(parts[i]);
      }
    }
    if (cleaned.length < 2) {
      return '';
    }
    cleaned.sort();
    return '{' + cleaned.join(',') + '}';
  }

  /* 纯数值 / 分数答案的统一取值，1/2 与 0.5 等价 */
  function answerNumberValue(text) {
    var m = /^(-)?(\d+(?:\.\d+)?)(?:\/(\d+(?:\.\d+)?))?$/.exec(text);
    if (!m) {
      return null;
    }
    var value = parseFloat(m[2]);
    if (m[3]) {
      var denominator = parseFloat(m[3]);
      if (!denominator) {
        return null;
      }
      value = value / denominator;
    }
    return m[1] ? -value : value;
  }

  function answersEquivalent(user, candidate) {
    if (user === candidate) {
      return true;
    }
    var userValue = answerNumberValue(user);
    var candidateValue = answerNumberValue(candidate);
    if (userValue !== null && candidateValue !== null) {
      return Math.abs(userValue - candidateValue) < 1e-9;
    }
    return false;
  }

  function answerCandidates(answer, item) {
    var base = normalizeAnswer(answer);
    var candidates = [];
    pushUnique(candidates, base);

    /* 空集：∅ / {} / 空集 都算 */
    if (base === '∅' || base === '{}') {
      pushUnique(candidates, '∅');
      pushUnique(candidates, '{}');
      pushUnique(candidates, '空集');
    }

    /* ∞ 与 +∞ 互通 */
    if (base.indexOf('∞') !== -1) {
      pushUnique(candidates, base.replace(/\+∞/g, '∞'));
      pushUnique(candidates, base.replace(/∞/g, '+∞'));
    }

    var stripped = base.replace(/^\{/, '').replace(/\}$/, '');
    if (stripped !== base) {
      pushUnique(candidates, stripped);
    }
    var noDomain = stripped.replace(/^x[|:]/, '');
    if (noDomain !== stripped) {
      pushUnique(candidates, noDomain);
    }

    /* 集合元素无序 */
    var sortedSet = sortSetMembers(base);
    if (sortedSet) {
      pushUnique(candidates, sortedSet);
    }
    var sortedInner = sortSetMembers('{' + stripped + '}');
    if (sortedInner) {
      pushUnique(candidates, sortedInner.replace(/^\{/, '').replace(/\}$/, ''));
    }

    /* 区间与不等式互相转换 */
    var fromInterval = intervalToInequalities(base);
    for (var i = 0; i < fromInterval.length; i += 1) {
      pushUnique(candidates, fromInterval[i]);
    }
    var fromInequality = inequalityToIntervals(base);
    for (var j = 0; j < fromInequality.length; j += 1) {
      pushUnique(candidates, fromInequality[j]);
    }

    /* 题目自带的等价答案白名单 */
    if (item && Array.isArray(item.accept)) {
      for (var k = 0; k < item.accept.length; k += 1) {
        pushUnique(candidates, normalizeAnswer(item.accept[k]));
      }
    }
    return candidates;
  }

  function isAnswerCorrect(item, answer) {
    var user = normalizeAnswer(answer);
    if (item.type === 'multi') {
      var userSet = user.replace(/[,;、]/g, '').split('').sort().join('');
      var answerSet = normalizeAnswer(item.answer)
        .replace(/[,;、]/g, '').split('').sort().join('');
      return userSet === answerSet;
    }
    var answerList = answerCandidates(item.answer, item);
    /* 用户侧同样展开等价写法：1<x → (1,+∞)、{4,2} → {2,4} */
    var userList = answerCandidates(user, null);
    for (var i = 0; i < userList.length; i += 1) {
      for (var j = 0; j < answerList.length; j += 1) {
        if (answersEquivalent(userList[i], answerList[j])) {
          return true;
        }
      }
    }
    return false;
  }

  function recordAnswer(item, correct, layer) {
    var now = new Date();
    var at = now.toISOString();
    var wasUnlocked = isLevelUnlocked(item.kpId);
    var record = quiz.reviewRecordId ? findRecordById(quiz.reviewRecordId) : null;
    if (!record) {
      record = findRecordByItem(item.id);
    }
    var isReview = !!record;

    if (!record) {
      record = {
        id: genId('r'),
        itemId: item.id,
        kpId: item.kpId,
        at: at,
        correct: !!correct,
        layer: correct ? '' : layer,
        ef: 2.5,
        interval: 1,
        dueAt: tomorrowStr(),
        stage: 'new',
        reviews: 0,
        streak: 0,
        lastVariantId: ''
      };
      state.records.push(record);
    } else {
      record.at = at;
      record.kpId = item.kpId;
      record.layer = correct ? '' : layer;
    }

    if (quiz.reviewRecordId) {
      record.lastVariantId = item.id;
    }

    applySchedule(record, correct);
    if (isReview) {
      record.reviews += 1;
    }

    state.history.push({
      id: genId('h'),
      itemId: item.id,
      kpId: item.kpId,
      at: at,
      correct: !!correct,
      layer: correct ? '' : layer,
      hintUsed: !!quiz.hintUsed
    });

    if (!wasUnlocked && isLevelUnlocked(item.kpId)) {
      showToast('这个考点基础题已达标，中档题解锁了');
    }

    saveState();
  }

  function applySchedule(record, correct) {
    var today = new Date();

    record.correct = !!correct;
    record.ef = typeof record.ef === 'number' ? record.ef : 2.5;
    record.interval = typeof record.interval === 'number' && record.interval > 0 ? record.interval : 1;
    record.reviews = typeof record.reviews === 'number' ? record.reviews : 0;
    record.streak = typeof record.streak === 'number' ? record.streak : 0;

    if (correct) {
      record.interval = Math.max(1, Math.round(record.interval * record.ef));
      record.ef = Math.min(2.8, Math.round((record.ef + 0.1) * 100) / 100);
      record.streak += 1;
      record.dueAt = formatDate(addDays(today, record.interval));

      if (record.stage === 'new' || record.stage === 'lapsed' || record.stage === 'learning') {
        record.stage = 'scheduled';
      } else {
        record.stage = 'reviewing';
      }

      if (record.streak >= 2 && record.interval >= 7) {
        record.stage = 'mastered';
      }
    } else {
      record.interval = 1;
      record.ef = Math.max(1.3, Math.round((record.ef - 0.2) * 100) / 100);
      record.streak = 0;
      record.stage = 'lapsed';
      record.dueAt = tomorrowStr();
    }
  }

  function layerLabel(layerId) {
    for (var i = 0; i < LAYERS.length; i += 1) {
      if (LAYERS[i].id === layerId) {
        return LAYERS[i].label;
      }
    }
    return '';
  }

  function stageLabel(stage) {
    return STAGE_LABELS[stage] || '新错题';
  }

  function cardById(cardId) {
    if (!data || !Array.isArray(data.cards)) {
      return null;
    }
    for (var i = 0; i < data.cards.length; i += 1) {
      if (data.cards[i].id === cardId) {
        return data.cards[i];
      }
    }
    return null;
  }

  function renderDataError(host) {
    host.textContent = '';
    var box = el('div', 'empty-state');
    box.appendChild(el('p', 'empty-title', '题库没有加载成功'));
    box.appendChild(el('p', 'empty-text', '请确认 data.js 与 index.html 在同一文件夹；如果只拿到了一个文件，请改用 qingyou-standalone.html。'));
    host.appendChild(box);
  }

  function renderGuide() {
    if (!guideEl) {
      return;
    }
    if (state.profile && state.profile.guideDismissed) {
      guideEl.hidden = true;
      return;
    }
    if (!data) {
      guideEl.hidden = true;
      return;
    }

    guideEl.hidden = false;
    guideEl.textContent = '';

    var title = el('p', 'guide-title', '第一次用？按这个顺序来');
    guideEl.appendChild(title);

    var steps = el('ol', 'guide-steps');
    [
      '先读一张概念卡，点「自检」确认自己懂没懂。',
      '点「去练 2 道」，做同考点的题。',
      '答错时选一个错因；之后「今日」会按遗忘曲线提醒你复习。',
      '系统会先给你基础题，基础做稳了再出现中档题。'
    ].forEach(function (text) {
      steps.appendChild(el('li', '', text));
    });
    guideEl.appendChild(steps);

    var closeBtn = el('button', 'btn btn-ghost btn-small', '知道了');
    closeBtn.type = 'button';
    closeBtn.addEventListener('click', function () {
      state.profile = state.profile || {};
      state.profile.guideDismissed = true;
      saveState();
      guideEl.hidden = true;
    });
    guideEl.appendChild(closeBtn);
  }

  function loadSampleData() {
    if (state.records.length) {
      showToast('已有学习记录，示例只在空数据时加载');
      return;
    }
    var seeded = seededState();
    state.records = seeded.records;
    state.history = seeded.history;
    state.profile = state.profile || {};
    saveState();
    renderView(currentView);
    showToast('已加载 3 条示例错题');
  }

  function chapterOfKp(kpId) {
    var kp = findKp(kpId);
    if (!kp || !kp.chapter) {
      return '其他';
    }
    return CHAPTER_ALIAS[kp.chapter] || kp.chapter;
  }

  function chapterOrderIndex(name) {
    var index = CHAPTER_ORDER.indexOf(name);
    return index === -1 ? 999 : index;
  }

  var chapterInitialized = false;
  var expandedCards = {};
  var cardSearch = '';
  var favoritesOnly = false;
  var favorites = loadFavorites();

  function loadFavorites() {
    try {
      var raw = window.localStorage.getItem('qingyou_favorites_v1');
      return raw ? JSON.parse(raw) : {};
    } catch (error) {
      return {};
    }
  }

  function saveFavorites() {
    try {
      window.localStorage.setItem('qingyou_favorites_v1', JSON.stringify(favorites));
    } catch (error) {
      showToast('浏览器不允许保存收藏');
    }
  }

  function toggleFavorite(cardId) {
    if (favorites[cardId]) {
      delete favorites[cardId];
    } else {
      favorites[cardId] = true;
    }
    saveFavorites();
    renderCards();
  }

  function renderCards() {
    var host = document.getElementById('card-list');
    if (!host) {
      return;
    }

    if (!data || !Array.isArray(data.cards) || data.cards.length === 0) {
      host.textContent = '';
      if (guideEl) {
        guideEl.hidden = true;
      }
      renderDataError(host);
      return;
    }

    renderGuide();

    var chapters = [];
    var counts = {};
    data.cards.forEach(function (card) {
      var chapter = chapterOfKp(card.kpId);
      if (chapters.indexOf(chapter) === -1) {
        chapters.push(chapter);
      }
      counts[chapter] = (counts[chapter] || 0) + 1;
    });
    chapters.sort(function (a, b) {
      return chapterOrderIndex(a) - chapterOrderIndex(b);
    });

    if (!chapterInitialized) {
      /* 默认展示全部章节，避免用户误以为只有一章的几张卡 */
      chapterInitialized = true;
    }
    if (selectedChapter && chapters.indexOf(selectedChapter) === -1) {
      selectedChapter = '';
    }

    if (!host.querySelector('.card-toolbar')) {
      buildCardsToolbar(host, chapters, counts);
    }
    renderCardResults();
  }

  /* 工具栏只构建一次，搜索/筛选只重绘结果区，避免输入框失焦 */
  function buildCardsToolbar(host, chapters, counts) {
    var toolbar = el('div', 'card-toolbar');
    var select = el('select', 'chapter-select');
    select.id = 'chapter-select';
    select.setAttribute('aria-label', '选择章节');
    var allOption = el('option', '', '全部（' + data.cards.length + ' 张）');
    allOption.value = '';
    select.appendChild(allOption);
    chapters.forEach(function (chapter) {
      var option = el('option', '', chapter + '（' + counts[chapter] + ' 张）');
      option.value = chapter;
      select.appendChild(option);
    });
    select.value = selectedChapter;
    select.addEventListener('change', function () {
      selectedChapter = select.value;
      renderCardResults();
    });
    toolbar.appendChild(select);
    var countEl = el('span', 'card-toolbar-count');
    countEl.id = 'card-toolbar-count';
    toolbar.appendChild(countEl);
    host.appendChild(toolbar);

    var searchRow = el('div', 'card-toolbar card-toolbar-search');
    var searchInput = el('input', 'card-search');
    searchInput.id = 'card-search';
    searchInput.type = 'search';
    searchInput.placeholder = '搜索考点、标题或一句话';
    searchInput.setAttribute('aria-label', '搜索概念卡');
    searchInput.value = cardSearch;
    var searchBtn = el('button', 'btn btn-ghost btn-small card-search-btn', '搜索');
    searchBtn.type = 'button';
    var searchTimer = null;

    function applySearch() {
      var next = searchInput.value.trim();
      if (next === cardSearch) {
        return;
      }
      cardSearch = next;
      /* 新关键词优先全局搜索，避免被上次选中的章节挡住 */
      if (cardSearch && selectedChapter) {
        selectedChapter = '';
        select.value = '';
      }
      renderCardResults();
    }

    searchInput.addEventListener('input', function () {
      window.clearTimeout(searchTimer);
      searchTimer = window.setTimeout(applySearch, 140);
    });
    searchInput.addEventListener('keydown', function (event) {
      if (event.key === 'Enter') {
        window.clearTimeout(searchTimer);
        applySearch();
      } else if (event.key === 'Escape') {
        window.clearTimeout(searchTimer);
        searchInput.value = '';
        applySearch();
      }
    });
    searchBtn.addEventListener('click', function () {
      window.clearTimeout(searchTimer);
      applySearch();
    });

    var favoriteFilter = el('button', 'btn btn-small' + (favoritesOnly ? ' btn-primary' : ''), '只看收藏');
    favoriteFilter.type = 'button';
    favoriteFilter.setAttribute('aria-pressed', favoritesOnly ? 'true' : 'false');
    favoriteFilter.addEventListener('click', function () {
      favoritesOnly = !favoritesOnly;
      /* 收藏是全局的，别被上次选的章节挡住 */
      if (favoritesOnly && selectedChapter) {
        selectedChapter = '';
        select.value = '';
      }
      favoriteFilter.className = 'btn btn-small' + (favoritesOnly ? ' btn-primary' : '');
      favoriteFilter.setAttribute('aria-pressed', favoritesOnly ? 'true' : 'false');
      renderCardResults();
    });
    searchRow.appendChild(searchInput);
    searchRow.appendChild(searchBtn);
    searchRow.appendChild(favoriteFilter);
    host.appendChild(searchRow);

    var results = el('div', 'card-results');
    results.id = 'card-results';
    host.appendChild(results);

    }

  /* 结果区：关键词高亮 + 跨章节标题 + 准确计数 */
  function renderCardResults() {
    var results = document.getElementById('card-results');
    var selectEl = document.getElementById('chapter-select');
    var countEl = document.getElementById('card-toolbar-count');
    if (!results) {
      return;
    }
    results.textContent = '';

    var keyword = cardSearch.trim().toLowerCase();
    var matched = data.cards.filter(function (card) {
      if (favoritesOnly && !favorites[card.id]) {
        return false;
      }
      if (selectedChapter && chapterOfKp(card.kpId) !== selectedChapter) {
        return false;
      }
      if (!keyword) {
        return true;
      }
      var text = [card.title, card.oneLine, kpName(card.kpId)].join('').toLowerCase();
      return text.indexOf(keyword) !== -1;
    });

    if (countEl) {
      if (keyword) {
        countEl.textContent = '命中 ' + matched.length + ' / ' + data.cards.length + ' 张';
      } else if (favoritesOnly) {
        countEl.textContent = '收藏 ' + matched.length + ' 张';
      } else {
        countEl.textContent = matched.length + ' 张';
      }
    }
    if (selectEl) {
      selectEl.value = selectedChapter;
    }

    if (!matched.length) {
      var emptySearch = el('div', 'empty-state');
      emptySearch.appendChild(el('p', 'empty-title', '没有匹配的卡片'));
      emptySearch.appendChild(el('p', 'empty-text',
        keyword ? '换个关键词试试，比如“定义域”“单调性”。' : '先收藏几张卡片，这里就有内容了。'));
      if (keyword) {
        var clearBtn = el('button', 'btn btn-ghost btn-small', '清空搜索');
        clearBtn.type = 'button';
        clearBtn.addEventListener('click', function () {
          cardSearch = '';
          var input = document.getElementById('card-search');
          if (input) {
            input.value = '';
            input.focus();
          }
          renderCardResults();
        });
        emptySearch.appendChild(clearBtn);
      } else if (favoritesOnly) {
        var cancelBtn = el('button', 'btn btn-ghost btn-small', '取消“只看收藏”');
        cancelBtn.type = 'button';
        cancelBtn.addEventListener('click', function () {
          favoritesOnly = false;
          renderCards();
        });
        emptySearch.appendChild(cancelBtn);
      }
      results.appendChild(emptySearch);
      return;
    }

    /* 按章节分组，顺序跟随教材章节顺序 */
    var groups = [];
    matched.forEach(function (card) {
      var chapter = chapterOfKp(card.kpId);
      if (groups.indexOf(chapter) === -1) {
        groups.push(chapter);
      }
    });
    groups.sort(function (a, b) {
      return chapterOrderIndex(a) - chapterOrderIndex(b);
    });

    groups.forEach(function (chapter) {
      var cards = matched.filter(function (card) {
        return chapterOfKp(card.kpId) === chapter;
      });
      var group = el('section', 'chapter-group');
      var titleRow = el('div', 'chapter-title-row');
      titleRow.appendChild(el('h2', 'chapter-title', chapter));
      titleRow.appendChild(el('span', 'chapter-count', cards.length + ' 张'));
      group.appendChild(titleRow);

      var grid = el('div', 'card-grid');
      cards.forEach(function (card) {
        grid.appendChild(buildCard(card, keyword));
      });
      group.appendChild(grid);
      results.appendChild(group);
    });
  }

  /* 把命中片段包成 <mark>，避免用 innerHTML 拼接 */
  function highlightInto(node, text, keyword) {
    var source = text === undefined || text === null ? '' : String(text);
    if (!keyword) {
      node.textContent = source;
      return node;
    }
    var lower = source.toLowerCase();
    var at = lower.indexOf(keyword);
    if (at === -1) {
      node.textContent = source;
      return node;
    }
    var cursor = 0;
    while (at !== -1) {
      if (at > cursor) {
        node.appendChild(document.createTextNode(source.slice(cursor, at)));
      }
      var mark = document.createElement('mark');
      mark.className = 'kw-hit';
      mark.textContent = source.substr(at, keyword.length);
      node.appendChild(mark);
      cursor = at + keyword.length;
      at = lower.indexOf(keyword, cursor);
    }
    if (cursor < source.length) {
      node.appendChild(document.createTextNode(source.slice(cursor)));
    }
    return node;
  }

  function buildCard(card, keyword) {
    var article = el('article', 'card card-collapsible');
    var isOpen = !!expandedCards[card.id];
    if (isOpen) {
      article.classList.add('is-open');
    }

    var summary = el('div', 'card-summary');
    summary.setAttribute('role', 'button');
    summary.setAttribute('tabindex', '0');
    summary.setAttribute('aria-expanded', isOpen ? 'true' : 'false');

    var top = el('div', 'card-summary-top');
    top.appendChild(highlightInto(el('span', 'card-kp'), kpName(card.kpId), keyword));
    var summaryActions = el('div', 'card-summary-actions');
    var favoriteBtn = el('button', 'card-favorite' + (favorites[card.id] ? ' is-on' : ''), favorites[card.id] ? '已收藏' : '收藏');
    favoriteBtn.type = 'button';
    favoriteBtn.addEventListener('click', function (event) {
      event.stopPropagation();
      toggleFavorite(card.id);
    });
    summaryActions.appendChild(favoriteBtn);
    var chevron = el('span', 'card-chevron', isOpen ? '收起' : '展开');
    summaryActions.appendChild(chevron);
    top.appendChild(summaryActions);
    summary.appendChild(top);

    summary.appendChild(keyword
      ? highlightInto(el('h2', 'card-title'), card.title, keyword)
      : mathEl('h2', 'card-title', card.title));
    summary.appendChild(keyword
      ? highlightInto(el('p', 'card-oneline'), card.oneLine, keyword)
      : mathEl('p', 'card-oneline', card.oneLine));

    var practice = el('button', 'btn btn-primary btn-small', '去练 2 道');
    practice.type = 'button';
    practice.addEventListener('click', function (event) {
      event.stopPropagation();
      openQuiz(card.kpId, { returnView: 'cards' });
    });
    var actionsWrap = el('div', 'card-summary-actions');
    actionsWrap.appendChild(practice);
    summary.appendChild(actionsWrap);

    var detail = el('div', 'card-detail');
    detail.hidden = !isOpen;

    var fromSection = el('div', 'card-section');
    fromSection.appendChild(el('span', 'card-label', '它从哪来'));
    fromSection.appendChild(mathEl('p', 'card-text', card.whereFrom));
    detail.appendChild(fromSection);

    if (Array.isArray(card.points) && card.points.length > 0) {
      var pointsSection = el('div', 'card-section');
      pointsSection.appendChild(el('span', 'card-label', '三条要点'));
      var ul = el('ul', 'card-points');
      card.points.forEach(function (point) {
        ul.appendChild(mathEl('li', '', point));
      });
      pointsSection.appendChild(ul);
      detail.appendChild(pointsSection);
    }

    if (card.trap) {
      var trapSection = el('div', 'card-section');
      trapSection.appendChild(el('span', 'card-label card-label-trap', '常见坑'));
      trapSection.appendChild(mathEl('p', 'card-trap', card.trap));
      detail.appendChild(trapSection);
    }

    if (card.example) {
      var exampleBtn = el('button', 'btn btn-ghost btn-small', '看一道例题');
      exampleBtn.type = 'button';
      var exampleBox = el('div', 'card-example');
      exampleBox.hidden = true;
      exampleBox.appendChild(el('p', 'example-label', '例题'));
      exampleBox.appendChild(mathEl('p', 'example-stem', card.example.stem));
      var exampleSteps = el('ol', 'example-steps');
      card.example.steps.forEach(function (step) {
        exampleSteps.appendChild(mathEl('li', '', step));
      });
      exampleBox.appendChild(exampleSteps);
      exampleBox.appendChild(mathEl('p', 'example-answer', '答案：' + card.example.answer));
      if (card.example.note) {
        exampleBox.appendChild(el('p', 'example-note', '易错：' + card.example.note));
      }
      var examplePractice = el('button', 'btn btn-primary btn-small example-practice', '看完例题，练 2 道同类题');
      examplePractice.type = 'button';
      examplePractice.addEventListener('click', function (event) {
        event.stopPropagation();
        openQuiz(card.kpId, { returnView: 'cards' });
      });
      exampleBox.appendChild(examplePractice);
      exampleBtn.addEventListener('click', function () {
        exampleBox.hidden = !exampleBox.hidden;
        exampleBtn.textContent = exampleBox.hidden ? '看一道例题' : '收起例题';
      });
      detail.appendChild(exampleBtn);
      detail.appendChild(exampleBox);
    }

    var checkBox = el('div', 'card-check');
    checkBox.hidden = true;
    checkBox.appendChild(mathEl('p', 'check-q', '自检：' + card.check.q));

    var answer = mathEl('p', 'check-a', '答案：' + card.check.a);
    answer.hidden = true;

    var showAnswerBtn = el('button', 'btn btn-ghost btn-small', '看答案');
    showAnswerBtn.type = 'button';
    showAnswerBtn.addEventListener('click', function () {
      answer.hidden = false;
      showAnswerBtn.hidden = true;
    });
    checkBox.appendChild(showAnswerBtn);
    checkBox.appendChild(answer);
    detail.appendChild(checkBox);

    var actions = el('div', 'card-actions');
    var toggleBtn = el('button', 'btn btn-small', '自检');
    toggleBtn.type = 'button';
    toggleBtn.addEventListener('click', function () {
      checkBox.hidden = !checkBox.hidden;
      toggleBtn.textContent = checkBox.hidden ? '自检' : '收起自检';
    });
    actions.appendChild(toggleBtn);
    detail.appendChild(actions);

    function toggleCard() {
      var open = !expandedCards[card.id];
      expandedCards[card.id] = open;
      detail.hidden = !open;
      chevron.textContent = open ? '收起' : '展开';
      article.classList.toggle('is-open', open);
      summary.setAttribute('aria-expanded', open ? 'true' : 'false');
    }

    summary.addEventListener('click', toggleCard);
    summary.addEventListener('keydown', function (event) {
      if (event.target !== summary) {
        return;
      }
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        toggleCard();
      }
    });

    article.appendChild(summary);
    article.appendChild(detail);
    return article;
  }


  function dueQueue() {
    var today = formatDate(new Date());
    var due = [];

    state.records.forEach(function (record) {
      if (record.dueAt && record.dueAt <= today) {
        due.push(record);
      }
    });

    due.sort(function (a, b) {
      if (a.dueAt !== b.dueAt) {
        return a.dueAt < b.dueAt ? -1 : 1;
      }
      var weightDiff = kpWeight(b.kpId) - kpWeight(a.kpId);
      if (weightDiff !== 0) {
        return weightDiff;
      }
      var aLapsed = a.stage === 'lapsed' ? 1 : 0;
      var bLapsed = b.stage === 'lapsed' ? 1 : 0;
      return bLapsed - aLapsed;
    });

    return due.slice(0, 5);
  }

  function localDateKey(iso) {
    var date = new Date(iso);
    if (isNaN(date.getTime())) {
      return '';
    }
    return formatDate(date);
  }

  function buildLearningStatus() {
    var dates = {};
    state.history.forEach(function (entry) {
      var key = localDateKey(entry.at);
      if (key) {
        dates[key] = (dates[key] || 0) + 1;
      }
    });
    var today = formatDate(new Date());
    var streak = 0;
    var cursor = new Date();
    if (!dates[today]) {
      cursor = addDays(cursor, -1);
    }
    while (dates[formatDate(cursor)]) {
      streak += 1;
      cursor = addDays(cursor, -1);
    }
    var todayCount = dates[today] || 0;
    var total = state.history.length;
    var mastered = state.records.filter(function (record) {
      return record.stage === 'mastered';
    }).length;
    return {
      streak: streak,
      todayCount: todayCount,
      goal: 5,
      total: total,
      mastered: mastered,
      badges: [
        { label: '连续 3 天', unlocked: streak >= 3 },
        { label: '答满 50 题', unlocked: total >= 50 },
        { label: '掌握 10 个', unlocked: mastered >= 10 }
      ]
    };
  }

  function buildStreakCard(status) {
    var card = el('section', 'streak-card');
    var top = el('div', 'streak-top');
    top.appendChild(el('span', 'streak-label', '连续学习'));
    top.appendChild(el('span', 'streak-value', status.streak + ' 天'));
    card.appendChild(top);

    card.appendChild(el('p', 'streak-goal',
      '今日 ' + status.todayCount + ' / ' + status.goal + ' 题' +
      (status.todayCount >= status.goal ? '，已达标' : '')));

    var bar = el('div', 'streak-bar');
    var fill = el('div', 'streak-fill');
    fill.style.width = Math.min(100, status.todayCount / status.goal * 100) + '%';
    bar.appendChild(fill);
    card.appendChild(bar);

    var badges = el('div', 'streak-badges');
    status.badges.forEach(function (badge) {
      badges.appendChild(el('span', 'badge-chip' + (badge.unlocked ? ' is-on' : ''), badge.label));
    });
    card.appendChild(badges);

    if (status.todayCount < status.goal) {
      var cta = el('button', 'btn btn-primary streak-cta',
        '开始今天的 ' + (status.goal - status.todayCount) + ' 题');
      cta.type = 'button';
      cta.addEventListener('click', startTodayPractice);
      card.appendChild(cta);
    }
    return card;
  }

  /* 今日开练：优先到期复习卡，其次挑权重最高、练得最少的考点 */
  function startTodayPractice() {
    if (!data || !Array.isArray(data.items) || !data.items.length) {
      showToast('题库还在加载，稍等一下');
      return;
    }
    var queue = dueQueue();
    var items = [];
    var i;
    for (i = 0; i < queue.length && items.length < 5; i += 1) {
      var picked = pickReviewItem(queue[i]);
      if (picked) {
        items.push(picked);
      }
    }
    if (items.length) {
      openQuiz(items[0].kpId, { items: items, returnView: 'today' });
      return;
    }

    var bestKp = '';
    var bestScore = -1e9;
    var kps = data.knowledge || [];
    for (i = 0; i < kps.length; i += 1) {
      var done = 0;
      for (var h = 0; h < state.history.length; h += 1) {
        if (state.history[h].kpId === kps[i].id) {
          done += 1;
        }
      }
      var score = (kps[i].weight || 0) * 10 - done;
      if (score > bestScore) {
        bestScore = score;
        bestKp = kps[i].id;
      }
    }
    var batch = bestKp ? pickPracticeItems(bestKp, 5) : [];
    if (!batch.length) {
      showToast('暂时没有可练的题');
      return;
    }
    openQuiz(bestKp, { items: batch, returnView: 'today' });
  }

  function renderToday() {
    var host = document.getElementById('today-content');
    if (!host) {
      return;
    }
    host.textContent = '';

    host.appendChild(buildStreakCard(buildLearningStatus()));

    if (state.records.length || state.history.length) {
      var todayDiagnosis = buildTodayDiagnosis();
      if (todayDiagnosis) {
        host.appendChild(todayDiagnosis);
      }
    }

    if (!data) {
      renderDataError(host);
      return;
    }

    var queue = dueQueue();

    if (queue.length === 0) {
      var empty = el('div', 'empty-state');
      if (!state.records.length) {
        empty.appendChild(el('p', 'empty-title', '先认识一下青柚学伴'));
        empty.appendChild(el('p', 'empty-text', '它不让你刷题海：先看一张概念卡补洞，再练 2 道同考点题；答错时选一个错因，之后系统会按遗忘曲线提醒你复习。'));
        var startBtn = el('button', 'btn btn-primary', '去概念卡看看');
        startBtn.type = 'button';
        startBtn.addEventListener('click', function () {
          switchView('cards');
        });
        empty.appendChild(startBtn);
        var sampleBtn = el('button', 'btn btn-ghost btn-small', '加载示例数据');
        sampleBtn.type = 'button';
        sampleBtn.style.marginLeft = '8px';
        sampleBtn.addEventListener('click', loadSampleData);
        empty.appendChild(sampleBtn);
      } else {
        empty.appendChild(el('p', 'empty-title', '今天没有要复习的'));
        empty.appendChild(el('p', 'empty-text', '去概念卡看一张，再练 2 道。'));
        var goBtn = el('button', 'btn btn-primary', '去练 2 道');
        goBtn.type = 'button';
        goBtn.addEventListener('click', function () {
          switchView('cards');
        });
        empty.appendChild(goBtn);
      }
      host.appendChild(empty);
      return;
    }

    var head = el('div', 'today-head');
    head.appendChild(el('h2', 'today-title', '今天该复习 ' + queue.length + ' 张'));
    head.appendChild(el('p', 'today-sub', '按到期时间排序，同一天到期的先复习权重高的考点'));
    host.appendChild(head);

    var list = el('div', 'today-list');
    queue.forEach(function (record) {
      var card = el('button', 'review-card');
      card.type = 'button';

      var top = el('div', 'review-top');
      top.appendChild(el('span', 'review-kp', kpName(record.kpId)));

      var tagClass = 'review-tag';
      if (record.stage === 'scheduled' || record.stage === 'reviewing') {
        tagClass += ' tag-reviewing';
      } else if (record.stage === 'mastered') {
        tagClass += ' tag-mastered';
      }
      top.appendChild(el('span', tagClass, stageLabel(record.stage)));
      card.appendChild(top);

      var lastError = record.layer ? '上次错因：' + layerLabel(record.layer) : '上次答对';
      card.appendChild(el('p', 'review-meta', '第 ' + ((record.reviews || 0) + 1) + ' 次复习 · ' + lastError));
      card.appendChild(el('p', 'review-cta', '点这张卡开始复习 →'));

      card.addEventListener('click', function () {
        var item = pickReviewItem(record);
        if (!item) {
          showToast('这个考点暂时没有可复习的题');
          return;
        }
        openQuiz(record.kpId, {
          items: [item],
          returnView: 'today',
          reviewRecordId: record.id
        });
      });

      list.appendChild(card);
    });
    host.appendChild(list);
  }

  function findRecordById(recordId) {
    for (var i = 0; i < state.records.length; i += 1) {
      if (state.records[i].id === recordId) {
        return state.records[i];
      }
    }
    return null;
  }

  function columnOf(stage) {
    if (stage === 'mastered') {
      return 'done';
    }
    if (stage === 'scheduled' || stage === 'reviewing') {
      return 'doing';
    }
    return 'todo';
  }

  function wrongCount(itemId) {
    var count = 0;
    var i;
    for (i = 0; i < state.history.length; i += 1) {
      if (state.history[i].itemId === itemId && !state.history[i].correct) {
        count += 1;
      }
    }
    if (count === 0) {
      var record = findRecordByItem(itemId);
      if (record && !record.correct) {
        count = 1;
      }
    }
    return count;
  }

  var BOARD_COLUMNS = [
    { key: 'todo', title: '待复习' },
    { key: 'doing', title: '复习中' },
    { key: 'done', title: '已掌握' }
  ];

  /* 错题台：按考点聚合（默认）/ 按题目看板 */
  var boardMode = 'kp';

  function daysUntil(dueAt) {
    if (!dueAt) {
      return null;
    }
    var target = new Date(dueAt + 'T00:00:00');
    if (isNaN(target.getTime())) {
      return null;
    }
    var now = new Date();
    var base = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return Math.round((target.getTime() - base.getTime()) / 86400000);
  }

  function dueLabel(dueAt) {
    var days = daysUntil(dueAt);
    if (days === null) {
      return '未排期';
    }
    if (days < 0) {
      return '已逾期 ' + (-days) + ' 天';
    }
    if (days === 0) {
      return '今天到期';
    }
    if (days === 1) {
      return '明天到期';
    }
    return days + ' 天后到期';
  }

  function topLayerOfKp(kpId) {
    var counts = {};
    var best = '';
    var bestCount = 0;
    for (var i = 0; i < state.history.length; i += 1) {
      var entry = state.history[i];
      if (entry.kpId !== kpId || entry.correct || !entry.layer) {
        continue;
      }
      counts[entry.layer] = (counts[entry.layer] || 0) + 1;
      if (counts[entry.layer] > bestCount) {
        bestCount = counts[entry.layer];
        best = entry.layer;
      }
    }
    return best;
  }

  function adviceForLayer(layer) {
    if (layer === 'L0') {
      return '建议：先看这个考点的概念卡，再做变式。';
    }
    if (layer === 'L1') {
      return '建议：重点看例题的第一步，照着套一遍。';
    }
    if (layer === 'L2') {
      return '建议：每一步写下来，别跳步。';
    }
    if (layer === 'L3') {
      return '建议：读题时把“定义域”“范围”圈出来。';
    }
    if (layer === 'L4') {
      return '建议：先求稳，限时训练放最后。';
    }
    return '先做 2 道同考点题，看看现在的掌握度。';
  }

  function buildKpGroups() {
    var map = {};
    var order = [];
    for (var i = 0; i < state.records.length; i += 1) {
      var record = state.records[i];
      if (!map[record.kpId]) {
        map[record.kpId] = {
          kpId: record.kpId,
          records: [],
          dueAt: '',
          pending: 0,
          done: 0
        };
        order.push(record.kpId);
      }
      var group = map[record.kpId];
      group.records.push(record);
      if (columnOf(record.stage) === 'done') {
        group.done += 1;
      } else {
        group.pending += 1;
      }
      if (record.dueAt && (!group.dueAt || record.dueAt < group.dueAt)) {
        group.dueAt = record.dueAt;
      }
    }

    var groups = [];
    for (var j = 0; j < order.length; j += 1) {
      var item = map[order[j]];
      item.layer = topLayerOfKp(item.kpId);
      item.weight = kpWeight(item.kpId);
      groups.push(item);
    }

    groups.sort(function (a, b) {
      var scoreA = a.pending * (a.weight + 1);
      var scoreB = b.pending * (b.weight + 1);
      if (scoreA !== scoreB) {
        return scoreB - scoreA;
      }
      if (a.dueAt !== b.dueAt) {
        return a.dueAt < b.dueAt ? -1 : 1;
      }
      return a.kpId < b.kpId ? -1 : 1;
    });
    return groups;
  }

  function renderBoard() {
    var host = document.getElementById('board-content');
    if (!host) {
      return;
    }
    host.textContent = '';

    if (!data) {
      renderDataError(host);
      return;
    }

    if (!state.records.length) {
      var empty = el('div', 'empty-state');
      empty.appendChild(el('p', 'empty-title', '还没有错题'));
      empty.appendChild(el('p', 'empty-text', '去概念卡看一张，再练 2 道。'));
      var goBtn = el('button', 'btn btn-primary', '去练 2 道');
      goBtn.type = 'button';
      goBtn.addEventListener('click', function () {
        switchView('cards');
      });
      empty.appendChild(goBtn);
      host.appendChild(empty);
      return;
    }

    buildBoardModeBar(host);

    if (boardMode === 'kp') {
      renderKpBoard(host);
    } else {
      renderRecordBoard(host);
    }
  }

  function buildBoardModeBar(host) {
    var bar = el('div', 'board-mode-bar');
    var kpBtn = el('button', 'board-mode-btn' + (boardMode === 'kp' ? ' is-active' : ''), '按考点');
    var recordBtn = el('button', 'board-mode-btn' + (boardMode === 'record' ? ' is-active' : ''), '按题目');
    kpBtn.type = 'button';
    recordBtn.type = 'button';
    kpBtn.setAttribute('aria-pressed', boardMode === 'kp' ? 'true' : 'false');
    recordBtn.setAttribute('aria-pressed', boardMode === 'record' ? 'true' : 'false');
    kpBtn.addEventListener('click', function () {
      boardMode = 'kp';
      renderBoard();
    });
    recordBtn.addEventListener('click', function () {
      boardMode = 'record';
      renderBoard();
    });
    bar.appendChild(kpBtn);
    bar.appendChild(recordBtn);

    var pending = 0;
    for (var i = 0; i < state.records.length; i += 1) {
      if (columnOf(state.records[i].stage) !== 'done') {
        pending += 1;
      }
    }
    bar.appendChild(el('span', 'board-mode-count',
      state.records.length + ' 道错题 · ' + pending + ' 道待复习'));
    host.appendChild(bar);
  }

  function renderKpBoard(host) {
    var groups = buildKpGroups();
    host.appendChild(el('p', 'board-intro',
      '按考点聚合，排序看「待复习题数 × 考点权重」——越靠前越该先补。'));

    var urgent = groups.filter(function (group) {
      return group.pending > 0;
    }).slice(0, 3);

    if (urgent.length) {
      var band = el('div', 'kp-urgent');
      band.appendChild(el('p', 'kp-urgent-title', '最该先补的 ' + urgent.length + ' 个考点'));
      var list = el('ol', 'kp-urgent-list');
      urgent.forEach(function (group) {
        var li = el('li', '', '');
        li.appendChild(el('span', 'kp-urgent-name', kpName(group.kpId)));
        li.appendChild(el('span', 'kp-urgent-meta',
          '待复习 ' + group.pending + ' 道 · ' + dueLabel(group.dueAt)));
        list.appendChild(li);
      });
      band.appendChild(list);
      host.appendChild(band);
    }

    var wrap = el('div', 'kp-board-list');
    groups.forEach(function (group) {
      wrap.appendChild(buildKpCard(group));
    });
    host.appendChild(wrap);
  }

  function buildKpCard(group) {
    var card = el('article', 'kp-board-card');
    card.setAttribute('data-kp', group.kpId);

    var head = el('div', 'kp-board-head');
    head.appendChild(el('h2', 'kp-board-title', kpName(group.kpId)));
    if (group.weight >= 4) {
      head.appendChild(el('span', 'kp-board-badge is-hot', '高频考点'));
    } else if (group.weight === 3) {
      head.appendChild(el('span', 'kp-board-badge', '常考'));
    }
    card.appendChild(head);

    var meta = group.records.length + ' 道错题 · 待复习 ' + group.pending + ' 道';
    if (group.done) {
      meta += ' · 已掌握 ' + group.done + ' 道';
    }
    card.appendChild(el('p', 'kp-board-meta', meta));
    card.appendChild(el('p', 'kp-board-due', dueLabel(group.dueAt)));
    card.appendChild(el('p', 'kp-board-layer', group.layer
      ? '主要错因：' + layerLabel(group.layer)
      : '主要错因：还没有记录'));
    card.appendChild(el('p', 'kp-board-advice', adviceForLayer(group.layer)));

    var actions = el('div', 'kp-board-actions');
    var practiceBtn = el('button', 'btn btn-primary btn-small', '练 2 道');
    practiceBtn.type = 'button';
    practiceBtn.addEventListener('click', function () {
      openQuiz(group.kpId, { returnView: 'board' });
    });
    actions.appendChild(practiceBtn);

    var detail = el('div', 'kp-board-detail');
    detail.hidden = true;
    var detailBtn = el('button', 'btn btn-ghost btn-small',
      '看 ' + group.records.length + ' 道原题');
    detailBtn.type = 'button';
    detailBtn.setAttribute('aria-expanded', 'false');
    detailBtn.addEventListener('click', function () {
      detail.hidden = !detail.hidden;
      detailBtn.setAttribute('aria-expanded', detail.hidden ? 'false' : 'true');
      detailBtn.textContent = detail.hidden
        ? '看 ' + group.records.length + ' 道原题'
        : '收起原题';
    });
    actions.appendChild(detailBtn);
    card.appendChild(actions);

    for (var i = 0; i < group.records.length; i += 1) {
      detail.appendChild(buildBoardCard(group.records[i]));
    }
    card.appendChild(detail);
    return card;
  }

  function renderRecordBoard(host) {
    host.appendChild(el('p', 'board-intro',
      '顺序由到期时间决定，拖拽只改状态，不改顺序。拖到「已掌握」要先答对一道同考点变式题。'));

    var scroll = el('div', 'board-scroll');
    var board = el('div', 'board');

    var sorted = state.records.slice().sort(function (a, b) {
      var dueA = a.dueAt || '';
      var dueB = b.dueAt || '';
      if (dueA === dueB) {
        return kpWeight(b.kpId) - kpWeight(a.kpId);
      }
      return dueA < dueB ? -1 : 1;
    });

    BOARD_COLUMNS.forEach(function (config) {
      var column = el('section', 'board-column');
      column.setAttribute('data-column', config.key);

      var columnCards = sorted.filter(function (record) {
        return columnOf(record.stage) === config.key;
      });

      var head = el('div', 'board-column-head');
      head.appendChild(el('span', 'board-column-title', config.title));
      head.appendChild(el('span', 'board-column-count', String(columnCards.length)));
      column.appendChild(head);

      if (!columnCards.length) {
        column.appendChild(el('p', 'board-empty', '暂无'));
      } else {
        columnCards.forEach(function (record) {
          column.appendChild(buildBoardCard(record));
        });
      }

      bindColumnDrop(column, config.key);
      board.appendChild(column);
    });

    scroll.appendChild(board);
    host.appendChild(scroll);
  }

  function buildBoardCard(record) {
    var card = el('div', 'board-card');
    card.setAttribute('draggable', 'true');
    card.setAttribute('data-record-id', record.id);
    card.setAttribute('data-layer', record.layer || 'none');

    var top = el('div', 'board-card-top');
    top.appendChild(el('span', 'board-card-kp', kpName(record.kpId)));

    var tag = el('span', 'layer-tag');
    if (record.layer) {
      tag.className = 'layer-tag layer-' + record.layer;
      tag.textContent = layerLabel(record.layer);
    } else {
      tag.className = 'layer-tag layer-none';
      tag.textContent = '上次答对';
    }
    top.appendChild(tag);
    card.appendChild(top);

    var wrong = wrongCount(record.itemId);
    var meta = wrong > 0 ? '第 ' + wrong + ' 次错' : '暂无错因记录';
    if (record.dueAt) {
      meta += ' · 到期 ' + record.dueAt;
    }
    card.appendChild(el('p', 'board-card-meta', meta));

    bindNativeDrag(card, record);
    bindTouchDrag(card, record);
    return card;
  }

  function clearColumnHighlight() {
    var columns = document.querySelectorAll('.board-column.is-over');
    for (var i = 0; i < columns.length; i += 1) {
      columns[i].classList.remove('is-over');
    }
  }

  function bindNativeDrag(card, record) {
    card.addEventListener('dragstart', function (event) {
      if (event.dataTransfer) {
        event.dataTransfer.setData('text/plain', record.id);
        event.dataTransfer.effectAllowed = 'move';
      }
      card.classList.add('is-dragging');
    });

    card.addEventListener('dragend', function () {
      card.classList.remove('is-dragging');
      clearColumnHighlight();
    });
  }

  function bindColumnDrop(column, columnKey) {
    column.addEventListener('dragover', function (event) {
      event.preventDefault();
      if (event.dataTransfer) {
        event.dataTransfer.dropEffect = 'move';
      }
      column.classList.add('is-over');
    });

    column.addEventListener('dragleave', function (event) {
      if (!column.contains(event.relatedTarget)) {
        column.classList.remove('is-over');
      }
    });

    column.addEventListener('drop', function (event) {
      event.preventDefault();
      column.classList.remove('is-over');
      var recordId = event.dataTransfer ? event.dataTransfer.getData('text/plain') : '';
      if (recordId) {
        handleDrop(recordId, columnKey);
      }
    });
  }

  function columnAtPoint(x, y) {
    var node = document.elementFromPoint(x, y);
    while (node && node !== document.body) {
      if (node.classList && node.classList.contains('board-column')) {
        return node;
      }
      node = node.parentNode;
    }
    return null;
  }

  function bindTouchDrag(card, record) {
    var timer = null;
    var startX = 0;
    var startY = 0;
    var lastX = 0;
    var lastY = 0;
    var offsetX = 0;
    var offsetY = 0;
    var activated = false;
    var ghost = null;

    function clearTimer() {
      if (timer) {
        window.clearTimeout(timer);
        timer = null;
      }
    }

    function moveGhost(x, y) {
      if (!ghost) {
        return;
      }
      ghost.style.left = (x - offsetX) + 'px';
      ghost.style.top = (y - offsetY) + 'px';
    }

    function cleanup() {
      clearTimer();
      card.classList.remove('is-dragging');
      document.body.classList.remove('touch-dragging');
      if (ghost && ghost.parentNode) {
        ghost.parentNode.removeChild(ghost);
      }
      ghost = null;
      activated = false;
      clearColumnHighlight();
    }

    card.addEventListener('touchstart', function (event) {
      if (event.touches.length !== 1) {
        return;
      }
      var touch = event.touches[0];
      startX = touch.clientX;
      startY = touch.clientY;
      lastX = startX;
      lastY = startY;

      var rect = card.getBoundingClientRect();
      offsetX = startX - rect.left;
      offsetY = startY - rect.top;
      activated = false;
      clearTimer();

      timer = window.setTimeout(function () {
        activated = true;
        ghost = card.cloneNode(true);
        ghost.className = card.className + ' touch-ghost';
        ghost.style.width = rect.width + 'px';
        ghost.style.left = rect.left + 'px';
        ghost.style.top = rect.top + 'px';
        document.body.appendChild(ghost);
        card.classList.add('is-dragging');
        document.body.classList.add('touch-dragging');
        if (window.navigator && typeof window.navigator.vibrate === 'function') {
          try {
            window.navigator.vibrate(20);
          } catch (error) {
            /* 忽略不支持震动的设备 */
          }
        }
      }, 500);
    }, { passive: true });

    card.addEventListener('touchmove', function (event) {
      if (!activated) {
        var t = event.touches[0];
        var dx = t.clientX - startX;
        var dy = t.clientY - startY;
        if (Math.sqrt(dx * dx + dy * dy) > 8) {
          clearTimer();
        }
        return;
      }

      event.preventDefault();
      var moved = event.touches[0];
      lastX = moved.clientX;
      lastY = moved.clientY;
      moveGhost(lastX, lastY);
      var column = columnAtPoint(lastX, lastY);
      clearColumnHighlight();
      if (column) {
        column.classList.add('is-over');
      }
    }, { passive: false });

    card.addEventListener('touchend', function (event) {
      clearTimer();
      if (!activated) {
        return;
      }
      event.preventDefault();
      var touch = event.changedTouches && event.changedTouches[0];
      var x = touch ? touch.clientX : lastX;
      var y = touch ? touch.clientY : lastY;
      var column = columnAtPoint(x, y);
      var key = column ? column.getAttribute('data-column') : '';
      var recordId = record.id;
      cleanup();
      if (key) {
        handleDrop(recordId, key);
      }
    }, { passive: false });

    card.addEventListener('touchcancel', cleanup, { passive: true });
  }

  function handleDrop(recordId, targetKey) {
    clearColumnHighlight();

    var record = findRecordById(recordId);
    if (!record) {
      return;
    }
    if (columnOf(record.stage) === targetKey) {
      return;
    }

    if (targetKey === 'done') {
      startMasteryTest(record);
      return;
    }

    if (targetKey === 'todo') {
      record.stage = 'lapsed';
      record.dueAt = formatDate(new Date());
      saveState();
      renderBoard();
      showToast('已移回待复习，今天会出现在今日队列');
      return;
    }

    if (targetKey === 'doing') {
      record.stage = 'reviewing';
      record.dueAt = tomorrowStr();
      saveState();
      renderBoard();
      showToast('已移入复习中');
    }
  }

  function findVariantItem(record) {
    if (!data || !Array.isArray(data.items)) {
      return null;
    }
    var fresh = null;
    var fallback = null;

    for (var i = 0; i < data.items.length; i += 1) {
      var item = data.items[i];
      if (item.kpId !== record.kpId || item.id === record.itemId) {
        continue;
      }
      if (record.lastVariantId && item.id === record.lastVariantId) {
        continue;
      }
      if (!fallback) {
        fallback = item;
      }
      if (!fresh && !findRecordByItem(item.id)) {
        fresh = item;
      }
    }

    return fresh || fallback;
  }

  function startMasteryTest(record) {
    var variant = findVariantItem(record);
    if (!variant) {
      renderBoard();
      showToast('这个考点暂时没有变式题，先练 2 道');
      return;
    }

    openQuiz(record.kpId, { items: [variant], returnView: 'board' });
    quiz.masteryRecordId = record.id;
    quiz.masteryPassed = false;
    showToast('答对这道同考点变式题，就能移到已掌握');
  }

  function completeMasteryIfNeeded(passed) {
    if (!quiz.masteryRecordId) {
      return;
    }
    if (!passed) {
      quiz.masteryPassed = false;
      return;
    }
    var record = findRecordById(quiz.masteryRecordId);
    if (record) {
      record.stage = 'mastered';
      record.streak = Math.max(record.streak || 0, 2);
      saveState();
    }
    quiz.masteryPassed = true;
  }

  var LAYER_SHORT = {
    L0: '概念层',
    L1: '方法层',
    L2: '计算层',
    L3: '审题层',
    L4: '时间层'
  };

  var LAYER_COL = {
    L0: '概念',
    L1: '方法',
    L2: '计算',
    L3: '审题',
    L4: '时间'
  };

  function collectErrorStats() {
    var stats = {};
    var source = state.history.length ? state.history : state.records;

    for (var i = 0; i < source.length; i += 1) {
      var entry = source[i];
      if (entry.correct || !entry.layer) {
        continue;
      }
      if (!stats[entry.kpId]) {
        stats[entry.kpId] = {
          total: 0,
          layers: { L0: 0, L1: 0, L2: 0, L3: 0, L4: 0 }
        };
      }
      stats[entry.kpId].total += 1;
      stats[entry.kpId].layers[entry.layer] = (stats[entry.kpId].layers[entry.layer] || 0) + 1;
    }

    return stats;
  }

  function cardTitleForKp(kpId) {
    if (!data || !Array.isArray(data.cards)) {
      return '';
    }
    for (var i = 0; i < data.cards.length; i += 1) {
      if (data.cards[i].kpId === kpId) {
        return data.cards[i].title;
      }
    }
    return '';
  }

  function matrixColor(count) {
    var alpha = Math.min(0.12 + count * 0.1, 0.55);
    return 'rgba(79, 109, 245, ' + alpha.toFixed(2) + ')';
  }

  function dominantLayer(layers) {
    var result = 'L0';
    var maxCount = -1;
    LAYERS.forEach(function (layer) {
      var count = layers[layer.id] || 0;
      if (count > maxCount) {
        maxCount = count;
        result = layer.id;
      }
    });
    return { layer: result, count: maxCount };
  }

  function collectBasicStats() {
    var stats = {};
    data.knowledge.forEach(function (kp) {
      stats[kp.id] = { answered: 0, correct: 0 };
    });
    var source = state.history.length ? state.history : state.records;
    source.forEach(function (entry) {
      var item = findItem(entry.itemId);
      if (!item || !stats[item.kpId]) {
        return;
      }
      if ((item.level || 1) !== 1) {
        return;
      }
      stats[item.kpId].answered += 1;
      if (entry.correct) {
        stats[item.kpId].correct += 1;
      }
    });
    return stats;
  }

  function buildReport() {
    var stats = collectBasicStats();
    var totalWeight = 0;
    var weighted = 0;
    var practiced = 0;
    var unlocked = 0;
    var rows = [];

    data.knowledge.forEach(function (kp) {
      var bucket = stats[kp.id];
      var mastery = bucket.answered ? bucket.correct / bucket.answered : 0.2;
      totalWeight += kp.weight;
      weighted += kp.weight * mastery;
      if (bucket.answered > 0) {
        practiced += 1;
      }
      if (bucket.answered >= 3 && bucket.correct / bucket.answered >= 0.6) {
        unlocked += 1;
      }
      rows.push({
        kp: kp,
        answered: bucket.answered,
        correct: bucket.correct,
        mastery: mastery,
        gain: kp.weight * (1 - mastery)
      });
    });

    var score = Math.round(150 * weighted / totalWeight);
    rows.sort(function (a, b) {
      return b.gain - a.gain;
    });

    var layerCounts = { L0: 0, L1: 0, L2: 0, L3: 0, L4: 0 };
    var hintTotal = 0;
    var hintWrong = 0;
    state.history.forEach(function (entry) {
      if (entry.hintUsed) {
        hintTotal += 1;
        if (!entry.correct) {
          hintWrong += 1;
        }
      }
      if (!entry.correct && layerCounts[entry.layer] !== undefined) {
        layerCounts[entry.layer] += 1;
      }
    });

    var stage = { todo: 0, doing: 0, done: 0 };
    state.records.forEach(function (record) {
      stage[columnOf(record.stage)] += 1;
    });

    return {
      score: score,
      rows: rows,
      practiced: practiced,
      unlocked: unlocked,
      layerCounts: layerCounts,
      hintTotal: hintTotal,
      hintWrong: hintWrong,
      stage: stage
    };
  }

  function goPracticeKp(kp) {
    selectedChapter = chapterOfKp(kp.id);
    switchView('cards');
    showToast('已筛选到「' + kp.name + '」所在章节');
  }

  function buildTodayDiagnosis() {
    if (!state.history.length && !state.records.length) {
      return null;
    }
    var report = buildReport();
    var card = el('button', 'today-diagnosis');
    card.type = 'button';

    var top = el('div', 'td-top');
    top.appendChild(el('span', 'td-label', '及格诊断'));
    top.appendChild(el('span', 'td-score', report.score + ' / 150'));
    card.appendChild(top);

    var gap = 90 - report.score;
    card.appendChild(el('p', 'td-copy', gap > 0 ? '距及格还差 ' + gap + ' 分' : '已越过及格线'));
    card.appendChild(el('p', 'td-next', '下一步：先补「' + report.rows[0].kp.name + '」'));

    card.addEventListener('click', function () {
      switchView('profile');
    });
    return card;
  }

  function renderProfile() {
    var host = document.getElementById('profile-content');
    if (!host) {
      return;
    }
    host.textContent = '';

    if (!data) {
      renderDataError(host);
      return;
    }

    if (!state.history.length && !state.records.length) {
      var empty = el('div', 'empty-state');
      empty.appendChild(el('p', 'empty-title', '还没有数据'));
      empty.appendChild(el('p', 'empty-text', '做 5 道题就能生成及格诊断。'));
      var goBtn = el('button', 'btn btn-primary', '去练 2 道');
      goBtn.type = 'button';
      goBtn.addEventListener('click', function () {
        switchView('cards');
      });
      empty.appendChild(goBtn);
      host.appendChild(empty);
      return;
    }

    var report = buildReport();
    var gap = 90 - report.score;

    var hero = el('section', 'report-hero');
    hero.appendChild(el('p', 'report-kicker', '按已练题目估算'));
    var scoreLine = el('p', 'report-score');
    scoreLine.appendChild(el('span', 'report-score-num', String(report.score)));
    scoreLine.appendChild(el('span', 'report-score-total', ' / 150'));
    hero.appendChild(scoreLine);
    hero.appendChild(el('p', 'report-copy', gap > 0
      ? '距及格线 90 分还差 ' + gap + ' 分，先补下面的高性价比考点。'
      : '已越过及格线，继续保持基础题的稳定率。'));
    var bar = el('div', 'report-bar');
    var fill = el('div', 'report-bar-fill');
    fill.style.width = Math.min(100, Math.max(4, report.score / 150 * 100)) + '%';
    bar.appendChild(fill);
    hero.appendChild(bar);
    hero.appendChild(el('p', 'report-note', '估算方式：基础题正确率 × 考点权重，未练考点按 20% 计。'));
    host.appendChild(hero);

    var priority = el('section', 'report-section');
    priority.appendChild(el('h2', 'report-title', '先补这三个，提分最快'));
    var list = el('div', 'priority-list');
    report.rows.slice(0, 3).forEach(function (row, index) {
      var card = el('button', 'priority-card');
      card.type = 'button';

      var topRow = el('div', 'priority-top');
      topRow.appendChild(el('span', 'priority-rank', '0' + (index + 1)));
      topRow.appendChild(el('span', 'priority-name', row.kp.name));
      card.appendChild(topRow);

      var detail = row.answered
        ? '基础正确率 ' + Math.round(row.mastery * 100) + '%（' + row.correct + '/' + row.answered + '）'
        : '还没开始，先看一张概念卡';
      card.appendChild(el('p', 'priority-detail', detail));
      card.appendChild(el('p', 'priority-weight', '权重 ' + row.kp.weight + ' · ' + row.kp.chapter));

      card.addEventListener('click', function () {
        goPracticeKp(row.kp);
      });
      list.appendChild(card);
    });
    priority.appendChild(list);
    host.appendChild(priority);

    var grid = el('div', 'report-grid');

    var basic = el('section', 'metric-card');
    basic.appendChild(el('p', 'metric-label', '基础掌握'));
    basic.appendChild(el('p', 'metric-value', report.practiced + ' / 76 个考点'));
    basic.appendChild(el('p', 'metric-sub', '已解锁中档 ' + report.unlocked + ' 个'));
    grid.appendChild(basic);

    var hint = el('section', 'metric-card');
    hint.appendChild(el('p', 'metric-label', '提示依赖'));
    hint.appendChild(el('p', 'metric-value', report.hintTotal + ' 次看提示'));
    hint.appendChild(el('p', 'metric-sub', report.hintTotal
      ? '其中 ' + report.hintWrong + ' 次仍答错'
      : '还没用过提示'));
    grid.appendChild(hint);

    var review = el('section', 'metric-card');
    review.appendChild(el('p', 'metric-label', '复习健康'));
    review.appendChild(el('p', 'metric-value', report.stage.done + ' 张已掌握'));
    review.appendChild(el('p', 'metric-sub', '待复习 ' + report.stage.todo + ' · 复习中 ' + report.stage.doing));
    grid.appendChild(review);

    var layerCard = el('section', 'metric-card metric-wide');
    layerCard.appendChild(el('p', 'metric-label', '错因画像'));
    var maxLayer = 0;
    LAYERS.forEach(function (layer) {
      maxLayer = Math.max(maxLayer, report.layerCounts[layer.id] || 0);
    });
    LAYERS.forEach(function (layer) {
      var count = report.layerCounts[layer.id] || 0;
      var row = el('div', 'layer-row');
      row.appendChild(el('span', 'layer-name', layer.label));
      var track = el('div', 'layer-track');
      var layerFill = el('div', 'layer-fill');
      layerFill.style.width = (maxLayer ? count / maxLayer * 100 : 0) + '%';
      track.appendChild(layerFill);
      row.appendChild(track);
      row.appendChild(el('span', 'layer-count', String(count)));
      layerCard.appendChild(row);
    });
    grid.appendChild(layerCard);
    host.appendChild(grid);

    var actions = el('section', 'report-section');
    actions.appendChild(el('h2', 'report-title', '今天做这三件事'));
    var actionList = el('ol', 'action-list');
    var first = report.rows[0];
    actionList.appendChild(el('li', '', '先补「' + first.kp.name + '」：看一张概念卡，再做 3 道基础题。'));
    if (report.stage.todo > 0) {
      actionList.appendChild(el('li', '', '完成今天的 ' + report.stage.todo + ' 张到期复习。'));
    } else {
      actionList.appendChild(el('li', '', '今天没有到期复习，继续练 2 道基础题。'));
    }
    if (report.hintTotal && report.hintWrong / report.hintTotal > 0.5) {
      actionList.appendChild(el('li', '', '有 ' + report.hintWrong + ' 道看了提示仍答错，回到概念卡补第一步。'));
    } else {
      actionList.appendChild(el('li', '', '答题时先自己走第一步，实在卡住再看提示。'));
    }
    actions.appendChild(actionList);
    host.appendChild(actions);
  }


  function renderView(name) {
    if (name === 'today') {
      renderToday();
    } else if (name === 'cards') {
      renderCards();
    } else if (name === 'board') {
      renderBoard();
    } else if (name === 'profile') {
      renderProfile();
    }
  }

  function lastAnsweredAt(itemId) {
    var latest = '';
    for (var i = 0; i < state.history.length; i += 1) {
      if (state.history[i].itemId === itemId && state.history[i].at > latest) {
        latest = state.history[i].at;
      }
    }
    if (!latest) {
      var record = findRecordByItem(itemId);
      if (record && record.at) {
        latest = record.at;
      }
    }
    return latest;
  }

  function levelStats(kpId) {
    var answered = 0;
    var correct = 0;
    var i;
    for (i = 0; i < state.history.length; i += 1) {
      var entry = state.history[i];
      if (entry.kpId !== kpId) {
        continue;
      }
      var item = findItem(entry.itemId);
      if (item && (item.level || 1) === 1) {
        answered += 1;
        if (entry.correct) {
          correct += 1;
        }
      }
    }
    if (!state.history.length) {
      for (i = 0; i < state.records.length; i += 1) {
        var record = state.records[i];
        if (record.kpId !== kpId) {
          continue;
        }
        var recordItem = findItem(record.itemId);
        if (recordItem && (recordItem.level || 1) === 1) {
          answered += 1;
          if (record.correct) {
            correct += 1;
          }
        }
      }
    }
    return { answered: answered, correct: correct };
  }

  function isLevelUnlocked(kpId) {
    var stats = levelStats(kpId);
    return stats.answered >= 3 && stats.correct / stats.answered >= 0.6;
  }

  function pickItems(kpId, count, excludeIds) {
    if (!data || !Array.isArray(data.items)) {
      return [];
    }
    var pool = [];
    var exclude = excludeIds || [];
    var i;
    for (i = 0; i < data.items.length; i += 1) {
      if (data.items[i].kpId === kpId && exclude.indexOf(data.items[i].id) === -1) {
        pool.push(data.items[i]);
      }
    }
    if (!pool.length) {
      for (i = 0; i < data.items.length; i += 1) {
        if (data.items[i].kpId === kpId) {
          pool.push(data.items[i]);
        }
      }
    }

    var unlocked = isLevelUnlocked(kpId);
    if (!unlocked) {
      var basic = [];
      for (i = 0; i < pool.length; i += 1) {
        if ((pool[i].level || 1) === 1) {
          basic.push(pool[i]);
        }
      }
      if (basic.length) {
        pool = basic;
      }
    }

    pool.sort(function (a, b) {
      if (!unlocked) {
        var levelA = a.level || 2;
        var levelB = b.level || 2;
        if (levelA !== levelB) {
          return levelA - levelB;
        }
      }
      var timeA = lastAnsweredAt(a.id);
      var timeB = lastAnsweredAt(b.id);
      if (!timeA && !timeB) {
        return 0;
      }
      if (!timeA) {
        return -1;
      }
      if (!timeB) {
        return 1;
      }
      if (timeA === timeB) {
        return 0;
      }
      return timeA < timeB ? -1 : 1;
    });

    return pool.slice(0, count);
  }

  function pickPracticeItems(kpId, count) {
    return pickItems(kpId, count, []);
  }

  function pickReviewItem(record) {
    var exclude = [record.itemId];
    if (record.lastVariantId) {
      exclude.push(record.lastVariantId);
    }
    var picked = pickItems(record.kpId, 1, exclude);
    if (picked.length) {
      return picked[0];
    }
    return findItem(record.itemId);
  }

  function currentQuestion() {
    return quiz.items[quiz.index] || null;
  }

  function openQuiz(kpId, options) {
    var settings = options || {};
    var items = settings.items && settings.items.length ? settings.items : pickPracticeItems(kpId, 2);

    if (!items.length) {
      showToast('这个考点还没有练习题');
      return;
    }

    quiz.items = items;
    quiz.index = 0;
    quiz.selected = null;
    quiz.answered = false;
    quiz.returnView = settings.returnView || 'cards';
    quiz.masteryRecordId = null;
    quiz.masteryPassed = false;
    quiz.reviewRecordId = settings.reviewRecordId || null;

    quizModal.hidden = false;
    document.body.classList.add('modal-open');
    renderQuestion();
  }

  function closeQuiz() {
    quizModal.hidden = true;
    document.body.classList.remove('modal-open');
    quizBody.textContent = '';
    quiz.masteryRecordId = null;
    quiz.masteryPassed = false;
    quiz.reviewRecordId = null;
  }

  function renderQuestion() {
    var item = currentQuestion();
    if (!item) {
      finishQuiz();
      return;
    }

    quiz.selected = item.type === 'multi' ? [] : null;
    quiz.answered = false;
    quiz.hintUsed = false;

    var typeLabels = { choice: '单选', judge: '判断', multi: '多选', fill: '填空', solve: '解答' };
    var levelLabels = { 1: '基础', 2: '中档', 3: '提升' };
    quizTitle.textContent = kpName(item.kpId);
    quizProgress.textContent = '第 ' + (quiz.index + 1) + ' / ' + quiz.items.length + ' 题 · ' +
      (typeLabels[item.type] || '练习') + ' · ' + (levelLabels[item.level] || '基础');
    quizBody.textContent = '';

    quizBody.appendChild(mathEl('p', 'quiz-stem', item.stem));

    var hintBox = el('div', 'quiz-hint');
    hintBox.hidden = true;
    var hintBtn = el('button', 'btn btn-ghost btn-small', '卡住了？看提示');
    hintBtn.type = 'button';
    hintBtn.addEventListener('click', function () {
      quiz.hintUsed = true;
      hintBtn.hidden = true;
      hintBox.hidden = false;
      hintBox.textContent = '';
      hintBox.appendChild(el('p', 'quiz-hint-title', '提示只给第一步，答案还要自己算'));

      var card = null;
      if (data && Array.isArray(data.cards)) {
        for (var ci = 0; ci < data.cards.length; ci += 1) {
          if (data.cards[ci].kpId === item.kpId) {
            card = data.cards[ci];
            break;
          }
        }
      }
      if (card && Array.isArray(card.points) && card.points.length) {
        hintBox.appendChild(el('p', 'quiz-hint-line', '先回忆：' + card.points[0]));
      }
      if (card && card.example && Array.isArray(card.example.steps) && card.example.steps[1]) {
        hintBox.appendChild(el('p', 'quiz-hint-line', '例题思路：' + card.example.steps[1]));
      } else {
        var firstLine = String(item.explain || '').split('\n')[0];
        if (firstLine) {
          hintBox.appendChild(el('p', 'quiz-hint-line', '第一步：' + firstLine));
        }
      }
    });
    quizBody.appendChild(hintBtn);
    quizBody.appendChild(hintBox);

    var options = null;
    if (item.type === 'judge') {
      options = Array.isArray(item.options) && item.options.length ? item.options : ['正确', '错误'];
    } else if (item.type === 'choice' || item.type === 'multi') {
      options = item.options;
    }

    if (options && options.length) {
      var optionWrap = el('div', 'quiz-options');
      options.forEach(function (option, index) {
        var letter = String.fromCharCode(65 + index);
        var btn = mathEl('button', 'option-btn', letter + '. ' + option);
        btn.type = 'button';
        btn.setAttribute('data-letter', letter);
        btn.addEventListener('click', function () {
          if (item.type === 'multi') {
            var position = quiz.selected.indexOf(letter);
            if (position === -1) {
              quiz.selected.push(letter);
            } else {
              quiz.selected.splice(position, 1);
            }
            btn.classList.toggle('is-selected', quiz.selected.indexOf(letter) !== -1);
            return;
          }
          quiz.selected = letter;
          var all = optionWrap.querySelectorAll('.option-btn');
          for (var i = 0; i < all.length; i += 1) {
            all[i].classList.toggle('is-selected', all[i].getAttribute('data-letter') === letter);
          }
        });
        optionWrap.appendChild(btn);
      });
      quizBody.appendChild(optionWrap);
    } else if (item.type === 'solve') {
      var textarea = el('textarea', 'quiz-textarea');
      textarea.id = 'quiz-answer-input';
      textarea.setAttribute('rows', '4');
      textarea.setAttribute('placeholder', '写出关键步骤和最终答案');
      quizBody.appendChild(textarea);
    } else {
      var input = el('input', 'quiz-input');
      input.type = 'text';
      input.setAttribute('placeholder', '把你的答案写在这里');
      input.setAttribute('autocomplete', 'off');
      input.id = 'quiz-answer-input';
      quizBody.appendChild(input);
    }

    var actions = el('div', 'quiz-actions');
    var submitBtn = el('button', 'btn btn-primary', '提交答案');
    submitBtn.type = 'button';
    submitBtn.addEventListener('click', submitAnswer);
    actions.appendChild(submitBtn);
    quizBody.appendChild(actions);
  }

  function submitAnswer() {
    if (quiz.answered) {
      return;
    }

    var item = currentQuestion();
    if (!item) {
      return;
    }

    var userAnswer = '';
    if (item.type === 'multi') {
      if (!quiz.selected || !quiz.selected.length) {
        showToast('至少选一个选项');
        return;
      }
      userAnswer = quiz.selected.slice().sort().join('');
    } else if (item.type === 'choice' || item.type === 'judge') {
      if (!quiz.selected) {
        showToast('先选一个选项');
        return;
      }
      userAnswer = quiz.selected;
    } else {
      var input = document.getElementById('quiz-answer-input');
      userAnswer = input ? input.value.trim() : '';
      if (!userAnswer) {
        showToast('先把答案写出来');
        return;
      }
    }

    quiz.answered = true;
    renderOutcome(item, userAnswer);
  }

  function renderOutcome(item, userAnswer) {
    var resultWrap = el('div', 'quiz-result');
    var correct = isAnswerCorrect(item, userAnswer);

    if (correct) {
      renderCorrect(item, resultWrap);
    } else if (item.type === 'choice' || item.type === 'judge' || item.type === 'multi') {
      renderChoiceWrong(item, resultWrap);
    } else {
      renderUncertain(item, resultWrap);
    }

    quizBody.appendChild(resultWrap);
    if (resultWrap.scrollIntoView) {
      window.setTimeout(function () {
        resultWrap.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }, 80);
    }
  }

  function renderCorrect(item, resultWrap) {
    resultWrap.appendChild(el('p', 'quiz-verdict is-correct', '答对了'));
    resultWrap.appendChild(mathEl('p', 'quiz-answer', '正确答案：' + item.answer));
    if (item.explain) {
      resultWrap.appendChild(mathEl('p', 'quiz-explain', item.explain));
    }
    recordAnswer(item, true, '');
    completeMasteryIfNeeded(true);
    resultWrap.appendChild(buildNextButton());
  }

  function renderChoiceWrong(item, resultWrap) {
    resultWrap.appendChild(el('p', 'quiz-verdict is-wrong', '答错了'));
    resultWrap.appendChild(mathEl('p', 'quiz-answer', '正确答案：' + item.answer));
    if (item.explain) {
      resultWrap.appendChild(mathEl('p', 'quiz-explain', item.explain));
    }

    if (quiz.hintUsed) {
      resultWrap.appendChild(el('p', 'quiz-hint-note', '你刚才看了提示还没做出来，这题更可能是「方法想不到」。'));
    }
    resultWrap.appendChild(el('p', 'quiz-layer-label', '这次错在哪一层？'));

    var layerList = el('div', 'layer-list');
    var saved = { done: false };

    LAYERS.forEach(function (layer) {
      var btn = el('button', 'layer-btn');
      btn.type = 'button';
      btn.appendChild(el('span', 'layer-btn-label', layer.label));
      if (layer.hint) {
        btn.appendChild(el('span', 'layer-btn-hint', layer.hint));
      }
      btn.addEventListener('click', function () {
        if (saved.done) {
          return;
        }
        saved.done = true;
        recordAnswer(item, false, layer.id);
        completeMasteryIfNeeded(false);
        layerList.textContent = '';
        resultWrap.appendChild(el('p', 'quiz-done', '已记录：' + layer.label));
        resultWrap.appendChild(buildNextButton());
        var allLayers = layerList.querySelectorAll('.layer-btn');
        for (var i = 0; i < allLayers.length; i += 1) {
          allLayers[i].disabled = true;
        }
      });
      layerList.appendChild(btn);
    });
    resultWrap.appendChild(layerList);

    var overrideBtn = el('button', 'btn btn-ghost btn-small', '其实我答对了');
    overrideBtn.type = 'button';
    overrideBtn.style.marginTop = '12px';
    overrideBtn.addEventListener('click', function () {
      if (saved.done) {
        return;
      }
      saved.done = true;
      recordAnswer(item, true, '');
      completeMasteryIfNeeded(true);
      layerList.textContent = '';
      resultWrap.appendChild(el('p', 'quiz-done', '已记录：这题算答对'));
      resultWrap.appendChild(buildNextButton());
    });
    resultWrap.appendChild(overrideBtn);
  }

  function renderUncertain(item, resultWrap) {
    resultWrap.appendChild(el('p', 'quiz-verdict is-uncertain', '和参考答案写法不同'));
    resultWrap.appendChild(mathEl('p', 'quiz-answer', '参考答案：' + item.answer));
    if (item.explain) {
      resultWrap.appendChild(mathEl('p', 'quiz-explain', item.explain));
    }
    resultWrap.appendChild(el('p', 'quiz-layer-label', '你写的答案算对吗？'));

    var actions = el('div', 'quiz-actions');
    var layerBox = el('div');
    layerBox.hidden = true;
    var decided = false;

    function finishRecord(correct, layer, label) {
      if (decided) {
        return;
      }
      decided = true;
      recordAnswer(item, correct, layer);
      completeMasteryIfNeeded(correct);
      actions.textContent = '';
      layerBox.textContent = '';
      resultWrap.appendChild(el('p', 'quiz-done', '已记录：' + label));
      resultWrap.appendChild(buildNextButton());
    }

    var yesBtn = el('button', 'btn btn-primary', '我答对了');
    yesBtn.type = 'button';
    yesBtn.addEventListener('click', function () {
      finishRecord(true, '', '这题算答对');
    });

    var noBtn = el('button', 'btn btn-ghost', '我答错了');
    noBtn.type = 'button';
    noBtn.addEventListener('click', function () {
      if (decided || !layerBox.hidden) {
        return;
      }
      layerBox.hidden = false;
    });

    actions.appendChild(yesBtn);
    actions.appendChild(noBtn);
    resultWrap.appendChild(actions);

    var layerList = el('div', 'layer-list');
    LAYERS.forEach(function (layer) {
      var btn = el('button', 'layer-btn');
      btn.type = 'button';
      btn.appendChild(el('span', 'layer-btn-label', layer.label));
      if (layer.hint) {
        btn.appendChild(el('span', 'layer-btn-hint', layer.hint));
      }
      btn.addEventListener('click', function () {
        finishRecord(false, layer.id, layer.label);
      });
      layerList.appendChild(btn);
    });
    layerBox.appendChild(layerList);
    resultWrap.appendChild(layerBox);
  }

  function buildNextButton() {
    var nextBtn = el('button', 'btn btn-primary btn-small', quiz.index + 1 < quiz.items.length ? '下一题' : '完成');
    nextBtn.type = 'button';
    nextBtn.style.marginTop = '12px';
    nextBtn.addEventListener('click', function () {
      quiz.index += 1;
      if (quiz.index < quiz.items.length) {
        renderQuestion();
      } else {
        finishQuiz();
      }
    });
    return nextBtn;
  }

  function finishQuiz() {
    var returnView = quiz.returnView;
    var masteryRecordId = quiz.masteryRecordId;
    var masteryPassed = quiz.masteryPassed;
    closeQuiz();
    switchView(returnView);
    if (masteryRecordId) {
      if (masteryPassed) {
        showNotice('变式题通过，已移入已掌握');
      } else {
        showToast('变式题没通过，卡片已留在原列');
      }
    } else {
      showNotice('已记录');
    }
  }

  function exportData() {
    var payload = JSON.stringify({
      version: state.version,
      profile: state.profile,
      records: state.records,
      history: state.history,
      customItems: customItems
    }, null, 2);
    var blob = new Blob([payload], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var link = document.createElement('a');
    link.href = url;
    link.download = 'qingyou-backup.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.setTimeout(function () {
      URL.revokeObjectURL(url);
    }, 1000);
    showToast('已导出 qingyou-backup.json');
  }

  function importData(file) {
    var reader = new FileReader();
    reader.onload = function () {
      var parsed = null;
      try {
        parsed = JSON.parse(String(reader.result));
      } catch (error) {
        showToast('导入失败：不是有效的 JSON 文件');
        return;
      }

      if (!parsed || typeof parsed !== 'object' || parsed.version !== 1 || !Array.isArray(parsed.records)) {
        showToast('导入失败：版本不匹配或数据结构不对');
        return;
      }

      state = {
        version: 1,
        profile: parsed.profile && typeof parsed.profile === 'object' ? parsed.profile : {},
        records: parsed.records,
        history: Array.isArray(parsed.history) ? parsed.history : []
      };
      saveState();
      renderView(currentView);
      showToast('导入成功，已覆盖本机数据');
    };
    reader.onerror = function () {
      showToast('读取文件失败，请重试');
    };
    reader.readAsText(file);
  }

  function validateBankItems(list) {
    var kpIds = {};
    if (data && Array.isArray(data.knowledge)) {
      data.knowledge.forEach(function (kp) {
        kpIds[kp.id] = true;
      });
    }

    var valid = [];
    var skipped = 0;
    list.forEach(function (item) {
      if (!item || typeof item !== 'object') {
        skipped += 1;
        return;
      }
      if (!item.id || !item.kpId || !item.stem || item.answer === undefined || item.answer === '') {
        skipped += 1;
        return;
      }
      if (!kpIds[item.kpId]) {
        skipped += 1;
        return;
      }
      var type = item.type || 'fill';
      if (['choice', 'judge', 'multi', 'fill', 'solve'].indexOf(type) === -1) {
        skipped += 1;
        return;
      }
      if (['choice', 'judge', 'multi'].indexOf(type) !== -1 && (!Array.isArray(item.options) || item.options.length < 2)) {
        skipped += 1;
        return;
      }
      valid.push(item);
    });

    return { valid: valid, skipped: skipped };
  }

  function importBankData(file) {
    if (!data || !Array.isArray(data.items)) {
      showToast('题库未加载');
      return;
    }

    var reader = new FileReader();
    reader.onload = function () {
      var parsed = null;
      try {
        parsed = JSON.parse(String(reader.result));
      } catch (error) {
        showToast('题库文件不是有效 JSON');
        return;
      }

      var list = Array.isArray(parsed) ? parsed : (parsed && Array.isArray(parsed.items) ? parsed.items : null);
      if (!list) {
        showToast('题库格式应为数组或 {items:[...]}');
        return;
      }

      var result = validateBankItems(list);
      if (!result.valid.length) {
        showToast('没有可导入的有效题目，请检查 kpId 与必填字段');
        return;
      }

      var existing = {};
      data.items.forEach(function (item) {
        existing[item.id] = true;
      });

      var added = 0;
      var duplicate = 0;
      result.valid.forEach(function (item) {
        if (existing[item.id]) {
          duplicate += 1;
          return;
        }
        data.items.push(item);
        customItems.push(item);
        existing[item.id] = true;
        added += 1;
      });

      var skippedTotal = result.skipped + duplicate;
      saveCustomItems();
      renderView(currentView);
      showToast('已追加 ' + added + ' 道题' + (skippedTotal ? '，跳过 ' + skippedTotal + ' 道' : ''));
    };
    reader.onerror = function () {
      showToast('读取题库文件失败');
    };
    reader.readAsText(file);
  }

  quizClose.addEventListener('click', closeQuiz);

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && !quizModal.hidden) {
      closeQuiz();
    }
  });

  var exportBtn = document.getElementById('export-btn');
  var importBtn = document.getElementById('import-btn');
  var importFile = document.getElementById('import-file');
  var importBankBtn = document.getElementById('import-bank-btn');
  var importBankFile = document.getElementById('import-bank-file');
  var seedBtn = document.getElementById('seed-btn');

  if (exportBtn) {
    exportBtn.addEventListener('click', exportData);
  }

  if (seedBtn) {
    seedBtn.addEventListener('click', loadSampleData);
  }

  if (importBtn && importFile) {
    importBtn.addEventListener('click', function () {
      importFile.click();
    });
    importFile.addEventListener('change', function () {
      var file = importFile.files && importFile.files[0];
      importFile.value = '';
      if (file) {
        importData(file);
      }
    });
  }

  if (importBankBtn && importBankFile) {
    importBankBtn.addEventListener('click', function () {
      importBankFile.click();
    });
    importBankFile.addEventListener('change', function () {
      var file = importBankFile.files && importBankFile.files[0];
      importBankFile.value = '';
      if (file) {
        importBankData(file);
      }
    });
  }

  /* 线上分包：首屏只加载人工题，生成题在 load 后异步合并进来 */
  window.QY_ABSORB_BULK = function () {
    if (!data || !Array.isArray(window.QY_DATA_BULK)) {
      return 0;
    }
    var known = {};
    var index;
    for (index = 0; index < data.items.length; index += 1) {
      known[data.items[index].id] = true;
    }
    var added = 0;
    for (index = 0; index < window.QY_DATA_BULK.length; index += 1) {
      var item = window.QY_DATA_BULK[index];
      if (item && item.id && !known[item.id]) {
        data.items.push(item);
        known[item.id] = true;
        added += 1;
      }
    }
    window.QY_DATA_BULK = null;
    if (added) {
      var activeTab = document.querySelector('.tab.is-active');
      var view = activeTab ? activeTab.getAttribute('data-view') : '';
      if (view === 'today') {
        renderToday();
      }
    }
    return added;
  };

  switchView('today');
})();