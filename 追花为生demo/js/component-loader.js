const componentMap = {
  'top-toolbar': 'components/top-toolbar.html',
  'route-map-panel': 'components/route-map-panel.html',
  'route-rhythm-view': 'components/route-rhythm-view.html',
  'livelihood-risk-panel': 'components/livelihood-risk-panel.html',
  'status-bar': 'components/status-bar.html',
  'weather-detail-panel': 'components/weather-detail-panel.html',
  'tooltip-layer': 'components/tooltip-layer.html',
};

export async function loadComponents() {
  const slots = Array.from(document.querySelectorAll('[data-component-slot]'));

  await Promise.all(
    slots.map(async (slot) => {
      const name = slot.dataset.componentSlot;
      const url = componentMap[name];
      if (!url) return;

      try {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Cannot load ${url}`);
        }

        slot.innerHTML = await response.text();
      } catch (error) {
        slot.innerHTML = fallbackComponent(name, error);
      }
    }),
  );
}

function fallbackComponent(name, error) {
  return `
    <section class="panel">
      <div class="panel-body">
        <h2 class="panel-title">${name}</h2>
        <p class="placeholder-copy">
          组件片段载入失败。请通过 <code>node server.mjs</code> 启动本地服务器后访问。
        </p>
        <p class="caption">${error.message}</p>
      </div>
    </section>
  `;
}
