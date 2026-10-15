const KEYWORDS_KEY = "keywords";
const EXCLUDED_CHANNELS_KEY = "excludedChannels";
const CARD_SELECTOR = [
  "ytd-rich-item-renderer",
  "ytd-video-renderer",
  "ytd-compact-video-renderer",
  "ytd-grid-video-renderer",
].join(", ");
const TITLE_SELECTOR = "#video-title, #video-title-link";
const CHANNEL_SELECTOR = "#channel-name, #byline, ytd-channel-name";
const SHORTS_SELECTOR = "ytd-reel-item-renderer, ytd-reel-shelf-renderer";
const HIDDEN_CLASS = "yth-keyword-hidden";
const ENABLED_KEY = "filterEnabled";

function isChannelId(value) {
  return /^UC[A-Za-z0-9_-]{22}$/.test(value);
}

let keywords = [];
let excludedChannels = [];
let enabled = true;
const pendingCards = new Set();
let flushScheduled = false;

function shouldSkip(card, titleLink) {
  return Boolean(
    card.matches(SHORTS_SELECTOR) ||
    card.querySelector(SHORTS_SELECTOR) ||
    titleLink.getAttribute("href")?.includes("/shorts/"),
  );
}

function getCardInfo(card) {
  const titleLink = card.querySelector(TITLE_SELECTOR);
  if (!titleLink || shouldSkip(card, titleLink)) return null;

  const title =
    titleLink.textContent.trim() ||
    titleLink.getAttribute("title")?.trim() ||
    titleLink.getAttribute("aria-label")?.trim() ||
    "";
  const channelNames = [...card.querySelectorAll(CHANNEL_SELECTOR)]
    .map((element) => element.textContent.trim())
    .filter(Boolean);
  const channelIds = [
    ...[...card.querySelectorAll('a[href*="/channel/"]')].map((link) => {
      try {
        return new URL(link.href, location.origin).pathname.match(
          /^\/channel\/([^/]+)/,
        )?.[1];
      } catch {
        return null;
      }
    }),
    ...[...card.querySelectorAll("[data-channel-id], [channel-id]")].map(
      (element) =>
        element.getAttribute("data-channel-id") ||
        element.getAttribute("channel-id"),
    ),
  ].filter(Boolean);

  return { title, channelNames, channelIds };
}

function filterCard(card) {
  const cardInfo = getCardInfo(card);
  if (!enabled || cardInfo === null) {
    card.classList.remove(HIDDEN_CLASS);
    return;
  }

  const excluded = excludedChannels.some((channel) => {
    if (isChannelId(channel)) return cardInfo.channelIds.includes(channel);
    const normalizedChannel = channel.toLocaleLowerCase();
    return cardInfo.channelNames.some(
      (name) => name.toLocaleLowerCase() === normalizedChannel,
    );
  });
  if (excluded) {
    card.classList.remove(HIDDEN_CLASS);
    return;
  }

  const searchableText = [cardInfo.title, ...cardInfo.channelNames]
    .join(" ")
    .toLowerCase();
  const shouldHide = keywords.some((keyword) =>
    searchableText.includes(keyword),
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

chrome.storage.sync.get(
  { [KEYWORDS_KEY]: [], [EXCLUDED_CHANNELS_KEY]: [], [ENABLED_KEY]: true },
  (result) => {
    keywords = Array.isArray(result[KEYWORDS_KEY])
      ? result[KEYWORDS_KEY].filter((keyword) => typeof keyword === "string")
          .map((keyword) => keyword.trim().toLowerCase())
          .filter(Boolean)
      : [];
    excludedChannels = Array.isArray(result[EXCLUDED_CHANNELS_KEY])
      ? result[EXCLUDED_CHANNELS_KEY].filter(
          (channel) => typeof channel === "string",
        )
          .map((channel) => channel.trim())
          .filter(Boolean)
      : [];
    enabled = result[ENABLED_KEY] !== false;
    scanAllCards();
  },
);

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "sync") return;

  if (changes[KEYWORDS_KEY]) {
    const nextKeywords = changes[KEYWORDS_KEY].newValue;
    keywords = Array.isArray(nextKeywords)
      ? nextKeywords
          .filter((keyword) => typeof keyword === "string")
          .map((keyword) => keyword.trim().toLowerCase())
          .filter(Boolean)
      : [];
  }
  if (changes[EXCLUDED_CHANNELS_KEY]) {
    const nextChannels = changes[EXCLUDED_CHANNELS_KEY].newValue;
    excludedChannels = Array.isArray(nextChannels)
      ? nextChannels
          .filter((channel) => typeof channel === "string")
          .map((channel) => channel.trim())
          .filter(Boolean)
      : [];
  }
  if (changes[ENABLED_KEY]) enabled = changes[ENABLED_KEY].newValue !== false;
  scanAllCards();
});

document.addEventListener("yt-navigate-finish", scanAllCards);
document.addEventListener("yt-page-data-updated", scanAllCards);
