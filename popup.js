document.getElementById("go").addEventListener("click", async () => {
  const stored = await chrome.storage.local.get("apiKey");
  const apiKey = stored.apiKey;

  if (!apiKey) {
    alert("Please set your API key first (right-click the extension icon → Options).");
    return;
  }

  // Grab the page's title AND all its visible text
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const [{ result: page }] = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => ({
      title: document.querySelector("h1")?.innerText || document.title,
      body: document.body.innerText
    })
  });

  const button = document.getElementById("go");
  button.textContent = "Summarizing...";

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

  button.textContent = "Summarize this page";
  renderSummary(page.title, summary);
});

// Show the article title, then Claude's "## heading / sentence" summary as a tidy list
function renderSummary(title, text) {
  const result = document.getElementById("result");
  result.innerHTML = "";

  if (title) {
    const articleTitle = document.createElement("h2");
    articleTitle.textContent = title;
    result.appendChild(articleTitle);
  }

  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line) continue;

    if (line.startsWith("#")) {
      const heading = document.createElement("h3");
      heading.textContent = line.replace(/^#+\s*/, "");
      result.appendChild(heading);
    } else {
      const para = document.createElement("p");
      para.textContent = line.replace(/^-\s*/, "");
      result.appendChild(para);
    }
  }
}