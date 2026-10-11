/**
 * Country flags, for the player bar's badge (Settings.badgeFlag).
 *
 * A flag emoji is a country's two-letter ISO 3166-1 code written in regional
 * indicator letters, so each flag here is made from its code rather than
 * kept as an emoji. Only those codes are listed: Unicode also has flags for
 * the EU, the UN and a few places with no code of their own, and none of
 * them is a country's.
 */

/** Codes with spaces between them: easier to read and to keep than a list of strings. */
const codes = (list: string): readonly string[] => list.trim().split(/\s+/);

/** Every ISO 3166-1 alpha-2 code. Each one has a flag emoji. */
export const COUNTRIES = codes(`
  AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ
  BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ
  CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ
  DE DJ DK DM DO DZ
  EC EE EG EH ER ES ET
  FI FJ FK FM FO FR
  GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY
  HK HM HN HR HT HU
  ID IE IL IM IN IO IQ IR IS IT
  JE JM JO JP
  KE KG KH KI KM KN KP KR KW KY KZ
  LA LB LC LI LK LR LS LT LU LV LY
  MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ
  NA NC NE NF NG NI NL NO NP NR NU NZ
  OM
  PA PE PF PG PH PK PL PM PN PR PS PT PW PY
  QA
  RE RO RS RU RW
  SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ
  TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ
  UA UG UM US UY UZ
  VA VC VE VG VI VN VU
  WF WS
  YE YT
  ZA ZM ZW
`);

/**
 * The countries where each language that can be learned is spoken, the ones
 * most learners mean first. The badge's menu lists them above every other
 * country. Each list starts with the country the language's own badge stands
 * for (TARGET_LANGUAGES), except Arabic's, whose own is the Arab League's.
 */
export const SPOKEN_IN: Readonly<Record<string, readonly string[]>> = {
  ja: codes('JP'),
  ko: codes('KR'),
  zh: codes('CN TW HK SG MO'),
  es: codes('ES MX AR CO CL PE VE CU EC GT BO DO HN PY NI SV CR PA UY PR GQ'),
  fr: codes('FR CA BE CH LU MC SN CI CM CD HT'),
  de: codes('DE AT CH LI LU'),
  it: codes('IT CH SM VA'),
  pt: codes('BR PT AO MZ CV GW ST TL'),
  th: codes('TH'),
  en: codes('US GB CA AU NZ IE ZA JM SG IN NG PH'),
  hi: codes('IN'),
  ar: codes('SA EG AE MA DZ IQ SD YE SY TN JO LY LB PS OM KW MR QA BH'),
  tr: codes('TR CY'),
};

/** A country's flag emoji, from its code: JP gives 🇯🇵. */
export function flagOf(code: string): string {
  return String.fromCodePoint(...Array.from(code, (letter) => 0x1f1e6 + letter.charCodeAt(0) - 0x41));
}

/** A flag the badge can show, and the country's name to read beside it. */
export interface FlagChoice {
  flag: string;
  name: string;
}

/**
 * The flags offered for a language's badge, in two groups: the countries
 * where it is spoken, in the order above, then every other country by its
 * name in `locale`, the interface's.
 */
export function flagChoices(lang: string, locale: string): { spoken: FlagChoice[]; others: FlagChoice[] } {
  const names = new Intl.DisplayNames([locale], { type: 'region' });
  const choice = (code: string): FlagChoice => ({ flag: flagOf(code), name: names.of(code) ?? code });
  const spoken = SPOKEN_IN[lang] ?? [];
  const byName = new Intl.Collator(locale).compare;
  return {
    spoken: spoken.map(choice),
    others: COUNTRIES.filter((code) => !spoken.includes(code)).map(choice).sort((a, b) => byName(a.name, b.name)),
  };
}
