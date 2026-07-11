// Curated list of platforms for profile social links, each with a small
// brand-colored icon so links read as recognizable chips instead of plain text.
const PLATFORMS = [
  { id: 'twitch', label: 'Twitch', icon: '🟣', color: '#9146FF', placeholder: 'https://twitch.tv/yourname' },
  { id: 'youtube', label: 'YouTube', icon: '🔴', color: '#FF0000', placeholder: 'https://youtube.com/@channel' },
  { id: 'twitter', label: 'X / Twitter', icon: '🐦', color: '#1DA1F2', placeholder: 'https://x.com/username' },
  { id: 'instagram', label: 'Instagram', icon: '📸', color: '#E1306C', placeholder: 'https://instagram.com/username' },
  { id: 'tiktok', label: 'TikTok', icon: '🎵', color: '#69C9D0', placeholder: 'https://tiktok.com/@username' },
  { id: 'discord', label: 'Discord', icon: '💬', color: '#5865F2', placeholder: 'https://discord.gg/invite' },
  { id: 'steam', label: 'Steam', icon: '🎮', color: '#66c0f4', placeholder: 'https://steamcommunity.com/id/username' },
  { id: 'bluesky', label: 'Bluesky', icon: '🦋', color: '#0085FF', placeholder: 'https://bsky.app/profile/handle' },
  { id: 'website', label: 'Website', icon: '🌐', color: '#e8b04b', placeholder: 'https://yoursite.com' },
  { id: 'other', label: 'Other', icon: '✨', color: '#e8b04b', placeholder: 'https://example.com' }
];

function getPlatform(id) {
  return PLATFORMS.find((p) => p.id === id) || { id, label: id, icon: '🔗', color: '#e8b04b' };
}

module.exports = { PLATFORMS, getPlatform };
