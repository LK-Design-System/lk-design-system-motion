/**
 * The ambient types in src/types/lds-slides-ui.d.ts are a hand copy of an
 * upstream package that ships no .d.ts, and tsc only checks our USE of them —
 * never whether they still describe slides-ui. The copy said "alpha.6" while
 * the pin moved to alpha.11. This holds it to the package's own generated
 * catalogue.json: every declared export must exist, and every prop declared
 * on a component must be one the catalogue lists for it (own + inherited),
 * unless the component forwards its rest to an upstream it cannot list.
 *
 *   npm run check:slides-types
 *
 * SLIDES_CATALOGUE may point at a catalogue.json elsewhere (e.g. one pulled
 * out of the vendored tarball) when node_modules is not installed.
 */
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const cataloguePath = process.env.SLIDES_CATALOGUE
  ?? path.join(root, 'node_modules', '@lk-design-system', 'lds-slides-ui', 'catalogue.json');
const declarationsPath = path.join(root, 'src', 'types', 'lds-slides-ui.d.ts');

const catalogue = JSON.parse(await readFile(cataloguePath, 'utf8'));
const entries = [
  ...catalogue.layouts, ...catalogue.primitives, ...catalogue.deck, ...(catalogue.editorial ?? []),
];
const byName = new Map(entries.map((entry) => [entry.name, entry]));
const propsOf = (entry) => new Set([
  ...entry.props.map((prop) => prop.name),
  ...(entry.inherits?.props ?? []),
]);

const source = (await readFile(declarationsPath, 'utf8')).replace(/\r\n/g, '\n');
const problems = [];
// Catalogues from slides-ui releases whose generator did not yet record
// inherited or renamed props list only each component's own destructured
// names — `scale` (renamed) and every prop reached through ...rest look
// unknown against them. Prop checking waits for a catalogue that can answer;
// export names are checked either way.
const propAware = entries.some((entry) => 'inherits' in entry);

// Keys of an object type body, top level only (skip nested { … }).
function keysOf(body) {
  const keys = [];
  let depth = 0;
  for (const line of body.split('\n')) {
    const trimmed = line.trim();
    if (depth === 0) {
      const match = /^(['"]?[\w-]+['"]?)\??\s*:/.exec(trimmed);
      if (match && !trimmed.startsWith('//') && !trimmed.startsWith('*')) keys.push(match[1].replace(/['"]/g, ''));
    }
    depth += (line.match(/\{/g) ?? []).length - (line.match(/\}/g) ?? []).length;
  }
  return keys;
}

// SlideBase is spread onto every slide: its keys must be SlideSurface props.
const base = /interface SlideBase[^{]*\{([\s\S]*?)\n\t\}/.exec(source);
const surface = byName.get('SlideSurface');
if (base && surface && propAware) {
  const allowed = propsOf(surface);
  for (const key of keysOf(base[1])) {
    if (!allowed.has(key) && key !== 'style') problems.push(`SlideBase.${key}: SlideSurface has no such prop.`);
  }
}

const declared = [...source.matchAll(/export const (\w+): React\.FC<([\s\S]*?)>;\n/g)];
for (const [, name, type] of declared) {
  const entry = byName.get(name);
  if (!entry) {
    problems.push(`${name}: declared here but not exported by lds-slides-ui (per its catalogue).`);
    continue;
  }
  if (entry.forwardsTo || !propAware) continue;
  const allowed = propsOf(entry);
  const own = /\{([\s\S]*)\}/.exec(type);
  if (!own) continue;
  for (const key of keysOf(own[1])) {
    if (!allowed.has(key)) problems.push(`${name}.${key}: not a prop of ${name} in the catalogue.`);
  }
}

const undeclared = entries.map((entry) => entry.name).filter((name) => !declared.some(([, d]) => d === name));

if (problems.length > 0) {
  console.error(`lds-slides-ui ambient types drifted from the package:\n- ${problems.join('\n- ')}`);
  process.exit(1);
}
console.log(
  `Ambient lds-slides-ui types match the package catalogue: ${declared.length} declared exports`
  + (propAware ? ', props included.' : ' (props not checked: this catalogue predates inherited-prop records).')
  + (undeclared.length ? ` Not declared (fine until used): ${undeclared.join(', ')}.` : ''),
);
