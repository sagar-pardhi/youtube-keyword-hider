const KEYWORDS_KEY = "keywords";

const form = document.querySelector("#keyword-form");
const input = document.querySelector("#keyword-input");
const list = document.querySelector("#keyword-list");
const count = document.querySelector("#keyword-count");
const emptyState = document.querySelector("#empty-state");
const status = document.querySelector("#status");
let keywords = [];
let saving = false;

function render() {
  list.replaceChildren();
  count.textContent = String(keywords.length);
  emptyState.hidden = keywords.length > 0;

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

  form.querySelector("button").disabled = saving;
  input.disabled = saving;
}

async function updateKeywords(nextKeywords) {
  saving = true;
  status.textContent = "";
  render();

  try {
    await chrome.storage.sync.set({ [KEYWORDS_KEY]: nextKeywords });
    keywords = nextKeywords;
  } catch {
    status.textContent = "Could not save keywords. Try again.";
  } finally {
    saving = false;
    render();
  }
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

chrome.storage.sync.get({ [KEYWORDS_KEY]: [] }, (result) => {
  keywords = Array.isArray(result[KEYWORDS_KEY])
    ? result[KEYWORDS_KEY].filter((keyword) => typeof keyword === "string")
    : [];
  render();
});
