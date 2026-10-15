// Public (opt-in) alumni directory display helpers. The directory itself comes from GET /directory, which returns
// only alumni who opted in and only the contacts each alumnus made visible.
const web = (v) => (/^https?:\/\//i.test(v) ? v : `https://${v}`);
const handle = (base) => (v) => (/^https?:\/\//i.test(v) || /\.[a-z]{2,}\//i.test(v) ? web(v) : `${base}${String(v).replace(/^@/, '')}`);

export const CONTACT_TYPES = [
  { key: 'email', label: 'Email', glyph: '@', bg: '#E6F0EB', color: '#0F3D2E', href: (v) => `mailto:${v}` },
  { key: 'mobile', label: 'Mobile', glyph: '☎', bg: '#E6F0EB', color: '#0F3D2E', href: (v) => `tel:${String(v).replace(/\s/g, '')}` },
  { key: 'messenger', label: 'Facebook Messenger', glyph: 'M', bg: '#E8F1FE', color: '#1D4ED8', href: handle('https://m.me/') },
  { key: 'facebook', label: 'Facebook', glyph: 'f', bg: '#E8F1FE', color: '#1D4ED8', href: handle('https://facebook.com/') },
  { key: 'linkedin', label: 'LinkedIn', glyph: 'in', bg: '#E8F1FE', color: '#0A5BB5', href: handle('https://linkedin.com/in/') },
  { key: 'twitter', label: 'X / Twitter', glyph: 'X', bg: '#EEF1F4', color: '#0B1220', href: handle('https://x.com/') },
  { key: 'instagram', label: 'Instagram', glyph: 'ig', bg: '#FCE9EE', color: '#9F1239', href: handle('https://instagram.com/') },
  { key: 'website', label: 'Portfolio / website', glyph: '↗', bg: '#FEF6DC', color: '#92680B', href: web },
];
