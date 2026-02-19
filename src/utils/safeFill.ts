type FillableControl = HTMLInputElement | HTMLTextAreaElement;

function isFieldEmpty(value: string): boolean {
  return value.trim().length === 0;
}

export function isElementVisible(element: Element): boolean {
  if (!element.isConnected) {
    return false;
  }

  if (element instanceof HTMLElement && element.hidden) {
    return false;
  }

  const style = window.getComputedStyle(element);
  if (style.display === "none" || style.visibility === "hidden" || style.visibility === "collapse") {
    return false;
  }

  return element.getClientRects().length > 0;
}

function dispatchFieldEvents(element: FillableControl | HTMLSelectElement): void {
  element.dispatchEvent(new Event("input", { bubbles: true }));
  element.dispatchEvent(new Event("change", { bubbles: true }));
}

export function safeFillField(element: FillableControl | null, value: string): boolean {
  if (!element || value.trim().length === 0) {
    return false;
  }
  if (!isElementVisible(element) || element.disabled || element.readOnly) {
    return false;
  }
  if (!isFieldEmpty(element.value)) {
    return false;
  }
  element.focus();
  element.value = value;
  dispatchFieldEvents(element);
  return true;
}

export function safeFillIfVisible(selector: string, value: string, root: ParentNode = document): boolean {
  const field = root.querySelector(selector);
  if (!(field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement)) {
    return false;
  }
  return safeFillField(field, value);
}

function findSelectOptionValue(select: HTMLSelectElement, targetValue: string): string | null {
  const normalizedTarget = targetValue.trim().toLowerCase();
  if (!normalizedTarget) {
    return null;
  }
  for (const option of Array.from(select.options)) {
    const optionText = option.textContent?.trim().toLowerCase() ?? "";
    const optionValue = option.value.trim().toLowerCase();
    if (optionText === normalizedTarget || optionValue === normalizedTarget) {
      return option.value;
    }
  }
  for (const option of Array.from(select.options)) {
    const optionText = option.textContent?.trim().toLowerCase() ?? "";
    const optionValue = option.value.trim().toLowerCase();
    if (optionText.includes(normalizedTarget) || optionValue.includes(normalizedTarget)) {
      return option.value;
    }
  }
  return null;
}

export function safeSelectOption(select: HTMLSelectElement | null, value: string): boolean {
  if (!select || value.trim().length === 0) {
    return false;
  }
  if (!isElementVisible(select) || select.disabled) {
    return false;
  }
  if (!isFieldEmpty(select.value)) {
    return false;
  }
  const optionValue = findSelectOptionValue(select, value);
  if (!optionValue) {
    return false;
  }
  select.focus();
  select.value = optionValue;
  dispatchFieldEvents(select);
  return true;
}
