/**
 * app.js (Fixed Version)
 * ------------------------------------------------------------
 * 앱 초기화 + 전체 렌더링 오케스트레이션 및 환율 동기화
 * ------------------------------------------------------------
 */

const App = (() => {

  let currentPeriod = "ALL";
  let customRange = null;

  function formatKRW(amount) {
    const rounded = Math.round(amount);
    return (rounded < 0 ? "-₩" : "₩") + Math.abs(rounded).toLocaleString("ko-KR");
  }

  function formatUSD(amount) {
    return "$" + Number(amount).toLocaleString("en-US", { maximumFractionDigits: 2 });
  }

  function formatSigned(amount, formatter) {
    const sign = amount > 0 ? "+" : "";
    return sign + formatter(amount);
  }

  function formatRate(rate) {
    const sign = rate > 0 ? "+" : "";
    return `${sign}${rate.toFixed(2)}%`;
  }

  function changeClass(value) {
    if (value > 0) return "value-rise";
    if (value < 0) return "value-fall";
    return "value-neutral";
  }

  function renderSummary() {
    const { holdings, history, meta } = PortfolioStore.get();
    const usdKrw = meta.exchangeRate.USDKRW;
    const summary = AssetCalculator.calculateSummary(holdings, usdKrw);

    document.getElementById("totalAssetValue").textContent = formatKRW(summary.totalAsset);

    const changeEl = document.getElementById("totalAssetChange");
    changeEl.innerHTML = `
      <span class="change-label">오늘</span>
      <span class="value-neutral">매월 1일 기준 자산 관리</span>
    `;

    document.getElementById("investmentAssetValue").textContent = formatKRW(summary.investmentAsset);
    document.getElementById("cashAssetValue").textContent = formatKRW(summary.cashAsset);

    const monthlyEl = document.getElementById("monthlyReturnValue");
    monthlyEl.textContent = formatRate(summary.monthlyReturn);
    monthlyEl.className = "card-value " + changeClass(summary.monthlyReturn);
  }

  function renderChart() {
    const { history, holdings, meta } = PortfolioStore.get();
    const usdKrw = meta.exchangeRate.USDKRW;

    const summary = AssetCalculator.calculateSummary(holdings, usdKrw);
    const currentInvestmentTotal = summary.investmentAsset;

    document.getElementById("chartCurrentValue").textContent = formatKRW(currentInvestmentTotal);

    let rawHistory = history || [];
    let filtered = AssetCalculator.filterHistoryByPeriod(rawHistory, currentPeriod, customRange);

    const periodReturn = AssetCalculator.calculatePeriodReturn(filtered);
    const returnEl = document.getElementById("chartPeriodReturn");
    const arrow = periodReturn.amount > 0 ? "▲" : periodReturn.amount < 0 ? "▼" : "";
    returnEl.innerHTML = `<span class="${changeClass(periodReturn.amount)}">${arrow} ${formatSigned(periodReturn.amount, formatKRW)} (${formatRate(periodReturn.rate)})</span>`;

    const lineCanvas = document.getElementById("assetLineChart");
    DashboardChart.renderLineChart(lineCanvas, filtered);
  }

  function renderAllocation() {
    const { holdings, meta } = PortfolioStore.get();
    const usdKrw = meta.exchangeRate.USDKRW;
    const allocation = AssetCalculator.calculateAllocation(holdings, usdKrw);

    const canvas = document.getElementById("allocationChart");
    const legendEl = document.getElementById("allocationLegend");

    DashboardChart.renderAllocationChart(canvas, legendEl, allocation, formatKRW);
  }

  function renderHoldingsTable() {
    const { holdings, meta } = PortfolioStore.get();
    const usdKrw = meta.exchangeRate.USDKRW;
    const tbody = document.getElementById("holdingsTableBody");
    const mobileList = document.getElementById("holdingsListMobile");

    if (!tbody) return;
    tbody.innerHTML = "";
    if (mobileList) mobileList.innerHTML = "";

    if (holdings.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; color:var(--color-text-secondary); padding: 30px;">등록된 자산이 없습니다.</td></tr>`;
      if (mobileList) {
        mobileList.innerHTML = `<div style="text-align:center; color:var(--color-text-secondary); padding: 20px;">등록된 자산이 없습니다.</div>`;
      }
      return;
    }

    holdings.forEach((item) => {
      const currentPrice = item.currentPrice ?? item.avgBuyPrice;
      const evalVal = AssetCalculator.calculateHoldingEvaluation(item, usdKrw);
      const profitRate = item.avgBuyPrice > 0 ? ((currentPrice - item.avgBuyPrice) / item.avgBuyPrice) * 100 : 0;
      const profitAmount = evalVal - (item.currency === "USD" ? item.quantity * item.avgBuyPrice * usdKrw : item.quantity * item.avgBuyPrice);

      const typeMeta = ASSET_TYPES[item.type] || { label: item.type, chartColor: "#7c8794" };

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>
          <div class="holding-name-cell">
            <strong>${item.name}</strong>
            <span class="holding-symbol">${item.symbol || "-"}</span>
          </div>
        </td>
        <td><span class="type-badge ${item.type}">${typeMeta.label}</span></td>
        <td>${item.quantity.toLocaleString()}</td>
        <td>${item.currency === "USD" ? formatUSD(item.avgBuyPrice) : formatKRW(item.avgBuyPrice)}</td>
        <td>${item.currency === "USD" ? formatUSD(currentPrice) : formatKRW(currentPrice)}</td>
        <td><strong>${formatKRW(evalVal)}</strong></td>
        <td class="${changeClass(profitRate)}">
          ${formatRate(profitRate)}<br/>
          <span style="font-size:11px;">(${formatSigned(profitAmount, formatKRW)})</span>
        </td>
        <td>
          <button type="button" class="btn-sm btn-edit-asset" data-id="${item.id}">수정</button>
        </td>
      `;
      tbody.appendChild(tr);

      if (mobileList) {
        const mCard = document.createElement("div");
        mCard.className = "holding-mobile-card";
        mCard.innerHTML = `
          <div style="display:flex; justify-content:space-between; align-items:flex-start;">
            <div>
              <strong>${item.name}</strong>
              <div style="font-size:11.5px; color:var(--color-text-tertiary);">${item.symbol || ""}</div>
            </div>
            <span class="type-badge ${item.type}">${typeMeta.label}</span>
          </div>
          <div style="display:flex; justify-content:space-between; font-size:13px; margin-top:4px;">
            <span style="color:var(--color-text-secondary);">평가금액: <strong>${formatKRW(evalVal)}</strong></span>
            <span class="${changeClass(profitRate)}">수익률 ${formatRate(profitRate)}</span>
          </div>
          <div style="display:flex; justify-content:flex-end; margin-top:6px;">
            <button type="button" class="btn-sm btn-edit-asset" data-id="${item.id}">수정</button>
          </div>
        `;
        mobileList.appendChild(mCard);
      }
    });
  }

  function renderExchangeRate() {
    const { meta } = PortfolioStore.get();
    const headerExchangeRateInput = document.getElementById("headerExchangeRate");
    if (headerExchangeRateInput && document.activeElement !== headerExchangeRateInput) {
      headerExchangeRateInput.value = meta.exchangeRate.USDKRW;
    }
  }

  function renderHeader() {
    const todayEl = document.getElementById("todayDate");
    if (todayEl) {
      const now = new Date();
      const options = { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' };
      todayEl.textContent = now.toLocaleDateString('ko-KR', options);
    }
  }

  function renderGoal() {
    const { holdings, meta } = PortfolioStore.get();
    const usdKrw = meta.exchangeRate.USDKRW;
    const summary = AssetCalculator.calculateSummary(holdings, usdKrw);
    const totalAsset = summary.totalAsset;
    const goalAmount = meta.goalAmount || 0;

    const goalStatusText = document.getElementById("goalStatusText");
    const goalAmountText = document.getElementById("goalAmountText");
    const goalProgressBar = document.getElementById("goalProgressBar");
    const goalAmountInput = document.getElementById("goalAmountInput");

    if (goalAmountInput && document.activeElement !== goalAmountInput) {
      goalAmountInput.value = goalAmount > 0 ? goalAmount : "";
    }

    if (goalAmount <= 0) {
      if (goalStatusText) goalStatusText.textContent = "진행률: 목표 미설정";
      if (goalAmountText) goalAmountText.textContent = `${formatKRW(totalAsset)} / 미설정`;
      if (goalProgressBar) goalProgressBar.style.width = "0%";
      return;
    }

    const rate = Math.min(100, (totalAsset / goalAmount) * 100);
    if (goalStatusText) goalStatusText.textContent = `진행률: ${rate.toFixed(1)}%`;
    if (goalAmountText) goalAmountText.textContent = `${formatKRW(totalAsset)} / ${formatKRW(goalAmount)}`;
    if (goalProgressBar) goalProgressBar.style.width = `${rate}%`;
  }

  function refreshAll() {
    renderHeader();
    renderExchangeRate();
    renderSummary();
    renderChart();
    renderAllocation();
    renderHoldingsTable();
    renderGoal();
    if (typeof DashboardEvents !== "undefined" && DashboardEvents.renderMarketEvents) {
      DashboardEvents.renderMarketEvents();
    }
  }

  function setPeriod(period) {
    currentPeriod = period;
    customRange = null;
    renderChart();
  }

  async function refreshMarketData() {
    const btnRefresh = document.getElementById("btnRefresh");
    if (btnRefresh) btnRefresh.classList.add("spinning");

    PortfolioStore.persist();
    refreshAll();

    if (btnRefresh) {
      setTimeout(() => btnRefresh.classList.remove("spinning"), 500);
    }
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    StorageAdapter.saveTheme(theme);
    DashboardChart.destroyAll();
    renderChart();
    renderAllocation();
  }

  function toggleTheme() {
    const current = document.documentElement.getAttribute("data-theme");
    applyTheme(current === "dark" ? "light" : "dark");
  }

  async function init() {
    const savedTheme = StorageAdapter.loadTheme() || "dark";
    document.documentElement.setAttribute("data-theme", savedTheme);

    await PortfolioStore.init();

    refreshAll();

    if (typeof DashboardEvents !== "undefined" && DashboardEvents.bindAll) {
      DashboardEvents.bindAll();
    }
  }

  return {
    formatKRW, formatUSD, formatRate, changeClass,
    renderSummary, renderChart, renderHoldingsTable, renderAllocation,
    renderExchangeRate, renderHeader, renderGoal,
    refreshAll, refreshMarketData, setPeriod, toggleTheme, init
  };
})();

document.addEventListener("DOMContentLoaded", () => {
  App.init();
});
