#!/usr/bin/env node

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const inputPath = resolve(process.argv[2] ?? "data/vendor/xwines/XWines_Test_100_wines.csv");
const outputPath = resolve(process.argv[3] ?? "data/catalogs/xwines-test.json");

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (character === '"') {
      if (quoted && text[index + 1] === '"') {
        field += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === "," && !quoted) {
      row.push(field);
      field = "";
    } else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && text[index + 1] === "\n") index += 1;
      row.push(field);
      if (row.some((value) => value.length)) rows.push(row);
      row = [];
      field = "";
    } else {
      field += character;
    }
  }
  if (field.length || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

const parseList = (value) => {
  const content = value.trim().replace(/^\[/, "").replace(/\]$/, "");
  if (!content) return [];
  return content.split(/,\s*/).map((item) =>
    item.trim().replace(/^['"]|['"]$/g, "")).filter(Boolean);
};

const rows = parseCsv(readFileSync(inputPath, "utf8"));
const headers = rows.shift();
if (!headers || headers.length !== 17) throw new Error("Unexpected X-Wines CSV header.");

const items = rows.map((row) => {
  const record = Object.fromEntries(headers.map((header, index) => [header, row[index] ?? ""]));
  return {
    id: `xwine-${record.WineID}`,
    wineId: Number(record.WineID),
    name: record.WineName,
    type: record.Type,
    elaborate: record.Elaborate,
    grapes: parseList(record.Grapes),
    harmonize: parseList(record.Harmonize),
    alcoholByVolume: Number(record.ABV),
    body: record.Body,
    acidity: record.Acidity,
    countryCode: record.Code,
    country: record.Country,
    regionId: Number(record.RegionID),
    regionName: record.RegionName,
    wineryId: Number(record.WineryID),
    wineryName: record.WineryName,
    website: record.Website || undefined,
    vintages: parseList(record.Vintages),
  };
});

const catalog = {
  schemaVersion: "1.0",
  catalogType: "xwines-test",
  source: {
    title: "X-Wines Test dataset",
    repository: "https://github.com/rogerioxavier/X-Wines",
    datasetUrl: "https://github.com/rogerioxavier/X-Wines/blob/main/Dataset/last/XWines_Test_100_wines.csv",
    license: "CC0-1.0",
    citation: "de Azambuja, R. X.; Morais, A. J.; Filipe, V. X-Wines: A Wine Dataset for Recommender Systems and Machine Learning. BDCC 2023, 7, 20.",
  },
  items,
};

writeFileSync(outputPath, `${JSON.stringify(catalog, null, 2)}\n`, "utf8");
process.stdout.write(`Imported ${items.length} X-Wines records to ${outputPath}.\n`);
