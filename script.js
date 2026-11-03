(() => {
  'use strict';

  const KEY_ITEMS = 'luckySpin.items';
  const KEY_HISTORY = 'luckySpin.history';
  const DEFAULT_ITEMS = ['唱一首歌', '跳一段舞', '回答問題', '請喝飲料', '再抽一次', '安全過關'];
  const MIN_ITEMS = 2, MAX_ITEMS = 12, MAX_LEN = 20, MAX_HISTORY = 10;
  const COLORS = ['#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899',
                  '#14B8A6', '#F97316', '#84CC16', '#06B6D4', '#6366F1', '#E11D48'];
  const TAU = Math.PI * 2;
  const POINTER_ANGLE = -Math.PI / 2; // 指針固定在 12 點鐘方向

  const $ = (id) => document.getElementById(id);
  const el = {
    input: $('itemInput'), addBtn: $('addBtn'), msg: $('formMsg'), list: $('itemList'),
    badge: $('countBadge'), resetBtn: $('resetBtn'), canvas: $('wheel'), spinBtn: $('spinBtn'),
    historyList: $('historyList'), clearBtn: $('clearHistoryBtn'), overlay: $('overlay'),
    result: $('modalResult'), okBtn: $('okBtn'), confetti: $('confetti'),
  };
  const ctx = el.canvas.getContext('2d');

  // ---------- 儲存（localStorage 失敗時退回記憶體）----------
  const memory = {};
  const store = {
    get(key) {
      try { return localStorage.getItem(key); } catch { return memory[key] ?? null; }
    },
    set(key, value) {
      memory[key] = value;
      try { localStorage.setItem(key, value); } catch { /* 忽略，僅保留於目前頁面 */ }
    },
  };

  function readJSON(key) {
    try { return JSON.parse(store.get(key)); } catch { return null; }
  }

  function loadItems() {
    const data = readJSON(KEY_ITEMS);
    const valid = Array.isArray(data) && data.length >= MIN_ITEMS && data.length <= MAX_ITEMS &&
      data.every((s) => typeof s === 'string' && s.trim() && [...s].length <= MAX_LEN) &&
      new Set(data).size === data.length;
    return valid ? data : [...DEFAULT_ITEMS];
  }

  function loadHistory() {
    const data = readJSON(KEY_HISTORY);
    if (!Array.isArray(data)) return [];
    return data
      .filter((r) => r && typeof r.name === 'string' && !Number.isNaN(new Date(r.time).getTime()))
      .slice(0, MAX_HISTORY);
  }

  // ---------- 狀態 ----------
  let items = loadItems();
  let history = loadHistory();
  let rotation = 0;
  let spinning = false;
  let editingIndex = null;

  const mod = (n, m) => ((n % m) + m) % m;
  const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
  const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function saveItems() { store.set(KEY_ITEMS, JSON.stringify(items)); }
  function saveHistory() { store.set(KEY_HISTORY, JSON.stringify(history)); }
  function showMsg(text = '') { el.msg.textContent = text; }

  // ---------- 選項驗證與管理 ----------
  function validateName(raw, ignoreIndex = -1) {
    const name = raw.trim();
    if (!name) return '選項不可為空白。';
    if ([...name].length > MAX_LEN) return `選項名稱最多 ${MAX_LEN} 個字元。`;
    if (items.some((it, i) => i !== ignoreIndex && it === name)) return '已有相同名稱的選項。';
    return '';
  }

  function addItem() {
    if (spinning) return;
    if (items.length >= MAX_ITEMS) return showMsg(`最多只能有 ${MAX_ITEMS} 個選項。`);
    const error = validateName(el.input.value);
    if (error) return showMsg(error);
    items.push(el.input.value.trim());
    el.input.value = '';
    showMsg();
    commitItems();
    el.input.focus();
  }

  function saveEdit(index, value) {
    const error = validateName(value, index);
    if (error) return showMsg(error);
    items[index] = value.trim();
    editingIndex = null;
    showMsg();
    commitItems();
  }

  function deleteItem(index) {
    if (spinning) return;
    if (items.length <= MIN_ITEMS) return showMsg(`至少需要保留 ${MIN_ITEMS} 個選項。`);
    items.splice(index, 1);
    editingIndex = null;
    showMsg();
    commitItems();
  }

  function resetItems() {
    if (spinning || !window.confirm('確定要恢復為預設選項嗎？目前的自訂選項將會被取代。')) return;
    items = [...DEFAULT_ITEMS];
    editingIndex = null;
    showMsg();
    commitItems();
  }

  function commitItems() {
    saveItems();
    renderList();
    drawWheel();
  }

  // ---------- 畫面：選項清單 ----------
  function makeButton(text, className, onClick, disabled = false) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `btn btn-sm ${className}`;
    btn.textContent = text;
    btn.disabled = disabled;
    btn.addEventListener('click', onClick);
    return btn;
  }

  function renderList() {
    el.list.textContent = '';
    el.badge.textContent = `${items.length} / ${MAX_ITEMS}`;
    el.addBtn.disabled = spinning;
    el.input.disabled = spinning;
    el.resetBtn.disabled = spinning;

    items.forEach((name, i) => {
      const li = document.createElement('li');
      li.style.setProperty('--dot', COLORS[i % COLORS.length]);

      if (editingIndex === i) {
        const input = document.createElement('input');
        input.type = 'text';
        input.value = name;
        input.setAttribute('aria-label', '編輯選項');
        input.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') saveEdit(i, input.value);
          if (e.key === 'Escape') { editingIndex = null; showMsg(); renderList(); }
        });
        li.append(
          input,
          makeButton('儲存', 'btn-primary', () => saveEdit(i, input.value)),
          makeButton('取消', 'btn-ghost', () => { editingIndex = null; showMsg(); renderList(); })
        );
        el.list.appendChild(li);
        input.focus();
        input.select();
        return;
      }

      const label = document.createElement('span');
      label.className = 'name';
      label.textContent = name;
      li.append(
        label,
        makeButton('編輯', 'btn-ghost', () => { editingIndex = i; showMsg(); renderList(); }, spinning),
        makeButton('刪除', 'btn-danger', () => deleteItem(i), spinning || items.length <= MIN_ITEMS)
      );
      el.list.appendChild(li);
    });
  }

  // ---------- Canvas 轉盤 ----------
  function fitText(text, maxWidth) {
    if (ctx.measureText(text).width <= maxWidth) return text;
    let chars = [...text];
    while (chars.length > 1 && ctx.measureText(chars.join('') + '…').width > maxWidth) chars.pop();
    return chars.join('') + '…';
  }

  function drawWheel() {
    const size = el.canvas.width;
    const c = size / 2;
    const r = c - 16;
    const arc = TAU / items.length;
    ctx.clearRect(0, 0, size, size);

    // 外框
    ctx.save();
    ctx.shadowColor = 'rgba(139, 92, 246, .7)';
    ctx.shadowBlur = 22;
    ctx.beginPath();
    ctx.arc(c, c, r + 11, 0, TAU);
    ctx.fillStyle = '#312E81';
    ctx.fill();
    ctx.restore();

    // 扇形與文字
    const fontSize = items.length <= 6 ? 30 : items.length <= 9 ? 26 : 22;
    ctx.font = `bold ${fontSize}px "Noto Sans TC", "Microsoft JhengHei", sans-serif`;
    items.forEach((name, i) => {
      const start = rotation + i * arc;
      ctx.beginPath();
      ctx.moveTo(c, c);
      ctx.arc(c, c, r, start, start + arc);
      ctx.closePath();
      ctx.fillStyle = COLORS[i % COLORS.length];
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(15, 23, 42, .55)';
      ctx.stroke();

      ctx.save();
      ctx.translate(c, c);
      ctx.rotate(start + arc / 2);
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#fff';
      ctx.shadowColor = 'rgba(0, 0, 0, .55)';
      ctx.shadowBlur = 4;
      ctx.fillText(fitText(name, r - 100), r - 24, 0);
      ctx.restore();
    });

    // 中心圓
    ctx.beginPath();
    ctx.arc(c, c, 38, 0, TAU);
    ctx.fillStyle = '#0F172A';
    ctx.fill();
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#8B5CF6';
    ctx.stroke();
  }

  // ---------- 旋轉與抽籤 ----------
  function spin() {
    if (spinning || items.length < MIN_ITEMS) return;
    spinning = true;
    editingIndex = null;
    el.spinBtn.disabled = true;
    el.clearBtn.disabled = true;
    renderList();

    // 先決定結果，再反推最終角度
    const winnerIndex = Math.floor(Math.random() * items.length);
    const winner = items[winnerIndex];
    const arc = TAU / items.length;
    const current = mod(rotation, TAU);
    const wanted = mod(POINTER_ANGLE - (winnerIndex + 0.5) * arc, TAU);
    const extra = mod(wanted - current, TAU);
    const totalTurn = TAU * (5 + Math.floor(Math.random() * 3)) + extra; // 至少 5 圈，順時針

    const startRotation = rotation;
    const duration = prefersReducedMotion() ? 1200 : 4000;
    const startTime = performance.now();

    function frame(now) {
      const t = Math.min((now - startTime) / duration, 1);
      rotation = startRotation + totalTurn * easeOutCubic(t);
      drawWheel();
      if (t < 1) requestAnimationFrame(frame);
      else finishSpin(winner);
    }
    requestAnimationFrame(frame);
  }

  function finishSpin(winner) {
    rotation = mod(rotation, TAU);
    drawWheel();
    history.unshift({ name: winner, time: new Date().toISOString() });
    history = history.slice(0, MAX_HISTORY);
    saveHistory();
    renderHistory();
    spinning = false;
    el.spinBtn.disabled = false;
    el.clearBtn.disabled = false;
    renderList();
    showResult(winner);
  }

  // ---------- 結果視窗 ----------
  function showResult(name) {
    el.result.textContent = name;
    el.overlay.hidden = false;
    launchConfetti();
    el.okBtn.focus();
  }

  function closeResult() {
    if (el.overlay.hidden) return;
    el.overlay.hidden = true;
    el.confetti.textContent = '';
    el.spinBtn.focus();
  }

  function launchConfetti() {
    el.confetti.textContent = '';
    if (prefersReducedMotion()) return;
    for (let i = 0; i < 40; i++) {
      const piece = document.createElement('span');
      piece.style.left = `${Math.random() * 100}%`;
      piece.style.background = COLORS[i % COLORS.length];
      piece.style.animationDuration = `${2 + Math.random() * 2}s`;
      piece.style.animationDelay = `${Math.random() * 0.6}s`;
      el.confetti.appendChild(piece);
    }
  }

  // ---------- 歷史紀錄 ----------
  function renderHistory() {
    el.historyList.textContent = '';
    el.clearBtn.disabled = spinning || history.length === 0;
    if (history.length === 0) {
      const li = document.createElement('li');
      li.className = 'empty';
      li.textContent = '目前還沒有抽籤紀錄';
      el.historyList.appendChild(li);
      return;
    }
    history.forEach((record) => {
      const date = new Date(record.time);
      const li = document.createElement('li');
      const name = document.createElement('strong');
      name.textContent = record.name;
      const when = document.createElement('span');
      when.className = 'when';
      when.textContent = `${date.toLocaleDateString('zh-TW')} ${date.toLocaleTimeString('zh-TW', { hour12: false })}`;
      li.append(name, when);
      el.historyList.appendChild(li);
    });
  }

  function clearHistory() {
    if (spinning || history.length === 0) return;
    if (!window.confirm('確定要清除所有抽籤紀錄嗎？')) return;
    history = [];
    saveHistory();
    renderHistory();
  }

  // ---------- 事件與初始化 ----------
  el.addBtn.addEventListener('click', addItem);
  el.input.addEventListener('keydown', (e) => { if (e.key === 'Enter') addItem(); });
  el.resetBtn.addEventListener('click', resetItems);
  el.spinBtn.addEventListener('click', spin);
  el.clearBtn.addEventListener('click', clearHistory);
  el.okBtn.addEventListener('click', closeResult);
  el.overlay.addEventListener('click', (e) => { if (e.target === el.overlay) closeResult(); });
  document.addEventListener('keydown', (e) => {
    if (el.overlay.hidden) return;
    if (e.key === 'Escape') closeResult();
    if (e.key === 'Tab') { e.preventDefault(); el.okBtn.focus(); } // 焦點限制在彈窗內
  });

  renderList();
  renderHistory();
  drawWheel();
})();
