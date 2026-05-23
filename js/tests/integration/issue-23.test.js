import { describe, it, expect } from 'test-anywhere';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import {
  INTERPRETATION_DISPLAY_MODES,
  formatInterpretationPhrase,
  interpretationKey,
} from '../../src/index.js';
import {
  detectLocale,
  translate,
  listLocales,
  SUPPORTED_LOCALES,
} from '../../../web/i18n.js';
import {
  effectiveTheme,
  nextTheme,
  themeIcon,
  THEMES,
} from '../../../web/theme.js';

const here = dirname(fileURLToPath(import.meta.url));
const webDir = resolve(here, '..', '..', '..', 'web');

async function loadFile(name) {
  return readFile(resolve(webDir, name), 'utf8');
}

describe('issue-23 R3 — interpretation display modes', () => {
  const phrase = {
    text: 'Hawaii',
    entityId: 'Q782',
    entityLabel: 'Hawaii',
    entityDescription: 'state of the United States',
  };

  it('exposes the five public modes', () => {
    expect(INTERPRETATION_DISPLAY_MODES.ID).toBe('id');
    expect(INTERPRETATION_DISPLAY_MODES.NAME).toBe('name');
    expect(INTERPRETATION_DISPLAY_MODES.NAME_AND_MEANING).toBe('name+meaning');
    expect(INTERPRETATION_DISPLAY_MODES.MEANING).toBe('meaning');
    expect(INTERPRETATION_DISPLAY_MODES.REPLACE).toBe('replace');
  });

  it('formats phrase by id', () => {
    expect(formatInterpretationPhrase(phrase, 'id')).toBe('Hawaii [Q782]');
  });

  it('formats phrase by name (default)', () => {
    expect(formatInterpretationPhrase(phrase)).toBe('Hawaii (Hawaii)');
  });

  it('formats phrase by name+meaning', () => {
    expect(formatInterpretationPhrase(phrase, 'name+meaning')).toBe(
      'Hawaii (Hawaii — state of the United States)'
    );
  });

  it('formats phrase by meaning only', () => {
    expect(formatInterpretationPhrase(phrase, 'meaning')).toBe(
      'Hawaii (state of the United States)'
    );
  });

  it('formats phrase as replacement', () => {
    expect(formatInterpretationPhrase(phrase, 'replace')).toBe('Hawaii');
  });

  it('falls back to plain text when entity is missing', () => {
    expect(formatInterpretationPhrase({ text: 'unknown' }, 'meaning')).toBe(
      'unknown'
    );
  });
});

describe('issue-23 R4 — interpretationKey identifies the active choice', () => {
  it('builds a stable key from phrase entity ids', () => {
    const a = {
      phrases: [
        { text: 'Barack Obama', entityId: 'Q76' },
        { text: 'Hawaii', entityId: 'Q782' },
      ],
    };
    const b = {
      phrases: [
        { text: 'Barack Obama', entityId: 'Q76' },
        { text: 'Hawaii', entityId: 'Q782' },
      ],
    };
    expect(interpretationKey(a)).toBe(interpretationKey(b));
  });

  it('returns different keys for different entities', () => {
    const a = { phrases: [{ entityId: 'Q1' }] };
    const b = { phrases: [{ entityId: 'Q2' }] };
    expect(interpretationKey(a)).not.toBe(interpretationKey(b));
  });

  it('marks empty slots so partial selections still differ', () => {
    expect(interpretationKey({ phrases: [{}] })).toBe('∅');
    expect(interpretationKey({ phrases: [{ entityId: 'Q1' }, {}] })).toBe(
      'Q1|∅'
    );
  });
});

describe('issue-23 R5 — language switching', () => {
  it('exposes English and Russian dictionaries', () => {
    expect(SUPPORTED_LOCALES).toContain('en');
    expect(SUPPORTED_LOCALES).toContain('ru');
  });

  it('detects locale from navigator language tag', () => {
    expect(detectLocale('ru-RU')).toBe('ru');
    expect(detectLocale('en-US')).toBe('en');
    expect(detectLocale('de-DE')).toBe('en');
    expect(detectLocale('')).toBe('en');
  });

  it('translates known keys per locale', () => {
    expect(translate('en', 'nav.analyse')).toBe('Analyse');
    expect(translate('ru', 'nav.analyse')).toBe('Анализ');
  });

  it('falls back to English when key is missing in selected locale', () => {
    expect(translate('ru', 'unknown.key')).toBe('unknown.key');
  });

  it('lists locales with display labels', () => {
    const list = listLocales();
    expect(list.find((entry) => entry.code === 'en').label).toBe('English');
    expect(list.find((entry) => entry.code === 'ru').label).toBe('Русский');
  });
});

describe('issue-23 R6 — theme switching', () => {
  it('cycles through auto / light / dark', () => {
    expect(THEMES).toEqual(['auto', 'light', 'dark']);
    expect(nextTheme('auto')).toBe('light');
    expect(nextTheme('light')).toBe('dark');
    expect(nextTheme('dark')).toBe('auto');
  });

  it('returns explicit theme as-is', () => {
    expect(effectiveTheme('light')).toBe('light');
    expect(effectiveTheme('dark')).toBe('dark');
  });

  it('provides an icon hint for each preference', () => {
    expect(themeIcon('light')).toBeTruthy();
    expect(themeIcon('dark')).toBeTruthy();
    expect(themeIcon('auto')).toBeTruthy();
  });
});

describe('issue-23 R1 — contrast tokens replace hard-coded colours', () => {
  it('routes formalize-payload pre through CSS custom properties', async () => {
    const css = await loadFile('styles.css');
    const block = css.match(/\.formalize-payload pre\s*{[\s\S]*?}/);
    expect(block).toBeTruthy();
    expect(block[0]).toContain('var(--surface)');
    expect(block[0]).toContain('var(--ink)');
    expect(block[0]).not.toMatch(/background:\s*#ffffff/i);
  });

  it('declares dark-theme overrides on :root[data-theme="dark"]', async () => {
    const css = await loadFile('styles.css');
    expect(css).toMatch(/:root\[data-theme=['"]dark['"]\]\s*{/);
  });
});

describe('issue-23 R2 — radio fieldsets use inline-flex options', () => {
  it('declares inline-flex on formalize option labels', async () => {
    const css = await loadFile('styles.css');
    expect(css).toMatch(
      /\.formalize-target-option,\s*\.formalize-source-option,\s*\.formalize-display-mode-option\s*{[^}]*display:\s*inline-flex/
    );
  });

  it('does not stretch the formalize fieldsets into a grid', async () => {
    const css = await loadFile('styles.css');
    const block = css.match(
      /\.formalize-target,\s*\.formalize-sources,\s*\.formalize-display-mode\s*{[\s\S]*?}/
    );
    expect(block).toBeTruthy();
    expect(block[0]).toMatch(/display:\s*flex/);
    expect(block[0]).toMatch(/flex-wrap:\s*wrap/);
  });
});

describe('issue-23 R7 — mobile-first responsive layout', () => {
  it('default layout is single-column and grows at min-width breakpoints', async () => {
    const css = await loadFile('styles.css');
    expect(css).toMatch(/\.app-shell\s*{[^}]*grid-template-columns:\s*1fr/);
    expect(css).toMatch(/@media \(min-width: 640px\)/);
    expect(css).toMatch(/@media \(min-width: 960px\)/);
  });

  it('does not use legacy max-width-only breakpoint', async () => {
    const css = await loadFile('styles.css');
    expect(css).not.toMatch(/@media \(max-width:\s*820px\)/);
  });
});

describe('issue-23 — index.html is wired for theme + locale', () => {
  it('contains a locale select and a theme toggle in the top nav', async () => {
    const html = await loadFile('index.html');
    expect(html).toContain('id="locale-select"');
    expect(html).toContain('id="theme-toggle"');
    expect(html).toContain('color-scheme');
  });

  it('includes data-i18n attributes on the analyse navigation', async () => {
    const html = await loadFile('index.html');
    expect(html).toContain('data-i18n="nav.analyse"');
    expect(html).toContain('data-i18n="formalize.displayMode"');
  });

  it('exposes the five interpretation display radio buttons', async () => {
    const html = await loadFile('index.html');
    for (const value of ['name', 'meaning', 'name+meaning', 'id', 'replace']) {
      expect(html).toContain(`value="${value}"`);
    }
  });
});
