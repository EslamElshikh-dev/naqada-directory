import postcss from 'postcss';

export function cleanGlobalStyles(css, retiredClasses) {
  const root = postcss.parse(css);
  let removedSelectors = 0;
  let removedDeclarations = 0;
  root.walkRules((rule) => {
    if (rule.parent.type === 'atrule' && rule.parent.name.includes('keyframes')) return;
    const selectors = rule.selectors.filter((selector) => {
      // Keep negation, alternatives, relational selectors, attribute values,
      // and escapes intact. A class in them need not be a required match.
      if (/:(?:is|where|not|has)\(|\[|\\/.test(selector)) return true;
      const retired = [...selector.matchAll(/\.([_a-zA-Z][\w-]*)/g)]
        .some((match) => retiredClasses.has(match[1]));
      if (retired) removedSelectors += 1;
      return !retired;
    });
    if (!selectors.length) rule.remove();
    else rule.selectors = selectors;
  });

  const declarations = [];
  root.walkDecls((declaration) => declarations.push(declaration));
  const seen = new Set();
  for (const declaration of declarations.toReversed()) {
    if (declaration.parent.type !== 'rule') continue;
    const contexts = [];
    let safeContext = true;
    for (let parent = declaration.parent.parent; parent.type !== 'root'; parent = parent.parent) {
      if (parent.type !== 'atrule' || !['media', 'supports', 'container'].includes(parent.name)) {
        safeContext = false;
        break;
      }
      contexts.push([parent.name, parent.params]);
    }
    if (!safeContext) continue;
    // Only identical values are redundant. Preserve different fallback values,
    // importance, conditional contexts, and the established cascade order.
    const key = JSON.stringify([contexts, declaration.parent.selector, declaration.prop, declaration.value, Boolean(declaration.important)]);
    if (seen.has(key)) {
      declaration.remove();
      removedDeclarations += 1;
    } else seen.add(key);
  }
  root.walkRules((rule) => { if (!rule.nodes.length) rule.remove(); });
  root.walkAtRules((rule) => {
    if (['media', 'supports', 'container'].includes(rule.name) && !rule.nodes?.length) rule.remove();
  });
  return { css: root.toString(), removedSelectors, removedDeclarations };
}
