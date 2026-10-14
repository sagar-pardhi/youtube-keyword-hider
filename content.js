const KEYWORDS_KEY = "keywords";
const CARD_SELECTOR = [
  "ytd-rich-item-renderer",
  "ytd-video-renderer",
  "ytd-compact-video-renderer",
  "ytd-grid-video-renderer",
].join(", ");
const TITLE_SELECTOR = "#video-title, #video-title-link";
const SHORTS_SELECTOR = "ytd-reel-item-renderer, ytd-reel-shelf-renderer";
const HIDDEN_CLASS = "yth-keyword-hidden";

let keywords = [];
const pendingCards = new Set();
let flushScheduled = false;

function shouldSkip(card, titleLink) {
  return Boolean(
    card.matches(SHORTS_SELECTOR) ||
    card.querySelector(SHORTS_SELECTOR) ||
    titleLink.getAttribute("href")?.includes("/shorts/"),
  );
}

function getTitle(card) {
  const titleLink = card.querySelector(TITLE_SELECTOR);
  if (!titleLink || shouldSkip(card, titleLink)) return null;

  return (
    titleLink.textContent.trim() ||
    titleLink.getAttribute("title")?.trim() ||
    titleLink.getAttribute("aria-label")?.trim() ||
    ""
  );
}

function filterCard(card) {
  const title = getTitle(card);
  if (title === null) {
    card.classList.remove(HIDDEN_CLASS);
    return;
  }

  const normalizedTitle = title.toLowerCase();
  const shouldHide = keywords.some((keyword) =>
    normalizedTitle.includes(keyword),
  );
  card.classList.toggle(HIDDEN_CLASS, shouldHide);
}

function queueCard(card) {
  if (!card) return;
  pendingCards.add(card);

  if (flushScheduled) return;
  flushScheduled = true;
  queueMicrotask(() => {
    flushScheduled = false;
    for (const pendingCard of pendingCards) filterCard(pendingCard);
    pendingCards.clear();
  });
}

function scanNode(node) {
  if (!(node instanceof Element)) return;
  if (node.matches(CARD_SELECTOR)) queueCard(node);

  for (const card of node.querySelectorAll(CARD_SELECTOR)) queueCard(card);
}

function scanAllCards() {
  for (const card of document.querySelectorAll(CARD_SELECTOR)) queueCard(card);
}

const observer = new MutationObserver((records) => {
  for (const record of records) {
    const target =
      record.target instanceof Element
        ? record.target
        : record.target.parentElement;
    queueCard(target?.closest(CARD_SELECTOR));

    for (const node of record.addedNodes) scanNode(node);
  }
});

observer.observe(document.documentElement, { childList: true, subtree: true });
scanAllCards();

chrome.storage.sync.get({ [KEYWORDS_KEY]: [] }, (result) => {
  keywords = Array.isArray(result[KEYWORDS_KEY])
    ? result[KEYWORDS_KEY].filter((keyword) => typeof keyword === "string")
        .map((keyword) => keyword.trim().toLowerCase())
        .filter(Boolean)
    : [];
  scanAllCards();
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "sync" || !changes[KEYWORDS_KEY]) return;

  const nextKeywords = changes[KEYWORDS_KEY].newValue;
  keywords = Array.isArray(nextKeywords)
    ? nextKeywords
        .filter((keyword) => typeof keyword === "string")
        .map((keyword) => keyword.trim().toLowerCase())
        .filter(Boolean)
    : [];
  scanAllCards();
});

document.addEventListener("yt-navigate-finish", scanAllCards);
document.addEventListener("yt-page-data-updated", scanAllCards);
