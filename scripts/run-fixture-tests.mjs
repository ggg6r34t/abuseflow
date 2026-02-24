import { mkdir, readFile, rm } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";

const tempDir = ".tmp-tests";
const entryPoint = "src/utils/urlDetector.ts";
const outFile = path.join(tempDir, "urlDetector.mjs");
const appStateOutFile = path.join(tempDir, "appStateStore.mjs");
const profileStoreOutFile = path.join(tempDir, "profileStore.mjs");

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
    entryPoints: [entryPoint, "src/storage/appStateStore.ts", "src/storage/profileStore.ts"],
    bundle: true,
    format: "esm",
    platform: "node",
    target: "node20",
    outdir: tempDir,
    entryNames: "[name]",
    outExtension: { ".js": ".mjs" },
    sourcemap: false,
    minify: false
  });
}

async function run() {
  await bundleUrlDetector();
  const moduleUrl = pathToFileURL(path.resolve(outFile)).href;
  const appStateUrl = pathToFileURL(path.resolve(appStateOutFile)).href;
  const profileStoreUrl = pathToFileURL(path.resolve(profileStoreOutFile)).href;
  const mod = await import(moduleUrl);
  const appStateMod = await import(appStateUrl);
  const profileStoreMod = await import(profileStoreUrl);
  const { detectProviderFromUrl, parseUrls } = mod;
  const { sanitizeRunHistory } = appStateMod;
  const { buildClientMigrationPlan } = profileStoreMod;

  const routingFixtures = await loadJson("tests/fixtures/url-routing.json");
  const parseFixtures = await loadJson("tests/fixtures/parse-urls.json");
  const stateFixtures = await loadJson("tests/fixtures/state-behavior.json");

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

  for (const fixture of stateFixtures.runHistoryPruneCases) {
    const actual = sanitizeRunHistory(fixture.records, fixture.flags, fixture.nowMs);
    const actualIds = actual.map((item) => item.id);
    assert(
      JSON.stringify(actualIds) === JSON.stringify(fixture.expectedIds),
      `run history prune fixture failed (${fixture.name})\nexpected=${JSON.stringify(fixture.expectedIds)}\nactual=${JSON.stringify(actualIds)}`
    );
  }

  for (const fixture of stateFixtures.migrationPlanCases) {
    const actual = buildClientMigrationPlan(fixture.localIds, fixture.legacyClients);
    assert(
      actual.shouldMigrate === fixture.expected.shouldMigrate &&
        JSON.stringify(actual.ids) === JSON.stringify(fixture.expected.ids),
      `migration plan fixture failed (${fixture.name})\nexpected=${JSON.stringify(fixture.expected)}\nactual=${JSON.stringify(actual)}`
    );
  }

  console.log(
    `Fixture tests passed: routing=${routingFixtures.length}, parse=${parseFixtures.length}, manifest_sync=1, state=${stateFixtures.runHistoryPruneCases.length + stateFixtures.migrationPlanCases.length}`
  );
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
