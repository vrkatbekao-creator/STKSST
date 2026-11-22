#[cfg(target_arch = "wasm32")]
use std::cell::RefCell;
use std::cmp::Reverse;
use std::collections::{BinaryHeap, HashMap};
use std::hash::{BuildHasherDefault, Hasher};

// Keys come from the game's authenticated road graph and are numeric IDs.
#[derive(Default)]
struct RoadIdHasher(u64);

impl Hasher for RoadIdHasher {
    fn finish(&self) -> u64 {
        self.0
    }
    fn write(&mut self, bytes: &[u8]) {
        for &byte in bytes {
            self.write_u64(u64::from(byte));
        }
    }
    fn write_u32(&mut self, value: u32) {
        self.write_u64(u64::from(value));
    }
    fn write_u64(&mut self, value: u64) {
        self.0 = (self.0.rotate_left(5) ^ value).wrapping_mul(0x517c_c1b7_2722_0a95);
    }
    fn write_usize(&mut self, value: usize) {
        self.write_u64(value as u64);
    }
    fn write_isize(&mut self, value: isize) {
        self.write_u64(value as u64);
    }
}

type RoadFrontier = HashMap<(u32, Option<u64>), Vec<usize>, BuildHasherDefault<RoadIdHasher>>;

#[cfg(target_arch = "wasm32")]
#[link(wasm_import_module = "env")]
extern "C" {
    fn vehicle_weight(edge: u32) -> u32;
    fn vehicle_turn(node: u32, incoming: u32, outgoing: u32) -> u32;
}

struct Graph {
    offsets: Vec<u32>,
    targets: Vec<u32>,
    ways: Vec<u64>,
    distances: Vec<u32>,
    points: Vec<[f64; 3]>,
    reverse: Incoming,
}

struct Incoming {
    offsets: Vec<u32>,
    edges: Vec<(u32, u32)>,
}

impl Graph {
    fn incoming(offsets: &[u32], targets: &[u32], distances: &[u32]) -> Incoming {
        let mut starts = vec![0; offsets.len()];
        for &node in targets {
            starts[node as usize + 1] += 1;
        }
        for i in 1..starts.len() {
            starts[i] += starts[i - 1];
        }
        let mut next = starts.clone();
        let mut edges = vec![(0, 0); targets.len()];
        for (node, pair) in offsets.windows(2).enumerate() {
            for edge in pair[0] as usize..pair[1] as usize {
                let cursor = &mut next[targets[edge] as usize];
                edges[*cursor as usize] = (node as u32, distances[edge]);
                *cursor += 1;
            }
        }
        Incoming {
            offsets: starts,
            edges,
        }
    }

    // Ignore turn restrictions and weather. The resulting distance is a lower bound
    // on every legal continuation, including trips for which no continuation exists.
    fn distance_to_stops(&self, stops: &[Stop]) -> Vec<u64> {
        let mut distance = vec![u64::MAX; self.points.len()];
        let mut queue = BinaryHeap::new();
        for stop in stops {
            if distance[stop.node as usize] != 0 {
                distance[stop.node as usize] = 0;
                queue.push(Reverse((0u64, stop.node)));
            }
        }
        while let Some(Reverse((cost, node))) = queue.pop() {
            if cost != distance[node as usize] {
                continue;
            }
            let at = node as usize;
            let start = self.reverse.offsets[at] as usize;
            let end = self.reverse.offsets[at + 1] as usize;
            for &(from, edge) in &self.reverse.edges[start..end] {
                let next = cost + u64::from(edge);
                if next < distance[from as usize] {
                    distance[from as usize] = next;
                    queue.push(Reverse((next, from)));
                }
            }
        }
        distance
    }
}

#[cfg(target_arch = "wasm32")]
fn read_u32(bytes: &[u8], at: usize) -> Option<u32> {
    Some(u32::from_le_bytes(bytes.get(at..at + 4)?.try_into().ok()?))
}

#[cfg(target_arch = "wasm32")]
fn read_u64(bytes: &[u8], at: usize) -> Option<u64> {
    Some(u64::from_le_bytes(bytes.get(at..at + 8)?.try_into().ok()?))
}

#[cfg(target_arch = "wasm32")]
impl Graph {
    fn parse(bytes: &[u8]) -> Option<Self> {
        if read_u32(bytes, 0)? != 0x33504756 || read_u32(bytes, 12)? != 0 {
            return None;
        }
        let n = read_u32(bytes, 4)? as usize;
        let m = read_u32(bytes, 8)? as usize;
        if n == 0 || n > 2_000_000 || m > 5_000_000 {
            return None;
        }
        let lon = 16 + 8 * n;
        let lat = lon + 8 * n;
        let off = lat + 8 * n;
        let target = off + 4 * (n + 1);
        let way = (target + 4 * m + 7) & !7;
        let metres = way + 8 * m;
        if bytes.len() != metres + 8 * m {
            return None;
        }
        let offsets: Vec<u32> = (0..=n)
            .map(|i| read_u32(bytes, off + 4 * i).unwrap())
            .collect();
        if offsets[0] != 0 || offsets[n] as usize != m || offsets.windows(2).any(|p| p[0] > p[1]) {
            return None;
        }
        let mut points = Vec::with_capacity(n);
        for i in 0..n {
            let x = f64::from_bits(read_u64(bytes, lon + 8 * i)?);
            let y = f64::from_bits(read_u64(bytes, lat + 8 * i)?);
            if !(x.abs() <= 180.0 && y.abs() <= 90.0) {
                return None;
            }
            let (x, y) = (x.to_radians(), y.to_radians());
            let c = y.cos() * 6_371_000.0;
            points.push([c * x.cos(), c * x.sin(), 6_371_000.0 * y.sin()]);
        }
        let mut targets = Vec::with_capacity(m);
        let mut ways = Vec::with_capacity(m);
        let mut distances = Vec::with_capacity(m);
        for i in 0..m {
            let to = read_u32(bytes, target + 4 * i)?;
            let d = f64::from_bits(read_u64(bytes, metres + 8 * i)?);
            let quarters = (d * 4.0).round();
            if to as usize >= n || !(d > 0.0 && quarters <= f64::from(u32::MAX)) {
                return None;
            }
            targets.push(to);
            ways.push(read_u64(bytes, way + 8 * i)?);
            distances.push(quarters.max(1.0) as u32);
        }
        let reverse = Self::incoming(&offsets, &targets, &distances);
        Some(Self {
            offsets,
            targets,
            ways,
            distances,
            points,
            reverse,
        })
    }
}

#[derive(Clone, Copy)]
struct Stop {
    node: u32,
    ap: u32,
    metres: f64,
}

#[derive(Clone, Copy)]
struct Label {
    node: u32,
    origin: usize,
    actual: u64,
    weighted: u64,
    previous: Option<(usize, u32)>,
    active: bool,
}

struct Budget {
    ap: u64,
    supplies: u64,
    previous_weighted: u64,
    previous_actual: u64,
    per_ap: u64,
    per_supply: u64,
}

fn allowance(previous: u64, added: u64, divisor: u64) -> u64 {
    (previous + added).div_ceil(divisor) - previous.div_ceil(divisor)
}

fn chord(a: [f64; 3], b: [f64; 3]) -> f64 {
    ((a[0] - b[0]).powi(2) + (a[1] - b[1]).powi(2) + (a[2] - b[2]).powi(2)).sqrt()
}

struct Search<'a> {
    graph: &'a Graph,
    origins: &'a [Stop],
    labels: Vec<Label>,
    frontier: RoadFrontier,
    queue: BinaryHeap<Reverse<(u64, usize)>>,
    estimates: Vec<Option<u32>>,
    center: [f64; 3],
    radius: f64,
    per_ap: u64,
    walk_costs: Option<&'a [u32]>,
    destination_count: usize,
}

impl Search<'_> {
    fn key(&self, label: Label) -> (u32, Option<u64>) {
        (
            label.node,
            label
                .previous
                .map(|(_, edge)| self.graph.ways[edge as usize]),
        )
    }

    fn estimate(&mut self, node: u32) -> u64 {
        u64::from(*self.estimates[node as usize].get_or_insert_with(|| {
            let metres =
                (chord(self.graph.points[node as usize], self.center) - self.radius - 1.0).max(0.0);
            // Keep the same conservative lower bound for per-edge quarter-metre rounding.
            (metres * 2.6).floor() as u32
        }))
    }

    fn insert(&mut self, label: Label) {
        let key = self.key(label);
        let dominates = |a: Label, b: Label| {
            let (a_stop, b_stop) = (self.origins[a.origin], self.origins[b.origin]);
            a_stop.ap <= b_stop.ap
                && self.walk_costs.is_none_or(|costs| (0..self.destination_count).all(|i|
                    costs[a.origin*self.destination_count+i] <= costs[b.origin*self.destination_count+i]))
                && a_stop.metres <= b_stop.metres
                && a.actual <= b.actual
                && a.weighted <= b.weighted
        };
        let entries = self.frontier.entry(key).or_default();
        if entries.iter().any(|&i| dominates(self.labels[i], label)) {
            return;
        }
        entries.retain(|&i| {
            if dominates(label, self.labels[i]) {
                self.labels[i].active = false;
            }
            self.labels[i].active
        });
        let id = self.labels.len();
        self.labels.push(label);
        entries.push(id);
        let priority = label.weighted
            + u64::from(self.origins[label.origin].ap) * self.per_ap
            + self.estimate(label.node);
        self.queue.push(Reverse((priority, id)));
    }
}

fn plan(
    graph: &Graph,
    origins: &[Stop],
    destinations: &[Stop],
    budget: Budget,
    weight: impl Fn(u32) -> u32,
    turn: impl Fn(u32, u32, u32) -> bool,
    expanded: &mut u32,
    walk_costs: Option<&[u32]>,
) -> Option<Vec<u32>> {
    if origins.is_empty() || destinations.is_empty() {
        return None;
    }
    let mut targets = HashMap::<u32, Vec<usize>>::new();
    let mut center = [0.0; 3];
    for (i, stop) in destinations.iter().enumerate() {
        if !targets.contains_key(&stop.node) {
            for (total, coord) in center.iter_mut().zip(graph.points[stop.node as usize]) {
                *total += coord;
            }
        }
        targets.entry(stop.node).or_default().push(i);
    }
    for coord in &mut center {
        *coord /= targets.len() as f64;
    }
    let radius = targets
        .keys()
        .map(|&i| chord(center, graph.points[i as usize]))
        .fold(0.0, f64::max);
    let min_alight = destinations
        .iter()
        .map(|stop| stop.metres)
        .fold(f64::INFINITY, f64::min);
    let min_alight_ap = if walk_costs.is_some() {0} else {u64::from(destinations.iter().map(|stop| stop.ap).min()?)};
    let remaining_distance = graph.distance_to_stops(destinations);
    let mut search = Search {
        graph,
        origins,
        labels: Vec::new(),
        frontier: RoadFrontier::default(),
        queue: BinaryHeap::new(),
        estimates: vec![None; graph.points.len()],
        center,
        radius,
        per_ap: budget.per_ap,
        walk_costs,
        destination_count: destinations.len(),
    };
    for (origin, stop) in origins.iter().enumerate() {
        if u64::from(stop.ap) <= budget.ap {
            search.insert(Label {
                node: stop.node,
                origin,
                actual: 0,
                weighted: 0,
                previous: None,
                active: true,
            });
        }
    }
    let mut best_ap = budget.ap;
    let mut best_distance = f64::INFINITY;
    let mut best = None;
    while let Some(Reverse((_, id))) = search.queue.pop() {
        let label = search.labels[id];
        if !label.active {
            continue;
        }
        let origin = origins[label.origin];
        let estimate = search.estimate(label.node);
        let lower = u64::from(origin.ap)
            + allowance(
                budget.previous_weighted,
                label.weighted + estimate,
                budget.per_ap,
            );
        if lower + min_alight_ap > best_ap {
            break;
        }
        let network_distance = remaining_distance[label.node as usize];
        if network_distance == u64::MAX {
            continue;
        }
        let optimistic_distance = estimate.max(network_distance);
        let optimistic_ap = u64::from(origin.ap)
            + min_alight_ap
            + allowance(
                budget.previous_weighted,
                label.weighted + optimistic_distance,
                budget.per_ap,
            );
        if optimistic_ap > best_ap
            || allowance(
                budget.previous_actual,
                label.actual + optimistic_distance,
                budget.per_supply,
            ) > budget.supplies
        {
            continue;
        }
        if optimistic_ap == best_ap
            && origin.metres + (label.actual + optimistic_distance) as f64 / 4.0 + min_alight
                > best_distance
        {
            continue;
        }
        *expanded = expanded.saturating_add(1);
        if label.previous.is_some() {
            for &i in targets.get(&label.node).into_iter().flatten() {
                let dest = destinations[i];
                let walking = walk_costs.map_or(u64::from(origin.ap)+u64::from(dest.ap),
                    |costs| u64::from(costs[label.origin*destinations.len()+i]));
                let ap = walking
                    + allowance(budget.previous_weighted, label.weighted, budget.per_ap);
                let distance = origin.metres + dest.metres + label.actual as f64 / 4.0;
                if ap < best_ap || (ap == best_ap && distance < best_distance) {
                    best = Some((id, i));
                    best_ap = ap;
                    best_distance = distance;
                }
            }
        }
        let node = label.node as usize;
        for edge in graph.offsets[node]..graph.offsets[node + 1] {
            if label
                .previous
                .is_some_and(|(_, incoming)| !turn(label.node, incoming, edge))
            {
                continue;
            }
            let quarters = weight(edge);
            if !(4..=7).contains(&quarters) {
                return None;
            }
            let d = u64::from(graph.distances[edge as usize]);
            let actual = label.actual + d;
            let weighted = label.weighted + (d * u64::from(quarters)).div_ceil(4);
            let ap =
                u64::from(origin.ap) + allowance(budget.previous_weighted, weighted, budget.per_ap);
            if ap + min_alight_ap > best_ap
                || allowance(budget.previous_actual, actual, budget.per_supply) > budget.supplies
            {
                continue;
            }
            search.insert(Label {
                node: graph.targets[edge as usize],
                origin: label.origin,
                actual,
                weighted,
                previous: Some((id, edge)),
                active: true,
            });
        }
    }
    let (mut id, destination) = best?;
    let origin = search.labels[id].origin;
    let mut output = Vec::new();
    while let Some((previous, edge)) = search.labels[id].previous {
        output.push(edge);
        id = previous;
    }
    output.push(destination as u32);
    output.push(origin as u32);
    output.reverse();
    Some(output)
}

#[cfg(target_arch = "wasm32")]
thread_local! {
    static GRAPH: RefCell<Option<Graph>> = const { RefCell::new(None) };
    static POLICY: RefCell<Option<PreparedPolicy>> = const { RefCell::new(None) };
    static EXPANDED: std::cell::Cell<u32> = const { std::cell::Cell::new(0) };
}

#[cfg(target_arch = "wasm32")]
struct PreparedPolicy {
    districts: Vec<u8>,
    forbidden: HashMap<(u32, u64), Vec<u32>>,
    restricted_incoming: Vec<bool>,
}

#[cfg(target_arch = "wasm32")]
impl PreparedPolicy {
    fn parse(graph: &Graph, bytes: &[u8]) -> Option<Self> {
        let nodes = read_u32(bytes, 4)? as usize;
        let count = read_u32(bytes, 8)? as usize;
        if read_u32(bytes, 0)? != 0x31505652
            || nodes != graph.points.len()
            || count > bytes.len() / 8
            || bytes.len() != 12 + count * 8 + nodes
        {
            return None;
        }
        let mut forbidden = HashMap::<(u32, u64), Vec<u32>>::new();
        let mut restricted_incoming = vec![false; graph.targets.len()];
        for i in 0..count {
            let incoming = read_u32(bytes, 12 + i * 8)? as usize;
            let outgoing = read_u32(bytes, 16 + i * 8)?;
            let node = *graph.targets.get(incoming)?;
            let at = node as usize;
            if !(graph.offsets[at]..graph.offsets[at + 1]).contains(&outgoing) {
                return None;
            }
            forbidden
                .entry((node, graph.ways[incoming]))
                .or_default()
                .push(outgoing);
        }
        for (edge, (&node, &way)) in graph.targets.iter().zip(&graph.ways).enumerate() {
            restricted_incoming[edge] = forbidden.contains_key(&(node, way));
        }
        Some(Self {
            districts: bytes[12 + count * 8..].to_vec(),
            forbidden,
            restricted_incoming,
        })
    }

    fn allows(&self, graph: &Graph, node: u32, incoming: u32, outgoing: u32) -> bool {
        let edge = incoming as usize;
        !self.restricted_incoming[edge]
            || !self.forbidden[&(node, graph.ways[edge])].contains(&outgoing)
    }
}

#[cfg(target_arch = "wasm32")]
#[no_mangle]
pub extern "C" fn vehicle_init() -> u32 {
    crate::RUNTIME.with_borrow_mut(|runtime| {
        let graph = Graph::parse(&std::mem::take(&mut runtime.input));
        let ok = graph.is_some();
        GRAPH.with_borrow_mut(|stored| *stored = graph);
        POLICY.with_borrow_mut(|stored| *stored = None);
        u32::from(ok)
    })
}

#[cfg(target_arch = "wasm32")]
#[no_mangle]
pub extern "C" fn vehicle_prepare() -> u32 {
    let policy = crate::RUNTIME.with_borrow(|runtime| {
        GRAPH.with_borrow(|graph| PreparedPolicy::parse(graph.as_ref()?, &runtime.input))
    });
    let ok = policy.is_some();
    POLICY.with_borrow_mut(|stored| *stored = policy);
    u32::from(ok)
}

#[cfg(target_arch = "wasm32")]
#[no_mangle]
pub extern "C" fn vehicle_search_labels() -> u32 {
    EXPANDED.get()
}

#[cfg(target_arch = "wasm32")]
#[no_mangle]
pub extern "C" fn vehicle_walk_matrix_version() -> u32 { 1 }

#[cfg(target_arch = "wasm32")]
#[no_mangle]
pub extern "C" fn vehicle_query(
    origins: u32,
    destinations: u32,
    ap: u32,
    supplies: u32,
    previous_weighted: u64,
    previous_actual: u64,
    per_ap: u32,
    per_supply: u32,
    rain: u32,
    works: u32,
) -> u32 {
    EXPANDED.set(0);
    crate::RUNTIME.with_borrow_mut(|runtime| {
        GRAPH.with_borrow(|stored| {
            runtime.output.clear();
            let Some(graph) = stored.as_ref() else {
                return 0;
            };
            let input = &runtime.input;
            let Some(count) = (origins as usize).checked_add(destinations as usize) else {return 0;};
            let Some(pairs) = (origins as usize).checked_mul(destinations as usize) else {return 0;};
            if count > 100_000 || pairs > 1_000_000 {return 0;}
            let has_matrix = input.len() == count * 16 + pairs * 4;
            if (!has_matrix && input.len() != count * 16)
                || per_ap == 0
                || per_supply == 0
                || previous_weighted > (1 << 53)
                || previous_actual > (1 << 53)
            {
                return 0;
            }
            let mut stops = Vec::with_capacity(count);
            for i in 0..count {
                let at = i * 16;
                let node = read_u32(input, at).unwrap();
                let ap = read_u32(input, at + 4).unwrap();
                let metres = f64::from_bits(read_u64(input, at + 8).unwrap());
                if node as usize >= graph.points.len() || !(0.0..=600.0).contains(&metres) {
                    return 0;
                }
                stops.push(Stop { node, ap, metres });
            }
            let (origins, destinations) = stops.split_at(origins as usize);
            let costs: Option<Vec<u32>> = has_matrix.then(|| input[count*16..].chunks_exact(4)
                .map(|bytes| u32::from_le_bytes(bytes.try_into().unwrap())).collect());
            if costs.as_ref().is_some_and(|costs| costs.iter().enumerate().any(|(i,cost)|
                *cost < origins[i/destinations.len()].ap || *cost > 100_000)) {return 0;}
            let budget = Budget {
                ap: u64::from(ap),
                supplies: u64::from(supplies),
                previous_weighted,
                previous_actual,
                per_ap: u64::from(per_ap),
                per_supply: u64::from(per_supply),
            };
            let mut expanded = 0;
            let result = POLICY.with_borrow(|policy| {
                match policy.as_ref().filter(|_| rain <= 1 && works <= 255) {
                    Some(policy) => plan(
                        graph,
                        origins,
                        destinations,
                        budget,
                        |edge| {
                            4 + rain
                                + 2 * u32::from(
                                    works != 0
                                        && u32::from(
                                            policy.districts[graph.targets[edge as usize] as usize],
                                        ) == works,
                                )
                        },
                        |node, incoming, outgoing| policy.allows(graph, node, incoming, outgoing),
                        &mut expanded,
                        costs.as_deref(),
                    ),
                    None => plan(
                        graph,
                        origins,
                        destinations,
                        budget,
                        |edge| unsafe { vehicle_weight(edge) },
                        |node, incoming, outgoing| unsafe {
                            vehicle_turn(node, incoming, outgoing) != 0
                        },
                        &mut expanded,
                        costs.as_deref(),
                    ),
                }
            });
            EXPANDED.set(expanded);
            if let Some(output) = result {
                runtime.output = output;
                1
            } else {
                0
            }
        })
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn shared_walking_costs_preserve_the_better_connector_origin() {
        let offsets=vec![0,1,1];let targets=vec![1];let distances=vec![40];
        let graph=Graph{reverse:Graph::incoming(&offsets,&targets,&distances),offsets,targets,distances,
            ways:vec![7],points:vec![[0.0;3];2]};
        let origins=[Stop{node:0,ap:0,metres:0.0},Stop{node:0,ap:1,metres:100.0}];
        let destinations=[Stop{node:1,ap:1,metres:100.0}];
        let budget=Budget{ap:3,supplies:1,previous_weighted:0,previous_actual:0,per_ap:100,per_supply:100};
        assert_eq!(plan(&graph,&origins,&destinations,budget,|_|4,|_,_,_|true,&mut 0,Some(&[2,1])),Some(vec![1,0,0]));
    }

    #[test]
    fn reverse_distance_respects_one_way_edges_and_uses_best_stop() {
        let offsets = vec![0, 1, 2, 3, 3, 3];
        let targets = vec![1, 2, 3];
        let distances = vec![40, 15, 20];
        let graph = Graph {
            reverse: Graph::incoming(&offsets, &targets, &distances),
            offsets,
            targets,
            distances,
            ways: vec![7, 8, 9],
            points: vec![[0.0; 3]; 5],
        };
        let stop = |node| Stop {
            node,
            ap: 1,
            metres: 100.0,
        };
        assert_eq!(
            graph.distance_to_stops(&[stop(2), stop(3)]),
            vec![55, 15, 0, 0, u64::MAX]
        );
        assert_eq!(
            graph.distance_to_stops(&[stop(0)]),
            vec![0, u64::MAX, u64::MAX, u64::MAX, u64::MAX]
        );
    }

    #[test]
    fn revisits_a_junction_by_a_legal_way_and_uses_prepaid_allowance() {
        let offsets = vec![0, 2, 3, 4, 4];
        let targets = vec![1, 2, 3, 1];
        let distances = vec![10, 20, 10, 20];
        let graph = Graph {
            reverse: Graph::incoming(&offsets, &targets, &distances),
            offsets,
            targets,
            ways: vec![7, 8, 9, 8],
            distances,
            points: vec![[0.0; 3]; 4],
        };
        let start = Stop {
            node: 0,
            ap: 0,
            metres: 0.0,
        };
        let end = Stop {
            node: 3,
            ap: 0,
            metres: 0.0,
        };
        let budget = || Budget {
            ap: 0,
            supplies: 0,
            previous_weighted: 1,
            previous_actual: 1,
            per_ap: 100,
            per_supply: 100,
        };
        let turn = |_: u32, incoming, outgoing| !(incoming == 0 && outgoing == 2);
        assert_eq!(
            plan(&graph, &[start], &[end], budget(), |_| 7, turn, &mut 0, None),
            Some(vec![0, 0, 1, 3, 2])
        );
        assert!(plan(
            &graph,
            &[start],
            &[end],
            Budget {
                previous_actual: 0,
                ..budget()
            },
            |_| 4,
            turn,
            &mut 0,
            None,
        )
        .is_none());
    }
}
