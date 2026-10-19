import useMobilePreview from './useMobilePreview';

/** True when the phone layout is on (phone-width window, or the "Phone frame" preview); matches the `data-mobile` attribute the responsive CSS keys off. */
export default function useNarrow() {
  return useMobilePreview().mobile;
}
