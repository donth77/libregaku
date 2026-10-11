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
};
