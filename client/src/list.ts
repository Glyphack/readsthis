import { API_URL } from "./config";
import { header } from "./components/pageHeader";
import type { SharedFeedDirectoryResponse } from "@shared/types";

export async function renderListPage(app: HTMLDivElement) {
  app.innerHTML = `
<main class="container max-w-4xl mx-auto px-4 py-8">
  ${header().outerHTML}
    <h2 class="text-2xl font-semibold text-gray-900 mb-4">Shared Feed Collections</h2>
    <div id="feedDirectoryContainer" class="bg-white rounded-lg border border-gray-200 shadow-sm p-6"> 
      <p class="loading-message text-center text-gray-600">Loading shared feeds...</p>                                                
  </div>
</main>
`;
  const container = document.querySelector<HTMLDivElement>(
    "#feedDirectoryContainer",
  )!;
  try {
    const response = await fetch(`${API_URL}/api/shares`);
    if (!response.ok) {
      throw new Error(`Failed to fetch shared feeds: ${response.status}`);
    }
    const data = (await response.json()) as SharedFeedDirectoryResponse;
    if (data.length === 0) {
      container.innerHTML = `<p class="text-center text-gray-600">No feeds have been shared yet.</p>`;
      return;
    }
    const listEl = document.createElement("ul");
    listEl.className = "space-y-2";
    data.forEach((entry) => {
      const li = document.createElement("li");
      const a = document.createElement("a");
      a.href = entry.url;
      a.textContent = entry.name;
      a.className = "text-blue-600 hover:underline";
      li.appendChild(a);
      listEl.appendChild(li);
    });
    container.innerHTML = "";
    container.appendChild(listEl);
  } catch (error) {
    console.error("Error loading shared feeds:", error);
    container.innerHTML = `<p class="text-center text-red-600">Error loading shared feeds: ${
      error instanceof Error ? error.message : "Unknown error"
    } </p>`;
  }
}
