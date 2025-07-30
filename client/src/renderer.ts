import { FeedGroup } from "../../shared/types";
import { copyToClipboard } from "./common";

export function renderFeeds(feedsContainer: HTMLElement, feeds: FeedGroup[]) {
  feedsContainer.innerHTML = "";

  feeds.forEach((feed, _) => {
    feed.feeds.forEach((data) => {
      const feedElement = document.createElement("div");
      feedElement.className =
        "p-4 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors";
      feedElement.innerHTML = `
  <div class="flex flex-col md:flex-row md:justify-between items-start gap-2">
    <div class="flex-1 min-w-0">
      <h3 class="font-medium text-gray-900 text-left">${data.title}</h3>
      <a 
	href="${data.xmlUrl}" 
	target="_blank" 
	rel="noopener noreferrer" 
	class="text-sm text-blue-600 hover:underline flex items-center mt-1 break-all"
      >
	<span class="break-all">${data.xmlUrl}</span>
	<svg class="h-3 w-3 ml-1 shrink-0" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
	  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
	  <polyline points="15 3 21 3 21 9"></polyline>
	  <line x1="10" y1="14" x2="21" y2="3"></line>
	</svg>
      </a>
    </div>
    <button 
      class="px-2 py-1 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-md transition-colors flex items-center self-start md:self-auto"
      id="copy-button"
    >
      <svg class="h-3 w-3 mr-1" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
	<rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
	<path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
      </svg>
      Copy
    </button>
  </div>
`;
      feedsContainer.appendChild(feedElement);
      const copyButton = feedElement.querySelector(
        "#copy-button",
      )! as HTMLButtonElement;
      copyButton.onclick = (_) => {
        copyToClipboard(data.xmlUrl);
      };
    });
  });
}
