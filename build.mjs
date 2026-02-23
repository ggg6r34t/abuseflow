import { build, context } from "esbuild";
import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";

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
  const [manifestRaw, routesRaw] = await Promise.all([
    readFile("manifest.json", "utf8"),
    readFile("providerRoutes.json", "utf8")
  ]);

  const manifest = JSON.parse(manifestRaw);
  const routes = JSON.parse(routesRaw);
  const contentScriptMatches = Array.from(
    new Set((routes.providers ?? []).flatMap((provider) => provider.manifestMatches ?? []))
  );
  if (manifest.content_scripts?.[0]) {
    manifest.content_scripts[0].matches = contentScriptMatches;
  }

  await Promise.all([
    writeFile(`${outdir}/manifest.json`, JSON.stringify(manifest, null, 2), "utf8"),
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
