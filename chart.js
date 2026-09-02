/**
 * chart.js (Updated Version)
 * ------------------------------------------------------------
 * Chart.js 차트 렌더링
 * - 월별 1개 데이터일 때 선 그래프가 아닌 단일 점(Dot)으로 표현
 * - 도넛 차트 크기 및 레이아웃 가시성 최적화
 * ------------------------------------------------------------
 */

const DashboardChart = (() => {
  let lineChartInstance = null;
  let allocationChartInstance = null;

  function isChartAvailable() {
    if (typeof Chart === 'undefined') {
      console.error("Chart.js 라이브러리가 로드되지 않았습니다.");
      return false;
    }
    return true;
  }

  function destroyAll() {
    if (lineChartInstance) {
      lineChartInstance.destroy();
      lineChartInstance = null;
    }
    if (allocationChartInstance) {
      allocationChartInstance.destroy();
      allocationChartInstance = null;
    }
  }

  function renderLineChart(canvasEl, historyData) {
    if (!canvasEl || !isChartAvailable()) return;
    const ctx = canvasEl.getContext("2d");
    if (lineChartInstance) {
      lineChartInstance.destroy();
    }

    if (!historyData || historyData.length === 0) {
      lineChartInstance = new Chart(ctx, {
        type: "line",
        data: { labels: ["데이터 없음"], datasets: [{ data: [0], borderColor: "#7c8794" }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
      });
      return;
    }

    // YYYY-MM 형태로 추출
    const labels = historyData.map(item => {
      return item.date ? item.date.substring(0, 7) : item.date;
    });
    const dataVals = historyData.map(item => item.totalAsset);

    // 데이터가 1개인 경우 점 크기를 더 키워서 강조
    const isSinglePoint = historyData.length === 1;

    lineChartInstance = new Chart(ctx, {
      type: "line",
      data: {
        labels: labels,
        datasets: [{
          label: "총 자산",
          data: dataVals,
          borderColor: "#c9a227",
          backgroundColor: "rgba(201, 162, 39, 0.15)",
          borderWidth: isSinglePoint ? 0 : 2.5,
          fill: true,
          tension: 0.2,
          pointRadius: isSinglePoint ? 7 : 4,
          pointHoverRadius: isSinglePoint ? 9 : 6,
          pointBackgroundColor: "#c9a227"
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (context) => ` 자산: ₩${context.parsed.y.toLocaleString()}`
            }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { 
              color: "#8b93a1", 
              font: { size: 11 },
              maxRotation: 0,
              autoSkip: true
            }
          },
          y: {
            grid: { color: "rgba(255,255,255,0.05)" },
            ticks: {
              color: "#8b93a1",
              font: { size: 11 },
              callback: (val) => `₩${(val / 10000).toLocaleString()}만`
            }
          }
        }
      }
    });
  }

  function renderAllocationChart(canvasEl, legendEl, allocationData, formatKRWFunc) {
    if (!canvasEl || !isChartAvailable()) return;
    const ctx = canvasEl.getContext("2d");
    if (allocationChartInstance) {
      allocationChartInstance.destroy();
    }

    const items = allocationData.items;
    if (!items || items.length === 0) {
      allocationChartInstance = new Chart(ctx, {
        type: "doughnut",
        data: { labels: ["없음"], datasets: [{ data: [1], backgroundColor: ["#232b38"] }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
      });
      if (legendEl) legendEl.innerHTML = `<div style="color:var(--color-text-secondary); font-size:12px;">보유 자산이 없습니다.</div>`;
      return;
    }

    const labels = items.map(i => i.label);
    const dataVals = items.map(i => i.amount);
    const backgroundColors = items.map(i => i.color);

    allocationChartInstance = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels: labels,
        datasets: [{
          data: dataVals,
          backgroundColor: backgroundColors,
          borderWidth: 0,
          spacing: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "65%",
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (context) => {
                const val = context.parsed;
                const total = allocationData.total;
                const pct = total > 0 ? ((val / total) * 100).toFixed(1) : 0;
                return ` ${context.label}: ${formatKRWFunc(val)} (${pct}%)`;
              }
            }
          }
        }
      }
    });

    // 범례 생성 및 가시성 개선
    if (legendEl) {
      legendEl.innerHTML = "";
      items.forEach(item => {
        const row = document.createElement("div");
        row.style.cssText = "display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; font-size: 11.5px;";
        row.innerHTML = `
          <div style="display:flex; align-items:center; gap:6px;">
            <span style="width:8px; height:8px; border-radius:50%; background:${item.color}; display:inline-block;"></span>
            <span style="color:var(--color-text-primary); font-weight:500;">${item.label}</span>
          </div>
          <div style="text-align:right;">
            <span style="color:var(--color-text-secondary); font-weight:600;">${item.percentage.toFixed(1)}%</span>
          </div>
        `;
        legendEl.appendChild(row);
      });
    }
  }

  return {
    destroyAll,
    renderLineChart,
    renderAllocationChart
  };
})();
