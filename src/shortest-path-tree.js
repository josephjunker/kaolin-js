
const PriorityQueue = () => {
  const x = [];

  return {
    add: (item, cost) => {
      let i = 0;
      while (i < x.length) {
        if (x[i].cost > cost) {
          x.splice(i, 0, { item, cost });
          return;
        }
        i++;
      }
      x.push({item, cost});
    },
    pop: () => x.shift().item,
    length: () => x.length
  };
};

// nodes is a list of names
// edges is a list of name pairs
export default (nodes, edges, root) => {

  const distances = nodes.reduce((obj, name) => {
          obj[name] = name === root ? 0 : Infinity;
          return obj;
        }, {}),
        toVisit = PriorityQueue(),
        connections = edges.reduce((edgesBySource, [from, to]) => {
          if (!edgesBySource[from]) edgesBySource[from] = [];
          edgesBySource[from].push(to);
          return edgesBySource;
        }, {}),
        nextStepsTowardsRoot = {};

  toVisit.add(root, 0);

  while (toVisit.length()) {
    const currentNode = toVisit.pop(),
          destinations = connections[currentNode];
    if (!destinations) continue;
    for (let destination of destinations) {
      if (distances[destination] > distances[currentNode] + 1) {
        distances[destination] = distances[currentNode] + 1;
        toVisit.add(destination, distances[destination]);
        nextStepsTowardsRoot[destination] = currentNode;
      }
    }
  }

  return Object.keys(nextStepsTowardsRoot)
           .map(from => {
             let next = nextStepsTowardsRoot[from];
             const path = [from, next];
             while (next !== root) {
               next = nextStepsTowardsRoot[next];
               path.push(next);
             }
             return path;
           })
           .sort(([from1], [from2]) => from1 > from2);
};

