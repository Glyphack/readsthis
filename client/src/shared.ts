import { parseOpml } from "@shared/utils/parseOpml";
import { API_URL } from "./config";
import { createFeedSection } from "@client/components/feedSection";
import { header } from "@client/components/pageHeader";
import { ReadwiseDocument } from "@shared/types/types";

export async function renderSharedFeedPage(
  app: HTMLDivElement,
  shareId: string,
) {
  app.innerHTML = `
  <main class="container max-w-4xl mx-auto px-4 py-8">
    ${header().outerHTML}
    <!-- Share button moved to header -->
    <div class="shared-feed-container">
      <p class="loading-message text-center text-gray-600">Loading shared feed collection...</p>
    </div>
    <div id="readsDisplay" class="mt-8"></div>
    <div id="feedDisplay"></div>
  </main>
  `;

  const feedDisplay = document.querySelector<HTMLDivElement>("#feedDisplay")!;
  const sharedFeedContainer = document.querySelector<HTMLDivElement>(
    ".shared-feed-container",
  )!;

  try {
    const response = await fetch(`${API_URL}/api/shares/${shareId}`);

    if (!response.ok) {
      const errorData = (await response.json()) as { error?: string };
      throw new Error(errorData.error || "Failed to fetch shared feed");
    }

    const data = (await response.json()) as { opml: string; name: string };

    const feedGroups = await parseOpml(data.opml);

    sharedFeedContainer.innerHTML = ``;
    const feedSection = createFeedSection(
      feedGroups,
      data.opml,
      false,
      `${data.name}'s Feed` || "Feed",
    );
    feedDisplay.innerHTML = "";
    feedDisplay.appendChild(feedSection);

    // Fetch and render Readwise shared links, if any
    try {
      const idParam = shareId.includes("-")
        ? `share_id=${shareId}`
        : `slug=${shareId}`;
      const readsRes = await fetch(`${API_URL}/api/reads?${idParam}`);
      if (readsRes.ok) {
        const reads = (await readsRes.json()) as ReadwiseDocument[];
        renderReads(reads);
      } else {
        console.warn("Failed to load shared links");
      }
    } catch (e) {
      console.error("Error loading Readwise links:", e);
    }
  } catch (error) {
    console.error("Error loading shared feed:", error);
    sharedFeedContainer.innerHTML = `
			<div class="error">
				<h2>Error Loading Shared Feed</h2>
				<p>${error instanceof Error ? error.message : "An error occurred while loading the shared feed"}</p>
				<p>The share link may be invalid or has expired.</p>
			</div>
		`;
    feedDisplay.innerHTML = "";
  }
}

function renderReads(reads: ReadwiseDocument[]) {
  const readsDisplay = document.getElementById("readsDisplay")!;
  if (reads.length === 0) {
    readsDisplay.innerHTML = "";
    return;
  }
  readsDisplay.innerHTML = `
      <div id="readsCard" class="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden mb-10">
        <div class="p-6 border-b border-gray-200">
          <h2 class="text-2xl font-semibold text-gray-900">Readings</h2>
          <p class="text-sm text-gray-600 mt-1">Links from the web that I find interesting</p>
        </div>
        <ul id="readsList" class="divide-y divide-gray-200 list-none pl-0"></ul>
      </div>
  `;

  const list = readsDisplay.querySelector<HTMLUListElement>("#readsList")!;

  reads.forEach((doc) => {
    const li = document.createElement("li");
    // Layout: left side holds title and (optional) author stacked vertically,
    // right side shows the date. Flexbox with column for the left block keeps
    // the author directly under the title while the overall row remains
    // horizontally spaced by justify-between.
    li.className = "flex gap-4 px-6 py-4 w-full hover:bg-gray-50 transition-colors";

    const title = doc.title || doc.source_url;
    const dateStr = doc.saved_at
      ? new Date(doc.saved_at).toLocaleDateString()
      : "";

    const authorStr = doc.author?.trim() || "";
    li.innerHTML = `
        <div class="flex-1 min-w-0">
          <a href="${doc.source_url}" target="_blank" class="block text-blue-600 hover:underline font-medium break-words text-left">${title}</a>
          ${authorStr ? `<div class=\"text-sm text-gray-500 mt-0.5 break-words text-left\">${authorStr}</div>` : ""}
        </div>
        ${dateStr ? `<span class=\"text-sm text-gray-500 whitespace-nowrap self-start ml-auto\">${dateStr}</span>` : ""}
    `;

    list.appendChild(li);
  });

  // Visual separator before feed section for clarity
  const separator = document.createElement("hr");
  separator.className = "my-8 border-gray-300";
  readsDisplay.appendChild(separator);
}
