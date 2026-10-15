const KEYWORDS_KEY = "keywords";
const EXCLUDED_CHANNELS_KEY = "excludedChannels";
const ENABLED_KEY = "filterEnabled";
const MAX_KEYWORDS_BYTES = 7000;

const form = document.querySelector("#keyword-form");
const input = document.querySelector("#keyword-input");
const list = document.querySelector("#keyword-list");
const count = document.querySelector("#keyword-count");
const emptyState = document.querySelector("#empty-state");
const status = document.querySelector("#status");
const enabledInput = document.querySelector("#filter-enabled");
const filterState = document.querySelector("#filter-state");
const importButton = document.querySelector("#import-button");
const exportButton = document.querySelector("#export-button");
const importFile = document.querySelector("#import-file");
const channelForm = document.querySelector("#channel-form");
const channelInput = document.querySelector("#channel-input");
const channelList = document.querySelector("#channel-list");
const channelCount = document.querySelector("#channel-count");
const channelEmptyState = document.querySelector("#channel-empty-state");
let keywords = [];
let excludedChannels = [];
let enabled = true;
let saving = false;

function render() {
  list.replaceChildren();
  count.textContent = String(keywords.length);
  emptyState.hidden = keywords.length > 0;
  enabledInput.checked = enabled;
  filterState.textContent = enabled ? "On" : "Paused";
  channelList.replaceChildren();
  channelCount.textContent = String(excludedChannels.length);
  channelEmptyState.hidden = excludedChannels.length > 0;

  for (const keyword of keywords) {
    const item = document.createElement("li");
    item.className = "keyword-item";

    const text = document.createElement("span");
    text.className = "keyword-text";
    text.textContent = keyword;

    const remove = document.createElement("button");
    remove.className = "remove-button";
    remove.type = "button";
    remove.textContent = "Remove";
    remove.setAttribute("aria-label", `Remove keyword ${keyword}`);
    remove.disabled = saving;
    remove.addEventListener("click", () => {
      void updateKeywords(keywords.filter((entry) => entry !== keyword));
    });

    item.append(text, remove);
    list.append(item);
  }

  for (const channel of excludedChannels) {
    const item = document.createElement("li");
    item.className = "keyword-item";

    const text = document.createElement("span");
    text.className = "keyword-text";
    text.textContent = channel;

    const remove = document.createElement("button");
    remove.className = "remove-button";
    remove.type = "button";
    remove.textContent = "Remove";
    remove.setAttribute("aria-label", `Remove excluded channel ${channel}`);
    remove.disabled = saving;
    remove.addEventListener("click", () => {
      void updateExcludedChannels(
        excludedChannels.filter((entry) => entry !== channel),
      );
    });

    item.append(text, remove);
    channelList.append(item);
  }

  form.querySelector("button").disabled = saving;
  input.disabled = saving;
  channelForm.querySelector("button").disabled = saving;
  channelInput.disabled = saving;
  enabledInput.disabled = saving;
  importButton.disabled = saving;
  exportButton.disabled = saving;
}

function normalizeExcludedChannels(value) {
  if (
    !Array.isArray(value) ||
    value.some((entry) => typeof entry !== "string")
  ) {
    return null;
  }

  const normalized = [];
  const seen = new Set();
  for (const entry of value) {
    const channel = entry.trim();
    if (!channel) continue;
    if (channel.length > 100) return null;
    const key = isChannelId(channel) ? channel : channel.toLocaleLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      normalized.push(channel);
    }
  }
  return normalized;
}

function isChannelId(value) {
  return /^UC[A-Za-z0-9_-]{22}$/.test(value);
}

function normalizeKeywords(value) {
  if (
    !Array.isArray(value) ||
    value.some((entry) => typeof entry !== "string")
  ) {
    return null;
  }

  const normalized = [];
  const seen = new Set();
  for (const entry of value) {
    const keyword = entry.trim();
    if (!keyword) continue;
    if (keyword.length > 80) return null;
    const key = keyword.toLocaleLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      normalized.push(keyword);
    }
  }

  return normalized;
}

async function saveSettings(changes, nextState, successMessage = "") {
  saving = true;
  status.textContent = "";
  render();

  try {
    await chrome.storage.sync.set(changes);
    if (Object.hasOwn(nextState, KEYWORDS_KEY))
      keywords = nextState[KEYWORDS_KEY];
    if (Object.hasOwn(nextState, EXCLUDED_CHANNELS_KEY))
      excludedChannels = nextState[EXCLUDED_CHANNELS_KEY];
    if (Object.hasOwn(nextState, ENABLED_KEY)) enabled = nextState[ENABLED_KEY];
    status.textContent = successMessage;
  } catch {
    status.textContent =
      "Could not save changes. Check available Chrome Sync storage and try again.";
  } finally {
    saving = false;
    render();
  }
}

function updateKeywords(nextKeywords, successMessage = "") {
  return saveSettings(
    { [KEYWORDS_KEY]: nextKeywords },
    { [KEYWORDS_KEY]: nextKeywords },
    successMessage,
  );
}

function updateExcludedChannels(nextChannels, successMessage = "") {
  return saveSettings(
    { [EXCLUDED_CHANNELS_KEY]: nextChannels },
    { [EXCLUDED_CHANNELS_KEY]: nextChannels },
    successMessage,
  );
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const keyword = input.value.trim();
  if (!keyword) return;

  if (
    keywords.some(
      (entry) => entry.toLocaleLowerCase() === keyword.toLocaleLowerCase(),
    )
  ) {
    status.textContent = "That keyword is already on your list.";
    input.select();
    return;
  }

  input.value = "";
  void updateKeywords([...keywords, keyword]);
  input.focus();
});

channelForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const channel = channelInput.value.trim();
  if (!channel) return;

  if (
    excludedChannels.some(
      (entry) =>
        (isChannelId(entry) && isChannelId(channel) && entry === channel) ||
        (!isChannelId(entry) &&
          !isChannelId(channel) &&
          entry.toLocaleLowerCase() === channel.toLocaleLowerCase()),
    )
  ) {
    status.textContent = "That channel is already excluded.";
    channelInput.select();
    return;
  }

  channelInput.value = "";
  void updateExcludedChannels([...excludedChannels, channel]);
  channelInput.focus();
});

enabledInput.addEventListener("change", () => {
  const nextEnabled = enabledInput.checked;
  void saveSettings(
    { [ENABLED_KEY]: nextEnabled },
    { [ENABLED_KEY]: nextEnabled },
  );
});

importButton.addEventListener("click", () => importFile.click());

importFile.addEventListener("change", async () => {
  const [file] = importFile.files ?? [];
  if (!file) return;

  try {
    const content = JSON.parse(await file.text());
    const importedKeywords = normalizeKeywords(
      Array.isArray(content) ? content : content?.keywords,
    );
    const importedChannels = Array.isArray(content)
      ? excludedChannels
      : normalizeExcludedChannels(content?.excludedChannels ?? []);
    if (
      !importedKeywords ||
      !importedChannels ||
      new TextEncoder().encode(
        JSON.stringify({
          keywords: importedKeywords,
          excludedChannels: importedChannels,
        }),
      ).length > MAX_KEYWORDS_BYTES
    ) {
      status.textContent =
        "Invalid file. Use a keyword list with entries up to 80 characters.";
      return;
    }

    await saveSettings(
      {
        [KEYWORDS_KEY]: importedKeywords,
        [EXCLUDED_CHANNELS_KEY]: importedChannels,
      },
      {
        [KEYWORDS_KEY]: importedKeywords,
        [EXCLUDED_CHANNELS_KEY]: importedChannels,
      },
      `Imported ${importedKeywords.length} keyword${importedKeywords.length === 1 ? "" : "s"} and ${importedChannels.length} excluded channel${importedChannels.length === 1 ? "" : "s"}.`,
    );
  } catch {
    status.textContent = "Could not read that JSON file.";
  } finally {
    importFile.value = "";
  }
});

exportButton.addEventListener("click", () => {
  const exportData = { version: 1, keywords, excludedChannels };
  const blob = new Blob([JSON.stringify(exportData, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "youtube-keyword-hider-keywords.json";
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  status.textContent = `Exported ${keywords.length} keyword${keywords.length === 1 ? "" : "s"} and ${excludedChannels.length} excluded channel${excludedChannels.length === 1 ? "" : "s"}.`;
});

chrome.storage.sync.get(
  { [KEYWORDS_KEY]: [], [EXCLUDED_CHANNELS_KEY]: [], [ENABLED_KEY]: true },
  (result) => {
    keywords = normalizeKeywords(result[KEYWORDS_KEY]) ?? [];
    excludedChannels =
      normalizeExcludedChannels(result[EXCLUDED_CHANNELS_KEY]) ?? [];
    enabled = result[ENABLED_KEY] !== false;
    render();
  },
);

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "sync") return;
  if (changes[KEYWORDS_KEY]) {
    keywords = normalizeKeywords(changes[KEYWORDS_KEY].newValue) ?? [];
  }
  if (changes[EXCLUDED_CHANNELS_KEY]) {
    excludedChannels =
      normalizeExcludedChannels(changes[EXCLUDED_CHANNELS_KEY].newValue) ?? [];
  }
  if (changes[ENABLED_KEY]) enabled = changes[ENABLED_KEY].newValue !== false;
  render();
});
