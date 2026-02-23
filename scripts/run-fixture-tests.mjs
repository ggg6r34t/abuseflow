import { mkdir, readFile, rm } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";

const tempDir = ".tmp-tests";
const entryPoint = "src/utils/urlDetector.ts";
const outFile = path.join(tempDir, "urlDetector.mjs");

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function loadJson(filePath) {
  const text = await readFile(filePath, "utf8");
  return JSON.parse(text);
}

async function bundleUrlDetector() {
  await rm(tempDir, { recursive: true, force: true });
  await mkdir(tempDir, { recursive: true });
  await build({
    entryPoints: [entryPoint],
    bundle: true,
    format: "esm",
    platform: "node",
    target: "node20",
    outfile: outFile,
    sourcemap: false,
    minify: false
  });
}

async function run() {
  await bundleUrlDetector();
  const moduleUrl = pathToFileURL(path.resolve(outFile)).href;
  const mod = await import(moduleUrl);
  const { detectProviderFromUrl, parseUrls } = mod;

  const routingFixtures = await loadJson("tests/fixtures/url-routing.json");
  const parseFixtures = await loadJson("tests/fixtures/parse-urls.json");

  for (const fixture of routingFixtures) {
    const actual = detectProviderFromUrl(fixture.url);
    assert(
      actual === fixture.providerId,
      `routing fixture failed for ${fixture.url}\nexpected=${fixture.providerId}\nactual=${actual}`
    );
  }

  for (const fixture of parseFixtures) {
    const actual = parseUrls(fixture.input);
    const expected = fixture.expected;
    assert(
      JSON.stringify(actual) === JSON.stringify(expected),
      `parse fixture failed (${fixture.name})\nexpected=${JSON.stringify(expected)}\nactual=${JSON.stringify(actual)}`
    );
  }

  const manifest = await loadJson("manifest.json");
  const routes = await loadJson("providerRoutes.json");
  const expectedMatches = Array.from(
    new Set((routes.providers ?? []).flatMap((provider) => provider.manifestMatches ?? []))
  );
  const actualMatches = manifest.content_scripts?.[0]?.matches ?? [];
  assert(
    JSON.stringify(actualMatches) === JSON.stringify(expectedMatches),
    "manifest content script matches are out of sync with providerRoutes.json"
  );

  console.log(
    `Fixture tests passed: routing=${routingFixtures.length}, parse=${parseFixtures.length}, manifest_sync=1`
  );
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
