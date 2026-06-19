function analyzeWorkload(tree) {
  if (!tree || !Array.isArray(tree)) return null;

  const stats = {
    totalPending: 0,
    focusCount: 0,
    focusTasks: [],
    levelDistribution: {},
    isOverloaded: false,
  };

  const traverse = (nodes) => {
    for (const node of nodes) {
      const item = node?.todo;
      if (!item) {
        if (node?.children && node.children.length > 0) {
          traverse(node.children);
        }
        continue;
      }
      if (!item.done) {
        stats.totalPending++;
        if (item.focus) {
          stats.focusCount++;
          stats.focusTasks.push(item.content);
        }
        const lv = item.level || "default";
        stats.levelDistribution[lv] = (stats.levelDistribution[lv] || 0) + 1;
      }
      if (node.children && node.children.length > 0) {
        traverse(node.children);
      }
    }
  };

  traverse(tree);

  let loadLevel = "relaxed";
  let advice = "";

  if (stats.focusCount > 2) {
    loadLevel = "extreme_parallel";
    stats.isOverloaded = true;
  } else if (stats.focusCount >= 1) {
    loadLevel = "engaged";
  }

  if (!stats.isOverloaded && stats.totalPending > 15) {
    loadLevel = "busy_backlog";
  }

  return {
    loadLevel,
    advice,
    totalPending: stats.totalPending,
    focusCount: stats.focusCount,
    focusTasks: stats.focusTasks,
    levelDistribution: stats.levelDistribution,
  };
}

/**
 * @param {import('@aicupa/api').PluginApi} api
 * @returns {import('@aicupa/api').Plugin}
 */
module.exports = (api) => {
  return {
    async analyze(params) {
      try {
        const res = await api.getTree(params?.filePath);
        const tree = res?.tree || res?.result?.tree || res;
        const result = analyzeWorkload(Array.isArray(tree) ? tree : []);
        return { ok: true, result };
      } catch (e) {
        return { ok: false, error: e.message };
      }
    },
  };
};
