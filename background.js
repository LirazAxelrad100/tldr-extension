chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "tldr-selection",
    title: "TL;DR this",
    contexts: ["selection"]
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== "tldr-selection") return;

  const stored = await chrome.storage.local.get("apiKey");
  const apiKey = stored.apiKey;

  if (!apiKey) {
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => alert("Please set your API key first (right-click extension icon → Options).")
    });
    return;
  }

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
      max_tokens: 200,
      messages: [
        { role: "user", content: "TL;DR this in 2-3 sentences:\n\n" + info.selectionText }
      ]
    })
  });

  const data = await response.json();
  const summary = data.content[0].text;

  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: (msg) => alert(msg),
    args: [summary]
  });
});
