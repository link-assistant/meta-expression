import {
  translateTextWith,
  createWikidataSource,
  formalizeTextWith,
} from '../js/src/index.js';

function jsonResponse(payload) {
  return {
    ok: true,
    status: 200,
    json() {
      return Promise.resolve(payload);
    },
    text() {
      return Promise.resolve(JSON.stringify(payload));
    },
    clone() {
      return this;
    },
  };
}

function entity(id, label, language, sitelink, claims = {}) {
  const site = `${language}wiki`;
  return {
    id,
    type: id.startsWith('P') ? 'property' : 'item',
    labels: { [language]: { value: label } },
    descriptions: { [language]: { value: `${label} description` } },
    claims,
    aliases: {},
    sitelinks: { [site]: { site, title: sitelink } },
  };
}

const p31 = (targetId) => ({
  P31: [{ mainsnak: { datavalue: { value: { id: targetId } } } }],
});

const search = {
  'Hawaii|item|en': [{ id: 'Q782', label: 'Hawaii', description: 'US state' }],
  'state|item|en': [
    { id: 'Q7275', label: 'state', description: 'federated state' },
  ],
};
const entities = {
  'Q782|en': entity('Q782', 'Hawaii', 'en', 'Hawaii', p31('Q35657')),
  'Q782|ru': entity('Q782', 'Гавайи', 'ru', 'Гавайи', p31('Q35657')),
  'Q7275|en': entity('Q7275', 'state', 'en', 'Federated state'),
  'Q7275|ru': entity('Q7275', 'государство', 'ru', 'Государство'),
  'Q35657|en': entity('Q35657', 'U.S. state', 'en', 'U.S. state'),
  'Q35657|ru': entity('Q35657', 'Штат США', 'ru', 'Штат США'),
};

const fetch = (url) => {
  const parsed = new URL(String(url));
  const action = parsed.searchParams.get('action');
  if (action === 'wbsearchentities') {
    const key = [
      parsed.searchParams.get('search'),
      parsed.searchParams.get('type'),
      parsed.searchParams.get('language') ?? 'en',
    ].join('|');
    return jsonResponse({ search: search[key] ?? [] });
  }
  if (action === 'wbgetentities') {
    const language = parsed.searchParams.get('languages') ?? 'en';
    const rows = String(parsed.searchParams.get('ids') ?? '')
      .split('|')
      .map((id) => entities[`${id}|${language}`])
      .filter(Boolean);
    return jsonResponse({
      entities: Object.fromEntries(rows.map((row) => [row.id, row])),
    });
  }
  return jsonResponse({});
};

const sources = [createWikidataSource({ language: 'en' })];

console.log('=== FORMALIZE en ===');
const f = await formalizeTextWith('Hawaii is a state.', {
  fetch,
  sources,
  now: () => 0,
});
console.log('markdown:', f.markdown);
for (const p of f.cst.phrases) {
  console.log(
    ' phrase:',
    JSON.stringify(p.text),
    '->',
    p.entity?.id,
    '| url:',
    p.entity?.wikipediaUrl
  );
}
console.log(
  'steps:',
  f.steps.filter((s) => s.type === 'copula-type-resolution')
);

console.log('\n=== TRANSLATE en->ru ===');
const t = await translateTextWith('Hawaii is a state.', {
  fetch,
  sources,
  sourceLanguage: 'en',
  targetLanguage: 'ru',
  now: () => 0,
});
console.log('plainText:', t.plainText);
console.log('transformations:', t.sentences[0].transformations);
console.log(
  'phrases targets:',
  t.sentences[0].phrases.map((p) => ({
    src: p.source?.text,
    tgt: p.target?.text,
    id: p.entityId,
    url: p.target?.url,
  }))
);
