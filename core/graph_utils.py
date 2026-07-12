from collections import deque, defaultdict

class DiscoveryGraph:
    """
    Deterministic social graph utility.
    Computes social distance without identity assumptions.
    """

    def __init__(self, edges=None):
        """
        edges: optional dict {user: [connected_users]}
        """
        self.graph = defaultdict(list)
        if edges:
            for u, vs in edges.items():
                for v in vs:
                    self.graph[u].append(v)
                    self.graph[v].append(u)

    def get_social_distance(self, src, dst, max_depth=4):
        """
        Breadth-first search to compute shortest path.
        Returns distance or max_depth + 1 if unreachable.
        """
        if src == dst:
            return 0

        visited = set([src])
        queue = deque([(src, 0)])

        while queue:
            node, depth = queue.popleft()
            if depth >= max_depth:
                continue

            for neighbor in self.graph.get(node, []):
                if neighbor == dst:
                    return depth + 1
                if neighbor not in visited:
                    visited.add(neighbor)
                    queue.append((neighbor, depth + 1))

        # Treat unknown / disconnected as distant
        return max_depth + 1
