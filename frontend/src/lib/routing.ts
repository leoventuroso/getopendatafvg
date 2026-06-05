type Coord = [number, number];
type NodeId = string;

export type RoutingMode = 'walking' | 'biking';

export type RoutingInputPoint = {
  lng: number;
  lat: number;
};

export type RouteSummary = {
  distanceKm: number;
  timeMin: number;
  elevationGainM: number;
  elevationLossM: number;
  profile: Array<{
    distanceKm: number;
    elevationM: number;
  }>;
  line: {
    type: 'Feature';
    geometry: {
      type: 'LineString';
      coordinates: Coord[];
    };
    properties: Record<string, never>;
  };
  points: {
    type: 'FeatureCollection';
    features: Array<{
      type: 'Feature';
      geometry: { type: 'Point'; coordinates: Coord };
      properties: {
        kind: 'start' | 'waypoint' | 'end';
        label: string;
        index: number;
      };
    }>;
  };
};

type TransportFeature = {
  properties?: {
    u?: number | string;
    v?: number | string;
    length?: number | string;
    lts?: number | string;
    slope?: number | string;
    grade?: number | string;
  };
  geometry?: {
    type?: string;
    coordinates?: Coord[];
  };
};

type CombinedFeature = {
  properties?: {
    u?: number | string;
    v?: number | string;
    length?: number | string;
    lts?: number | string;
    slope?: number | string;
    grade?: number | string;
  };
  geometry?: {
    type?: string;
    coordinates?: Coord[];
  };
};

type GraphEdge = {
  from: NodeId;
  to: NodeId;
  coords: Coord[];
  length: number;
  lts: number;
  slope: number;
  grade: number;
};

type GraphNode = {
  coord: Coord;
  edges: number[];
};

export type RoutingGraph = {
  nodes: Map<NodeId, GraphNode>;
  edges: GraphEdge[];
  nodeCoords: Array<{ id: NodeId; coord: Coord }>;
};

function toNumber(value: unknown, fallback = 0): number {
  const parsed = typeof value === 'string' ? Number(value) : value;
  return typeof parsed === 'number' && Number.isFinite(parsed) ? parsed : fallback;
}

function distanceMeters(a: Coord, b: Coord): number {
  const radius = 6371000;
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const deltaLat = toRadians(b[1] - a[1]);
  const deltaLng = toRadians(b[0] - a[0]);
  const lat1 = toRadians(a[1]);
  const lat2 = toRadians(b[1]);
  const h =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) ** 2;
  return 2 * radius * Math.asin(Math.sqrt(h));
}

function coordKey(coord: Coord, digits = 7): NodeId {
  return `${coord[0].toFixed(digits)},${coord[1].toFixed(digits)}`;
}

function segmentLength(coords: Coord[]): number {
  let total = 0;
  for (let index = 1; index < coords.length; index += 1) {
    total += distanceMeters(coords[index - 1], coords[index]);
  }
  return total;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function getTraversalGrade(edge: GraphEdge, fromNode: NodeId): number {
  return edge.from === fromNode ? edge.grade : -edge.grade;
}

function estimateSpeedKmh(edge: GraphEdge, mode: RoutingMode, fromNode: NodeId): number {
  const grade = getTraversalGrade(edge, fromNode) / 100;

  if (mode === 'walking') {
    // Tobler-style hiking speed model.
    return clamp(6 * Math.exp(-3.5 * Math.abs(grade + 0.05)), 1.0, 6.0);
  }

  const baseSpeed = 16;
  const uphillFactor = Math.exp(-5.0 * Math.max(0, grade));
  const downhillFactor = grade < 0 ? 1 + Math.min(0.5, Math.abs(grade) * 1.5) : 1;
  const ltsPenalty = 1 + Math.max(0, edge.lts - 1) * 0.25;

  return clamp((baseSpeed * uphillFactor * downhillFactor) / ltsPenalty, 3.0, 28.0);
}

function edgeTravelTimeMinutes(edge: GraphEdge, mode: RoutingMode, fromNode: NodeId): number {
  const speedKmh = estimateSpeedKmh(edge, mode, fromNode);
  const distanceKm = edge.length / 1000;
  return distanceKm > 0 ? (distanceKm / speedKmh) * 60 : 0;
}

class MinHeap {
  private items: Array<{ node: NodeId; cost: number }> = [];

  push(item: { node: NodeId; cost: number }): void {
    this.items.push(item);
    this.bubbleUp(this.items.length - 1);
  }

  pop(): { node: NodeId; cost: number } | undefined {
    if (this.items.length === 0) {
      return undefined;
    }

    const top = this.items[0];
    const last = this.items.pop();

    if (this.items.length > 0 && last) {
      this.items[0] = last;
      this.bubbleDown(0);
    }

    return top;
  }

  private bubbleUp(index: number): void {
    while (index > 0) {
      const parent = Math.floor((index - 1) / 2);
      if (this.items[parent].cost <= this.items[index].cost) {
        break;
      }

      [this.items[parent], this.items[index]] = [this.items[index], this.items[parent]];
      index = parent;
    }
  }

  private bubbleDown(index: number): void {
    while (true) {
      const left = index * 2 + 1;
      const right = left + 1;
      let smallest = index;

      if (left < this.items.length && this.items[left].cost < this.items[smallest].cost) {
        smallest = left;
      }

      if (right < this.items.length && this.items[right].cost < this.items[smallest].cost) {
        smallest = right;
      }

      if (smallest === index) {
        break;
      }

      [this.items[smallest], this.items[index]] = [this.items[index], this.items[smallest]];
      index = smallest;
    }
  }
}

export async function loadRoutingGraph(): Promise<RoutingGraph> {
  throw new Error('loadRoutingGraph(mode) va chiamato con una modalita specifica');
}

export async function loadRoutingGraphForMode(mode: RoutingMode): Promise<RoutingGraph> {
  if (mode === 'biking') {
    const response = await fetch('/data/transport.geojson');
    if (!response.ok) {
      throw new Error('Impossibile caricare il dataset routing');
    }

    const data = await response.json();
    return buildTransportRoutingGraph(data.features ?? []);
  }

  const [roadsResponse, trailsResponse] = await Promise.all([
    fetch('/data/transport.geojson'),
    fetch('/data/outdoor/trails_routing.geojson')
  ]);

  if (!roadsResponse.ok || !trailsResponse.ok) {
    throw new Error('Impossibile caricare il dataset routing');
  }

  const [roadsData, trailsData] = await Promise.all([roadsResponse.json(), trailsResponse.json()]);
  return buildWalkingRoutingGraph([...(roadsData.features ?? []), ...(trailsData.features ?? [])]);
}

export function buildTransportRoutingGraph(features: TransportFeature[]): RoutingGraph {
  const nodes = new Map<NodeId, GraphNode>();
  const edges: GraphEdge[] = [];

  for (const feature of features) {
    const properties = feature.properties ?? {};
    const geometry = feature.geometry;
    if (geometry?.type !== 'LineString' || !geometry.coordinates || geometry.coordinates.length < 2) {
      continue;
    }

    const from = String(properties.u ?? '');
    const to = String(properties.v ?? '');
    const length = toNumber(properties.length, 0);
    if (!from || !to || length <= 0) {
      continue;
    }

    const coords = geometry.coordinates as Coord[];
    const edge: GraphEdge = {
      from,
      to,
      coords,
      length,
      lts: toNumber(properties.lts, 2),
      slope: toNumber(properties.slope, 0),
      grade: toNumber(properties.grade, 0)
    };

    const edgeIndex = edges.push(edge) - 1;

    const fromNode = nodes.get(from) ?? { coord: coords[0], edges: [] };
    fromNode.coord = fromNode.coord ?? coords[0];
    fromNode.edges.push(edgeIndex);
    nodes.set(from, fromNode);

    const toNode = nodes.get(to) ?? { coord: coords[coords.length - 1], edges: [] };
    toNode.coord = toNode.coord ?? coords[coords.length - 1];
    toNode.edges.push(edgeIndex);
    nodes.set(to, toNode);
  }

  const nodeCoords = Array.from(nodes.entries()).map(([id, node]) => ({ id, coord: node.coord }));
  return { nodes, edges, nodeCoords };
}

type TrailFeature = {
  properties?: {
    name?: string | null;
    'name:it'?: string | null;
    highway?: string | null;
    class?: string | null;
    lts?: number | string;
    slope?: number | string;
    grade?: number | string;
    slope_class?: string | null;
  };
  geometry?: {
    type?: string;
    coordinates?: Coord[];
  };
};

function addSegmentEdge(
  graph: { nodes: Map<NodeId, GraphNode>; edges: GraphEdge[] },
  fromCoord: Coord,
  toCoord: Coord,
  properties: { lts?: number; slope?: number; grade?: number }
): void {
  const from = coordKey(fromCoord, 6);
  const to = coordKey(toCoord, 6);
  const length = distanceMeters(fromCoord, toCoord);

  if (length <= 0 || from === to) {
    return;
  }

  const edge: GraphEdge = {
    from,
    to,
    coords: [fromCoord, toCoord],
    length,
    lts: properties.lts ?? 1,
    slope: properties.slope ?? 0,
    grade: properties.grade ?? 0
  };

  const edgeIndex = graph.edges.push(edge) - 1;

  const fromNode = graph.nodes.get(from) ?? { coord: fromCoord, edges: [] };
  fromNode.edges.push(edgeIndex);
  graph.nodes.set(from, fromNode);

  const toNode = graph.nodes.get(to) ?? { coord: toCoord, edges: [] };
  toNode.edges.push(edgeIndex);
  graph.nodes.set(to, toNode);
}

function buildWalkingRoutingGraph(features: CombinedFeature[]): RoutingGraph {
  const nodes = new Map<NodeId, GraphNode>();
  const edges: GraphEdge[] = [];

  for (const feature of features) {
    const properties = feature.properties ?? {};
    const geometry = feature.geometry;

    if (geometry?.type !== 'LineString' || !geometry.coordinates || geometry.coordinates.length < 2) {
      continue;
    }

    const coords = geometry.coordinates as Coord[];
    const lts = toNumber(properties.lts, 1);
    const slope = toNumber(properties.slope, 0);
    const grade = toNumber(properties.grade, 0);

    for (let index = 1; index < coords.length; index += 1) {
      addSegmentEdge({ nodes, edges }, coords[index - 1], coords[index], { lts, slope, grade });
    }
  }

  const nodeCoords = Array.from(nodes.entries()).map(([id, node]) => ({ id, coord: node.coord }));
  return { nodes, edges, nodeCoords };
}

export function buildTrailRoutingGraph(features: TrailFeature[]): RoutingGraph {
  const nodes = new Map<NodeId, GraphNode>();
  const edges: GraphEdge[] = [];

  for (const feature of features) {
    const properties = feature.properties ?? {};
    const geometry = feature.geometry;
    if (geometry?.type !== 'LineString' || !geometry.coordinates || geometry.coordinates.length < 2) {
      continue;
    }

    const coords = geometry.coordinates as Coord[];
    const lineLength = segmentLength(coords);
    const lts = toNumber(properties.lts, 2);
    const slope = toNumber(properties.slope, 0);
    const grade = toNumber(properties.grade, 0);

    for (let index = 1; index < coords.length; index += 1) {
      const from = coordKey(coords[index - 1], 5);
      const to = coordKey(coords[index], 5);
      if (from === to) {
        continue;
      }

      const edge: GraphEdge = {
        from,
        to,
        coords: [coords[index - 1], coords[index]],
        length: distanceMeters(coords[index - 1], coords[index]),
        lts,
        slope,
        grade
      };

      const edgeIndex = edges.push(edge) - 1;

      const fromNode = nodes.get(from) ?? { coord: coords[index - 1], edges: [] };
      fromNode.edges.push(edgeIndex);
      nodes.set(from, fromNode);

      const toNode = nodes.get(to) ?? { coord: coords[index], edges: [] };
      toNode.edges.push(edgeIndex);
      nodes.set(to, toNode);
    }

    if (lineLength <= 0) {
      continue;
    }
  }

  const nodeCoords = Array.from(nodes.entries()).map(([id, node]) => ({ id, coord: node.coord }));
  return { nodes, edges, nodeCoords };
}

function findNearestNodeId(graph: RoutingGraph, point: RoutingInputPoint): NodeId | null {
  let bestId: NodeId | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;
  const target: Coord = [point.lng, point.lat];

  for (const candidate of graph.nodeCoords) {
    const currentDistance = distanceMeters(target, candidate.coord);
    if (currentDistance < bestDistance) {
      bestDistance = currentDistance;
      bestId = candidate.id;
    }
  }

  return bestId;
}

function shortestPath(
  graph: RoutingGraph,
  startId: NodeId,
  endId: NodeId,
  mode: RoutingMode
): { nodePath: NodeId[]; edgePath: number[] } | null {
  const distances = new Map<NodeId, number>();
  const previousNode = new Map<NodeId, NodeId>();
  const previousEdge = new Map<NodeId, number>();
  const queue = new MinHeap();

  distances.set(startId, 0);
  queue.push({ node: startId, cost: 0 });

  while (true) {
    const current = queue.pop();
    if (!current) {
      break;
    }

    const knownDistance = distances.get(current.node);
    if (knownDistance !== undefined && current.cost > knownDistance) {
      continue;
    }

    if (current.node === endId) {
      break;
    }

    const node = graph.nodes.get(current.node);
    if (!node) {
      continue;
    }

    for (const edgeIndex of node.edges) {
      const edge = graph.edges[edgeIndex];
      const neighbor = edge.from === current.node ? edge.to : edge.from;
      const nextCost = current.cost + edgeTravelTimeMinutes(edge, mode, current.node);
      const previousBest = distances.get(neighbor);

      if (previousBest !== undefined && previousBest <= nextCost) {
        continue;
      }

      distances.set(neighbor, nextCost);
      previousNode.set(neighbor, current.node);
      previousEdge.set(neighbor, edgeIndex);
      queue.push({ node: neighbor, cost: nextCost });
    }
  }

  if (!distances.has(endId)) {
    return null;
  }

  const nodePath = [endId];
  const edgePath: number[] = [];
  let current: NodeId = endId;

  while (current !== startId) {
    const prevNode = previousNode.get(current);
    const prevEdge = previousEdge.get(current);
    if (prevNode === undefined || prevEdge === undefined) {
      return null;
    }

    nodePath.push(prevNode);
    edgePath.push(prevEdge);
    current = prevNode;
  }

  nodePath.reverse();
  edgePath.reverse();
  return { nodePath, edgePath };
}

function appendSegmentCoordinates(
  coordinates: Coord[],
  segment: Coord[],
  reverse: boolean
): Coord[] {
  const segmentCoordinates = reverse ? [...segment].reverse() : segment;
  if (coordinates.length === 0) {
    return [...segmentCoordinates];
  }

  const merged = [...coordinates];
  for (const coordinate of segmentCoordinates) {
    const last = merged[merged.length - 1];
    if (!last || last[0] !== coordinate[0] || last[1] !== coordinate[1]) {
      merged.push(coordinate);
    }
  }

  return merged;
}

export function buildRouteSummary(
  graph: RoutingGraph,
  points: RoutingInputPoint[],
  mode: RoutingMode
): RouteSummary | null {
  if (points.length < 2) {
    return null;
  }

  const snappedNodeIds = points
    .map((point) => findNearestNodeId(graph, point))
    .filter((value): value is NodeId => value !== null);

  if (snappedNodeIds.length < 2) {
    return null;
  }

  let totalDistanceMeters = 0;
  let totalTimeMin = 0;
  let totalElevationGainM = 0;
  let totalElevationLossM = 0;
  const routeCoordinates: Coord[] = [];
  const profile: Array<{ distanceKm: number; elevationM: number }> = [];
  let profileDistanceMeters = 0;
  let profileElevationM = 0;

  const appendProfilePoint = (distanceMeters: number, elevationMeters: number): void => {
    const last = profile[profile.length - 1];
    if (!last || last.distanceKm !== distanceMeters / 1000 || last.elevationM !== elevationMeters) {
      profile.push({ distanceKm: distanceMeters / 1000, elevationM: elevationMeters });
    }
  };

  for (let index = 0; index < snappedNodeIds.length - 1; index += 1) {
    const startId = snappedNodeIds[index];
    const endId = snappedNodeIds[index + 1];
    const path = shortestPath(graph, startId, endId, mode);
    if (!path) {
      return null;
    }

    for (let pathIndex = 0; pathIndex < path.edgePath.length; pathIndex += 1) {
      const edgeIndex = path.edgePath[pathIndex];
      const edge = graph.edges[edgeIndex];
      const fromNode = path.nodePath[pathIndex];
      const toNode = path.nodePath[pathIndex + 1];
      const traversedGrade = edge.from === fromNode ? edge.grade : -edge.grade;
      const edgeElevationDeltaM = (traversedGrade / 100) * edge.length;
      const edgeGeometry = edge.from === fromNode ? edge.coords : [...edge.coords].reverse();
      const edgeGeometryLength = segmentLength(edgeGeometry);

      totalDistanceMeters += edge.length;
      totalTimeMin += edgeTravelTimeMinutes(edge, mode, fromNode);

       if (profile.length === 0) {
        appendProfilePoint(profileDistanceMeters, profileElevationM);
      }

      let edgeAccumulatedGeometryMeters = 0;
      for (let coordinateIndex = 1; coordinateIndex < edgeGeometry.length; coordinateIndex += 1) {
        const segmentMeters = distanceMeters(edgeGeometry[coordinateIndex - 1], edgeGeometry[coordinateIndex]);
        if (segmentMeters <= 0 || edgeGeometryLength <= 0) {
          continue;
        }

        edgeAccumulatedGeometryMeters += segmentMeters;
        const progress = Math.min(1, edgeAccumulatedGeometryMeters / edgeGeometryLength);
        const distanceOnRouteMeters = profileDistanceMeters + edge.length * progress;
        const elevationOnRouteM = profileElevationM + edgeElevationDeltaM * progress;
        appendProfilePoint(distanceOnRouteMeters, elevationOnRouteM);
      }

      profileDistanceMeters += edge.length;
      profileElevationM += edgeElevationDeltaM;
      if (edgeElevationDeltaM > 0) {
        totalElevationGainM += edgeElevationDeltaM;
      } else {
        totalElevationLossM += Math.abs(edgeElevationDeltaM);
      }

      const reverse = edge.from !== fromNode || edge.to !== toNode ? edge.to === fromNode : false;
      const segment = appendSegmentCoordinates([], edge.coords, reverse);
      if (routeCoordinates.length === 0) {
        routeCoordinates.push(...segment);
      } else {
        for (const coordinate of segment) {
          const last = routeCoordinates[routeCoordinates.length - 1];
          if (!last || last[0] !== coordinate[0] || last[1] !== coordinate[1]) {
            routeCoordinates.push(coordinate);
          }
        }
      }
    }
  }

  const distanceKm = totalDistanceMeters / 1000;
  const timeMin = totalTimeMin;

  const line = {
    type: 'Feature' as const,
    geometry: {
      type: 'LineString' as const,
      coordinates: routeCoordinates
    },
    properties: {}
  };

  const pointFeatures = points.map((point, index) => {
    const snappedId = snappedNodeIds[index] ?? snappedNodeIds[snappedNodeIds.length - 1];
    const node = snappedId !== undefined ? graph.nodes.get(snappedId) : undefined;
    const coordinate = node?.coord ?? [point.lng, point.lat];
    const kind: 'start' | 'waypoint' | 'end' = index === 0 ? 'start' : index === points.length - 1 ? 'end' : 'waypoint';
    const label = kind === 'start' ? 'A' : kind === 'end' ? 'B' : String(index);

    return {
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: coordinate },
      properties: { kind, label, index }
    };
  });

  return {
    distanceKm,
    timeMin,
    elevationGainM: totalElevationGainM,
    elevationLossM: totalElevationLossM,
    profile,
    line,
    points: {
      type: 'FeatureCollection' as const,
      features: pointFeatures
    }
  };
}
