function normalizeText(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

function textIncludesAny(text: string, candidates: readonly string[]): boolean {
  const normalizedText = normalizeText(text);
  return candidates.some((candidate) => normalizedText.includes(normalizeText(candidate)));
}

export function findInputByNames(candidates: readonly string[]): HTMLInputElement | null {
  for (const candidate of candidates) {
    const escaped = CSS.escape(candidate);
    const input = document.querySelector<HTMLInputElement>(`input[name="${escaped}"]`);
    if (input) {
      return input;
    }
  }
  return null;
}

export function findTextareaByNames(candidates: readonly string[]): HTMLTextAreaElement | null {
  for (const candidate of candidates) {
    const escaped = CSS.escape(candidate);
    const textarea = document.querySelector<HTMLTextAreaElement>(`textarea[name="${escaped}"]`);
    if (textarea) {
      return textarea;
    }
  }
  return null;
}

export function findSelectByNames(candidates: readonly string[]): HTMLSelectElement | null {
  for (const candidate of candidates) {
    const escaped = CSS.escape(candidate);
    const select = document.querySelector<HTMLSelectElement>(`select[name="${escaped}"]`);
    if (select) {
      return select;
    }
  }
  return null;
}

type LabelControl = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

function findControlInLabel(label: HTMLLabelElement): LabelControl | null {
  const nested = label.querySelector<LabelControl>("input, textarea, select");
  if (nested) {
    return nested;
  }
  const htmlFor = label.htmlFor;
  if (!htmlFor) {
    return null;
  }
  const referenced = document.getElementById(htmlFor);
  if (
    referenced instanceof HTMLInputElement ||
    referenced instanceof HTMLTextAreaElement ||
    referenced instanceof HTMLSelectElement
  ) {
    return referenced;
  }
  return null;
}

export function findFieldByLabelText(candidates: readonly string[]): LabelControl | null {
  const labels = Array.from(document.querySelectorAll("label"));
  for (const label of labels) {
    const text = label.textContent ?? "";
    if (!textIncludesAny(text, candidates)) {
      continue;
    }
    const control = findControlInLabel(label);
    if (control) {
      return control;
    }
  }
  return null;
}

export function findInputsByNamePrefix(prefix: string): HTMLInputElement[] {
  const escapedPrefix = CSS.escape(prefix);
  return Array.from(
    document.querySelectorAll<HTMLInputElement>(`input[name^="${escapedPrefix}"]`)
  ).sort((a, b) => a.name.localeCompare(b.name));
}

export function findTextareasByNamePrefix(prefix: string): HTMLTextAreaElement[] {
  const escapedPrefix = CSS.escape(prefix);
  return Array.from(
    document.querySelectorAll<HTMLTextAreaElement>(`textarea[name^="${escapedPrefix}"]`)
  ).sort((a, b) => a.name.localeCompare(b.name));
}
