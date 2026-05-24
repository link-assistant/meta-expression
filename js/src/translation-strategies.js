export const TRANSLATION_STRATEGIES = Object.freeze({
  CONTEXTUAL_GLOSSARY: 'contextual-glossary',
  SEMANTIC_LABEL: 'semantic-label',
  LEXICAL_GLOSSARY: 'lexical-glossary',
});

const defaultTranslationStrategy = TRANSLATION_STRATEGIES.CONTEXTUAL_GLOSSARY;

const strategyDefinitions = Object.freeze([
  {
    id: TRANSLATION_STRATEGIES.CONTEXTUAL_GLOSSARY,
    label: 'Contextual glossary',
    description:
      'Prefer curated phrase translations, then fall back to Wikidata labels.',
  },
  {
    id: TRANSLATION_STRATEGIES.SEMANTIC_LABEL,
    label: 'Semantic labels',
    description: 'Use only linked entity labels and transformation rules.',
  },
  {
    id: TRANSLATION_STRATEGIES.LEXICAL_GLOSSARY,
    label: 'Lexical glossary',
    description:
      'Prefer direct word and phrase translations for readable output.',
  },
]);

const enRuGlossary = Object.freeze({
  add: 'добавьте',
  accepts: 'принимает',
  attaches: 'прикрепляет',
  based: 'основанный',
  check: 'проверьте',
  compare: 'сравните',
  computable: 'вычислимые',
  evidence: 'доказательства',
  evaluates: 'вычисляет',
  example: 'пример',
  examples: 'примеры',
  find: 'найти',
  first: 'первый',
  formalize: 'формализуйте',
  formalizes: 'формализует',
  for: 'для',
  fragments: 'фрагменты',
  generates: 'создает',
  'human-language': 'человеко-языковое',
  open: 'откройте',
  or: 'или',
  page: 'страницу',
  playground: 'площадка',
  possible: 'возможно',
  provenance: 'происхождением',
  prototype: 'прототип',
  reasoning: 'рассуждения',
  result: 'результат',
  save: 'сохраните',
  selectable: 'выбираемые',
  selected: 'выбранный',
  show: 'покажите',
  source: 'исходный',
  statement: 'утверждение',
  text: 'текст',
  with: 'с',
  wikidata: 'Викиданные',
  then: 'затем',
  translate: 'переведите',
  each: 'каждое',
  sentence: 'предложение',
  through: 'через',
  labels: 'метки',
  and: 'и',
  transformation: 'преобразования',
  rules: 'правила',
  'transformation rules': 'правила преобразования',
  unresolved: 'неразрешенные',
  parts: 'части',
  remain: 'остаются',
  variables: 'переменными',
  questions: 'вопросами',
  claims: 'утверждений',
  interpretations: 'интерпретации',
  it: 'он',
  'links-network': 'сеть ссылок',
  'links-network based reasoning playground':
    'основанной на сети ссылок площадки для рассуждений',
  meaning: 'смысл',
  'non-computable': 'невычислимых',
  value: 'значение',
  values: 'значения',
  when: 'когда',
  synonym: 'синоним',
  synonyms: 'синонимы',
  agreement: 'согласования',
  'examples of agreement': 'примеры согласования',
  '(links)': 'Links',
  '(triggers)': 'Triggers',
  ability: 'возможность',
  able: 'способен',
  accurate: 'точная',
  accelerate: 'ускорить',
  algorithms: 'алгоритмы',
  all: 'все',
  also: 'также',
  any: 'любых',
  apple: 'яблоко',
  as: 'как',
  associative: 'ассоциативное',
  'associative memory storage': 'хранилище ассоциативной памяти',
  'associative storage': 'ассоциативное хранилище',
  automated: 'автоматизирована',
  automation: 'автоматизация',
  be: 'быть',
  'bot-programmer': 'бот-программист',
  bread: 'хлеб',
  can: 'могут',
  carrot: 'морковь',
  change: 'изменять',
  combines: 'объединяет',
  create: 'создавать',
  cucumber: 'огурец',
  data: 'данные',
  'data and knowledge': 'данные и знания',
  descriptions: 'описания',
  development: 'развитие',
  due: 'благодаря',
  dynamically: 'динамически',
  edit: 'редактировать',
  effects: 'эффекты',
  engine: 'движок',
  environment: 'среда',
  execution: 'выполнение',
  fact: 'факт',
  fast: 'быстрая',
  flexible: 'гибкая',
  from: 'из',
  goals: 'цели',
  help: 'помочь',
  hello: 'привет',
  'high-level': 'высокоуровневые',
  human: 'человеческий',
  'human language': 'человеческий язык',
  'human mind': 'человеческий разум',
  implement: 'реализовать',
  implementation: 'реализация',
  important: 'важные',
  in: 'в',
  input: 'ввод',
  inside: 'внутри',
  is: 'это',
  itself: 'сама',
  knowledge: 'знания',
  language: 'язык',
  level: 'уровень',
  links: 'Links',
  make: 'сделать',
  memory: 'память',
  method: 'метод',
  mind: 'разум',
  modeling: 'моделирование',
  most: 'самая',
  'most important': 'самые важные',
  of: 'из',
  on: 'на',
  one: 'одна',
  other: 'другими',
  'other words': 'другими словами',
  our: 'нашу',
  platform: 'платформа',
  planned: 'запланирована',
  potato: 'картофель',
  program: 'программировать',
  programs: 'программы',
  project: 'проект',
  'real-time': 'реальном времени',
  reliable: 'надежная',
  should: 'должен',
  simple: 'простое',
  storage: 'хранилище',
  strive: 'стремимся',
  such: 'такие',
  system: 'система',
  that: 'что',
  their: 'их',
  themselves: 'себя',
  there: 'там',
  'thank you': 'спасибо',
  this: 'этот',
  to: 'к',
  tomato: 'помидор',
  treated: 'рассматриваться',
  universal: 'универсальная',
  water: 'вода',
  we: 'мы',
  which: 'который',
  will: 'будет',
  words: 'словами',
});

const ruEnGlossary = Object.freeze({
  добавить: 'add',
  найти: 'find',
  синоним: 'synonym',
  синонимы: 'synonyms',
  или: 'or',
  пример: 'example',
  примеры: 'examples',
  согласование: 'agreement',
  согласования: 'agreement',
  перевод: 'translation',
  перевода: 'translation',
  перевести: 'translate',
  формализовать: 'formalize',
  текст: 'text',
  проверить: 'check',
  утверждение: 'statement',
  сравнить: 'compare',
  значение: 'value',
  значения: 'values',
  показать: 'show',
  вопрос: 'question',
  вопросы: 'questions',
  открыть: 'open',
  страница: 'page',
  страницу: 'page',
  сохранить: 'save',
  результат: 'result',
  'как у тебя дела': 'how are you',
  'как дела': 'how are you',
  'кто ты такой': 'who are you',
  'что это такое': 'what is this',
  'доброе яблоко': 'good apple',
  спасибо: 'thank you',
  да: 'yes',
  нет: 'no',
  привет: 'hello',
  яблоко: 'apple',
  помидор: 'tomato',
  огурец: 'cucumber',
  картофель: 'potato',
  морковь: 'carrot',
  хлеб: 'bread',
  вода: 'water',
  'примеры согласования': 'examples of agreement',
  'примеры перевода': 'examples of translation',
  links: 'Links',
  triggers: 'Triggers',
  алгоритмы: 'algorithms',
  ассоциативное: 'associative',
  автоматизация: 'automation',
  автоматизирована: 'automated',
  благодаря: 'due',
  быть: 'be',
  быстрая: 'fast',
  будет: 'will',
  важные: 'important',
  все: 'all',
  ввод: 'input',
  возможность: 'ability',
  выполнение: 'execution',
  высокоуровневые: 'high-level',
  гибкая: 'flexible',
  данные: 'data',
  'данные и знания': 'data and knowledge',
  двигател: 'engine',
  движок: 'engine',
  динамически: 'dynamically',
  другими: 'other',
  'другими словами': 'in other words',
  должен: 'should',
  знание: 'knowledge',
  знания: 'knowledge',
  изменять: 'change',
  и: 'and',
  из: 'of',
  как: 'as',
  который: 'which',
  к: 'to',
  когда: 'when',
  метод: 'method',
  моделирование: 'modeling',
  могут: 'can',
  мы: 'we',
  надежная: 'reliable',
  нашу: 'our',
  на: 'on',
  одна: 'one',
  объединяет: 'combines',
  описания: 'descriptions',
  основанный: 'based',
  память: 'memory',
  платформа: 'platform',
  программировать: 'program',
  программы: 'programs',
  проект: 'project',
  простое: 'simple',
  развитие: 'development',
  разум: 'mind',
  рассматриваться: 'treated',
  реализация: 'implementation',
  реализовать: 'implement',
  редактировать: 'edit',
  реальном: 'real',
  сама: 'itself',
  самая: 'most',
  'самые важные': 'most important',
  себя: 'themselves',
  сделать: 'make',
  система: 'system',
  словами: 'words',
  среда: 'environment',
  стремимся: 'strive',
  способен: 'able',
  там: 'there',
  такие: 'such',
  точная: 'accurate',
  ускорить: 'accelerate',
  универсальная: 'universal',
  уровень: 'level',
  факт: 'fact',
  в: 'in',
  времени: 'time',
  внутри: 'inside',
  для: 'for',
  хранилище: 'storage',
  'хранилище ассоциативной памяти': 'associative memory storage',
  цели: 'goals',
  человеческий: 'human',
  'человеческий разум': 'human mind',
  'человеческий язык': 'human language',
  что: 'that',
  этот: 'this',
  это: 'is',
  эффекты: 'effects',
  создавать: 'create',
  также: 'also',
  любых: 'any',
  запланирована: 'planned',
  'бот-программист': 'bot-programmer',
  преобразования: 'transformation',
  помочь: 'help',
});

const enHiGlossary = Object.freeze({
  apple: 'सेब',
  hello: 'नमस्ते',
});

const enZhGlossary = Object.freeze({
  apple: '苹果',
  hello: '你好',
});

const glossaries = Object.freeze({
  'en:ru': enRuGlossary,
  'en:hi': enHiGlossary,
  'en:zh': enZhGlossary,
  'ru:en': ruEnGlossary,
});

export function listTranslationStrategies() {
  return strategyDefinitions.map((strategy) => ({ ...strategy }));
}

export function normalizeTranslationStrategy(value) {
  const normalized = String(value ?? '').trim();
  if (strategyDefinitions.some((strategy) => strategy.id === normalized)) {
    return normalized;
  }
  return defaultTranslationStrategy;
}

export function translationStrategyUsesGlossary(strategy) {
  return strategy !== TRANSLATION_STRATEGIES.SEMANTIC_LABEL;
}

export function lookupGlossaryTranslation(sourceText, config) {
  return lookupGlossaryTranslationWithMode(sourceText, config, {
    exactOnly: false,
  });
}

export function lookupExactGlossaryTranslation(sourceText, config) {
  return lookupGlossaryTranslationWithMode(sourceText, config, {
    exactOnly: true,
  });
}

function lookupGlossaryTranslationWithMode(sourceText, config, options) {
  if (!translationStrategyUsesGlossary(config.translationStrategy)) {
    return null;
  }
  if (config.sourceLanguage === config.targetLanguage) {
    return {
      text: String(sourceText ?? ''),
      target: null,
      strategy: 'identity',
    };
  }
  const key = `${config.sourceLanguage}:${config.targetLanguage}`;
  const glossary = glossaries[key];
  if (!glossary) {
    return null;
  }
  const translation = normalizeGlossaryEntry(
    glossary[normalizeGlossaryKey(sourceText)]
  );
  if (translation) {
    return {
      text: applySourceCasing(
        sourceText,
        translation.text,
        config.targetLanguage
      ),
      target: translation.target ?? null,
      strategy: config.translationStrategy,
    };
  }
  if (options.exactOnly) {
    return null;
  }
  const words = normalizeGlossaryKey(sourceText).split(' ').filter(Boolean);
  const wordTranslations = words.map((word) =>
    normalizeGlossaryEntry(glossary[word])
  );
  if (wordTranslations.length === 0 || wordTranslations.some((word) => !word)) {
    return null;
  }
  return {
    text: applySourceCasing(
      sourceText,
      wordTranslations.map((entry) => entry.text).join(' '),
      config.targetLanguage
    ),
    strategy: config.translationStrategy,
  };
}

function normalizeGlossaryEntry(entry) {
  if (typeof entry === 'string') {
    return { text: entry };
  }
  if (entry && typeof entry === 'object' && typeof entry.text === 'string') {
    return {
      text: entry.text,
      target: entry.target ?? null,
    };
  }
  return null;
}

function normalizeGlossaryKey(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function applySourceCasing(sourceText, targetText, targetLanguage) {
  const source = String(sourceText ?? '');
  const target = String(targetText ?? '');
  if (!source || !target || source[0] !== source[0].toUpperCase()) {
    return target;
  }
  const first = [...target][0];
  if (!first || first !== first.toLowerCase()) {
    return target;
  }
  return `${first.toLocaleUpperCase(targetLanguage)}${target.slice(
    first.length
  )}`;
}
