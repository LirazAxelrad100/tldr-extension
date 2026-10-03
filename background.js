chrome.runtime.onInstalled.addListener(() => {
  // Clear old menu items, then add ours (avoids duplicates on reload)
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: "tldr-page",
      title: "TL;DR this page",
      contexts: ["page", "selection"]
    });
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== "tldr-page") return;

  const stored = await chrome.storage.local.get("apiKey");
  const apiKey = stored.apiKey;

  if (!apiKey) {
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => alert("Please set your API key first (right-click the extension icon → Options).")
    });
    return;
  }

  // Grab the page's title and all its visible text
  const [{ result: page }] = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => ({
      title: document.querySelector("h1")?.innerText || document.title,
      body: document.body.innerText
    })
  });

  const prompt =
    "Summarize the following web page section by section, following its structure.\n\n" +
    "For EACH main section or topic on the page, output exactly:\n" +
    "1. a line starting with '## ' followed by that section's heading\n" +
    "2. the next line: one or two sentences summarizing that section\n\n" +
    "Use the page's real headings/topics. Cover each section separately — " +
    "do NOT merge everything into one paragraph. " +
    "Do not add any introduction or closing remarks.\n\n" +
    "Page content:\n\n" + page.body;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true"
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      messages: [
        { role: "user", content: prompt }
      ]
    })
  });

  const data = await response.json();
  const summary = data.content[0].text;

  // Draw the result as a floating panel on the page
  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: showPanel,
    args: [page.title, summary]
  });
});

// Runs inside the page: builds a floating summary panel
function showPanel(title, text) {
  const existing = document.getElementById("tldr-panel");
  if (existing) existing.remove();

  const panel = document.createElement("div");
  panel.id = "tldr-panel";
  panel.style.cssText =
    "position:fixed;top:20px;right:20px;z-index:2147483647;width:360px;max-height:80vh;" +
    "overflow-y:auto;background:#fff;color:#111;border:1px solid #ccc;border-radius:8px;" +
    "box-shadow:0 4px 16px rgba(0,0,0,0.2);padding:16px;font-family:sans-serif;font-size:13px;line-height:1.4;";

  const close = document.createElement("button");
  close.textContent = "✕";
  close.style.cssText =
    "position:absolute;top:8px;right:8px;border:none;background:none;font-size:16px;cursor:pointer;color:#666;";
  close.onclick = () => panel.remove();
  panel.appendChild(close);

  // "Save to .md" button: turns the summary into a Markdown file and downloads it
  const save = document.createElement("button");
  save.textContent = "Save to .md";
  save.style.cssText =
    "position:absolute;top:8px;right:36px;border:1px solid #ccc;border-radius:4px;background:#f5f5f5;" +
    "font-size:12px;padding:2px 8px;cursor:pointer;color:#333;";
  save.onclick = () => {
    const markdown = "# " + (title || "TL;DR") + "\n\n" + "Source: [" + location.href + "](" + location.href + ")" + "\n\n" + text.trim() + "\n";
    const fileName = (title || "tldr").replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() + ".md";
    const blob = new Blob([markdown], { type: "text/markdown" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(link.href);
  };
  panel.appendChild(save);

  if (title) {
    const h = document.createElement("h2");
    h.textContent = title;
    h.style.cssText = "margin:0 110px 8px 0;font-size:16px;color:#000;";
    panel.appendChild(h);
  }

  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith("#")) {
      const heading = document.createElement("h3");
      heading.textContent = line.replace(/^#+\s*/, "");
      heading.style.cssText = "margin:12px 0 3px;font-size:14px;color:#111;";
      panel.appendChild(heading);
    } else {
      const para = document.createElement("p");
      para.textContent = line.replace(/^-\s*/, "");
      para.style.cssText = "margin:0 0 8px;color:#333;";
      panel.appendChild(para);
    }
  }

  document.body.appendChild(panel);
}