import { createEl } from "@client/utils/dom";

export function createToastContainer(): HTMLElement {
  return createEl("div", {
    id: "toast-container",
    className: "toast-container fixed top-4 right-4 space-y-2 z-50",
  });
}
