/**
 * assets.js (Updated Version)
 * ------------------------------------------------------------
 * 월별 1일 데이터 단일 기록 보장 및 히스토리 중복 제거
 * ------------------------------------------------------------
 */

const StorageAdapter = (() => {
  const STORAGE_KEY = "myasset.portfolio.v1";
  const THEME_KEY = "myasset.theme";

  function save(portfolio) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(portfolio));
      return true;
    } catch (err) {
      console.error("[StorageAdapter] 저장 실패:", err);
      return false;
    }
  }

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (err) {
      console.error("[StorageAdapter] 불러오기 실패:", err);
      return null;
    }
  }

  function remove() {
    localStorage.removeItem(STORAGE_KEY);
  }

  function saveTheme(theme) {
    localStorage.setItem(THEME_KEY, theme);
  }

  function loadTheme() {
    return localStorage.getItem(THEME_KEY);
  }

  return { save, load, remove, saveTheme, loadTheme };
})();

const ASSET_TYPES = {
  CASH:     { label: "현금",     chartColor: "#6ee7d0" },
  KR_STOCK: { label: "국내 주식", chartColor: "#ef4a4f" },
  US_STOCK: { label: "미국 주식", chartColor: "#c9a227" },
  ETF:      { label: "ETF",      chartColor: "#4a8ff0" },
  GOLD:     { label: "금",       chartColor: "#e0b84a" },
  PENSION:  { label: "연금저축", chartColor: "#9b8cf0" },
  CRYPTO:   { label: "가상자산", chartColor: "#f0914a" },
  OTHER:    { label: "기타",     chartColor: "#7c8794" }
};

const PortfolioStore = (() => {
  let state = {
    meta: {
      baseCurrency: "KRW",
      lastUpdated: null,
      exchangeRate: { USDKRW: 1385.5, updatedAt: null },
      goalAmount: 0
    },
    holdings: [],
    history: []
  };

  function get() {
    return state;
  }

  function set(newState) {
    state = newState;
    persist();
  }

  async function init() {
    const saved = StorageAdapter.load();
    if (saved && saved.meta) {
      state = saved;
      if (!Array.isArray(state.holdings)) {
        state.holdings = [];
      }
      if (!Array.isArray(state.history)) {
        state.history = [];
      }
      if (typeof state.meta.goalAmount !== "number") {
        state.meta.goalAmount = 0;
      }
    } else {
      const sample = await MarketAPI.loadSampleData();
      state = {
        meta: { goalAmount: 0, ...sample.meta },
        holdings: sample.holdings || [],
        history: sample.history || []
      };
      StorageAdapter.save(state);
    }
    
    checkAndRecordMonthlyHistory();
    return state;
  }

  function persist() {
    state.meta.lastUpdated = new Date().toISOString();
    StorageAdapter.save(state);
  }

  // 매월 1일 자산 기록 및 월 단위 1개 데이터로 정제
  function checkAndRecordMonthlyHistory() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const currentMonthKey = `${year}-${month}`;
    const firstDayStr = `${currentMonthKey}-01`;

    const usdKrw = state.meta.exchangeRate.USDKRW || 1385.5;
    const summary = AssetCalculator.calculateSummary(state.holdings, usdKrw);
    const currentTotal = summary.totalAsset;

    if (!Array.isArray(state.history)) {
      state.history = [];
    }

    // 동일 월(YYYY-MM) 데이터 존재 시 갱신, 없으면 추가
    const existingIdx = state.history.findIndex(h => h.date && h.date.startsWith(currentMonthKey));
    if (existingIdx !== -1) {
      state.history[existingIdx] = { date: firstDayStr, totalAsset: currentTotal };
    } else {
      state.history.push({ date: firstDayStr, totalAsset: currentTotal });
    }
    
    // 월 단위 중복 제거 및 정렬
    const uniqueMap = new Map();
    state.history.forEach(h => {
      const monthKey = h.date ? h.date.substring(0, 7) : "";
      if (monthKey && h.totalAsset >= 0) {
        uniqueMap.set(monthKey, { date: `${monthKey}-01`, totalAsset: h.totalAsset });
      }
    });

    state.history = Array.from(uniqueMap.values()).sort((a, b) => new Date(a.date) - new Date(b.date));
    persist();
  }

  function addHolding(holding) {
    const newHolding = { id: "h-" + Date.now().toString(36), ...holding };
    state.holdings.push(newHolding);
    checkAndRecordMonthlyHistory();
    return newHolding;
  }

  function updateHolding(id, patch) {
    const idx = state.holdings.findIndex((h) => h.id === id);
    if (idx === -1) return false;
    state.holdings[idx] = { ...state.holdings[idx], ...patch };
    checkAndRecordMonthlyHistory();
    return true;
  }

  function deleteHolding(id) {
    const before = state.holdings.length;
    state.holdings = state.holdings.filter((h) => h.id !== id);
    checkAndRecordMonthlyHistory();
    return state.holdings.length < before;
  }

  function getHolding(id) {
    return state.holdings.find((h) => h.id === id);
  }

  function setGoalAmount(amount) {
    state.meta.goalAmount = amount;
    persist();
  }

  function updateExchangeRate(rate) {
    state.meta.exchangeRate.USDKRW = rate;
    state.meta.exchangeRate.updatedAt = new Date().toISOString();
    checkAndRecordMonthlyHistory();
    persist();
  }

  return {
    get, set, init, persist,
    addHolding, updateHolding, deleteHolding, getHolding,
    setGoalAmount, updateExchangeRate, checkAndRecordMonthlyHistory
  };
})();

const AssetCalculator = (() => {

  function calculateHoldingEvaluation(holding, usdKrw) {
    const qty = Number(holding.quantity) || 0;
    const currentPrice = Number(holding.currentPrice) ?? Number(holding.avgBuyPrice) ?? 0;
    const currency = holding.currency || "KRW";

    let val = qty * currentPrice;
    if (currency === "USD") {
      val *= usdKrw;
    }
    return val;
  }

  function calculateSummary(holdings, usdKrw) {
    let totalAsset = 0;
    let investmentAsset = 0;
    let cashAsset = 0;

    const cashTypes = ["CASH"];

    holdings.forEach((item) => {
      const evalVal = calculateHoldingEvaluation(item, usdKrw);
      totalAsset += evalVal;

      if (cashTypes.includes(item.type)) {
        cashAsset += evalVal;
      } else {
        investmentAsset += evalVal;
      }
    });

    return {
      totalAsset,
      investmentAsset,
      cashAsset,
      monthlyReturn: 0,
      dailyChange: { amount: 0, rate: 0 }
    };
  }

  function calculateAllocation(holdings, usdKrw) {
    const map = {};
    let total = 0;

    holdings.forEach((item) => {
      const evalVal = calculateHoldingEvaluation(item, usdKrw);
      total += evalVal;

      const typeKey = item.type;
      if (!map[typeKey]) {
        map[typeKey] = 0;
      }
      map[typeKey] += evalVal;
    });

    const result = [];
    for (const [typeKey, amount] of Object.entries(map)) {
      const percentage = total > 0 ? (amount / total) * 100 : 0;
      const typeMeta = ASSET_TYPES[typeKey] || { label: typeKey, chartColor: "#7c8794" };
      result.push({
        type: typeKey,
        label: typeMeta.label,
        amount,
        percentage,
        color: typeMeta.chartColor
      });
    }

    result.sort((a, b) => b.amount - a.amount);
    return { total, items: result };
  }

  function filterHistoryByPeriod(history, period) {
    if (!Array.isArray(history) || history.length === 0) return [];

    const now = new Date();
    let cutoff = new Date(now);

    if (period === "1M") {
      cutoff.setMonth(cutoff.getMonth() - 1);
    } else if (period === "3M") {
      cutoff.setMonth(cutoff.getMonth() - 3);
    } else if (period === "6M") {
      cutoff.setMonth(cutoff.getMonth() - 6);
    } else if (period === "1Y") {
      cutoff.setFullYear(cutoff.getFullYear() - 1);
    } else {
      return history;
    }

    return history.filter(item => new Date(item.date) >= cutoff);
  }

  function calculatePeriodReturn(filteredHistory) {
    if (!Array.isArray(filteredHistory) || filteredHistory.length < 2) {
      return { amount: 0, rate: 0 };
    }
    const first = filteredHistory[0].totalAsset;
    const last = filteredHistory[filteredHistory.length - 1].totalAsset;
    const amount = last - first;
    const rate = first > 0 ? (amount / first) * 100 : 0;
    return { amount, rate };
  }

  return {
    calculateHoldingEvaluation,
    calculateSummary,
    calculateAllocation,
    filterHistoryByPeriod,
    calculatePeriodReturn
  };
})();
