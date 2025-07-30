export function createEl<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attributes: Partial<HTMLElementTagNameMap[K]> = {},
  innerHTML?: string,
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  Object.assign(el, attributes);
  if (innerHTML !== undefined) {
    el.innerHTML = innerHTML;
  }
  return el;
}
