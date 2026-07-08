import { cpSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const siteDir = join(root, "_site");

rmSync(siteDir, { recursive: true, force: true });
mkdirSync(siteDir, { recursive: true });

for (const file of ["index.html", "app.js", "styles.css"]) {
  cpSync(join(root, file), join(siteDir, file));
}
cpSync(join(root, "src"), join(siteDir, "src"), { recursive: true });
writeFileSync(join(siteDir, ".nojekyll"), "");

console.log("Built static site in _site/");
