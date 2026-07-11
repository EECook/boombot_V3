// Simple in-memory presence tracker. Fine for a single-instance deploy like
// this one - if this ever runs on multiple server instances, presence would
// need to move to a shared store (e.g. Redis) instead.

const online = new Map(); // userId -> { userId, username, avatarUrl, discordId, page, socketIds: Set }

function addSocket({ userId, username, avatarUrl, discordId, page, socketId }) {
  let entry = online.get(userId);
  if (!entry) {
    entry = { userId, username, avatarUrl, discordId, page, socketIds: new Set() };
    online.set(userId, entry);
  }
  entry.page = page;
  entry.socketIds.add(socketId);
}

function setPage(userId, socketId, page) {
  const entry = online.get(userId);
  if (entry && entry.socketIds.has(socketId)) entry.page = page;
}

function removeSocket(userId, socketId) {
  const entry = online.get(userId);
  if (!entry) return;
  entry.socketIds.delete(socketId);
  if (entry.socketIds.size === 0) online.delete(userId);
}

function list() {
  return Array.from(online.values()).map(({ userId, username, avatarUrl, discordId, page }) => ({
    userId,
    username,
    avatarUrl,
    discordId,
    page
  }));
}

module.exports = { addSocket, setPage, removeSocket, list };
