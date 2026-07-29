/**
 * Read Perfumas Excel workbooks into normalized row objects.
 */

import * as XLSX from "xlsx";
import { toNum } from "./sheet-maps";

export type EssenceRow = {
  code: string;
  contratipo: string;
  house: string;
  gender: "dama" | "caballero";
  pricePerGram: number;
  wholesalePerGram?: number;
  groupLabel?: string;
};

export type BottleRow = {
  code: string;
  name: string;
  price: number;
  wholesalePrice?: number;
};

export type PreparedReplicaRow = {
  code: string;
  name: string;
  /** Full prepared perfume (UNITARIO) — what Crear step 2 should show */
  price: number;
  /** Empty bottle component (PRECIO ENVASE) — insumos / cost only */
  bottlePrice?: number;
  wholesalePrice?: number;
  refillPrice?: number;
};

export type GenericSkuRow = {
  code: string;
  name: string;
  price: number;
  wholesalePrice?: number;
  sheet: string;
};

export type ParsedCatalog = {
  essences: EssenceRow[];
  bottles: BottleRow[];
  preparedReplicas: PreparedReplicaRow[];
  splashEtc: GenericSkuRow[];
  bisuteria: GenericSkuRow[];
  accesorios: GenericSkuRow[];
  plasticPackaging: GenericSkuRow[];
  aseo: GenericSkuRow[];
};

function sheetRows(wb: XLSX.WorkBook, name: string): unknown[][] {
  const exact = wb.SheetNames.find((n) => n.trim() === name.trim());
  const fuzzy =
    exact ||
    wb.SheetNames.find((n) => n.trim().toLowerCase().includes(name.trim().toLowerCase()));
  if (!fuzzy) return [];
  const sh = wb.Sheets[fuzzy];
  return XLSX.utils.sheet_to_json<unknown[]>(sh, { header: 1, defval: null, raw: true });
}

function findSheet(wb: XLSX.WorkBook, needle: string): string | null {
  const n = needle.toLowerCase();
  return (
    wb.SheetNames.find((s) => s.trim().toLowerCase() === n) ||
    wb.SheetNames.find((s) => s.trim().toLowerCase().includes(n)) ||
    null
  );
}

function cell(row: unknown[], i: number): unknown {
  return row?.[i] ?? null;
}

function str(v: unknown): string {
  if (v == null) return "";
  return String(v).trim();
}

function pickWholesale(...candidates: unknown[]): number | undefined {
  for (const c of candidates) {
    const n = toNum(c);
    if (n != null && n > 0) return n;
  }
  return undefined;
}

function parseEssenceSheet(
  rows: unknown[][],
  gender: "dama" | "caballero"
): EssenceRow[] {
  const out: EssenceRow[] = [];
  // Header is usually row index 3; data from 4
  for (let i = 4; i < rows.length; i++) {
    const row = rows[i];
    if (!row) continue;
    const code = str(cell(row, 0));
    const contratipo = str(cell(row, 1));
    const house = str(cell(row, 2));
    const pricePerGram = toNum(cell(row, 6)); // Gramo sin envase
    if (!contratipo || pricePerGram == null || pricePerGram <= 0) continue;
    // 100 gr 5% descuento as wholesale proxy when present
    const wholesalePerGram = pickWholesale(cell(row, 9), cell(row, 10));
    out.push({
      code: code || String(i),
      contratipo,
      house: house || "Perfumas",
      gender,
      pricePerGram,
      wholesalePerGram:
        wholesalePerGram != null
          ? Math.round(wholesalePerGram / 100) // 100g pack → per gram
          : undefined,
    });
  }
  return out;
}

function parseGroupSheet(rows: unknown[][]): Map<string, string> {
  const map = new Map<string, string>();
  const start = str(cell(rows[0] || [], 0)).toLowerCase().includes("cód") ||
    str(cell(rows[0] || [], 0)).toLowerCase().includes("cod")
    ? 1
    : 0;
  for (let i = start; i < rows.length; i++) {
    const row = rows[i];
    if (!row) continue;
    const contratipo = str(cell(row, 1));
    const group = str(cell(row, 3));
    if (!contratipo || !group) continue;
    map.set(normalizeKey(contratipo), group);
  }
  return map;
}

function normalizeKey(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function parseEnvPer(rows: unknown[][]): BottleRow[] {
  const out: BottleRow[] = [];
  for (let i = 4; i < rows.length; i++) {
    const row = rows[i];
    if (!row) continue;
    const code = str(cell(row, 0));
    const name = str(cell(row, 1));
    const price = toNum(cell(row, 2));
    if (!name || price == null || price <= 0) continue;
    out.push({
      code: code || `env-${i}`,
      name,
      price,
      wholesalePrice: pickWholesale(cell(row, 4), cell(row, 3), cell(row, 5)),
    });
  }
  return out;
}

function parseRepPre(rows: unknown[][]): PreparedReplicaRow[] {
  const out: PreparedReplicaRow[] = [];
  for (let i = 4; i < rows.length; i++) {
    const row = rows[i];
    if (!row) continue;
    const code = str(cell(row, 0));
    const name = str(cell(row, 1));
    // cols: CODIGO, NOMBRE, PRECIO ENVASE, UNITARIO, RECARGA, MAYOR…
    const bottlePrice = toNum(cell(row, 2)) ?? undefined;
    const price = toNum(cell(row, 3));
    if (!name || price == null || price <= 0) continue;
    out.push({
      code: code || `rep-${i}`,
      name,
      price,
      bottlePrice,
      wholesalePrice: pickWholesale(cell(row, 6), cell(row, 5), cell(row, 7)),
      refillPrice: toNum(cell(row, 4)) ?? undefined,
    });
  }
  return out;
}

function parseGenericSkuSheet(
  rows: unknown[][],
  sheet: string,
  opts: { nameCol: number; priceCol: number; codeCol?: number; wholesaleCols?: number[]; startRow?: number }
): GenericSkuRow[] {
  const out: GenericSkuRow[] = [];
  const start = opts.startRow ?? 4;
  for (let i = start; i < rows.length; i++) {
    const row = rows[i];
    if (!row) continue;
    const code = str(cell(row, opts.codeCol ?? 0));
    const name = str(cell(row, opts.nameCol));
    const price = toNum(cell(row, opts.priceCol));
    if (!name || price == null || price <= 0) continue;
    const wholesalePrice = opts.wholesaleCols
      ? pickWholesale(...opts.wholesaleCols.map((c) => cell(row, c)))
      : undefined;
    out.push({
      code: code || `${sheet}-${i}`,
      name,
      price,
      wholesalePrice,
      sheet,
    });
  }
  return out;
}

export function parseFraganciasWorkbook(path: string): {
  essences: EssenceRow[];
} {
  const wb = XLSX.readFile(path, { cellDates: false });
  const mujer = parseEssenceSheet(sheetRows(wb, "MUJER"), "dama");
  const hombre = parseEssenceSheet(sheetRows(wb, "HOMBRE"), "caballero");
  const goM = parseGroupSheet(sheetRows(wb, "MUJER G.O"));
  const goH = parseGroupSheet(sheetRows(wb, "HOMBRE G.O"));

  const essences = [...mujer, ...hombre].map((e) => {
    const groupLabel =
      (e.gender === "dama" ? goM : goH).get(normalizeKey(e.contratipo)) ||
      goM.get(normalizeKey(e.contratipo)) ||
      goH.get(normalizeKey(e.contratipo));
    return { ...e, groupLabel };
  });

  return { essences };
}

export function parsePerfumasWorkbook(path: string): Omit<ParsedCatalog, "essences"> {
  const wb = XLSX.readFile(path, { cellDates: false });

  const envName = findSheet(wb, "Env Per") || "Env Per";
  const repName = findSheet(wb, "Rep Pre") || "Rep Pre";
  const splashName =
    findSheet(wb, "Spla") || findSheet(wb, "Alco") || "Spla, Crem, Alco, Arom ";
  const bisutName = findSheet(wb, "Bisut") || "Bisut";
  const accesName = findSheet(wb, "Acces") || "Acces y Marro";
  const plasName = findSheet(wb, "Env Plas") || "Env Plas y Empa";
  const aseoName = findSheet(wb, "Aseo") || "Aseo";

  return {
    bottles: parseEnvPer(sheetRows(wb, envName)),
    preparedReplicas: parseRepPre(sheetRows(wb, repName)),
    splashEtc: parseGenericSkuSheet(sheetRows(wb, splashName), "splash", {
      codeCol: 0,
      nameCol: 1,
      priceCol: 3,
      wholesaleCols: [5, 6, 7],
      startRow: 4,
    }),
    bisuteria: parseGenericSkuSheet(sheetRows(wb, bisutName), "bisut", {
      codeCol: 0,
      nameCol: 1,
      priceCol: 2,
      wholesaleCols: [4, 3, 5],
      startRow: 3,
    }),
    accesorios: parseGenericSkuSheet(sheetRows(wb, accesName), "acces", {
      codeCol: 0,
      nameCol: 1,
      priceCol: 2,
      wholesaleCols: [3, 4],
      startRow: 3,
    }),
    plasticPackaging: parseGenericSkuSheet(sheetRows(wb, plasName), "plas", {
      codeCol: 0,
      nameCol: 1,
      priceCol: 3,
      wholesaleCols: [4, 5],
      startRow: 3,
    }),
    aseo: parseGenericSkuSheet(sheetRows(wb, aseoName), "aseo", {
      codeCol: 0,
      nameCol: 1,
      priceCol: 3,
      wholesaleCols: [5, 4, 6],
      startRow: 4,
    }),
  };
}

export function parseBothWorkbooks(
  fraganciasPath: string,
  perfumasPath: string
): ParsedCatalog {
  const { essences } = parseFraganciasWorkbook(fraganciasPath);
  const rest = parsePerfumasWorkbook(perfumasPath);
  return { essences, ...rest };
}
