import type { Feed, FeedGroup } from "../types";
import { DOMParser } from "xmldom";

export interface OutlineItem {
  text: string;
  xmlUrl?: string;
  htmlUrl?: string;
  description?: string;
  children: OutlineItem[];
}

export function parseOpml(xmlContent: string): Promise<FeedGroup[]> {
  return new Promise((resolve, reject) => {
    try {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlContent, "text/xml");
      const bodyElement = xmlDoc.getElementsByTagName("body")[0];
      if (!bodyElement) {
        throw new Error("Invalid OPML: No body element found");
      }
      const outlines = parseOutlineElements(bodyElement.childNodes);
      const feedGroups: FeedGroup[] = outlines.map((outline) =>
        convertToFeedGroup(outline),
      );
      resolve(feedGroups);
    } catch (error) {
      reject(error);
    }
  });
}

function parseOutlineElements(
  nodes: NodeListOf<ChildNode> | ArrayLike<ChildNode>,
): OutlineItem[] {
  const outlines: OutlineItem[] = [];

  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    if (
      node.nodeType === 1 &&
      (node as Element).tagName.toLowerCase() === "outline"
    ) {
      const element = node as Element;
      const item: OutlineItem = {
        text:
          element.getAttribute("text") || element.getAttribute("title") || "",
        children: [],
      };

      // Add optional attributes if they exist
      const xmlUrl = element.getAttribute("xmlUrl");
      if (xmlUrl) item.xmlUrl = xmlUrl;

      const htmlUrl = element.getAttribute("htmlUrl");
      if (htmlUrl) item.htmlUrl = htmlUrl;

      const description = element.getAttribute("description");
      if (description) item.description = description;

      // Recursively parse child outlines
      const childOutlines = [];
      for (let j = 0; j < element.childNodes.length; j++) {
        const childNode = element.childNodes[j];
        if (
          childNode.nodeType === 1 &&
          (childNode as Element).tagName.toLowerCase() === "outline"
        ) {
          childOutlines.push(childNode);
        }
      }

      if (childOutlines.length > 0) {
        item.children = parseOutlineElements(childOutlines);
      }

      outlines.push(item);
    }
  }

  return outlines;
}

function convertToFeedGroup(outline: OutlineItem): FeedGroup {
  // If the outline has xmlUrl, it's a feed, not a group
  if (outline.xmlUrl) {
    return {
      title: outline.text,
      feeds: [
        {
          title: outline.text,
          xmlUrl: outline.xmlUrl,
          htmlUrl: outline.htmlUrl,
          description: outline.description,
        },
      ],
    };
  }

  // It's a group, process its children
  const feeds: Feed[] = [];

  // Process direct feed children
  const directFeeds = outline.children.filter((child) => child.xmlUrl);
  directFeeds.forEach((child) => {
    feeds.push({
      title: child.text,
      xmlUrl: child.xmlUrl!,
      htmlUrl: child.htmlUrl,
      description: child.description,
    });
  });

  // Handle nested groups
  const nestedGroups = outline.children.filter(
    (child) => !child.xmlUrl && child.children.length > 0,
  );
  nestedGroups.forEach((nestedGroup) => {
    const subGroup = convertToFeedGroup(nestedGroup);
    feeds.push(...subGroup.feeds);
  });

  return {
    title: outline.text,
    feeds,
  };
}
