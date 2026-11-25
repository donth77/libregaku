import type { Translation } from '.';
import type { OverrideStatus } from '../anki/status';
import type { MissingMedia } from '../content/capture';
import type { Settings } from '../settings';

/** "1 palavra", "2 palavras". */
const words = (n: number): string => `${n} palavra${n === 1 ? '' : 's'}`;

/** "1 cartão", "2 cartões". */
const cards = (n: number): string => `${n} ${n === 1 ? 'cartão' : 'cartões'}`;

/** The plural ending a word takes after a count: "1 cartão criado", "3 cartões criados". */
const s = (n: number): string => (n === 1 ? '' : 's');

/** The furigana (or pinyin) setting's three choices, as the bar and the player announce them: the menu's words. */
const RUBY: Record<Settings['ruby'], string> = { never: 'desativado', unknown: 'palavras novas', always: 'todas' };

/** What a card went in without, joined with "nem": "sem áudio da frase". */
const without = (missing: readonly MissingMedia[]): string =>
  missing
    .map((m) => (m === 'audio-encrypted'
      ? 'áudio da frase (clique no ícone do Libregaku para gravar aqui)'
      : 'áudio da frase'))
    .join(' nem ');

const MEDIA_WHAT = { audio: 'áudio', video: 'vídeo', picture: 'imagens' } as const;
const MEDIA_THE = { audio: 'O áudio', video: 'O vídeo', picture: 'A imagem' } as const;

/** The interface in Portuguese (Brazil). Anything left out shows in English. */
export const pt: Translation = {
  common: {
    furigana: (mode: Settings['ruby']): string => `Furigana: ${RUBY[mode]}`,
    pinyin: (mode: Settings['ruby']): string => `Pinyin: ${RUBY[mode]}`,
    mandarin: 'Chinês (mandarim)',
    jyutping: (mode: Settings['ruby']): string => `Jyutping: ${RUBY[mode]}`,
    sentenceGap: ' ',
  },

  settings: {
    // Languages
    languagesHeading: 'Idiomas',
    languagesAbout: 'Escolha o idioma que você está aprendendo e o seu idioma.',
    target: 'Estou aprendendo',
    targetLimited: (language: string): string => `${language} — limitado`,
    supportFull: (definitions: string): string => `Suporte completo, incluindo leituras e furigana. ${definitions}`,
    supportPinyin: (definitions: string): string => `Suporte completo, incluindo pinyin. ${definitions}`,
    supportJyutping: (definitions: string): string => `Suporte completo, incluindo Jyutping. ${definitions}`,
    supportWords: (definitions: string): string => `Suporte completo. ${definitions}`,
    supportDefinitions: (language: string): string => `As definições ficam em ${language}.`,
    supportDefinitionsOwn: (language: string, fallback: string): string =>
      `As definições ficam em ${language}, e em ${fallback} para as palavras que o dicionário em ${language} não tem.`,
    script: 'Caracteres',
    scriptHint: 'Os usados quando um vídeo tem os dois.',
    supportBasic: 'Suporte básico: as palavras são separadas, mas ainda não há dicionário nem leituras.',
    native: 'Seu idioma',
    nativeHint: 'Traduções e definições aparecem neste idioma, quando disponíveis no vídeo e no dicionário.',
    definitions: 'Definições em',
    definitionsHint: 'O dicionário não tem definições no seu idioma, então elas aparecem neste.',
    definitionsHintFor: (language: string): string =>
      `O dicionário não tem definições em ${language}, então elas aparecem neste idioma.`,
    definitionsHintOwn: (language: string): string =>
      `As palavras que o dicionário em ${language} não tem aparecem neste idioma.`,

    // Looking words up
    lookupHeading: 'Consulta de palavras',
    lookupAbout: 'Escolha como e quando as consultas aparecem.',
    interaction: 'Modo de consulta',
    interactionHover: 'Passar o cursor',
    interactionShift: 'Passar o cursor segurando Shift',
    interactionClick: 'Clicar',
    interactionHint: 'Clicar em uma palavra sempre funciona também.',
    hoverPause: 'Pausar durante a consulta',
    hoverPauseHint: 'Pausa o vídeo enquanto o cursor está sobre uma palavra.',
    sidebarHover: 'Definições rápidas na transcrição',
    sidebarHoverHint: 'Mostra uma definição curta quando você passa o cursor sobre uma palavra da transcrição.',

    // Word popup
    popupHeading: 'Pop-up da palavra',
    popupAbout: 'Escolha o que o pop-up mostra quando você consulta uma palavra.',
    cardDeckMenu: 'Menu de baralhos',
    cardDeckMenuHint: 'Adiciona um ▾ ao lado de Adicionar ao Anki para escolher outro baralho. Os novos cartões passam a ir para ele.',
    cardHideAdd: 'Ocultar Adicionar ao Anki',
    cardHideAddHint: 'Tira do cartão o botão Adicionar ao Anki e o menu de baralhos ao lado.',
    cardKanji: 'Detalhamento de kanji',
    cardKanjiHint: 'Mostra os significados e as leituras de cada kanji.',
    cardHanzi: 'Detalhamento de caracteres',
    cardHanziHint: 'Mostra os significados e as leituras de cada caractere.',
    lookupElsewhere: 'Exemplos deste vídeo',
    lookupElsewhereHint: 'Mostra outras frases deste vídeo que usam a palavra. Clique em uma para reproduzi-la.',

    // Subtitles
    subtitlesHeading: 'Legendas',
    subtitlesAbout: 'Ajuste a aparência das legendas no vídeo.',
    ruby: 'Furigana',
    rubyUnknown: 'Palavras novas',
    rubyAlways: 'Todas',
    rubyNever: 'Desativado',
    rubyHint: 'Leituras acima dos kanji. Pressione R para alternar enquanto assiste.',
    pinyin: 'Pinyin',
    pinyinHint: 'Leituras acima dos caracteres. Pressione R para alternar enquanto assiste.',
    jyutping: 'Jyutping',
    jyutpingHint: 'Leituras acima dos caracteres. Pressione R para alternar enquanto assiste.',
    blurPrimary: 'Desfocar legendas',
    blurPrimaryHint:
      'Para treinar a escuta: as legendas ficam desfocadas até você passar o cursor sobre elas. Pressione H para alternar.',
    showSubtitles: 'Legendas no vídeo',
    showSubtitlesHint: 'Desenha as legendas sobre o vídeo. Desativadas, ficam a barra superior, a transcrição e o painel. O botão da barra alterna: tradução oculta, legendas ocultas e depois as duas; ↑ faz o mesmo.',
    subtitleSize: 'Tamanho do texto',
    subtitleSizeOption: (percent: number): string => `${percent}%`,
    subtitleSizeHint: 'Acompanha o tamanho do player, então fica igual em tela cheia.',
    subtitleBottom: 'Posição',
    subtitleBottomLowest: 'Mais baixa',
    subtitleBottomLow: 'Baixa',
    subtitleBottomNormal: 'Normal',
    subtitleBottomRaised: 'Um pouco alta',
    subtitleBottomHigh: 'Alta',
    subtitleBottomHighest: 'Mais alta',
    subtitleBottomHint: 'A altura das legendas. Outra extensão de legendas no mesmo player fica abaixo delas.',
    dualSubtitles: 'Mostrar tradução',
    dualSubtitlesHint:
      'Mostra legendas no seu idioma abaixo das que você está aprendendo. Elas vêm do site, ' +
      'não de tradução automática, e precisam de uma transcrição completa do vídeo.',
    singleKeys: 'Atalhos de uma tecla',
    singleKeysHint:
      'Teclas de letra como A e R funcionam sozinhas enquanto você assiste. Desativado: segure Alt e Shift junto com elas. ' +
      'As teclas de seta funcionam nos dois casos.',

    // Underlines
    underlinesHeading: 'Sublinhados',
    underlinesAbout: 'Cada cor mostra o quanto você conhece uma palavra. Clique em uma para mudá-la.',
    colorUnknown: 'Palavras novas',
    colorUnknownHint: 'Palavras sem cartão no Anki.',
    colorLearning: 'Em aprendizado',
    colorLearningHint: 'Palavras com um cartão que ainda não está maduro.',
    colorTracking: 'Acompanhadas',
    colorTrackingHint: 'Palavras que você está acompanhando.',
    colorKnown: 'Conhecidas',
    colorKnownHint: 'Palavras com um cartão maduro ou marcadas como conhecidas.',
    underlines: 'Sublinhar palavras',
    underlinesHint: 'Desative para legendas simples, sem cores sob as palavras.',
    markKnown: 'Sublinhar palavras conhecidas',
    markKnownHint: 'Desativado por padrão, para a tela ficar mais limpa conforme você aprende.',
    underlineGrammar: 'Sublinhar artigos e pronomes',
    underlineGrammarHint: 'Desativado por padrão: palavras como “o”, “eu” e “ele” ainda podem ser consultadas, mas não contam como palavras a aprender.',
    defaultColours: 'Cores padrão',
    resetColours: 'Redefinir',

    // Transcript
    transcriptHeading: 'Transcrição',
    transcriptAbout: 'O painel ao lado do vídeo com todas as linhas da legenda.',
    sidebarFollow: 'Rolar com o vídeo',
    sidebarFollowHint: 'Mantém a linha atual à vista. Se você rolar a lista, isso pausa; um botão retoma.',
    headerBar: 'Mostrar a barra superior',
    headerBarHint: 'Aparece no topo do vídeo quando o cursor chega perto.',
    languageBadge: 'Indicador de idioma',
    languageBadgeFlag: 'Bandeira',
    languageBadgeCode: 'Código',
    badgeFlag: 'Bandeira do indicador',
    badgeFlagDefault: 'Padrão',
    flagSearch: 'Pesquisar…',
    flagSearchLabel: 'Pesquisar países',
    flagSuggested: 'Sugeridos',
    flagAll: 'Todos os países',
    flagNone: (query: string): string => `Nenhum país corresponde a “${query}”.`,
    badgeFlagHint: 'A bandeira mostrada para o idioma que você está aprendendo. Cada idioma guarda a sua.',
    languageBadgeHint: 'Como a barra superior mostra o idioma que você está aprendendo.',
    sidebarStats: 'Contar palavras novas',
    sidebarStatsHint:
      'Mostra quantas palavras novas cada linha tem, sua porcentagem de palavras conhecidas e os filtros que usam esses números.',

    // Anki
    ankiHeading: 'Anki',
    ankiAbout: 'Conecte o Anki, escolha para onde vão os novos cartões e quais baralhos contam como palavras que você conhece.',
    deck: 'Novos cartões vão para',
    deckHint: 'O baralho onde cada novo cartão é adicionado.',
    statusScope: 'Ler palavras conhecidas de',
    statusScopeHint: 'Os cartões destes baralhos decidem quais palavras ficam sublinhadas. Inclui sub-baralhos.',
    marksInAnki: 'Guardar marcações no Anki',
    marksInAnkiHint:
      'Salva Conhecida, Acompanhar e Ignorar como notas ocultas no Anki (Libregaku::Marks), para que sincronizem com ' +
      'seus outros dispositivos. Desativado: ficam neste navegador.',

    // The deck menus
    wholeCollection: 'Coleção inteira',
    chooseDeck: 'Escolha um baralho…',
    deckNotInAnki: (deck: string): string => `${deck} — não está no Anki`,
    deckAndSubdecks: (deck: string): string => `${deck} (e sub-baralhos)`,
    deckUnset: 'Escolha um baralho. Não dá para adicionar cartões até você escolher.',
    deckMissing: (deck: string): string => `O Anki não tem mais um baralho chamado “${deck}”. Escolha outro.`,
    statusScopeMissing: (deck: string): string =>
      `O Anki não tem mais um baralho chamado “${deck}”, então todas as palavras aparecem como novas. Escolha outro.`,
    statusScopeOutside: (deck: string): string =>
      `Os novos cartões vão para “${deck}”, que não está incluído aqui, então as palavras que você adicionar ` +
      'continuarão sublinhadas como novas. Escolha um baralho que o contenha, ou Coleção inteira.',

    // Where Anki stands
    ankiChecking: 'Verificando…',
    ankiConnected: 'Conectado.',
    noteTypeInstalled: 'Tipo de nota instalado.',
    cardsMade: (n: number): string => `${cards(n)} criado${s(n)} com o Libregaku.`,
    noCards: 'Nenhum cartão ainda.',
    cardsFlushed: (n: number): string =>
      n === 1
        ? '1 cartão criado com o Anki fechado foi adicionado.'
        : `${n} cartões criados com o Anki fechado foram adicionados.`,
    cardsNotFlushed: (n: number, error: string): string =>
      n === 1 ? `1 cartão não pôde ser adicionado: ${error}` : `${n} cartões não puderam ser adicionados: ${error}`,
    cardsWaiting: (n: number): string => `${cards(n)} aguardando para entrar.`,
    ankiOffline: (port: number): string =>
      `O Anki não está respondendo na porta ${port}. É normal enquanto ele está fechado: ` +
      'os novos cartões esperam aqui e são adicionados quando ele abrir.',
    ankiBlocked: 'O Anki está aberto, mas o AnkiConnect ainda não permite esta extensão.',
    ankiOccupied: (detail: string): string => `${detail} Feche o programa que está usando a porta para o Anki poder usá-la.`,

    // The Anki buttons
    checkAgain: 'Verificar de novo',
    newDeck: 'Novo baralho',
    openCards: 'Abrir cartões no Anki',
    openMarks: 'Abrir marcações no Anki',
    newDeckPrompt: 'Dê um nome ao novo baralho. Use :: para um sub-baralho, por exemplo Japonês::Netflix',

    // Connecting Anki
    installStep: 'Instale o Anki neste computador e abra-o. {link}',
    getAnki: 'Baixar o Anki',
    addonStep: 'No Anki, vá em {menu}, cole este código e reinicie o Anki.',
    addonMenu: 'Ferramentas → Extensões → Obter extensões…',
    aboutAnkiConnect: 'Sobre o AnkiConnect',
    originStep: 'No Anki, vá em {menu}, adicione esta linha em {setting} e reinicie o Anki.',
    originMenu: 'Ferramentas → Extensões → AnkiConnect → Configurar',
    runningStep: 'Deixe o Anki aberto enquanto assiste. Os cartões vão direto para o Anki neste computador.',
    copy: 'Copiar',
    copyValue: (value: string): string => `Copiar ${value}`,
    copied: 'Copiado',
    copyFailed: 'Selecione',

    // Anki cards
    ankiCardsHeading: 'Cartões do Anki',
    ankiCardsAbout: 'Escolha o que vai em cada novo cartão, além da palavra, da leitura, do significado e da frase.',
    cardAudio: 'Áudio da palavra',
    cardAudioHint: 'Uma gravação da palavra, quando existe. Nunca uma voz sintética.',
    cardSentenceAudio: 'Áudio da frase',
    cardSentenceAudioHint: 'Grava a frase tocando-a mais uma vez. Em sites protegidos, isso precisa da permissão abaixo.',
    cardScreenshot: 'Captura de tela',
    cardScreenshotHint: 'Uma imagem da cena. Não disponível em sites protegidos, que bloqueiam isso.',
    capture: 'Áudio da frase em sites protegidos',
    captureAllow: 'Permitir',
    captureAllowInSettings: 'Permitir nas configurações',
    captureRemove: 'Remover',
    captureAllowed: 'Permitido. Em cada guia de um site protegido, clique no ícone do Libregaku e escolha Gravar áudio da frase aqui.',
    captureNeeded: 'Os sites protegidos criptografam o vídeo, então o áudio da frase é gravado a partir da guia. Isso precisa da sua permissão.',

    // Data and licences
    creditsHeading: 'Dados e licenças',
    creditJmdict:
      'Dados de dicionário e de kanji © Electronic Dictionary Research and Development Group, usados sob a licença ' +
      'CC BY-SA 4.0. Reempacotados em JSON pelo jmdict-simplified.',
    creditLindera:
      'Divide japonês, coreano e chinês em palavras. Licença MIT; IPADIC, UniDic, mecab-ko-dic e CC-CEDICT têm termos próprios.',
    creditCedict: 'Dicionário de chinês © MDBG e colaboradores, usado sob a licença CC BY-SA 4.0.',
    creditWiktionary: 'Dicionários da maioria dos idiomas, e alguns no seu idioma, do Wiktionary via kaikki.org e wiktionary-to-yomitan. CC BY-SA 4.0.',
    creditKrdict:
      'Palavras coreanas explicadas no seu idioma. © National Institute of Korean Language, usado sob a licença ' +
      'CC BY-SA 2.0 KR. Arquivos criados por Lyroxide.',
    creditCfdict: 'Chinês explicado em francês. CFDICT © chine.in, mantido atualizado pelo CxDICT. CC BY-SA 4.0.',
    creditCanto:
      'Dicionário de cantonês e leituras em Jyutping para o CC-CEDICT. © Pleco Inc., usado sob a licença CC BY-SA 3.0.',
    creditHandedict: 'Chinês explicado em alemão. © HanDeDict e colaboradores, usado sob a licença CC BY-SA 3.0.',
    creditWikdict: 'Alguns dicionários no seu idioma, criados por Karl Bartel a partir das traduções do Wiktionary via DBnary. CC BY-SA 4.0.',
    creditUnihan: 'Qual leitura de um caractere chinês aparece primeiro. © Unicode, Inc., usado sob a Unicode License.',
    creditTatoeba:
      'Qual verbo é um verbo japonês escrito em kana, aprendido destas frases de exemplo. © Colaboradores do Tatoeba, usado sob CC BY 2.0 FR.',
    creditJotoba: 'Usados para consultas enquanto o dicionário é baixado. Ambos usam o JMdict.',
    creditLucide: 'Ícones. Licença ISC.',
    creditCommons: 'Gravações de palavras, feitas por voluntários. Cada uma tem sua própria licença, CC BY-SA 4.0 na maioria, indicada com o nome de quem fala ao reproduzir e no cartão.',
    creditAudioCmn: 'Gravações de palavras em chinês por Yue Tan, Universidade de Caen. CC BY-SA 3.0 US.',
    creditNaver: 'Gravações de palavras em coreano do Naver Dictionary, tocadas apenas no cartão de consulta. Não têm licença para reutilização, por isso nunca vão para um cartão.',
    creditSpanishdict: 'Voz gerada para palavras em espanhol do SpanishDict, tocada pelo botão de pronúncia quando não há gravação. Não tem licença para reutilização, por isso nunca vai para um cartão.',
    licence: 'O Libregaku tem licença MIT. Os dados dos dicionários são baixados das fontes; não vêm incluídos.',
    built: (when: string): string => `Esta cópia foi compilada em ${when}.`,

    // The keyboard shortcuts view
    keyLine: 'Linha anterior ou próxima',
    keyReplay: 'Repetir a linha',
    keyTranslation: 'Mostrar ou ocultar a tradução',
    keyShiftLookup: 'Segure para consultar a palavra sob o cursor',
    keyAdd: 'Adicionar ao Anki a palavra do pop-up',
    keyKnown: 'Marcar a palavra do pop-up como conhecida',
    keyFurigana: 'Alternar furigana: desativado, palavras novas, todas',
    keyPinyin: 'Alternar pinyin: desativado, palavras novas, todas',
    keyJyutping: 'Alternar Jyutping: desativado, palavras novas, todas',
    keyBlur: 'Desfocar ou focar as legendas',
    keySave: 'Salvar a linha atual',
    keyTranscript: 'Mostrar ou ocultar o painel de transcrição',
    keyClose: 'Fechar o pop-up',
  },

  options: {
    pageTitle: 'Configurações do Libregaku',
    help: 'Ajuda',
    searchSettings: 'Pesquisar…',
    noSettingsFound: 'Nada aqui menciona “{q}”.',
    contentsLabel: 'Seções das configurações',
    settingsLabel: 'Configurações',
    setupHeading: 'Primeiros passos',
    setupAbout: 'Duas escolhas; todo o resto já tem um padrão sensato.',
    stepLanguages: 'Escolha o que você está aprendendo',
    stepAnki: 'Conecte o Anki e escolha um baralho para os novos cartões',
    ankiOptional:
      'O Anki é opcional: legendas, consultas e furigana funcionam sem ele. ' +
      'É ele que lembra quais palavras você já conhece.',
    nextSteps:
      'Depois, abra um vídeo com legendas no idioma que você está aprendendo e passe o cursor sobre uma palavra. ' +
      'O botão de teclado no painel de transcrição lista os atalhos de teclado.',
    stepDone: 'Concluído',
    confirmLanguages: 'Estes idiomas estão certos',
    keepDeck: (deck: string): string => `Usar ${deck} para os novos cartões`,
  },

  action: {
    help: 'Ajuda',
    settings: 'Configurações',
    settingsTip: 'Todas as configurações',
    checkingPage: 'Verificando esta página…',
    notActive:
      'Não está ativo nesta página. Abra um vídeo no YouTube, na Netflix ou em outro site compatível. Se você acabou de instalar ou recarregar ' +
      'o Libregaku, recarregue a guia.',
    unsupported: 'O Libregaku funciona no YouTube, na Netflix, no Disney+, no Prime Video, na HBO Max, no Apple TV e no Viki.',
    worksOn: (site: string): string => `O Libregaku funciona em ${site}.`,
    waitingForSubtitles: (site: string): string => `${site}: aguardando as legendas. Verifique se estão ativadas.`,
    activeOn: (title: string): string => `Ativo — ${title}`,
    active: 'Ativo neste vídeo.',
    subtitlesTrack: 'Legendas',
    translationTrack: 'Tradução',
    noTranslation: 'Nenhuma',
    generatedTrack: (track: string): string => `${track} (automática)`,
    captureNeedsPermission: 'Para gravar o áudio da frase aqui, é preciso permissão para capturar o som desta guia.',
    captureAllowInSettings: 'Permitir nas configurações',
    captureReady: 'O som de sites protegidos só pode ser gravado depois que você ativar a gravação nesta guia.',
    captureStart: 'Gravar áudio da frase aqui',
    captureFailed: 'O Chrome não conseguiu gravar esta guia.',
    toggleSidebar: 'Alternar barra lateral',
    ankiChecking: 'Anki: verificando…',
    ankiConnected: (n: number): string => `Anki conectado · ${cards(n)} do Libregaku`,
    ankiOffline: 'Anki fechado — as palavras aparecem como novas',
    ankiOccupied: (port: number): string => `Outro programa está usando a porta ${port}, então não é possível acessar o Anki`,
    ankiBlocked: 'O Anki recusou esta extensão — a linha a adicionar está em Configurações',
    ankiBusy: 'O Anki não respondeu — pode estar sincronizando',
    ankiRefused: 'O Anki recusou o pedido',
    cardsToAdd: (n: number): string => `${cards(n)} a adicionar`,
    cardsWaiting: (n: number): string => `${cards(n)} aguardando o Anki`,
  },

  sidebar: {
    panelLabel: 'Painel de transcrição',
    resizeLabel: 'Redimensionar o painel',

    // The tabs, and the icon buttons beside them
    tabsLabel: 'Listas',
    transcriptTab: 'Transcrição',
    savedTab: 'Salvas',
    settings: 'Configurações',
    shortcuts: 'Atalhos de teclado',
    close: 'Fechar',
    closeLabel: 'Fechar o painel',
    openTip: 'Transcrição',
    openLabel: 'Mostrar a transcrição',
    help: 'Ajuda',

    // Searching the transcript
    searchPlaceholder: 'Pesquisar na transcrição…',
    searchLabel: 'Pesquisar na transcrição',
    noMatches: 'Nenhum resultado',
    matchAt: (at: number, total: number): string => `${at} de ${total}`,
    matchesFound: (n: number): string => `${n} resultado${s(n)}`,

    // The filter button and its menu
    filterTip: 'Filtrar',
    filterLabel: 'Filtrar linhas',
    filterAll: 'Todas as linhas',
    filterAllAbout: 'Todas as linhas, sem filtro',
    filterNew: 'Com palavras novas',
    filterNewAbout: 'Linhas com alguma palavra sem cartão',
    filterReady: 'Prontas para aprender',
    filterReadyAbout: 'Linhas em que só uma palavra é nova para você — as mais fáceis para aprender',
    filterSaved: 'Salvas',
    filterSavedAbout: 'Linhas que você guardou para depois',

    // The transcript
    partial: 'Montada enquanto você assiste — este player só mostra a linha atual.',
    partialEmpty: 'Nada ainda. As linhas aparecem aqui conforme são faladas.',
    empty: 'Nenhuma transcrição carregada.',
    currentLine: 'Linha atual',
    lineNew: (n: number): string => `${n} nova${s(n)}`,
    playFrom: (time: string): string => `Reproduzir a partir de ${time}`,
    saveLine: 'Salvar linha',
    unsave: 'Remover das salvas',
    addSentence: 'Adicionar frase',
    addSentenceLabel: 'Adicionar a frase ao Anki',

    // The summary over the transcript: a name, then its number, which suits any count
    knownPercent: (n: number): string => `${n}%`,
    summaryKnown: 'Conhecidas: {n}',
    summaryNew: 'Novas: {n}',
    summaryReady: 'Prontas para aprender: {n}',
    counting: (percent: number): string => `Contando palavras novas… ${percent}%`,
    countFailed: 'Algumas linhas não puderam ser contadas, então não há totais.',

    // The card that shows a word's meaning while the pointer is over it
    dictionaryLoading: (percent: number): string => `Carregando o dicionário — ${percent}%`,
    dictionaryUnavailable: 'Dicionário indisponível',
    noEntry: 'Não está no dicionário.',

    // The Saved tab
    savedEmpty:
      'Nada salvo ainda. Use o marcador em qualquer linha da transcrição — ou pressione B — para guardar uma frase ' +
      'à qual você quer voltar.',
    thisVideo: 'este vídeo',
    openAt: (time: string): string => `Abrir o vídeo em ${time}`,
    remove: 'Remover',
    removeLabel: 'Remover das salvas',
    copySavedAbout: 'Copiar todas as linhas salvas como texto separado por tabulações',
    exportSavedAbout: 'Salvar um arquivo separado por tabulações que o Anki pode importar',
    addSavedAbout: 'Criar um cartão de cada linha salva',
    linesCopied: (n: number): string => `${n} linha${s(n)} copiada${s(n)}.`,
    chooseDeck: 'Primeiro escolha um baralho em Configurações — é para lá que vão os novos cartões.',
    checkingAnki: 'Verificando o Anki…',
    ankiOffline: 'O Anki não está aberto. Abra-o e tente de novo — os passos estão em Configurações.',
    ankiBlocked: 'O AnkiConnect ainda não permite esta extensão. A linha a adicionar está em Configurações.',
    ankiUnreachable: 'Não foi possível acessar o Anki. Configurações explica por quê.',
    adding: (at: number, total: number): string => `Adicionando ${at} de ${total}…`,
    savedAdded: (added: number, deck: string, already: number): string =>
      `${cards(added)} adicionado${s(added)} a ${deck}` +
      `${already ? `; ${already} já ${already === 1 ? 'estava' : 'estavam'} lá` : ''}.`,

    // Buttons and messages the Saved and Words tabs share
    copy: 'Copiar',
    exportFile: 'Exportar arquivo',
    addToAnki: 'Adicionar ao Anki',
    noClipboard: 'Não foi possível acessar a área de transferência.',
    downloaded: 'Salvo nos seus downloads. No Anki: Arquivo → Importar.',
    downloadBlocked: 'Esta página bloqueou o download — use Copiar.',

    // The Words tab
    listsLabel: 'Qual lista',
    listLines: 'Linhas',
    listTracked: 'Acompanhadas',
    listKnown: 'Conhecidas',
    listIgnored: 'Ignoradas',
    findPlaceholder: 'Pesquisar…',
    findLabel: 'Pesquisar nesta lista',
    copyWordsAbout: 'Copiar esta lista como texto separado por tabulações',
    exportWordsAbout: 'Salvar esta lista como arquivo separado por tabulações que o Anki pode importar',
    wordsCopied: (n: number): string => `${words(n)} copiada${s(n)}.`,
    nothingToExport: 'Não há nada nesta lista para exportar.',
    lookingUp: 'Buscando leituras e significados…',
    noWordMatches: (query: string): string => `Nenhuma palavra desta lista corresponde a “${query}”.`,
    noLineMatches: (query: string): string => `Nenhuma linha salva corresponde a “${query}”.`,
    wordsMatching: (shown: number, total: number): string => `${shown} de ${words(total)}.`,
    trackedEmpty:
      'Nenhuma palavra acompanhada ainda. Acompanhar sublinha uma palavra para você notá-la, sem criar cartão. ' +
      'Ative o botão em Configurações, em Pop-up da palavra.',
    trackedIntro: (n: number): string =>
      n === 1
        ? 'Você acompanha 1 palavra, sublinhada sempre que aparece.'
        : `Você acompanha ${n} palavras, sublinhadas sempre que aparecem.`,
    stopTracking: 'Parar de acompanhar',
    knownEmpty:
      'Nenhuma palavra marcada como conhecida. Quando você conhecer uma palavra e não quiser um cartão, marque-a como ' +
      'conhecida no pop-up dela, ou pressione K.',
    knownIntro: (n: number): string =>
      `${words(n)} marcada${s(n)} como conhecida${s(n)}. ` +
      'Desmarque uma palavra e ela volta a seguir o que seus cartões do Anki dizem.',
    unmarkKnown: 'Desmarcar como conhecida',
    ignoredEmpty:
      'Nenhuma palavra ignorada. Ignore nomes e sons no pop-up deles, e eles nunca serão sublinhados nem contados.',
    ignoredIntro: (n: number): string =>
      n === 1 ? '1 palavra nunca sublinhada nem contada.' : `${n} palavras nunca sublinhadas nem contadas.`,
    stopIgnoring: 'Parar de ignorar',
  },

  popup: {
    // The card, and the word at its head
    cardLabel: (word: string): string => `${word} — dicionário`,
    commonBadge: 'comum',
    nameBadge: 'provavelmente um nome',
    characterNames: { kanji: 'Kanji', hanzi: 'Caracteres' },
    partOfSpeech: {
      n: 'substantivo', 'n-adv': 'substantivo adverbial', 'n-t': 'substantivo temporal', 'n-suf': 'sufixo nominal',
      'n-pref': 'prefixo nominal', pn: 'pronome', 'adj-i': 'adjetivo -i', 'adj-na': 'adjetivo -na',
      'adj-no': 'adjetivo -no', 'adj-pn': 'adjetivo pré-nominal', adv: 'advérbio', 'adv-to': 'advérbio',
      aux: 'auxiliar', 'aux-v': 'verbo auxiliar', 'aux-adj': 'adjetivo auxiliar',
      conj: 'conjunção', cop: 'cópula', ctr: 'contador', exp: 'expressão', int: 'interjeição',
      num: 'numeral', prt: 'partícula', pref: 'prefixo', suf: 'sufixo', unc: 'não classificado',
      vs: 'verbo suru', 'vs-i': 'verbo suru', 'vs-s': 'verbo suru', vt: 'transitivo', vi: 'intransitivo',
      v1: 'verbo ichidan', 'v1-s': 'verbo ichidan', vk: 'verbo kuru', vz: 'verbo zuru',
      v5b: 'verbo godan', v5g: 'verbo godan', v5k: 'verbo godan', 'v5k-s': 'verbo godan',
      v5m: 'verbo godan', v5n: 'verbo godan', v5r: 'verbo godan', 'v5r-i': 'verbo godan',
      v5s: 'verbo godan', v5t: 'verbo godan', v5u: 'verbo godan', 'v5u-s': 'verbo godan',
      v5aru: 'verbo godan',
      // Wiktionary's codes, for Korean and Spanish words: what kind of word, then its grammar
      name: 'nome próprio', v: 'verbo', adj: 'adjetivo', pron: 'pronome', det: 'determinante', artic: 'artigo',
      counter: 'contador', prep: 'preposição', 'prep-phrase': 'locução prepositiva', ptcl: 'partícula',
      intj: 'interjeição', phrase: 'locução', prov: 'provérbio', r: 'raiz', char: 'caractere', adn: 'adnominal',
      ptcpl: 'particípio', contr: 'contração',
      masc: 'masculino', fem: 'feminino', neut: 'neutro', sg: 'singular', pl: 'plural', 'pl-only': 'só plural',
      count: 'contável', uncount: 'incontável', vr: 'reflexivo', vdt: 'bitransitivo', impers: 'impessoal',
      irreg: 'irregular', reltnl: 'relacional', reltv: 'relativo', interr: 'interrogativo', poss: 'possessivo',
      dim: 'diminutivo', aug: 'aumentativo', onoma: 'onomatopeico',
      // And how or when the word is used
      idio: 'idiomático', fig: 'figurado', literal: 'literal', col: 'coloquial', inf: 'informal', fam: 'familiar',
      formal: 'formal', polite: 'polido', lit: 'literário', poet: 'poético', rhet: 'retórico', sl: 'gíria',
      vulg: 'vulgar', derog: 'pejorativo', offens: 'ofensivo', humor: 'humorístico', euph: 'eufemístico',
      child: 'infantil', net: 'internet', neol: 'neologismo', cmn: 'comum', uncmmn: 'pouco comum', rare: 'raro',
      dated: 'antiquado', arch: 'arcaico', obs: 'obsoleto', hist: 'histórico', 'non-std': 'não padrão',
      dialect: 'dialetal', regio: 'regional',
    },

    // The row of icon buttons under the word
    pronounce: 'Ouvir',
    playedRecording: (word: string): string => `${word} · gravação`,
    playedSynthesised: (word: string): string => `${word} · voz sintética`,
    recordingBy: (speaker: string, licence: string): string => `Gravação de ${speaker} · ${licence}`,
    pronounceFailed: 'não foi possível tocar o áudio',
    addSentence: 'Adicionar frase',
    sentenceAdded: 'Frase adicionada',
    undo: 'Desfazer',
    copyWord: 'Copiar palavra',
    copyPhrase: 'Copiar expressão',
    copySentence: 'Copiar frase',
    wordCopied: 'palavra copiada',
    phraseCopied: 'expressão copiada',
    sentenceCopied: 'frase copiada',
    copyFailed: 'não foi possível copiar — selecione o texto',

    // The meanings
    dictionaryLoading: (percent: number): string =>
      `O dicionário ainda está carregando — ${percent}%. Tente de novo em instantes.`,
    dictionaryUnavailable: (error: string): string => `Dicionário indisponível: ${error}`,
    noEntry: 'Esta palavra não está no dicionário.',
    noEntryName: 'Um nome, por isso não há verbete no dicionário.',
    moreMeanings: (n: number): string => `+${n} ${n === 1 ? 'significado' : 'significados'}`,

    // The word's other lines in this video
    elsewhereCount: (n: number): string => (n === 1 ? 'Mais uma vez neste vídeo' : `Mais ${n} vezes neste vídeo`),
    playLine: 'Reproduzir',
    elsewhereMore: (n: number): string => `e mais ${n} — a pesquisa da transcrição encontra todas`,
    showAllInTranscript: 'Mostrar todas na transcrição',

    // Add
    addToAnki: 'Adicionar ao Anki',
    addToDeck: (deck: string): string => `Adicionar a ${deck}`,
    adding: 'Adicionando…',
    undoing: 'Desfazendo…',
    added: 'Adicionado',
    addedUndo: 'Adicionado — desfazer',
    inAnki: 'No Anki',
    showInAnki: 'Mostrar no Anki',
    waiting: 'Aguardando',
    waitingForAnki: 'Aguardando o Anki',
    goesInWhenAnkiOpens: 'Entra no Anki quando ele abrir',
    alreadyAdded: 'Já adicionado',
    alreadyInAnki: 'Já está no Anki',
    waitingForAnkiToOpen: 'Aguardando o Anki abrir',
    addedWithWarning: (said: string, warning: string): string => `${said} — ${warning}`,

    // The deck menu
    otherDecks: 'Outros baralhos',
    addToAnotherDeck: 'Adicionar a outro baralho',
    decksUnknown: 'O Anki não está respondendo, então os baralhos dele ainda não são conhecidos.',
    newDeck: 'Novo baralho…',
    newDeckPrompt: 'Novo baralho — use :: para um sub-baralho, como em Japonês::Netflix',

    // The marks
    knownButton: 'Conhecida',
    trackButton: 'Acompanhar',
    ignoreButton: 'Ignorar',
    markKnownTip: 'Marcar como conhecida',
    trackTip: 'Acompanhar',
    ignoreTip: 'Ignorar',
    unmarkKnownTip: 'Desmarcar como conhecida',
    stopTrackingTip: 'Parar de acompanhar',
    stopIgnoringTip: 'Parar de ignorar',
  },

  header: {
    knownStat: 'Conhecidas: {percent}',
    knownPercent: (percent: number): string => `${percent}%`,
    knownTip: 'Palavras que você conhece',
    readyStat: 'Prontas para aprender: {count}',
    readyTip: 'Linhas com uma palavra nova',
    blurSubtitle: 'Desfocar legenda',
    unblurSubtitle: 'Focar legenda',
    showTranslation: 'Mostrar tradução',
    hideTranslation: 'Ocultar tradução',
    hideSubtitles: 'Ocultar legendas',
    showSubtitles: 'Mostrar legendas',
    subtitles: 'Legendas',
    translation: 'Tradução',
    transcript: 'Transcrição',
    pinHeader: 'Fixar barra superior',
    unpinHeader: 'Desafixar barra superior',
    settings: 'Configurações',
    showHeader: 'Mostrar barra superior',
  },

  player: {
    // The player's keys
    lastLine: 'Essa foi a última linha',
    noLineBefore: 'Não há linha anterior',
    translationOn: 'Tradução ativada',
    translationOff: 'Tradução desativada',
    subtitlesOff: 'Legendas desativadas',
    subtitlesOn: 'Legendas ativadas',
    blurOn: 'Legenda desfocada até você passar o cursor',
    blurOff: 'Legenda visível',
    lineSaved: 'Linha salva',
    lineUnsaved: 'Linha removida das salvas',
    lookUpFirst: 'Consulte uma palavra primeiro',
    alreadyKnown: (word: string): string => `${word} · já conhecida no Anki`,
    alreadyInAnki: (word: string): string => `${word} · já está no Anki`,
    adding: (word: string): string => `Adicionando ${word}…`,
    wordResult: (word: string, said: string): string => `${word} · ${said}`,

    // Marks
    markOff: (word: string): string => `${word} · marcação removida`,
    marked: (word: string, status: OverrideStatus, refused: boolean): string => {
      const done = {
        known: 'marcada como conhecida', tracking: 'acompanhada', ignored: 'ignorada', unknown: 'marcada como nova',
      }[status];
      if (refused) return `${word} · ${done}, sem cartão — o Anki recusou; nova tentativa mais tarde`;
      return `${word} · ${done}, sem cartão${status === 'tracking' ? '. Veja a aba Salvas do painel' : ''}`;
    },

    // A word's card
    pickDeck: 'Escolha um baralho nas configurações do Libregaku primeiro',
    added: (deck: string, missing: readonly MissingMedia[]): string =>
      missing.length ? `adicionado a ${deck} — sem ${without(missing)}` : `adicionado a ${deck}`,
    alreadyIn: (deck: string): string => `já está em ${deck}`,
    queued: (deck: string): string => `O Anki está fechado — o cartão vai para ${deck} quando ele abrir`,
    alreadyQueued: 'já está aguardando o Anki',
    notKept: 'O Anki está fechado, e o navegador não guardou o cartão para depois',
    takenBack: (deck: string): string => `removido de ${deck}`,
    unqueued: 'não está mais aguardando o Anki',
    alreadySent: 'Já foi para o Anki',
    queueSent: (count: number): string =>
      `O Anki está aberto — ${count === 1 ? 'o cartão guardado foi adicionado' : `${count} cartões guardados foram adicionados`}`,
    deckOutsideScope: (scope: string, deck: string): string =>
      `as palavras que você conhece são lidas de ${scope}, então os cartões em ${deck} não vão contar`,

    // A sentence card
    sentenceAdded: (deck: string, missing: readonly MissingMedia[]): string =>
      missing.length ? `frase adicionada a ${deck} — sem ${without(missing)}` : `frase adicionada a ${deck}`,
    sentenceAlreadyIn: (deck: string): string => `a frase já está em ${deck}`,
    sentenceQueued: (deck: string, sound: boolean, picture: boolean): string => {
      const lacking = [sound && 'som', picture && 'imagem'].filter(Boolean);
      return `O Anki está fechado — a frase vai para ${deck} quando ele abrir` +
        `${lacking.length ? `, sem ${lacking.join(' nem ')}` : ''}`;
    },
    sentenceAlreadyQueued: 'a frase já está aguardando o Anki',
    sentenceTakenBack: (deck: string): string => `frase removida de ${deck}`,

    // Making a card's sentence audio
    recording: 'Gravando a linha…',

    // Lookups
    noDictionary: 'ainda não há dicionário para este idioma.',
  },

  notices: {
    // The card itself
    unexpected: 'O Libregaku encontrou um problema inesperado.',
    dismiss: 'Dispensar',

    // YouTube or Netflix changed something the extension reads
    youtubeTrackList: 'Não foi possível ler a lista de legendas do YouTube.',
    youtubeTrackShape: 'Os dados de legendas do YouTube não estão no formato esperado.',
    youtubeCaptionText: 'Não foi possível encontrar o texto das legendas do YouTube na página.',
    youtubePlayerTrackList: 'Não foi possível ler a lista de legendas deste vídeo no player do YouTube.',
    netflixTrackList: 'Não foi possível ler a lista de legendas da Netflix.',
    netflixCaptionText: 'Não foi possível encontrar o texto das legendas da Netflix na página.',
    disneyTrackList: 'Não foi possível ler a lista de legendas da Disney+.',
    appleTrackList: 'Não foi possível ler a lista de legendas do Apple TV.',
    appleTiming: 'Não foi possível alinhar as legendas do Apple TV ao vídeo.',
    disneyCaptionText: 'Não foi possível encontrar o texto das legendas da Disney+ na página.',
    primeTrackList: 'Não foi possível ler a lista de legendas da Prime Video.',
    primeCaptionText: 'Não foi possível encontrar o texto das legendas da Prime Video na página.',
    maxTrackList: 'Não foi possível ler a lista de legendas da HBO Max.',
    maxCaptionText: 'Não foi possível encontrar o texto das legendas da HBO Max na página.',
    vikiTrackList: 'Não foi possível ler a lista de legendas do Viki.',
    vikiCaptionText: 'Não foi possível encontrar o texto das legendas do Viki na página.',
    netflixBlocked: 'A Netflix bloqueou a parte do Libregaku que lê as legendas.',

    // This video's subtitles
    subtitlesOff: 'Ative as legendas no player e o Libregaku vai detectá-las.',
    trackNotSent: 'O player ainda não carregou estas legendas.',
    noTargetTrack: 'Não há legendas aqui no idioma que você está aprendendo.',
    noSecondTrack: 'Não há legendas aqui no seu idioma, então não há segunda linha.',
    onlyOneTrack: 'Este vídeo tem só uma faixa de legendas, então não há segunda linha.',
    autoGenerated: 'Estas legendas são geradas automaticamente, então o texto e a divisão das palavras serão imprecisos.',
    noSubtitles: 'Este vídeo não tem legendas.',
    secondTrackFailed: 'Não foi possível carregar a segunda linha.',

    // The extension's own parts
    analyserUnavailable:
      'Leituras e formas de dicionário estão desativadas: o analisador do idioma não carregou. ' +
      'As palavras só correspondem aos seus cartões pela grafia exata.',
    markNotSaved: 'Não foi possível salvar essa marcação. Ela vale até você recarregar a página; depois, se perde.',
    marksNotSynced: 'Não foi possível salvar suas marcações no Anki. Elas ficam neste navegador e serão enviadas de novo.',
    cardsNotAdded:
      'O Anki não aceitou alguns dos cartões guardados enquanto estava fechado. Eles continuam guardados e serão enviados de novo.',
    extensionReloaded: 'O Libregaku foi atualizado ou reiniciado. Recarregue esta aba para voltar a consultar palavras.',

    // Details
    playerNeverLoaded: 'O player não terminou de carregar.',
    subtitlesMaybeOff: 'Talvez as legendas só estejam desativadas no player.',
    lookedFor: (selector: string): string => `Procurado: ${selector}`,
    noTargetTrackDetail: (languages: readonly string[]): string =>
      `Legendas deste vídeo: ${languages.join(', ') || 'nenhuma'}. ` +
      'Mude o idioma que você está aprendendo nas configurações ou escolha outro vídeo.',
    onlyPictures: 'Neste vídeo, elas existem só como imagens, não como texto, então o Libregaku não consegue lê-las.',
    chooseInPlayer: (track: string): string => `Escolha ${track} no menu de legendas do player e o Libregaku vai detectá-las.`,
    noHumanTrack: 'Não havia uma faixa escrita por uma pessoa para este vídeo.',
    secondTrackError: (track: string, error: string): string => `${track}: ${error}`,
    noSecondTrackDetail: (languages: readonly string[]): string => `Legendas deste vídeo: ${languages.join(', ')}.`,
    analyserDidNotLoad: 'o analisador não carregou',
  },

  anki: {
    // Reaching AnkiConnect
    offline: (port: number): string => `Nada está escutando na porta ${port}.`,
    timeout: (port: number, seconds: number): string =>
      `Nada respondeu na porta ${port} em ${seconds} s. ` +
      'O Anki pode estar ocupado (sincronizando ou mostrando uma janela), ou outro programa está ocupando a porta.',
    blocked: (origin: string): string =>
      `O AnkiConnect recusou ${origin}. No Anki: Ferramentas → Extensões → AnkiConnect → Configurar, ` +
      'e adicione essa linha em webCorsOriginList.',
    httpAnswer: (port: number, status: number): string =>
      `Algo na porta ${port} respondeu com HTTP ${status}. O AnkiConnect não responde assim.`,
    notAnkiConnect: (port: number): string => `Algo que não é o AnkiConnect está usando a porta ${port}.`,
    noBackground: 'O processo em segundo plano da extensão não está respondendo.',
    unreachable: 'Não é possível acessar o Anki.',
    callFailed: 'A chamada ao AnkiConnect falhou.',

    // Libregaku refusing to send Anki something it does not use
    notRelayed: (action: string): string => `O Libregaku não envia “${action}” ao AnkiConnect.`,
    mediaNotFetched: (media: 'audio' | 'video' | 'picture'): string =>
      `O Libregaku só anexa ${MEDIA_WHAT[media]} que ele mesmo baixou.`,
    mediaEmpty: (media: 'audio' | 'video' | 'picture'): string => `${MEDIA_THE[media]} desta nota não tem dados.`,
    mediaName: (prefix: string): string => `Os arquivos que o Libregaku adiciona se chamam ${prefix}…, e este não.`,
    idsNeeded: (action: string, ids: 'notes' | 'cards'): string =>
      `${action} precisa de uma lista de ${ids === 'notes' ? 'notas' : 'cartões'}.`,
    notMarks: (count: number, ids: 'notes' | 'cards', change: 'delete' | 'suspend' | 'retag'): string =>
      `Recusado: ${count} ${ids === 'notes' ? 'das notas enviadas' : 'dos cartões enviados'} ` +
      `não ${count === 1 ? 'pertence' : 'pertencem'} a nenhuma marcação do Libregaku. ` +
      `O Libregaku só ${change === 'delete' ? 'exclui' : change === 'suspend' ? 'suspende' : 'muda as etiquetas de'} ` +
      'suas próprias marcações' +
      (change === 'delete' ? ', e um cartão que criou nos últimos minutos e que ainda não foi estudado.' : '.'),

    // The note types Libregaku makes in Anki
    noteTypeMismatch: (noteType: string, fields: readonly string[], loses: 'cards' | 'notes'): string =>
      `O tipo de nota “${noteType}” no seu Anki não tem ${fields.length === 1 ? 'o campo' : 'os campos'} ` +
      `${fields.join(', ')}, então ${loses === 'cards' ? 'os cartões' : 'as notas'} ` +
      `${fields.length === 1 ? 'perderiam esse campo' : 'perderiam esses campos'}. ` +
      'O Libregaku não altera um tipo de nota que você pode ter editado: ' +
      `no Anki, em Ferramentas → Gerenciar Tipos de Notas, renomeie “${noteType}” (ou adicione os campos de volta), ` +
      'depois clique em Verificar de novo e um novo será instalado.',

    // Marks and waiting cards
    marksNotAdded: (count: number): string =>
      `O Anki não adicionou ${count} das marcações. Elas continuam na fila e serão enviadas de novo na próxima vez.`,
    marksNotStored: (cause: string): string => `O armazenamento do navegador recusou as marcações lidas do Anki: ${cause}`,
    storageUnreadable: (cause: string): string => `Não foi possível ler o armazenamento do navegador: ${cause}`,
  },

  errors: {
    // Recording a tab's sound for sentence audio
    captureNotAllowed: 'Primeiro, permita o áudio da frase neste site nas configurações do Libregaku.',
    captureRefused: 'O Chrome não permitiu capturar esta guia',

    // A subtitle track that would not load
    unknownTrack: (id: string): string => `faixa desconhecida ${id}`,
    trackNotSent: 'o player ainda não a carregou; escolha-a uma vez no menu de legendas do player',
    noCaptionFormat: (attempts: readonly string[]): string =>
      `nenhum formato de legenda funcionou — ${attempts.join(', ')}`,
    noSubtitleUrl: (attempts: readonly string[]): string =>
      `nenhuma URL de legenda funcionou — ${attempts.join('; ') || 'nenhuma listada'}`,
    emptyAnswer: 'resposta vazia',
    noCues: '0 linhas',
    noCuesParsed: 'nenhuma linha lida',
    noAnswerWithin: (seconds: number): string => `sem resposta em ${seconds} s`,

    // A track's name
    forcedTrack: (track: string): string => `${track} (forçada)`,

    // The dictionary and the analyser
    noAnswer: 'a extensão não responde — recarregue a página para reiniciá-la',
    analyserLoading: 'o analisador ainda está carregando',
    dictionaryLoading: 'o dicionário ainda está carregando',
    lookupFailed: 'a consulta falhou',
  },

  grammar: {
    // Tense and politeness
    past: 'passado',
    polite: 'polido',

    // Not doing it
    negative: 'negativo',
    'negative intent': 'volitiva negativa',
    without: 'sem fazer',

    // If and when
    conditional: 'condicional',
    whenever: 'sempre que',

    // Who does it, and whether it can be done
    passive: 'passiva',
    'passive or potential': 'passiva ou potencial',
    potential: 'potencial',
    causative: 'causativa',

    // Wanting
    'want to': 'querer',
    'seems to want to': 'parece querer',
    'want someone to': 'querer que alguém faça',

    // How the speaker knows it, and how sure they are
    seems: 'parece',
    'seems like': 'parece que',
    hearsay: 'ouvi dizer',
    apparently: 'aparentemente',
    probably: 'provavelmente',
    might: 'talvez',

    // What should happen, or is meant to
    'ought to': 'deveria',
    'supposed to': 'supostamente',
    'intends to': 'intenção',

    // Having to, and being allowed to
    must: 'ter que',
    'must not': 'não pode',
    "don't have to": 'não precisa',
    may: 'pode',

    // Commands, requests and "let's"
    imperative: 'imperativo',
    volitional: 'volitiva',
    'polite command': 'ordem polida',
    please: 'pedido',

    // Joining to what comes next
    'te-form': 'forma -te',
    listing: 'enumeração',
    while: 'enquanto',
    because: 'porque',
    'even though': 'embora',
    'in order to': 'para',
    'so that': 'para que',

    // Helper verbs after the te-form
    ongoing: 'em andamento',
    'resulting state': 'estado resultante',
    'completely, or regrettably': 'por completo, ou com pesar',
    'in advance': 'de antemão',
    'try doing': 'experimentar',
    'going forward': 'seguir adiante',
    'coming to be': 'vir a ser',
    'receive the favour': 'receber o favor',
    'someone does for me': 'alguém faz por mim',
    'do for someone': 'fazer por alguém',

    // Helper verbs after the verb's stem
    'too much': 'demais',
    'easy to': 'fácil de',
    'hard to': 'difícil de',
    'start to': 'começar a',
    'keep on': 'continuar a',
    finish: 'terminar de',
    again: 'de novo',
    'each other': 'um ao outro',
    completely: 'por completo',
    thoroughly: 'a fundo',
    around: 'por todo lado',
    'non-stop': 'sem parar',

    // Forms of a Spanish word
    or: 'ou',
    'first-person': 'primeira pessoa',
    'second-person': 'segunda pessoa',
    'third-person': 'terceira pessoa',
    singular: 'singular',
    plural: 'plural',
    masculine: 'masculino',
    feminine: 'feminino',
    present: 'presente',
    preterite: 'pretérito perfeito',
    imperfect: 'pretérito imperfeito',
    'imperfect-se': 'pretérito imperfeito (-se)',
    future: 'futuro',
    'conditional-mood': 'condicional',
    indicative: 'indicativo',
    subjunctive: 'subjuntivo',
    infinitive: 'infinitivo',
    gerund: 'gerúndio',
    participle: 'particípio',
    formal: 'formal',
    informal: 'informal',
    'with-tú': 'com tú',
    'with-vos': 'com vos',
    'vos-form': 'forma de vos',
    voseo: 'voseo',
    'second-person-semantically': 'sentido de “você”',
    accusative: 'com objeto direto',
    dative: 'com objeto indireto',
    'object-first-person': 'objeto de primeira pessoa',
    'object-second-person': 'objeto de segunda pessoa',
    'object-third-person': 'objeto de terceira pessoa',
    'object-singular': 'objeto singular',
    'object-plural': 'objeto plural',
    diminutive: 'diminutivo',
    augmentative: 'aumentativo',
    superlative: 'superlativo',
    alternative: 'variante',
    'alt-of': 'outra grafia',

    // Korean endings
    honorific: 'honorífico',
    'future or guess': 'futuro ou suposição',
    'formal polite': 'polido formal',
    question: 'pergunta',
    but: 'mas',
    "let's": 'vamos',
    plain: 'estilo simples',
    'shall we, or I wonder': 'que tal, ou será que',
    'I will': 'promessa',
    'just noticed': 'constatação',
    'as you know': 'como você sabe',
    and: 'e',
    'because, or and then': 'porque, ou e então',
    'but, or given that': 'mas, ou já que',
    'even if': 'mesmo que',
    whether: 'se ou não',
    'adverb form': 'forma adverbial',
    quoting: 'discurso indireto',
    'used to': 'costumava',
    topic: 'tópico',
    subject: 'sujeito',
    object: 'objeto',
    possessive: 'possessivo',
    'come to': 'acabar por',
    when: 'quando',
    modifier: 'modificador',
    'noun form': 'forma nominal',
    becomes: 'tornar-se',
    'have done before': 'já ter feito',
    nominative: 'nominativo',
    genitive: 'genitivo',
    'accusative-case': 'acusativo',
    'dative-case': 'dativo',
    neuter: 'neutro',
    definite: 'definido',
    indefinite: 'indefinido',
    comparative: 'comparativo',
    strong: 'forte',
    weak: 'fraco',
    mixed: 'misto',
    'without-article': 'sem artigo',
    reflexive: 'reflexivo',
    'non-past': 'não passado',
    dual: 'dual',
    jussive: 'jussivo',
    construct: 'estado construto',
    'attached-and': 'e',
    'attached-so': 'então, assim',
    'attached-with': 'com, em, por',
    'attached-for': 'para, a',
    'attached-like': 'como',
    'attached-my': 'meu',
    'attached-your': 'teu, seu',
    'attached-his': 'dele',
    'attached-her': 'dela',
    'attached-its': 'dele, dela',
    'attached-our': 'nosso',
    'attached-their': 'deles',
    'attached-me': 'me',
    'attached-you': 'te, você',
    'attached-him': 'o, lhe',
    'attached-her-object': 'a, lhe',
    'attached-us': 'nos',
    'attached-them': 'os, lhes',
    locative: 'locativo',
    ablative: 'ablativo',
    instrumental: 'instrumental',
    'that-is': 'o que está',
    assertive: 'como fato',
    habitual: 'habitual',
    having: 'com, de',
  },
  helpChat: {
    heading: 'Faça uma pergunta',
    placeholder: 'Pergunte sobre uma configuração ou como fazer algo',
    label: 'Sua pergunta',
    send: 'Perguntar',
    thinking: 'Pensando…',
    note: 'Respondido no seu dispositivo pelo Gemini Nano, a partir desta ajuda. Pode estar errado.',
    noMatch: 'A ajuda não diz isso. Tente a busca acima.',
    failed: 'O Gemini Nano não conseguiu responder. Tente de novo.',
    installHeading: 'Pergunte à ajuda',
    install: 'O Gemini Nano é um modelo de IA pequeno que roda dentro do Chrome, no seu computador. Baixe uma vez e você poderá fazer perguntas aqui. Nada do que você digita sai do seu dispositivo.',
    download: 'Baixar o Gemini Nano',
    downloading: (percent: number): string => `Baixando… ${percent}%`,
    update: 'O Chrome tem um modelo de IA pequeno embutido, o Gemini Nano, que pode responder perguntas aqui. Atualize o Chrome para usá-lo.',
    unavailable: 'O Chrome tem um modelo de IA pequeno, o Gemini Nano, que pode responder perguntas aqui, mas ele não está pronto neste computador. Ele precisa de espaço livre em disco e talvez seja preciso ativá-lo em chrome://flags.',
    learnMore: 'Sobre o Gemini Nano',
  },
};
