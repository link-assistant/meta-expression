export const grammarRuleData = Object.freeze({
  supportedLanguages: Object.freeze(['en', 'ru', 'hi', 'zh']),
  terminalPunctuationByLanguage: Object.freeze({
    en: Object.freeze(['.', '!', '?']),
    ru: Object.freeze(['.', '!', '?']),
    hi: Object.freeze(['।', '.', '!', '?']),
    zh: Object.freeze(['。', '！', '？', '.', '!', '?']),
  }),
  defaultTerminalPunctuation: Object.freeze({
    en: '.',
    ru: '.',
    hi: '।',
    zh: '。',
  }),
  russianSubjectNumbers: Object.freeze({
    луна: 'singular',
    земля: 'singular',
    солнце: 'singular',
    луны: 'plural',
    планеты: 'plural',
  }),
  russianAgreementVerbs: Object.freeze({
    вращается: Object.freeze({
      number: 'singular',
      forms: Object.freeze({ singular: 'вращается', plural: 'вращаются' }),
    }),
    вращаются: Object.freeze({
      number: 'plural',
      forms: Object.freeze({ singular: 'вращается', plural: 'вращаются' }),
    }),
    является: Object.freeze({
      number: 'singular',
      forms: Object.freeze({ singular: 'является', plural: 'являются' }),
    }),
    являются: Object.freeze({
      number: 'plural',
      forms: Object.freeze({ singular: 'является', plural: 'являются' }),
    }),
  }),
  hindiSubjectFeatures: Object.freeze({
    लड़की: Object.freeze({ gender: 'feminine', number: 'singular' }),
    लड़का: Object.freeze({ gender: 'masculine', number: 'singular' }),
    लड़कियां: Object.freeze({ gender: 'feminine', number: 'plural' }),
    लड़के: Object.freeze({ gender: 'masculine', number: 'plural' }),
  }),
  hindiAgreementParticiples: Object.freeze({
    जाता: Object.freeze({
      gender: 'masculine',
      number: 'singular',
      forms: Object.freeze({
        masculine: Object.freeze({ singular: 'जाता', plural: 'जाते' }),
        feminine: Object.freeze({ singular: 'जाती', plural: 'जाती' }),
      }),
    }),
    जाती: Object.freeze({
      gender: 'feminine',
      number: 'singular',
      forms: Object.freeze({
        masculine: Object.freeze({ singular: 'जाता', plural: 'जाते' }),
        feminine: Object.freeze({ singular: 'जाती', plural: 'जाती' }),
      }),
    }),
    जाते: Object.freeze({
      gender: 'masculine',
      number: 'plural',
      forms: Object.freeze({
        masculine: Object.freeze({ singular: 'जाता', plural: 'जाते' }),
        feminine: Object.freeze({ singular: 'जाती', plural: 'जाती' }),
      }),
    }),
  }),
  chineseWordOrderPatterns: Object.freeze([
    Object.freeze({
      code: 'predicate-before-subject',
      wrong: '围绕太阳月亮',
      replacement: '月亮围绕太阳',
      message: 'Move the subject before the predicate.',
    }),
  ]),
});
