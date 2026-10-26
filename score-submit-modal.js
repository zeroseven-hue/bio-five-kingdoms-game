/**
 * 🏆 BioGameSuite / ScoreSubmitModal (國中生物遊戲平台終極標準中介層模組)
 * 版本: v4.0 (五大情境沉浸主題 · 全自動開局守門員 · 純數字選單 · 中途防手滑護城河 · 三階段動態結算 · 4大交機檢核)
 * 
 * 🎨 五大情境主題（外觀自動隨遊戲調配，底層標準 100% 嚴格統一）：
 * 1. 🕹️ 復古像素街機風 (Pixel) - 瑪利歐 (mario)、小精靈 (pacman)、下樓梯 (shaft)
 * 2. 🌿 森林萌系大地風 (Nature) - 淘氣豆 (bean)、羊羊農場 (escape-farm)、釣魚趣 (fishing)、植物大戰殭屍 (pvz)
 * 3. ⚔️ 中古奇幻冒險風 (Fantasy) - 勇者傳奇 (rpg)、古堡驚魂 (escape-castle)、愛麗絲 (escape-alice)、校園密室 (escape-school)
 * 4. 🍱 暖心工坊食堂風 (Warm) - 人體消化大冒險 (bio-digestive-game)、五界研究所 (bio-five-kingdoms-game)、珍珠奶茶 (boba-reaction-game)
 * 5. 🚀 深空星艦科技風 (Sci-Fi) - 黑洞 (blackhole)、器官防衛 (defender)、微觀細胞 (escape-micro)、侏儸紀 (jurassic)、大富翁 (monopoly)
 * 
 * 四大核心防線：
 * 1. 【一、開局登入介面絕對統一】：
 *    - 班級：純數字 701~710 下拉選單（嚴禁出現「班」字）
 *    - 座號：兩位純數字補零 01~35 下拉選單（嚴禁出現「號」字）
 *    - 姓名：真實全名必填，灰色提示「請輸入真實全名，請勿填寫暱稱」
 *    - 單元：大廳一顯示單元（支援派卷鎖定）；大廳二獨立遊戲自動隱藏單元
 *    - 點擊下一步 ➔ 彈出【二次確認防滑錯 ＋ 課堂載具誠信公約】（核對【701-15 王小明】＋ 嚴禁看YouTube/拍照）
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

  // ⚡ 0ms 立即壓制任何既有舊版開局卡片（徹底杜絕畫面閃爍與干擾）
  try {
    const antiFlash = document.createElement('style');
    antiFlash.id = 'bgsAntiFlash';
    antiFlash.textContent = '#setup-screen, #start-modal, #setupCard, .legacy-setup { display: none !important; }';
    if (document.head) {
      document.head.appendChild(antiFlash);
    } else {
      document.addEventListener('DOMContentLoaded', () => {
        if (!document.getElementById('bgsAntiFlash') && document.head) {
          document.head.appendChild(antiFlash);
        }
      });
    }
  } catch (_) {}

  // 🎨 五大情境主題設定檔
  const THEME_CONFIGS = {
    pixel: {
      id: 'pixel',
      name: '復古像素街機風',
      icon: '🕹️',
      subtitle: '8-BIT 復古街機模式 · 請輸入身分登入',
      confirmSubtitle: '防滑錯確認 · 準備投幣進入冒險世界',
      settleTitle: '🏆 關卡通關 CLEAR！',
      loginBtnText: '下一步：核對身分與公約 ➜',
      startBtnText: '🕹️ 投幣出擊！遵守公約開始冒險',
      accentColor: '#d97706', cardBorder: '#d97706', badgeBg: '#fef3c7'
    },
    nature: {
      id: 'nature',
      name: '森林萌系大地風',
      icon: '🌿',
      subtitle: '生態探險任務 · 請輸入身分登入',
      confirmSubtitle: '防滑錯確認 · 戴上探險帽準備出發',
      settleTitle: '🌻 生態調查圓滿完成！',
      loginBtnText: '下一步：核對身分與公約 ➜',
      startBtnText: '🎒 踏上旅程！遵守公約出發探險',
      accentColor: '#15803d', cardBorder: '#16a34a', badgeBg: '#dcfce7'
    },
    fantasy: {
      id: 'fantasy',
      name: '中古奇幻冒險風',
      icon: '⚔️',
      subtitle: '冒險者公會登錄 · 請輸入身分登入',
      confirmSubtitle: '防滑錯確認 · 羊皮契約簽署即刻生效',
      settleTitle: '👑 勇者遠征大獲全勝！',
      loginBtnText: '下一步：核對身分與公約 ➜',
      startBtnText: '🛡️ 拔出寶劍！遵守契約踏上征途',
      accentColor: '#b45309', cardBorder: '#b45309', badgeBg: '#fef3c7'
    },
    warm: {
      id: 'warm',
      name: '暖心工坊食堂風',
      icon: '🍱',
      subtitle: '課堂實驗工坊 · 請輸入身分登入',
      confirmSubtitle: '防滑錯確認 · 主廚配方研究即將啟動',
      settleTitle: '🍵 特餐調配圓滿出爐！',
      loginBtnText: '下一步：核對身分與公約 ➜',
      startBtnText: '🔥 開火上菜！遵守公約開始研究',
      accentColor: '#ea580c', cardBorder: '#ea580c', badgeBg: '#ffedd5'
    },
    scifi: {
      id: 'scifi',
      name: '深空星艦科技風',
      icon: '🚀',
      subtitle: '星艦生物資料庫 · 請輸入身分登入',
      confirmSubtitle: '防滑錯確認 · 避免成績登記至其他同學座號',
      settleTitle: '🏆 挑戰圓滿結算！',
      loginBtnText: '下一步：核對身分與公約 ➜',
      startBtnText: '🚀 我已核對身分並遵守公約，開始出擊！',
      accentColor: '#0284c7', cardBorder: '#0284c7', badgeBg: '#e0f2fe'
    }
  };

  // 智慧主題解析函式
  function resolveTheme(options) {
    if (options && options.theme && THEME_CONFIGS[options.theme]) {
      return THEME_CONFIGS[options.theme];
    }
    if (window.BGS_THEME && THEME_CONFIGS[window.BGS_THEME]) {
      return THEME_CONFIGS[window.BGS_THEME];
    }

    const path = (location.pathname || '').toLowerCase();
    const href = (location.href || '').toLowerCase();
    const title = (document.title || '').toLowerCase();
    const gTitle = (options && options.gameTitle ? options.gameTitle : '').toLowerCase();

    // 1. Pixel (復古像素街機風)
    if (path.includes('/mario') || path.includes('/pacman') || path.includes('/shaft') ||
        title.includes('瑪利歐') || title.includes('小精靈') || title.includes('下樓梯') ||
        gTitle.includes('瑪利歐') || gTitle.includes('小精靈') || gTitle.includes('下樓梯')) {
      return THEME_CONFIGS.pixel;
    }

    // 2. Nature (森林萌系大地風)
    if (path.includes('/bean') || path.includes('/escape-farm') || path.includes('/fishing') || path.includes('/pvz') ||
        title.includes('淘氣豆') || title.includes('農場') || title.includes('釣魚') || title.includes('植物大戰') ||
        gTitle.includes('淘氣豆') || gTitle.includes('農場') || gTitle.includes('釣魚') || gTitle.includes('植物大戰')) {
      return THEME_CONFIGS.nature;
    }

    // 3. Fantasy (中古奇幻冒險風)
    if (path.includes('/rpg') || path.includes('/escape-castle') || path.includes('/escape-alice') || path.includes('/escape-school') ||
        title.includes('勇者') || title.includes('古堡') || title.includes('愛麗絲') || title.includes('密室') ||
        gTitle.includes('勇者') || gTitle.includes('古堡') || gTitle.includes('愛麗絲') || gTitle.includes('密室')) {
      return THEME_CONFIGS.fantasy;
    }

    // 4. Warm (暖心工坊食堂風)
    if (path.includes('digestive') || path.includes('kingdom') || path.includes('boba') ||
        title.includes('消化') || title.includes('五界') || title.includes('珍奶') || title.includes('珍珠奶茶') || title.includes('食堂') ||
        gTitle.includes('消化') || gTitle.includes('五界') || gTitle.includes('珍奶') || gTitle.includes('珍珠奶茶') || gTitle.includes('食堂')) {
      return THEME_CONFIGS.warm;
    }

    // 5. Default Sci-Fi (深空星艦科技風)
    return THEME_CONFIGS.scifi;
  }

  function injectSuiteStyles() {
    if (document.getElementById('bioSuiteStyles')) return;
    const style = document.createElement('style');
    style.id = 'bioSuiteStyles';
    style.textContent = `
      /* ==========================================================================
         BGS BASE RESET & OVERLAY
         ========================================================================== */
      .bgs-overlay {
        position: fixed;
        top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(15, 23, 42, 0.72);
        backdrop-filter: blur(14px);
        -webkit-backdrop-filter: blur(14px);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 999999;
        font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Microsoft JhengHei", sans-serif;
        padding: 16px;
        box-sizing: border-box;
      }
      .bgs-card {
        width: 100%;
        max-width: 480px;
        max-height: 92vh;
        overflow-y: auto;
        padding: 24px 22px;
        box-shadow: 0 20px 45px -10px rgba(0, 0, 0, 0.22), 0 0 0 1px rgba(0, 0, 0, 0.05);
        color: #1e293b;
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
        text-align: center;
        margin: 0 0 6px 0;
      }
      .bgs-subtitle {
        font-size: 0.88rem;
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
        border-radius: 12px;
        font-size: 0.95rem;
        box-sizing: border-box;
        outline: none;
        transition: border-color 0.2s ease, box-shadow 0.2s ease;
      }
      .bgs-input::placeholder {
        color: #64748b;
        font-size: 0.88rem;
      }
      .bgs-unit-badge {
        border-radius: 12px;
        padding: 10px 14px;
        font-size: 0.92rem;
        font-weight: 800;
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 14px;
      }
      .bgs-contract-box {
        border-radius: 14px;
        padding: 14px;
        margin-bottom: 18px;
        text-align: left;
      }
      .bgs-contract-title {
        font-size: 0.92rem;
        font-weight: 800;
        margin-bottom: 6px;
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .bgs-contract-item {
        font-size: 0.82rem;
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
      .bgs-btn-subtle {
        background: #f1f5f9;
        color: #334155;
        border: 1.5px solid #cbd5e1;
        font-size: 0.9rem;
      }
      .bgs-btn-subtle:hover {
        background: #e2e8f0;
        color: #0f172a;
      }
      .bgs-btn-locked {
        background: #f1f5f9 !important;
        color: #64748b !important;
        border: 1.5px solid #cbd5e1 !important;
        cursor: not-allowed !important;
        box-shadow: none !important;
      }
      .bgs-badge-success {
        border-radius: 16px;
        padding: 14px;
        text-align: center;
        font-size: 1.1rem;
        font-weight: 900;
        margin-bottom: 14px;
        animation: bgsPopIn 0.3s ease;
      }
      .bgs-checklist-card {
        border-radius: 20px;
        padding: 16px;
        margin-bottom: 16px;
        text-align: left;
        animation: bgsFadeDown 0.3s ease;
      }
      .bgs-checklist-title {
        font-size: 1.05rem;
        font-weight: 900;
        margin-bottom: 12px;
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .bgs-checklist-item {
        border-radius: 12px;
        padding: 10px 12px;
        margin-bottom: 8px;
      }
      .bgs-checklist-item strong {
        display: block;
        font-size: 0.88rem;
        margin-bottom: 3px;
      }
      .bgs-checklist-item p {
        margin: 0;
        font-size: 0.8rem;
        line-height: 1.4;
      }
      .bgs-hardware-notice {
        border-radius: 10px;
        padding: 8px 12px;
        font-size: 0.82rem;
        font-weight: 800;
        text-align: center;
        margin-top: 10px;
      }

      /* ==========================================================================
         🎨 1. SCIFI 主題 (清透冰川科技白 · 明亮高對比版)
         ========================================================================== */
      .bgs-theme-scifi {
        background: #ffffff;
        border: 2.5px solid #0284c7;
        border-radius: 24px;
        box-shadow: 0 20px 45px -10px rgba(2, 132, 199, 0.22), 0 0 0 1px rgba(2, 132, 199, 0.08);
      }
      .bgs-theme-scifi .bgs-title { color: #0369a1; text-shadow: none; font-weight: 900; }
      .bgs-theme-scifi .bgs-subtitle { color: #64748b; font-weight: 600; }
      .bgs-theme-scifi .bgs-label { color: #0f172a; font-weight: 700; }
      .bgs-theme-scifi .bgs-input, .bgs-theme-scifi .bgs-select {
        background: #f8fafc;
        border: 1.5px solid #cbd5e1;
        color: #0f172a;
        font-weight: 600;
      }
      .bgs-theme-scifi .bgs-input:focus, .bgs-theme-scifi .bgs-select:focus {
        border-color: #0284c7;
        box-shadow: 0 0 10px rgba(2, 132, 199, 0.3);
      }
      .bgs-theme-scifi .bgs-theme-tag {
        background: #e0f2fe;
        border: 1.5px solid #0284c7;
        color: #0369a1;
        font-weight: 800;
      }
      .bgs-theme-scifi .bgs-unit-badge {
        background: #f0f9ff;
        border: 1.5px solid #0284c7;
        color: #0369a1;
        font-weight: 800;
      }
      .bgs-theme-scifi .bgs-contract-box {
        background: #fef2f2;
        border: 1.5px dashed #ef4444;
      }
      .bgs-theme-scifi .bgs-contract-title { color: #b91c1c; font-weight: 800; }
      .bgs-theme-scifi .bgs-contract-item { color: #991b1b; }
      .bgs-theme-scifi .bgs-btn-primary {
        background: linear-gradient(135deg, #0284c7, #0369a1);
        color: #ffffff;
        box-shadow: 0 4px 14px rgba(2, 132, 199, 0.32);
      }
      .bgs-theme-scifi .bgs-btn-primary:hover {
        background: linear-gradient(135deg, #0369a1, #075985);
      }
      .bgs-theme-scifi .bgs-badge-success {
        background: #f0fdf4;
        border: 2px solid #0284c7;
        color: #0369a1;
      }
      .bgs-theme-scifi .bgs-btn-stage2-extra {
        background: linear-gradient(135deg, #0d9488, #0f766e);
        color: #ffffff;
        box-shadow: 0 4px 14px rgba(13, 148, 136, 0.3);
      }
      .bgs-theme-scifi .bgs-btn-stage2-return {
        background: linear-gradient(135deg, #334155, #1e293b);
        color: #ffffff;
        box-shadow: 0 4px 14px rgba(51, 65, 85, 0.3);
      }
      .bgs-theme-scifi .bgs-checklist-card {
        background: #f0f9ff;
        border: 2px solid #bae6fd;
      }
      .bgs-theme-scifi .bgs-checklist-title { color: #0369a1; }
      .bgs-theme-scifi .bgs-checklist-item {
        background: #ffffff;
        border: 1px solid #bae6fd;
      }
      .bgs-theme-scifi .bgs-checklist-item strong { color: #0369a1; }
      .bgs-theme-scifi .bgs-checklist-item p { color: #0f172a; }
      .bgs-theme-scifi .bgs-hardware-notice {
        background: #fff7ed;
        border: 1.5px dashed #ea580c;
        color: #9a3412;
      }

      /* ==========================================================================
         🎨 2. PIXEL 主題 (復古金屬街機白 · 明亮高對比版)
         ========================================================================== */
      .bgs-theme-pixel {
        background: #ffffff;
        border: 3px solid #d97706;
        border-radius: 20px;
        box-shadow: 0 20px 45px -10px rgba(217, 119, 6, 0.22), 0 0 0 1px rgba(217, 119, 6, 0.1);
      }
      .bgs-theme-pixel .bgs-title {
        color: #92400e;
        text-shadow: none;
        letter-spacing: 0.05em;
        font-weight: 900;
      }
      .bgs-theme-pixel .bgs-subtitle { color: #78350f; font-weight: 600; }
      .bgs-theme-pixel .bgs-label { color: #451a03; font-weight: 700; }
      .bgs-theme-pixel .bgs-input, .bgs-theme-pixel .bgs-select {
        background: #fffbeb;
        border: 2px solid #fcd34d;
        color: #451a03;
        font-weight: 600;
      }
      .bgs-theme-pixel .bgs-input:focus, .bgs-theme-pixel .bgs-select:focus {
        border-color: #d97706;
        box-shadow: 0 0 10px rgba(217, 119, 6, 0.3);
      }
      .bgs-theme-pixel .bgs-theme-tag {
        background: #fef3c7;
        border: 1.5px solid #d97706;
        color: #92400e;
        font-weight: 800;
      }
      .bgs-theme-pixel .bgs-unit-badge {
        background: #fffbeb;
        border: 2px solid #d97706;
        color: #92400e;
        font-weight: 800;
      }
      .bgs-theme-pixel .bgs-contract-box {
        background: #fef2f2;
        border: 2px dashed #ef4444;
      }
      .bgs-theme-pixel .bgs-contract-title { color: #b91c1c; font-weight: 800; }
      .bgs-theme-pixel .bgs-contract-item { color: #991b1b; }
      .bgs-theme-pixel .bgs-btn-primary {
        background: linear-gradient(135deg, #e11d48, #be123c);
        color: #ffffff;
        box-shadow: 0 4px 14px rgba(225, 29, 72, 0.35);
      }
      .bgs-theme-pixel .bgs-btn-primary:hover {
        background: linear-gradient(135deg, #be123c, #9f1239);
      }
      .bgs-theme-pixel .bgs-badge-success {
        background: #ecfdf5;
        border: 2px solid #10b981;
        color: #047857;
      }
      .bgs-theme-pixel .bgs-btn-stage2-extra {
        background: linear-gradient(135deg, #f59e0b, #d97706);
        color: #ffffff;
        box-shadow: 0 4px 14px rgba(217, 119, 6, 0.3);
      }
      .bgs-theme-pixel .bgs-btn-stage2-return {
        background: linear-gradient(135deg, #475569, #334155);
        color: #ffffff;
        box-shadow: 0 4px 14px rgba(51, 65, 85, 0.3);
      }
      .bgs-theme-pixel .bgs-checklist-card {
        background: #fffbeb;
        border: 2px solid #f59e0b;
      }
      .bgs-theme-pixel .bgs-checklist-title {
        color: #92400e;
      }
      .bgs-theme-pixel .bgs-checklist-item {
        background: #ffffff;
        border: 1px solid #fde68a;
      }
      .bgs-theme-pixel .bgs-checklist-item strong { color: #92400e; }
      .bgs-theme-pixel .bgs-checklist-item p { color: #78350f; }
      .bgs-theme-pixel .bgs-hardware-notice {
        background: #fff7ed;
        border: 1.5px dashed #ea580c;
        color: #9a3412;
      }

      /* ==========================================================================
         🎨 3. NATURE 主題 (清新抹茶白 · 明亮高對比版)
         ========================================================================== */
      .bgs-theme-nature {
        background: #ffffff;
        border: 2.5px solid #16a34a;
        border-radius: 24px;
        box-shadow: 0 20px 45px -10px rgba(22, 163, 74, 0.2), 0 0 0 1px rgba(22, 163, 74, 0.08);
      }
      .bgs-theme-nature .bgs-title {
        color: #15803d;
        text-shadow: none;
        font-weight: 900;
      }
      .bgs-theme-nature .bgs-subtitle { color: #4b5563; font-weight: 600; }
      .bgs-theme-nature .bgs-label { color: #14532d; font-weight: 700; }
      .bgs-theme-nature .bgs-input, .bgs-theme-nature .bgs-select {
        background: #f0fdf4;
        border: 1.5px solid #86efac;
        color: #14532d;
        font-weight: 600;
      }
      .bgs-theme-nature .bgs-input:focus, .bgs-theme-nature .bgs-select:focus {
        border-color: #16a34a;
        box-shadow: 0 0 10px rgba(22, 163, 74, 0.28);
      }
      .bgs-theme-nature .bgs-theme-tag {
        background: #dcfce7;
        border: 1.5px solid #16a34a;
        color: #15803d;
        font-weight: 800;
      }
      .bgs-theme-nature .bgs-unit-badge {
        background: #f0fdf4;
        border: 1.5px solid #16a34a;
        color: #15803d;
        font-weight: 800;
      }
      .bgs-theme-nature .bgs-contract-box {
        background: #fff7ed;
        border: 1.5px dashed #ea580c;
      }
      .bgs-theme-nature .bgs-contract-title { color: #c2410c; font-weight: 800; }
      .bgs-theme-nature .bgs-contract-item { color: #9a3412; }
      .bgs-theme-nature .bgs-btn-primary {
        background: linear-gradient(135deg, #16a34a, #15803d);
        color: #ffffff;
        box-shadow: 0 4px 14px rgba(22, 163, 74, 0.32);
      }
      .bgs-theme-nature .bgs-btn-primary:hover {
        background: linear-gradient(135deg, #15803d, #14532d);
      }
      .bgs-theme-nature .bgs-badge-success {
        background: #f0fdf4;
        border: 2px solid #16a34a;
        color: #15803d;
      }
      .bgs-theme-nature .bgs-btn-stage2-extra {
        background: linear-gradient(135deg, #059669, #047857);
        color: #ffffff;
        box-shadow: 0 4px 14px rgba(5, 150, 105, 0.3);
      }
      .bgs-theme-nature .bgs-btn-stage2-return {
        background: linear-gradient(135deg, #334155, #1e293b);
        color: #ffffff;
        box-shadow: 0 4px 14px rgba(51, 65, 85, 0.3);
      }
      .bgs-theme-nature .bgs-checklist-card {
        background: #f0fdf4;
        border: 2px solid #86efac;
      }
      .bgs-theme-nature .bgs-checklist-title { color: #15803d; }
      .bgs-theme-nature .bgs-checklist-item {
        background: #ffffff;
        border: 1px solid #bbf7d0;
      }
      .bgs-theme-nature .bgs-checklist-item strong { color: #15803d; }
      .bgs-theme-nature .bgs-checklist-item p { color: #14532d; }
      .bgs-theme-nature .bgs-hardware-notice {
        background: #fff7ed;
        border: 1.5px dashed #ea580c;
        color: #9a3412;
      }

      /* ==========================================================================
         🎨 4. FANTASY 主題 (中古羊皮紙白 · 明亮高對比版)
         ========================================================================== */
      .bgs-theme-fantasy {
        background: #fefcf6;
        border: 2.5px solid #b45309;
        border-radius: 20px;
        box-shadow: 0 20px 45px -10px rgba(180, 83, 9, 0.22), 0 0 0 1px rgba(180, 83, 9, 0.1);
      }
      .bgs-theme-fantasy .bgs-title {
        color: #78350f;
        text-shadow: none;
        font-family: Georgia, "Microsoft JhengHei", serif;
        font-weight: 900;
      }
      .bgs-theme-fantasy .bgs-subtitle { color: #64748b; font-weight: 600; }
      .bgs-theme-fantasy .bgs-label { color: #451a03; font-weight: 700; }
      .bgs-theme-fantasy .bgs-input, .bgs-theme-fantasy .bgs-select {
        background: #ffffff;
        border: 1.5px solid #d4d4d8;
        color: #451a03;
        font-weight: 600;
      }
      .bgs-theme-fantasy .bgs-input:focus, .bgs-theme-fantasy .bgs-select:focus {
        border-color: #b45309;
        box-shadow: 0 0 10px rgba(180, 83, 9, 0.28);
      }
      .bgs-theme-fantasy .bgs-theme-tag {
        background: #fef3c7;
        border: 1.5px solid #b45309;
        color: #78350f;
        font-weight: 800;
      }
      .bgs-theme-fantasy .bgs-unit-badge {
        background: #fffbeb;
        border: 1.5px solid #b45309;
        color: #78350f;
        font-weight: 800;
      }
      .bgs-theme-fantasy .bgs-contract-box {
        background: #fffbeb;
        border: 1.5px dashed #b45309;
      }
      .bgs-theme-fantasy .bgs-contract-title { color: #78350f; font-weight: 800; }
      .bgs-theme-fantasy .bgs-contract-item { color: #451a03; }
      .bgs-theme-fantasy .bgs-btn-primary {
        background: linear-gradient(135deg, #b45309, #78350f);
        color: #ffffff;
        box-shadow: 0 4px 14px rgba(180, 83, 9, 0.32);
      }
      .bgs-theme-fantasy .bgs-btn-primary:hover {
        background: linear-gradient(135deg, #78350f, #451a03);
      }
      .bgs-theme-fantasy .bgs-badge-success {
        background: #fefce8;
        border: 2px solid #b45309;
        color: #78350f;
      }
      .bgs-theme-fantasy .bgs-btn-stage2-extra {
        background: linear-gradient(135deg, #d97706, #92400e);
        color: #ffffff;
        box-shadow: 0 4px 14px rgba(217, 119, 6, 0.3);
      }
      .bgs-theme-fantasy .bgs-btn-stage2-return {
        background: linear-gradient(135deg, #334155, #1e293b);
        color: #ffffff;
        box-shadow: 0 4px 14px rgba(51, 65, 85, 0.3);
      }
      .bgs-theme-fantasy .bgs-checklist-card {
        background: #fffbeb;
        border: 2px solid #d97706;
      }
      .bgs-theme-fantasy .bgs-checklist-title { color: #78350f; }
      .bgs-theme-fantasy .bgs-checklist-item {
        background: #ffffff;
        border: 1px solid #fde68a;
      }
      .bgs-theme-fantasy .bgs-checklist-item strong { color: #78350f; }
      .bgs-theme-fantasy .bgs-checklist-item p { color: #451a03; }
      .bgs-theme-fantasy .bgs-hardware-notice {
        background: #fff7ed;
        border: 1.5px dashed #ea580c;
        color: #9a3412;
      }

      /* ==========================================================================
         🎨 5. WARM 主題 (暖日和風工坊 · 明亮高對比版)
         ========================================================================== */
      .bgs-theme-warm {
        background: #faf7f2;
        border: 2.5px solid #ea580c;
        border-radius: 22px;
        box-shadow: 0 20px 45px -10px rgba(234, 88, 12, 0.2), 0 0 0 1px rgba(234, 88, 12, 0.08);
      }
      .bgs-theme-warm .bgs-title {
        color: #9a3412;
        text-shadow: none;
        font-weight: 900;
      }
      .bgs-theme-warm .bgs-subtitle { color: #64748b; font-weight: 600; }
      .bgs-theme-warm .bgs-label { color: #431407; font-weight: 700; }
      .bgs-theme-warm .bgs-input, .bgs-theme-warm .bgs-select {
        background: #ffffff;
        border: 1.5px solid #fed7aa;
        color: #431407;
        font-weight: 600;
      }
      .bgs-theme-warm .bgs-input:focus, .bgs-theme-warm .bgs-select:focus {
        border-color: #ea580c;
        box-shadow: 0 0 10px rgba(234, 88, 12, 0.28);
      }
      .bgs-theme-warm .bgs-theme-tag {
        background: #ffedd5;
        border: 1.5px solid #ea580c;
        color: #c2410c;
        font-weight: 800;
      }
      .bgs-theme-warm .bgs-unit-badge {
        background: #fff7ed;
        border: 1.5px solid #ea580c;
        color: #c2410c;
        font-weight: 800;
      }
      .bgs-theme-warm .bgs-contract-box {
        background: #fff7ed;
        border: 1.5px dashed #ea580c;
      }
      .bgs-theme-warm .bgs-contract-title { color: #c2410c; font-weight: 800; }
      .bgs-theme-warm .bgs-contract-item { color: #7c2d12; }
      .bgs-theme-warm .bgs-btn-primary {
        background: linear-gradient(135deg, #ea580c, #c2410c);
        color: #ffffff;
        box-shadow: 0 4px 14px rgba(234, 88, 12, 0.32);
      }
      .bgs-theme-warm .bgs-btn-primary:hover {
        background: linear-gradient(135deg, #c2410c, #9a3412);
      }
      .bgs-theme-warm .bgs-badge-success {
        background: #fefce8;
        border: 2px solid #ea580c;
        color: #9a3412;
      }
      .bgs-theme-warm .bgs-btn-stage2-extra {
        background: linear-gradient(135deg, #d97706, #b45309);
        color: #ffffff;
        box-shadow: 0 4px 14px rgba(217, 119, 6, 0.3);
      }
      .bgs-theme-warm .bgs-btn-stage2-return {
        background: linear-gradient(135deg, #334155, #1e293b);
        color: #ffffff;
        box-shadow: 0 4px 14px rgba(51, 65, 85, 0.3);
      }
      .bgs-theme-warm .bgs-checklist-card {
        background: #fff7ed;
        border: 2px solid #fed7aa;
      }
      .bgs-theme-warm .bgs-checklist-title { color: #9a3412; }
      .bgs-theme-warm .bgs-checklist-item {
        background: #ffffff;
        border: 1px solid #fed7aa;
      }
      .bgs-theme-warm .bgs-checklist-item strong { color: #9a3412; }
      .bgs-theme-warm .bgs-checklist-item p { color: #7c2d12; }
      .bgs-theme-warm .bgs-hardware-notice {
        background: #fff7ed;
        border: 1.5px dashed #ea580c;
        color: #9a3412;
      }
    `;
    document.head.appendChild(style);
  }

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

  // 2. 開局登入視窗 (一、開局登入介面絕對統一 · 依主題換裝)
  function showLogin(options) {
    options = options || {};
    injectSuiteStyles();
    initExitGuard();

    const theme = resolveTheme(options);
    const params = new URLSearchParams(window.location.search);
    const urlUnit = params.get('unit') || params.get('file');
    const isDispatch = !!urlUnit;

    // 大廳二或獨立專案嚴格檢測 (含本機與 GitHub Pages 網址)
    const isStandalone = !!(options.isStandalone || options.fixedUnit ||
      location.href.includes('bio-standalone-games') ||
      location.href.includes('bio-digestive-game') ||
      location.href.includes('bio-five-kingdoms-game') ||
      location.href.includes('boba-reaction-game') ||
      location.pathname.includes('digestive') ||
      location.pathname.includes('five-kingdoms') ||
      location.pathname.includes('boba') ||
      document.title.includes('消化') ||
      document.title.includes('五界') ||
      document.title.includes('珍奶') ||
      (options.gameTitle && (options.gameTitle.includes('消化') || options.gameTitle.includes('五界') || options.gameTitle.includes('珍奶'))));

    let standaloneUnitName = options.unitTitle || '';
    if (isStandalone && !standaloneUnitName) {
      const gTitle = (options.gameTitle || '').toLowerCase();
      const docTitle = (document.title || '').toLowerCase();
      const hrefStr = (location.href || '').toLowerCase();

      if (docTitle.includes('消化') || hrefStr.includes('digestive') || gTitle.includes('消化')) {
        standaloneUnitName = '專屬任務：人體消化系統冒險';
      } else if (docTitle.includes('五界') || hrefStr.includes('five-kingdoms') || hrefStr.includes('kingdom') || gTitle.includes('五界')) {
        standaloneUnitName = '專屬任務：五界生物分類研究';
      } else if (docTitle.includes('珍奶') || hrefStr.includes('boba') || gTitle.includes('珍奶')) {
        standaloneUnitName = '專屬任務：神經刺激與反應時間實驗';
      } else {
        standaloneUnitName = '專屬任務：課堂生物探索';
      }
    }

    const unitTitle = isStandalone ? standaloneUnitName : (options.unitTitle || (isDispatch ? `課堂指定單元 (${urlUnit})` : '[7上] 1-1 生命現象'));

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
      <div class="bgs-card bgs-theme-${theme.id}">
        <div style="text-align:center; margin-bottom:8px;">
          <span class="bgs-theme-tag" style="display:inline-flex; align-items:center; gap:6px; font-size:0.75rem; font-weight:800; padding:4px 12px; border-radius:999px;">
            ${theme.icon} ${theme.name}
          </span>
        </div>
        <h2 class="bgs-title">${theme.icon} ${options.gameTitle || '課堂生物挑戰'}</h2>
        <p class="bgs-subtitle">${theme.subtitle}</p>

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

        ${isStandalone ? `
          <div class="bgs-form-group">
            <label class="bgs-label">挑戰主題</label>
            <div class="bgs-unit-badge">
              <span>🎯</span>
              <span>${standaloneUnitName}</span>
            </div>
          </div>
        ` : (options.hideUnit ? '' : (isDispatch ? `
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
        `))}

        <button type="button" class="bgs-btn bgs-btn-primary" id="bgsBtnNext">${theme.loginBtnText || '下一步：核對身分與公約 ➜'}</button>
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

      const chosenUnit = isStandalone ? 'standalone_fixed' : (isDispatch ? urlUnit : (overlay.querySelector('#bgsUnitSelect')?.value || 'unit01_scientific_method'));
      const chosenUnitTitle = isStandalone ? standaloneUnitName : (isDispatch ? unitTitle : (overlay.querySelector('#bgsUnitSelect')?.selectedOptions[0]?.text || unitTitle));

      currentStudent = {
        class: cls,
        seat: seat,
        name: name,
        unit: chosenUnit,
        unitTitle: chosenUnitTitle,
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

  // 3. 二次核對＋誠信公約 (依主題換裝)
  function showConfirmModal(options) {
    const theme = resolveTheme(options);
    const overlay = document.createElement('div');
    overlay.className = 'bgs-overlay';
    overlay.id = 'bgsConfirmOverlay';

    overlay.innerHTML = `
      <div class="bgs-card bgs-theme-${theme.id}">
        <div style="text-align:center; margin-bottom:8px;">
          <span class="bgs-theme-tag" style="display:inline-flex; align-items:center; gap:6px; font-size:0.75rem; font-weight:800; padding:4px 12px; border-radius:999px;">
            ${theme.icon} ${theme.name}
          </span>
        </div>
        <h2 class="bgs-title">👤 請核對挑戰身分</h2>
        <p class="bgs-subtitle">${theme.confirmSubtitle}</p>

        <div style="background:${theme.badgeBg}; border:1.5px solid ${theme.cardBorder}; border-radius:14px; padding:12px; text-align:center; margin-bottom:14px;">
          <div style="font-size:0.85rem; color:#64748b; font-weight:700;">登錄身分確認</div>
          <div style="font-size:1.45rem; font-weight:900; color:${theme.accentColor}; margin:4px 0;">
            ${currentStudent.class} 班級　${currentStudent.seat} 座號
          </div>
          <div style="font-size:1.15rem; font-weight:800; color:#0f172a;">
            姓名：${currentStudent.name}
          </div>
          ${options.hideUnit ? '' : `
            <div style="font-size:0.82rem; color:${theme.accentColor}; margin-top:4px;">
              📚 挑戰主題：${currentStudent.unitTitle || '專屬任務'}
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
          ${theme.startBtnText || '🚀 我已核對身分並遵守公約，開始出擊！'}
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

  // 4. 結算畫面三階段流暢體驗（依主題換裝）
  function showResult(options) {
    options = options || {};
    injectSuiteStyles();

    // 解析學生資訊
    const prof = resolveStudentProfile(options);
    currentStudent.class = prof.class;
    currentStudent.seat = prof.seat;
    currentStudent.name = prof.name;

    // 若姓名仍為空，先彈出身分補填視窗
    if (!currentStudent.name) {
      promptIdentityBeforeResult(options);
      return;
    }

    renderThreeStageResult(options);
  }

  // 若開局未抓到姓名的補填彈窗
  function promptIdentityBeforeResult(options) {
    const theme = resolveTheme(options);
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
      <div class="bgs-card bgs-theme-${theme.id}">
        <div style="text-align:center; margin-bottom:8px;">
          <span class="bgs-theme-tag" style="display:inline-flex; align-items:center; gap:6px; font-size:0.75rem; font-weight:800; padding:4px 12px; border-radius:999px;">
            ${theme.icon} ${theme.name}
          </span>
        </div>
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
    const theme = resolveTheme(options);
    const overlay = document.createElement('div');
    overlay.className = 'bgs-overlay';
    overlay.id = 'bgsResultOverlay';

    const score = options.score !== undefined ? options.score : 100;
    const scoreDisplay = options.scoreDisplay || `${score} 分`;
    const duration = options.duration || '--:--';
    const gasUrl = options.gasUrl || DEFAULT_GAS_URL;

    overlay.innerHTML = `
      <div class="bgs-card bgs-theme-${theme.id}" id="bgsResultCard">
        <div style="text-align:center; margin-bottom:8px;">
          <span class="bgs-theme-tag" style="display:inline-flex; align-items:center; gap:6px; font-size:0.75rem; font-weight:800; padding:4px 12px; border-radius:999px;">
            ${theme.icon} ${theme.name}
          </span>
        </div>
        <h2 class="bgs-title">${theme.settleTitle}</h2>
        <p class="bgs-subtitle">${options.gameTitle || '課堂生物挑戰'}</p>

        <div style="background:${theme.badgeBg}; border:1.5px solid ${theme.cardBorder}; border-radius:14px; padding:12px; text-align:center; margin-bottom:14px;">
          <div style="font-size:0.85rem; color:#475569; font-weight:700;">
            選手：${currentStudent.class} - ${currentStudent.seat} ${currentStudent.name}
          </div>
          <div style="font-size:1.9rem; font-weight:900; color:${theme.accentColor}; margin:4px 0;">
            ${scoreDisplay}
          </div>
          <div style="font-size:0.82rem; color:#64748b; font-weight:600;">⏱️ 耗時：${duration}</div>
        </div>

        <!-- 🔹 階段一：自動送出 ＋ 絕對鎖死狀態容器 -->
        <div id="bgsStage1Box">
          <button type="button" class="bgs-btn bgs-btn-locked" id="bgsStatusBtn" disabled>
            📡 成績傳送中，請稍候... (請勿連點)
          </button>
        </div>

        <!-- 🔹 階段二：雙軌選擇 (學霸加碼 vs 提前交卷) 動態展開區 -->
        <div id="bgsStage2Box" style="display:none; animation: bgsFadeDown 0.35s ease;">
          <div style="margin: 16px 0 10px; border-top: 1px dashed rgba(0,0,0,0.12);"></div>
          <div style="font-size:0.85rem; color:#475569; font-weight:700; text-align:center; margin-bottom:8px;">
            請選擇下一步行動：
          </div>
          <button type="button" class="bgs-btn bgs-btn-stage2-extra" id="bgsBtnExtra">
            🚀 🔥 菁英加碼挑戰 10 題 (爭取滿分王者)
          </button>
          <button type="button" class="bgs-btn bgs-btn-stage2-return" id="bgsBtnReturnTablet">
            📱 挑戰完成，準備交回平板充電車 ➔
          </button>
        </div>

        <!-- 🔹 階段三：平板交回 4 大自我檢查守則 (防跑班資安/硬體維護) -->
        <div id="bgsStage3Box" style="display:none; animation: bgsFadeDown 0.35s ease;">
          <div class="bgs-checklist-card">
            <div class="bgs-checklist-title">
              <span>📋</span>
              <span>平板交回充電車前 · 4 大自我檢查守則</span>
            </div>
            
            <div class="bgs-checklist-item">
              <strong>1. ⏰ 關閉個人鬧鐘與計時器</strong>
              <p>請檢查時鐘 App，務必關閉所有自設鬧鐘，嚴禁干擾下一班上課！</p>
            </div>

            <div class="bgs-checklist-item">
              <strong>2. 🖼️ 清理相簿與個人快照</strong>
              <p>嚴禁拍攝自拍、同學照片或下載無關圖片，如有拍攝請立即刪除。</p>
            </div>

            <div class="bgs-checklist-item">
              <strong>3. 🚫 嚴禁開啟非教學 App</strong>
              <p>背景請滑掉所有非課堂網頁與遊戲，保持載具乾淨。</p>
            </div>

            <div class="bgs-checklist-item">
              <strong>4. 🔌 充電座號歸位與插線</strong>
              <p>確認平板【充電孔朝外】，放回對應座號槽，並確實插妥充電線！</p>
            </div>

            <div class="bgs-hardware-notice">
              ⚠️ 請同組組長落實互檢，若發現充電線未插妥將扣組別課堂表現分！
            </div>
          </div>

          <button type="button" class="bgs-btn bgs-btn-primary" id="bgsBtnLockAndReset">
            🔒 我已完成 4 大檢核，安全交機鎖定！
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const stage1Box = overlay.querySelector('#bgsStage1Box');
    const stage2Box = overlay.querySelector('#bgsStage2Box');
    const stage3Box = overlay.querySelector('#bgsStage3Box');
    const statusBtn = overlay.querySelector('#bgsStatusBtn');
    const btnExtra = overlay.querySelector('#bgsBtnExtra');
    const btnReturnTablet = overlay.querySelector('#bgsBtnReturnTablet');
    const btnLockAndReset = overlay.querySelector('#bgsBtnLockAndReset');

    // 階段一：背景自動提交至 GAS
    const payload = {
      action: 'submitScore',
      class: currentStudent.class,
      className: currentStudent.class,
      seat: currentStudent.seat,
      name: currentStudent.name,
      studentName: currentStudent.name,
      gameTitle: options.gameTitle || '課堂生物挑戰',
      gameId: options.gameId || location.pathname.split('/').filter(Boolean).pop() || 'biogame',
      score: score,
      duration: duration,
      accuracy: options.accuracy || '--',
      unit: currentStudent.unit || 'general',
      unitTitle: currentStudent.unitTitle || '',
      timestamp: new Date().toISOString()
    };

    // 10 秒防灌水去重檢查
    const lastSubKey = `bgs_last_sub_${payload.class}_${payload.seat}_${payload.gameTitle}`;
    const lastSubTime = Number(localStorage.getItem(lastSubKey) || 0);
    const nowTime = Date.now();

    function proceedToStage2(isDuplicate) {
      isScoreSubmitted = true;
      disableExitGuard();

      // 階段一按鈕永久變身為「大綠勾登錄成功徽章」
      stage1Box.innerHTML = `
        <div class="bgs-badge-success">
          🎉 ✅ 挑戰紀錄已永久登錄試算表！${isDuplicate ? ' (已同步最新成績)' : ''}
        </div>
      `;

      // 觸發自定義結算完成事件
      window.dispatchEvent(new CustomEvent('biogame:submitted', { detail: payload }));

      // 動態淡入展開【階段二：雙軌選擇】
      setTimeout(() => {
        stage2Box.style.display = 'block';
      }, 350);
    }

    if (nowTime - lastSubTime < 10000) {
      // 10秒內重複提交，直接顯示成功徽章
      setTimeout(() => {
        proceedToStage2(true);
      }, 500);
    } else {
      localStorage.setItem(lastSubKey, String(nowTime));

      fetch(gasUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload)
      })
      .then(res => res.json().catch(() => ({ status: 'success' })))
      .then(() => {
        proceedToStage2(false);
      })
      .catch(err => {
        console.warn('GAS POST 失敗，切換至 Beacon / Image 回退方案:', err);
        try {
          if (navigator.sendBeacon) {
            navigator.sendBeacon(gasUrl, JSON.stringify(payload));
          }
        } catch (_) {}
        proceedToStage2(false);
      });
    }

    // 🔹 階段二雙軌按鈕控制
    btnExtra.addEventListener('click', () => {
      overlay.remove();
      if (typeof options.onRetry === 'function') {
        options.onRetry();
      } else {
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
        <div class="bgs-card bgs-theme-${theme.id}" style="text-align:center; padding:32px 20px;">
          <div style="font-size:3.5rem; margin-bottom:12px;">🔒</div>
          <h2 style="color:${theme.accentColor}; font-size:1.4rem; margin-bottom:8px;">載具已安全鎖定</h2>
          <p style="color:#475569; font-size:0.92rem; line-height:1.6; margin-bottom:20px;">
            上一班挑戰紀錄已安全抹除！<br>
            請依座號將平板放回充電車，<strong>充電口朝外</strong>並插妥充電線。
          </p>
          <button type="button" class="bgs-btn bgs-btn-primary" onclick="location.reload()">
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
                           location.href.includes('bio-digestive-game') ||
                           location.href.includes('bio-five-kingdoms-game') ||
                           location.href.includes('人體消化') || 
                           location.href.includes('五界');

      showLogin({
        gameTitle: cleanTitle,
        hideUnit: false, // 獨立遊戲套用 Option B 鎖定專屬徽章
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
    syncStudentToDom: syncStudentToDom,
    resolveTheme: resolveTheme,
    THEME_CONFIGS: THEME_CONFIGS
  };

  global.showScoreSubmitModal = function (options) {
    showResult(options || {});
  };

})(window);
