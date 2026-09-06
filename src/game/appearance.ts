/** Free body-light colors are separate from earned liveries and trail rewards. */
export const GLOW_PRESETS = [
  { id: 'cyan', name: 'Cyan', color: '#20dfff' },
  { id: 'electric-blue', name: 'Electric Blue', color: '#528aff' },
  { id: 'violet', name: 'Violet', color: '#a277ff' },
  { id: 'magenta', name: 'Magenta', color: '#f264df' },
  { id: 'mint', name: 'Mint', color: '#82ffd0' },
  { id: 'teal', name: 'Teal', color: '#23c9b1' },
  { id: 'gold', name: 'Gold', color: '#ffd178' },
  { id: 'pearl', name: 'Pearl', color: '#e4f3ff' },
] as const;

export type GlowId = typeof GLOW_PRESETS[number]['id'];
export type PreviewZoom = 'full' | 'close';
export const DEFAULT_GLOW: GlowId = 'cyan';
const APPEARANCE_KEY = 's39.appearance.v1';

export function readAppearance(): GlowId {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(APPEARANCE_KEY) ?? 'null');
    if (value && typeof value === 'object' && 'glow' in value) {
      return GLOW_PRESETS.find(preset => preset.id === value.glow)?.id ?? DEFAULT_GLOW;
    }
  } catch { /* An unavailable or old local preference must not prevent play. */ }
  return DEFAULT_GLOW;
}

export function writeAppearance(glow: GlowId): { error?: string } {
  try {
    if (!GLOW_PRESETS.some(preset => preset.id === glow)) return { error: 'That glow color is unavailable.' };
    localStorage.setItem(APPEARANCE_KEY, JSON.stringify({ version: 1, glow }));
    return {};
  } catch {
    return { error: 'Your glow is applied for this session, but this browser could not save it.' };
  }
}
