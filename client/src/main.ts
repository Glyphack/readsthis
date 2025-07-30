import "./styles/style.css";
import { API_URL } from "./config";
import { renderLoginPage } from "./login";
import { renderManagePage } from "./manage";
import { renderSharedFeedPage } from "./shared";
import { header } from "./components/pageHeader";
import {
  getRequiredElement,
  showToast,
  copyToClipboard,
  getAuthToken,
} from "./common";
import { FeedGroup } from "@shared/types";
import { opmlUpload } from "./components/opmlUpload";
import { renderListPage } from "./list";
import { renderAboutPage } from "./about";

const app = document.querySelector<HTMLDivElement>("#app")!;

const path = window.location.pathname;
if (path === "/manage") {
  renderManagePage(app);
} else if (path === "/list") {
  renderListPage(app);
} else if (path === "/login") {
  renderLoginPage(app);
} else if (path.startsWith("/s/")) {
  const uuid = path.substring(3);
  renderSharedFeedPage(app, uuid);
} else if (path === "/about") {
  renderAboutPage(app);
} else {
  renderHomePage();
}

function renderHomePage() {
  const loggedIn = !!getAuthToken();
  const helperBox = loggedIn
    ? ""
    : `<div class="mb-8 bg-white rounded-lg border border-gray-200 shadow-sm p-6 flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
        <p class="text-sm text-gray-700 md:mr-4">
          First time here? Drag and drop your OPML file below. Already shared a feed?
        </p>

        <button 
          id="manage-feeds-button" 
          onclick=\"window.location.href='/login'\" 
          class="w-full md:w-auto px-4 py-2 bg-white border border-[#2B70F6] text-[#2B70F6] hover:bg-blue-50 font-medium rounded-md transition-colors flex items-center justify-center"
        >
          <svg class="h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 20h9"></path>
            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
          </svg>
          Manage Your Shared Readings
        </button>
      </div>`;

  app.innerHTML = `
<main class="container max-w-4xl mx-auto px-4 py-8">
  ${header().outerHTML}


  <!-- Feed Setup Helper -->
  ${helperBox}

  <!-- Share Feeds -->
  <div id="shareSection" class="pt-6 border-t border-gray-200 hidden">
    <h3 class="text-lg font-semibold text-gray-900 mb-4">Share Your Feed Collection</h3>
    <form id="shareForm" class="space-y-4">
      <div class="space-y-2">
	<label for="email" class="block text-sm font-medium text-gray-700">Your Email</label>
	<input 
	  id="email" 
	  type="email" 
	  placeholder="you@example.com" 
	  required
	  class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
	>
      </div>
      <div class="space-y-2">
	<label for="feed-name" class="block text-sm font-medium text-gray-700">Feed Collection Name</label>
	<input 
	  id="feed-name" 
	  placeholder="My Favorite Tech Blogs" 
	  required
	  class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
	>
      </div>
      <div id="share-result" class="hidden mb-4 p-4 rounded-lg"></div>
      <button 
	type="submit" 
	id="share-button"
	class="w-full px-4 py-2 bg-[#2B70F6] hover:bg-blue-700 text-white font-medium rounded-md transition-colors"
      >
	Generate Shareable Link
      </button>
    </form>
  </div>

  <!-- Share Success Section (initially hidden) -->
  <div id="success-section" class="hidden">
    <div class="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
      <div class="p-6 border-b border-gray-200">
	<h2 class="text-xl font-semibold text-gray-900">Your Feed Collection is Ready to Share!</h2>
	<p class="text-sm text-gray-600">Share this link with your friends so they can access your feed collection</p>
      </div>
      <div class="p-6 space-y-4">
	<div class="p-4 bg-blue-50 rounded-lg">
	  <p id="share-info" class="font-medium text-center mb-2"></p>
	  <div class="flex">
	    <input 
	      id="share-link" 
	      readonly 
	      class="flex-1 px-3 py-2 bg-white border border-gray-300 rounded-l-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
	    >
	    <button 
	      id="copy-button"
	      class="px-4 py-2 bg-[#2B70F6] hover:bg-blue-700 text-white font-medium rounded-r-md transition-colors flex items-center"
	    >
	      <svg class="h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
		<rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
		<path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
	      </svg>
	      Copy
	    </button>
	  </div>
	</div>
	<p class="text-center text-sm text-gray-600">A management link has been sent to your email.</p>
	<div class="text-center">
	  <button 
	    id="reset-button"
	    class="px-4 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium rounded-md transition-colors"
	  >
	    Start Over
	  </button>
	</div>
      </div>
    </div>
  </div>

  <div id="opmlUpload"></div>
</main>
	`;

  document
    .getElementById("opmlUpload")!
    .appendChild(opmlUpload(handleFeedsLoaded));

  let currentOpmlContent: string | null = null;

  // DOM Elements
  const shareSection = getRequiredElement("#shareSection");
  const shareForm = document.getElementById("shareForm")!;
  const emailInput = document.getElementById("email")! as HTMLInputElement;
  const feedNameInput = document.getElementById(
    "feed-name",
  )! as HTMLInputElement;
  const shareResult = document.getElementById("share-result")!;
  const shareInfo = document.getElementById("share-info")!;
  const shareLinkInput = document.getElementById(
    "share-link",
  )! as HTMLInputElement;

  // Event Listeners
  shareForm.addEventListener("submit", handleShareSubmit);

  function handleFeedsLoaded(opmlText: string, _: FeedGroup[]) {
    currentOpmlContent = opmlText;
    shareSection.classList.remove("hidden");
  }

  async function handleShareSubmit(e: Event) {
    e.preventDefault();

    const email = emailInput.value.trim();
    const feedName = feedNameInput.value.trim();

    if (!email) {
      showShareError("Please enter your email address.");
      return;
    }

    if (!currentOpmlContent) {
      showShareError("Please upload a valid OPML file first.");
      return;
    }

    shareResult.classList.remove("hidden");
    shareResult.innerHTML = `
        <div class="bg-blue-50 text-blue-700 p-4 rounded-lg">
          <p class="font-medium">Processing your request...</p>
          <p class="text-sm">This may take a few moments.</p>
        </div>
      `;
    const formData = new FormData();
    const opmlBlob = new Blob([currentOpmlContent], { type: "text/xml" });
    formData.append("opmlFile", opmlBlob, "feeds.opml");
    formData.append("email", email);
    if (feedName) {
      formData.append("name", feedName);
    }
    try {
      const response = await fetch(`${API_URL}/api/share`, {
        method: "POST",
        body: formData,
      });

      const data: { exists: boolean; shareId: string; error: string } =
        await response.json();

      if (!response.ok) {
        showShareError(data.error || "Failed to generate share link");
        return;
      }

      const fullShareUrl = `${window.location.origin}/s/${data.shareId}`;

      // Populate previously hidden success section inputs (kept for future use)
      shareInfo.textContent = `"${feedName}" by ${email}`;
      shareLinkInput.value = fullShareUrl;

      // Build the result UI – always show the current share link regardless of
      // whether it was newly created or already existed.
      const bannerTitle = data.exists
        ? "A share link already exists for this email:"
        : "Share link generated successfully:";

      // Use explicit Tailwind classes to avoid problems with JIT tree-shaking
      const bannerClasses = data.exists
        ? "bg-yellow-50 text-yellow-700"
        : "bg-green-50 text-green-700";

      shareResult.innerHTML = `
        <div class="${bannerClasses} p-4 rounded-lg">
          <p class="font-medium mb-2">${bannerTitle}</p>
          <div class="flex items-center space-x-2">
            <a id="result-share-link" href="${fullShareUrl}" target="_blank" rel="noopener noreferrer" class="flex-1 text-blue-700 underline break-words">${fullShareUrl}</a>
            <button id="result-copy-button" class="px-4 py-2 bg-[#2B70F6] hover:bg-blue-700 text-white font-medium rounded-md transition-colors flex items-center">
              <svg class="h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
              </svg>
              Copy
            </button>
          </div>
          <p class="mt-2 text-sm">To manage this page, please verify your email address – we've sent you a separate management link.</p>
        </div>`;

      // Attach clipboard handler
      const resultCopyButton = document.getElementById(
        "result-copy-button",
      ) as HTMLButtonElement;
      resultCopyButton.addEventListener("click", () => {
        copyToClipboard(fullShareUrl);
      });

      // Toast feedback
      showToast(
        "Feed shared successfully",
        data.exists
          ? "Your existing share link is displayed below."
          : "Your new share link is ready – remember to verify your email to manage it!",
      );
    } catch (error) {
      console.error("Error sharing:", error);
      showShareError("Failed to generate share link. Please try again.");
    }
  }

  function showShareError(message: string) {
    shareResult.classList.remove("hidden");
    shareResult.innerHTML = `
        <div class="bg-red-50 text-red-700 p-4 rounded-lg">
          <p class="font-medium">Error</p>
          <p class="text-sm">${message}</p>
        </div>
      `;
  }
}
