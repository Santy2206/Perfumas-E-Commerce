/**
 * Backward-compatible entry: npm run catalog:export
 * Prefer: npm run catalog:import / catalog:sync
 */

import { existsSync } from "fs";
import { resolve } from "path";

async function main() {
  const argv = process.argv.slice(2);
  const xlsxArg = argv.find((a) => a.startsWith("--xlsx"));
  const fragancias = argv.includes("--fragancias")
    ? argv[argv.indexOf("--fragancias") + 1]
    : undefined;
  const perfumas = argv.includes("--perfumas")
    ? argv[argv.indexOf("--perfumas") + 1]
    : undefined;

  if (fragancias && perfumas) {
    const { parseBothWorkbooks } = await import("./catalog/parse-xlsx");
    const { mapParsedCatalog } = await import("./catalog/map-products");
    const { writeCatalogOutputs } = await import("./catalog/write-outputs");
    const mapped = mapParsedCatalog(parseBothWorkbooks(fragancias, perfumas));
    const out = writeCatalogOutputs(mapped);
    console.log("Summary:", mapped.summary);
    console.log("Wrote", out.seedPath);
    console.log("Wrote", out.generatedPath);
    return;
  }

  if (xlsxArg) {
    console.log(
      "Pass both workbooks:\n  npm run catalog:import -- --fragancias <FRAGANCIAS.xlsx> --perfumas <PERFUMAS.xlsx>"
    );
  }

  const gen = resolve(process.cwd(), "lib", "generated", "catalog-data.ts");
  if (existsSync(gen)) {
    const { spawnSync } = await import("child_process");
    const r = spawnSync(
      "npx",
      ["tsx", "scripts/catalog/cli.ts", "export"],
      { stdio: "inherit", shell: true }
    );
    process.exit(r.status ?? 1);
  }

  console.error(
    "No generated catalog yet. Run:\n  npm run catalog:import -- --fragancias <path> --perfumas <path>"
  );
  process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
