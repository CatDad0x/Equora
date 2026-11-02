// After deploying to a new chain, registers deployments/<chainId>.json in src/deployment.ts.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const chainId = process.argv[2];
if (!chainId) throw new Error("usage: node register-deployment.mjs <chainId>");
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
if (!existsSync(join(root, `deployments/${chainId}.json`))) throw new Error(`deployments/${chainId}.json not found`);
const file = join(root, "src/deployment.ts");
let src = readFileSync(file, "utf8");
const imp = `import chain${chainId} from "../deployments/${chainId}.json";`;
if (!src.includes(imp)) {
  src = src.replace('import local from "../deployments/31337.json";', `import local from "../deployments/31337.json";\n${imp}`);
  src = src.replace("  31337: local as Deployment,\n", `  31337: local as Deployment,\n  ${chainId}: chain${chainId} as Deployment,\n`);
  writeFileSync(file, src);
}
console.log(`registered chain ${chainId}`);
