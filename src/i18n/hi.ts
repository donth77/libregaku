import type { Translation } from '.';
import type { OverrideStatus } from '../anki/status';
import type { MissingMedia } from '../content/capture';
import type { Settings } from '../settings';

/** Hindi counts 0 and 1 as one, and the rest as many: "1 कार्ड बना", "3 कार्ड बने". */
const PLURAL = new Intl.PluralRules('hi');
const one = (n: number): boolean => PLURAL.select(n) === 'one';

/** The furigana (or pinyin) setting's three choices, as the bar and the player announce them: the menu's words. */
const RUBY: Record<Settings['ruby'], string> = { never: 'बंद', unknown: 'नए शब्द', always: 'सभी' };

/** What a card went in without, each with "के बिना" and any hint after it: "— वाक्य ऑडियो के बिना". */
const without = (missing: readonly MissingMedia[]): string =>
  missing
    .map((m) => (m === 'audio-encrypted'
      ? 'वाक्य ऑडियो के बिना (यहां रिकॉर्ड करने के लिए Libregaku आइकॉन पर क्लिक करें)'
      : 'वाक्य ऑडियो के बिना'))
    .join(', ');

/** "Libregaku सिर्फ़ …": each medium with its own agreement. */
const MEDIA_FETCHED = {
  audio: 'वही ऑडियो जोड़ता है जो उसने खुद डाउनलोड किया हो',
  video: 'वही वीडियो जोड़ता है जो उसने खुद डाउनलोड किया हो',
  picture: 'वही तस्वीरें जोड़ता है जो उसने खुद डाउनलोड की हों',
} as const;
const MEDIA_OF_NOTE = { audio: 'इस नोट के ऑडियो', video: 'इस नोट के वीडियो', picture: 'इस नोट की तस्वीर' } as const;

/** The interface in Hindi. Anything left out shows in English. */
export const hi: Translation = {
  common: {
    furigana: (mode: Settings['ruby']): string => `फ़ुरिगाना: ${RUBY[mode]}`,
    pinyin: (mode: Settings['ruby']): string => `पिनयिन: ${RUBY[mode]}`,
    sentenceGap: ' ',
  },

  settings: {
    // भाषाएं
    languagesHeading: 'भाषाएं',
    languagesAbout: 'वह भाषा चुनें जो आप सीख रहे हैं, और अपनी भाषा।',
    target: 'सीखने की भाषा',
    targetLimited: (language: string): string => `${language} — सीमित`,
    supportFull: 'पूरा सपोर्ट, उच्चारण और फ़ुरिगाना के साथ।',
    supportPinyin: 'पूरा सपोर्ट, पिनयिन के साथ। अर्थ अंग्रेज़ी में हैं।',
    supportWords: 'पूरा सपोर्ट। अर्थ अंग्रेज़ी में हैं।',
    supportBasic: 'बुनियादी सपोर्ट: शब्द अलग किए जाते हैं, पर अभी कोई शब्दकोश या उच्चारण नहीं है।',
    native: 'आपकी भाषा',
    nativeHint: 'अनुवाद और अर्थ इसी भाषा में दिखते हैं, जहां वीडियो और शब्दकोश में यह भाषा हो।',
    definitions: 'अर्थ की भाषा',
    definitionsHint: 'शब्दकोश के अर्थ आपकी भाषा में नहीं हैं, इसलिए वे इस भाषा में दिखाए जाते हैं।',
    definitionsHintFor: (language: string): string =>
      `शब्दकोश के अर्थ ${language} में नहीं हैं, इसलिए वे इस भाषा में दिखाए जाते हैं।`,

    // अर्थ देखना
    lookupHeading: 'अर्थ देखना',
    lookupAbout: 'चुनें कि शब्दों के अर्थ कैसे और कब दिखें।',
    interaction: 'अर्थ कब दिखे',
    interactionHover: 'होवर करने पर',
    interactionShift: 'Shift दबाकर होवर करने पर',
    interactionClick: 'क्लिक करने पर',
    interactionHint: 'शब्द पर क्लिक करने से भी अर्थ हमेशा दिखता है।',
    hoverPause: 'अर्थ देखते समय रोकें',
    hoverPauseHint: 'जब तक पॉइंटर किसी शब्द पर है, वीडियो रुका रहता है।',
    sidebarHover: 'ट्रांसक्रिप्ट में झटपट अर्थ',
    sidebarHoverHint: 'ट्रांसक्रिप्ट में किसी शब्द पर पॉइंटर ले जाने पर उसका छोटा अर्थ दिखाता है।',

    // शब्द पॉप-अप
    popupHeading: 'शब्द पॉप-अप',
    popupAbout: 'चुनें कि किसी शब्द का अर्थ देखते समय पॉप-अप में क्या दिखे।',
    cardMarks: '“ज्ञात” और “अनदेखा करें” बटन',
    cardMarksHint: '“ज्ञात” शब्द की अंडरलाइन हटा देता है; “अनदेखा करें” उसे गिनती से बाहर रखता है। दोनों से कोई कार्ड नहीं बनता।',
    cardTrack: '“ट्रैक करें” बटन',
    cardTrackHint: 'जिन शब्दों पर आप ध्यान देना चाहते हैं, उन्हें बैंगनी अंडरलाइन देता है। इससे कार्ड नहीं बनता।',
    cardDeckMenu: 'डेक मेन्यू',
    cardDeckMenuHint: '“Anki में जोड़ें” के बगल में ▾ जोड़ता है, जिससे दूसरा डेक चुना जा सके। फिर नए कार्ड उसी में जाते हैं।',
    cardAddLine: 'वाक्य कार्ड',
    cardAddLineHint: 'एक बटन जोड़ता है जो पूरे वाक्य का कार्ड बनाता है, उसके ऑडियो और एक स्क्रीनशॉट के साथ।',
    cardKanji: 'कांजी का ब्योरा',
    cardKanjiHint: 'हर कांजी के अर्थ और उच्चारण दिखाता है।',
    cardHanzi: 'अक्षरों का ब्योरा',
    cardHanziHint: 'हर अक्षर के अर्थ और उच्चारण दिखाता है।',
    lookupElsewhere: 'इस वीडियो से उदाहरण',
    lookupElsewhereHint: 'इस वीडियो के वे दूसरे वाक्य दिखाता है जिनमें यह शब्द आता है। चलाने के लिए किसी पर क्लिक करें।',

    // सबटाइटल
    subtitlesHeading: 'सबटाइटल',
    subtitlesAbout: 'वीडियो पर सबटाइटल कैसे दिखें, यह बदलें।',
    ruby: 'फ़ुरिगाना',
    rubyUnknown: 'नए शब्द',
    rubyAlways: 'सभी',
    rubyNever: 'बंद',
    rubyHint: 'कांजी के ऊपर उच्चारण। देखते समय बदलने के लिए R दबाएं।',
    pinyin: 'पिनयिन',
    pinyinHint: 'अक्षरों के ऊपर उच्चारण। देखते समय बदलने के लिए R दबाएं।',
    blurPrimary: 'सबटाइटल धुंधले करें',
    blurPrimaryHint: 'सुनने के अभ्यास के लिए: पॉइंटर ले जाने तक सबटाइटल धुंधले रहते हैं। बदलने के लिए H दबाएं।',
    subtitleSize: 'टेक्स्ट का आकार',
    subtitleSizeOption: (percent: number): string => `${percent}%`,
    subtitleSizeHint: 'प्लेयर के साथ घटता-बढ़ता है, इसलिए फ़ुलस्क्रीन में भी एक जैसा दिखता है।',
    subtitleBottom: 'ऊंचाई',
    subtitleBottomLowest: 'सबसे नीचे',
    subtitleBottomLow: 'नीचे',
    subtitleBottomNormal: 'सामान्य',
    subtitleBottomRaised: 'थोड़ा ऊपर',
    subtitleBottomHigh: 'ऊपर',
    subtitleBottomHighest: 'सबसे ऊपर',
    subtitleBottomHint: 'सबटाइटल कितनी ऊंचाई पर दिखें। उसी प्लेयर पर किसी दूसरे सबटाइटल एक्सटेंशन के सबटाइटल इनके नीचे रहते हैं।',
    dualSubtitles: 'अनुवाद दिखाएं',
    dualSubtitlesHint:
      'आप जो भाषा सीख रहे हैं, उसके सबटाइटल के नीचे आपकी भाषा में सबटाइटल दिखाता है। ये साइट से आते हैं, ' +
      'मशीन अनुवाद से नहीं, और इनके लिए वीडियो की पूरी ट्रांसक्रिप्ट ज़रूरी है।',

    // अंडरलाइन
    underlinesHeading: 'अंडरलाइन',
    underlinesAbout: 'हर रंग बताता है कि आप कोई शब्द कितना जानते हैं। बदलने के लिए किसी रंग पर क्लिक करें।',
    colorUnknown: 'नए शब्द',
    colorUnknownHint: 'ऐसे शब्द जिनका Anki में कोई कार्ड नहीं है।',
    colorLearning: 'सीखे जा रहे',
    colorLearningHint: 'ऐसे शब्द जिनका कार्ड अभी मैच्योर नहीं हुआ है।',
    colorTracking: 'ट्रैक किए गए',
    colorTrackingHint: 'वे शब्द जिन्हें आप ट्रैक कर रहे हैं।',
    colorKnown: 'ज्ञात',
    colorKnownHint: 'मैच्योर कार्ड वाले शब्द, या ज्ञात मार्क किए गए शब्द।',
    markKnown: 'ज्ञात शब्दों को अंडरलाइन करें',
    markKnownHint: 'डिफ़ॉल्ट रूप से बंद, ताकि जैसे-जैसे आप सीखें, स्क्रीन शांत होती जाए।',
    defaultColours: 'डिफ़ॉल्ट रंग',
    resetColours: 'रीसेट करें',

    // ट्रांसक्रिप्ट
    transcriptHeading: 'ट्रांसक्रिप्ट',
    transcriptAbout: 'वीडियो के बगल वाला पैनल, जिसमें सबटाइटल की हर लाइन होती है।',
    sidebarOpen: 'ट्रांसक्रिप्ट पैनल दिखाएं',
    sidebarOpenHint: 'देखते समय इसे दिखाने या छिपाने के लिए S दबाएं।',
    sidebarFollow: 'वीडियो के साथ स्क्रॉल करें',
    sidebarFollowHint: 'मौजूदा लाइन को नज़र में रखता है। खुद स्क्रॉल करने पर यह रुक जाता है; एक बटन इसे फिर शुरू करता है।',
    headerBar: 'हेडर दिखाएं',
    headerBarHint: 'पॉइंटर पास आने पर वीडियो के ऊपर दिखता है।',
    languageBadge: 'भाषा बैज',
    languageBadgeFlag: 'झंडा',
    languageBadgeCode: 'कोड',
    badgeFlag: 'बैज का झंडा',
    badgeFlagDefault: 'डिफ़ॉल्ट',
    badgeFlagHint: 'आप जो भाषा सीख रहे हैं, उसके लिए दिखने वाला झंडा। हर भाषा का अपना झंडा रहता है।',
    languageBadgeHint: 'आप जो भाषा सीख रहे हैं, हेडर उसे कैसे दिखाए।',
    sidebarStats: 'नए शब्द गिनें',
    sidebarStatsHint: 'हर लाइन पर नए शब्दों की गिनती, ज्ञात शब्दों का आपका प्रतिशत, और इन पर चलने वाले फ़िल्टर दिखाता है।',

    // Anki
    ankiHeading: 'Anki',
    ankiAbout: 'Anki कनेक्ट करें, चुनें कि नए कार्ड कहां जाएं, और किन डेक से तय हो कि आप कौन से शब्द जानते हैं।',
    deck: 'नए कार्ड का डेक',
    deckHint: 'वह डेक जिसमें हर नया कार्ड जोड़ा जाता है।',
    statusScope: 'ज्ञात शब्दों का स्रोत',
    statusScopeHint: 'इन डेक के कार्ड तय करते हैं कि कौन से शब्द अंडरलाइन हों। सबडेक भी शामिल हैं।',
    marksInAnki: 'मार्क Anki में रखें',
    marksInAnkiHint:
      '“ज्ञात”, “ट्रैक करें” और “अनदेखा करें” को Anki में छिपे नोट (Libregaku::Marks) के रूप में सेव करता है, ताकि वे ' +
      'आपके दूसरे डिवाइस पर सिंक हों। बंद होने पर वे इसी ब्राउज़र में रहते हैं।',

    // डेक मेन्यू
    wholeCollection: 'पूरा संग्रह',
    chooseDeck: 'डेक चुनें…',
    deckNotInAnki: (deck: string): string => `${deck} — Anki में नहीं है`,
    deckAndSubdecks: (deck: string): string => `${deck} (और सबडेक)`,
    deckUnset: 'कोई डेक चुनें। जब तक आप नहीं चुनते, कार्ड नहीं जोड़े जा सकते।',
    deckMissing: (deck: string): string => `Anki में अब “${deck}” नाम का डेक नहीं है। कोई दूसरा चुनें।`,
    statusScopeMissing: (deck: string): string =>
      `Anki में अब “${deck}” नाम का डेक नहीं है, इसलिए हर शब्द नया दिखता है। कोई दूसरा चुनें।`,
    statusScopeOutside: (deck: string): string =>
      `नए कार्ड “${deck}” में जाते हैं, जो यहां शामिल नहीं है, इसलिए आपके जोड़े गए शब्द नए के रूप में अंडरलाइन ` +
      'रहेंगे। ऐसा डेक चुनें जिसमें यह शामिल हो, या पूरा संग्रह।',

    // Anki की स्थिति
    ankiChecking: 'जांच हो रही है…',
    ankiConnected: 'कनेक्ट हो गया।',
    noteTypeInstalled: 'नोट प्रकार इंस्टॉल हो गया।',
    cardsMade: (n: number): string => `Libregaku से ${n} कार्ड ${one(n) ? 'बना' : 'बने'}।`,
    noCards: 'अभी कोई कार्ड नहीं।',
    cardsFlushed: (n: number): string =>
      one(n)
        ? `Anki बंद रहते समय बना ${n} कार्ड जोड़ा गया।`
        : `Anki बंद रहते समय बने ${n} कार्ड जोड़े गए।`,
    cardsNotFlushed: (n: number, error: string): string =>
      `${n} कार्ड नहीं ${one(n) ? 'जोड़ा जा सका' : 'जोड़े जा सके'}: ${error}`,
    cardsWaiting: (n: number): string => `${n} कार्ड ${one(n) ? 'जुड़ना बाकी है' : 'जुड़ने बाकी हैं'}।`,
    ankiOffline: (port: number): string =>
      `Anki पोर्ट ${port} पर जवाब नहीं दे रहा। Anki बंद हो तो ऐसा ही होता है: ` +
      'नए कार्ड यहीं इंतज़ार करते हैं और Anki खुलने पर जुड़ जाते हैं।',
    ankiBlocked: 'Anki चल रहा है, लेकिन AnkiConnect ने अभी इस एक्सटेंशन को अनुमति नहीं दी है।',
    ankiOccupied: (detail: string): string => `${detail} उस प्रोग्राम को बंद करें, ताकि Anki इसका इस्तेमाल कर सके।`,

    // Anki के बटन
    checkAgain: 'फिर से जांचें',
    newDeck: 'नया डेक',
    openCards: 'Anki में कार्ड खोलें',
    openMarks: 'Anki में मार्क खोलें',
    newDeckPrompt: 'नए डेक का नाम लिखें। सबडेक के लिए :: इस्तेमाल करें, जैसे जापानी::Netflix',

    // Anki कनेक्ट करना. Anki's Hindi translation has no names for these menus, so Anki shows them in English.
    installStep: 'इस कंप्यूटर पर Anki इंस्टॉल करें और उसे खोलें। {link}',
    getAnki: 'Anki डाउनलोड करें',
    addonStep: 'Anki में {menu} पर जाएं, यह कोड पेस्ट करें, फिर Anki रीस्टार्ट करें।',
    addonMenu: 'Tools → Add-ons → Get Add-ons…',
    aboutAnkiConnect: 'AnkiConnect के बारे में',
    originStep: 'Anki में {menu} पर जाएं, {setting} में यह लाइन जोड़ें, फिर Anki रीस्टार्ट करें।',
    originMenu: 'Tools → Add-ons → AnkiConnect → Config',
    runningStep: 'देखते समय Anki खुला रखें। कार्ड सीधे इस कंप्यूटर के Anki में जाते हैं।',
    copy: 'कॉपी करें',
    copyValue: (value: string): string => `${value} कॉपी करें`,
    copied: 'कॉपी हो गया',
    copyFailed: 'इसे चुनें',

    // Anki कार्ड
    ankiCardsHeading: 'Anki कार्ड',
    ankiCardsAbout: 'चुनें कि हर नए कार्ड में शब्द, उच्चारण, अर्थ और वाक्य के अलावा और क्या जोड़ा जाए।',
    cardAudio: 'शब्द ऑडियो',
    cardAudioHint: 'शब्द की रिकॉर्डिंग, अगर मौजूद हो। कभी भी कृत्रिम आवाज़ नहीं।',
    cardSentenceAudio: 'वाक्य ऑडियो',
    cardSentenceAudioHint: 'वाक्य को एक बार और चलाकर रिकॉर्ड करता है। Netflix पर इसके लिए नीचे दी गई अनुमति चाहिए।',
    cardScreenshot: 'स्क्रीनशॉट',
    cardScreenshotHint: 'दृश्य की एक तस्वीर। Netflix पर उपलब्ध नहीं, क्योंकि वह इसे ब्लॉक करता है।',
    capture: 'Netflix पर वाक्य ऑडियो',
    captureAllow: 'अनुमति दें',
    captureAllowInSettings: 'सेटिंग में अनुमति दें',
    captureRemove: 'हटाएं',
    captureAllowed: 'अनुमति मिल गई। हर Netflix टैब पर Libregaku आइकॉन पर क्लिक करें और “यहां वाक्य ऑडियो रिकॉर्ड करें” चुनें।',
    captureNeeded: 'Netflix अपने वीडियो को सुरक्षित रखता है, इसलिए वाक्य ऑडियो टैब से रिकॉर्ड होता है। इसके लिए आपकी अनुमति चाहिए।',

    // डेटा और लाइसेंस
    creditsHeading: 'डेटा और लाइसेंस',
    creditJmdict:
      'शब्दकोश और कांजी डेटा © Electronic Dictionary Research and Development Group, CC BY-SA 4.0 के तहत इस्तेमाल। ' +
      'jmdict-simplified ने इसे JSON में दोबारा पैक किया है।',
    creditLindera: 'जापानी, कोरियाई और चीनी को शब्दों में बांटता है। MIT लाइसेंस; IPADIC, mecab-ko-dic और CC-CEDICT की अपनी शर्तें हैं।',
    creditCedict: 'चीनी शब्दकोश © MDBG और उसके योगदानकर्ता, CC BY-SA 4.0 के तहत इस्तेमाल।',
    creditWiktionary: 'कोरियाई और स्पेनिश शब्दकोश, Wiktionary से kaikki.org और wiktionary-to-yomitan के ज़रिए। CC BY-SA 4.0।',
    creditUnihan: 'किसी चीनी अक्षर का कौन सा उच्चारण पहले दिखे। © Unicode, Inc., Unicode License के तहत इस्तेमाल।',
    creditJotoba: 'शब्दकोश डाउनलोड होने तक अर्थ देखने के लिए इस्तेमाल होते हैं। दोनों JMdict का इस्तेमाल करते हैं।',
    creditLucide: 'आइकॉन। ISC लाइसेंस।',
    licence: 'Libregaku MIT लाइसेंस के तहत है। शब्दकोश का डेटा उसके स्रोतों से डाउनलोड होता है, साथ में शामिल नहीं होता।',
    built: (when: string): string => `यह कॉपी ${when} को बनी थी।`,

    // कीबोर्ड शॉर्टकट
    keyLine: 'पिछली या अगली लाइन',
    keyReplay: 'लाइन फिर से चलाएं',
    keyTranslation: 'अनुवाद दिखाएं या छिपाएं',
    keyShiftLookup: 'पॉइंटर के नीचे वाले शब्द का अर्थ देखने के लिए दबाए रखें',
    keyAdd: 'पॉप-अप वाला शब्द Anki में जोड़ें',
    keyKnown: 'पॉप-अप वाले शब्द को ज्ञात मार्क करें',
    keyFurigana: 'फ़ुरिगाना बदलें: बंद, नए शब्द, सभी',
    keyPinyin: 'पिनयिन बदलें: बंद, नए शब्द, सभी',
    keyBlur: 'सबटाइटल धुंधले करें या साफ़ करें',
    keySave: 'मौजूदा लाइन सेव करें',
    keyTranscript: 'ट्रांसक्रिप्ट पैनल दिखाएं या छिपाएं',
    keyClose: 'पॉप-अप बंद करें',
  },

  options: {
    pageTitle: 'Libregaku सेटिंग',
    help: 'सहायता',
    searchSettings: 'खोजें…',
    noSettingsFound: 'यहां “{q}” का कहीं ज़िक्र नहीं है।',
    contentsLabel: 'सेटिंग के सेक्शन',
    settingsLabel: 'सेटिंग',
    setupHeading: 'शुरू करें',
    setupAbout: 'बस दो चुनाव करें, बाकी सब पहले से ठीक सेट है।',
    stepLanguages: 'चुनें कि आप क्या सीख रहे हैं',
    stepAnki: 'Anki कनेक्ट करें और नए कार्ड के लिए डेक चुनें',
    ankiOptional:
      'Anki ज़रूरी नहीं है — सबटाइटल, अर्थ देखना और फ़ुरिगाना, सब इसके बिना काम करते हैं। ' +
      'Anki ही याद रखता है कि आप कौन से शब्द पहले से जानते हैं।',
    nextSteps:
      'फिर आप जो भाषा सीख रहे हैं, उसके सबटाइटल वाला कोई वीडियो खोलें और किसी शब्द पर होवर करें। ' +
      'ट्रांसक्रिप्ट पैनल का कीबोर्ड बटन सभी कीबोर्ड शॉर्टकट दिखाता है।',
    confirmLanguages: 'ये भाषाएं सही हैं',
    keepDeck: (deck: string): string => `नए कार्ड के लिए ${deck} इस्तेमाल करें`,
  },

  action: {
    help: 'सहायता',
    settings: 'सेटिंग',
    settingsTip: 'सभी सेटिंग',
    checkingPage: 'यह पेज जांचा जा रहा है…',
    notActive:
      'इस पेज पर चालू नहीं है। YouTube, Netflix, Disney+, Prime Video या Max का कोई वीडियो खोलें। अगर आपने अभी Libregaku इंस्टॉल या ' +
      'रीलोड किया है, तो टैब रीलोड करें।',
    unsupported: 'Libregaku, YouTube, Netflix, Disney+, Prime Video और Max पर काम करता है।',
    waitingForSubtitles: (site: string): string => `${site} पर सबटाइटल का इंतज़ार है। देख लें कि वे चालू हैं।`,
    activeOn: (title: string): string => `चालू — ${title}`,
    active: 'इस वीडियो पर चालू है।',
    subtitlesTrack: 'सबटाइटल',
    translationTrack: 'अनुवाद',
    noTranslation: 'कोई नहीं',
    generatedTrack: (track: string): string => `${track} (ऑटो)`,
    captureNeedsPermission: 'यहां वाक्य ऑडियो रिकॉर्ड करने के लिए इस टैब की आवाज़ कैप्चर करने की अनुमति चाहिए।',
    captureAllowInSettings: 'सेटिंग में अनुमति दें',
    captureReady: 'Netflix की आवाज़ तभी रिकॉर्ड हो सकती है, जब आप इस टैब के लिए इसे चालू करें।',
    captureStart: 'यहां वाक्य ऑडियो रिकॉर्ड करें',
    captureFailed: 'Chrome इस टैब को रिकॉर्ड नहीं कर सका।',
    toggleSidebar: 'साइडबार टॉगल करें',
    ankiChecking: 'Anki: जांच हो रही है…',
    ankiConnected: (n: number): string => `Anki कनेक्ट है · Libregaku से ${n} कार्ड`,
    ankiOffline: 'Anki नहीं चल रहा — शब्द नए दिखते हैं',
    ankiOccupied: (port: number): string =>
      `पोर्ट ${port} का इस्तेमाल कोई दूसरा प्रोग्राम कर रहा है, इसलिए Anki तक नहीं पहुंचा जा सकता`,
    ankiBlocked: 'Anki ने इस एक्सटेंशन को मना कर दिया — जोड़ने वाली लाइन सेटिंग में है',
    ankiBusy: 'Anki ने जवाब नहीं दिया — शायद वह सिंक कर रहा है',
    ankiRefused: 'Anki ने अनुरोध अस्वीकार कर दिया',
    cardsToAdd: (n: number): string => `${n} कार्ड ${one(n) ? 'जुड़ना बाकी' : 'जुड़ने बाकी'}`,
    cardsWaiting: (n: number): string => `${n} कार्ड Anki के इंतज़ार में`,
  },

  sidebar: {
    // टैब, और उनके बगल के बटन
    tabsLabel: 'सूचियां',
    transcriptTab: 'ट्रांसक्रिप्ट',
    savedTab: 'सेव की गईं',
    wordsTab: 'शब्द',
    settings: 'सेटिंग',
    shortcuts: 'कीबोर्ड शॉर्टकट',
    close: 'बंद करें',
    closeLabel: 'पैनल छोटा करें',
    openTip: 'ट्रांसक्रिप्ट',
    openLabel: 'ट्रांसक्रिप्ट दिखाएं',
    help: 'सहायता',

    // ट्रांसक्रिप्ट में खोजना
    searchPlaceholder: 'ट्रांसक्रिप्ट में खोजें…',
    searchLabel: 'ट्रांसक्रिप्ट में खोजें',
    noMatches: 'कोई नतीजा नहीं',
    matchAt: (at: number, total: number): string => `${total} में से ${at}`,
    matchesFound: (n: number): string => `${n} ${one(n) ? 'मिला' : 'मिले'}`,

    // फ़िल्टर
    filterTip: 'फ़िल्टर करें',
    filterLabel: 'लाइनें फ़िल्टर करें',
    filterAll: 'सभी लाइनें',
    filterAllAbout: 'हर लाइन',
    filterNew: 'नए शब्दों वाली',
    filterNewAbout: 'ऐसी लाइनें जिनमें कोई ऐसा शब्द है जिसका आपके पास कार्ड नहीं है',
    filterReady: 'सीखने को तैयार',
    filterReadyAbout: 'ऐसी लाइनें जिनमें सिर्फ़ एक शब्द आपके लिए नया है — इनसे सीखना सबसे आसान है',
    filterSaved: 'सेव की गईं',
    filterSavedAbout: 'बाद के लिए रखी गई लाइनें',

    // ट्रांसक्रिप्ट
    partial: 'देखते-देखते बन रही है — यह प्लेयर सिर्फ़ मौजूदा लाइन दिखाता है।',
    partialEmpty: 'अभी कुछ नहीं। लाइनें बोले जाने पर यहां दिखेंगी।',
    empty: 'कोई ट्रांसक्रिप्ट लोड नहीं है।',
    currentLine: 'मौजूदा लाइन',
    lineNew: (n: number): string => `${n} ${one(n) ? 'नया' : 'नए'}`,
    saveLine: 'लाइन सेव करें',
    unsave: 'सेव से हटाएं',
    addSentence: 'वाक्य जोड़ें',
    addSentenceLabel: 'वाक्य Anki में जोड़ें',

    // ट्रांसक्रिप्ट के ऊपर का सार: एक लेबल और उसकी संख्या, जो हर गिनती पर ठीक बैठती है
    knownPercent: (n: number): string => `${n}%`,
    summaryKnown: 'ज्ञात: {n}',
    summaryNew: 'नए शब्द: {n}',
    summaryReady: 'सीखने को तैयार: {n}',
    counting: (percent: number): string => `नए शब्द गिने जा रहे हैं… ${percent}%`,
    countFailed: 'कुछ लाइनें गिनी नहीं जा सकीं, इसलिए कुल संख्या नहीं है।',

    // झटपट अर्थ
    dictionaryLoading: (percent: number): string => `शब्दकोश लोड हो रहा है — ${percent}%`,
    dictionaryUnavailable: 'शब्दकोश उपलब्ध नहीं',
    noEntry: 'शब्दकोश में नहीं मिला।',

    // सेव की गईं
    savedEmpty:
      'अभी कुछ सेव नहीं किया गया। जिस वाक्य पर बाद में लौटना हो, उसे रखने के लिए ट्रांसक्रिप्ट की किसी भी लाइन का ' +
      'बुकमार्क इस्तेमाल करें — या B दबाएं।',
    thisVideo: 'यह वीडियो',
    remove: 'हटाएं',
    removeLabel: 'सेव से हटाएं',
    copySavedAbout: 'सेव की गई सभी लाइनें टैब से अलग किए गए टेक्स्ट के रूप में कॉपी करें',
    exportSavedAbout: 'टैब से अलग की गई ऐसी फ़ाइल सेव करें जिसे Anki इंपोर्ट कर सके',
    addSavedAbout: 'सेव की गई हर लाइन से एक कार्ड बनाएं',
    linesCopied: (n: number): string => (one(n) ? `${n} लाइन कॉपी हुई।` : `${n} लाइनें कॉपी हुईं।`),
    chooseDeck: 'पहले सेटिंग में डेक चुनें — नए कार्ड वहीं जाते हैं।',
    checkingAnki: 'Anki जांचा जा रहा है…',
    ankiOffline: 'Anki नहीं चल रहा। उसे खोलें और फिर कोशिश करें — तरीका सेटिंग में है।',
    ankiBlocked: 'AnkiConnect ने अभी इस एक्सटेंशन को अनुमति नहीं दी है। जोड़ने वाली एक लाइन सेटिंग में है।',
    ankiUnreachable: 'Anki तक नहीं पहुंचा जा सका। वजह सेटिंग में है।',
    adding: (at: number, total: number): string => `जोड़ा जा रहा है: ${total} में से ${at}…`,
    savedAdded: (added: number, deck: string, already: number): string =>
      `${deck} में ${added} कार्ड ${one(added) ? 'जोड़ा गया' : 'जोड़े गए'}` +
      `${already ? `, ${already} पहले से ${one(already) ? 'था' : 'थे'}` : ''}।`,

    // सेव की गईं और शब्द टैब के बटन और संदेश
    copy: 'कॉपी करें',
    exportFile: 'फ़ाइल एक्सपोर्ट करें',
    addToAnki: 'Anki में जोड़ें',
    noClipboard: 'क्लिपबोर्ड तक नहीं पहुंच सके।',
    downloaded: 'फ़ाइल आपके डाउनलोड में सेव हो गई। Anki में: File → Import।',
    downloadBlocked: 'इस पेज ने डाउनलोड ब्लॉक कर दिया — इसके बजाय “कॉपी करें” इस्तेमाल करें।',

    // शब्द टैब
    listsLabel: 'कौन से शब्द',
    listTracked: 'ट्रैक किए गए',
    listKnown: 'ज्ञात',
    listIgnored: 'अनदेखा किए गए',
    findPlaceholder: 'शब्द ढूंढें',
    findLabel: 'इस सूची में शब्द ढूंढें',
    copyWordsAbout: 'यह सूची टैब से अलग किए गए टेक्स्ट के रूप में कॉपी करें',
    exportWordsAbout: 'यह सूची टैब से अलग की गई ऐसी फ़ाइल के रूप में सेव करें जिसे Anki इंपोर्ट कर सके',
    wordsCopied: (n: number): string => `${n} शब्द कॉपी ${one(n) ? 'हुआ' : 'हुए'}।`,
    nothingToExport: 'इस सूची में एक्सपोर्ट करने के लिए कोई शब्द नहीं है।',
    lookingUp: 'उच्चारण और अर्थ ढूंढे जा रहे हैं…',
    noWordMatches: (query: string): string => `इस सूची में कोई भी शब्द “${query}” से मेल नहीं खाता।`,
    wordsMatching: (shown: number, total: number): string =>
      `${total} ${one(total) ? 'शब्द' : 'शब्दों'} में से ${shown}।`,
    trackedEmpty:
      'अभी कुछ ट्रैक नहीं किया गया। “ट्रैक करें” किसी शब्द को अंडरलाइन करता है ताकि वह आपकी नज़र में आए, ' +
      'कार्ड बनाए बिना। इसका बटन सेटिंग में, “शब्द पॉप-अप” के नीचे चालू करें।',
    trackedIntro: (n: number): string =>
      one(n)
        ? `आप ${n} शब्द ट्रैक कर रहे हैं, जो जहां भी आता है, अंडरलाइन होता है।`
        : `आप ${n} शब्द ट्रैक कर रहे हैं, जो जहां भी आते हैं, अंडरलाइन होते हैं।`,
    stopTracking: 'ट्रैक करना बंद करें',
    knownEmpty:
      'कोई शब्द ज्ञात मार्क नहीं है। जब आप कोई शब्द जानते हों और उसका कार्ड न चाहिए, तो उसके पॉप-अप से उसे ' +
      'ज्ञात मार्क करें, या K दबाएं।',
    knownIntro: (n: number): string =>
      `${n} शब्द ज्ञात मार्क ${one(n) ? 'है' : 'हैं'}। किसी शब्द से मार्क हटाने पर उसकी स्थिति फिर आपके Anki कार्ड से तय होगी।`,
    unmarkKnown: 'ज्ञात मार्क हटाएं',
    ignoredEmpty:
      'कोई शब्द अनदेखा नहीं किया गया। नामों और आवाज़ों को उनके पॉप-अप से अनदेखा करें, फिर वे न अंडरलाइन होंगे, न गिने जाएंगे।',
    ignoredIntro: (n: number): string =>
      one(n)
        ? `${n} शब्द, जो कभी न अंडरलाइन होता है, न गिना जाता है।`
        : `${n} शब्द, जो कभी न अंडरलाइन होते हैं, न गिने जाते हैं।`,
    stopIgnoring: 'अनदेखा करना बंद करें',
  },

  popup: {
    // पॉप-अप, और उसके ऊपर का शब्द
    cardLabel: (word: string): string => `${word} — शब्दकोश`,
    commonBadge: 'प्रचलित',
    characterNames: { kanji: 'कांजी', hanzi: 'अक्षर' },
    partOfSpeech: {
      n: 'संज्ञा', 'n-adv': 'क्रियाविशेषण संज्ञा', 'n-t': 'कालवाचक संज्ञा', 'n-suf': 'संज्ञा प्रत्यय',
      'n-pref': 'संज्ञा उपसर्ग', pn: 'सर्वनाम', 'adj-i': 'i-विशेषण', 'adj-na': 'na-विशेषण',
      'adj-no': 'no-विशेषण', 'adj-pn': 'संज्ञा-पूर्व विशेषण', adv: 'क्रियाविशेषण', 'adv-to': 'क्रियाविशेषण',
      aux: 'सहायक', 'aux-v': 'सहायक क्रिया', 'aux-adj': 'सहायक विशेषण',
      conj: 'समुच्चयबोधक', cop: 'संयोजक क्रिया', ctr: 'गिनती शब्द', exp: 'अभिव्यक्ति', int: 'विस्मयादिबोधक',
      num: 'संख्यावाचक', prt: 'निपात', pref: 'उपसर्ग', suf: 'प्रत्यय', unc: 'अवर्गीकृत',
      vs: 'suru क्रिया', 'vs-i': 'suru क्रिया', 'vs-s': 'suru क्रिया', vt: 'सकर्मक', vi: 'अकर्मक',
      v1: 'ichidan क्रिया', 'v1-s': 'ichidan क्रिया', vk: 'kuru क्रिया', vz: 'zuru क्रिया',
      v5b: 'godan क्रिया', v5g: 'godan क्रिया', v5k: 'godan क्रिया', 'v5k-s': 'godan क्रिया',
      v5m: 'godan क्रिया', v5n: 'godan क्रिया', v5r: 'godan क्रिया', 'v5r-i': 'godan क्रिया',
      v5s: 'godan क्रिया', v5t: 'godan क्रिया', v5u: 'godan क्रिया', 'v5u-s': 'godan क्रिया',
      v5aru: 'godan क्रिया',
      // Wiktionary के कोड, कोरियाई और स्पेनिश शब्दों के लिए
      name: 'व्यक्तिवाचक संज्ञा', v: 'क्रिया', adj: 'विशेषण', pron: 'सर्वनाम', det: 'निर्धारक', artic: 'आर्टिकल',
      counter: 'गिनती शब्द', prep: 'पूर्वसर्ग', 'prep-phrase': 'पूर्वसर्गीय वाक्यांश', ptcl: 'निपात',
      intj: 'विस्मयादिबोधक', phrase: 'वाक्यांश', prov: 'कहावत', r: 'मूल', char: 'अक्षर', adn: 'संज्ञा-विशेषक',
      ptcpl: 'कृदंत', contr: 'संक्षिप्त रूप',
      masc: 'पुल्लिंग', fem: 'स्त्रीलिंग', neut: 'नपुंसकलिंग', sg: 'एकवचन', pl: 'बहुवचन', 'pl-only': 'केवल बहुवचन',
      count: 'गणनीय', uncount: 'अगणनीय', vr: 'निजवाचक', vdt: 'द्विकर्मक', impers: 'अव्यक्तिक',
      irreg: 'अनियमित', reltnl: 'संबंधात्मक', reltv: 'संबंधवाचक', interr: 'प्रश्नवाचक', poss: 'स्वामित्ववाचक',
      dim: 'छोटा रूप', aug: 'बड़ा रूप', onoma: 'ध्वन्यात्मक',
      idio: 'मुहावरेदार', fig: 'लाक्षणिक', literal: 'शाब्दिक', col: 'बोलचाल', inf: 'अनौपचारिक', fam: 'आत्मीय',
      formal: 'औपचारिक', polite: 'विनम्र', lit: 'साहित्यिक', poet: 'काव्यात्मक', rhet: 'आलंकारिक', sl: 'स्लैंग',
      vulg: 'अभद्र', derog: 'अपमानजनक', offens: 'आपत्तिजनक', humor: 'हास्यपूर्ण', euph: 'शिष्टोक्ति',
      child: 'बाल-भाषा', net: 'इंटरनेट', neol: 'नवनिर्मित शब्द', cmn: 'प्रचलित', uncmmn: 'कम प्रचलित', rare: 'दुर्लभ',
      dated: 'पुराना', arch: 'पुरातन', obs: 'अप्रचलित', hist: 'ऐतिहासिक', 'non-std': 'अमानक',
      dialect: 'बोली', regio: 'क्षेत्रीय',
    },

    // शब्द के नीचे के बटन
    pronounce: 'उच्चारण सुनें',
    playedRecording: (word: string): string => `${word} · रिकॉर्डिंग`,
    playedSynthesised: (word: string): string => `${word} · कृत्रिम आवाज़`,
    pronounceFailed: 'ऑडियो नहीं चल सका',
    addSentence: 'वाक्य जोड़ें',
    sentenceAdded: 'वाक्य जोड़ा गया',
    undo: 'पहले जैसा करें',
    copyWord: 'शब्द कॉपी करें',
    copyPhrase: 'वाक्यांश कॉपी करें',
    copySentence: 'वाक्य कॉपी करें',
    wordCopied: 'शब्द कॉपी हुआ',
    phraseCopied: 'वाक्यांश कॉपी हुआ',
    sentenceCopied: 'वाक्य कॉपी हुआ',
    copyFailed: 'कॉपी नहीं हो सका — टेक्स्ट चुनकर कॉपी करें',

    // अर्थ
    dictionaryLoading: (percent: number): string =>
      `शब्दकोश अभी लोड हो रहा है — ${percent}%। थोड़ी देर में फिर कोशिश करें।`,
    dictionaryUnavailable: (error: string): string => `शब्दकोश उपलब्ध नहीं: ${error}`,
    noEntry: 'शब्दकोश में इस शब्द की कोई प्रविष्टि नहीं है।',
    moreMeanings: (n: number): string => `+${n} और अर्थ`,

    // इस वीडियो में शब्द की दूसरी लाइनें
    elsewhereCount: (n: number): string => (n === 1 ? 'इस वीडियो में एक बार और' : `इस वीडियो में ${n} बार और`),
    playLine: 'चलाएं',
    elsewhereMore: (n: number): string => `और ${n} — ट्रांसक्रिप्ट की खोज इन सभी को ढूंढ लेती है`,
    showAllInTranscript: 'ट्रांसक्रिप्ट में सभी दिखाएं',

    // Anki में जोड़ें
    addToAnki: 'Anki में जोड़ें',
    addToDeck: (deck: string): string => `${deck} में जोड़ें`,
    adding: 'जोड़ा जा रहा है…',
    undoing: 'हटाया जा रहा है…',
    added: 'जोड़ा गया',
    inAnki: 'Anki में है',
    showInAnki: 'Anki में दिखाएं',
    waiting: 'इंतज़ार में',
    waitingForAnki: 'Anki का इंतज़ार',
    goesInWhenAnkiOpens: 'Anki खुलने पर यह उसमें चला जाएगा',
    alreadyAdded: 'पहले ही जोड़ा जा चुका है',
    alreadyInAnki: 'पहले से Anki में है',
    waitingForAnkiToOpen: 'Anki खुलने का इंतज़ार है',
    addedWithWarning: (said: string, warning: string): string => `${said} — ${warning}`,

    // डेक मेन्यू
    otherDecks: 'दूसरे डेक',
    addToAnotherDeck: 'दूसरे डेक में जोड़ें',
    decksUnknown: 'Anki जवाब नहीं दे रहा, इसलिए उसके डेक अभी पता नहीं हैं।',
    newDeck: 'नया डेक…',
    newDeckPrompt: 'नया डेक — सबडेक के लिए :: इस्तेमाल करें, जैसे जापानी::Netflix',

    // मार्क
    knownButton: 'ज्ञात',
    trackButton: 'ट्रैक करें',
    ignoreButton: 'अनदेखा करें',
    markKnownTip: 'ज्ञात मार्क करें',
    trackTip: 'ट्रैक करें',
    ignoreTip: 'अनदेखा करें',
    unmarkKnownTip: 'ज्ञात मार्क हटाएं',
    stopTrackingTip: 'ट्रैक करना बंद करें',
    stopIgnoringTip: 'अनदेखा करना बंद करें',
  },

  header: {
    knownStat: '{percent} ज्ञात',
    knownPercent: (percent: number): string => `${percent}%`,
    knownTip: 'जो शब्द आप जानते हैं',
    readyStat: '{count} सीखने को तैयार',
    readyTip: 'एक नए शब्द वाली लाइनें',
    blurSubtitle: 'सबटाइटल धुंधला करें',
    unblurSubtitle: 'सबटाइटल साफ़ करें',
    showTranslation: 'अनुवाद दिखाएं',
    hideTranslation: 'अनुवाद छिपाएं',
    transcript: 'ट्रांसक्रिप्ट',
    pinHeader: 'हेडर पिन करें',
    unpinHeader: 'हेडर अनपिन करें',
    settings: 'सेटिंग',
    showHeader: 'हेडर दिखाएं',
    showHeaderLabel: 'हेडर दिखाएं',
  },

  player: {
    // प्लेयर की कुंजियां
    lastLine: 'यह आखिरी लाइन थी',
    noLineBefore: 'इससे पहले कोई लाइन नहीं',
    translationOn: 'अनुवाद चालू',
    translationOff: 'अनुवाद बंद',
    blurOn: 'होवर करने तक सबटाइटल धुंधला',
    blurOff: 'सबटाइटल दिख रहा है',
    lineSaved: 'लाइन सेव हो गई',
    lineUnsaved: 'लाइन अब सेव नहीं है',
    lookUpFirst: 'पहले किसी शब्द का अर्थ देखें',
    alreadyKnown: (word: string): string => `${word} · Anki में पहले से ज्ञात`,
    alreadyInAnki: (word: string): string => `${word} · पहले से Anki में`,
    adding: (word: string): string => `${word} जोड़ा जा रहा है…`,
    wordResult: (word: string, said: string): string => `${word} · ${said}`,

    // मार्क
    markOff: (word: string): string => `${word} · मार्क हटाया गया`,
    marked: (word: string, status: OverrideStatus, refused: boolean): string => {
      const done = {
        known: 'ज्ञात मार्क किया गया', tracking: 'ट्रैक किया गया', ignored: 'अनदेखा किया गया', unknown: 'नया मार्क किया गया',
      }[status];
      if (refused) return `${word} · ${done}, कोई कार्ड नहीं — Anki ने मना कर दिया; बाद में फिर कोशिश होगी`;
      return `${word} · ${done}, कोई कार्ड नहीं${status === 'tracking' ? '। पैनल का “शब्द” टैब देखें' : ''}`;
    },

    // शब्द का कार्ड
    pickDeck: 'पहले Libregaku की सेटिंग में डेक चुनें',
    added: (deck: string, missing: readonly MissingMedia[]): string =>
      missing.length ? `${deck} में जोड़ा गया — ${without(missing)}` : `${deck} में जोड़ा गया`,
    alreadyIn: (deck: string): string => `पहले से ${deck} में है`,
    queued: (deck: string): string => `Anki बंद है — खुलने पर यह ${deck} में जाएगा`,
    alreadyQueued: 'पहले से Anki के इंतज़ार में',
    notKept: 'Anki बंद है, और ब्राउज़र ने कार्ड को बाद के लिए नहीं रखा',
    takenBack: (deck: string): string => `${deck} से हटाया गया`,
    unqueued: 'अब Anki के इंतज़ार में नहीं',
    alreadySent: 'यह पहले ही Anki में जा चुका है',
    queueSent: (count: number): string =>
      `Anki खुल गया — ${count === 1 ? 'उसके लिए रखा गया कार्ड जोड़ा गया' : `उसके लिए रखे गए ${count} कार्ड जोड़े गए`}`,
    deckOutsideScope: (scope: string, deck: string): string =>
      `ज्ञात शब्द ${scope} से पढ़े जाते हैं, इसलिए ${deck} के कार्ड नहीं गिने जाएंगे`,

    // वाक्य कार्ड
    sentenceAdded: (deck: string, missing: readonly MissingMedia[]): string =>
      missing.length ? `वाक्य ${deck} में जोड़ा गया — ${without(missing)}` : `वाक्य ${deck} में जोड़ा गया`,
    sentenceAlreadyIn: (deck: string): string => `वाक्य पहले से ${deck} में है`,
    sentenceQueued: (deck: string, sound: boolean, picture: boolean): string => {
      const lacking = [sound && 'आवाज़', picture && 'तस्वीर'].filter(Boolean);
      return `Anki बंद है — खुलने पर वाक्य ${deck} में जाएगा` +
        `${lacking.length ? `, अपनी ${lacking.join(' या ')} के बिना` : ''}`;
    },
    sentenceAlreadyQueued: 'वाक्य पहले से Anki के इंतज़ार में है',
    sentenceTakenBack: (deck: string): string => `वाक्य ${deck} से हटाया गया`,

    // वाक्य ऑडियो
    recording: 'लाइन रिकॉर्ड हो रही है…',

    // अर्थ देखना
    noDictionary: 'इस भाषा का अभी कोई शब्दकोश नहीं है।',
  },

  notices: {
    // नोटिस
    unexpected: 'Libregaku में कोई अनपेक्षित समस्या आई।',
    dismiss: 'खारिज करें',

    // YouTube या Netflix ने कुछ बदला
    youtubeTrackList: 'YouTube की सबटाइटल सूची नहीं पढ़ी जा सकी।',
    youtubeTrackShape: 'YouTube का सबटाइटल डेटा अपेक्षित रूप में नहीं है।',
    youtubeCaptionText: 'पेज पर YouTube के सबटाइटल का टेक्स्ट नहीं मिला।',
    youtubePlayerTrackList: 'YouTube के प्लेयर से इस वीडियो की सबटाइटल सूची नहीं पढ़ी जा सकी।',
    netflixTrackList: 'Netflix की सबटाइटल सूची नहीं पढ़ी जा सकी।',
    netflixCaptionText: 'पेज पर Netflix के सबटाइटल का टेक्स्ट नहीं मिला।',
    disneyTrackList: 'Disney+ की सबटाइटल सूची नहीं पढ़ी जा सकी।',
    disneyCaptionText: 'पेज पर Disney+ के सबटाइटल का टेक्स्ट नहीं मिला।',
    primeTrackList: 'Prime Video की सबटाइटल सूची नहीं पढ़ी जा सकी।',
    primeCaptionText: 'पेज पर Prime Video के सबटाइटल का टेक्स्ट नहीं मिला।',
    maxTrackList: 'Max की सबटाइटल सूची नहीं पढ़ी जा सकी।',
    maxCaptionText: 'पेज पर Max के सबटाइटल का टेक्स्ट नहीं मिला।',
    netflixBlocked: 'Netflix ने Libregaku के उस हिस्से को रोक दिया जो सबटाइटल पढ़ता है।',

    // इस वीडियो के सबटाइटल
    subtitlesOff: 'प्लेयर में सबटाइटल चालू करें, Libregaku उन्हें पढ़ लेगा।',
    noTargetTrack: 'यहां उस भाषा में सबटाइटल नहीं हैं जो आप सीख रहे हैं।',
    noSecondTrack: 'यहां आपकी अपनी भाषा में सबटाइटल नहीं हैं, इसलिए दूसरी लाइन नहीं है।',
    onlyOneTrack: 'इस वीडियो में सबटाइटल का सिर्फ़ एक ट्रैक है, इसलिए दूसरी लाइन नहीं है।',
    autoGenerated: 'ये सबटाइटल अपने-आप बने हैं, इसलिए शब्दों और उनके बंटवारे में गलतियां होंगी।',
    noSubtitles: 'इस वीडियो में सबटाइटल नहीं हैं।',
    secondTrackFailed: 'दूसरी लाइन लोड नहीं हो सकी।',

    // एक्सटेंशन के अपने हिस्से
    analyserUnavailable:
      'उच्चारण और शब्दकोश रूप बंद हैं: भाषा विश्लेषक लोड नहीं हुआ। शब्द आपके कार्ड से सिर्फ़ हूबहू वर्तनी से मिलाए जाते हैं।',
    markNotSaved: 'वह मार्क सेव नहीं हो सका। रीलोड करने तक लागू रहेगा, फिर खो जाएगा।',
    marksNotSynced: 'आपके मार्क Anki में सेव नहीं हो सके। वे इस ब्राउज़र में रखे हैं, और फिर से कोशिश की जाएगी।',
    cardsNotAdded: 'Anki बंद रहते समय रखे गए कुछ कार्ड Anki ने नहीं लिए। वे अब भी रखे हैं, और फिर से कोशिश की जाएगी।',

    // ब्योरा
    playerNeverLoaded: 'प्लेयर पूरी तरह लोड नहीं हुआ।',
    subtitlesMaybeOff: 'हो सकता है प्लेयर में सबटाइटल बस बंद हों।',
    lookedFor: (selector: string): string => `${selector} ढूंढा गया`,
    noTargetTrackDetail: (languages: readonly string[]): string =>
      `इस वीडियो में हैं: ${languages.join(', ') || 'कोई नहीं'}। सेटिंग में सीखने की भाषा बदलें, या कोई दूसरा वीडियो चुनें।`,
    onlyPictures: 'इस वीडियो में ये सबटाइटल सिर्फ़ तस्वीरों के रूप में हैं, टेक्स्ट नहीं, इसलिए Libregaku इन्हें पढ़ नहीं सकता।',
    noHumanTrack: 'इस वीडियो के लिए किसी इंसान का लिखा ट्रैक उपलब्ध नहीं था।',
    secondTrackError: (track: string, error: string): string => `${track}: ${error}`,
    noSecondTrackDetail: (languages: readonly string[]): string => `इस वीडियो में हैं: ${languages.join(', ')}।`,
    analyserDidNotLoad: 'विश्लेषक लोड नहीं हुआ',
  },

  anki: {
    // AnkiConnect तक पहुंचना
    offline: (port: number): string => `पोर्ट ${port} पर कोई जवाब नहीं दे रहा।`,
    timeout: (port: number, seconds: number): string =>
      `पोर्ट ${port} पर ${seconds} सेकंड में कोई जवाब नहीं आया। ` +
      'Anki व्यस्त हो सकता है (सिंक कर रहा हो, या कोई डायलॉग दिखा रहा हो), या कोई दूसरा प्रोग्राम पोर्ट रोके हुए है।',
    blocked: (origin: string): string =>
      `AnkiConnect ने ${origin} को मना कर दिया। Anki में: Tools → Add-ons → AnkiConnect → Config, ` +
      'और वह लाइन webCorsOriginList में जोड़ें।',
    httpAnswer: (port: number, status: number): string =>
      `पोर्ट ${port} पर किसी चीज़ ने HTTP ${status} से जवाब दिया। AnkiConnect ऐसा नहीं करता।`,
    notAnkiConnect: (port: number): string => `पोर्ट ${port} का इस्तेमाल AnkiConnect के बजाय कुछ और कर रहा है।`,
    noBackground: 'एक्सटेंशन का बैकग्राउंड हिस्सा जवाब नहीं दे रहा।',
    unreachable: 'Anki तक नहीं पहुंचा जा सकता।',
    callFailed: 'AnkiConnect कॉल विफल रहा।',

    // जो Libregaku खुद नहीं भेजता
    notRelayed: (action: string): string => `Libregaku “${action}” को AnkiConnect पर नहीं भेजता।`,
    mediaNotFetched: (media: 'audio' | 'video' | 'picture'): string => `Libregaku सिर्फ़ ${MEDIA_FETCHED[media]}।`,
    mediaEmpty: (media: 'audio' | 'video' | 'picture'): string => `${MEDIA_OF_NOTE[media]} में कोई डेटा नहीं है।`,
    mediaName: (prefix: string): string =>
      `Libregaku अपनी जोड़ी फ़ाइलों के नाम ${prefix}… से शुरू करता है, और इस फ़ाइल का नाम ऐसा नहीं है।`,
    idsNeeded: (action: string, ids: 'notes' | 'cards'): string =>
      `${action} को ${ids === 'notes' ? 'नोटों' : 'कार्डों'} की सूची चाहिए।`,
    notMarks: (count: number, ids: 'notes' | 'cards', change: 'delete' | 'suspend' | 'retag'): string =>
      `अस्वीकार: भेजे गए ${ids === 'notes' ? 'नोटों' : 'कार्डों'} में से ${count} ` +
      `किसी Libregaku मार्क ${one(count) ? 'का नहीं है' : 'के नहीं हैं'}। ` +
      `Libregaku सिर्फ़ अपने मार्क ${change === 'delete' ? 'हटाता है' : change === 'suspend' ? 'सस्पेंड करता है' : 'के टैग बदलता है'}` +
      (change === 'delete' ? ', और पिछले कुछ मिनटों में बना अपना ऐसा कार्ड जिसे अभी पढ़ा नहीं गया।' : '।'),

    // Libregaku के नोट प्रकार
    noteTypeMismatch: (noteType: string, fields: readonly string[], loses: 'cards' | 'notes'): string =>
      `Anki में आपके “${noteType}” नोट प्रकार में ${one(fields.length) ? 'फ़ील्ड' : 'ये फ़ील्ड'} ${fields.join(', ')} ` +
      `${one(fields.length) ? 'नहीं है' : 'नहीं हैं'}, इसलिए ${loses === 'cards' ? 'कार्डों' : 'नोटों'} से ` +
      `${one(fields.length) ? 'यह छूट जाएगा' : 'ये छूट जाएंगे'}। ` +
      'Libregaku ऐसा नोट प्रकार नहीं बदलेगा जिसे शायद आपने एडिट किया हो: ' +
      `Anki में Tools → Manage Note Types पर जाकर “${noteType}” का नाम बदलें (या फ़ील्ड वापस जोड़ें), फिर ` +
      '“फिर से जांचें” दबाएं, और एक नया नोट प्रकार इंस्टॉल हो जाएगा।',

    // मार्क और इंतज़ार कर रहे कार्ड
    marksNotAdded: (count: number): string =>
      one(count)
        ? `Anki ने ${count} मार्क नहीं जोड़ा। वह कतार में रहेगा और अगली बार फिर कोशिश होगी।`
        : `Anki ने ${count} मार्क नहीं जोड़े। वे कतार में रहेंगे और अगली बार फिर कोशिश होगी।`,
    marksNotStored: (cause: string): string => `ब्राउज़र स्टोरेज ने Anki से पढ़े गए मार्क नहीं रखे: ${cause}`,
    storageUnreadable: (cause: string): string => `ब्राउज़र स्टोरेज पढ़ा नहीं जा सका: ${cause}`,
  },

  errors: {
    // टैब की आवाज़ रिकॉर्ड करना
    captureNotAllowed: 'पहले Libregaku की सेटिंग में इस साइट पर वाक्य ऑडियो की अनुमति दें।',
    captureRefused: 'Chrome ने इस टैब को कैप्चर नहीं करने दिया',

    // सबटाइटल का ट्रैक जो लोड नहीं हुआ
    unknownTrack: (id: string): string => `अज्ञात ट्रैक ${id}`,
    noCaptionFormat: (attempts: readonly string[]): string =>
      `कोई भी कैप्शन फ़ॉर्मैट काम नहीं आया — ${attempts.join(', ')}`,
    noSubtitleUrl: (attempts: readonly string[]): string =>
      `सबटाइटल का कोई भी URL काम नहीं आया — ${attempts.join('; ') || 'कोई सूचीबद्ध नहीं'}`,
    emptyAnswer: 'खाली',
    noCues: '0 लाइनें',
    noCuesParsed: 'पढ़ने पर 0 लाइनें मिलीं',
    noAnswerWithin: (seconds: number): string => `${seconds} सेकंड में कोई जवाब नहीं`,

    // ट्रैक का नाम
    forcedTrack: (track: string): string => `${track} (फ़ोर्स्ड)`,

    // शब्दकोश और विश्लेषक
    noAnswer: 'एक्सटेंशन से कोई जवाब नहीं — इसे फिर से शुरू करने के लिए पेज रीलोड करें',
    analyserLoading: 'विश्लेषक अभी लोड हो रहा है',
    dictionaryLoading: 'शब्दकोश अभी लोड हो रहा है',
    lookupFailed: 'अर्थ नहीं मिल सका',
  },

  grammar: {
    // काल और विनम्रता
    past: 'भूतकाल',
    polite: 'विनम्र',

    // न करना
    negative: 'नकारात्मक',
    'negative intent': 'नकारात्मक इरादा',
    without: 'बिना किए',

    // अगर और जब
    conditional: 'शर्तवाचक',
    whenever: 'जब भी',

    // कौन करता है, और क्या हो सकता है
    passive: 'कर्मवाच्य',
    'passive or potential': 'कर्मवाच्य या सामर्थ्य',
    potential: 'सामर्थ्य',
    causative: 'प्रेरणार्थक',

    // चाहना
    'want to': 'चाहना',
    'seems to want to': 'चाहता लगता है',
    'want someone to': 'चाहना कि कोई करे',

    // बोलने वाला कैसे जानता है, और कितना पक्का है
    seems: 'लगता है',
    'seems like': 'जैसा लगता है',
    hearsay: 'सुना है',
    apparently: 'जान पड़ता है',
    probably: 'संभवतः',
    might: 'हो सकता है',

    // क्या होना चाहिए
    'ought to': 'चाहिए',
    'supposed to': 'अपेक्षित',
    'intends to': 'योजना',

    // ज़रूरत और अनुमति
    must: 'ज़रूरी',
    'must not': 'मना है',
    "don't have to": 'ज़रूरी नहीं',
    may: 'अनुमति',

    // आज्ञा, अनुरोध और "चलो"
    imperative: 'आज्ञार्थक',
    volitional: 'इरादा',
    'polite command': 'विनम्र आज्ञा',
    please: 'अनुरोध',

    // आगे से जोड़ना
    'te-form': 'て रूप',
    listing: 'उदाहरण गिनाना',
    while: 'करते हुए',
    because: 'क्योंकि',
    'even though': 'हालांकि',
    'in order to': 'के लिए',
    'so that': 'ताकि',

    // て रूप के बाद की सहायक क्रियाएं
    ongoing: 'जारी',
    'resulting state': 'किया हुआ',
    'completely, or regrettably': 'पूरी तरह, या अफ़सोस से',
    'in advance': 'पहले से',
    'try doing': 'करके देखना',
    'going forward': 'आगे जाना',
    'coming to be': 'होते आना',
    'receive the favour': 'किसी से करवाना',
    'someone does for me': 'मेरे लिए करना',
    'do for someone': 'किसी के लिए करना',

    // क्रिया के मूल के बाद की सहायक क्रियाएं
    'too much': 'बहुत ज़्यादा',
    'easy to': 'करने में आसान',
    'hard to': 'करने में मुश्किल',
    'start to': 'शुरू करना',
    'keep on': 'करते रहना',
    finish: 'ख़त्म करना',
    again: 'दोबारा',
    'each other': 'एक-दूसरे को',
    completely: 'पूरी तरह',
    thoroughly: 'गहराई से',
    around: 'इधर-उधर',
    'non-stop': 'लगातार',

    // स्पेनिश शब्द के रूप
    or: 'या',
    'first-person': 'उत्तम पुरुष',
    'second-person': 'मध्यम पुरुष',
    'third-person': 'अन्य पुरुष',
    singular: 'एकवचन',
    plural: 'बहुवचन',
    masculine: 'पुल्लिंग',
    feminine: 'स्त्रीलिंग',
    present: 'वर्तमानकाल',
    preterite: 'सामान्य भूतकाल',
    imperfect: 'अपूर्ण भूतकाल',
    'imperfect-se': 'अपूर्ण भूतकाल (-se)',
    future: 'भविष्यकाल',
    'conditional-mood': 'संकेतार्थ',
    indicative: 'निश्चयार्थ',
    subjunctive: 'संभावनार्थ',
    infinitive: 'मूल रूप',
    gerund: 'वर्तमान कृदंत',
    participle: 'कृदंत',
    formal: 'औपचारिक',
    informal: 'अनौपचारिक',
    'with-tú': 'tú के साथ',
    'with-vos': 'vos के साथ',
    'vos-form': 'vos रूप',
    voseo: 'voseo',
    'second-person-semantically': '“आप” के अर्थ में',
    accusative: 'मुख्य कर्म के साथ',
    dative: 'गौण कर्म के साथ',
    'object-first-person': 'उत्तम पुरुष कर्म',
    'object-second-person': 'मध्यम पुरुष कर्म',
    'object-third-person': 'अन्य पुरुष कर्म',
    'object-singular': 'एकवचन कर्म',
    'object-plural': 'बहुवचन कर्म',
    diminutive: 'छोटा रूप',
    augmentative: 'बड़ा रूप',
    superlative: 'उत्तमावस्था',
    alternative: 'वैकल्पिक रूप',
    'alt-of': 'दूसरी वर्तनी',

    // कोरियाई प्रत्यय
    honorific: 'आदरसूचक',
    'future or guess': 'भविष्य या अनुमान',
    'formal polite': 'औपचारिक विनम्र',
    question: 'प्रश्न',
    but: 'लेकिन',
    "let's": 'चलो',
    plain: 'सादा कथन',
    'shall we, or I wonder': 'प्रस्ताव या संदेह',
    'I will': 'वादा',
    'just noticed': 'अभी एहसास हुआ',
    'as you know': 'पता है न',
    and: 'और',
    'because, or and then': 'क्योंकि, या फिर',
    'but, or given that': 'लेकिन, या चूंकि',
    'even if': 'भले ही',
    whether: 'या नहीं',
    'adverb form': 'क्रियाविशेषण रूप',
    quoting: 'उद्धरण',
    'used to': 'पहले करते थे',
    topic: 'विषय',
    subject: 'कर्ता',
    object: 'कर्म',
    possessive: 'स्वामित्ववाचक',
    'come to': 'आखिरकार होना',
    when: 'जब',
    modifier: 'विशेषक रूप',
    'noun form': 'संज्ञा रूप',
    becomes: 'बनना',
    'have done before': 'पहले कर चुके हैं',
  },
};
