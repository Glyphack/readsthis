import { API_URL } from "./config";
import { header } from "./components/pageHeader";
import { opmlUpload } from "./components/opmlUpload";
import { renderFeeds } from "./renderer";
import {
  showToast,
  getAuthToken,
  setAuthToken,
  clearAuthToken,
  redirectToLogin,
} from "./common";
import { Share } from "@server/db/schema";
import type { UpdateReadwiseResponse } from "@shared/types";

export function renderManagePage(app: HTMLDivElement) {
  app.innerHTML = `
<main class="container max-w-4xl mx-auto px-4 py-8">
  ${header().outerHTML}

  <div class="flex justify-end mb-4">
    <button id="logoutButton" class="hidden px-3 py-1 text-sm text-gray-600 hover:text-white border border-gray-400 rounded hover:bg-gray-600 transition-colors">
      Log&nbsp;out
    </button>
  </div>

  <div class="flex flex-col items-center mb-8">
    <h1 class="text-2xl font-bold text-gray-900 mb-6 text-center">Manage Your Shared Collections</h1>

    <!-- Area for errors / status -->
    <div id="manageResultArea" class="mb-4 w-full"></div>

    <!-- Main container hidden until verify succeeds -->
    <div id="manageContainer" class="w-full hidden">
      <div id="shareLinkArea" class="mb-6 text-center"></div>

      <!-- Tabs navigation -->
      <nav class="flex border-b border-gray-200 mb-6" role="tablist">
        <button id="tabFeedsBtn" role="tab" aria-controls="feedsTabPanel" class="px-4 py-2 text-sm font-medium text-blue-600 border-b-2 border-blue-600 -mb-px focus:outline-none">Feeds & Profile</button>
        <button id="tabReadwiseBtn" role="tab" aria-controls="readwiseTabPanel" class="ml-6 px-4 py-2 text-sm font-medium text-gray-600 hover:text-blue-600 focus:outline-none">Readwise Integration</button>
      </nav>

      <!-- Feeds tab -->
      <section id="feedsTabPanel" role="tabpanel" aria-labelledby="tabFeedsBtn">
        <form id="updateForm" class="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden p-6">
          <input type="hidden" name="share_id" id="shareIdInput">
          <input type="hidden" name="token" id="tokenInput">

          <!-- Name -->
          <div class="mb-4">
            <label for="nameInput" class="block text-sm font-medium text-gray-700">Feed Collection Name</label>
            <input type="text" id="nameInput" name="name" class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500">
          </div>

          <!-- Slug -->
          <div class="mb-4">
            <label for="slugInput" class="block text-sm font-medium text-gray-700">Custom URL Slug</label>
            <div class="mt-1 flex">
              <span class="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500">/s/</span>
              <input type="text" id="slugInput" name="slug" placeholder="my-custom-url" pattern="[A-Za-z0-9]{1,20}" class="flex-1 px-3 py-2 border border-gray-300 rounded-r-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500">
            </div>
            <p class="mt-1 text-sm text-gray-500">Alphanumeric only (1-30 chars). Optional.</p>
          </div>

          <!-- Preview of feeds (after upload) -->
          <div id="feedDisplay" class="space-y-2 mb-4"></div>

          <!-- OPML upload -->
          <div class="mb-4" id="opmlUploadArea"></div>

          <button type="submit" id="saveFeedsButton" class="w-full px-4 py-2 bg-[#2B70F6] hover:bg-blue-700 text-white font-medium rounded-md transition-colors">Save Feeds</button>
        </form>
      </section>

      <!-- Readwise tab (hidden by default) -->
      <section id="readwiseTabPanel" role="tabpanel" aria-labelledby="tabReadwiseBtn" class="hidden">
        <div class="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <div class="flex items-center gap-2 mb-4">
            <img src="/readwise.png" alt="Readwise logo" class="h-6 w-6" />
            <h2 class="m-0 text-lg font-semibold text-gray-800 leading-none">Readwise Highlights</h2>
          </div>

          <!-- Helpful flow explanation -->
          <div class="text-sm text-gray-700 leading-relaxed mb-4 space-y-2">
            <p>
              Connect your Readwise account and decide which of your saved articles
              should appear on your public share page.
            </p>

            <ol class="list-decimal list-inside space-y-1">
              <li>
                Paste your Readwise API key below and click <span class="font-medium">Save
                Token</span>. (The key is encrypted on the server – it will never be
                shown again.)
              </li>
              <li>
                In the Readwise Reader, add the tag
                <code class="px-1 py-0.5 bg-gray-200 rounded ml-1">share</code>
                to any article you want to publish.
              </li>
              <li>
                Return here and click <span class="font-medium">Sync Readwise
                Links</span>. We’ll pull every article with the
                <code class="px-1 py-0.5 bg-gray-200 rounded ml-1">share</code>
                tag and instantly add it to your public page.
              </li>
            </ol>
          </div>

          <label for="readwiseTokenInput" class="block text-sm font-medium text-gray-700 mb-1">Readwise API Key</label>
          <input type="password" id="readwiseTokenInput" name="readwise_token" placeholder="Paste your Readwise token" autocomplete="off" class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#F4c15b] focus:border-[#F4c15b]" />

          <!-- Buttons -->
          <div class="mt-6 flex flex-col gap-3">
            <button type="button" id="saveReadwiseTokenButton" class="w-full px-4 py-2 bg-[#2B70F6] hover:bg-blue-700 text-white font-medium rounded-md transition-colors">Save Token</button>
            <button type="button" id="updateReadwiseButton" class="w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-md transition-colors">Sync Readwise Links</button>
          </div>

          <p class="mt-3 text-xs text-gray-500">
            Don’t have a token? Generate it at <a href="https://readwise.io/access_token" target="_blank" class="text-[#2B70F6] underline">readwise.io/access_token</a>.
          </p>
        </div>
      </section>
    </div>
  </div>
</main>`;
  let opmlFile: string = "";

  const resultArea =
    document.querySelector<HTMLDivElement>("#manageResultArea")!;
  const manageContainer =
    document.querySelector<HTMLDivElement>("#manageContainer")!;
  const updateForm = document.getElementById("updateForm") as HTMLFormElement;
  const shareIdInput = document.getElementById(
    "shareIdInput",
  ) as HTMLInputElement;
  const tokenInput = document.getElementById("tokenInput") as HTMLInputElement;
  const nameInput = document.getElementById("nameInput") as HTMLInputElement;
  const slugInput = document.getElementById("slugInput") as HTMLInputElement;
  const readwiseTokenInput = document.getElementById(
    "readwiseTokenInput",
  ) as HTMLInputElement;

  const logoutButton = document.getElementById(
    "logoutButton",
  ) as HTMLButtonElement;

  // ------------------------------------------------------------------
  // Tabs logic – simple show/hide with Tailwind classes
  // ------------------------------------------------------------------
  const tabFeedsBtn = document.getElementById(
    "tabFeedsBtn",
  ) as HTMLButtonElement;
  const tabReadwiseBtn = document.getElementById(
    "tabReadwiseBtn",
  ) as HTMLButtonElement;
  const feedsPanel = document.getElementById("feedsTabPanel") as HTMLElement;
  const readwisePanel = document.getElementById(
    "readwiseTabPanel",
  ) as HTMLElement;

  function activateTab(tab: "feeds" | "readwise") {
    if (tab === "feeds") {
      feedsPanel.classList.remove("hidden");
      readwisePanel.classList.add("hidden");

      tabFeedsBtn.classList.add(
        "text-blue-600",
        "border-blue-600",
        "border-b-2",
        "-mb-px",
      );
      tabReadwiseBtn.classList.remove(
        "text-blue-600",
        "border-blue-600",
        "border-b-2",
        "-mb-px",
      );
      tabReadwiseBtn.classList.add("text-gray-600");
    } else {
      readwisePanel.classList.remove("hidden");
      feedsPanel.classList.add("hidden");

      tabReadwiseBtn.classList.add(
        "text-blue-600",
        "border-blue-600",
        "border-b-2",
        "-mb-px",
      );
      tabFeedsBtn.classList.remove(
        "text-blue-600",
        "border-blue-600",
        "border-b-2",
        "-mb-px",
      );
      tabFeedsBtn.classList.add("text-gray-600");
    }
  }

  tabFeedsBtn.addEventListener("click", () => activateTab("feeds"));
  tabReadwiseBtn.addEventListener("click", () => activateTab("readwise"));

  // set default tab
  activateTab("feeds");

  // ------------------------------------------------------------------
  // Logout handling
  // ------------------------------------------------------------------

  logoutButton.addEventListener("click", () => {
    clearAuthToken();
    // Optionally, for security, also clear query param if user manually appended again
    try {
      const cleanUrl = new URL(window.location.href);
      cleanUrl.searchParams.delete("token");
      window.history.replaceState({}, "", cleanUrl.toString());
    } catch {
      /* ignore */
    }
    window.location.href = "/";
  });

  const feedDisplay = document.getElementById("feedDisplay")!;
  const opmlUploadArea = document.getElementById("opmlUploadArea")!;
  opmlUploadArea.appendChild(
    opmlUpload((opmlText, feeds) => {
      opmlFile = opmlText;
      feedDisplay.innerHTML = "";
      renderFeeds(feedDisplay, feeds);
    }),
  );

  // ------------------------------------------------------------------
  // Token handling – retrieve from URL (first visit) or sessionStorage
  // ------------------------------------------------------------------

  const urlParams = new URLSearchParams(window.location.search);
  let token: string | undefined = urlParams.get("token") ?? undefined;

  if (token) {
    // Persist for the rest of the session so the query parameter is no longer required
    setAuthToken(token);
    // Remove token from the address bar for cleanliness & to avoid leaking via
    // referrer headers when navigating away.
    try {
      const cleanUrl = new URL(window.location.href);
      cleanUrl.searchParams.delete("token");
      window.history.replaceState({}, "", cleanUrl.toString());
    } catch {
      /* ignore */
    }
  } else {
    token = getAuthToken() ?? undefined;
  }

  if (!token) {
    resultArea.innerHTML = `<div class="error">Authentication token missing. Please use the link provided in your email or <a href="/login">log in</a>.</div>`;
    console.error("Token missing from URL parameters and storage.");
    return;
  }

  const authToken: string = token; // now guaranteed to be a string
  tokenInput.value = authToken;

  fetch(`${API_URL}/api/manage/verify?token=${authToken}`)
    .then(async (response) => {
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Verification failed:", response.status, errorText);
        // Provided token is invalid or expired – clear it and redirect the user
        // to the login page so they can obtain a new one.
        redirectToLogin();
        return;
      }
      const data = (await response.json()) as Share & {
        readwise_token_set?: boolean;
      };
      shareIdInput.value = data.share_id;
      // pre-fill OPML content so that future updates work even when the user
      // does not upload a new file
      opmlFile = data.opml_content || "";
      nameInput.value = data.name;
      slugInput.value = data.slug || "";
      manageContainer.style.display = "block";
      logoutButton.classList.remove("hidden");
      if (data.readwise_token_set) {
        readwiseTokenInput.value = "********"; // masked indicator
      }
      const shareLinkArea = document.getElementById("shareLinkArea")!;
      const path = data.slug ? `/s/${data.slug}` : `/s/${data.share_id}`;
      const fullUrl = `${window.location.origin}${path}`;
      shareLinkArea.innerHTML = `<p class="text-sm text-gray-700">Share link: <a href="${path}" target="_blank">${fullUrl}</a></p>`;
      resultArea.innerHTML = "";
    })
    .catch((error) => {
      console.error("Error fetching verification data:", error);
      resultArea.innerHTML = `<div class="error">Error contacting server to verify your link. Please try again later.</div>`;
      manageContainer.style.display = "none";
    });

  updateForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const formData = new FormData(updateForm);

    const opmlBlob = new Blob([opmlFile], { type: "text/xml" });
    formData.delete("opmlFile");
    formData.set("opmlFile", opmlBlob, "feeds.opml");

    console.log(
      "Submitting update form with data:",
      Object.fromEntries(formData.entries()),
    );

    try {
      const response = await fetch(`${API_URL}/api/manage/update`, {
        method: "POST",
        body: formData,
      });

      if (response.status === 401 || response.status === 403) {
        redirectToLogin();
        return;
      }

      if (response.ok) {
        showToast(
          "Update successful",
          "Your feed collection was updated.",
          "success",
        );

        // Update displayed share link to reflect any slug change
        const newSlug = slugInput.value.trim();
        const newPath = newSlug ? `/s/${newSlug}` : `/s/${shareIdInput.value}`;
        const newFullUrl = `${window.location.origin}${newPath}`;
        const shareLinkArea = document.getElementById("shareLinkArea")!;
        shareLinkArea.innerHTML = `<p class="text-sm text-gray-700">Share link: <a href="${newPath}" target="_blank">${newFullUrl}</a></p>`;
      } else {
        let msg = "Could not save your changes.";
        const err = (await response.json()) as { error: string };
        if (err && err.error) msg = err.error;
        showToast("Update failed", msg, "error");
      }

      // Clear the Readwise token field after submitting to avoid leaving sensitive data in the UI
      readwiseTokenInput.value = "";
    } catch (error) {
      console.error("Error submitting update form:", error);
      showToast(
        "Update failed",
        "Could not connect to the server to save your changes.",
        "error",
      );
    }
  });

  // Sync Readwise button handler
  const updateReadwiseButton = document.getElementById(
    "updateReadwiseButton",
  ) as HTMLButtonElement;
  updateReadwiseButton.addEventListener("click", async () => {
    updateReadwiseButton.disabled = true;
    updateReadwiseButton.textContent = "Syncing…";
    try {
      const res = await fetch(`${API_URL}/api/links/update-readwise`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: authToken }),
      });
      const data = (await res.json()) as UpdateReadwiseResponse;
      if (res.status === 401 || res.status === 403) {
        redirectToLogin();
        return;
      }

      if (res.status === 401 || res.status === 403) {
        redirectToLogin();
        return;
      }

      if (res.ok) {
        showToast(
          "Readwise sync complete",
          data.message || `Imported ${data.newLinks ?? 0} links`,
          "success",
        );
      } else {
        showToast(
          "Readwise sync failed",
          data.error || "An error occurred while syncing",
          "error",
        );
      }
    } catch (error) {
      console.error("Error syncing Readwise links:", error);
      showToast(
        "Readwise sync failed",
        "Could not connect to the server.",
        "error",
      );
    } finally {
      updateReadwiseButton.disabled = false;
      updateReadwiseButton.textContent = "Sync Readwise Links";
    }
  });

  // ------------------------------------------------------------------
  // Save Readwise Token only (does not change feeds)
  // ------------------------------------------------------------------
  const saveReadwiseTokenButton = document.getElementById(
    "saveReadwiseTokenButton",
  ) as HTMLButtonElement;

  saveReadwiseTokenButton.addEventListener("click", async () => {
    if (
      readwiseTokenInput.value.trim() === "" ||
      readwiseTokenInput.value === "********"
    ) {
      showToast(
        "Nothing to save",
        "Please paste your Readwise token first.",
        "error",
      );
      return;
    }

    saveReadwiseTokenButton.disabled = true;
    saveReadwiseTokenButton.textContent = "Saving…";

    const formData = new FormData();
    formData.set("share_id", shareIdInput.value);
    formData.set("token", tokenInput.value);

    // Only send the Readwise token; server will leave other fields unchanged
    formData.set("readwise_token", readwiseTokenInput.value.trim());

    try {
      const res = await fetch(`${API_URL}/api/manage/update`, {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        showToast(
          "Token saved",
          "Your Readwise token was saved securely.",
          "success",
        );
        // Mask the saved token so user knows it's stored
        readwiseTokenInput.value = "********";
      } else {
        const err = (await res.json()) as { error: string };
        showToast("Failed", err.error || "Could not save token", "error");
      }
    } catch (error) {
      console.error("Error saving Readwise token", error);
      showToast("Failed", "Could not connect to server", "error");
    } finally {
      saveReadwiseTokenButton.disabled = false;
      saveReadwiseTokenButton.textContent = "Save Token";
    }
  });
}
