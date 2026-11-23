import { readFile, writeFile } from "node:fs/promises";

const sourcePath = "C:/Users/Guilherme/.copilot/session-state/41833165-4408-4d18-ba1e-6b5503942953/files/catalogo_atacadao_pneus.json";
const source = JSON.parse(await readFile(sourcePath, "utf8"));

function normalizeProduct(product, index) {
  return {
    id: `extracted-${index + 1}`,
    brand: product.marca,
    name: product.nome,
    price: Number(product.price),
    originalPrice: Number(product.preco_original),
    image: product.imagem,
    slug: product.slug_categoria,
    productUrl: product.url_produto,
  };
}

const byRim = {};

for (const [slug, items] of Object.entries(source.categorias_por_aro || {})) {
  const match = slug.match(/^aro-(.+)$/i);
  if (!match) continue;

  let label;
  if (/15-5/i.test(slug)) {
    label = "Aro 15.5";
  } else {
    label = `Aro ${match[1].replace(/-/g, ".").replace(/c$/i, "")}`;
  }

  const normalized = (items || []).map(normalizeProduct);
  byRim[label] = [...(byRim[label] || []), ...normalized];
}

const byMeasure = {};
const measureLabels = [];

for (const [slug, items] of Object.entries(source.categorias_por_medida || {})) {
  if (!items || items.length === 0) continue;

  const firstName = items[0].nome || "";
  const measureMatch = firstName.match(/(\b\d+(?:[.,]\d+)?(?:X|\/)[\dX.]+(?:R\d+(?:[.,]\d+)*)?\b)/i);
  const label = measureMatch
    ? measureMatch[1].replace(/x/i, "X")
    : slug.replace(/^pneus?-?/i, "").replace(/-/g, "/");

  if (!label) continue;
  const existing = byMeasure[label] || [];
  const names = new Set(existing.map((product) => product.name));

  for (const item of items) {
    if (!names.has(item.nome)) {
      existing.push(normalizeProduct(item, existing.length));
      names.add(item.nome);
    }
  }

  byMeasure[label] = existing;
  measureLabels.push(label);
}

const uniqueMeasureLabels = [...new Set(measureLabels)].sort((a, b) =>
  a.localeCompare(b, "pt-BR", { numeric: true })
);

const content = `export const fullCatalog = ${JSON.stringify(
  { byRim, byMeasure, measureLabels: uniqueMeasureLabels },
  null,
  2
)};\n`;

await writeFile("src/data/fullCatalog.js", content);
console.log(JSON.stringify({
  rimCategories: Object.keys(byRim).length,
  measureCategories: uniqueMeasureLabels.length,
  extractedProducts: source.total_produtos_disponiveis,
}));
