import { expect, test, describe } from "bun:test";
import fs from "fs";
import path from "path";
import { parseOpml } from "../utils/parseOpml.ts";

describe("OPML Parser", () => {
  test("should parse Reader_Feeds.opml without errors", async () => {
    // Read the test OPML file
    const opmlPath = path.resolve("shared/test/Reader_Feeds.opml");
    const xmlContent = fs.readFileSync(opmlPath, "utf-8");

    // Parse the OPML content
    const result = await parseOpml(xmlContent);

    // Basic validation - ensure we have results
    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);

    // With Reader_Feeds.opml, we expect to have one top-level outline with "Feeds" title
    // that contains multiple feed items as children
    expect(result.length).toBeGreaterThan(0);

    // Check first item is the "Feeds" container
    const feedsContainer = result[0];
    expect(feedsContainer.title).toBe("Feeds");

    // Verify we parsed multiple feed items
    expect(feedsContainer.feeds.length).toBeGreaterThan(0);

    for (const feed of feedsContainer.feeds) {
      expect(feed.title).toBeDefined();
      expect(feed.xmlUrl).toBeDefined();
    }

    const simonFeed = feedsContainer.feeds.find(
      (f) => f.title === "Simon Eskildsen",
    );
    expect(simonFeed).toBeDefined();
    expect(simonFeed?.xmlUrl).toBe("https://sirupsen.com/atom.xml");
  });
});
