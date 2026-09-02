/**
 * market.js (Fixed Version)
 * ------------------------------------------------------------
 * 종목 자동완성 DB 및 경제 캘린더 이벤트 관리 (랜덤 시세 변동 제거)
 * ------------------------------------------------------------
 */

const MarketAPI = (() => {
  let sampleDataCache = null;

  const BACKUP_SYMBOL_DATABASE = [
    { name: "삼성전자", symbol: "005930", type: "KR_STOCK", currency: "KRW" },
    { name: "SK하이닉스", symbol: "000660", type: "KR_STOCK", currency: "KRW" },
    { name: "LG에너지솔루션", symbol: "373220", type: "KR_STOCK", currency: "KRW" },
    { name: "현대자동차", symbol: "005380", type: "KR_STOCK", currency: "KRW" },
    { name: "기아", symbol: "000270", type: "KR_STOCK", currency: "KRW" },
    { name: "NAVER", symbol: "035420", type: "KR_STOCK", currency: "KRW" },
    { name: "카카오", symbol: "035720", type: "KR_STOCK", currency: "KRW" },
    { name: "Apple", symbol: "AAPL", type: "US_STOCK", currency: "USD" },
    { name: "NVIDIA", symbol: "NVDA", type: "US_STOCK", currency: "USD" },
    { name: "Microsoft", symbol: "MSFT", type: "US_STOCK", currency: "USD" },
    { name: "Tesla", symbol: "TSLA", type: "US_STOCK", currency: "USD" },
    { name: "Vanguard S&P 500 ETF", symbol: "VOO", type: "ETF", currency: "USD" },
    { name: "KODEX 미국S&P500", symbol: "379800", type: "ETF", currency: "KRW" }
  ];

  async function loadSampleData() {
    if (sampleDataCache) return sampleDataCache;
    try {
      const res = await fetch("data/sample-data.json");
      if (!res.ok) throw new Error("샘플 데이터 로드 실패");
      sampleDataCache = await res.json();
      return sampleDataCache;
    } catch (e) {
      console.warn("sample-data.json 로드 오류, 기본 대체 데이터 사용:", e);
      return {
        meta: {
          baseCurrency: "KRW",
          lastUpdated: new Date().toISOString(),
          exchangeRate: { USDKRW: 1385.5, updatedAt: new Date().toISOString() },
          goalAmount: 100000000
        },
        holdings: [],
        history: [],
        marketEvents: []
      };
    }
  }

  async function searchTicker(keyword) {
    const query = keyword.toLowerCase();
    const found = BACKUP_SYMBOL_DATABASE.find(
      item => item.name.toLowerCase().includes(query) || item.symbol.toLowerCase() === query
    );
    if (found) return found;
    return null;
  }

  function getEconomicEvents() {
    try {
      const saved = localStorage.getItem("custom_economic_events");
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error("일정 불러오기 실패:", e);
    }
    return [
      { id: "ev-001", date: "2026-09-05", title: "미국 8월 고용보고서 발표", importance: "HIGH" },
      { id: "ev-002", date: "2026-09-12", title: "미국 8월 CPI 발표", importance: "HIGH" },
      { id: "ev-003", date: "2026-09-18", title: "FOMC 기준금리 발표", importance: "HIGH" }
    ];
  }

  function addEconomicEvent(ev) {
    try {
      const events = getEconomicEvents();
      events.push(ev);
      localStorage.setItem("custom_economic_events", JSON.stringify(events));
      return true;
    } catch (e) {
      console.error("일정 저장 실패:", e);
      return false;
    }
  }

  function deleteEconomicEvent(id) {
    try {
      let events = getEconomicEvents();
      events = events.filter((ev) => ev.id !== id);
      localStorage.setItem("custom_economic_events", JSON.stringify(events));
      return true;
    } catch (e) {
      console.error("일정 삭제 실패:", e);
      return false;
    }
  }

  return {
    loadSampleData,
    searchTicker,
    getEconomicEvents,
    addEconomicEvent,
    deleteEconomicEvent
  };
})();
