/**
 * 🏆 BioGameSuite / ScoreSubmitModal (國中生物遊戲平台終極標準中介層模組)
 * 版本: v3.6 (全自動開局守門員 · 純數字選單 · 中途防手滑護城河 · 三階段動態結算 · 4大交機檢核)
 * 
 * 四大核心防線：
 * 1. 【一、開局登入介面絕對統一】：
 *    - 網頁一載入第 0 秒強制彈窗覆蓋主畫面（防偷跑）
 *    - 班級：純數字 701~710 下拉選單（嚴禁出現「班」字）
 *    - 座號：兩位純數字補零 01~35 下拉選單（嚴禁出現「號」字）
 *    - 姓名：真實全名必填，灰色提示「請輸入真實全名，請勿填寫暱稱」
 *    - 單元：大廳一顯示單元（支援派卷鎖定）；大廳二獨立遊戲自動隱藏單元
 *    - 點擊下一步 ➔ 彈出【二次確認防滑錯 ＋ 課堂載具誠信公約】（核對【701-15 王小明】＋ 嚴禁看YouTube/拍照）
 *    - 確認無誤後放行進入遊戲！
 * 2. 【二、遊戲中途防手滑護城河】：
 *    - 遊戲進行中攔截誤觸離開、上一頁、重整（beforeunload + popstate）
 *    - 支援 10 分鐘中斷快照原地恢復
 * 3. 【三、結算畫面三階段流暢體驗】：
 *    - 階段一：完賽自動背景 POST 至 GAS，按鈕立即鎖死反灰（📡 成績傳送中...），1秒內變身永久大綠勾徽章（🎉 ✅ 挑戰紀錄已登錄！）
 *    - 階段二：動態展開雙軌選擇（🚀 🔥 菁英加碼挑戰 10 題 vs 📱 準備交回平板）
 *    - 階段三：點提前交卷後展開【平板交回充電車前 · 4 大自我檢查守則】（1.關鬧鐘 2.清相簿 3.禁開非教學App 4.充電口朝外插妥線），一鍵鎖定抹除個資
 * 4. 【四、後端 GAS 與試算表精準對齊】：
 *    - 統一送往正式 /exec 端點，10 秒防灌水去重
 */
(function (global) {
  'use strict';

  const DEFAULT_GAS_URL = 'https://script.google.com/macros/s/AKfycbzDHUfJKbGtgfYM5a1PHpQzbW2JGZL3zFTh582r95vcOKupGRfZVa0ToHbbfX1MirzbbQ/exec';

  let currentStudent = { class: '', seat: '', name: '', unit: '', unitTitle: '' };
  let isGameActive = false;
  let isScoreSubmitted = false;
  let exitGuardEnabled = false;

  function injectSuiteStyles() {
    if (document.getElementById('bioSuiteStyles')) return;
    const style = document.createElement('style');
    style.id = 'bioSuiteStyles';
    style.textContent = `
      .bgs-overlay {
        position: fixed;
        top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(15, 23, 42, 0.92);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 999999;
        font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Microsoft JhengHei", sans-serif;
        padding: 16px;
        box-sizing: border-box;
      }
      .bgs-card {
        background: #1e293b;
        border: 2px solid #38bdf8;
        border-radius: 24px;
        width: 100%;
        max-width: 480px;
        max-height: 92vh;
        overflow-y: auto;
        padding: 24px 22px;
        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.75);
        color: #f8fafc;
        animation: bgsPopIn 0.28s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        box-sizing: border-box;
      }
      @keyframes bgsPopIn {
        from { transform: scale(0.88); opacity: 0; }
        to { transform: scale(1); opacity: 1; }
      }
      @keyframes bgsFadeDown {
        from { opacity: 0; transform: translateY(-10px); }
        to { opacity: 1; transform: translateY(0); }
      }
      .bgs-title {
        font-size: 1.35rem;
        font-weight: 900;
        color: #38bdf8;
        text-align: center;
        margin: 0 0 6px 0;
      }
      .bgs-subtitle {
        font-size: 0.88rem;
        color: #94a3b8;
        text-align: center;
        margin: 0 0 16px 0;
        line-height: 1.4;
      }
      .bgs-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
        margin-bottom: 12px;
      }
      .bgs-form-group {
        margin-bottom: 14px;
        text-align: left;
      }
      .bgs-label {
        display: block;
        font-size: 0.85rem;
        font-weight: 700;
        margin-bottom: 6px;
        color: #cbd5e1;
      }
      .bgs-input, .bgs-select {
        width: 100%;
        padding: 11px 14px;
        background: #0f172a;
        border: 1.5px solid #334155;
        border-radius: 12px;
        color: #ffffff;
        font-size: 0.95rem;
        box-sizing: border-box;
        outline: none;
      }
      .bgs-input::placeholder {
        color: #64748b;
        font-size: 0.88rem;
      }
      .bgs-input:focus, .bgs-select:focus {
        border-color: #38bdf8;
      }
      .bgs-unit-badge {
        background: rgba(16, 185, 129, 0.15);
        border: 1.5px solid #10b981;
        border-radius: 12px;
        padding: 10px 14px;
        color: #6ee7b7;
        font-size: 0.92rem;
        font-weight: 800;
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 14px;
      }
      .bgs-contract-box {
        background: rgba(239, 68, 68, 0.1);
        border: 1.5px dashed #ef4444;
        border-radius: 14px;
        padding: 14px;
        margin-bottom: 18px;
        text-align: left;
      }
      .bgs-contract-title {
        color: #fca5a5;
        font-size: 0.92rem;
        font-weight: 800;
        margin-bottom: 6px;
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .bgs-contract-item {
        font-size: 0.82rem;
        color: #fecaca;
        line-height: 1.5;
        margin-bottom: 4px;
      }
      .bgs-btn {
        width: 100%;
        padding: 13px;
        border-radius: 14px;
        font-size: 1.02rem;
        font-weight: 800;
        border: none;
        cursor: pointer;
        display: flex;
        justify-content: center;
        align-items: center;
        gap: 8px;
        transition: all 0.2s ease;
        box-sizing: border-box;
        margin-top: 8px;
      }
      .bgs-btn-primary {
        background: linear-gradient(135deg, #16a34a, #15803d);
        color: white;
        box-shadow: 0 4px 14px rgba(22, 163, 74, 0.4);
      }
      .bgs-btn-gold {
        background: linear-gradient(135deg, #f59e0b, #d97706);
        color: white;
        box-shadow: 0 4px 14px rgba(245, 158, 11, 0.4);
      }
      .bgs-btn-blue {
        background: linear-gradient(135deg, #0284c7, #0369a1);
        color: white;
        box-shadow: 0 4px 14px rgba(2, 132, 199, 0.4);
      }
      .bgs-btn-subtle {
        background: #334155;
        color: #cbd5e1;
        border: 1px solid #475569;
        font-size: 0.9rem;
      }
      .bgs-btn-locked {
        background: #334155 !important;
        color: #94a3b8 !important;
        border: 1.5px solid #475569 !important;
        cursor: not-allowed !important;
        box-shadow: none !important;
      }
      .bgs-badge-success {
        background: rgba(34, 197, 94, 0.15);
        border: 2px solid #22c55e;
        border-radius: 16px;
        padding: 14px;
        text-align: center;
        color: #4ade80;
        font-size: 1.1rem;
        font-weight: 900;
        margin-bottom: 14px;
        animation: bgsPopIn 0.3s ease;
      }
      .bgs-checklist-card {
        background: rgba(15, 23, 42, 0.95);
        border: 2px solid #f59e0b;
        border-radius: 20px;
        padding: 16px;
        margin-bottom: 16px;
        text-align: left;
        animation: bgsFadeDown 0.3s ease;
      }
      .bgs-checklist-title {
        color: #fbbf24;
        font-size: 1.05rem;
        font-weight: 900;
        margin-bottom: 12px;
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .bgs-checklist-item {
        background: rgba(30, 41, 59, 0.8);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 12px;
        padding: 10px 12px;
        margin-bottom: 8px;
      }
      .bgs-checklist-item strong {
        display: block;
        color: #fef08a;
        font-size: 0.88rem;
        margin-bottom: 3px;
      }
      .bgs-checklist-item p {
        margin: 0;
        font-size: 0.8rem;
        color: #cbd5e1;
        line-height: 1.4;
      }
      .bgs-hardware-notice {
        background: rgba(245, 158, 11, 0.12);
        border: 1.5px dashed #f59e0b;
        border-radius: 10px;
        padding: 8px 12px;
        color: #fde68a;
        font-size: 0.82rem;
        font-weight: 800;
        text-align: center;
        margin-top: 10px;
      }
    `;
    document.head.appendChild(style);
  }

  // 1. 中途防手滑護城河 (beforeunload + popstate)
  function initExitGuard() {
    if (exitGuardEnabled) return;
    exitGuardEnabled = true;

    window.addEventListener('beforeunload', function (e) {
      if (isGameActive && !isScoreSubmitted) {
        e.preventDefault();
        e.returnValue = '⚠️ 關卡尚未完成！離開將遺失目前挑戰進度，確定要離開嗎？';
        return e.returnValue;
      }
    });

    try {
      history.pushState(null, '', location.href);
      window.addEventListener('popstate', function () {
        if (isGameActive && !isScoreSubmitted) {
          const leave = confirm('⚠️ 關卡尚未完成！離開將遺失目前挑戰進度，確定要離開遊戲嗎？');
          if (!leave) history.pushState(null, '', location.href);
        }
      });
    } catch (_) {}
  }

  function disableExitGuard() {
    isGameActive = false;
    isScoreSubmitted = true;
  }

  // 同步學生資料至全域與 DOM 元素
  function syncStudentToDom(student) {
    if (!student) return;
    const clsIds = ['user-class', 'inputClass', 'p-class', 'studentClass', 'class-select'];
    const seatIds = ['user-seat', 'inputSeat', 'p-seat', 'studentSeat', 'seat-select'];
    const nameIds = ['user-name', 'inputName', 'p-name', 'studentName', 'name-input', 'inputStudentName'];

    clsIds.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = student.class;
    });
    seatIds.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = student.seat;
    });
    nameIds.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = student.name;
    });

    window.playerProfile = { cls: student.class, seat: student.seat, name: student.name };
    window.studentProfile = { className: student.class, seat: student.seat, name: student.name };
    window.currentStudent = student;
  }

  // 自動解析學生資訊輔助函式
  function resolveStudentProfile(options) {
    options = options || {};
    let cls = options.class || options.initialClass || options.cls || '';
    let seat = options.seat || options.initialSeat || options.seatOrGroup || '';
    let name = options.name || options.initialName || options.nameOrMembers || '';

    if (!cls && currentStudent.class) cls = currentStudent.class;
    if (!seat && currentStudent.seat) seat = currentStudent.seat;
    if (!name && currentStudent.name) name = currentStudent.name;

    // 檢查全域變數
    if (!cls && window.playerProfile && window.playerProfile.cls) cls = window.playerProfile.cls;
    if (!seat && window.playerProfile && window.playerProfile.seat) seat = window.playerProfile.seat;
    if (!name && window.playerProfile && window.playerProfile.name) name = window.playerProfile.name;

    if (!cls && window.studentProfile && window.studentProfile.className) cls = window.studentProfile.className;
    if (!seat && window.studentProfile && window.studentProfile.seat) seat = window.studentProfile.seat;
    if (!name && window.studentProfile && window.studentProfile.name) name = window.studentProfile.name;

    // 檢查 DOM
    if (!cls) {
      const clsEl = document.getElementById('user-class') || document.getElementById('inputClass') || document.getElementById('class-select') || document.getElementById('studentClass');
      if (clsEl && clsEl.value) cls = clsEl.value;
    }
    if (!seat) {
      const seatEl = document.getElementById('user-seat') || document.getElementById('inputSeat') || document.getElementById('seat-select') || document.getElementById('studentSeat');
      if (seatEl && seatEl.value) seat = seatEl.value;
    }
    if (!name) {
      const nameEl = document.getElementById('user-name') || document.getElementById('inputName') || document.getElementById('name-input') || document.getElementById('studentName');
      if (nameEl && nameEl.value) name = nameEl.value;
    }

    // 檢查 Storage
    if (!cls || !seat || !name) {
      const cached = sessionStorage.getItem('bgs_authed_student') || sessionStorage.getItem('bgs_active_session') || localStorage.getItem('bio_student_profile');
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (!cls) cls = parsed.class || parsed.className || parsed.cls || '';
          if (!seat) seat = parsed.seat || '';
          if (!name) name = parsed.name || '';
        } catch (_) {}
      }
    }

    // 智慧拆分 5 碼組合 (例: 70105 -> 701 班級 與 05 座號)
    if (seat) {
      const pureDigits = String(seat).replace(/[^\d]/g, '');
      if (pureDigits.length === 5 && pureDigits.startsWith('7')) {
        if (!cls || cls === '701') cls = pureDigits.substring(0, 3);
        seat = pureDigits.substring(3);
      }
    }

    // 純化班級與座號
    if (cls) cls = String(cls).replace(/[^\d]/g, '');
    if (seat) {
      seat = String(seat).replace(/[^\d]/g, '');
      if (seat.length === 1) seat = '0' + seat;
    }
    if (name) name = String(name).trim();

    return {
      class: cls || '701',
      seat: seat || '01',
      name: name || ''
    };
  }

  // 2. 開局登入視窗 (一、開局登入介面絕對統一)
  function showLogin(options) {
    options = options || {};
    injectSuiteStyles();
    initExitGuard();

    const params = new URLSearchParams(window.location.search);
    const urlUnit = params.get('unit') || params.get('file');
    const isDispatch = !!urlUnit;
    const unitTitle = options.unitTitle || (isDispatch ? `課堂指定單元 (${urlUnit})` : '[7上] 1-1 生命現象');

    // 10 分鐘中斷暫存恢復
    const savedSessionRaw = sessionStorage.getItem('bgs_active_session');
    if (savedSessionRaw) {
      try {
        const savedSession = JSON.parse(savedSessionRaw);
        const timeDiff = Date.now() - (savedSession.timestamp || 0);
        if (timeDiff < 10 * 60 * 1000 && savedSession.inProgress) {
          const resume = confirm(`🔄 偵測到您剛剛未完成的挑戰進度！\n\n【${savedSession.class} - ${savedSession.seat}】${savedSession.name}\n\n是否繼續未完成的挑戰？`);
          if (resume) {
            currentStudent = savedSession;
            isGameActive = true;
            syncStudentToDom(savedSession);
            if (typeof options.onStart === 'function') options.onStart(savedSession);
            return;
          }
        }
      } catch (_) {}
    }

    // 移除已存在的登入浮窗 (防重複)
    const existing = document.getElementById('bgsLoginOverlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.className = 'bgs-overlay';
    overlay.id = 'bgsLoginOverlay';

    const savedClass = localStorage.getItem('bgs_last_class') || '701';
    const classOpts = Array.from({ length: 10 }, (_, i) => {
      const c = `7${String(i + 1).padStart(2, '0')}`;
      return `<option value="${c}" ${c === savedClass ? 'selected' : ''}>${c}</option>`;
    }).join('');

    const seatOpts = Array.from({ length: 35 }, (_, i) => {
      const s = String(i + 1).padStart(2, '0');
      return `<option value="${s}">${s}</option>`;
    }).join('');

    overlay.innerHTML = `
      <div class="bgs-card">
        <h2 class="bgs-title">🚀 ${options.gameTitle || '課堂生物挑戰'}</h2>
        <p class="bgs-subtitle">國中生物課堂評量系統 · 請輸入身分登入</p>

        <div class="bgs-row">
          <div class="bgs-form-group">
            <label class="bgs-label">班級 (701~710)</label>
            <select class="bgs-select" id="bgsClassSelect">${classOpts}</select>
          </div>
          <div class="bgs-form-group">
            <label class="bgs-label">座號 (01~35)</label>
            <select class="bgs-select" id="bgsSeatSelect">${seatOpts}</select>
          </div>
        </div>

        <div class="bgs-form-group">
          <label class="bgs-label">學生真實全名 (必填，勿填綽號)</label>
          <input type="text" class="bgs-input" id="bgsNameInput" placeholder="請輸入真實全名，請勿填寫暱稱" maxlength="15" required />
        </div>

        ${options.hideUnit ? '' : (isDispatch ? `
          <div class="bgs-form-group">
            <label class="bgs-label">挑戰單元 (老師派卷指定)</label>
            <div class="bgs-unit-badge">
              <span>🎯</span>
              <span>${unitTitle} (派卷鎖定)</span>
            </div>
          </div>
        ` : `
          <div class="bgs-form-group">
            <label class="bgs-label">選擇複習單元</label>
            <select class="bgs-select" id="bgsUnitSelect">
              <option value="unit01_scientific_method">[7上] 1-1 科學方法與生命現象</option>
              <option value="unit02_cells">[7上] 1-2 細胞構造與顯微鏡</option>
              <option value="unit03_transport">[7上] 2-1 物質進出細胞與擴散</option>
              <option value="unit04_nutrition">[7上] 3-1 養分消化與酵素作用</option>
              <option value="unit05_circulation">[7上] 4-1 人體血液與心臟循環</option>
              <option value="unit06_coordination">[7上] 5-1 神經傳導與反射協調</option>
              <option value="unit07_homeostasis">[7上] 6-1 呼吸體溫恆定與排泄</option>
            </select>
          </div>
        `)}

        <button type="button" class="bgs-btn bgs-btn-primary" id="bgsBtnNext">下一步：核對身分與公約 ➜</button>
      </div>
    `;

    document.body.appendChild(overlay);

    const btnNext = overlay.querySelector('#bgsBtnNext');
    const classSel = overlay.querySelector('#bgsClassSelect');
    const seatSel = overlay.querySelector('#bgsSeatSelect');
    const nameInp = overlay.querySelector('#bgsNameInput');

    nameInp.focus();

    btnNext.addEventListener('click', () => {
      const cls = classSel.value;
      const seat = seatSel.value;
      const name = nameInp.value.trim();

      if (!name) {
        alert('⚠️ 請務必填寫您的真實姓名，不可留空！');
        nameInp.focus();
        return;
      }

      currentStudent = {
        class: cls,
        seat: seat,
        name: name,
        unit: isDispatch ? urlUnit : (overlay.querySelector('#bgsUnitSelect')?.value || 'unit01_scientific_method'),
        unitTitle: unitTitle,
        timestamp: Date.now(),
        inProgress: true
      };

      localStorage.setItem('bgs_last_class', cls);
      sessionStorage.setItem('bgs_active_session', JSON.stringify(currentStudent));
      sessionStorage.setItem('bgs_authed_student', JSON.stringify(currentStudent));

      overlay.remove();
      showConfirmModal(options);
    });
  }

  // 3. 二次核對＋誠信公約
  function showConfirmModal(options) {
    const overlay = document.createElement('div');
    overlay.className = 'bgs-overlay';
    overlay.id = 'bgsConfirmOverlay';

    overlay.innerHTML = `
      <div class="bgs-card">
        <h2 class="bgs-title">👤 請核對挑戰身分</h2>
        <p class="bgs-subtitle">防滑錯確認 · 避免成績登記至其他同學座號</p>

        <div style="background:rgba(56, 189, 248, 0.12); border:1.5px solid #38bdf8; border-radius:14px; padding:12px; text-align:center; margin-bottom:14px;">
          <div style="font-size:0.85rem; color:#94a3b8;">登錄身分確認</div>
          <div style="font-size:1.45rem; font-weight:900; color:#38bdf8; margin:4px 0;">
            ${currentStudent.class} 班級　${currentStudent.seat} 座號
          </div>
          <div style="font-size:1.15rem; font-weight:800; color:#ffffff;">
            姓名：${currentStudent.name}
          </div>
          ${options.hideUnit ? '' : `
            <div style="font-size:0.82rem; color:#10b981; margin-top:4px;">
              📚 單元：${currentStudent.unitTitle || '課堂指定單元'}
            </div>
          `}
        </div>

        <div class="bgs-contract-box">
          <div class="bgs-contract-title">
            <span>📱</span>
            <span>【課堂載具使用誠信公約】</span>
          </div>
          <div class="bgs-contract-item">⚠️ <strong>挑戰全程請專注於本遊戲！</strong></div>
          <div class="bgs-contract-item">👉 <strong>嚴禁跳出畫面看 YouTube、拍照自拍、或開啟非課堂 App。</strong></div>
          <div class="bgs-contract-item">👉 若發現違規使用載具，本次作答成績將直接不予計分！</div>
        </div>

        <button type="button" class="bgs-btn bgs-btn-primary" id="bgsBtnStart">
          🚀 我已核對身分並遵守公約，開始出擊！
        </button>
        <button type="button" class="bgs-btn bgs-btn-subtle" id="bgsBtnBack">
          ↩️ 座號有誤，返回修改
        </button>
      </div>
    `;

    document.body.appendChild(overlay);

    overlay.querySelector('#bgsBtnBack').addEventListener('click', () => {
      overlay.remove();
      showLogin(options);
    });

    overlay.querySelector('#bgsBtnStart').addEventListener('click', () => {
      overlay.remove();
      isGameActive = true;
      isScoreSubmitted = false;
      syncStudentToDom(currentStudent);

      // 觸發自定義事件供遊戲接聽
      window.dispatchEvent(new CustomEvent('biogame:start', { detail: currentStudent }));

      if (typeof options.onStart === 'function') {
        options.onStart(currentStudent);
      }
    });
  }

  // 4. 結算畫面三階段流暢體驗（精準防手震與動態展開）
  function showResult(options) {
    options = options || {};
    injectSuiteStyles();

    // 解析學生資訊
    const prof = resolveStudentProfile(options);
    currentStudent.class = prof.class;
    currentStudent.seat = prof.seat;
    currentStudent.name = prof.name;

    // 若姓名仍為空，先彈出簡易身分補填視窗
    if (!currentStudent.name) {
      promptIdentityBeforeResult(options);
      return;
    }

    renderThreeStageResult(options);
  }

  // 若開局未抓到姓名的補填彈窗
  function promptIdentityBeforeResult(options) {
    const overlay = document.createElement('div');
    overlay.className = 'bgs-overlay';
    overlay.id = 'bgsPromptIdOverlay';

    const classOpts = Array.from({ length: 10 }, (_, i) => {
      const c = `7${String(i + 1).padStart(2, '0')}`;
      return `<option value="${c}" ${c === currentStudent.class ? 'selected' : ''}>${c}</option>`;
    }).join('');

    const seatOpts = Array.from({ length: 35 }, (_, i) => {
      const s = String(i + 1).padStart(2, '0');
      return `<option value="${s}" ${s === currentStudent.seat ? 'selected' : ''}>${s}</option>`;
    }).join('');

    overlay.innerHTML = `
      <div class="bgs-card">
        <h2 class="bgs-title">🏆 挑戰完成！登記成績</h2>
        <p class="bgs-subtitle">請確認您的班級、座號與真實全名，以登錄試算表</p>

        <div class="bgs-row">
          <div class="bgs-form-group">
            <label class="bgs-label">班級 (701~710)</label>
            <select class="bgs-select" id="bgsQuickClass">${classOpts}</select>
          </div>
          <div class="bgs-form-group">
            <label class="bgs-label">座號 (01~35)</label>
            <select class="bgs-select" id="bgsQuickSeat">${seatOpts}</select>
          </div>
        </div>

        <div class="bgs-form-group">
          <label class="bgs-label">真實姓名 (必填)</label>
          <input type="text" class="bgs-input" id="bgsQuickName" placeholder="請輸入真實全名，請勿填寫暱稱" maxlength="15" required />
        </div>

        <button type="button" class="bgs-btn bgs-btn-primary" id="bgsQuickConfirm">
          ✅ 確認身分，自動登錄成績 ➔
        </button>
      </div>
    `;

    document.body.appendChild(overlay);

    const nameInp = overlay.querySelector('#bgsQuickName');
    nameInp.focus();

    overlay.querySelector('#bgsQuickConfirm').addEventListener('click', () => {
      const cls = overlay.querySelector('#bgsQuickClass').value;
      const seat = overlay.querySelector('#bgsQuickSeat').value;
      const name = nameInp.value.trim();

      if (!name) {
        alert('⚠️ 請填寫真實姓名，以利成績登錄！');
        nameInp.focus();
        return;
      }

      currentStudent.class = cls;
      currentStudent.seat = seat;
      currentStudent.name = name;

      localStorage.setItem('bgs_last_class', cls);
      overlay.remove();
      renderThreeStageResult(options);
    });
  }

  // 渲染三階段結算卡片
  function renderThreeStageResult(options) {
    const overlay = document.createElement('div');
    overlay.className = 'bgs-overlay';
    overlay.id = 'bgsResultOverlay';

    const score = options.score !== undefined ? options.score : 100;
    const scoreDisplay = options.scoreDisplay || `${score} 分`;
    const duration = options.duration || '--:--';
    const gasUrl = options.gasUrl || DEFAULT_GAS_URL;

    overlay.innerHTML = `
      <div class="bgs-card" id="bgsResultCard">
        <h2 class="bgs-title">🏆 挑戰圓滿結算！</h2>
        <p class="bgs-subtitle">${options.gameTitle || '課堂生物挑戰'}</p>

        <div style="background:rgba(56, 189, 248, 0.1); border:1px solid rgba(56, 189, 248, 0.3); border-radius:14px; padding:12px; text-align:center; margin-bottom:14px;">
          <div style="font-size:0.85rem; color:#94a3b8;">
            選手：${currentStudent.class} - ${currentStudent.seat} ${currentStudent.name}
          </div>
          <div style="font-size:1.8rem; font-weight:900; color:#f59e0b; margin:4px 0;">
            ${scoreDisplay}
          </div>
          <div style="font-size:0.8rem; color:#64748b;">⏱️ 耗時：${duration}</div>
        </div>

        <!-- 🔹 階段一：自動送出 ＋ 絕對鎖死狀態容器 -->
        <div id="bgsStage1Box">
          <button type="button" class="bgs-btn bgs-btn-locked" id="bgsStatusBtn" disabled>
            📡 成績傳送中，請稍候... (請勿連點)
          </button>
        </div>

        <!-- 🔹 階段二：雙軌選擇 (學霸加碼 vs 提前交卷) 動態展開區 -->
        <div id="bgsStage2Box" style="display:none; animation: bgsFadeDown 0.35s ease;">
          <div style="margin: 16px 0 10px; border-top: 1px dashed rgba(255,255,255,0.15);"></div>
          <p style="font-size:0.85rem; color:#cbd5e1; text-align:center; margin-bottom:10px;">
            請依課堂剩餘時間選擇下一步：
          </p>
          <div style="display:flex; flex-direction:column; gap:8px;">
            <button type="button" class="bgs-btn bgs-btn-gold" id="bgsBtnBonus">
              🚀 【🔥 菁英加碼挑戰 10 題 (中/難題)】
            </button>
            <button type="button" class="bgs-btn bgs-btn-blue" id="bgsBtnReturnTablet">
              📱 【準備交回平板 / 提前交卷】
            </button>
          </div>
        </div>

        <!-- 🔹 階段三：點選提前交卷後展開的【平板歸還 4 大檢核】 -->
        <div id="bgsStage3Box" style="display:none; animation: bgsFadeDown 0.35s ease;">
          <div class="bgs-checklist-card">
            <div class="bgs-checklist-title">
              <span>📱</span>
              <span>【平板交回充電車前 · 4 大自我檢查守則】</span>
            </div>

            <div class="bgs-checklist-item">
              <strong>⏰ 1. 關閉所有鬧鐘與計時器</strong>
              <p>嚴禁在時鐘 App 留下任何計時，避免推車內大響干擾下一班！</p>
            </div>

            <div class="bgs-checklist-item">
              <strong>📸 2. 清理相簿照片與瀏覽分頁</strong>
              <p>請勿留下任何自拍或個人照片，維護個資並關閉本遊戲分頁。</p>
            </div>

            <div class="bgs-checklist-item">
              <strong>🚫 3. 嚴禁開啟非課堂 App 或更動設定</strong>
              <p>保持系統乾淨，做個有良好數位素養的優秀學生！</p>
            </div>

            <div class="bgs-checklist-item">
              <strong>🔌 4. 依座號定位充電車</strong>
              <p>依座號放回充電車，充電口朝外，套口朝下插好線材。</p>
            </div>

            <div class="bgs-hardware-notice">
              ⚡ 請務必確認充電口朝外，插妥充電線！
            </div>
          </div>

          <button type="button" class="bgs-btn bgs-btn-primary" id="bgsBtnLockAndReset">
            ✅ 我已完成上述檢查，交回平板 (一鍵鎖定) ➔
          </button>
        </div>

        <!-- 斷網備用區 (超時/失敗才顯示) -->
        <div id="bgsFallbackArea" style="display:none; margin-top:10px;">
          <button type="button" class="bgs-btn bgs-btn-subtle" id="bgsBtnCopyFallback">
            📋 複製成績文字檔 (斷網備用交給老師)
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const stage1Box = overlay.querySelector('#bgsStage1Box');
    const statusBtn = overlay.querySelector('#bgsStatusBtn');
    const stage2Box = overlay.querySelector('#bgsStage2Box');
    const stage3Box = overlay.querySelector('#bgsStage3Box');
    const fallbackArea = overlay.querySelector('#bgsFallbackArea');
    const btnBonus = overlay.querySelector('#bgsBtnBonus');
    const btnReturnTablet = overlay.querySelector('#bgsBtnReturnTablet');
    const btnLockAndReset = overlay.querySelector('#bgsBtnLockAndReset');
    const btnCopyFallback = overlay.querySelector('#bgsBtnCopyFallback');

    // 複製備用文本
    btnCopyFallback.addEventListener('click', () => {
      const timestamp = new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' });
      const hashStr = Math.random().toString(36).substring(2, 10).toUpperCase();
      const textToCopy = `🏆 [${options.gameTitle || '課堂生物挑戰'}] 結算成績單\n` +
        `👤 學生：【${currentStudent.class} - ${currentStudent.seat} ${currentStudent.name}】\n` +
        `💯 得分：${scoreDisplay}\n` +
        `⏱️ 耗時：${duration}\n` +
        `📅 時間：${timestamp}\n` +
        `🔑 驗證：BIO-${hashStr}`;

      navigator.clipboard.writeText(textToCopy).then(() => {
        alert('✅ 已複製成績備份至剪貼簿！可直接交給老師備查：\n\n' + textToCopy);
      }).catch(() => {
        prompt('請選取並複製以下成果文本：', textToCopy);
      });
    });

    // 🔹 階段一：自動送出 ＋ 絕對鎖死（零點擊零連按）
    const payload = {
      class: currentStudent.class,
      seatOrGroup: currentStudent.seat,
      nameOrMembers: currentStudent.name,
      gameTitle: options.gameTitle || '課堂生物挑戰',
      score: score,
      duration: duration,
      mode: 'individual',
      timestamp: new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' }),
      rawTimestamp: Date.now()
    };

    let isSuccess = false;

    // 8 秒超時保底防護
    const timeoutTimer = setTimeout(() => {
      if (!isSuccess) {
        statusBtn.className = 'bgs-btn bgs-btn-gold';
        statusBtn.disabled = false;
        statusBtn.innerHTML = '⚠️ 網路塞車中，成績已保存在本機！';
        fallbackArea.style.display = 'block';
        stage2Box.style.display = 'block'; // 仍允許進入階段二
      }
    }, 8000);

    fetch(gasUrl, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(() => {
      clearTimeout(timeoutTimer);
      isSuccess = true;
      disableExitGuard();
      sessionStorage.removeItem('bgs_active_session');

      // 變身為醒目的永久大綠勾徽章
      stage1Box.innerHTML = `
        <div class="bgs-badge-success">
          🎉 ✅ 挑戰紀錄已登錄！<br>
          <span style="font-size:0.95rem; font-weight:800; color:#ffffff;">
            【 ${payload.class}　${payload.seatOrGroup}　${payload.nameOrMembers} ｜ 闖關完成 】
          </span>
        </div>
      `;

      // 🔹 階段二：動態展開雙軌選擇按鈕
      stage2Box.style.display = 'block';

      if (typeof options.onSuccess === 'function') {
        try { options.onSuccess(); } catch (_) {}
      }

    }).catch(err => {
      console.warn('Background submission failed:', err);
      clearTimeout(timeoutTimer);
      fallbackArea.style.display = 'block';
      stage2Box.style.display = 'block';
    });

    // 🔹 階段二按鈕控制
    btnBonus.addEventListener('click', () => {
      overlay.remove();
      const bonusFn = options.onBonusChallenge || options.onBonus;
      if (typeof bonusFn === 'function') {
        bonusFn();
      } else {
        alert('🔥 本單元加碼挑戰正在載入中高難度題目，請稍候！');
        window.location.reload();
      }
    });

    btnReturnTablet.addEventListener('click', () => {
      // 隱藏階段二，動態展開階段三【平板歸還 4 大檢核】
      stage2Box.style.display = 'none';
      stage3Box.style.display = 'block';
    });

    // 🔹 階段三交機鎖定控制
    btnLockAndReset.addEventListener('click', () => {
      // 徹底清除本堂課快取，防跑班污染
      sessionStorage.clear();
      localStorage.removeItem('bio_student_profile');
      localStorage.removeItem('bgs_active_session');
      localStorage.removeItem('bgs_authed_student');

      // 顯示乾淨鎖定待機畫面
      overlay.innerHTML = `
        <div class="bgs-card" style="text-align:center; padding:32px 20px;">
          <div style="font-size:3.5rem; margin-bottom:12px;">🔒</div>
          <h2 style="color:#38bdf8; font-size:1.4rem; margin-bottom:8px;">載具已安全鎖定</h2>
          <p style="color:#cbd5e1; font-size:0.92rem; line-height:1.6; margin-bottom:20px;">
            上一班挑戰紀錄已安全抹除！<br>
            請依座號將平板放回充電車，<strong>充電口朝外</strong>並插妥充電線。
          </p>
          <button type="button" class="bgs-btn bgs-btn-blue" onclick="location.reload()">
            🔄 下一班解鎖 / 全新開局
          </button>
        </div>
      `;

      // 2.5 秒後自動刷新回乾淨開局
      setTimeout(() => {
        window.location.reload();
      }, 2500);
    });

    // 3 分鐘閒置自動重置 (防下一班同學頂替)
    setTimeout(() => {
      sessionStorage.clear();
      localStorage.removeItem('bio_student_profile');
      localStorage.removeItem('bgs_active_session');
      localStorage.removeItem('bgs_authed_student');
      window.location.reload();
    }, 3 * 60 * 1000);
  }

  // 🚀 自動守門員：在 DOMContentLoaded 時自動檢查是否需要登入
  window.addEventListener('DOMContentLoaded', () => {
    initExitGuard();

    // 珍奶對決等教具若標記 __DISABLE_BGS_AUTO_LOGIN__ 則不自動彈出
    if (window.__DISABLE_BGS_AUTO_LOGIN__) return;

    // 稍微延遲 120ms 確保頁面原有元素與變數已載入
    setTimeout(() => {
      // 檢查是否已在同一 session 驗證過
      const authedRaw = sessionStorage.getItem('bgs_authed_student');
      if (authedRaw) {
        try {
          const authed = JSON.parse(authedRaw);
          if (authed && authed.name && authed.class && authed.seat) {
            currentStudent = authed;
            isGameActive = true;
            syncStudentToDom(authed);
            return;
          }
        } catch (_) {}
      }

      // 取得遊戲標題
      const rawTitle = document.querySelector('h1')?.innerText || document.title || '課堂生物挑戰';
      const cleanTitle = rawTitle.replace(/[【】\[\]]/g, '').split('|')[0].split('-')[0].trim();

      // 判定是否為大廳二獨立遊戲 (隱藏單元)
      const isStandalone = location.href.includes('bio-standalone-games') || 
                           location.href.includes('人體消化') || 
                           location.href.includes('五界');

      showLogin({
        gameTitle: cleanTitle,
        hideUnit: isStandalone,
        onStart: (student) => {
          syncStudentToDom(student);
          isGameActive = true;

          // 隱藏各遊戲原本重複的登入介面
          const redundantEls = [
            document.getElementById('start-modal'),
            document.getElementById('setupCard'),
            document.getElementById('setup-screen')
          ];
          redundantEls.forEach(el => {
            if (el) el.style.display = 'none';
          });

          // 自動觸發遊戲既有的開始函式或按鈕
          if (typeof window.startGame === 'function') {
            try { window.startGame(); return; } catch (_) {}
          }
          if (typeof window.startMission === 'function') {
            try { window.startMission(); return; } catch (_) {}
          }

          const possibleStartButtons = [
            document.getElementById('startBtn'),
            document.getElementById('start-btn'),
            document.getElementById('btnStart'),
            document.getElementById('btnStartGame'),
            document.getElementById('startGameBtn'),
            document.getElementById('enter-lab'),
            document.getElementById('start')
          ];
          for (const btn of possibleStartButtons) {
            if (btn && btn.offsetParent !== null && typeof btn.click === 'function') {
              try { btn.click(); break; } catch (_) {}
            }
          }
        }
      });
    }, 120);
  });

  global.BioGameSuite = {
    showLogin: showLogin,
    showConfirmModal: showConfirmModal,
    showResult: showResult,
    getStudent: () => currentStudent,
    disableExitGuard: disableExitGuard,
    resolveStudentProfile: resolveStudentProfile,
    syncStudentToDom: syncStudentToDom
  };

  global.showScoreSubmitModal = function (options) {
    showResult(options || {});
  };

})(window);
