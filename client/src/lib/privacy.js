// Directory and contact visibility (RA 10173): the shape PATCH /me { privacy } takes, built from GET /me's `privacy`.
// Everything starts hidden; the directory lists an alumnus only after they opt in (v_directory).

/** Social links that can be shown in the directory, in the order Edit Profile asks for them. */
export const LINK_PLATFORMS = [
  ['facebook', 'Facebook / Messenger'],
  ['linkedin', 'LinkedIn'],
  ['instagram', 'Instagram'],
  ['twitter', 'Twitter / X'],
];

/** GET /me `privacy` -> { directoryOptIn, showEmail, showMobile, links: { platform: bool } }. */
export function privacyDraft(p) {
  const links = {};
  Object.entries(p?.links || {}).forEach(([k, l]) => { links[k] = !!l?.isVisible; });
  return { directoryOptIn: !!p?.directoryOptIn, showEmail: !!p?.showEmail, showMobile: !!p?.showMobile, links };
}

export function samePrivacy(x, y) {
  if (['directoryOptIn', 'showEmail', 'showMobile'].some((k) => x[k] !== y[k])) return false;
  const keys = new Set([...Object.keys(x.links), ...Object.keys(y.links)]);
  return [...keys].every((k) => !!x.links[k] === !!y.links[k]);
}

/** Link platforms the alumnus has filled in (from the profile answers), so only those get a switch. */
export const filledPlatforms = (a) => LINK_PLATFORMS.filter(([k]) => a && String(a[k] ?? '').trim() !== '');
