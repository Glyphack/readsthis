import { createEl } from "@client/utils/dom";
import { getAuthToken } from "../common";

export function header(): HTMLElement {
  const header = createEl(
    "header",
    {
      className:
        "flex flex-col items-center mb-8 transform transition-transform duration-200 [transform-style:preserve-3d] hover:[transform:perspective(500px)_rotateX(5deg)_rotateY(5deg)]",
    },
    `
    <a href="/">
    <div class="flex justify-center mb-4">
      <div class="flex items-center justify-center w-12 h-12 rounded-full bg-[#2B70F6] text-white">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M4 11a9 9 0 0 1 9 9"/>
          <path d="M4 4a16 16 0 0 1 16 16"/>
          <circle cx="5" cy="19" r="1"/>
        </svg>
      </div>
    </div>
    <h1 class="text-3xl md:text-4xl font-bold text-center text-gray-900 mb-2">ReadsThis</h1>
    </a>
    <p class="text-center text-gray-600 leading-relaxed">
      Collection of interesting feeds shared by
      <a href="/list" class="underline text-primary hover:text-blue-700">people</a>
      |
      <a href="/about" class="underline text-primary hover:text-blue-700">About</a>
      |
      <a href="/" class="underline text-primary hover:text-blue-700">Share Your Readings</a>
      ${getAuthToken() ?
        ' | <a href="/manage" class="underline text-primary hover:text-blue-700">Manage Profile</a>' : ''}
    </p>
  `,
  );
  return header;
}
