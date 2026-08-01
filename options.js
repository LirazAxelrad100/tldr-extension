document.getElementById("save").addEventListener("click", async () => {
  const key = document.getElementById("apiKey").value;
  await chrome.storage.local.set({ apiKey: key });
  document.getElementById("status").textContent = "Saved!";
});

// When the page opens, show the key if one's already saved
chrome.storage.local.get("apiKey", (result) => {
  if (result.apiKey) {
    document.getElementById("apiKey").value = result.apiKey;
  }
});
