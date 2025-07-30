import { API_URL } from "./config";
import { header } from "./components/pageHeader";

export function renderLoginPage(app: HTMLDivElement) {
  app.innerHTML = `
<main class="container max-w-4xl mx-auto px-4 py-8">
  ${header().outerHTML}
  <div class="flex flex-col items-center mb-8">
    <h1 class="text-2xl font-bold text-gray-900 mb-4">Manage Your Shared Collections</h1>
    <p class="mb-6 text-gray-600">Enter your email to receive a management link</p>
    <div class="w-full max-w-md">
      <form id="loginForm" class="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
        <div class="mb-4">
          <input type="email" id="email" placeholder="you@example.com" required class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500">
        </div>
        <button id="requestLinkButton" class="w-full px-4 py-2 bg-[#2B70F6] hover:bg-blue-700 text-white font-medium rounded-md transition-colors">
          Send Me a Management Link
        </button>
      </form>
      <div id="manageResultArea" class="mt-4"></div>
    </div>
  </div>
  <div class="flex justify-center">
    <a href="/" class="px-4 py-2 bg-white border border-[#2B70F6] text-[#2B70F6] hover:bg-blue-50 font-medium rounded-md transition-colors">
      Back to Home
    </a>
  </div>
</main>
`;

  const resultArea =
    document.querySelector<HTMLDivElement>("#manageResultArea")!;
  const loginForm = document.getElementById("loginForm") as HTMLFormElement;

  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("email") as HTMLInputElement;
    resultArea.innerHTML = `<div class="info">Saving changes...</div>`;
    fetch(`${API_URL}/api/manage/request-link`, {
      method: "POST",
      body: JSON.stringify({ email: email.value }),
    })
      .then(async (response) => {
        if (!response.ok) {
          resultArea.innerHTML = `<div class="error">Cannot send link. Try again.</div>`;
          return;
        }
        const body = (await response.json()) as { msg: string };
        resultArea.innerHTML = `<div class="info">${body.msg}</div>`;
      })
      .catch((error) => {
        console.log(error);
        resultArea.innerHTML = `<div class="error">Error verifying token.</div>`;
      });
  });
}
