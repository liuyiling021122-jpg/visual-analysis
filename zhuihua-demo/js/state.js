const listeners = new Set();
const maxSelectedRoutes = 4;
const routeIdsByName = {
  '东线（沿海线）': 'east-coastal',
  '西线（西北线）': 'west-northwest',
  '中线（京广线）': 'central-route',
  '南线': 'south-route',
};

export const appState = {
  selectedRoutes: ['east-coastal'],
  selectedEra: '2020s',
  selectedMonthWindow: 'all',
  activeLayers: new Set(['route', 'flowering', 'weather']),
  activeRiskRoute: 'east-coastal',
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
  const matchedRoute = routeIdsByName[nodeSummary?.route_name];
  updateState({
    selectedNode: nodeId,
    selectedNodeSummary: nodeSummary,
    activeRiskRoute: matchedRoute || appState.activeRiskRoute,
  });
}

export function setSelectedRoute(routeId, enabled) {
  const routeSet = new Set(appState.selectedRoutes);
  if (enabled) {
    routeSet.add(routeId);
  } else {
    routeSet.delete(routeId);
  }

  const selectedRoutes = Array.from(routeSet).slice(0, maxSelectedRoutes);
  const nextActiveRiskRoute = enabled && Object.values(routeIdsByName).includes(routeId)
    ? routeId
    : selectedRoutes.includes(appState.activeRiskRoute) ? appState.activeRiskRoute : selectedRoutes[0] || null;
  updateState({
    selectedRoutes,
    activeRiskRoute: nextActiveRiskRoute,
    selectedNode: null,
    selectedNodeSummary: null,
  });
}
