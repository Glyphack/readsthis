import { header } from "./components/pageHeader";

export function renderAboutPage(app: HTMLDivElement) {
  app.innerHTML = `
<main class="container max-w-4xl mx-auto px-4 py-8">
  ${header().outerHTML}
  <h2 class="text-2xl font-semibold text-gray-900 mb-4">About</h2>
  <div class="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
    <p class="text-gray-600">
      This site was created by
      <a href="https://glyphack.com/" target="_blank" rel="noopener noreferrer"
         class="underline text-primary hover:text-blue-700">glyphack</a>
      to allow people who like to share their feeds to do so.
      You can put the feed link on your website or in the public <a href="/list" class="underline text-primary hover:text-blue-700">directory</a> of this site.
    </p>
  </div>
</main> 
  `;
}
