import { loadComponents } from './component-loader.js';
import { setSelectedMonthWindow, updateState } from './state.js';
import { initRouteMapPanel } from './route-map-panel.js';
import { initRouteRhythmView } from './route-rhythm-view.js';
import { initLivelihoodRiskPanel } from './livelihood-risk-panel.js';

async function bootstrap() {
  await loadComponents();

  initToolbar();
  initRouteMapPanel();
  initRouteRhythmView();
  initLivelihoodRiskPanel();

  document.documentElement.dataset.ready = 'true';
}

function initToolbar() {
  document.querySelectorAll('[data-era]').forEach((button) => {
    button.addEventListener('click', () => {
      document.querySelectorAll('[data-era]').forEach((item) => {
        item.setAttribute('aria-pressed', String(item === button));
      });

      updateState({ selectedEra: button.dataset.era, selectedNode: null, selectedNodeSummary: null });
    });
  });

  document.querySelectorAll('[data-month-window]').forEach((button) => {
    button.addEventListener('click', () => {
      document.querySelectorAll('[data-month-window]').forEach((item) => {
        item.setAttribute('aria-pressed', String(item === button));
      });

      setSelectedMonthWindow(button.dataset.monthWindow);
    });
  });
}

bootstrap().catch((error) => {
  console.error(error);
  document.body.innerHTML = `
    <main class="app-shell">
      <section class="panel">
        <div class="panel-body">
          <h1 class="panel-title">系统骨架载入失败</h1>
          <p class="placeholder-copy">${error.message}</p>
        </div>
      </section>
    </main>
  `;
});
