/**
 * Person of Interest (POI) filtering and virtual data building.
 * Pure functions extracted from YChartEditor — no class dependencies.
 */

export interface POIState {
  personOfInterest: any | null;
  truthData: any[];
  expandedSiblings: Set<string>;
  supervisorChainExpanded: boolean;
  centerPersonOfInterest?: boolean;
}

/**
 * Build virtual data list from truth data based on POI selection.
 * When a POI is set, shows the supervisory chain, POI children, and optionally siblings.
 */
export function buildVirtualData(data: any[], state: POIState): any[] {
  const virtualData = data.map(item => ({ ...item }));
  virtualData.forEach(item => {
    delete item._expanded;
    delete item._centered;
  });

  if (!state.personOfInterest) {
    return virtualData;
  }

  const poiId = state.personOfInterest.id;
  const dataMap = new Map(virtualData.map(item => [item.id, item]));

  const childrenMap = new Map<any, any[]>();
  virtualData.forEach(item => {
    if (item.parentId != null) {
      if (!childrenMap.has(item.parentId)) {
        childrenMap.set(item.parentId, []);
      }
      childrenMap.get(item.parentId)!.push(item);
    }
  });

  const rootNodes = virtualData.filter(item => item.parentId === null || item.parentId === undefined);
  const isMultiRoot = rootNodes.length > 1;

  const poiNodeData = dataMap.get(poiId);
  const poiIsRoot = poiNodeData && (poiNodeData.parentId === null || poiNodeData.parentId === undefined);

  if (poiIsRoot && !isMultiRoot) {
    if (poiNodeData) {
      poiNodeData._expanded = true;
    }
    return virtualData;
  }

  if (poiIsRoot && isMultiRoot) {
    const poiIdStr = String(poiId);
    if (state.expandedSiblings.has(poiIdStr)) {
      if (poiNodeData) {
        poiNodeData._expanded = true;
      }
      return virtualData;
    } else {
      const visibleNodeIds = new Set<any>();
      visibleNodeIds.add(poiId);

      const addDescendants = (nodeId: any) => {
        const children = childrenMap.get(nodeId) || [];
        children.forEach(child => {
          visibleNodeIds.add(child.id);
          addDescendants(child.id);
        });
      };

      addDescendants(poiId);

      const filteredData = virtualData.filter(item => visibleNodeIds.has(item.id));

      const poiInFiltered = filteredData.find(item => item.id === poiId);
      if (poiInFiltered) {
        poiInFiltered._expanded = true;
      }

      return filteredData;
    }
  }

  // Build the supervisory chain from POI to root
  const supervisoryChain: any[] = [];
  let currentId = poiId;
  while (currentId != null) {
    supervisoryChain.push(currentId);
    const currentNode = dataMap.get(currentId);
    if (!currentNode) break;
    currentId = currentNode.parentId;
  }
  const supervisoryChainSet = new Set(supervisoryChain);

  const visibleNodeIds = new Set<any>();

  const addAllDescendants = (nodeId: any) => {
    const children = childrenMap.get(nodeId) || [];
    children.forEach(child => {
      visibleNodeIds.add(child.id);
      addAllDescendants(child.id);
    });
  };

  visibleNodeIds.add(poiId);

  if (state.supervisorChainExpanded) {
    supervisoryChain.forEach(id => visibleNodeIds.add(id));
  } else {
    const poiNode = dataMap.get(poiId);
    if (poiNode && poiNode.parentId != null) {
      visibleNodeIds.add(poiNode.parentId);
    }
  }

  const poiChildren = childrenMap.get(poiId) || [];
  poiChildren.forEach(child => {
    visibleNodeIds.add(child.id);
    addAllDescendants(child.id);
  });

  const visibleChainNodes = supervisoryChain.filter(id => visibleNodeIds.has(id));
  visibleChainNodes.forEach(chainNodeId => {
    const nodeIdStr = String(chainNodeId);
    if (state.expandedSiblings.has(nodeIdStr)) {
      const chainNode = dataMap.get(chainNodeId);
      if (chainNode) {
        const isChainNodeRoot = chainNode.parentId === null || chainNode.parentId === undefined;

        if (isChainNodeRoot) {
          rootNodes.forEach(rootSibling => {
            if (rootSibling.id === chainNodeId) return;
            visibleNodeIds.add(rootSibling.id);
            addAllDescendants(rootSibling.id);
          });
        } else {
          const siblings = childrenMap.get(chainNode.parentId) || [];
          siblings.forEach(sibling => {
            if (sibling.id === chainNodeId) return;
            visibleNodeIds.add(sibling.id);
            addAllDescendants(sibling.id);
          });
        }
      }
    }
  });

  const filteredData = virtualData.filter(item => visibleNodeIds.has(item.id));

  const poiDirectChildrenIds = new Set((childrenMap.get(poiId) || []).map(child => child.id));

  if (!state.supervisorChainExpanded) {
    const poiNode = dataMap.get(poiId);
    if (poiNode && poiNode.parentId != null) {
      const directSupervisor = filteredData.find(item => item.id === poiNode.parentId);
      if (directSupervisor) {
        directSupervisor.parentId = null;
      }
    }
  }

  filteredData.forEach(item => {
    if (supervisoryChainSet.has(item.id)) {
      item._expanded = true;
    }
    if (poiDirectChildrenIds.has(item.id)) {
      item._expanded = true;
    }
  });

  const poiNodeFiltered = filteredData.find(item => item.id === poiId);
  if (poiNodeFiltered) {
    if (state.centerPersonOfInterest !== false) {
      poiNodeFiltered._centered = true;
    }
    poiNodeFiltered._expanded = true;
  }

  return filteredData;
}

/**
 * Check if a node should show the expand siblings button.
 */
export function shouldShowExpandSiblings(
  nodeId: any,
  personOfInterest: any | null,
  truthData: any[],
): boolean {
  if (!personOfInterest) return false;

  const poiId = personOfInterest.id;
  const dataMap = new Map(truthData.map(item => [item.id, item]));
  const poiNode = dataMap.get(poiId);

  if (!poiNode) return false;

  const supervisoryChain: any[] = [];
  let currentId = poiId;
  while (currentId != null) {
    supervisoryChain.push(currentId);
    const currentNode = dataMap.get(currentId);
    if (!currentNode) break;
    currentId = currentNode.parentId;
  }

  if (!supervisoryChain.includes(nodeId)) return false;

  const node = dataMap.get(nodeId);
  if (!node) return false;

  const isRootNode = node.parentId === null || node.parentId === undefined;

  if (isRootNode) {
    const otherRoots = truthData.filter(item =>
      (item.parentId === null || item.parentId === undefined) && item.id !== nodeId
    );
    return otherRoots.length > 0;
  }

  return getSiblingCount(nodeId, truthData) > 0;
}

/**
 * Get the count of siblings for a node (from truth data).
 */
export function getSiblingCount(nodeId: any, truthData: any[]): number {
  const dataMap = new Map(truthData.map(item => [item.id, item]));
  const node = dataMap.get(nodeId);
  if (!node) return 0;

  const isRootNode = node.parentId === null || node.parentId === undefined;

  if (isRootNode) {
    return truthData.filter(item =>
      (item.parentId === null || item.parentId === undefined) && item.id !== nodeId
    ).length;
  }

  return truthData.filter(item =>
    item.parentId === node.parentId && item.id !== nodeId
  ).length;
}

/**
 * Get the supervisor chain info for the POI.
 */
export function getSupervisorChainInfo(
  personOfInterest: any | null,
  truthData: any[],
): { directSupervisor: any | null; chainLength: number } {
  if (!personOfInterest) {
    return { directSupervisor: null, chainLength: 0 };
  }

  const poiId = personOfInterest.id;
  const dataMap = new Map(truthData.map(item => [item.id, item]));
  const poiNode = dataMap.get(poiId);

  if (!poiNode || poiNode.parentId == null) {
    return { directSupervisor: null, chainLength: 0 };
  }

  const directSupervisor = dataMap.get(poiNode.parentId);
  if (!directSupervisor) {
    return { directSupervisor: null, chainLength: 0 };
  }

  let chainLength = 0;
  let currentId = directSupervisor.parentId;
  while (currentId != null) {
    chainLength++;
    const currentNode = dataMap.get(currentId);
    if (!currentNode) break;
    currentId = currentNode.parentId;
  }

  return { directSupervisor, chainLength };
}

/**
 * Check if a node is the topmost visible supervisor in the current view.
 */
export function isTopmostVisibleSupervisor(
  nodeId: any,
  personOfInterest: any | null,
  truthData: any[],
): boolean {
  if (!personOfInterest) return false;

  const poiId = personOfInterest.id;
  const dataMap = new Map(truthData.map(item => [item.id, item]));
  const poiNode = dataMap.get(poiId);

  if (!poiNode || poiNode.parentId == null) return false;

  return nodeId === poiNode.parentId;
}

/**
 * Get the count of hidden supervisors above a given node.
 */
export function getHiddenSupervisorCount(
  nodeId: any,
  personOfInterest: any | null,
  truthData: any[],
): number {
  if (!personOfInterest) return 0;

  const dataMap = new Map(truthData.map(item => [item.id, item]));
  const node = dataMap.get(nodeId);

  if (!node) return 0;

  let count = 0;
  let currentId = node.parentId;
  while (currentId != null) {
    count++;
    const currentNode = dataMap.get(currentId);
    if (!currentNode) break;
    currentId = currentNode.parentId;
  }

  return count;
}
