/**
 * events.js (Fixed Version)
 * ------------------------------------------------------------
 * 이벤트 바인딩 및 헤더 상단 환율 변경 로직 연동
 * ------------------------------------------------------------
 */

const DashboardEvents = (() => {
  function bindAll() {
    const modalOverlay = document.getElementById("assetModal");
    const modalTitle = document.getElementById("modalTitle");
    const assetForm = document.getElementById("assetForm");

    const assetIdEl = document.getElementById("assetId");
    const assetTypeEl = document.getElementById("assetType");
    const assetNameEl = document.getElementById("assetName");
    const assetSymbolEl = document.getElementById("assetSymbol");
    const assetQuantityEl = document.getElementById("assetQuantity");
    const assetCurrencyEl = document.getElementById("assetCurrency");
    const assetAvgPriceEl = document.getElementById("assetAvgPrice");
    const assetCurrentPriceEl = document.getElementById("assetCurrentPrice");
    const assetExchangeRateEl = document.getElementById("assetExchangeRate");
    const assetPurchaseDateEl = document.getElementById("assetPurchaseDate");

    const btnAddAsset = document.getElementById("btnAddAsset");
    const btnCloseModal = document.getElementById("btnCloseModal");
    const btnDeleteAsset = document.getElementById("btnDeleteAsset");
    const btnRefresh = document.getElementById("btnRefresh");
    const btnThemeToggle = document.getElementById("btnThemeToggle");
    const periodButtons = document.querySelectorAll(".period-btn");

    // 상단 환율 변경 적용 이벤트
    const btnApplyExchangeRate = document.getElementById("btnApplyExchangeRate");
    const headerExchangeRateInput = document.getElementById("headerExchangeRate");

    if (btnApplyExchangeRate && headerExchangeRateInput) {
      const applyHeaderRate = () => {
        const rateVal = parseFloat(headerExchangeRateInput.value);
        if (isNaN(rateVal) || rateVal <= 0) {
          alert("올바른 환율 금액을 입력해주세요.");
          return;
        }
        PortfolioStore.updateExchangeRate(rateVal);
        App.refreshAll();
      };

      btnApplyExchangeRate.addEventListener("click", applyHeaderRate);
      headerExchangeRateInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") applyHeaderRate();
      });
    }

    // 자산 추가 모달 오픈
    if (btnAddAsset) {
      btnAddAsset.addEventListener("click", () => {
        assetForm.reset();
        assetIdEl.value = "";
        modalTitle.textContent = "자산 추가";
        if (btnDeleteAsset) btnDeleteAsset.style.display = "none";
        
        const currentStore = PortfolioStore.get();
        if (assetExchangeRateEl) {
          assetExchangeRateEl.value = currentStore.meta.exchangeRate.USDKRW;
        }
        if (assetPurchaseDateEl) {
          assetPurchaseDateEl.value = new Date().toISOString().substring(0, 10);
        }
        modalOverlay.classList.add("open");
      });
    }

    const closeModal = () => {
      if (modalOverlay) modalOverlay.classList.remove("open");
    };

    if (btnCloseModal) btnCloseModal.addEventListener("click", closeModal);
    if (modalOverlay) {
      modalOverlay.addEventListener("click", (e) => {
        if (e.target === modalOverlay) closeModal();
      });
    }

    // 종목 자동완성
    if (assetNameEl) {
      assetNameEl.addEventListener("change", async () => {
        const keyword = assetNameEl.value.trim();
        if (!keyword) return;

        if (typeof MarketAPI !== "undefined" && MarketAPI.searchTicker) {
          const tickerInfo = await MarketAPI.searchTicker(keyword);
          if (tickerInfo) {
            if (assetNameEl && tickerInfo.name) assetNameEl.value = tickerInfo.name;
            if (assetSymbolEl && tickerInfo.symbol) assetSymbolEl.value = tickerInfo.symbol;
            if (assetTypeEl && tickerInfo.type) assetTypeEl.value = tickerInfo.type;
            if (assetCurrencyEl && tickerInfo.currency) assetCurrencyEl.value = tickerInfo.currency;
          }
        }
      });
    }

    // 자산 수정 모달 오픈
    document.addEventListener("click", (e) => {
      const editBtn = e.target.closest(".edit-row-btn, .btn-edit-asset");
      if (!editBtn) return;
      const id = editBtn.dataset.id;
      if (!id) return;

      const { holdings, meta } = PortfolioStore.get();
      const target = holdings.find((h) => String(h.id) === String(id));
      if (!target) return;

      modalTitle.textContent = "자산 수정";
      assetIdEl.value = target.id;
      assetTypeEl.value = target.type || "US_STOCK";
      assetNameEl.value = target.name || "";
      assetSymbolEl.value = target.symbol || "";
      assetQuantityEl.value = target.quantity ?? 0;
      assetCurrencyEl.value = target.currency || "KRW";
      assetAvgPriceEl.value = target.avgBuyPrice ?? 0;
      assetCurrentPriceEl.value = target.currentPrice ?? target.avgBuyPrice ?? 0;
      if (assetExchangeRateEl) {
        assetExchangeRateEl.value = meta.exchangeRate.USDKRW;
      }
      assetPurchaseDateEl.value = target.purchaseDate || new Date().toISOString().substring(0, 10);

      if (btnDeleteAsset) btnDeleteAsset.style.display = "block";
      modalOverlay.classList.add("open");
    });

    // 자산 폼 제출 (저장)
    if (assetForm) {
      assetForm.addEventListener("submit", (e) => {
        e.preventDefault();

        const id = assetIdEl.value;
        const type = assetTypeEl.value;
        const name = assetNameEl.value.trim();
        const symbol = assetSymbolEl.value.trim();
        const quantity = parseFloat(assetQuantityEl.value) || 0;
        const currency = assetCurrencyEl.value;
        const avgBuyPrice = parseFloat(assetAvgPriceEl.value) || 0;
        const currentPrice = parseFloat(assetCurrentPriceEl.value) || avgBuyPrice;
        const manualRate = parseFloat(assetExchangeRateEl.value) || 1385.5;
        const purchaseDate = assetPurchaseDateEl.value || null;

        if (!name) {
          alert("자산명을 입력해주세요.");
          return;
        }

        // 환율 수동 입력 반영
        PortfolioStore.updateExchangeRate(manualRate);

        const payload = {
          type, name, symbol, quantity, currency, avgBuyPrice, currentPrice, purchaseDate
        };

        if (id) {
          PortfolioStore.updateHolding(id, payload);
        } else {
          PortfolioStore.addHolding(payload);
        }

        closeModal();
        App.refreshAll();
      });
    }

    // 자산 삭제 버튼
    if (btnDeleteAsset) {
      btnDeleteAsset.addEventListener("click", () => {
        const id = assetIdEl.value;
        if (id && confirm("정말 이 자산을 삭제하시겠습니까?")) {
          PortfolioStore.deleteHolding(id);
          closeModal();
          App.refreshAll();
        }
      });
    }

    // 새로고침 버튼
    if (btnRefresh) {
      btnRefresh.addEventListener("click", () => {
        App.refreshMarketData();
      });
    }

    // 다크모드 토글
    if (btnThemeToggle) {
      btnThemeToggle.addEventListener("click", () => {
        if (typeof App !== "undefined" && App.toggleTheme) {
          App.toggleTheme();
        }
      });
    }

    // 차트 기간 선택
    if (periodButtons) {
      periodButtons.forEach(btn => {
        btn.addEventListener("click", (e) => {
          periodButtons.forEach(b => b.classList.remove("active"));
          e.target.classList.add("active");

          const period = e.target.dataset.period;
          if (typeof App !== "undefined" && App.setPeriod) {
            App.setPeriod(period);
          }
        });
      });
    }

    // 목표 자산 설정
    const btnSetGoal = document.getElementById("btnSetGoal");
    const goalAmountInput = document.getElementById("goalAmountInput");

    if (btnSetGoal && goalAmountInput) {
      const applyGoal = () => {
        const value = parseFloat(goalAmountInput.value);
        if (isNaN(value) || value < 0) {
          alert("올바른 목표 금액을 입력해주세요.");
          return;
        }
        PortfolioStore.setGoalAmount(value);
        if (typeof App !== "undefined" && App.renderGoal) {
          App.renderGoal();
        }
      };

      btnSetGoal.addEventListener("click", applyGoal);
      goalAmountInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") applyGoal();
      });
    }

    // 마켓 이벤트 추가
    const btnAddEvent = document.getElementById("btnAddEvent");
    if (btnAddEvent) {
      btnAddEvent.addEventListener("click", () => {
        const dateInput = document.getElementById("newEventDate");
        const titleInput = document.getElementById("newEventTitle");
        const importanceInput = document.getElementById("newEventImportance");

        if (!dateInput.value || !titleInput.value.trim()) {
          alert("날짜와 일정 내용을 모두 입력해주세요.");
          return;
        }

        const newEv = {
          id: "ev-" + Date.now(),
          date: dateInput.value,
          title: titleInput.value.trim(),
          importance: importanceInput.value
        };

        MarketAPI.addEconomicEvent(newEv);
        dateInput.value = "";
        titleInput.value = "";
        importanceInput.value = "MID";
        renderMarketEvents();
      });
    }

    renderMarketEvents();
  }

  function renderMarketEvents() {
    const container = document.getElementById("eventsListContainer");
    if (!container) return;

    const events = MarketAPI.getEconomicEvents();
    container.innerHTML = "";

    if (!events || events.length === 0) {
      container.innerHTML = `<div style="text-align:center; color:var(--color-text-secondary); font-size:12.5px; padding:20px;">등록된 일정이 없습니다.</div>`;
      return;
    }

    events.sort((a, b) => new Date(a.date) - new Date(b.date));

    events.forEach(ev => {
      const impClass = ev.importance === "HIGH" ? "importance-high" : ev.importance === "LOW" ? "importance-low" : "importance-mid";
      const item = document.createElement("div");
      item.className = `event-item ${impClass}`;
      item.innerHTML = `
        <div class="event-info">
          <span class="event-date">${ev.date}</span>
          <span class="event-title">${ev.title}</span>
        </div>
        <button type="button" class="event-delete-btn" data-id="${ev.id}" title="삭제">✕</button>
      `;
      container.appendChild(item);
    });

    container.querySelectorAll(".event-delete-btn").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const id = e.target.dataset.id;
        MarketAPI.deleteEconomicEvent(id);
        renderMarketEvents();
      });
    });
  }

  return { bindAll, renderMarketEvents };
})();
