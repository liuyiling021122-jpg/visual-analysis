const listeners = new Set();
const maxSelectedRoutes = 4;

export const appState = {
  selectedRoutes: ['east-coastal'],
  selectedEra: '2020s',
  selectedMonthWindow: 'all',
  activeLayers: new Set(['route', 'flowering', 'weather']),
  selectedNode: null,
  selectedNodeSummary: null,
};

export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function updateState(patch) {
  Object.assign(appState, patch);
  listeners.forEach((listener) => listener(appState));
}

export function toggleLayer(layerName) {
  const nextLayers = new Set(appState.activeLayers);
  if (nextLayers.has(layerName)) {
    nextLayers.delete(layerName);
  } else {
    nextLayers.add(layerName);
  }

  updateState({ activeLayers: nextLayers });
}

export function setSelectedMonthWindow(monthWindow) {
  updateState({ selectedMonthWindow: monthWindow, selectedNode: null, selectedNodeSummary: null });
}

export function setSelectedNode(nodeId, nodeSummary = null) {
  updateState({ selectedNode: nodeId, selectedNodeSummary: nodeSummary });
}

export function setSelectedRoute(routeId, enabled) {
  const routeSet = new Set(appState.selectedRoutes);
  if (enabled) {
    routeSet.add(routeId);
  } else {
    routeSet.delete(routeId);
  }

  updateState({ selectedRoutes: Array.from(routeSet).slice(0, maxSelectedRoutes), selectedNode: null, selectedNodeSummary: null });
}
