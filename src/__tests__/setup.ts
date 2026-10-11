import { registerTranslation } from '../i18n';
import { TRANSLATIONS } from '../i18n/all';
import { registerHelp } from '../help/content';
import { HELP_TRANSLATIONS } from '../help/all';

// In the extension each language is a file of its own, loaded when it is
// chosen (src/i18n/index.ts); in the tests, every one is here from the start.
for (const [lang, words] of Object.entries(TRANSLATIONS)) registerTranslation(lang, words);
for (const [lang, help] of Object.entries(HELP_TRANSLATIONS)) registerHelp(lang, help);
