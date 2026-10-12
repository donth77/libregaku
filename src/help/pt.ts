import type { HelpTranslation } from './content';

/** The help in Portuguese (Brazil). A chapter or topic left out shows in English. */
export const pt: HelpTranslation = {
  title: 'Ajuda',
  intro: 'Como o Libregaku funciona e respostas para as dúvidas mais comuns. Pesquise ou escolha um capítulo.',
  search: 'Pesquisar…',
  searchLabel: 'Pesquisar na ajuda',
  none: 'Nada aqui menciona “{q}”.',
  settings: 'Configurações',
  contents: 'Capítulos',
  tipLabel: 'Dica:',
  then: 'depois',
  link: 'Link para este tópico',
  popular: { label: 'Populares:' },
  chapters: [
    {
      id: 'start',
      title: 'Primeiros passos',
      about: 'Três escolhas e depois um vídeo.',
      topics: [
        {
          id: 'get-started',
          title: 'Configurar',
          body: [
            [
              'Em {Configurações → Idiomas}, escolha o idioma que você está aprendendo e o seu idioma.',
              'Baixe o Anki em https://apps.ankiweb.net. Em {Configurações → Anki}, siga os passos para conectar o Anki e escolha o baralho para onde vão os novos cartões.',
              'No YouTube, na Netflix ou em outro site compatível, abra um vídeo com legendas no idioma que você está aprendendo e deixe o cursor sobre uma palavra.',
            ],
            { tip: 'O Anki é opcional. Legendas, consultas e a transcrição funcionam sem ele; é ele que lembra quais palavras você conhece.' },
          ],
          keywords: ['configuração', 'instalar', 'instalação', 'começar', 'início', 'primeira vez', 'idioma', 'setup'],
        },
        {
          id: 'anki',
          title: 'O que é o Anki?',
          body: [
            'O Anki é um app gratuito de flashcards. Ele mostra cada cartão de novo pouco antes de você esquecê-lo (repetição espaçada).',
            'O Libregaku adiciona cartões ao Anki a partir das palavras e frases que você escolhe. Ele também lê seus cartões do Anki para saber quais palavras você já conhece.',
            'Você precisa do Anki no seu computador, com o complemento [AnkiConnect](https://ankiweb.net/shared/info/2055492159). Baixe o Anki em https://apps.ankiweb.net.',
          ],
          keywords: ['cartões de memória', 'srs', 'baixar', 'download', 'instalar', 'revisão', 'revisar', 'add-on'],
        },
      ],
    },
    {
      id: 'watching',
      title: 'Assistindo',
      about: 'Consultar palavras, a transcrição e as teclas.',
      topics: [
        {
          id: 'look-up',
          title: 'Consultar uma palavra',
          body: [
            'Deixe o cursor sobre uma palavra da legenda ou da transcrição e o pop-up dela abre: a leitura, os três primeiros significados e “+N significados” para o resto.',
            'Os kanji e os exemplos do vídeo ocupam uma linha cada no pop-up. Clique em uma para abri-la; ela fica aberta da próxima vez.',
            'Arraste sobre várias palavras para consultar uma expressão. Clique nela de novo, ou pressione `Esc`, para desfazer a seleção.',
            { tip: 'Por padrão, as palavras são consultadas ao passar o cursor. {Configurações → Consulta de palavras → Modo de consulta} muda isso para passar o cursor segurando `Shift`, ou para clicar.' },
          ],
          keywords: ['dicionário', 'definição', 'significado', 'traduzir', 'pesquisar', 'mouse', 'clique', 'hover', 'shift', 'frase', 'kanji'],
        },
        {
          id: 'transcript',
          title: 'Usar o painel de transcrição',
          body: [
            '`S` mostra ou oculta o painel. Clique em uma linha para reproduzir a partir dela; a caixa de pesquisa encontra qualquer linha.',
            'O botão de filtro deixa só as linhas com palavras novas, as que têm exatamente uma ou as que você salvou. O marcador de cada linha, ou `B`, salva uma linha; as linhas salvas vão juntas para o Anki, ou para um arquivo.',
          ],
          keywords: ['barra lateral', 'sidebar', 'painel', 'pesquisar', 'buscar', 'filtrar', 'salvar', 'favorito', 'exportar', 'transcricao'],
        },
        {
          id: 'colours',
          title: 'Mudar as cores dos sublinhados',
          body: [
            'Cada cor de sublinhado mostra o quanto você conhece uma palavra: nova, em aprendizado, acompanhada ou conhecida. {Configurações → Sublinhados} tem um seletor de cor para cada uma, e Redefinir volta às cores padrão.',
            { tip: 'Palavras conhecidas não têm sublinhado, a menos que {Configurações → Sublinhados → Sublinhar palavras conhecidas} esteja ativado.' },
          ],
          keywords: ['cor', 'cores', 'paleta', 'tema', 'aparência', 'personalizar', 'color', 'underline'],
        },
        {
          id: 'keys',
          title: 'Atalhos de teclado',
          body: [
            {
              head: ['Tecla', 'O que faz'],
              rows: [
                ['`←` `→`', 'Linha anterior ou próxima'],
                ['`↓`', 'Repetir a linha'],
                ['`↑`', 'Mostrar ou ocultar a tradução'],
                ['`A`', 'Adicionar ao Anki a palavra do pop-up'],
                ['`K`', 'Marcar a palavra do pop-up como conhecida'],
                ['`B`', 'Salvar a linha atual'],
                ['`S`', 'Mostrar ou ocultar o painel de transcrição'],
                ['`H`', 'Desfocar ou focar as legendas'],
                ['`R`', 'Alternar furigana, pinyin ou Jyutping: desativado, palavras novas, todas (japonês, chinês (mandarim), cantonês)'],
                ['`Shift`', 'Segure para consultar a palavra sob o cursor, quando {Configurações → Consulta de palavras → Modo de consulta} está em “Passar o cursor segurando Shift”'],
                ['`Esc`', 'Fechar o pop-up'],
              ],
            },
            'O botão de teclado no painel de transcrição lista os atalhos enquanto você assiste.',
            'Desative {Configurações → Legendas → Atalhos de uma tecla} para usar as teclas de letra só segurando `Alt` e `Shift`.',
            'Sem mouse: use `Tab` para chegar a uma palavra da legenda e pressione `Enter` para consultá-la; `←` `→` passam de uma palavra para outra. Na transcrição, `↑` `↓` passam de uma linha para outra.',
          ],
          keywords: ['atalho', 'teclado', 'teclas', 'tecla de atalho', 'shortcut', 'hotkey', 'acessibilidade', 'leitor de tela', 'alt', 'tab'],
        },
      ],
    },
    {
      id: 'cards',
      title: 'Criando cartões',
      about: 'Uma palavra, ou uma linha inteira, no Anki.',
      topics: [
        {
          id: 'add-card',
          title: 'Criar um cartão',
          body: [
            'Clique em Adicionar ao Anki no pé do pop-up de uma palavra, ou pressione `A`. O cartão leva a palavra, a leitura e o significado, a frase e a tradução, uma gravação da palavra, o som da própria linha e uma imagem dela.',
            { tip: 'Criou um por engano? Clique em Adicionado em poucos minutos para desfazer.' },
            'Uma palavra que o Anki já tem mostra No Anki; clique para ver a palavra no Anki. Se o Anki estiver fechado, o novo cartão espera no navegador e entra quando o Anki responder de novo.',
          ],
          keywords: ['flashcard', 'anki', 'adicionar', 'desfazer', 'remover', 'excluir', 'card'],
        },
        {
          id: 'add-line',
          title: 'Criar um cartão de uma frase inteira',
          body: [
            'No pop-up de uma palavra, o balão de fala com um + cria, em vez disso, um cartão da frase inteira, com o som e uma captura de tela. Cada linha da transcrição tem o mesmo botão quando você passa o cursor sobre ela.',
          ],
          keywords: ['frase', 'linha', 'cartão de frase', 'linha inteira', 'oração', 'sentence'],
        },
        {
          id: 'sentence-audio',
          title: 'Áudio da frase',
          body: [
            'Quando você adiciona um cartão a partir da legenda ou da transcrição, seja de uma palavra, de uma expressão ou da frase inteira, o Libregaku grava essa linha do vídeo e coloca a gravação no cartão. Na revisão, você ouve a frase como ela foi dita.',
            'O Chrome só consegue gravar enquanto o vídeo toca, então a linha toca mais uma vez e depois o vídeo volta para onde você estava.',
            { tip: 'Salvar uma linha não grava nada, nem adicionar um cartão pelas listas de Salvas. {Configurações → Cartões do Anki → Áudio da frase} desativa a gravação.' },
          ],
          keywords: ['áudio', 'som', 'gravação', 'gravar', 'repetir', 'voz', 'ouvir', 'audio'],
        },
        {
          id: 'decks',
          title: 'Escolher o baralho',
          body: [
            'Os novos cartões vão para o baralho em {Configurações → Anki → Novos cartões vão para}.',
            'Cada idioma que você aprende tem o próprio baralho. Até você escolher um, os cartões dele vão para um baralho criado para ele junto com o primeiro cartão: Libregaku-JA para o japonês, Libregaku-ES para o espanhol. Mude {Configurações → Idiomas → Estou aprendendo} e o baralho muda junto.',
            'Para trocar durante o vídeo, ative {Configurações → Pop-up da palavra → Menu de baralhos}. Um ▾ aparece ao lado de Adicionar ao Anki; “Adicionar a” um baralho adiciona o cartão nele e manda os próximos para lá também.',
            { tip: 'O status das palavras é lido de {Configurações → Anki → Ler palavras conhecidas de}. Se os novos cartões vão para um baralho que não é lido, Configurações avisa.' },
          ],
          keywords: ['deck', 'sub-baralho', 'subbaralho', 'novo baralho', 'criar baralho', 'mudar baralho'],
        },
      ],
    },
    {
      id: 'marking',
      title: 'Marcando palavras',
      about: 'Conhecida, Acompanhar e Ignorar — nenhum deles cria cartão.',
      topics: [
        {
          id: 'marks',
          title: 'Conhecida, Acompanhar e Ignorar',
          body: [
            'Os botões pequenos ao lado da palavra, no pop-up dela.',
            [
              'Conhecida (`K`): você conhece a palavra — sem sublinhado, e ela conta como conhecida.',
              'Acompanhar: um sublinhado roxo, para você notar a palavra quando ela aparecer.',
              'Ignorar: nomes e sons — nunca sublinhados, nunca contados.',
            ],
            'Clique em uma marcação de novo para removê-la, ou encontre a palavra na aba Salvas do painel de transcrição.',
          ],
          keywords: ['marcar', 'marcação', 'conhecidas', 'acompanhadas', 'ignoradas', 'sublinhado', 'roxo', 'known', 'track', 'ignore'],
        },
        {
          id: 'tracked',
          title: 'Ver e mudar suas palavras marcadas',
          body: [
            'No painel de transcrição, a aba Salvas lista as linhas que você salva e as palavras que você acompanha, marca como conhecidas ou ignora, uma lista para cada. Cada palavra tem um botão para tirar a marcação — Parar de ignorar, para uma ignorada — e uma palavra acompanhada pode virar cartão dali.',
            'Cada idioma tem as próprias listas. A aba Salvas mostra as do idioma que você está aprendendo, e uma palavra marcada em um idioma não fica marcada em outro.',
            'Cada lista tem uma caixa de pesquisa e os botões Copiar e Exportar arquivo, que dão a lista como um arquivo que o Anki e as planilhas abrem.',
          ],
          keywords: ['acompanhar', 'acompanhadas', 'conhecidas', 'ignoradas', 'lista', 'desmarcar', 'remover marcação', 'planilha', 'excel', 'watchlist'],
        },
      ],
    },
    {
      id: 'supported-sites',
      title: 'Sites compatíveis',
      about: 'Os sites em que o Libregaku funciona e o que muda entre eles.',
      topics: [
        {
          id: 'supported-sites-list',
          title: 'Em que sites funciona?',
          body: [
            'O Libregaku desenha legendas interativas sobre o vídeo nesses sites. Usa as legendas que o próprio site oferece, no idioma que você está aprendendo.',
            {
              head: ['Site', 'Áudio da frase e captura de tela'],
              rows: [
                ['YouTube', 'Tirados do vídeo.'],
                ['Netflix', 'Gravado da guia; sem captura de tela.'],
                ['Disney+', 'Gravado da guia; sem captura de tela.'],
                ['Prime Video', 'Gravado da guia; sem captura de tela.'],
                ['Max', 'Gravado da guia; sem captura de tela.'],
              ],
            },
            'O capítulo sobre sites protegidos explica como o som é gravado da guia. Um vídeo sem legendas no idioma que você está aprendendo não tem nada para mostrar, e o Libregaku avisa.',
          ],
          keywords: ['youtube', 'netflix', 'disney', 'prime video', 'max', 'hbo', 'sites', 'compatíveis', 'streaming'],
        },
      ],
    },
    {
      id: 'protected-sites',
      title: 'Sites protegidos',
      about: 'Os sites que criptografam o vídeo: Netflix, Disney+, Prime Video e Max. O que essa proteção muda.',
      topics: [
        {
          id: 'protected-sites-audio',
          title: 'Áudio da frase em sites protegidos',
          body: [
            [
              'Abra {Configurações → Cartões do Anki → Áudio da frase em sites protegidos} e clique em Permitir.',
              'Na guia em que o vídeo está tocando, clique no ícone do Libregaku na barra de ferramentas e depois em Gravar áudio da frase aqui. Faça isso uma vez por guia.',
            ],
            'Os sites protegidos criptografam o vídeo, então o Libregaku não consegue gravar o som do vídeo como faz no YouTube. Em vez disso, ele grava a guia, o que o Chrome só permite desse jeito. Pelo mesmo motivo, os cartões criados lá não têm captura de tela.',
          ],
          keywords: ['netflix', 'disney', 'prime video', 'max', 'hbo', 'som', 'permissão', 'criptografia', 'drm', 'captura de guia', 'aba', 'tab capture'],
        },
      ],
    },
    {
      id: 'current',
      title: 'Atualizações',
      topics: [
        {
          id: 'update',
          title: 'Carregar uma nova versão',
          body: [
            [
              'Abra a página de extensões do seu navegador.',
              'Clique na seta de recarregar do Libregaku.',
              'Recarregue a guia do vídeo — uma guia aberta antes de recarregar continua com a versão antiga.',
            ],
            { tip: 'O pé de Configurações diz quando a cópia que você está usando foi compilada.' },
          ],
          keywords: ['atualizar', 'atualização', 'recarregar', 'versão antiga', 'compilação', 'brave', 'reload', 'update'],
        },
      ],
    },
    {
      id: 'questions',
      title: 'Perguntas',
      topics: [
        {
          id: 'q-track',
          title: 'O que Acompanhar faz?',
          body: [
            'Sublinha uma palavra sempre que ela aparece — em roxo, a menos que você mude isso em {Configurações → Sublinhados} — para você notá-la, sem criar cartão. Ela deixa de contar como nova. As palavras acompanhadas ficam listadas no painel de transcrição, na aba Salvas.',
          ],
          keywords: ['acompanhar', 'acompanhadas', 'roxo', 'track'],
        },
        {
          id: 'q-still-underlined',
          title: 'Por que uma palavra que eu conheço continua sublinhada?',
          body: [
            'O status vem dos seus cartões do Anki, nos baralhos de {Configurações → Anki → Ler palavras conhecidas de}. Uma palavra cujo cartão ainda não está maduro fica sublinhada como em aprendizado; uma sem cartão nesses baralhos, como nova. Uma palavra que você conhece sem ter cartão pode ser marcada como Conhecida.',
          ],
          keywords: ['conhecida', 'status', 'sublinhado', 'maduro', 'escopo'],
        },
        {
          id: 'q-marks-deck',
          title: 'Por que existe um baralho Libregaku::Marks no Anki?',
          body: [
            'Conhecida, Acompanhar e Ignorar ficam guardadas lá como notas ocultas, suspensas para nunca aparecerem na revisão, e assim chegam aos seus outros dispositivos pela sincronização do Anki. Lá dentro, cada idioma tem o próprio baralho, como Libregaku::Marks::JA. {Configurações → Anki → Abrir marcações no Anki} mostra essas notas.',
            { tip: 'Desative {Configurações → Anki → Guardar marcações no Anki} para guardar as marcações só neste navegador.' },
          ],
          keywords: ['marcações', 'suspensas', 'sincronizar', 'sincronização', 'sync', 'deck'],
        },
        {
          id: 'q-remove',
          title: 'Posso remover um cartão?',
          body: [
            'Logo depois de adicionar, clique em Adicionado para desfazer. Para um cartão mais antigo, clique em No Anki no pop-up da palavra e exclua o cartão no Anki. O Libregaku nunca exclui um cartão que você já estudou.',
          ],
          keywords: ['excluir', 'apagar', 'deletar', 'remover', 'desfazer', 'delete'],
        },
        {
          id: 'q-ankiweb',
          title: 'Funciona com o AnkiWeb?',
          body: [
            'Não diretamente: o Libregaku se comunica com o Anki no seu computador pelo complemento [AnkiConnect](https://ankiweb.net/shared/info/2055492159). Depois, o Anki sincroniza seus cartões com o AnkiWeb e com o seu celular, como sempre.',
          ],
          keywords: ['celular', 'telefone', 'android', 'iphone', 'sincronizar', 'extensão', 'add-on'],
        },
        {
          id: 'q-picture',
          title: 'O que é a captura de tela no cartão?',
          body: [
            'Uma imagem da cena, no verso do cartão, para você ver de onde a palavra veio. No YouTube, ela é tirada do vídeo; os sites protegidos escondem o vídeo das extensões, então os cartões criados lá não têm. {Configurações → Cartões do Anki → Captura de tela} desativa isso.',
          ],
          keywords: ['imagem', 'foto', 'print', 'screenshot', 'quadro'],
        },
        {
          id: 'q-replay',
          title: 'Por que a linha toca de novo quando adiciono um cartão?',
          body: [
            'O som dela é gravado enquanto ela toca, então a linha toca mais uma vez; depois, a reprodução volta para onde estava. {Configurações → Cartões do Anki → Áudio da frase} desativa isso.',
          ],
          keywords: ['repetir', 'repete', 'gravação', 'volta', 'replay'],
        },
        {
          id: 'q-translation',
          title: 'Por que não há tradução abaixo da legenda?',
          body: [
            'A tradução são as próprias legendas do site no idioma de {Configurações → Idiomas → Seu idioma}. Se o vídeo não tem legendas nesse idioma, não há o que mostrar, e o Libregaku avisa. Ele não usa tradução automática.',
          ],
          keywords: ['segunda linha', 'legenda dupla', 'dual', 'traduzir', 'português', 'inglês'],
        },
        {
          id: 'q-definitions',
          title: 'Por que as definições só existem em alguns idiomas?',
          body: [
            'Para o japonês, elas vêm do JMdict, que tem definições em nove idiomas. Se o seu não é um deles, {Configurações → Idiomas} mostra uma segunda opção, Definições em, para escolher o idioma a usar no lugar.',
            'Os dicionários de chinês (mandarim), coreano, espanhol, francês e alemão são escritos em inglês. Quando existe um no seu idioma para o par, ele é usado primeiro.',
          ],
          keywords: ['dicionário', 'significados', 'português', 'húngaro', 'esloveno', 'cc-cedict', 'wiktionary'],
        },
        {
          id: 'q-languages',
          title: 'Quais idiomas posso aprender?',
          body: [
            'Japonês, chinês (mandarim), cantonês, coreano, espanhol, francês e alemão têm dicionário, e uma palavra é associada ao cartão dela em qualquer forma em que for dita: 갔어요 encontra um cartão de 가다, e hablábamos, um de hablar. O japonês mostra furigana acima das palavras, o chinês (mandarim) mostra pinyin e o cantonês mostra Jyutping.',
            'Os outros idiomas em {Configurações → Idiomas → Estou aprendendo} aparecem como limitados. As palavras deles são separadas, e ainda não há dicionário.',
            'O dicionário de um idioma é baixado na primeira vez que você o escolhe. O download tem de 11 a 27 MB; no disco, ele ocupa 100 MB para o chinês (mandarim), 140 MB para o francês, 200 MB para o coreano e o alemão e 470 MB para o espanhol. Um dicionário no seu próprio idioma, quando existe, é um segundo download de até 18 MB. O japonês também baixa um segundo dicionário, usado para separar as linhas em palavras: 46 MB, e 190 MB no disco.',
          ],
          keywords: ['mandarim', 'cantonês', 'jyutping', 'compatíveis', 'suportados', 'suporte', 'tamanho', 'espaço', 'japones', 'chines'],
        },
        {
          id: 'q-data',
          title: 'O Libregaku envia meus dados para algum lugar?',
          body: [
            'Não há conta nem servidor. Os dicionários são baixados uma vez e ficam no navegador; os cartões vão direto para o Anki no seu computador. Enquanto o dicionário de japonês ainda está sendo baixado, uma palavra que você consulta é enviada ao Jotoba para ser respondida.',
          ],
          keywords: ['privacidade', 'rastreamento', 'telemetria', 'internet', 'segurança', 'privacy'],
        },
      ],
    },
  ],
};
