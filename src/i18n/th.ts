import type { Translation } from '.';
import type { OverrideStatus } from '../anki/status';
import type { MissingMedia } from '../content/capture';
import type { Settings } from '../settings';

/**
 * Thai has no plural forms: a count takes its classifier ("การ์ด 3 ใบ",
 * "3 คำ"). Sentences end without a full stop and are set apart by a space.
 */

/** The furigana (or pinyin) setting's three choices, as the bar and the player announce them: the menu's words. */
const RUBY: Record<Settings['ruby'], string> = { never: 'ปิด', unknown: 'คำใหม่', always: 'ทั้งหมด' };

/** What a card went in without, after "ไม่มี", joined with "หรือ". */
const without = (missing: readonly MissingMedia[]): string =>
  missing
    .map((m) => (m === 'audio-encrypted'
      ? 'เสียงประโยค (คลิกไอคอน Libregaku เพื่อบันทึกที่นี่)'
      : 'เสียงประโยค'))
    .join(' หรือ ');

const MEDIA = { audio: 'เสียง', video: 'วิดีโอ', picture: 'ภาพ' } as const;

/** The interface in Thai. Anything left out shows in English. */
export const th: Translation = {
  common: {
    furigana: (mode: Settings['ruby']): string => `ฟุริงานะ: ${RUBY[mode]}`,
    pinyin: (mode: Settings['ruby']): string => `พินอิน: ${RUBY[mode]}`,
    sentenceGap: ' ',
  },

  settings: {
    // ภาษา
    languagesHeading: 'ภาษา',
    languagesAbout: 'เลือกภาษาที่กำลังเรียนและภาษาของคุณ',
    target: 'ภาษาที่เรียน',
    targetLimited: (language: string): string => `${language} — รองรับจำกัด`,
    supportFull: 'รองรับเต็มรูปแบบ รวมถึงคำอ่านและฟุริงานะ',
    supportPinyin: 'รองรับเต็มรูปแบบ รวมถึงพินอิน ความหมายเป็นภาษาอังกฤษ',
    supportWords: 'รองรับเต็มรูปแบบ ความหมายเป็นภาษาอังกฤษ',
    script: 'ตัวอักษร',
    scriptHint: 'ใช้เมื่อวิดีโอมีทั้งสองแบบ',
    supportBasic: 'รองรับขั้นพื้นฐาน: ตัดคำได้ แต่ยังไม่มีพจนานุกรมหรือคำอ่าน',
    native: 'ภาษาของคุณ',
    nativeHint: 'คำแปลและความหมายจะแสดงเป็นภาษานี้ หากวิดีโอและพจนานุกรมมีภาษานี้',
    definitions: 'ภาษาของความหมาย',
    definitionsHint: 'พจนานุกรมไม่มีความหมายเป็นภาษาของคุณ จึงแสดงเป็นภาษานี้แทน',
    definitionsHintFor: (language: string): string =>
      `พจนานุกรมไม่มีความหมายเป็นภาษา${language} จึงแสดงเป็นภาษานี้แทน`,

    // การดูความหมาย
    lookupHeading: 'การดูความหมาย',
    lookupAbout: 'เลือกวิธีและเวลาที่จะแสดงความหมายของคำ',
    interaction: 'ดูความหมายเมื่อ',
    interactionHover: 'วางเมาส์',
    interactionShift: 'วางเมาส์ขณะกด Shift',
    interactionClick: 'คลิก',
    interactionHint: 'คลิกที่คำก็ใช้ได้เสมอ',
    hoverPause: 'หยุดชั่วคราวขณะดูความหมาย',
    hoverPauseHint: 'หยุดวิดีโอชั่วคราวขณะที่เมาส์อยู่บนคำ',
    sidebarHover: 'ความหมายย่อในข้อความถอดเสียง',
    sidebarHoverHint: 'แสดงความหมายสั้นๆ เมื่อชี้ที่คำในข้อความถอดเสียง',

    // ป๊อปอัปคำ
    popupHeading: 'ป๊อปอัปคำ',
    popupAbout: 'เลือกสิ่งที่ป๊อปอัปแสดงเมื่อดูความหมายของคำ',
    cardMarks: 'ปุ่มรู้แล้วและละเว้น',
    cardMarksHint: 'รู้แล้ว ซ่อนขีดเส้นใต้ของคำ ละเว้น ไม่นับคำนั้น ทั้งสองปุ่มไม่เพิ่มการ์ด',
    cardTrack: 'ปุ่มติดตาม',
    cardTrackHint: 'ขีดเส้นใต้สีม่วงให้คำที่อยากสังเกต ไม่เพิ่มการ์ด',
    cardDeckMenu: 'เมนูสำรับ',
    cardDeckMenuHint: 'เพิ่ม ▾ ข้างปุ่มเพิ่มลง Anki เพื่อเลือกสำรับอื่น การ์ดใหม่จะไปที่สำรับนั้น',
    cardAddLine: 'การ์ดประโยค',
    cardAddLineHint: 'เพิ่มปุ่มที่สร้างการ์ดจากทั้งประโยค พร้อมเสียงและภาพหน้าจอ',
    cardKanji: 'รายละเอียดคันจิ',
    cardKanjiHint: 'แสดงความหมายและคำอ่านของคันจิแต่ละตัว',
    cardHanzi: 'รายละเอียดอักษร',
    cardHanziHint: 'แสดงความหมายและคำอ่านของอักษรแต่ละตัว',
    lookupElsewhere: 'ตัวอย่างจากวิดีโอนี้',
    lookupElsewhereHint: 'แสดงประโยคอื่นในวิดีโอนี้ที่ใช้คำนี้ คลิกประโยคเพื่อเล่น',

    // คำบรรยาย
    subtitlesHeading: 'คำบรรยาย',
    subtitlesAbout: 'ปรับลักษณะของคำบรรยายบนวิดีโอ',
    ruby: 'ฟุริงานะ',
    rubyUnknown: 'คำใหม่',
    rubyAlways: 'ทั้งหมด',
    rubyNever: 'ปิด',
    rubyHint: 'คำอ่านเหนือคันจิ กด R เพื่อสลับขณะดู',
    pinyin: 'พินอิน',
    pinyinHint: 'คำอ่านเหนืออักษร กด R เพื่อสลับขณะดู',
    blurPrimary: 'เบลอคำบรรยาย',
    blurPrimaryHint: 'สำหรับฝึกฟัง: คำบรรยายจะเบลออยู่จนกว่าจะชี้เมาส์ไปที่คำบรรยาย กด H เพื่อสลับ',
    subtitleSize: 'ขนาดข้อความ',
    subtitleSizeOption: (percent: number): string => `${percent}%`,
    subtitleSizeHint: 'ปรับตามขนาดโปรแกรมเล่น จึงดูเหมือนเดิมในโหมดเต็มหน้าจอ',
    subtitleBottom: 'ตำแหน่ง',
    subtitleBottomLowest: 'ต่ำสุด',
    subtitleBottomLow: 'ต่ำ',
    subtitleBottomNormal: 'ปกติ',
    subtitleBottomRaised: 'สูงขึ้นเล็กน้อย',
    subtitleBottomHigh: 'สูง',
    subtitleBottomHighest: 'สูงสุด',
    subtitleBottomHint: 'ความสูงของคำบรรยาย คำบรรยายจากส่วนขยายอื่นในโปรแกรมเล่นเดียวกันจะอยู่ด้านล่าง',
    dualSubtitles: 'แสดงคำแปล',
    dualSubtitlesHint:
      'แสดงคำบรรยายภาษาของคุณใต้คำบรรยายภาษาที่เรียน คำบรรยายนี้มาจากเว็บไซต์ ไม่ใช่การแปลด้วยเครื่อง ' +
      'และต้องมีข้อความถอดเสียงทั้งหมดของวิดีโอ',

    // ขีดเส้นใต้
    underlinesHeading: 'ขีดเส้นใต้',
    underlinesAbout: 'แต่ละสีบอกว่าคุณรู้จักคำนั้นดีแค่ไหน คลิกที่สีเพื่อเปลี่ยน',
    colorUnknown: 'คำใหม่',
    colorUnknownHint: 'คำที่ยังไม่มีการ์ดใน Anki',
    colorLearning: 'กำลังเรียน',
    colorLearningHint: 'คำที่มีการ์ดแต่ยังไม่แก่กล้า',
    colorTracking: 'ติดตามอยู่',
    colorTrackingHint: 'คำที่คุณกำลังติดตาม',
    colorKnown: 'รู้แล้ว',
    colorKnownHint: 'คำที่มีการ์ดแก่กล้าแล้ว หรือทำเครื่องหมายว่ารู้แล้ว',
    underlines: 'ขีดเส้นใต้คำ',
    underlinesHint: 'ปิดเพื่อดูคำบรรยายธรรมดา ไม่มีสีใต้คำ',
    markKnown: 'ขีดเส้นใต้คำที่รู้แล้ว',
    markKnownHint: 'ปิดไว้เป็นค่าเริ่มต้น หน้าจอจะได้โล่งขึ้นเมื่อคุณเรียนไปเรื่อยๆ',
    defaultColours: 'สีเริ่มต้น',
    resetColours: 'รีเซ็ต',

    // ข้อความถอดเสียง
    transcriptHeading: 'ข้อความถอดเสียง',
    transcriptAbout: 'แผงข้างวิดีโอที่แสดงคำบรรยายทุกบรรทัด',
    sidebarFollow: 'เลื่อนตามวิดีโอ',
    sidebarFollowHint: 'ให้บรรทัดปัจจุบันอยู่ในมุมมองเสมอ ถ้าเลื่อนเองจะหยุดชั่วคราว และมีปุ่มให้กลับมาเลื่อนตาม',
    headerBar: 'แสดงส่วนหัว',
    headerBarHint: 'ปรากฏที่ด้านบนของวิดีโอเมื่อเมาส์อยู่ใกล้',
    languageBadge: 'ป้ายภาษา',
    languageBadgeFlag: 'ธง',
    languageBadgeCode: 'รหัส',
    badgeFlag: 'ธงบนป้าย',
    badgeFlagDefault: 'ค่าเริ่มต้น',
    badgeFlagHint: 'ธงที่แสดงสำหรับภาษาที่เรียน แต่ละภาษาเก็บธงของตัวเองไว้',
    languageBadgeHint: 'วิธีที่ส่วนหัวแสดงภาษาที่คุณเรียน',
    sidebarStats: 'นับคำใหม่',
    sidebarStatsHint: 'แสดงจำนวนคำใหม่ในแต่ละบรรทัด เปอร์เซ็นต์คำที่คุณรู้แล้ว และตัวกรองที่ใช้ตัวเลขเหล่านี้',

    // Anki
    ankiHeading: 'Anki',
    ankiAbout: 'เชื่อมต่อ Anki เลือกว่าการ์ดใหม่จะไปที่ไหน และสำรับใดใช้บอกคำที่คุณรู้',
    deck: 'สำรับสำหรับการ์ดใหม่',
    deckHint: 'สำรับที่การ์ดใหม่ทุกใบจะถูกเพิ่มเข้าไป',
    statusScope: 'อ่านคำที่รู้แล้วจาก',
    statusScopeHint: 'การ์ดในสำรับเหล่านี้กำหนดว่าคำใดจะมีขีดเส้นใต้ รวมสำรับย่อยด้วย',
    marksInAnki: 'เก็บเครื่องหมายไว้ใน Anki',
    marksInAnkiHint:
      'บันทึกรู้แล้ว ติดตาม และละเว้น เป็นโน้ตที่ซ่อนอยู่ใน Anki (Libregaku::Marks) เพื่อให้ซิงก์ไปยังอุปกรณ์อื่นของคุณ ' +
      'ถ้าปิด จะเก็บไว้ในเบราว์เซอร์นี้',

    // เมนูสำรับ
    wholeCollection: 'ทั้งคอลเลกชัน',
    chooseDeck: 'เลือกสำรับ…',
    deckNotInAnki: (deck: string): string => `${deck} — ไม่มีใน Anki`,
    deckAndSubdecks: (deck: string): string => `${deck} (รวมสำรับย่อย)`,
    deckUnset: 'เลือกสำรับ เพิ่มการ์ดไม่ได้จนกว่าจะเลือก',
    deckMissing: (deck: string): string => `Anki ไม่มีสำรับชื่อ “${deck}” แล้ว โปรดเลือกสำรับอื่น`,
    statusScopeMissing: (deck: string): string =>
      `Anki ไม่มีสำรับชื่อ “${deck}” แล้ว ทุกคำจึงแสดงเป็นคำใหม่ โปรดเลือกสำรับอื่น`,
    statusScopeOutside: (deck: string): string =>
      `การ์ดใหม่จะไปที่ “${deck}” ซึ่งไม่ได้รวมอยู่ในนี้ คำที่คุณเพิ่มจึงยังมีขีดเส้นใต้เป็นคำใหม่ ` +
      'เลือกสำรับที่มีสำรับนั้นอยู่ หรือเลือกทั้งคอลเลกชัน',

    // สถานะของ Anki
    ankiChecking: 'กำลังตรวจสอบ…',
    ankiConnected: 'เชื่อมต่อแล้ว',
    noteTypeInstalled: 'ติดตั้งประเภทโน้ตแล้ว',
    cardsMade: (n: number): string => `สร้างการ์ดด้วย Libregaku แล้ว ${n} ใบ`,
    noCards: 'ยังไม่มีการ์ด',
    cardsFlushed: (n: number): string => `เพิ่มการ์ดที่สร้างขณะ Anki ปิดอยู่ ${n} ใบแล้ว`,
    cardsNotFlushed: (n: number, error: string): string => `เพิ่มการ์ด ${n} ใบไม่ได้: ${error}`,
    cardsWaiting: (n: number): string => `การ์ด ${n} ใบรอเพิ่มอยู่`,
    ankiOffline: (port: number): string =>
      `Anki ไม่ตอบสนองที่พอร์ต ${port} ซึ่งเป็นเรื่องปกติขณะที่ Anki ปิดอยู่ ` +
      'การ์ดใหม่จะรออยู่ที่นี่และถูกเพิ่มเมื่อเปิด Anki',
    ankiBlocked: 'Anki เปิดอยู่ แต่ AnkiConnect ยังไม่อนุญาตส่วนขยายนี้',
    ankiOccupied: (detail: string): string => `${detail} ปิดโปรแกรมที่ใช้พอร์ตนั้นอยู่เพื่อให้ Anki ใช้ได้`,

    // ปุ่มของ Anki
    checkAgain: 'ตรวจสอบอีกครั้ง',
    newDeck: 'สำรับใหม่',
    openCards: 'เปิดการ์ดใน Anki',
    openMarks: 'เปิดเครื่องหมายใน Anki',
    newDeckPrompt: 'ตั้งชื่อสำรับใหม่ ใช้ :: สำหรับสำรับย่อย เช่น ญี่ปุ่น::Netflix',

    // การเชื่อมต่อ Anki. Anki's Thai names Tools (เครื่องมือ) but not the add-on menus, so those show in English.
    installStep: 'ติดตั้ง Anki ในคอมพิวเตอร์เครื่องนี้แล้วเปิดโปรแกรม {link}',
    getAnki: 'ดาวน์โหลด Anki',
    addonStep: 'ใน Anki ไปที่ {menu} วางโค้ดนี้ แล้วรีสตาร์ท Anki',
    addonMenu: 'เครื่องมือ → Add-ons → Get Add-ons…',
    aboutAnkiConnect: 'เกี่ยวกับ AnkiConnect',
    originStep: 'ใน Anki ไปที่ {menu} เพิ่มบรรทัดนี้ใน {setting} แล้วรีสตาร์ท Anki',
    originMenu: 'เครื่องมือ → Add-ons → AnkiConnect → Config',
    runningStep: 'เปิด Anki ไว้ขณะดูวิดีโอ การ์ดจะเข้า Anki ในคอมพิวเตอร์เครื่องนี้โดยตรง',
    copy: 'คัดลอก',
    copyValue: (value: string): string => `คัดลอก ${value}`,
    copied: 'คัดลอกแล้ว',
    copyFailed: 'เลือกเอง',

    // การ์ด Anki
    ankiCardsHeading: 'การ์ด Anki',
    ankiCardsAbout: 'เลือกสิ่งที่จะเพิ่มลงในการ์ดใหม่แต่ละใบ นอกเหนือจากคำ คำอ่าน ความหมาย และประโยค',
    cardAudio: 'เสียงอ่านคำ',
    cardAudioHint: 'เสียงบันทึกของคำ หากมี ไม่ใช้เสียงสังเคราะห์',
    cardSentenceAudio: 'เสียงประโยค',
    cardSentenceAudioHint: 'บันทึกเสียงประโยคโดยเล่นซ้ำอีกครั้ง บน Netflix ต้องได้รับอนุญาตด้านล่างก่อน',
    cardScreenshot: 'ภาพหน้าจอ',
    cardScreenshotHint: 'ภาพนิ่งของฉากนั้น ใช้กับ Netflix ไม่ได้เพราะ Netflix บล็อกไว้',
    capture: 'เสียงประโยคบน Netflix',
    captureAllow: 'อนุญาต',
    captureAllowInSettings: 'อนุญาตในการตั้งค่า',
    captureRemove: 'นำออก',
    captureAllowed: 'อนุญาตแล้ว ในแต่ละแท็บ Netflix ให้คลิกไอคอน Libregaku แล้วเลือก “บันทึกเสียงประโยคที่นี่”',
    captureNeeded: 'Netflix ป้องกันวิดีโอไว้ จึงต้องบันทึกเสียงประโยคจากแท็บ ซึ่งต้องได้รับอนุญาตจากคุณ',

    // ข้อมูลและสัญญาอนุญาต
    creditsHeading: 'ข้อมูลและสัญญาอนุญาต',
    creditJmdict:
      'ข้อมูลพจนานุกรมและคันจิ © Electronic Dictionary Research and Development Group ใช้ภายใต้ CC BY-SA 4.0 ' +
      'แปลงเป็น JSON โดย jmdict-simplified',
    creditLindera: 'ตัดคำภาษาญี่ปุ่น เกาหลี และจีน สัญญาอนุญาต MIT ส่วน IPADIC, mecab-ko-dic และ CC-CEDICT มีเงื่อนไขของตัวเอง',
    creditCedict: 'พจนานุกรมภาษาจีน © MDBG และผู้ร่วมพัฒนา ใช้ภายใต้ CC BY-SA 4.0',
    creditWiktionary: 'พจนานุกรมภาษาเกาหลีและสเปน จาก Wiktionary ผ่าน kaikki.org และ wiktionary-to-yomitan CC BY-SA 4.0',
    creditUnihan: 'คำอ่านที่แสดงก่อนของอักษรจีนแต่ละตัว © Unicode, Inc. ใช้ภายใต้ Unicode License',
    creditJotoba: 'ใช้ดูความหมายระหว่างที่พจนานุกรมกำลังดาวน์โหลด ทั้งสองใช้ JMdict',
    creditLucide: 'ไอคอน สัญญาอนุญาต ISC',
    creditCommons: 'เสียงบันทึกคำภาษาสเปน จีน และเกาหลี อ่านโดยอาสาสมัคร แต่ละเสียงมีสัญญาอนุญาตของตัวเอง ส่วนใหญ่เป็น CC BY-SA 4.0 ซึ่งแสดงพร้อมชื่อผู้อ่านขณะเล่นและบนการ์ด',
    creditAudioCmn: 'เสียงบันทึกคำภาษาจีนโดย Yue Tan มหาวิทยาลัยก็อง CC BY-SA 3.0 US',
    licence: 'Libregaku ใช้สัญญาอนุญาต MIT ข้อมูลพจนานุกรมดาวน์โหลดจากแหล่งที่มา ไม่ได้รวมมาด้วย',
    built: (when: string): string => `สำเนานี้สร้างเมื่อ ${when}`,

    // แป้นพิมพ์ลัด
    keyLine: 'บรรทัดก่อนหน้าหรือถัดไป',
    keyReplay: 'เล่นบรรทัดซ้ำ',
    keyTranslation: 'แสดงหรือซ่อนคำแปล',
    keyShiftLookup: 'กดค้างไว้เพื่อดูความหมายของคำใต้เมาส์',
    keyAdd: 'เพิ่มคำในป๊อปอัปลง Anki',
    keyKnown: 'ทำเครื่องหมายว่ารู้แล้วให้คำในป๊อปอัป',
    keyFurigana: 'สลับฟุริงานะ: ปิด, คำใหม่, ทั้งหมด',
    keyPinyin: 'สลับพินอิน: ปิด, คำใหม่, ทั้งหมด',
    keyBlur: 'เบลอหรือเลิกเบลอคำบรรยาย',
    keySave: 'บันทึกบรรทัดปัจจุบัน',
    keyTranscript: 'แสดงหรือซ่อนแผงข้อความถอดเสียง',
    keyClose: 'ปิดป๊อปอัป',
  },

  options: {
    pageTitle: 'การตั้งค่า Libregaku',
    help: 'ความช่วยเหลือ',
    searchSettings: 'ค้นหา…',
    noSettingsFound: 'ไม่มีหัวข้อใดกล่าวถึง “{q}”',
    contentsLabel: 'หมวดการตั้งค่า',
    settingsLabel: 'การตั้งค่า',
    setupHeading: 'เริ่มต้นใช้งาน',
    setupAbout: 'เลือกแค่ 2 อย่าง ส่วนที่เหลือตั้งค่าเริ่มต้นไว้ให้เหมาะสมแล้ว',
    stepLanguages: 'เลือกภาษาที่จะเรียน',
    stepAnki: 'เชื่อมต่อ Anki และเลือกสำรับสำหรับการ์ดใหม่',
    ankiOptional:
      'จะใช้ Anki หรือไม่ก็ได้ คำบรรยาย การดูความหมาย และฟุริงานะใช้ได้โดยไม่ต้องมี Anki ' +
      'แต่ Anki คือสิ่งที่จำว่าคุณรู้คำไหนแล้วบ้าง',
    nextSteps:
      'จากนั้นเปิดวิดีโอที่มีคำบรรยายในภาษาที่คุณเรียน แล้ววางเมาส์บนคำ ' +
      'ปุ่มแป้นพิมพ์ในแผงข้อความถอดเสียงจะแสดงแป้นพิมพ์ลัดทั้งหมด',
    confirmLanguages: 'ภาษาเหล่านี้ถูกต้อง',
    keepDeck: (deck: string): string => `ใช้ ${deck} สำหรับการ์ดใหม่`,
  },

  action: {
    help: 'ความช่วยเหลือ',
    settings: 'การตั้งค่า',
    settingsTip: 'การตั้งค่าทั้งหมด',
    checkingPage: 'กำลังตรวจสอบหน้านี้…',
    notActive:
      'ไม่ได้ทำงานในหน้านี้ เปิดวิดีโอ YouTube, Netflix, Disney+, Prime Video หรือ Max ' +
      'หากเพิ่งติดตั้งหรือโหลด Libregaku ใหม่ ให้โหลดแท็บซ้ำ',
    unsupported: 'Libregaku ใช้ได้บน YouTube, Netflix, Disney+, Prime Video และ Max',
    waitingForSubtitles: (site: string): string => `กำลังรอคำบรรยายบน ${site} ตรวจสอบว่าเปิดคำบรรยายอยู่`,
    activeOn: (title: string): string => `ทำงานอยู่ — ${title}`,
    active: 'ทำงานอยู่ในวิดีโอนี้',
    subtitlesTrack: 'คำบรรยาย',
    translationTrack: 'คำแปล',
    noTranslation: 'ไม่มี',
    generatedTrack: (track: string): string => `${track} (อัตโนมัติ)`,
    captureNeedsPermission: 'การบันทึกเสียงประโยคที่นี่ต้องได้รับอนุญาตให้บันทึกเสียงของแท็บนี้',
    captureAllowInSettings: 'อนุญาตในการตั้งค่า',
    captureReady: 'เสียงของ Netflix บันทึกได้หลังจากที่คุณเปิดใช้สำหรับแท็บนี้เท่านั้น',
    captureStart: 'บันทึกเสียงประโยคที่นี่',
    captureFailed: 'Chrome บันทึกแท็บนี้ไม่ได้',
    toggleSidebar: 'เปิด/ปิดแถบด้านข้าง',
    ankiChecking: 'Anki: กำลังตรวจสอบ…',
    ankiConnected: (n: number): string => `เชื่อมต่อ Anki แล้ว · การ์ดจาก Libregaku ${n} ใบ`,
    ankiOffline: 'Anki ไม่ได้เปิดอยู่ — คำจะแสดงเป็นคำใหม่',
    ankiOccupied: (port: number): string => `มีโปรแกรมอื่นใช้พอร์ต ${port} อยู่ จึงเชื่อมต่อ Anki ไม่ได้`,
    ankiBlocked: 'Anki ปฏิเสธส่วนขยายนี้ — บรรทัดที่ต้องเพิ่มอยู่ในการตั้งค่า',
    ankiBusy: 'Anki ไม่ตอบสนอง — อาจกำลังซิงก์อยู่',
    ankiRefused: 'Anki ปฏิเสธคำขอ',
    cardsToAdd: (n: number): string => `การ์ดรอเพิ่ม ${n} ใบ`,
    cardsWaiting: (n: number): string => `การ์ด ${n} ใบรอ Anki`,
  },

  sidebar: {
    // แท็บและปุ่มข้างๆ
    tabsLabel: 'รายการ',
    transcriptTab: 'ข้อความถอดเสียง',
    savedTab: 'ที่บันทึกไว้',
    wordsTab: 'คำศัพท์',
    settings: 'การตั้งค่า',
    shortcuts: 'แป้นพิมพ์ลัด',
    close: 'ปิด',
    closeLabel: 'ยุบแผง',
    openTip: 'ข้อความถอดเสียง',
    openLabel: 'แสดงข้อความถอดเสียง',
    help: 'ความช่วยเหลือ',

    // การค้นหาในข้อความถอดเสียง
    searchPlaceholder: 'ค้นหาในข้อความถอดเสียง…',
    searchLabel: 'ค้นหาในข้อความถอดเสียง',
    noMatches: 'ไม่พบ',
    matchAt: (at: number, total: number): string => `${at} จาก ${total}`,
    matchesFound: (n: number): string => `พบ ${n} รายการ`,

    // ตัวกรอง
    filterTip: 'กรอง',
    filterLabel: 'กรองบรรทัด',
    filterAll: 'ทุกบรรทัด',
    filterAllAbout: 'แสดงทุกบรรทัด',
    filterNew: 'มีคำใหม่',
    filterNewAbout: 'บรรทัดที่มีคำที่คุณยังไม่มีการ์ด',
    filterReady: 'พร้อมเรียน',
    filterReadyAbout: 'บรรทัดที่มีคำใหม่สำหรับคุณเพียงคำเดียว — เรียนได้ง่ายที่สุด',
    filterSaved: 'ที่บันทึกไว้',
    filterSavedAbout: 'บรรทัดที่เก็บไว้ดูทีหลัง',

    // ข้อความถอดเสียง
    partial: 'กำลังสร้างระหว่างที่ดู — โปรแกรมเล่นนี้ให้อ่านได้เฉพาะบรรทัดปัจจุบัน',
    partialEmpty: 'ยังไม่มีอะไร บรรทัดจะปรากฏที่นี่เมื่อมีการพูด',
    empty: 'ยังไม่ได้โหลดข้อความถอดเสียง',
    currentLine: 'บรรทัดปัจจุบัน',
    lineNew: (n: number): string => `ใหม่ ${n}`,
    saveLine: 'บันทึกบรรทัด',
    unsave: 'เลิกบันทึก',
    addSentence: 'เพิ่มประโยค',
    addSentenceLabel: 'เพิ่มประโยคลง Anki',

    // สรุปเหนือข้อความถอดเสียง
    knownPercent: (n: number): string => `${n}%`,
    summaryKnown: 'รู้แล้ว {n}',
    summaryNew: 'คำใหม่ {n}',
    summaryReady: 'พร้อมเรียน {n}',
    counting: (percent: number): string => `กำลังนับคำใหม่… ${percent}%`,
    countFailed: 'นับบางบรรทัดไม่ได้ จึงไม่มียอดรวม',

    // ความหมายย่อ
    dictionaryLoading: (percent: number): string => `กำลังโหลดพจนานุกรม — ${percent}%`,
    dictionaryUnavailable: 'พจนานุกรมใช้งานไม่ได้',
    noEntry: 'ไม่พบในพจนานุกรม',

    // ที่บันทึกไว้
    savedEmpty:
      'ยังไม่มีอะไรที่บันทึกไว้ ใช้ที่คั่นหน้าในบรรทัดใดก็ได้ของข้อความถอดเสียง หรือกด B ' +
      'เพื่อเก็บประโยคที่อยากกลับมาดูอีก',
    thisVideo: 'วิดีโอนี้',
    remove: 'นำออก',
    removeLabel: 'นำออกจากที่บันทึกไว้',
    copySavedAbout: 'คัดลอกบรรทัดที่บันทึกไว้ทั้งหมดเป็นข้อความที่คั่นด้วยแท็บ',
    exportSavedAbout: 'บันทึกไฟล์ที่คั่นด้วยแท็บซึ่ง Anki นำเข้าได้',
    addSavedAbout: 'สร้างการ์ดจากแต่ละบรรทัดที่บันทึกไว้',
    linesCopied: (n: number): string => `คัดลอก ${n} บรรทัดแล้ว`,
    chooseDeck: 'เลือกสำรับในการตั้งค่าก่อน การ์ดใหม่จะไปที่สำรับนั้น',
    checkingAnki: 'กำลังตรวจสอบ Anki…',
    ankiOffline: 'Anki ไม่ได้เปิดอยู่ เปิด Anki แล้วลองอีกครั้ง ดูขั้นตอนได้ในการตั้งค่า',
    ankiBlocked: 'AnkiConnect ยังไม่อนุญาตส่วนขยายนี้ บรรทัดที่ต้องเพิ่มอยู่ในการตั้งค่า',
    ankiUnreachable: 'เชื่อมต่อ Anki ไม่ได้ ดูสาเหตุได้ในการตั้งค่า',
    adding: (at: number, total: number): string => `กำลังเพิ่ม ${at} จาก ${total}…`,
    savedAdded: (added: number, deck: string, already: number): string =>
      `เพิ่มลง ${deck} แล้ว ${added} ใบ${already ? ` มีอยู่แล้ว ${already} ใบ` : ''}`,

    // ปุ่มและข้อความของแท็บที่บันทึกไว้และคำศัพท์
    copy: 'คัดลอก',
    exportFile: 'ส่งออกไฟล์',
    addToAnki: 'เพิ่มลง Anki',
    noClipboard: 'เข้าถึงคลิปบอร์ดไม่ได้',
    downloaded: 'บันทึกไว้ในโฟลเดอร์ดาวน์โหลดแล้ว ใน Anki: แฟ้ม → นำเข้า',
    downloadBlocked: 'หน้านี้บล็อกการดาวน์โหลด — ใช้ “คัดลอก” แทน',

    // แท็บคำศัพท์
    listsLabel: 'คำประเภทไหน',
    listTracked: 'ติดตามอยู่',
    listKnown: 'รู้แล้ว',
    listIgnored: 'ละเว้น',
    findPlaceholder: 'หาคำ',
    findLabel: 'หาคำในรายการนี้',
    copyWordsAbout: 'คัดลอกรายการนี้เป็นข้อความที่คั่นด้วยแท็บ',
    exportWordsAbout: 'บันทึกรายการนี้เป็นไฟล์ที่คั่นด้วยแท็บซึ่ง Anki นำเข้าได้',
    wordsCopied: (n: number): string => `คัดลอก ${n} คำแล้ว`,
    nothingToExport: 'ไม่มีคำในรายการนี้ให้ส่งออก',
    lookingUp: 'กำลังค้นหาคำอ่านและความหมาย…',
    noWordMatches: (query: string): string => `ไม่มีคำในรายการนี้ที่ตรงกับ “${query}”`,
    wordsMatching: (shown: number, total: number): string => `${shown} จาก ${total} คำ`,
    trackedEmpty:
      'ยังไม่ได้ติดตามคำใด “ติดตาม” จะขีดเส้นใต้คำเพื่อให้คุณสังเกตเห็น โดยไม่สร้างการ์ด ' +
      'เปิดปุ่มนี้ได้ในการตั้งค่า ใต้หัวข้อป๊อปอัปคำ',
    trackedIntro: (n: number): string => `คำที่คุณติดตาม ${n} คำ ขีดเส้นใต้ไว้ทุกที่ที่ปรากฏ`,
    stopTracking: 'เลิกติดตาม',
    knownEmpty:
      'ยังไม่มีคำที่ทำเครื่องหมายว่ารู้แล้ว เมื่อรู้คำใดแล้วและไม่ต้องการการ์ด ' +
      'ให้ทำเครื่องหมายว่ารู้แล้วจากป๊อปอัปของคำนั้น หรือกด K',
    knownIntro: (n: number): string =>
      `ทำเครื่องหมายว่ารู้แล้ว ${n} คำ หากยกเลิกเครื่องหมาย คำนั้นจะกลับไปเป็นไปตามการ์ดใน Anki ของคุณ`,
    unmarkKnown: 'ยกเลิกรู้แล้ว',
    ignoredEmpty: 'ไม่มีคำที่ละเว้น ละเว้นชื่อและเสียงต่างๆ ได้จากป๊อปอัปของคำนั้น แล้วคำนั้นจะไม่มีขีดเส้นใต้และไม่ถูกนับอีก',
    ignoredIntro: (n: number): string => `${n} คำที่ไม่มีขีดเส้นใต้และไม่ถูกนับ`,
    stopIgnoring: 'เลิกละเว้น',
  },

  popup: {
    // ป๊อปอัป และคำที่อยู่ด้านบน
    cardLabel: (word: string): string => `${word} — พจนานุกรม`,
    commonBadge: 'ใช้บ่อย',
    characterNames: { kanji: 'คันจิ', hanzi: 'อักษร' },
    partOfSpeech: {
      n: 'คำนาม', 'n-adv': 'คำนามใช้เป็นคำวิเศษณ์', 'n-t': 'คำนามบอกเวลา', 'n-suf': 'คำเติมท้ายคำนาม',
      'n-pref': 'คำเติมหน้าคำนาม', pn: 'คำสรรพนาม', 'adj-i': 'คำคุณศัพท์ い', 'adj-na': 'คำคุณศัพท์ な',
      'adj-no': 'คำคุณศัพท์ の', 'adj-pn': 'คำขยายนาม', adv: 'คำวิเศษณ์', 'adv-to': 'คำวิเศษณ์',
      aux: 'คำเสริม', 'aux-v': 'กริยาช่วย', 'aux-adj': 'คุณศัพท์ช่วย',
      conj: 'คำสันธาน', cop: 'กริยาเชื่อม', ctr: 'ลักษณนาม', exp: 'สำนวน', int: 'คำอุทาน',
      num: 'ตัวเลข', prt: 'คำช่วย', pref: 'คำเติมหน้า', suf: 'คำเติมท้าย', unc: 'ไม่ระบุประเภท',
      vs: 'กริยา する', 'vs-i': 'กริยา する', 'vs-s': 'กริยา する', vt: 'สกรรมกริยา', vi: 'อกรรมกริยา',
      v1: 'กริยากลุ่ม 2', 'v1-s': 'กริยากลุ่ม 2', vk: 'กริยา くる', vz: 'กริยา ずる',
      v5b: 'กริยากลุ่ม 1', v5g: 'กริยากลุ่ม 1', v5k: 'กริยากลุ่ม 1', 'v5k-s': 'กริยากลุ่ม 1',
      v5m: 'กริยากลุ่ม 1', v5n: 'กริยากลุ่ม 1', v5r: 'กริยากลุ่ม 1', 'v5r-i': 'กริยากลุ่ม 1',
      v5s: 'กริยากลุ่ม 1', v5t: 'กริยากลุ่ม 1', v5u: 'กริยากลุ่ม 1', 'v5u-s': 'กริยากลุ่ม 1',
      v5aru: 'กริยากลุ่ม 1',
      // รหัสของ Wiktionary สำหรับคำภาษาเกาหลีและสเปน
      name: 'คำนามเฉพาะ', v: 'คำกริยา', adj: 'คำคุณศัพท์', pron: 'คำสรรพนาม', det: 'คำบ่งชี้', artic: 'คำนำหน้านาม',
      counter: 'ลักษณนาม', prep: 'คำบุพบท', 'prep-phrase': 'วลีบุพบท', ptcl: 'คำช่วย',
      intj: 'คำอุทาน', phrase: 'วลี', prov: 'สุภาษิต', r: 'รากศัพท์', char: 'ตัวอักษร', adn: 'คำขยายนาม',
      ptcpl: 'กริยาคุณศัพท์', contr: 'รูปย่อ',
      masc: 'เพศชาย', fem: 'เพศหญิง', neut: 'เพศกลาง', sg: 'เอกพจน์', pl: 'พหูพจน์', 'pl-only': 'ใช้รูปพหูพจน์เท่านั้น',
      count: 'นับได้', uncount: 'นับไม่ได้', vr: 'กริยาสะท้อน', vdt: 'กริยาสองกรรม', impers: 'ไม่ระบุผู้กระทำ',
      irreg: 'ผันไม่ปกติ', reltnl: 'แสดงความสัมพันธ์', reltv: 'เชื่อมความ', interr: 'แสดงคำถาม', poss: 'แสดงความเป็นเจ้าของ',
      dim: 'รูปแสดงความเล็ก', aug: 'รูปแสดงความใหญ่', onoma: 'คำเลียนเสียง',
      idio: 'ใช้เป็นสำนวน', fig: 'โดยนัย', literal: 'ตามตัวอักษร', col: 'ภาษาพูด', inf: 'ไม่เป็นทางการ', fam: 'ภาษากันเอง',
      formal: 'เป็นทางการ', polite: 'สุภาพ', lit: 'ภาษาวรรณกรรม', poet: 'ภาษากวี', rhet: 'เชิงวาทศิลป์', sl: 'ภาษาสแลง',
      vulg: 'หยาบคาย', derog: 'ดูหมิ่น', offens: 'สร้างความขุ่นเคือง', humor: 'ขำขัน', euph: 'คำรื่นหู',
      child: 'ภาษาเด็ก', net: 'อินเทอร์เน็ต', neol: 'คำเกิดใหม่', cmn: 'ใช้บ่อย', uncmmn: 'ใช้ไม่บ่อย', rare: 'พบน้อย',
      dated: 'ล้าสมัย', arch: 'โบราณ', obs: 'เลิกใช้แล้ว', hist: 'เชิงประวัติศาสตร์', 'non-std': 'ไม่เป็นมาตรฐาน',
      dialect: 'ภาษาถิ่น', regio: 'เฉพาะภูมิภาค',
    },

    // ปุ่มใต้คำ
    pronounce: 'ออกเสียง',
    playedRecording: (word: string): string => `${word} · เสียงบันทึก`,
    playedSynthesised: (word: string): string => `${word} · เสียงสังเคราะห์`,
    recordingBy: (speaker: string, licence: string): string => `เสียงบันทึกโดย ${speaker} · ${licence}`,
    pronounceFailed: 'เล่นเสียงไม่ได้',
    addSentence: 'เพิ่มประโยค',
    sentenceAdded: 'เพิ่มประโยคแล้ว',
    undo: 'เลิกทำ',
    copyWord: 'คัดลอกคำ',
    copyPhrase: 'คัดลอกวลี',
    copySentence: 'คัดลอกประโยค',
    wordCopied: 'คัดลอกคำแล้ว',
    phraseCopied: 'คัดลอกวลีแล้ว',
    sentenceCopied: 'คัดลอกประโยคแล้ว',
    copyFailed: 'คัดลอกไม่ได้ — เลือกข้อความแทน',

    // ความหมาย
    dictionaryLoading: (percent: number): string => `พจนานุกรมยังโหลดอยู่ — ${percent}% ลองอีกครั้งในอีกสักครู่`,
    dictionaryUnavailable: (error: string): string => `พจนานุกรมใช้งานไม่ได้: ${error}`,
    noEntry: 'ไม่มีคำนี้ในพจนานุกรม',
    moreMeanings: (n: number): string => `+${n} ความหมาย`,

    // บรรทัดอื่นในวิดีโอนี้ที่มีคำนี้
    elsewhereCount: (n: number): string => `อีก ${n} ครั้งในวิดีโอนี้`,
    playLine: 'เล่น',
    elsewhereMore: (n: number): string => `และอีก ${n} บรรทัด — ค้นหาในข้อความถอดเสียงเพื่อดูทั้งหมด`,
    showAllInTranscript: 'แสดงทั้งหมดในข้อความถอดเสียง',

    // เพิ่มลง Anki
    addToAnki: 'เพิ่มลง Anki',
    addToDeck: (deck: string): string => `เพิ่มลง ${deck}`,
    adding: 'กำลังเพิ่ม…',
    undoing: 'กำลังเลิกทำ…',
    added: 'เพิ่มแล้ว',
    inAnki: 'อยู่ใน Anki',
    showInAnki: 'แสดงใน Anki',
    waiting: 'รออยู่',
    waitingForAnki: 'รอ Anki',
    goesInWhenAnkiOpens: 'จะเข้า Anki เมื่อเปิด Anki',
    alreadyAdded: 'เพิ่มไปแล้ว',
    alreadyInAnki: 'มีใน Anki แล้ว',
    waitingForAnkiToOpen: 'รอให้เปิด Anki',
    addedWithWarning: (said: string, warning: string): string => `${said} — ${warning}`,

    // เมนูสำรับ
    otherDecks: 'สำรับอื่น',
    addToAnotherDeck: 'เพิ่มลงสำรับอื่น',
    decksUnknown: 'Anki ไม่ตอบสนอง จึงยังไม่ทราบรายชื่อสำรับ',
    newDeck: 'สำรับใหม่…',
    newDeckPrompt: 'สำรับใหม่ — ใช้ :: สำหรับสำรับย่อย เช่น ญี่ปุ่น::Netflix',

    // เครื่องหมาย
    knownButton: 'รู้แล้ว',
    trackButton: 'ติดตาม',
    ignoreButton: 'ละเว้น',
    markKnownTip: 'ทำเครื่องหมายว่ารู้แล้ว',
    trackTip: 'ติดตาม',
    ignoreTip: 'ละเว้น',
    unmarkKnownTip: 'ยกเลิกรู้แล้ว',
    stopTrackingTip: 'เลิกติดตาม',
    stopIgnoringTip: 'เลิกละเว้น',
  },

  header: {
    knownStat: 'รู้แล้ว {percent}',
    knownPercent: (percent: number): string => `${percent}%`,
    knownTip: 'คำที่คุณรู้',
    readyStat: 'พร้อมเรียน {count}',
    readyTip: 'บรรทัดที่มีคำใหม่ 1 คำ',
    blurSubtitle: 'เบลอคำบรรยาย',
    unblurSubtitle: 'เลิกเบลอคำบรรยาย',
    showTranslation: 'แสดงคำแปล',
    hideTranslation: 'ซ่อนคำแปล',
    transcript: 'ข้อความถอดเสียง',
    pinHeader: 'ปักหมุดส่วนหัว',
    unpinHeader: 'เลิกปักหมุดส่วนหัว',
    settings: 'การตั้งค่า',
    showHeader: 'แสดงส่วนหัว',
    showHeaderLabel: 'แสดงส่วนหัว',
  },

  player: {
    // ปุ่มลัดของโปรแกรมเล่น
    lastLine: 'นั่นคือบรรทัดสุดท้าย',
    noLineBefore: 'ไม่มีบรรทัดก่อนหน้า',
    translationOn: 'เปิดคำแปล',
    translationOff: 'ปิดคำแปล',
    blurOn: 'เบลอคำบรรยายไว้จนกว่าจะชี้เมาส์',
    blurOff: 'แสดงคำบรรยาย',
    lineSaved: 'บันทึกบรรทัดแล้ว',
    lineUnsaved: 'เลิกบันทึกบรรทัดแล้ว',
    lookUpFirst: 'ดูความหมายของคำก่อน',
    alreadyKnown: (word: string): string => `${word} · รู้แล้วใน Anki`,
    alreadyInAnki: (word: string): string => `${word} · มีใน Anki แล้ว`,
    adding: (word: string): string => `กำลังเพิ่ม ${word}…`,
    wordResult: (word: string, said: string): string => `${word} · ${said}`,

    // เครื่องหมาย
    markOff: (word: string): string => `${word} · ยกเลิกเครื่องหมายแล้ว`,
    marked: (word: string, status: OverrideStatus, refused: boolean): string => {
      const done = {
        known: 'ทำเครื่องหมายว่ารู้แล้ว', tracking: 'ติดตามแล้ว', ignored: 'ละเว้นแล้ว', unknown: 'ทำเครื่องหมายว่าใหม่',
      }[status];
      if (refused) return `${word} · ${done} ไม่ได้สร้างการ์ด — Anki ปฏิเสธ จะลองใหม่ภายหลัง`;
      return `${word} · ${done} ไม่ได้สร้างการ์ด${status === 'tracking' ? ' ดูได้ที่แท็บคำศัพท์ในแผง' : ''}`;
    },

    // การ์ดของคำ
    pickDeck: 'เลือกสำรับในการตั้งค่า Libregaku ก่อน',
    added: (deck: string, missing: readonly MissingMedia[]): string =>
      missing.length ? `เพิ่มลง ${deck} แล้ว — ไม่มี${without(missing)}` : `เพิ่มลง ${deck} แล้ว`,
    alreadyIn: (deck: string): string => `มีอยู่ใน ${deck} แล้ว`,
    queued: (deck: string): string => `Anki ปิดอยู่ — จะเพิ่มลง ${deck} เมื่อเปิด`,
    alreadyQueued: 'รอ Anki อยู่แล้ว',
    notKept: 'Anki ปิดอยู่ และเบราว์เซอร์เก็บการ์ดไว้ใช้ภายหลังไม่ได้',
    takenBack: (deck: string): string => `นำออกจาก ${deck} แล้ว`,
    unqueued: 'ไม่ได้รอ Anki แล้ว',
    alreadySent: 'เข้า Anki ไปแล้ว',
    queueSent: (count: number): string =>
      `Anki เปิดแล้ว — ${count === 1 ? 'เพิ่มการ์ดที่เก็บไว้แล้ว' : `เพิ่มการ์ดที่เก็บไว้ ${count} ใบแล้ว`}`,
    deckOutsideScope: (scope: string, deck: string): string =>
      `คำที่รู้แล้วอ่านจาก ${scope} การ์ดใน ${deck} จึงไม่ถูกนับ`,

    // การ์ดประโยค
    sentenceAdded: (deck: string, missing: readonly MissingMedia[]): string =>
      missing.length ? `เพิ่มประโยคลง ${deck} แล้ว — ไม่มี${without(missing)}` : `เพิ่มประโยคลง ${deck} แล้ว`,
    sentenceAlreadyIn: (deck: string): string => `ประโยคนี้มีอยู่ใน ${deck} แล้ว`,
    sentenceQueued: (deck: string, sound: boolean, picture: boolean): string => {
      const lacking = [sound && 'เสียง', picture && 'ภาพ'].filter(Boolean);
      return `Anki ปิดอยู่ — ประโยคจะเพิ่มลง ${deck} เมื่อเปิด` +
        `${lacking.length ? ` โดยไม่มี${lacking.join('หรือ')}` : ''}`;
    },
    sentenceAlreadyQueued: 'ประโยคนี้รอ Anki อยู่แล้ว',
    sentenceTakenBack: (deck: string): string => `นำประโยคออกจาก ${deck} แล้ว`,

    // เสียงประโยค
    recording: 'กำลังบันทึกเสียงบรรทัด…',

    // การดูความหมาย
    noDictionary: 'ยังไม่มีพจนานุกรมสำหรับภาษานี้',
  },

  notices: {
    // การ์ดแจ้งเตือน
    unexpected: 'Libregaku พบปัญหาที่ไม่คาดคิด',
    dismiss: 'ปิด',

    // YouTube หรือ Netflix เปลี่ยนบางอย่าง
    youtubeTrackList: 'อ่านรายการคำบรรยายของ YouTube ไม่ได้',
    youtubeTrackShape: 'ข้อมูลคำบรรยายของ YouTube ไม่ได้อยู่ในรูปแบบที่คาดไว้',
    youtubeCaptionText: 'ไม่พบข้อความคำบรรยายของ YouTube ในหน้านี้',
    youtubePlayerTrackList: 'อ่านรายการคำบรรยายของวิดีโอนี้จากโปรแกรมเล่นของ YouTube ไม่ได้',
    netflixTrackList: 'อ่านรายการคำบรรยายของ Netflix ไม่ได้',
    netflixCaptionText: 'ไม่พบข้อความคำบรรยายของ Netflix ในหน้านี้',
    disneyTrackList: 'อ่านรายการคำบรรยายของ Disney+ ไม่ได้',
    disneyCaptionText: 'ไม่พบข้อความคำบรรยายของ Disney+ ในหน้านี้',
    primeTrackList: 'อ่านรายการคำบรรยายของ Prime Video ไม่ได้',
    primeCaptionText: 'ไม่พบข้อความคำบรรยายของ Prime Video ในหน้านี้',
    maxTrackList: 'อ่านรายการคำบรรยายของ Max ไม่ได้',
    maxCaptionText: 'ไม่พบข้อความคำบรรยายของ Max ในหน้านี้',
    netflixBlocked: 'Netflix บล็อกส่วนของ Libregaku ที่อ่านคำบรรยาย',

    // คำบรรยายของวิดีโอนี้
    subtitlesOff: 'เปิดคำบรรยายในโปรแกรมเล่น แล้ว Libregaku จะอ่านคำบรรยายนั้น',
    trackNotSent: 'โปรแกรมเล่นยังไม่ได้โหลดคำบรรยายนี้',
    noTargetTrack: 'ไม่มีคำบรรยายในภาษาที่คุณเรียน',
    noSecondTrack: 'ไม่มีคำบรรยายในภาษาของคุณ จึงไม่มีบรรทัดที่สอง',
    onlyOneTrack: 'วิดีโอนี้มีคำบรรยายแทร็กเดียว จึงไม่มีบรรทัดที่สอง',
    autoGenerated: 'คำบรรยายนี้สร้างขึ้นโดยอัตโนมัติ ถ้อยคำและการตัดคำจึงอาจไม่แม่นยำ',
    noSubtitles: 'วิดีโอนี้ไม่มีคำบรรยาย',
    secondTrackFailed: 'โหลดบรรทัดที่สองไม่ได้',

    // ส่วนต่างๆ ของส่วนขยาย
    analyserUnavailable:
      'ปิดคำอ่านและรูปพจนานุกรมอยู่ เพราะตัววิเคราะห์ภาษาโหลดไม่สำเร็จ คำจะจับคู่กับการ์ดของคุณได้เฉพาะเมื่อสะกดตรงกันทุกตัว',
    markNotSaved: 'บันทึกเครื่องหมายนั้นไม่ได้ เครื่องหมายจะมีผลจนกว่าจะโหลดหน้าซ้ำ แล้วจะหายไป',
    marksNotSynced: 'บันทึกเครื่องหมายของคุณลง Anki ไม่ได้ เครื่องหมายยังเก็บไว้ในเบราว์เซอร์นี้และจะลองอีกครั้ง',
    cardsNotAdded: 'Anki ไม่รับการ์ดบางใบที่เก็บไว้ขณะ Anki ปิดอยู่ การ์ดเหล่านั้นยังเก็บไว้และจะลองอีกครั้ง',

    // รายละเอียด
    playerNeverLoaded: 'โปรแกรมเล่นโหลดไม่เสร็จ',
    subtitlesMaybeOff: 'อาจแค่ปิดคำบรรยายไว้ในโปรแกรมเล่น',
    lookedFor: (selector: string): string => `ค้นหา ${selector} แล้ว`,
    noTargetTrackDetail: (languages: readonly string[]): string =>
      `วิดีโอนี้มี: ${languages.join(', ') || 'ไม่มี'} เปลี่ยนภาษาที่เรียนในการตั้งค่า หรือเลือกวิดีโออื่น`,
    onlyPictures: 'วิดีโอนี้มีคำบรรยายเป็นรูปภาพเท่านั้น ไม่ใช่ข้อความ Libregaku จึงอ่านไม่ได้',
    chooseInPlayer: (track: string): string => `เลือก ${track} ในเมนูคำบรรยายของโปรแกรมเล่น แล้ว Libregaku จะอ่านคำบรรยายนั้น`,
    noHumanTrack: 'วิดีโอนี้ไม่มีแทร็กที่คนเขียน',
    secondTrackError: (track: string, error: string): string => `${track}: ${error}`,
    noSecondTrackDetail: (languages: readonly string[]): string => `วิดีโอนี้มี: ${languages.join(', ')}`,
    analyserDidNotLoad: 'ตัววิเคราะห์โหลดไม่สำเร็จ',
  },

  anki: {
    // การเชื่อมต่อ AnkiConnect
    offline: (port: number): string => `ไม่มีโปรแกรมใดรอรับการเชื่อมต่อที่พอร์ต ${port}`,
    timeout: (port: number, seconds: number): string =>
      `ไม่มีการตอบกลับที่พอร์ต ${port} ภายใน ${seconds} วินาที ` +
      'Anki อาจไม่ว่าง (กำลังซิงก์ หรือแสดงหน้าต่างโต้ตอบ) หรือมีโปรแกรมอื่นใช้พอร์ตนี้อยู่',
    blocked: (origin: string): string =>
      `AnkiConnect ปฏิเสธ ${origin} ใน Anki ไปที่ เครื่องมือ → Add-ons → AnkiConnect → Config ` +
      'แล้วเพิ่มบรรทัดนั้นใน webCorsOriginList',
    httpAnswer: (port: number, status: number): string =>
      `มีบางอย่างที่พอร์ต ${port} ตอบกลับด้วย HTTP ${status} ซึ่ง AnkiConnect ไม่ตอบแบบนี้`,
    notAnkiConnect: (port: number): string => `มีโปรแกรมอื่นที่ไม่ใช่ AnkiConnect ใช้พอร์ต ${port} อยู่`,
    noBackground: 'ส่วนเบื้องหลังของส่วนขยายไม่ตอบสนอง',
    unreachable: 'เชื่อมต่อ Anki ไม่ได้',
    callFailed: 'การเรียก AnkiConnect ล้มเหลว',

    // สิ่งที่ Libregaku ไม่ส่งให้ Anki
    notRelayed: (action: string): string => `Libregaku ไม่ส่ง “${action}” ไปยัง AnkiConnect`,
    mediaNotFetched: (media: 'audio' | 'video' | 'picture'): string =>
      `Libregaku แนบเฉพาะ${MEDIA[media]}ที่ดึงมาเองเท่านั้น`,
    mediaEmpty: (media: 'audio' | 'video' | 'picture'): string => `${MEDIA[media]}ของโน้ตนี้ไม่มีข้อมูล`,
    mediaName: (prefix: string): string =>
      `Libregaku ตั้งชื่อไฟล์ที่เพิ่มให้ขึ้นต้นด้วย ${prefix}… แต่ไฟล์นี้ไม่ได้ตั้งชื่อแบบนั้น`,
    idsNeeded: (action: string, ids: 'notes' | 'cards'): string =>
      `${action} ต้องมีรายการ${ids === 'notes' ? 'โน้ต' : 'การ์ด'}`,
    notMarks: (count: number, ids: 'notes' | 'cards', change: 'delete' | 'suspend' | 'retag'): string =>
      `ปฏิเสธ: ${ids === 'notes' ? `โน้ตที่ส่งมา ${count} รายการ` : `การ์ดที่ส่งมา ${count} ใบ`}ไม่ใช่เครื่องหมายของ Libregaku ` +
      `ซึ่ง${change === 'delete' ? 'ลบ' : change === 'suspend' ? 'พัก' : 'เปลี่ยนแท็ก'}ได้เฉพาะเครื่องหมายของตัวเอง` +
      (change === 'delete' ? ' และการ์ดที่ตนสร้างเมื่อไม่กี่นาทีที่ผ่านมาซึ่งยังไม่ได้ทบทวน' : ''),

    // ประเภทโน้ตที่ Libregaku สร้างใน Anki
    noteTypeMismatch: (noteType: string, fields: readonly string[], loses: 'cards' | 'notes'): string =>
      `ประเภทโน้ต “${noteType}” ใน Anki ของคุณไม่มีช่องข้อมูล ${fields.join(', ')} ` +
      `${loses === 'cards' ? 'การ์ด' : 'โน้ต'}จึงจะขาดข้อมูลส่วนนั้นไป ` +
      'Libregaku จะไม่แก้ไขประเภทโน้ตที่คุณอาจแก้ไขไว้ ' +
      `ใน Anki ไปที่ เครื่องมือ → Manage Note Types แล้วเปลี่ยนชื่อ “${noteType}” (หรือเพิ่มช่องข้อมูลกลับเข้าไป) ` +
      'จากนั้นกด “ตรวจสอบอีกครั้ง” แล้วจะมีการติดตั้งประเภทโน้ตใหม่ให้',

    // เครื่องหมายและการ์ดที่รออยู่
    marksNotAdded: (count: number): string =>
      `Anki ไม่ได้เพิ่มเครื่องหมาย ${count} รายการ ซึ่งยังอยู่ในคิวและจะลองใหม่ในครั้งถัดไป`,
    marksNotStored: (cause: string): string => `ที่เก็บข้อมูลของเบราว์เซอร์ปฏิเสธเครื่องหมายที่อ่านจาก Anki: ${cause}`,
    storageUnreadable: (cause: string): string => `อ่านที่เก็บข้อมูลของเบราว์เซอร์ไม่ได้: ${cause}`,
  },

  errors: {
    // การบันทึกเสียงของแท็บ
    captureNotAllowed: 'อนุญาตเสียงประโยคบนเว็บไซต์นี้ในการตั้งค่าของ Libregaku ก่อน',
    captureRefused: 'Chrome ไม่ยอมบันทึกแท็บนี้',

    // แทร็กคำบรรยายที่โหลดไม่ได้
    unknownTrack: (id: string): string => `ไม่รู้จักแทร็ก ${id}`,
    trackNotSent: 'โปรแกรมเล่นยังไม่ได้โหลด ให้เลือกหนึ่งครั้งในเมนูคำบรรยายของโปรแกรมเล่น',
    noCaptionFormat: (attempts: readonly string[]): string =>
      `ไม่มีรูปแบบคำบรรยายใดใช้ได้ — ${attempts.join(', ')}`,
    noSubtitleUrl: (attempts: readonly string[]): string =>
      `ไม่มี URL คำบรรยายใดใช้ได้ — ${attempts.join('; ') || 'ไม่มีในรายการ'}`,
    emptyAnswer: 'ว่างเปล่า',
    noCues: '0 บรรทัด',
    noCuesParsed: 'อ่านได้ 0 บรรทัด',
    noAnswerWithin: (seconds: number): string => `ไม่ตอบกลับใน ${seconds} วินาที`,

    // ชื่อแทร็ก
    forcedTrack: (track: string): string => `${track} (บังคับ)`,

    // พจนานุกรมและตัววิเคราะห์
    noAnswer: 'ส่วนขยายไม่ตอบสนอง — โหลดหน้าซ้ำเพื่อเริ่มใหม่',
    analyserLoading: 'ตัววิเคราะห์ยังโหลดอยู่',
    dictionaryLoading: 'พจนานุกรมยังโหลดอยู่',
    lookupFailed: 'ดูความหมายไม่สำเร็จ',
  },

  grammar: {
    // กาลและความสุภาพ
    past: 'รูปอดีต',
    polite: 'รูปสุภาพ',

    // การปฏิเสธ
    negative: 'รูปปฏิเสธ',
    'negative intent': 'เจตนาปฏิเสธ',
    without: 'โดยไม่',

    // ถ้าและเมื่อ
    conditional: 'รูปเงื่อนไข',
    whenever: 'ทุกครั้งที่',

    // ใครทำ และทำได้หรือไม่
    passive: 'รูปถูกกระทำ',
    'passive or potential': 'รูปถูกกระทำหรือรูปสามารถ',
    potential: 'รูปสามารถ',
    causative: 'รูปให้กระทำ',

    // ความอยาก
    'want to': 'อยาก',
    'seems to want to': 'ดูเหมือนอยาก',
    'want someone to': 'อยากให้ผู้อื่นทำ',

    // ผู้พูดรู้ได้อย่างไร และแน่ใจแค่ไหน
    seems: 'ดูเหมือน',
    'seems like': 'เหมือนว่า',
    hearsay: 'ได้ยินมาว่า',
    apparently: 'ท่าทางจะ',
    probably: 'คงจะ',
    might: 'อาจจะ',

    // สิ่งที่ควรเกิดขึ้น
    'ought to': 'ควร',
    'supposed to': 'น่าจะ',
    'intends to': 'ตั้งใจจะ',

    // ต้องทำ และทำได้
    must: 'ต้อง',
    'must not': 'ห้าม',
    "don't have to": 'ไม่ต้อง',
    may: 'ทำก็ได้',

    // คำสั่ง คำขอ และการชักชวน
    imperative: 'รูปคำสั่ง',
    volitional: 'รูปเจตนา',
    'polite command': 'คำสั่งสุภาพ',
    please: 'กรุณา',

    // การเชื่อมกับส่วนที่ตามมา
    'te-form': 'รูป て',
    listing: 'ยกตัวอย่าง',
    while: 'ขณะที่',
    because: 'เพราะ',
    'even though': 'ทั้งที่',
    'in order to': 'เพื่อ',
    'so that': 'เพื่อให้',

    // กริยาช่วยหลังรูป て
    ongoing: 'ต่อเนื่อง',
    'resulting state': 'สภาพคงอยู่',
    'completely, or regrettably': 'จนหมด หรือน่าเสียดาย',
    'in advance': 'ทำไว้ล่วงหน้า',
    'try doing': 'ลองทำ',
    'going forward': 'ต่อไปเรื่อยๆ',
    'coming to be': 'กลายมาเป็น',
    'receive the favour': 'ได้รับการทำให้',
    'someone does for me': 'ผู้อื่นทำให้',
    'do for someone': 'ทำให้ผู้อื่น',

    // กริยาช่วยหลังรากกริยา
    'too much': 'เกินไป',
    'easy to': 'ทำง่าย',
    'hard to': 'ทำยาก',
    'start to': 'เริ่ม',
    'keep on': 'ทำต่อไป',
    finish: 'ทำเสร็จ',
    again: 'ทำใหม่',
    'each other': 'ซึ่งกันและกัน',
    completely: 'จนหมด',
    thoroughly: 'อย่างลึกซึ้ง',
    around: 'ไปทั่ว',
    'non-stop': 'ไม่หยุด',

    // รูปคำภาษาสเปน
    or: 'หรือ',
    'first-person': 'บุรุษที่ 1',
    'second-person': 'บุรุษที่ 2',
    'third-person': 'บุรุษที่ 3',
    singular: 'เอกพจน์',
    plural: 'พหูพจน์',
    masculine: 'เพศชาย',
    feminine: 'เพศหญิง',
    present: 'ปัจจุบันกาล',
    preterite: 'อดีตกาลสมบูรณ์',
    imperfect: 'อดีตกาลไม่สมบูรณ์',
    'imperfect-se': 'อดีตกาลไม่สมบูรณ์ (-se)',
    future: 'อนาคตกาล',
    'conditional-mood': 'มาลาเงื่อนไข',
    indicative: 'มาลาบอกเล่า',
    subjunctive: 'มาลาสมมติ',
    infinitive: 'รูปกริยาเดิม',
    gerund: 'รูป -ndo',
    participle: 'กริยาคุณศัพท์',
    formal: 'เป็นทางการ',
    informal: 'ไม่เป็นทางการ',
    'with-tú': 'ใช้กับ tú',
    'with-vos': 'ใช้กับ vos',
    'vos-form': 'รูป vos',
    voseo: 'voseo',
    'second-person-semantically': 'หมายถึง “คุณ”',
    accusative: 'มีกรรมตรง',
    dative: 'มีกรรมรอง',
    'object-first-person': 'กรรมบุรุษที่ 1',
    'object-second-person': 'กรรมบุรุษที่ 2',
    'object-third-person': 'กรรมบุรุษที่ 3',
    'object-singular': 'กรรมเอกพจน์',
    'object-plural': 'กรรมพหูพจน์',
    diminutive: 'รูปแสดงความเล็ก',
    augmentative: 'รูปแสดงความใหญ่',
    superlative: 'ขั้นสูงสุด',
    alternative: 'รูปอื่น',
    'alt-of': 'การสะกดแบบอื่น',

    // คำลงท้ายภาษาเกาหลี
    honorific: 'รูปยกย่อง',
    'future or guess': 'อนาคตหรือคาดเดา',
    'formal polite': 'สุภาพแบบทางการ',
    question: 'รูปคำถาม',
    but: 'แต่',
    "let's": 'รูปชักชวน',
    plain: 'บอกเล่าธรรมดา',
    'shall we, or I wonder': 'ชวน หรือสงสัย',
    'I will': 'สัญญาว่าจะ',
    'just noticed': 'เพิ่งรู้',
    'as you know': 'ก็รู้อยู่แล้ว',
    and: 'และ',
    'because, or and then': 'เพราะ หรือแล้วก็',
    'but, or given that': 'แต่ หรือเนื่องจาก',
    'even if': 'แม้ว่า',
    whether: 'หรือไม่',
    'adverb form': 'รูปคำวิเศษณ์',
    quoting: 'อ้างคำพูด',
    'used to': 'ที่เคย',
    topic: 'หัวเรื่อง',
    subject: 'ประธาน',
    object: 'กรรม',
    possessive: 'แสดงความเป็นเจ้าของ',
    'come to': 'กลายเป็นว่า',
    when: 'ตอนที่',
    modifier: 'รูปขยายนาม',
    'noun form': 'รูปคำนาม',
    becomes: 'เปลี่ยนเป็น',
    'have done before': 'เคยทำมาก่อน',
  },
};
