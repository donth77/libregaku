import { ar } from './ar';
import { de } from './de';
import { es } from './es';
import { fr } from './fr';
import { hi } from './hi';
import { id } from './id';
import { it } from './it';
import { ja } from './ja';
import { ko } from './ko';
import { nl } from './nl';
import { pl } from './pl';
import { pt } from './pt';
import { ru } from './ru';
import { sv } from './sv';
import { th } from './th';
import { tr } from './tr';
import { uk } from './uk';
import { vi } from './vi';
import { zh } from './zh';
import { zhHant } from './zh-Hant';
import type { Translation } from '.';
import type { UiLanguage } from './languages';

/** Every translation of the interface, by the code "Your language" stores. */
export const TRANSLATIONS: Record<Exclude<UiLanguage, 'en'>, Translation> = {
  ar, de, es, fr, hi, id, it, ja, ko, nl, pl, pt, ru, sv, th, tr, uk, vi, zh,
  'zh-Hant': zhHant,
};
