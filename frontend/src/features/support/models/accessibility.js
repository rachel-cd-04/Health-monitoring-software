export const A11Y_DEFAULTS = {
  theme: 'light',
  text: 'standard',
  contrast: false,
  motion: 'system',
  readable: false,
  underline: false,
};

export function readA11y() {
  try {
    return { ...A11Y_DEFAULTS, ...JSON.parse(localStorage.getItem('soma-a11y') || '{}') };
  } catch {
    return { ...A11Y_DEFAULTS };
  }
}

export function applyA11y(preferences) {
  const root = document.documentElement;
  root.dataset.text = preferences.text;
  const dark =
    preferences.theme === 'dark' ||
    (preferences.theme === 'system' && window.matchMedia?.('(prefers-color-scheme: dark)').matches);
  root.classList.toggle('theme-dark', Boolean(dark));
  root.style.colorScheme = dark ? 'dark' : 'light';
  root.classList.toggle('a11y-contrast', Boolean(preferences.contrast));
  root.classList.toggle('a11y-reduce-motion', preferences.motion === 'reduce');
  root.classList.toggle('a11y-readable', Boolean(preferences.readable));
  root.classList.toggle('a11y-underline', Boolean(preferences.underline));
  try {
    localStorage.setItem('soma-a11y', JSON.stringify(preferences));
  } catch {
    // Accessibility preferences are optional when browser storage is unavailable.
  }
}
