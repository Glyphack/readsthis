import { renderFeeds } from "@client/renderer";
import { FeedGroup } from "@shared/types";
import { createEl } from "@client/utils/dom";
import { copyToClipboard } from "@client/common";

export function createFeedSection(
  feeds: FeedGroup[],
  opmlText: string,
  scrollable: boolean = true,
  title: string = "Feed",
  onBack?: () => void,
): HTMLDivElement {
  const section = createEl("div", {
    id: "feedsSec",
    className: "hidden",
  }) as HTMLDivElement;
  section.style.opacity = "1";
  section.style.transition = "opacity 0.5s ease";
  const feedContainerClass = scrollable
    ? "space-y-4 max-h-[400px] overflow-y-auto pr-2 mb-8"
    : "space-y-4";
  section.innerHTML = `
  <div class="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
    <div id="headerContainer" class="p-6 border-b border-gray-200 flex items-center justify-center relative">
      <h2 class="text-xl font-semibold text-gray-900 text-center">${title}</h2>
    </div>
    <div class="p-6">
      <div id="feedsContainer" class="${feedContainerClass}">
        <!-- Feeds will be inserted here -->
      </div>
    </div>
  </div>
  `;
  const feedsContainer = section.querySelector(
    "#feedsContainer",
  ) as HTMLDivElement;
  renderFeeds(feedsContainer, feeds);
  if (onBack) {
    const headerContainer = section.querySelector("#headerContainer")!;
    const backBtn = createEl(
      "button",
      {
        id: "backBtn",
        className:
          "absolute left-4 p-2 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded-md transition-colors",
      },
      "←",
    );
    backBtn.addEventListener("click", (e) => {
      e.preventDefault();
      section.style.opacity = "0";
      setTimeout(() => {
        onBack();
      }, 500);
    });
    headerContainer.appendChild(backBtn);
  }
  // Copy OPML button
  const headerContainer = section.querySelector(
    "#headerContainer",
  )! as HTMLDivElement;
  const copyOpmlBtn = createEl(
    "button",
    {
      id: "copyOpmlBtn",
      className:
        "absolute right-4 p-2 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded-md transition-colors",
    },
    "Copy OPML",
  );
  copyOpmlBtn.addEventListener("click", (e) => {
    e.preventDefault();
    copyToClipboard(opmlText);
  });
  headerContainer.appendChild(copyOpmlBtn);

  section.classList.remove("hidden");
  return section;
}
