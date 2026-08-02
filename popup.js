document.getElementById("go").addEventListener("click", async () => {
  const stored = await chrome.storage.local.get("apiKey");
  const apiKey = stored.apiKey;

  if (!apiKey) {
    alert("Please set your API key first (right-click the extension icon → Options).");
    return;
  }

  // Grab all the visible text from the current page
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const [{ result: text }] = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => document.body.innerText
  });

  document.getElementById("go").textContent = "Summarizing...";

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
        { role: "user", content: "TL;DR this in 2-3 sentences:\n\n" + text }
      ]
    })
  });

  const data = await response.json();
  const summary = data.content[0].text;

  document.getElementById("go").textContent = "Click me";
  alert(summary);
});