import { mkdir, readFile, rm } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";

const tempDir = ".tmp-tests";
const providersBundleFile = path.join(tempDir, "providers.mjs");

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function parseAttributes(raw) {
  const attrs = {};
  const attrRegex = /([a-zA-Z_:][a-zA-Z0-9_:\-]*)(?:\s*=\s*"([^"]*)")?/g;
  for (const match of raw.matchAll(attrRegex)) {
    const key = match[1];
    if (!key) {
      continue;
    }
    attrs[key] = match[2] ?? "";
  }
  return attrs;
}

class FakeElement {
  constructor(tagName, attributes) {
    this.tagName = tagName.toUpperCase();
    this.attributes = attributes;
    this.id = attributes.id ?? "";
    this.name = attributes.name ?? "";
    this.type = attributes.type ?? "";
    this.disabled = "disabled" in attributes;
    this.readOnly = "readonly" in attributes;
    this.hidden = "hidden" in attributes;
    this.value = attributes.value ?? "";
    this._events = [];
    this.isConnected = true;
  }

  getClientRects() {
    return this.hidden ? [] : [{}];
  }

  focus() {}

  click() {}

  dispatchEvent(event) {
    this._events.push(event.type);
    return true;
  }
}

class FakeInputElement extends FakeElement {}
class FakeTextareaElement extends FakeElement {}
class FakeSelectElement extends FakeElement {
  constructor(tagName, attributes) {
    super(tagName, attributes);
    this.options = [];
  }
}
class FakeHTMLElement extends FakeElement {}

function cssEscape(value) {
  return String(value).replace(/["\\]/g, "\\$&");
}

function matchesSelector(element, selector) {
  const idMatch = selector.match(/^#(.+)$/);
  if (idMatch) {
    return element.id === idMatch[1];
  }

  const tagAttrMatch = selector.match(/^([a-z]+)(?:\[([a-zA-Z_-]+)="([^"]*)"\])?(?:\[([a-zA-Z_-]+)="([^"]*)"\])?$/);
  if (!tagAttrMatch) {
    return false;
  }
  const [, tag, attr1, val1, attr2, val2] = tagAttrMatch;
  if (!tag || element.tagName.toLowerCase() !== tag.toLowerCase()) {
    return false;
  }

  const checks = [];
  if (attr1) checks.push([attr1, val1 ?? ""]);
  if (attr2) checks.push([attr2, val2 ?? ""]);
  for (const [attr, expected] of checks) {
    if (attr === "name" && element.name !== expected) {
      return false;
    }
    if (attr === "id" && element.id !== expected) {
      return false;
    }
    if (attr === "type" && (element.type ?? "") !== expected) {
      return false;
    }
  }
  return true;
}

class FakeDocument {
  constructor(elements) {
    this.elements = elements;
    this.documentElement = {};
  }

  getElementById(id) {
    return this.elements.find((element) => element.id === id) ?? null;
  }

  querySelector(selector) {
    return this.elements.find((element) => matchesSelector(element, selector)) ?? null;
  }

  querySelectorAll(selector) {
    return this.elements.filter((element) => matchesSelector(element, selector));
  }
}

function parseHtmlToElements(html) {
  const elements = [];
  const inputRegex = /<input\b([^>]*)>/gi;
  for (const match of html.matchAll(inputRegex)) {
    const attrs = parseAttributes(match[1] ?? "");
    elements.push(new FakeInputElement("input", attrs));
  }

  const textareaRegex = /<textarea\b([^>]*)>([\s\S]*?)<\/textarea>/gi;
  for (const match of html.matchAll(textareaRegex)) {
    const attrs = parseAttributes(match[1] ?? "");
    const element = new FakeTextareaElement("textarea", attrs);
    element.value = attrs.value ?? (match[2] ?? "");
    elements.push(element);
  }

  const selectRegex = /<select\b([^>]*)>([\s\S]*?)<\/select>/gi;
  for (const match of html.matchAll(selectRegex)) {
    const attrs = parseAttributes(match[1] ?? "");
    const element = new FakeSelectElement("select", attrs);
    const optionsHtml = match[2] ?? "";
    const optionRegex = /<option\b([^>]*)>([\s\S]*?)<\/option>/gi;
    for (const optionMatch of optionsHtml.matchAll(optionRegex)) {
      const optionAttrs = parseAttributes(optionMatch[1] ?? "");
      element.options.push({
        value: optionAttrs.value ?? "",
        textContent: optionMatch[2] ?? ""
      });
    }
    elements.push(element);
  }

  return elements;
}

function installFakeDom(html) {
  const elements = parseHtmlToElements(html);
  const fakeDocument = new FakeDocument(elements);
  const fakeWindow = {
    getComputedStyle(element) {
      return {
        display: element.hidden ? "none" : "block",
        visibility: element.hidden ? "hidden" : "visible"
      };
    }
  };

  globalThis.window = fakeWindow;
  globalThis.document = fakeDocument;
  globalThis.CSS = { escape: cssEscape };
  globalThis.Event = class Event {
    constructor(type) {
      this.type = type;
    }
  };
  globalThis.Element = FakeElement;
  globalThis.HTMLElement = FakeHTMLElement;
  globalThis.HTMLInputElement = FakeInputElement;
  globalThis.HTMLTextAreaElement = FakeTextareaElement;
  globalThis.HTMLSelectElement = FakeSelectElement;

  return { elements, fakeDocument };
}

function findElementByField(elements, field) {
  const [kind, key] = field.split(":");
  if (!kind || !key) {
    return null;
  }
  if (kind === "name") {
    return elements.find((element) => element.name === key) ?? null;
  }
  if (kind === "id") {
    return elements.find((element) => element.id === key) ?? null;
  }
  return null;
}

async function bundleProviders() {
  await rm(tempDir, { recursive: true, force: true });
  await mkdir(tempDir, { recursive: true });
  await build({
    entryPoints: ["src/providers/index.ts"],
    bundle: true,
    format: "esm",
    platform: "node",
    target: "node20",
    outfile: providersBundleFile,
    sourcemap: false,
    minify: false
  });
}

async function run() {
  await bundleProviders();
  const moduleUrl = pathToFileURL(path.resolve(providersBundleFile)).href;
  const providersMod = await import(moduleUrl);
  const { getProviderById } = providersMod;

  const fixtureRaw = await readFile("tests/fixtures/provider-dom-fixtures.json", "utf8");
  const fixtures = JSON.parse(fixtureRaw);

  for (const fixture of fixtures) {
    const html = await readFile(fixture.htmlFile, "utf8");
    const { elements } = installFakeDom(html);
    const provider = getProviderById(fixture.providerId);
    assert(provider, `provider not found: ${fixture.providerId}`);

    const filledCount = provider.autofill(fixture.payload);
    assert(
      filledCount === fixture.expected.filledCount,
      `filledCount mismatch for ${fixture.name}: expected=${fixture.expected.filledCount}, actual=${filledCount}`
    );

    for (const [field, expectedValue] of Object.entries(fixture.expected.values)) {
      const element = findElementByField(elements, field);
      assert(element, `missing fixture field "${field}" in ${fixture.name}`);
      assert(
        element.value === expectedValue,
        `value mismatch for ${fixture.name} field=${field}: expected="${expectedValue}", actual="${element.value}"`
      );
    }
  }

  console.log(`Provider DOM fixtures passed: ${fixtures.length}`);
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
