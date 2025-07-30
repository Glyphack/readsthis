import { getRequiredElement, showToast } from "@client/common";
import { FeedGroup } from "@shared/types";
import { parseOpml } from "@shared/utils/parseOpml";
import { createEl } from "@client/utils/dom";
import { createFeedSection } from "./feedSection";

export function opmlUpload(
  feedsCallback: (opmlText: string, feeds: FeedGroup[]) => void,
): HTMLDivElement {
  const div = createEl("div") as HTMLDivElement;

  async function handleFileUpload(e: Event) {
    e.stopPropagation();
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const feeds = await parseOpml(text);
      let feedN = 0;
      feeds.forEach((fg) => {
        feedN += fg.feeds.length;
      });
      feedsCallback(text, feeds);
      // Fade out upload area and show feed section with back callback
      div.innerHTML = "";
      const feedSection = createFeedSection(
        feeds,
        text,
        true,
        "Feed",
        renderUploader,
      );
      div.appendChild(feedSection);
      showToast(
        "OPML file uploaded successfully",
        "Found " + feedN + " feeds in your file.",
      );
    } catch (error) {
      console.log(error);
      showToast(
        "Error parsing OPML file",
        "Please make sure you've uploaded a valid OPML file.",
        "error",
      );
    }
  }

  function renderUploader() {
    const shareSection = document.getElementById("shareSection");
    if (shareSection) {
      shareSection.classList.add("hidden");
    }
    const successSection = document.getElementById("success-section");
    if (successSection) {
      successSection.classList.add("hidden");
    }
    div.innerHTML = `
<div id="uploader-section" class="mb-8">
  <div class="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
    <div class="p-6 border-b border-gray-200">
      <h2 class="text-xl font-semibold text-gray-900">Upload your Feeds</h2>
      <p class="text-sm text-gray-600">Share your reading list by uploading an OPML file from your favorite RSS reader</p>
    </div>
    <div class="p-6 space-y-6">
      <div class="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
        <svg class="h-10 w-10 text-blue-500 mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
          <polyline points="17 8 12 3 7 8"></polyline>
          <line x1="12" y1="3" x2="12" y2="15"></line>
        </svg>
        <p class="text-sm text-gray-600 mb-4">Drag and drop your OPML file here, or click to browse</p>
        <input id="opmlUpload" type="file" accept=".opml, .xml" class="hidden">
        <button id="uploadBtn" class="px-4 py-2 bg-[#2B70F6] hover:bg-blue-700 text-white font-medium rounded-md transition-colors">
          Select OPML File
        </button>
      </div>
      
      <div class="bg-blue-50 p-4 rounded-lg">
        <h3 class="font-medium text-blue-800 mb-2">How to export your OPML file?</h3>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <a 
            href="https://docs.readwise.io/reader/docs/faqs/exporting#how-do-i-generate-an-opml-of-all-my-subscribed-feeds" 
            target="_blank" 
            rel="noopener noreferrer"
            class="flex items-center p-3 bg-white rounded-md border border-blue-200 hover:border-slate-400 transition-colors"
          >
            <div class="mr-3 bg-blue-100 p-2 rounded-full">
	      <img src="readwise.png" class="h-4 w-4"/>
            </div>
            <div class="text-left">
              <p class="font-medium text-sm">Readwise Reader</p>
              <p class="text-xs text-gray-600">Export OPML instructions</p>
            </div>
          </a>
          <a 
            href="https://docs.feedly.com/article/52-how-can-i-export-my-sources-and-feeds-through-opml" 
            target="_blank" 
            rel="noopener noreferrer"
            class="flex items-center p-3 bg-white rounded-md border border-blue-200 hover:border-green-400 transition-colors"
          >
            <div class="mr-3 bg-blue-100 p-2 rounded-full">
	      <img src="feedly.png" class="h-4 w-4"/>
            </div>
            <div class="text-left">
              <p class="font-medium text-sm">Feedly</p>
              <p class="text-xs text-gray-600">Export OPML instructions</p>
            </div>
          </a>
          <a
            href="https://dotriz.com/tools/opml-generator/"
            target="_blank"
            rel="noopener noreferrer"
            class="flex items-center p-3 bg-white rounded-md border border-blue-200 hover:border-slate-400 transition-colors"
          >
            <div class="mr-3 bg-blue-100 w-8 h-8 rounded-full flex items-center justify-center">
              <span class="text-sm font-bold text-blue-800">?</span>
            </div>
            <div class="text-left">
              <p class="font-medium text-sm">Other</p>
              <p class="text-xs text-gray-600">Use online generator</p>
            </div>
          </a>
        </div>
      </div>
    </div>
  </div>
`;
    const fileInput = getRequiredElement(
      "#opmlUpload",
      div,
    )! as HTMLInputElement;
    const uploadButton = getRequiredElement(
      "#uploadBtn",
      div,
    )! as HTMLButtonElement;

    uploadButton.addEventListener("click", () => {
      fileInput.value = "";
      fileInput.click();
    });
    fileInput.addEventListener("change", handleFileUpload);
  }

  renderUploader();
  return div;
}
