import { build, context } from "esbuild";
import { cp, mkdir, rm } from "node:fs/promises";

const outdir = "dist";
const isWatchMode = process.argv.includes("--watch");

const buildOptions = {
  entryPoints: {
    background: "src/background.ts",
    "content-script": "src/content-script.ts",
    popup: "src/popup/index.tsx",
    options: "src/options/index.tsx"
  },
  outdir,
  bundle: true,
  format: "esm",
  target: "chrome114",
  minify: true,
  sourcemap: false
};

async function copyStaticFiles() {
  await Promise.all([
    cp("manifest.json", `${outdir}/manifest.json`),
    cp("public/popup.html", `${outdir}/public/popup.html`),
    cp("public/options.html", `${outdir}/public/options.html`),
    cp("public/icons", `${outdir}/public/icons`, { recursive: true })
  ]);
}

await rm(outdir, { recursive: true, force: true });
await mkdir(outdir, { recursive: true });
await mkdir(`${outdir}/public`, { recursive: true });

await copyStaticFiles();

if (isWatchMode) {
  const ctx = await context(buildOptions);
  await ctx.watch();
  await new Promise(() => {
    return;
  });
} else {
  await build(buildOptions);
}
