/**
 * The names of endings on a word ("past", "potential"), keyed by the label
 * src/morphology/merge.ts gives them.
 *
 * A Japanese verb or adjective is looked up by its dictionary form, and the
 * lookup card and the transcript name what the endings on it do, joined with
 * " · ": 待てなかった is "potential · negative · past". Each key is the label
 * merging gives an ending, and in English it is also the name shown. A
 * translation names each in its own words and leaves the keys as they are;
 * a short name reads best, since several often show together.
 *
 * GRAMMAR_LABELS in merge.ts lists every label, and a test holds this table
 * to exactly those.
 */
export const grammar = {
  // Tense and politeness
  /** The past tense, with た or だ: 待った, 読んだ. */
  past: 'past',
  /** The polite ending, ます or です: 待ちます. */
  polite: 'polite',

  // Not doing it
  /** Not doing it, with ない or ず: 待たない. */
  negative: 'negative',
  /** "Will not", a resolve or a guess, with まい: 二度と行くまい, "I'll never go again". */
  'negative intent': 'negative intent',
  /** Without doing it, with ずに: 待たずに. */
  without: 'without',

  // If and when
  /** "If" or "when", with ば, たら or なら: 待てば, 待ったら. */
  conditional: 'conditional',
  /** "Whenever", or "and then", with と after a verb: 押すと開く, "press it and it opens". */
  whenever: 'whenever',

  // Who does it, and whether it can be done
  /** Done to someone, with れる or られる: 待たれる. After a causative it is "made to": 待たされる. */
  passive: 'passive',
  /** られる where it can be either: 食べられる is "is eaten" or "can eat". */
  'passive or potential': 'passive or potential',
  /** The can-do form: 待てる, "can wait". */
  potential: 'potential',
  /** Making or letting someone do it, with せる or させる: 待たせる, "keep someone waiting". */
  causative: 'causative',

  // Wanting
  /** Wanting to do it, with たい: 待ちたい. */
  'want to': 'want to',
  /** Someone else seems to want to, with たがる: 行きたがる. */
  'seems to want to': 'seems to want to',
  /** Wanting someone else to do it, with てほしい: 来てほしい. */
  'want someone to': 'want someone to',

  // How the speaker knows it, and how sure they are
  /** It looks that way, with そう or よう: 降りそう, "looks like rain". */
  seems: 'seems',
  /** "Seems like", with みたい: 来るみたい. */
  'seems like': 'seems like',
  /** "I hear that", with そうだ after a whole verb: 来るそうだ. */
  hearsay: 'hearsay',
  /** From what is seen or heard, with らしい: 来るらしい. */
  apparently: 'apparently',
  /** A guess, with だろう or でしょう: 来るだろう. */
  probably: 'probably',
  /** A possibility, with かもしれない: 来るかもしれない. */
  might: 'might',

  // What should happen, or is meant to
  /** What should be done, with べき: 待つべきだ. */
  'ought to': 'ought to',
  /** What is expected to happen, with はず: 来るはずだ. */
  'supposed to': 'supposed to',
  /** A plan, with つもり: 行くつもり. */
  'intends to': 'intends to',

  // Having to, and being allowed to
  /** Having to, with なきゃ, なくちゃ or なければならない: 行かなきゃ. */
  must: 'must',
  /** Not being allowed to, with てはいけない or ちゃだめ: 待ってはいけない. */
  'must not': 'must not',
  /** Not needing to, with なくてもいい: 待たなくてもいい. */
  "don't have to": "don't have to",
  /** Being allowed to, with てもいい: 待ってもいい. */
  may: 'may',

  // Commands, requests and "let's"
  /** The plain command form: 待て, 行け. */
  imperative: 'imperative',
  /** "Let's", or "I'll", the form ending in う: 行こう, 待とう. */
  volitional: 'volitional',
  /** A firm but polite command, with なさい: 待ちなさい. */
  'polite command': 'polite command',
  /** A request, with ください: 待ってください. */
  please: 'please',

  // Joining to what comes next
  /** The connecting form, with て or で: 待って, 読んで. Textbooks call it the te-form. */
  'te-form': 'te-form',
  /** Doing things such as these, with たり or だり: 見たり食べたり. */
  listing: 'listing',
  /** Doing it at the same time, with ながら or つつ: 歩きながら. */
  while: 'while',
  /** A reason, with ので: 遅れたので, "because I was late". */
  because: 'because',
  /** In spite of it, with のに: 待ったのに, "even though I waited". */
  'even though': 'even though',
  /** A purpose, with ため: 勝つため, "to win". */
  'in order to': 'in order to',
  /** An aim, with ように: 聞こえるように, "so that it can be heard". */
  'so that': 'so that',

  // Helper verbs after the te-form
  /** In progress, or a lasting state, with ている or てる: 待っている, 知ってる. */
  ongoing: 'ongoing',
  /** Done and left that way, with てある: 書いてある, "it is written there". */
  'resulting state': 'resulting state',
  /** Done for good, often with regret, with てしまう or ちゃう: 食べちゃった. */
  'completely, or regrettably': 'completely, or regrettably',
  /** Done ahead, ready for later, with ておく or とく: 買っておく. */
  'in advance': 'in advance',
  /** Trying it to see, with てみる: 食べてみる. */
  'try doing': 'try doing',
  /** Going on, or going off with it, with ていく: 増えていく, 持っていく. */
  'going forward': 'going forward',
  /** Changing until now, or coming with it, with てくる: 寒くなってきた, 持ってくる. */
  'coming to be': 'coming to be',
  /** Having someone do it for you, with てもらう: 手伝ってもらう. */
  'receive the favour': 'receive the favour',
  /** Someone doing it for the speaker, with てくれる: 教えてくれる. */
  'someone does for me': 'someone does for me',
  /** Doing it for someone else, with てあげる or てやる: 教えてあげる. */
  'do for someone': 'do for someone',

  // Helper verbs after the verb's stem
  /** Doing it too much, with すぎる: 食べすぎる. */
  'too much': 'too much',
  /** Easy to do, with やすい: 読みやすい. */
  'easy to': 'easy to',
  /** Hard to do, with にくい, づらい or がたい: 読みにくい. */
  'hard to': 'hard to',
  /** Beginning to do it, with 始める, 出す or かける: 読み始める. */
  'start to': 'start to',
  /** Going on doing it, with 続ける: 待ち続ける. */
  'keep on': 'keep on',
  /** Finishing doing it, with 終わる or 終える: 読み終わる. */
  finish: 'finish',
  /** Doing it over, with 直す: 書き直す, "rewrite". */
  again: 'again',
  /** Doing it to one another, with 合う: 助け合う, "help each other". */
  'each other': 'each other',
  /** All the way through, with 切る: 使い切る, "use it all up". */
  completely: 'completely',
  /** Deeply, or into something, with 込む: 考え込む, "be lost in thought". */
  thoroughly: 'thoroughly',
  /** All over the place, with 回る: 歩き回る, "walk around". */
  around: 'around',
  /** Doing it like mad, with まくる: 食べまくる. */
  'non-stop': 'non-stop',

  // Forms of a Spanish word, in the words Wiktionary describes them with
  // (FORM_LABELS in src/morphology/lemma.ts). One way of reading a form is
  // several of these in a row, shown with spaces between: hablábamos is
  // "first-person plural imperfect indicative". A form that can be read two
  // ways shows both, joined with " · ".
  /** Before another word the form may also belong to: fue is a form of ir, "or ser". */
  or: 'or',
  /** I or we: hablo, hablamos. */
  'first-person': 'first-person',
  /** You: hablas, habláis. */
  'second-person': 'second-person',
  /** He, she, it or they: habla, hablan. */
  'third-person': 'third-person',
  /** One person or thing: hablo, casa. */
  singular: 'singular',
  /** More than one: hablamos, casas. */
  plural: 'plural',
  /** Grammatical gender: niño. */
  masculine: 'masculine',
  /** Grammatical gender: niña. */
  feminine: 'feminine',
  /** The present tense: hablo. */
  present: 'present',
  /** The simple past, for something finished: hablé. */
  preterite: 'preterite',
  /** The past of what was going on or used to happen: hablaba. */
  imperfect: 'imperfect',
  /** The imperfect subjunctive's second set of endings, in -se: hablase, beside hablara. */
  'imperfect-se': 'imperfect (-se)',
  /** The future tense: hablaré. */
  future: 'future',
  /** The "would" form of a verb: hablaría. A mood of the verb, not the Japanese "if" above. */
  'conditional-mood': 'conditional',
  /** The ordinary mood, for stating facts: hablo. */
  indicative: 'indicative',
  /** The mood for wishes, doubts and what is not certain: que hable. */
  subjunctive: 'subjunctive',
  /** The dictionary form of a verb: hablar. */
  infinitive: 'infinitive',
  /** The -ando or -iendo form, "speaking": hablando. */
  gerund: 'gerund',
  /** The form used with haber, or as an adjective: hablado. Usually after "past". */
  participle: 'participle',
  /** Said to someone addressed as usted or ustedes: hable. */
  formal: 'formal',
  /** Said to someone addressed as tú, vos or vosotros: habla. */
  informal: 'informal',
  /** The form that goes with tú. tú is Spanish and stays as it is. */
  'with-tú': 'with tú',
  /** The form that goes with vos, used in much of Latin America. vos is Spanish and stays as it is. */
  'with-vos': 'with vos',
  /** The same: a form used with vos. */
  'vos-form': 'vos form',
  /** The use of vos for "you". The Spanish name of it. */
  voseo: 'voseo',
  /** Third-person in form, but said to "you": the usted forms. */
  'second-person-semantically': 'meaning "you"',
  /** With a direct-object pronoun attached: dámelo, "give it to me". */
  accusative: 'with direct object',
  /** With an indirect-object pronoun attached: dame, "give me". */
  dative: 'with indirect object',
  /** The attached pronoun is me or nos: dame, "give me". */
  'object-first-person': 'first-person object',
  /** The attached pronoun is te or os: verte, "to see you". */
  'object-second-person': 'second-person object',
  /** The attached pronoun is lo, la, le or their plurals: hacerlo, "to do it". */
  'object-third-person': 'third-person object',
  /** The attached pronoun stands for one person or thing: lo, la, le. Follows one of the three above. */
  'object-singular': 'singular object',
  /** The attached pronoun stands for more than one: los, las, les. Follows one of the three above. */
  'object-plural': 'plural object',
  /** A form that makes something smaller or dearer: casita. */
  diminutive: 'diminutive',
  /** A form that makes something bigger: casona. */
  augmentative: 'augmentative',
  /** The "most" form of an adjective: altísimo. */
  superlative: 'superlative',
  /** Another form of the same word. */
  alternative: 'alternative',
  /** Another way of writing the same word. */
  'alt-of': 'another spelling',

  // Korean endings. Each is named for what it does; the ones Japanese shares (past, must, want to…) are above
  /** 시, which raises the person doing it: 가시다, 하세요. */
  honorific: 'honorific',
  /** 겠 or ㄹ 것이다, a plan or a guess: 하겠습니다 "I will do it"; 맛있겠다 "that must be tasty"; 갈 거야 "I will go". */
  'future or guess': 'future or guess',
  /** ㅂ니다 / 습니다, the most formal polite ending: 감사합니다. */
  'formal polite': 'formal polite',
  /** An ending that asks, 나 / 니 / 냐 / ㄴ가 / ㅂ니까: 뭐 하니? "what are you doing?"; 갑니까? "are you going?" */
  question: 'question',
  /** 지만, 나 inside a sentence, or ㅂ니다만: 좋지만 "it is good, but"; 좋으나; 좋습니다만. */
  but: 'but',
  /** 자 / ㅂ시다: 가자 "let's go". */
  "let's": "let's",
  /** The plain statement ending ㄴ다 / 다, as in writing or to oneself: 간다. */
  plain: 'plain',
  /** ㄹ까: 갈까? "shall we go?"; 올까? "I wonder if he will come". */
  'shall we, or I wonder': 'shall we, or I wonder',
  /** ㄹ게, a promise to the one listening: 할게 "I'll do it". */
  'I will': 'I will',
  /** 네 / 구나 / 군, on realising something: 맛있네 "oh, this is good". */
  'just noticed': 'just noticed',
  /** 잖아: 했잖아 "I did it, you know". */
  'as you know': 'as you know',
  /** 고 / 며, joining two actions: 먹고 "eat and". */
  and: 'and',
  /** 아서 / 어서: 몰라서 "because I don't know"; 가서 "go and then". */
  'because, or and then': 'because, or and then',
  /** ㄴ데 / 는데, which sets the scene or contrasts: 있는데 "there is one, but / so". */
  'but, or given that': 'but, or given that',
  /** 아도 / 어도 / 더라도: 가도 "even if I go". */
  'even if': 'even if',
  /** ㄴ지 / ㄹ지: 올지 "whether he will come". */
  whether: 'whether',
  /** 게, which makes an adverb of an adjective: 예쁘게 "prettily". */
  'adverb form': 'adverb form',
  /** 다고 / 라고 / 자고 / 냐고, or 다는 / 라는 / 란 before a noun, reporting what was said: 간다고 "(says) that he is going". */
  quoting: 'quoting',
  /** 던, before a noun, for what was once so: 가던 길 "the road I used to take". */
  'used to': 'used to',
  /** The particle 은 / 는 fused into the word: 난 is 나 + 는. */
  topic: 'topic',
  /** The particle 이 / 가 fused in: 그게 is 그것 + 이. */
  subject: 'subject',
  /** The particle 을 / 를 fused in: 그걸 is 그것 + 을. */
  object: 'object',
  /** The particle 의 fused in: 내 is 나 + 의, "my". */
  possessive: 'possessive',
  /** 게 되다: 가게 되다 "come to go, end up going". */
  'come to': 'come to',
  /** ㄹ 때: 갈 때 "when going". */
  when: 'when',
  /** The form a verb or adjective takes before a noun, ㄴ / 는 / ㄹ: 예쁜 꽃 "a pretty flower". */
  modifier: 'modifier',
  /** 기 / ㅁ, which makes a noun of a verb: 먹기 "eating". */
  'noun form': 'noun form',
  /** 아지다 / 어지다: 예뻐지다 "become pretty". */
  becomes: 'becomes',
  /** ㄴ 적이 있다: 간 적이 있다 "have been there before". */
  'have done before': 'have done before',

  // Forms of a French or German word, in the same words (FORM_LABELS).
  /** The case of the one who does it: German der Mann. */
  nominative: 'nominative',
  /** The case of belonging, "of": German des Mannes. */
  genitive: 'genitive',
  /** The case of what is done to: German den Mann. Not the Spanish pronoun's accusative above. */
  'accusative-case': 'accusative',
  /** The case of who it is done for or to: German dem Mann. Not the Spanish pronoun's dative above. */
  'dative-case': 'dative',
  /** Grammatical gender, neither masculine nor feminine: German das Haus. */
  neuter: 'neuter',
  /** With "the": German der kleine Mann. */
  definite: 'definite',
  /** With "a": German ein kleiner Mann. */
  indefinite: 'indefinite',
  /** "More": German größer. */
  comparative: 'comparative',
  /** The endings an adjective takes with no word before it: German kleiner Mann. */
  strong: 'strong',
  /** The endings an adjective takes after "the": German der kleine Mann. */
  weak: 'weak',
  /** The endings an adjective takes after "a": German ein kleiner Mann. */
  mixed: 'mixed',
  /** An adjective with no article before it: German kleine Männer. */
  'without-article': 'without article',
  /** A verb done to oneself: French se laver, German sich waschen. */
  reflexive: 'reflexive',

  // Forms of an Arabic word, in the same words (FORM_LABELS).
  /** The Arabic tense for now and later, the "imperfect": يكتب, "he writes, he will write". */
  'non-past': 'non-past',
  /** Two of something, between singular and plural: Arabic كتابان, "two books". */
  dual: 'dual',
  /** The Arabic short mood, after لم and in commands: لم يكتب, "he did not write". */
  jussive: 'jussive',
  /** A noun with another after it that owns it, "the X of": Arabic كتاب الطالب, "the student's book". */
  construct: 'construct',

  // What the little words written onto an Arabic word add (src/morphology/arabic.ts). Each is said in the
  // learner's own words: what it means, short.
  /** و written onto a word: وكتاب, "and a book". */
  'attached-and': 'and',
  /** ف written onto a word: فذهب, "so he went". */
  'attached-so': 'so, then',
  /** ب written onto a word: بالقلم, "with the pen". */
  'attached-with': 'with, in, by',
  /** ل written onto a word: للبيت, "to the house". */
  'attached-for': 'for, to',
  /** ك written onto a word: كالأسد, "like a lion". */
  'attached-like': 'like, as',
  /** "My" on the end of a noun: Arabic كتابي, "my book". */
  'attached-my': 'my',
  /** "Your", to one or more: Arabic كتابك, كتابكم. */
  'attached-your': 'your',
  /** Arabic ـه on a noun: كتابه, "his book", or "its". */
  'attached-his': 'his, its',
  /** Arabic ـها on a noun: كتابها, "her book", or "its". */
  'attached-her': 'her, its',
  /** Arabic كتابنا, "our book". */
  'attached-our': 'our',
  /** Arabic كتابهم, "their book". */
  'attached-their': 'their',
  /** "Me" on the end of a verb or a preposition: Arabic يحبني, "he loves me"; لي, "for me". */
  'attached-me': 'me',
  /** Arabic يحبك, "he loves you"; لك, "for you". */
  'attached-you': 'you',
  /** Arabic يحبه, "he loves him"; له, "for him", or "it". */
  'attached-him': 'him, it',
  /** Arabic يحبها, "he loves her"; لها, "for her", or "it". Not the "her" of "her book" above. */
  'attached-her-object': 'her, it',
  /** Arabic يحبنا, "he loves us"; لنا, "for us". */
  'attached-us': 'us',
  /** Arabic يحبهم, "he loves them"; لهم, "for them". */
  'attached-them': 'them',
};
