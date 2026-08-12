/**
 * Traduções portuguesas do conteúdo da wiki da Bacia do Lima.
 *
 * Mesma estrutura que ./bacia-do-lima-content.js — os ids, cores, ícones,
 * valores numéricos e URLs mantêm-se; traduzem-se títulos, subtítulos,
 * introduções, artigos e rótulos.
 *
 * Português europeu. Os números seguem a convenção portuguesa (1.180 km²).
 */

const REF = {
  lima: { id: 1, title: 'Rio Lima — Wikipédia', url: 'https://en.wikipedia.org/wiki/Lima_River' },
  pnpg: { id: 2, title: 'Parque Nacional da Peneda-Gerês — Wikipédia', url: 'https://en.wikipedia.org/wiki/Peneda-Ger%C3%AAs_National_Park' },
  pdl: { id: 3, title: 'Ponte de Lima — Wikipédia', url: 'https://en.wikipedia.org/wiki/Ponte_de_Lima' },
  vc: { id: 4, title: 'Viana do Castelo — Wikipédia', url: 'https://en.wikipedia.org/wiki/Viana_do_Castelo' },
  vv: { id: 5, title: 'Vinho Verde — Wikipédia', url: 'https://en.wikipedia.org/wiki/Vinho_Verde' },
  effis: { id: 6, title: 'EFFIS — Sistema Europeu de Informação sobre Fogos Florestais', url: 'https://effis.jrc.ec.europa.eu/' },
  icnf: { id: 7, title: 'ICNF — Instituto da Conservação da Natureza e das Florestas', url: 'https://www.icnf.pt/' },
  pipeline: { id: 8, title: 'Pipeline de dados LandLibrary — region-bacia-do-lima (2026-08-04)', url: '#' },
  cmpdl: { id: 9, title: 'Câmara Municipal de Ponte de Lima', url: 'https://www.cm-pontedelima.pt/' },
  cmvc: { id: 10, title: 'Câmara Municipal de Viana do Castelo', url: 'https://www.cm-viana-castelo.pt/' },
};

export const LIMA_SECTIONS_PT = {
  bioregion: {
    id: 'bioregion',
    title: 'Visão Geral da Região',
    subtitle: 'Uma bacia hidrográfica, não um município — perfil e estatísticas-chave',
    color: '#8B6914',
    icon: 'globe',
    description: 'Uma bacia hidrográfica, não um município — perfil e estatísticas-chave',
    accentColor: '#8B6914',
    intro: `A Bacia do Lima é a bacia hidrográfica do rio Lima: todas as encostas do Alto Minho cujas águas drenam para um mesmo curso. Não é uma unidade administrativa e não tem câmara, censo nem plano director próprio. O limite aqui cartografado abrange cerca de 1.180 km² e atravessa dez municípios portugueses — Melgaço, Arcos de Valdevez, Ponte da Barca, Vila Verde, Ponte de Lima, Viana do Castelo, Paredes de Coura, Terras de Bouro, Caminha e Monção — antes de chegar ao Atlântico em Viana do Castelo. O próprio rio percorre 108 km desde a serra do Talariño, em Ourense, na Galiza, onde se chama Limia, até à foz na costa portuguesa.`,
    articles: [
      {
        title: 'Dados-Chave',
        content: `Área: aproximadamente 1.180 km². Altitude: 10 m a 1.252 m. Municípios atravessados: 10 em Portugal, mais território galego a montante. Extensão do rio: 108 km no total, dos quais 41 km em Espanha. Foz: Viana do Castelo, no Atlântico. Altitude média: 374 m.`,
      },
      {
        title: 'O rio que os romanos não queriam atravessar',
        content: `Os autores romanos identificaram o Lima — a que chamavam Limaeas — com o mítico Letes, o rio do esquecimento, e acreditavam que quem o atravessasse perderia a memória. Décimo Júnio Bruto Galaico foi o primeiro romano a atravessá-lo, levando ele próprio o estandarte para convencer os soldados amedrontados a segui-lo. O episódio é relatado por Estrabão, Apiano, Floro e Lívio, e continua a ser a coisa mais conhecida sobre este rio.`,
      },
      {
        title: 'Porquê uma bacia e não um município',
        content: `A maioria dos perfis regionais organiza-se em torno de uma unidade administrativa, porque é daí que vêm as estatísticas. Uma bacia hidrográfica não tem equivalente. Os dados de população, governação e ordenamento pertencem aqui aos dez municípios que a bacia atravessa, cada um deles apenas parcialmente incluído no limite, pelo que qualquer total é uma aproximação e é apresentado como tal. O que a bacia tem, de forma única, é coerência hidrológica — a secção da água é a que melhor a descreve.`,
      },
    ],
    mapLayers: ['elevation', 'boundaries'],
    visuals: {
      stats: [
        { label: 'Área', value: '~1.180', sublabel: 'km²' },
        { label: 'Altitude', value: '10–1.252', sublabel: 'metros' },
        { label: 'Municípios', value: '10', sublabel: 'portugueses', color: '#2E8B57' },
        { label: 'Extensão do rio', value: '108 km', sublabel: 'nascente ao mar' },
      ],
    },
    references: [REF.lima, REF.pdl, REF.vc, REF.pipeline],
  },

  ecology: {
    id: 'ecology',
    title: 'Ecologia',
    subtitle: 'Floresta atlântica, planaltos graníticos e um estuário',
    color: '#2E8B57',
    icon: 'leaf',
    description: 'Floresta atlântica, planaltos graníticos e um estuário',
    accentColor: '#2E8B57',
    intro: `A bacia sobe de um estuário atlântico até maciços graníticos acima dos 1.200 m, e esse gradiente sustenta uma das transições ecológicas mais acentuadas de Portugal. A parte alta da bacia insere-se parcialmente na Peneda-Gerês, a mais antiga área protegida do país e o seu único parque nacional.`,
    articles: [
      {
        title: 'Peneda-Gerês',
        content: `Criado a 8 de Maio de 1971, o Peneda-Gerês é a mais antiga área protegida de Portugal e a única classificada como parque nacional. Abrange 695,9 km² pelos distritos de Viana do Castelo, Braga e Vila Real, atingindo 1.546 m no ponto mais alto. Deve o nome a dois maciços graníticos, a Serra da Peneda e a Serra do Gerês, que juntamente com a Serra Amarela e a Serra do Soajo formam os seus relevos mais elevados. Cerca de 9.000 pessoas vivem no seu interior, dispersas por pequenas aldeias.`,
      },
      {
        title: 'A flora atlântica no seu limite sul',
        content: `Os vales encaixados do parque albergam florestas temperadas de folha caduca e mistas de carvalho e pinheiro, descritas como um dos últimos redutos da flora atlântica europeia típica em Portugal, em contraste com um bioma mediterrânico em avanço. Essa transição — floresta atlântica a ceder perante condições mediterrânicas — é a história ecológica que define a parte alta da bacia, e é uma fronteira em movimento e não uma linha fixa.`,
      },
      {
        title: 'Endemismos ibéricos',
        content: `Estão registadas cerca de 220 espécies de vertebrados no parque, várias delas exclusivas da Península Ibérica, incluindo a ameaçada toupeira-de-água, a rã-ibérica e a salamandra-lusitânica. O parque faz fronteira a norte com o parque natural espanhol Baixa Limia – Serra do Xurés; em conjunto formam a reserva da biosfera UNESCO Gerês-Xurés, uma paisagem protegida contínua dividida por uma fronteira internacional.`,
      },
      {
        title: 'A protecção no terreno',
        content: `O estatuto de protecção não é aqui um pormenor. Dos maiores incêndios registados nesta bacia desde 2000, um ardeu 7.225 hectares em Julho de 2025 com praticamente toda a área dentro de território da Rede Natura 2000, e um incêndio de 3.074 hectares em 2016 ardeu 95% dentro dela. Classificação para conservação e exposição ao fogo ocupam o mesmo terreno.`,
      },
    ],
    mapLayers: ['biodiversity', 'protected'],
    visuals: {
      stats: [
        { label: 'Parque nacional', value: '695,9', sublabel: 'km² (Peneda-Gerês)', color: '#2E8B57' },
        { label: 'Espécies de vertebrados', value: '~220', sublabel: 'no parque' },
        { label: 'Ponto mais alto', value: '1.546 m', sublabel: 'máximo do parque' },
        { label: 'Criado em', value: '1971', sublabel: 'único parque nacional do país' },
      ],
    },
    references: [REF.pnpg, REF.icnf, REF.effis],
  },

  land: {
    id: 'land',
    title: 'Território',
    subtitle: 'Granito, relevo e a forma da bacia',
    color: '#6B8E23',
    icon: 'mountain',
    description: 'Granito, relevo e a forma da bacia',
    accentColor: '#6B8E23',
    intro: `A bacia é território de granito. O seu relevo abrange 1.242 metros na vertical, das lodaçais do estuário a cumeadas acima dos 1.200 m, numa bacia com cerca de 44 km de norte a sul e 61 km de este a oeste.`,
    articles: [
      {
        title: 'Relevo',
        content: `A altitude dentro do limite cartografado varia entre 10 m e 1.252 m, com uma média de 374 m. O perfil de terreno amostrado ao longo do limite alterna bruscamente entre fundo de vale e planalto — 39 m, 877 m, 1.252 m, 367 m, 1.085 m num único percurso — o que é característico de uma bacia entalhada num planalto granítico e não de uma que se abre sobre uma planície.`,
      },
      {
        title: 'Os maciços graníticos',
        content: `Os relevos mais altos são formados por granito: a Serra da Peneda e a Serra do Gerês, com a Serra Amarela e a Serra do Soajo a acompanhá-las. São os mesmos maciços que dão nome ao Peneda-Gerês, e a sua meteorização fornece o material grosseiro e ácido que define os solos de toda a parte alta da bacia.`,
      },
      {
        title: 'Vale e estuário',
        content: `Abaixo dos planaltos, o Lima ocupa um vale largo que corre para poente, através de Ponte da Barca e Ponte de Lima, antes de abrir no estuário em Viana do Castelo. O próprio município de Viana estende-se do nível do mar aos 825 m, o que dá a medida de quão depressa o terreno se ergue a partir da água.`,
      },
    ],
    mapLayers: ['elevation', 'geology'],
    visuals: {
      stats: [
        { label: 'Amplitude altimétrica', value: '1.242 m', sublabel: 'de 10 m a 1.252 m' },
        { label: 'Altitude média', value: '374 m' },
        { label: 'Declive médio', value: '1,6°', sublabel: 'média da bacia' },
        { label: 'Exposição dominante', value: 'Norte' },
      ],
    },
    references: [REF.pnpg, REF.vc, REF.pipeline],
  },

  soil: {
    id: 'soil',
    title: 'Solo',
    subtitle: 'Cambissolos sobre granito, e o que isso significa para a agricultura',
    color: '#8B4513',
    icon: 'layers',
    description: 'Cambissolos sobre granito, e o que isso significa para a agricultura',
    accentColor: '#8B4513',
    intro: `A classe de solo dominante na bacia é o cambissolo — solos jovens, com horizonte subsuperficial pouco desenvolvido, típicos de planaltos graníticos sob clima atlântico húmido.`,
    articles: [
      {
        title: 'Cambissolos',
        content: `A classificação de solos amostrada para esta bacia devolve cambissolos como classe dominante da Base de Referência Mundial. São solos moderadamente desenvolvidos: meteorização suficiente para distinguir um horizonte subsuperficial, mas não para uma diferenciação mais marcada. Sobre rocha-mãe granítica e com precipitação elevada, tendem a ser ácidos, bem drenados e delgados nas encostas, ganhando profundidade nos fundos de vale e socalcos.`,
      },
      {
        title: 'Porque difere do sul de Portugal',
        content: `Esta é uma história de solos genuinamente distinta da do Alentejo. Odemira, a outra região desta biblioteca, é dominada por luvissolos — solos enriquecidos em argila, formados sob um regime mediterrânico mais seco. Comparar as duas regiões quanto ao solo é comparar dois mundos pedológicos distintos e não duas variações do mesmo, e qualquer legenda de mapa construída para uma classificará mal a outra.`,
      },
      {
        title: 'Trabalhar a encosta',
        content: `Solos declivosos, delgados e ácidos são a razão pela qual a agricultura tradicional aqui é de socalcos e de parcela pequena, e não extensiva. A mesma condicionante está na origem da condução da vinha característica da região, que ergue os cachos acima de um terreno muitas vezes húmido.`,
      },
    ],
    mapLayers: ['soil'],
    visuals: {
      stats: [
        { label: 'Classe dominante', value: 'Cambissolos', color: '#8B4513' },
        { label: 'Rocha-mãe', value: 'Granito' },
        { label: 'Índice de solo', value: '75', sublabel: 'índice do pipeline' },
      ],
    },
    references: [REF.pipeline, REF.pnpg],
  },

  water: {
    id: 'water',
    title: 'Água',
    subtitle: 'O Lima, da Galiza ao Atlântico',
    color: '#2B7BB9',
    icon: 'waves',
    description: 'O Lima, da Galiza ao Atlântico',
    accentColor: '#2B7BB9',
    intro: `A água é o que define esta região — é a única coisa que a define. O Lima percorre 108 km do interior galego até ao Atlântico, e a bacia é simplesmente tudo o que drena para ele.`,
    articles: [
      {
        title: 'Da nascente à foz',
        content: `O Lima nasce na serra do Talariño, a 975 m de altitude, perto da aldeia de Paradiña, no município de Sarreaus, em Ourense, Espanha. Percorre 41 km em Espanha, onde é oficialmente conhecido na Galiza como Limia, antes de entrar em Portugal. A partir daí passa por Ponte da Barca e Ponte de Lima e chega ao Atlântico em Viana do Castelo, a 108 km da nascente.`,
      },
      {
        title: 'Alto Lindoso e as aldeias submersas',
        content: `O rio entra em Portugal através da albufeira da barragem do Alto Lindoso, junto à aldeia de Lindoso. A barragem tem central hidroeléctrica e cria uma grande albufeira que se estende para lá da fronteira. O seu enchimento, em 1992, submergiu várias aldeias do município espanhol de Lobios, entre elas Aceredo, Buscalque, O Bao, A Reloeira e Lantemil. Após a seca prolongada do Inverno de 2021–22, Aceredo emergiu da albufeira em descida e estava novamente em terra seca em Fevereiro de 2022 — um acontecimento que teve repercussão internacional e tornou brevemente visível o balanço hídrico da bacia.`,
      },
      {
        title: 'Uma bacia transfronteiriça',
        content: `A bacia não termina na fronteira. As suas cabeceiras são galegas, e o limite aqui cartografado entra nos municípios espanhóis de Lobios, Lobeira e Entrimo. A monitorização nacional portuguesa — a rede hidrométrica do SNIRH, as estações do IPMA, os dados administrativos da DGT — pára na fronteira, pelo que a parte alta da bacia está aqui genuinamente menos descrita do que a parte baixa. Esta wiki limita os seus dados ao lado português e di-lo explicitamente, em vez de apresentar um retrato parcial como se fosse completo.`,
      },
      {
        title: 'Estuário',
        content: `O rio encontra o mar em Viana do Castelo, município de 85.778 habitantes cujo território vai do nível do mar aos 825 m. O estuário é o termo ecológico e económico da bacia, e o ponto em que uma bacia de planaltos graníticos se torna um porto atlântico.`,
      },
    ],
    mapLayers: ['water', 'watershed'],
    visuals: {
      stats: [
        { label: 'Extensão do rio', value: '108 km', sublabel: 'nascente à foz', color: '#2B7BB9' },
        { label: 'Em Espanha', value: '41 km', sublabel: 'como Limia' },
        { label: 'Altitude da nascente', value: '975 m', sublabel: 'Talariño, Ourense' },
        { label: 'Índice de água', value: '100', sublabel: 'índice do pipeline' },
      ],
    },
    references: [REF.lima, REF.vc, REF.pipeline],
  },

  climate: {
    id: 'climate',
    title: 'Clima',
    subtitle: 'Atlântico e húmido, com uma margem mediterrânica em avanço',
    color: '#E8A317',
    icon: 'sun',
    description: 'Atlântico e húmido, com uma margem mediterrânica em avanço',
    accentColor: '#E8A317',
    intro: `O Alto Minho é o canto mais húmido de Portugal, e o clima da bacia é atlântico e não mediterrânico — ainda que a fronteira entre os dois esteja a atravessar esta paisagem em vez de permanecer imóvel.`,
    articles: [
      {
        title: 'Um regime atlântico',
        content: `A bacia está aberta ao Atlântico, e a sua vegetação reflecte-o: floresta temperada de folha caduca e mista de carvalho e pinheiro, de um tipo que sobrevive em poucos outros lugares em Portugal. As descrições ecológicas do Peneda-Gerês caracterizam o parque como detendo flora atlântica europeia típica em contraste com um bioma mediterrânico em evolução — alterações climáticas descritas através daquilo que cresce, e não através de uma projecção.`,
      },
      {
        title: 'A seca não é hipotética',
        content: `O Inverno de 2021–22 trouxe uma seca suficientemente severa para fazer descer a albufeira do Alto Lindoso até uma aldeia submersa em 1992 voltar a estar em terra seca. Numa bacia tão húmida como esta, é a ilustração mais clara disponível de quanto o balanço hídrico pode oscilar.`,
      },
      {
        title: 'Época de incêndios',
        content: `As áreas ardidas registadas concentram-se em Agosto e Setembro, com a excepção notável de um incêndio de 3.893 hectares a 14 de Outubro de 2017 e de um incêndio de 525 hectares em Abril de 2017 — lembrança de que a época de fogos tem aqui limites que se deslocam com o tempo meteorológico e não com o calendário.`,
      },
    ],
    mapLayers: ['climate'],
    visuals: {
      stats: [
        { label: 'Regime', value: 'Atlântico', sublabel: 'temperado, húmido' },
        { label: 'Índice de carbono', value: '90', sublabel: 'índice do pipeline', color: '#2E8B57' },
        { label: 'Pico de incêndios', value: 'Ago–Set' },
      ],
    },
    references: [REF.pnpg, REF.lima, REF.effis],
  },

  landuse: {
    id: 'landuse',
    title: 'Uso do Solo',
    subtitle: 'Vinho verde, minifúndio e fundo de vale em socalcos',
    color: '#6B8E23',
    icon: 'map',
    description: 'Vinho verde, minifúndio e fundo de vale em socalcos',
    accentColor: '#6B8E23',
    intro: `O vale do Lima insere-se na denominação dos Vinhos Verdes, e a sua agricultura define-se por parcelas muito pequenas trabalhadas de forma intensiva — o oposto das explorações extensivas do sul de Portugal.`,
    articles: [
      {
        title: 'Vinho Verde',
        content: `O Vinho Verde é um vinho de origem protegida do extremo norte de Portugal, abrangendo a antiga província do Minho de 1908 mais áreas adjacentes a sul. O nome significa vinho verde no sentido de vinho jovem: é lançado três a seis meses após a vindima e habitualmente bebido pouco depois de engarrafado. Não tem casta especificada e pode ser branco, tinto ou rosé, além de espumante, colheita tardia ou aguardente. A região caracteriza-se pelo número muito elevado de pequenos produtores.`,
      },
      {
        title: 'Vinha conduzida em altura',
        content: `O sistema de condução tradicional, a vinha de enforcado, ergue as videiras sobre latadas altas, obrigando a vindimar de escada. Em terreno húmido e com pouca área plana, conduzir a vinha em altura mantém os cachos afastados do solo húmido e deixa o chão livre para outra cultura — uma resposta arquitectónica directa à precipitação da bacia e à escassez de parcelas planas.`,
      },
      {
        title: 'O gás que era um defeito',
        content: `A ligeira efervescência pela qual o Vinho Verde é conhecido tinha origem na fermentação malolática a prosseguir dentro da garrafa. Em enologia isso é normalmente considerado um defeito, e os produtores tinham de usar garrafas opacas para esconder a turvação e o depósito que produzia — mas os consumidores gostaram do gás. Hoje a maioria dos produtores adiciona-o por gaseificação.`,
      },
    ],
    mapLayers: ['landcover'],
    visuals: {
      stats: [
        { label: 'Denominação', value: 'Vinho Verde', sublabel: 'DOC' },
        { label: 'Lançamento', value: '3–6 meses', sublabel: 'após a vindima' },
        { label: 'Dimensão da parcela', value: 'Pequena', sublabel: 'muitos produtores' },
      ],
    },
    references: [REF.vv, REF.pdl],
  },

  risks: {
    id: 'risks',
    title: 'Riscos',
    subtitle: 'Fogo, seca e um ponto cego transfronteiriço',
    color: '#CC6633',
    icon: 'alert',
    description: 'Fogo, seca e um ponto cego transfronteiriço',
    accentColor: '#CC6633',
    intro: `O fogo é o risco dominante registado nesta bacia, e concentra-se precisamente no terreno que a classificação para conservação deveria proteger.`,
    articles: [
      {
        title: 'Histórico de incêndios registado',
        content: `Os perímetros de área ardida do EFFIS para este limite registam pelo menos 49 incêndios entre 2000 e 2026, totalizando pelo menos 49.842 hectares. São valores mínimos: o EFFIS não publica um serviço de consulta de entidades, pelo que os perímetros são encontrados por amostragem numa grelha e os incêndios pequenos o suficiente para caírem entre pontos de amostragem escapam. O número real é mais elevado; os grandes incêndios estão todos captados.`,
      },
      {
        title: '2016, o pior ano',
        content: `2016 representa 29.338 dos hectares registados, repartidos por 13 incêndios distintos. Foram cartografados quatro perímetros num único dia, 8 de Agosto de 2016: 9.224 ha em Estorãos, 5.720 ha no Soajo, 2.698 ha em Nogueira, Meixedo e Vilar de Murteda, e 942 ha em Cabreiro. Arderam ainda 3.074 ha em Entrimo, do lado espanhol da fronteira, a 7 de Setembro.`,
      },
      {
        title: 'Fogo dentro de área protegida',
        content: `O incêndio de Julho de 2025 em Entre Ambos-os-Rios, Ermida e Germil ardeu 7.225 hectares com praticamente 100% da área dentro da Rede Natura 2000. O incêndio de Entrimo de 2016 ardeu 95% dentro, o do Soajo 42%, o de Estorãos 39%. Estatuto de protecção e exposição ao fogo não são aqui mapas separados.`,
      },
      {
        title: 'Seca',
        content: `A seca de 2021–22 fez descer a albufeira do Alto Lindoso o suficiente para expor uma aldeia submersa trinta anos antes. Numa bacia cuja segurança hídrica depende do armazenamento a montante, é o indicador isolado mais claro de exposição à seca de que se dispõe.`,
      },
      {
        title: 'O ponto cego',
        content: `As cabeceiras da bacia ficam na Galiza, e as redes de monitorização portuguesas param na fronteira. Os dados de fogo, água e meteorologia para a parte alta da bacia são por isso mais escassos do que para a parte baixa — uma lacuna no registo e não uma ausência de risco. O incêndio de Entrimo de 2016, que ardeu do lado espanhol, aparece aqui apenas porque o EFFIS é um conjunto de dados europeu e não nacional.`,
      },
    ],
    mapLayers: ['fire', 'flood'],
    visuals: {
      stats: [
        { label: 'Incêndios registados', value: '49+', sublabel: 'desde 2000', color: '#CC6633' },
        { label: 'Área ardida', value: '49.842+', sublabel: 'hectares' },
        { label: 'Pior ano', value: '2016', sublabel: '29.338 ha' },
        { label: 'Maior incêndio', value: '9.224 ha', sublabel: 'Estorãos, Ago 2016' },
      ],
    },
    references: [REF.effis, REF.lima, REF.icnf],
  },

  fires: {
    id: 'fires',
    title: 'Fogo',
    subtitle: 'Vinte e cinco anos de área ardida, e onde ardeu',
    color: '#CC6633',
    icon: 'alert',
    description: 'Vinte e cinco anos de área ardida, e onde ardeu',
    accentColor: '#CC6633',
    intro: `O fogo é o risco mais bem documentado desta bacia e o que mais território transformou. A tabela abaixo baseia-se nos perímetros de área ardida do EFFIS — a cartografia europeia de onde o fogo chegou efectivamente, e não de onde um satélite detectou calor — para o limite usado ao longo desta wiki.`,
    articles: [
      {
        title: 'O que isto regista, e o que lhe escapa',
        content: `O EFFIS cartografa o perímetro da área ardida depois do facto, o que é diferente de uma detecção térmica em tempo real: é o que ardeu, não o que estava a arder. Os valores aqui apresentados são mínimos. O EFFIS não publica um serviço de consulta de entidades, pelo que os perímetros são encontrados por amostragem numa grelha, e um incêndio pequeno o suficiente para cair entre pontos de amostragem escapa por completo. Os grandes incêndios estão todos captados; a contagem dos pequenos não está completa.`,
      },
      {
        title: 'Fogo e área protegida são o mesmo mapa',
        content: `A percentagem de cada incêndio dentro da Rede Natura 2000 é apresentada a par da sua dimensão, porque nesta bacia as duas coisas não são independentes. Os maiores incêndios da última década arderam nos planaltos do Peneda-Gerês, e a classificação para conservação não manteve o fogo afastado deles. Um incêndio com 100% da área dentro de território protegido não é aqui uma anomalia.`,
      },
      {
        title: 'A fronteira corta o registo, não o fogo',
        content: `Alguns dos perímetros listados situam-se do lado espanhol da bacia. Aparecem porque o EFFIS é um conjunto de dados europeu; as estatísticas nacionais portuguesas de incêndios não os incluiriam, ainda que o terreno que arderam drene para o mesmo rio. Sempre que um incêndio está registado fora de Portugal, isso é assinalado.`,
      },
    ],
    mapLayers: ['fire'],
    visuals: {},
    references: [REF.effis, REF.icnf, REF.pnpg],
  },

  culture: {
    id: 'culture',
    title: 'Cultura',
    subtitle: 'A vila mais antiga de Portugal e um caminho para Santiago',
    color: '#B8860B',
    icon: 'people',
    description: 'A vila mais antiga de Portugal e um caminho para Santiago',
    accentColor: '#B8860B',
    intro: `A bacia está continuamente povoada há mais de três mil anos, e a sua principal vila detém o foral mais antigo de Portugal.`,
    articles: [
      {
        title: 'Ponte de Lima',
        content: `Ponte de Lima é a vila mais antiga de Portugal. Recebeu o seu primeiro foral a 4 de Março de 1125, das mãos de D. Teresa, Condessa de Portugal, e do seu filho Afonso Henriques, que viria a ser o primeiro rei do país. Situa-se na margem sul do Lima e deve o nome à ponte medieval que o atravessa. O município tem 41.164 habitantes em 39 freguesias e 320,25 km², embora a vila propriamente dita tenha cerca de 2.800.`,
      },
      {
        title: 'Castros, romanos e o Caminho',
        content: `A área está habitada há mais de 3.000 anos, com castros da Idade do Ferro por todo o município actual, com destaque para o Monte das Santas junto ao centro da vila e o Monte de Santo Ovídio na margem oposta. Sob ocupação romana, o povoado ganhou importância pela Via XIX do Itinerário Antonino, a estrada que ligava Braga a Santiago de Compostela, Lugo e Astorga. Esse traçado foi reaproveitado na época medieval e coincide em parte com o Caminho de Santiago, que ainda hoje traz peregrinos ao vale.`,
      },
      {
        title: 'Feiras Novas',
        content: `As Feiras Novas de Ponte de Lima realizam-se anualmente no segundo fim-de-semana de Setembro, e o feriado municipal cai na terça-feira seguinte. Viana do Castelo, na foz, mantém o seu feriado municipal a 20 de Agosto, na festa de Nossa Senhora da Agonia, sua padroeira.`,
      },
    ],
    mapLayers: ['historic'],
    visuals: {
      stats: [
        { label: 'Primeiro foral', value: '1125', sublabel: 'Ponte de Lima', color: '#B8860B' },
        { label: 'Povoado há', value: '3.000+', sublabel: 'anos' },
        { label: 'Via romana', value: 'Via XIX', sublabel: 'Braga a Astorga' },
      ],
    },
    references: [REF.pdl, REF.vc, REF.cmpdl],
  },

  community: {
    id: 'community',
    title: 'Comunidade',
    subtitle: 'Dez municípios, nenhuma autoridade única',
    color: '#8B4789',
    icon: 'heart',
    description: 'Dez municípios, nenhuma autoridade única',
    accentColor: '#8B4789',
    intro: `Nenhuma entidade governa esta bacia. É administrada por dez municípios portugueses, cada um responsável pela sua parte, mais as autoridades galegas a montante — o que faz da articulação um problema permanente e não uma questão resolvida.`,
    articles: [
      {
        title: 'A quem pertence a bacia',
        content: `O limite cartografado atravessa Melgaço, Arcos de Valdevez, Ponte da Barca, Vila Verde, Ponte de Lima, Viana do Castelo, Paredes de Coura, Terras de Bouro, Caminha e Monção, e prolonga-se por Lobios, Lobeira e Entrimo, na Galiza. Esta lista foi obtida por geocodificação inversa de cada vértice do limite e não retirada de um conjunto de dados administrativo, pelo que reflecte o contorno tal como foi desenhado.`,
      },
      {
        title: 'Os dois centros populacionais',
        content: `Viana do Castelo, na foz, é cidade e sede de distrito com 85.778 habitantes em 30 freguesias, com foral de 1258. Ponte de Lima, a montante, tem 41.164 em 39 freguesias. Entre e acima delas a bacia rareia depressa; cerca de 9.000 pessoas vivem dentro do parque nacional, na parte alta da bacia, dispersas por pequenas aldeias.`,
      },
      {
        title: 'Uma paisagem ainda habitada',
        content: `O Peneda-Gerês não é natureza selvagem. Entre os seus objectivos declarados está preservar o valor dos recursos humanos existentes a par do solo, da água, da flora e da fauna, e as aldeias no seu interior são povoações vivas e não peças de museu. A gestão do território na parte alta da bacia é por isso uma questão de como as pessoas cultivam e pastoreiam, e não de saber se lá estão.`,
      },
      {
        title: 'Porque existe esta wiki',
        content: `Esta região entrou na biblioteca porque alguém a desenhou. O limite usado ao longo de todo este trabalho foi submetido através do formulário público em Junho de 2026 por Carolina Carvalho, com a designação «Bacia do Lima (rough outline)». É uma bacia hidrográfica, desenhada à mão, por alguém que achou que devia ser descrita como um só lugar — que é exactamente o argumento desta secção.`,
      },
    ],
    mapLayers: ['boundaries'],
    visuals: {
      stats: [
        { label: 'Municípios', value: '10', sublabel: 'portugueses', color: '#8B4789' },
        { label: 'Viana do Castelo', value: '85.778', sublabel: 'censos 2021' },
        { label: 'Ponte de Lima', value: '41.164', sublabel: 'censos 2021' },
        { label: 'No parque', value: '~9.000', sublabel: 'parte alta da bacia' },
      ],
    },
    references: [REF.vc, REF.pdl, REF.pnpg, REF.cmvc],
  },
};
