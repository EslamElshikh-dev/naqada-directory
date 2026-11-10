// A page may describe the same entity in more than one script (e.g. credits
// and the site's main graph). Combine its top-level properties before auditing.
export function readJsonLd(text) {
  const nodes = [];
  const byId = new Map();
  function add(value) {
    if (Array.isArray(value)) return value.forEach(add);
    if (value['@graph']) return add(value['@graph']);
    const id = value['@id'];
    if (id && byId.has(id)) Object.assign(byId.get(id), value);
    else {
      const node = { ...value };
      nodes.push(node);
      if (id) byId.set(id, node);
    }
  }
  for (const [, json] of text.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)) {
    add(JSON.parse(json));
  }
  return nodes;
}
