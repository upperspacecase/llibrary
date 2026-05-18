/**
 * Portuguese translations for Odemira regional wiki content.
 */

export const SECTIONS_PT = {
  bioregion: {
    id: 'bioregion',
    title: 'Visão Geral da Região',
    subtitle: 'Perfil do município, geografia e estatísticas-chave',
    color: '#8B6914',
    icon: 'globe',
    description: 'Perfil do município, geografia e estatísticas-chave',
    accentColor: '#8B6914',
    intro: `Odemira é um município do Distrito de Beja, na região do Alentejo de Portugal, abrangendo aproximadamente 1.720,6 km² (172.929 hectares), o que faz dele o maior município de Portugal em área. A população residente era de 29.538 no censo de 2021, subindo para cerca de 31.488 no final de 2022. A região estende-se da costa atlântica na Zambujeira do Mar até às colinas ondulantes do interior alentejano. Ecologicamente, estrutura-se em torno da bacia do Rio Mira, desde a barragem de Santa Clara até ao estuário em Vila Nova de Milfontes e a planície costeira irrigada conhecida como o Perímetro de Rega do Mira. 44% do território insere-se no Parque Natural do Sudoeste Alentejano e Costa Vicentina (PNSACV), estendendo-se por 110 km ao longo da costa sudoeste.`,
    articles: [
      {
        title: 'Dados-Chave',
        content: `Área: 1.720,6 km². População: ~30.000 (em crescimento devido à migração). Altitude: 0m (costa) a 590m (colinas interiores). Protegido: 44% sob o PNSACV. Linha costeira: 110 km dentro do parque protegido. À escala europeia, o sítio Natura 2000 "Costa Sudoeste" (PTCON0012) protege 118.266,58 ha nas regiões biogeográficas Mediterrânica e Atlântica Marinha, salvaguardando 110 espécies de directivas e 47 tipos de habitat.`,
      },
    ],
    mapLayers: ['elevation', 'boundaries'],
    visuals: {
      stats: [
        { label: 'Área', value: '1,720.6', sublabel: 'km²' },
        { label: 'População', value: '31,488', sublabel: '~final de 2022' },
        { label: 'Protegido', value: '44%', sublabel: 'PNSACV', color: '#2E8B57' },
        { label: 'Linha Costeira', value: '110 km', sublabel: 'Costa sudoeste' },
      ],
    },
    references: [
      { id: 1, title: 'Odemira — Wikipédia', url: 'https://en.wikipedia.org/wiki/Odemira' },
      { id: 2, title: 'Odemira (Município) — CityPopulation', url: 'http://citypopulation.de/en/portugal/beja/admin/1810211__odemira/' },
      { id: 3, title: 'Município de Odemira — Urbistat', url: 'https://ugeo.urbistat.com/AdminStat/en/pt/demografia/popolacao/odemira/20317454/4' },
      { id: 4, title: 'Aproveitamento Hidroagrícola do Mira', url: 'http://www.abm.pt/pt/mira' },
      { id: 5, title: 'Água "já não corre no rio Mira" — Diário do Alentejo', url: 'https://diariodoalentejo.pt/pt/noticias/15991/agua-%E2%80%9Cja-nao-corre-no-rio-mira%E2%80%9D.aspx' },
      { id: 6, title: 'PNSACV — Wikipédia', url: 'https://pt.wikipedia.org/wiki/Parque_Natural_do_Sudoeste_Alentejano_e_Costa_Vicentina' },
      { id: 7, title: 'Costa Sudoeste — EUNIS', url: 'https://eunis.eea.europa.eu/sites/PTCON0012' },
      { id: 8, title: 'Anexos — APA', url: 'https://siaia.apambiente.pt/AIADOC/AIA3281/vol3_at_ax3-ax6201978151851.pdf' },
      { id: 9, title: 'PNSACV — e-cultura', url: 'https://www.e-cultura.pt/patrimonio_item/11536' },
      { id: 11, title: 'PDM Odemira — CM Odemira', url: 'https://www.cm-odemira.pt/viver/gestao-do-territorio/planos-municipais-de-ordenamento-do-territorio/plano-diretor-municipal' },
      { id: 12, title: 'Clima de Odemira — WeatherAndClimate', url: 'https://weatherandclimate.com/portugal/beja/odemira' },
      { id: 13, title: 'Meteorologia de Odemira — NearWeather', url: 'https://www.nearweather.com/location/2265472' },
    ],
  },

  dashboard: {
    id: 'dashboard',
    title: 'Painel Ambiental',
    subtitle: 'Síntese ambiental do município vs linha de base nacional de Portugal',
    color: '#1B3A2F',
    icon: 'activity',
    description: 'Síntese ambiental do município vs linha de base nacional de Portugal',
    accentColor: '#1B3A2F',
    intro: `Síntese ambiental do município de Odemira a abranger trajetórias climáticas, composição do solo, balanço hídrico e biodiversidade, com dados do pipeline LandLibrary. Cada célula desta página é proveniente de uma API ou modelo nomeado — ver o registo de lacunas no fundo da página para perceber o que já está ligado e o que ainda precisa de um agregador regional.`,
    articles: [],
    mapLayers: [],
    visuals: {},
    references: [],
  },

  ecology: {
    id: 'ecology',
    title: 'Ecologia',
    subtitle: 'Ecossistemas, biodiversidade e dinâmicas ecológicas',
    color: '#2E8B57',
    icon: 'leaf',
    description: 'Ecossistemas, biodiversidade e dinâmicas ecológicas',
    accentColor: '#2E8B57',
    intro: `Odemira abrange um rico gradiente de ecossistemas, desde falésias atlânticas a bosques mediterrânicos.`,
    articles: [
      {
        title: 'Ecossistemas',
        content: `Falésias e dunas costeiras: Rara paisagem costeira mediterrânica natural com matos de topo de falésia, pradarias dunares, estepes salinas. Sistemas ribeirinhos e estuarinos: Zonas húmidas do estuário do Mira, planícies de maré, sapais, florestas ripícolas. Montado: Agrossilvicultura semi-natural de sobreiro e azinheira, emblemática do Alentejo. Matos e charnecas: Flora mediterrânica em solos mais pobres. Mosaicos agrícolas: Cereais de sequeiro, olivais, horticultura irrigada.`,
      },
      {
        title: 'Destaques da Biodiversidade',
        content: `Flora: ~750 espécies vegetais, incluindo 12 endemismos mundiais nas falésias costeiras. Avifauna: ~200 espécies de aves, 26 nidificantes nas falésias. Fauna marinha: 1.889 espécies registadas nas águas do PNSACV (38 com estatuto de conservação). Mamíferos: Lontra (Lutra lutra), gatos-bravos, genetas, sacarrabos em todo o território.`,
      },
      {
        title: 'Espécies Protegidas',
        content: `O sítio Natura 2000 protege 110 espécies ao abrigo das directivas da UE, incluindo plantas prioritárias, aves de rapina nidificantes em falésias e o sobreiro (Quercus suber), legalmente protegido, um habitat prioritário (6310) reconhecido desde o século XVI.`,
      },
      {
        title: 'Dinâmicas Ecológicas',
        content: `Regimes de fogo: Os sistemas de montado reduzem historicamente o risco de grandes incêndios. Conectividade hidrológica: Os corredores fluviais constituem importantes corredores de vida selvagem. Ciclos agroecológicos: O pastoreio tradicional mantém a estrutura de bosque aberto.`,
      },
    ],
    mapLayers: ['biodiversity', 'protected'],
    visuals: {
      stats: [
        { label: 'Espécies Vegetais', value: '~750', color: '#2E8B57' },
        { label: 'Espécies de Aves', value: '~200' },
        { label: 'Espécies Marinhas', value: '1,889', sublabel: 'Águas do PNSACV' },
        { label: 'Plantas Endémicas', value: '12', sublabel: 'Falésias costeiras', color: '#8B6914' },
      ],
      charts: [{
        type: 'pie',
        title: 'Distribuição dos Ecossistemas',
        data: [
          { name: 'Montado', value: 35, color: '#2d5a3d' },
          { name: 'Matos', value: 25, color: '#8b9a46' },
          { name: 'Falésias Costeiras', value: 15, color: '#4a90a4' },
          { name: 'Agricultura', value: 15, color: '#d4a574' },
          { name: 'Ribeirinho', value: 10, color: '#2B7BB9' },
        ],
      }],
    },
    references: [
      { id: 4, title: 'Aproveitamento Hidroagrícola do Mira', url: 'http://www.abm.pt/pt/mira' },
      { id: 5, title: 'Água "já não corre no rio Mira" — Diário do Alentejo', url: 'https://diariodoalentejo.pt/pt/noticias/15991/agua-%E2%80%9Cja-nao-corre-no-rio-mira%E2%80%9D.aspx' },
      { id: 6, title: 'PNSACV — Wikipédia', url: 'https://pt.wikipedia.org/wiki/Parque_Natural_do_Sudoeste_Alentejano_e_Costa_Vicentina' },
      { id: 7, title: 'Costa Sudoeste — EUNIS', url: 'https://eunis.eea.europa.eu/sites/PTCON0012' },
      { id: 8, title: 'Anexos — APA', url: 'https://siaia.apambiente.pt/AIADOC/AIA3281/vol3_at_ax3-ax6201978151851.pdf' },
      { id: 9, title: 'PNSACV — e-cultura', url: 'https://www.e-cultura.pt/patrimonio_item/11536' },
      { id: 10, title: 'Ambientalistas preocupados — Tribuna Alentejo', url: 'https://www.tribunaalentejo.pt/artigos/ambientalistas-preocupados-com-agricultura-intensiva-em-odemira' },
      { id: 16, title: 'Montado — CorkLands', url: 'https://www.corklands.pt/en/montado' },
      { id: 17, title: 'Montado: um santuário criado pelo homem — Biodiversity.com.pt', url: 'https://biodiversity.com.pt/biogallery/montado/' },
      { id: 20, title: 'PNSACV — Museu Biodiversidade', url: 'https://museubiodiversidade.uevora.pt/areas-classificadas/parque-natural-do-sudoeste-alentejano-e-costa-vicentina-2/' },
      { id: 21, title: 'MARSW Relatório de Síntese', url: 'https://marsw.pt/downloads/repo/materiais_divulgacao/Relatorio_de_Sintese_da_Biodiversidade_Marinha_da_area_marinha_do_Parque_Natural_do_Sudoeste_Alentejano_e_Costa_Vicentina_Relatorio_tecnico_do_Projeto_MARSW-1_compressed.pdf' },
      { id: 22, title: 'Sobreiro — Biodiversity.com.pt', url: 'https://biodiversity.com.pt/biogallery/cork-oak/' },
      { id: 23, title: 'Floresta de sobreiros — Casa do Montado', url: 'https://casadomontado.com/en/cork-oak-forest/' },
    ],
  },

  land: {
    id: 'land',
    title: 'Território',
    subtitle: 'Geografia, topografia e geologia',
    color: '#6B8E23',
    icon: 'mountain',
    description: 'Geografia, topografia e geologia',
    accentColor: '#6B8E23',
    intro: `O território grada desde a costa atlântica acidentada até aos planaltos ondulantes do interior.`,
    articles: [
      {
        title: 'Geografia e Topografia',
        content: `Zona Costeira: Falésias altas (até 156m), ravinas estreitas, praias arenosas, campos dunares. Estuário do Rio Mira com características de maré. Interior: Planaltos ondulantes e colinas dissecadas (até 324m na Serra do Cercal). Encostas de xisto suportando sistemas de montado. Terraços costeiros mais planos albergando o perímetro de rega.`,
      },
      {
        title: 'Geologia',
        content: `Costa: Formações do Carbónico, Triásico e Jurássico sobrepostas por depósitos quaternários de praia. Interior: Substrato de xisto e grauváque com encostas propensas à erosão.`,
      },
      {
        title: 'Influência Topográfica no Uso do Solo',
        content: `Encostas mais íngremes: Montado, matos, pastoreio extensivo. Terraços mais planos: Agricultura irrigada intensiva. Corredores de vale: Agricultura aluvial e assentamento urbano.`,
      },
    ],
    mapLayers: ['elevation', 'boundaries'],
    visuals: {
      stats: [
        { label: 'Altitude', value: '0–590m', sublabel: 'Costa ao interior' },
        { label: 'Área', value: '1,720.6', sublabel: 'km²' },
        { label: 'Freguesias', value: '13' },
        { label: 'Ponto mais Alto', value: '324m', sublabel: 'Serra do Cercal' },
      ],
      infoGrid: {
        title: 'Zonas Topográficas',
        rows: [
          { label: 'Zona Costeira', value: 'Falésias até 156m' },
          { label: 'Planaltos Interiores', value: 'Colinas ondulantes, até 324m' },
          { label: 'Corredores de Vale', value: 'Planícies aluviais' },
          { label: 'Substrato Rochoso', value: 'Xisto e grauváque' },
        ],
      },
    },
    references: [
      { id: 4, title: 'Aproveitamento Hidroagrícola do Mira', url: 'http://www.abm.pt/pt/mira' },
      { id: 6, title: 'PNSACV — Wikipédia', url: 'https://pt.wikipedia.org/wiki/Parque_Natural_do_Sudoeste_Alentejano_e_Costa_Vicentina' },
      { id: 9, title: 'PNSACV — e-cultura', url: 'https://www.e-cultura.pt/patrimonio_item/11536' },
      { id: 10, title: 'Ambientalistas preocupados — Tribuna Alentejo', url: 'https://www.tribunaalentejo.pt/artigos/ambientalistas-preocupados-com-agricultura-intensiva-em-odemira' },
      { id: 11, title: 'PDM Odemira — CM Odemira', url: 'https://www.cm-odemira.pt/viver/gestao-do-territorio/planos-municipais-de-ordenamento-do-territorio/plano-diretor-municipal' },
    ],
  },

  soil: {
    id: 'soil',
    title: 'Solo',
    subtitle: 'Tipos de solo, gestão e aptidão agrícola',
    color: '#8B4513',
    icon: 'layers',
    description: 'Tipos de solo, gestão e aptidão agrícola',
    accentColor: '#8B4513',
    intro: `Os solos de Odemira variam desde substratos arenosos costeiros a solos rasos de xisto no interior, cada um com necessidades de gestão distintas.`,
    articles: [
      {
        title: 'Solos Costeiros',
        content: `Tipo: Substratos arenosos a areno-argilosos. Origem: Depósitos quaternários de praia, terraços fluviais, sistemas dunares. Riscos: Erosão eólica, intrusão salina se mal geridos.`,
      },
      {
        title: 'Solos do Interior',
        content: `Tipo: Solos rasos, de baixa fertilidade, sobre xisto/grauváque. Gestão: Estabilizados pela cobertura arbórea do montado e pastoreio de baixa intensidade. Função: A cobertura arbórea e a vegetação do solo regulam o escoamento e previnem a erosão.`,
      },
      {
        title: 'Solos Agrícolas',
        content: `Perímetro de rega: Solos arenosos mais leves suportando cultivo intensivo. Sistemas de montado: Agrossilvicultura mista com acumulação de matéria orgânica proveniente do folhado das árvores.`,
      },
      {
        title: 'Lacunas de Dados',
        content: `Mapas de solo de alta resolução (textura, profundidade, matéria orgânica, salinidade) e mapas de risco de erosão específicos para Odemira não estão facilmente disponíveis em fontes abertas.`,
      },
    ],
    mapLayers: ['landcover'],
    visuals: {
      stats: [
        { label: 'Tipos de Solo', value: '3', sublabel: 'Grupos principais' },
        { label: 'Gama de pH', value: '5.5–6.5', sublabel: 'Ligeiramente ácido' },
        { label: 'Carbono Orgânico', value: 'Moderate', sublabel: 'Áreas de montado' },
        { label: 'Risco de Erosão', value: 'Moderate', sublabel: 'Encostas de xisto', color: '#CC6633' },
      ],
      charts: [{
        type: 'pie',
        title: 'Distribuição dos Tipos de Solo',
        data: [
          { name: 'Areno-argiloso (costeiro)', value: 35, color: '#d4a574' },
          { name: 'Xisto raso (interior)', value: 40, color: '#8b7355' },
          { name: 'Aluvial (rio)', value: 15, color: '#c4b5a0' },
          { name: 'Arenoso (dunas)', value: 10, color: '#E8D8B8' },
        ],
      }],
      textureBar: {
        title: 'Textura do Solo',
        segments: [
          { label: 'Areia', percent: 42, color: '#E8D098' },
          { label: 'Silte', percent: 28, color: '#D4B87A' },
          { label: 'Argila', percent: 30, color: '#B89A60' },
        ],
      },
      bulletList: {
        title: 'Limitações',
        items: [
          'Risco de erosão eólica nos solos arenosos costeiros',
          'Profundidade reduzida no xisto interior (limita a zona radicular)',
          'Risco de intrusão salina junto à costa',
        ],
      },
    },
    references: [
      { id: 9, title: 'PNSACV — e-cultura', url: 'https://www.e-cultura.pt/patrimonio_item/11536' },
      { id: 16, title: 'Montado — CorkLands', url: 'https://www.corklands.pt/en/montado' },
      { id: 17, title: 'Montado: um santuário criado pelo homem — Biodiversity.com.pt', url: 'https://biodiversity.com.pt/biogallery/montado/' },
      { id: 18, title: 'Superfície CORINE — ForestSTATS', url: 'https://foreststats.pt/variavel/33' },
      { id: 19, title: 'O que é o CORINE — EEA', url: 'https://www.eea.europa.eu/pt/help/perguntas-frequentes/o-que-e-o-corine' },
    ],
  },

  water: {
    id: 'water',
    title: 'Água',
    subtitle: 'Sistema do Rio Mira, irrigação e governança da água',
    color: '#2B7BB9',
    icon: 'waves',
    description: 'Sistema do Rio Mira, irrigação e governança da água',
    accentColor: '#2B7BB9',
    intro: `O Rio Mira é a espinha dorsal hidrológica da região.`,
    articles: [
      {
        title: 'O Sistema do Rio Mira',
        content: `Aproveitamento Hidroagrícola do Mira (construído 1963-1973): Área equipada: 15.200 ha. Área beneficiada: ~12.000 ha efetivamente irrigados. Infraestrutura: 38 km de canal principal + ~600 km de rede secundária/terciária. Cobertura: ~41 km de faixa costeira entre Vila Nova de Milfontes e Rogil.`,
      },
      {
        title: 'Crise Atual',
        content: `Armazenamento da albufeira: 36-37% da capacidade (vs. média histórica 76-80%). Caudal do rio: Troços entre a barragem de Santa Clara e o estuário reportados com praticamente nenhum escoamento superficial. Estado ecológico: Descrito por ativistas como "agonia" para o ecossistema fluvial.`,
      },
      {
        title: 'Alterações na Governança',
        content: `Atualização 2023: O Ministério da Agricultura retirou a gestão da rega à Associação de Beneficiários do Mira (ABM). A Agência Portuguesa do Ambiente (APA) gere agora os recursos hídricos diretamente devido a conflitos sobre a alocação entre agricultores e abastecimento público.`,
      },
      {
        title: 'Conflito pela Água',
        content: `Racionamento: A ABM começou a racionar água para irrigação. Utilizadores em risco: 100-150 pequenos proprietários classificados como "precários" podem perder o acesso. Captação não regulada: Numerosos furos não controlados suspeitos de contribuir para o esgotamento dos aquíferos. Poços tradicionais: Relatados como estando a secar.`,
      },
    ],
    mapLayers: ['water'],
    visuals: {
      stats: [
        { label: 'Nível da Albufeira', value: '36–37%', sublabel: 'vs. média 76–80%', color: '#dc2626' },
        { label: 'Canal Principal', value: '38 km', sublabel: '+ 600 km secundários' },
        { label: 'Área Irrigada', value: '12,000 ha', sublabel: 'Perímetro do Mira' },
      ],
      infoGrid: {
        title: 'Sistema do Rio Mira',
        rows: [
          { label: 'Bacia Principal', value: 'Rio Mira' },
          { label: 'Barragem', value: 'Barragem de Santa Clara (1963–73)' },
          { label: 'Cobertura', value: '~41 km de faixa costeira' },
          { label: 'Governança', value: 'APA (desde 2023)' },
          { label: 'Utilizadores em Risco', value: '100–150 precários' },
        ],
      },
    },
    references: [
      { id: 4, title: 'Aproveitamento Hidroagrícola do Mira', url: 'http://www.abm.pt/pt/mira' },
      { id: 5, title: 'Água "já não corre no rio Mira" — Diário do Alentejo', url: 'https://diariodoalentejo.pt/pt/noticias/15991/agua-%E2%80%9Cja-nao-corre-no-rio-mira%E2%80%9D.aspx' },
      { id: 10, title: 'Ambientalistas preocupados — Tribuna Alentejo', url: 'https://www.tribunaalentejo.pt/artigos/ambientalistas-preocupados-com-agricultura-intensiva-em-odemira' },
      { id: 14, title: 'Pequenos proprietários — Agroportal', url: 'https://www.agroportal.pt/mais-de-100-pequenos-proprietarios-podem-perder-acesso-a-agua-em-odemira-devido-a-escassez/' },
      { id: 15, title: 'Ministro retira gestão — Agroportal', url: 'https://www.agroportal.pt/ministro-da-agricultura-retira-gestao-da-agua-da-associacao-de-beneficiarios-do-mira-a-apa/' },
      { id: 39, title: 'Crise da Água — Expresso / EIT Food', url: 'https://journalismawards.eitfood.eu/wp-content/uploads/jet-engine-forms/683/2024/09/2023-09-22-EXPRESSO-PAPER-EDITION-WATER-CRISIS-STORY-1-1.pdf' },
    ],
  },

  climate: {
    id: 'climate',
    title: 'Clima',
    subtitle: 'Padrões climáticos atuais e projeções futuras',
    color: '#E8A317',
    icon: 'sun',
    description: 'Padrões climáticos atuais e projeções futuras',
    accentColor: '#E8A317',
    intro: `Classificação de Köppen: Csa (Mediterrânico de verão quente) com forte influência costeira atlântica.`,
    articles: [
      {
        title: 'Clima Atual',
        content: `Temperatura média anual: ~18,9°C. Máximas de verão: Acima de 30°C. Mínimas de inverno: 6-8°C. Precipitação anual: 550-600 mm. Sazonalidade: Altamente sazonal, com novembro a fevereiro como os meses mais húmidos; verões muito secos.`,
      },
      {
        title: 'Projeções Climáticas',
        content: `Para a região do Alentejo: Subida das temperaturas e ondas de calor mais frequentes. Precipitação decrescente e mais variável. Secas mais longas e mais intensas. Aumento da evapotranspiração e risco elevado de incêndio florestal.`,
      },
      {
        title: 'Pressão Atual',
        content: `A aridez induzida pelo clima agrava a escassez hídrica estival existente, exercendo pressão adicional sobre o sistema do Mira e as paisagens de montado de sequeiro.`,
      },
    ],
    mapLayers: ['fire'],
    visuals: {
      stats: [
        { label: 'Zona Climática', value: 'Csa', sublabel: 'Mediterrânico de verão quente' },
        { label: 'Temperatura Média', value: '18.9°C' },
        { label: 'Precipitação Anual', value: '575 mm' },
        { label: 'Estação Seca', value: 'Jun–Set' },
      ],
      charts: [{
        type: 'area',
        title: 'Padrões Sazonais',
        data: {
          labels: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'],
          datasets: [
            { label: 'Temperatura (°C)', values: [10, 11, 13, 14, 17, 20, 23, 23, 21, 17, 13, 11], color: '#ea580c', fillOpacity: 0.25 },
            { label: 'Precipitação (mm)', values: [80, 70, 50, 45, 30, 10, 3, 3, 20, 60, 80, 100], color: '#0284c7', fillOpacity: 0.25 },
          ],
        },
      }],
      infoCards: [
        { label: 'Estação Húmida', value: 'Out – Mar', sublabel: '~78% da precipitação anual' },
        { label: 'Estação Seca', value: 'Jun – Set', sublabel: 'Irrigação provavelmente necessária' },
        { label: 'Retorno de Seca', value: '1 em 5 anos', sublabel: 'Intervalo de seca severa' },
      ],
    },
    references: [
      { id: 6, title: 'PNSACV — Wikipédia', url: 'https://pt.wikipedia.org/wiki/Parque_Natural_do_Sudoeste_Alentejano_e_Costa_Vicentina' },
      { id: 10, title: 'Ambientalistas preocupados — Tribuna Alentejo', url: 'https://www.tribunaalentejo.pt/artigos/ambientalistas-preocupados-com-agricultura-intensiva-em-odemira' },
      { id: 12, title: 'Clima de Odemira — WeatherAndClimate', url: 'https://weatherandclimate.com/portugal/beja/odemira' },
      { id: 13, title: 'Meteorologia de Odemira — NearWeather', url: 'https://www.nearweather.com/location/2265472' },
      { id: 41, title: 'Histórico Climático de Odemira — Meteoblue', url: 'https://www.meteoblue.com/en/weather/historyclimate/climatemodelled/odemira_portugal_2265472' },
    ],
  },

  landuse: {
    id: 'landuse',
    title: 'Uso do Solo',
    subtitle: 'Trajetória histórica e padrões atuais de uso do solo',
    color: '#6B8E23',
    icon: 'map',
    description: 'Trajetória histórica e padrões atuais de uso do solo',
    accentColor: '#6B8E23',
    intro: `Historicamente caracterizado por cereais de sequeiro extensivos, olivais, pastorícia e grandes herdades com sistemas de montado. O esquema de irrigação do Mira dos anos 1960-70 marcou um ponto de viragem, convertendo a marginal "Charneca de Odemira" em terra agrícola produtiva.`,
    articles: [
      {
        title: 'Padrões Atuais',
        content: `Interior e Planaltos: Montado (agrossilvicultura de sobreiro/azinheira), matos e pastagens, algumas plantações de eucalipto ou pinheiro, pecuária extensiva, produção de cortiça, caça. Zona de Irrigação Costeira (Perímetro de Rega do Mira): ~12.000 ha de terra beneficiada, horticultura intensiva, plantações de frutos vermelhos (framboesas, mirtilos, morangos), grande parte sob estufas ou túneis de plástico. Núcleos Urbanos/Turísticos: Vila Nova de Milfontes, Zambujeira do Mar, Almograve, vila de Odemira, São Teotónio.`,
      },
      {
        title: 'Intensificação Agrícola',
        content: `Expansão de estufas: 2013: 438 ha de culturas protegidas. 2021: 1.253 ha (dados de satélite). Potencial: Até 4.800 ha (40% do perímetro de rega) permitidos pela RCM 179/2019.`,
      },
      {
        title: 'Pressões',
        content: `Conflito de uso do solo motivado pela água. Turismo e desenvolvimento costeiro. Abandono de terras e invasão de matos (interior). "Mar de plástico" ao longo de ~40 km de costa.`,
      },
    ],
    mapLayers: ['landcover', 'agriculture'],
    visuals: {
      stats: [
        { label: 'Estufas 2013', value: '438 ha' },
        { label: 'Estufas 2021', value: '1,253 ha', color: '#CC6633' },
        { label: 'Limite Potencial', value: '4,800 ha', sublabel: 'RCM 179/2019' },
        { label: 'Núcleos Turísticos', value: '5', sublabel: 'Localidades costeiras' },
      ],
      charts: [{
        type: 'bar',
        title: 'Composição do Uso do Solo',
        data: [
          { name: 'Montado', value: 35, color: '#2d5a3d' },
          { name: 'Matos/Pastagens', value: 20, color: '#8b9a46' },
          { name: 'Agricultura Irrigada', value: 18, color: '#d4a574' },
          { name: 'Estufas/Plástico', value: 12, color: '#CC6633' },
          { name: 'Urbano/Turismo', value: 8, color: '#8b7355' },
          { name: 'Eucalipto/Pinheiro', value: 7, color: '#6B8E23' },
        ],
      }],
    },
    references: [
      { id: 2, title: 'Odemira (Município) — CityPopulation', url: 'http://citypopulation.de/en/portugal/beja/admin/1810211__odemira/' },
      { id: 4, title: 'Aproveitamento Hidroagrícola do Mira', url: 'http://www.abm.pt/pt/mira' },
      { id: 5, title: 'Água "já não corre no rio Mira" — Diário do Alentejo', url: 'https://diariodoalentejo.pt/pt/noticias/15991/agua-%E2%80%9Cja-nao-corre-no-rio-mira%E2%80%9D.aspx' },
      { id: 6, title: 'PNSACV — Wikipédia', url: 'https://pt.wikipedia.org/wiki/Parque_Natural_do_Sudoeste_Alentejano_e_Costa_Vicentina' },
      { id: 7, title: 'Costa Sudoeste — EUNIS', url: 'https://eunis.eea.europa.eu/sites/PTCON0012' },
      { id: 10, title: 'Ambientalistas preocupados — Tribuna Alentejo', url: 'https://www.tribunaalentejo.pt/artigos/ambientalistas-preocupados-com-agricultura-intensiva-em-odemira' },
      { id: 11, title: 'PDM Odemira — CM Odemira', url: 'https://www.cm-odemira.pt/viver/gestao-do-territorio/planos-municipais-de-ordenamento-do-territorio/plano-diretor-municipal' },
      { id: 14, title: 'Pequenos proprietários — Agroportal', url: 'https://www.agroportal.pt/mais-de-100-pequenos-proprietarios-podem-perder-acesso-a-agua-em-odemira-devido-a-escassez/' },
      { id: 16, title: 'Montado — CorkLands', url: 'https://www.corklands.pt/en/montado' },
      { id: 17, title: 'Montado: um santuário criado pelo homem — Biodiversity.com.pt', url: 'https://biodiversity.com.pt/biogallery/montado/' },
      { id: 24, title: 'Alterações históricas do uso do solo em Portugal — ScienceDirect', url: 'https://www.sciencedirect.com/science/article/abs/pii/S0143622811000385' },
      { id: 25, title: 'População teme pelo seu futuro — DN', url: 'https://www.dn.pt/arquivo/diario-de-noticias/agricultura-intensiva-populacao-do-concelho-de-odemira-teme-pelo-seu-futuro-11882695.html' },
      { id: 27, title: 'Ministro: redução objetiva — 24Notícias', url: 'https://24noticias.sapo.pt/atualidade/artigos/ministro-diz-que-houve-reducao-objetiva-de-areas-onde-se-podem-instalar-estufas-em-odemira' },
      { id: 29, title: 'Odemira PDM Redação Final — Scribd', url: 'https://pt.scribd.com/document/918342595/Odemira-PDM-Redacao-Final' },
      { id: 30, title: 'Aviso n.º 15779/2023 — DR', url: 'https://diariodarepublica.pt/dr/detalhe/aviso/15779-2023-220218637' },
      { id: 31, title: 'Juntos pelo Sudoeste — Agroportal', url: 'https://www.agroportal.pt/juntos-pelo-sudoeste-a-favor-do-parque-natural-contra-as-estufas/' },
      { id: 32, title: 'Agricultura intensiva: Fora de Controlo? — Observador', url: 'https://observador.pt/opiniao/agricultura-intensiva-das-estufas-de-frutos-vermelhos-no-parque-natural-do-sudoeste-alentejano-out-of-control/' },
    ],
  },

  risks: {
    id: 'risks',
    title: 'Riscos',
    subtitle: 'Impactos climáticos, escassez hídrica e pressões sociais',
    color: '#CC6633',
    icon: 'alert',
    description: 'Impactos climáticos, escassez hídrica e pressões sociais',
    accentColor: '#CC6633',
    intro: `A escassez hídrica é a ameaça mais aguda: a albufeira de Santa Clara desceu para 36-37% da capacidade. As projeções climáticas indicam subida das temperaturas, secas mais frequentes e maior risco de incêndio florestal.`,
    articles: [
      {
        title: 'Impactos das Alterações Climáticas',
        content: `Subida das temperaturas e ondas de calor. Variabilidade decrescente da precipitação. Secas mais longas. Risco elevado de incêndio em áreas invadidas por matos.`,
      },
      {
        title: 'Escassez Hídrica',
        content: `A ameaça mais aguda: Depleção da albufeira (36-37% da capacidade). Degradação ecológica do Rio Mira. Competição entre necessidades agrícolas, abastecimento público e ecológicas.`,
      },
      {
        title: 'Agricultura Intensiva',
        content: `Uso intensivo de plástico/agroquímicos. Degradação e poluição do solo. Fragmentação de habitat por grandes blocos de estufas. Homogeneização da paisagem.`,
      },
      {
        title: 'Erosão Social e Cultural',
        content: `Mudança demográfica rápida (afluxo de mão-de-obra migrante). Condições laborais precárias. Sobrecarga dos serviços locais (escolas, saúde, segurança social). Perda de conhecimento ecológico tradicional.`,
      },
      {
        title: 'Estratégias de Adaptação',
        content: `"Pacto da água": Negociação entre município, APA, autoridades agrícolas. Debates políticos: Moratória a novas estufas ("nem mais um metro de estufa"). Cogestão: Novas estruturas de governança do PNSACV envolvendo municípios e sociedade civil. Agricultura regenerativa: Quintas de demonstração implementando design keyline, pastoreio holístico, agrossilvicultura. Planeamento climático: Projeto europeu Phoenix Horizon para agenda participativa de ação climática.`,
      },
    ],
    mapLayers: ['fire', 'water'],
    visuals: {
      stats: [
        { label: 'Escassez Hídrica', value: 'Severe', color: '#dc2626' },
        { label: 'Risco de Incêndio', value: 'High', color: '#ea580c' },
        { label: 'Albufeira', value: '36–37%', sublabel: 'da capacidade' },
        { label: 'Global', value: 'Critical', color: '#dc2626' },
      ],
      charts: [{
        type: 'radar',
        title: 'Perfil de Risco',
        data: [
          { axis: 'Incêndio', value: 72, max: 100 },
          { axis: 'Seca', value: 78, max: 100 },
          { axis: 'Cheia', value: 28, max: 100 },
          { axis: 'Erosão', value: 52, max: 100 },
        ],
      }],
      alertRows: [
        { icon: '🔥', label: 'Risco de Incêndio', value: 'Elevado', score: '72/100', bgColor: '#fef2f2', textColor: '#dc2626', iconColor: '#dc2626' },
        { icon: '🌡️', label: 'Risco de Seca', value: 'Severo', score: '78/100', bgColor: '#fff7ed', textColor: '#ea580c', iconColor: '#ea580c' },
        { icon: '💧', label: 'Risco de Cheia', value: 'Baixo', score: '28/100', bgColor: '#eff6ff', textColor: '#2563eb', iconColor: '#2563eb' },
        { icon: '⛰️', label: 'Risco de Erosão', value: 'Moderado', score: '52/100', bgColor: '#f5f3ff', textColor: '#7c3aed', iconColor: '#7c3aed' },
      ],
    },
    references: [
      { id: 5, title: 'Água "já não corre no rio Mira" — Diário do Alentejo', url: 'https://diariodoalentejo.pt/pt/noticias/15991/agua-%E2%80%9Cja-nao-corre-no-rio-mira%E2%80%9D.aspx' },
      { id: 6, title: 'PNSACV — Wikipédia', url: 'https://pt.wikipedia.org/wiki/Parque_Natural_do_Sudoeste_Alentejano_e_Costa_Vicentina' },
      { id: 10, title: 'Ambientalistas preocupados — Tribuna Alentejo', url: 'https://www.tribunaalentejo.pt/artigos/ambientalistas-preocupados-com-agricultura-intensiva-em-odemira' },
      { id: 14, title: 'Pequenos proprietários — Agroportal', url: 'https://www.agroportal.pt/mais-de-100-pequenos-proprietarios-podem-perder-acesso-a-agua-em-odemira-devido-a-escassez/' },
      { id: 16, title: 'Montado — CorkLands', url: 'https://www.corklands.pt/en/montado' },
      { id: 17, title: 'Montado: um santuário criado pelo homem — Biodiversity.com.pt', url: 'https://biodiversity.com.pt/biogallery/montado/' },
      { id: 21, title: 'MARSW Relatório de Síntese', url: 'https://marsw.pt/downloads/repo/materiais_divulgacao/Relatorio_de_Sintese_da_Biodiversidade_Marinha_da_area_marinha_do_Parque_Natural_do_Sudoeste_Alentejano_e_Costa_Vicentina_Relatorio_tecnico_do_Projeto_MARSW-1_compressed.pdf' },
      { id: 25, title: 'População teme pelo seu futuro — DN', url: 'https://www.dn.pt/arquivo/diario-de-noticias/agricultura-intensiva-populacao-do-concelho-de-odemira-teme-pelo-seu-futuro-11882695.html' },
      { id: 27, title: 'Ministro: redução objetiva — 24Notícias', url: 'https://24noticias.sapo.pt/atualidade/artigos/ministro-diz-que-houve-reducao-objetiva-de-areas-onde-se-podem-instalar-estufas-em-odemira' },
      { id: 28, title: 'Petição Pública — Parlamento', url: 'https://app.parlamento.pt/webutils/docs/doc.pdf?path=6148523063484d364c793968636d356c6443397a6158526c6379395953565a4d5a5763765247563464473946615735686246426c64476c6a6232567a4c7a4d32597a55774f574a6b4c5759354e446b744e445532597931684d6a67774c57466c4f444933597a4a6b4d32466a4f4335775a47593d&fich=32c509bd-f949-456c-a280-ae827c2d3ac8.pdf&Inline=true' },
      { id: 31, title: 'Juntos pelo Sudoeste — Agroportal', url: 'https://www.agroportal.pt/juntos-pelo-sudoeste-a-favor-do-parque-natural-contra-as-estufas/' },
      { id: 33, title: 'Trabalhadores migrantes sul-asiáticos — BHRRC', url: 'https://www.business-humanrights.org/en/latest-news/portugal-south-asian-migrant-workers-working-on-berry-farms-face-exploitation-labour-bondage-while-waiting-for-passports/' },
      { id: 39, title: 'Crise da Água — Expresso / EIT Food', url: 'https://journalismawards.eitfood.eu/wp-content/uploads/jet-engine-forms/683/2024/09/2023-09-22-EXPRESSO-PAPER-EDITION-WATER-CRISIS-STORY-1-1.pdf' },
      { id: 47, title: 'Odemira — Phoenix Horizon', url: 'https://phoenix-horizon.eu/odemira/' },
      { id: 48, title: 'Bloco de Esquerda — Sul Informação', url: 'https://alentejo.sulinformacao.pt/2021/07/bloco-de-esquerda-nao-quer-nem-mais-um-metro-de-estufa-em-odemira/' },
    ],
  },

  culture: {
    id: 'culture',
    title: 'Cultura',
    subtitle: 'Demografia, paisagens culturais e conhecimento tradicional',
    color: '#B8860B',
    icon: 'people',
    description: 'Demografia, paisagens culturais e conhecimento tradicional',
    accentColor: '#B8860B',
    intro: `A história humana espelha as trajetórias do sudoeste ibérico: ocupação pré-histórica, povoamento romano e medieval, consolidação de grandes herdades no período moderno. A paisagem de montado resulta de séculos de gestão humana que transformaram o bosque mediterrânico em sistemas agro-silvo-pastoris.`,
    articles: [
      {
        title: 'Demografia e Comunidades',
        content: `Crescimento Populacional: 26.066 (2011) → 29.538 (2021). Estrutura Demográfica Singular: 5.623 residentes nascidos na Ásia e Oceânia (vs. 20.946 em Portugal). 5.787 residentes com cidadania asiática e da Oceânia. Grande força de trabalho migrante sul e sudeste-asiática na agricultura (>10.000 trabalhadores nacionais na indústria dos frutos vermelhos, Odemira como polo principal). Estrutura Etária: Relativamente jovem para o Portugal rural. 15-64 anos: 22.699. 65+ anos: 7.538.`,
      },
      {
        title: 'Paisagens Culturais',
        content: `Património do montado: Descortiçamento, recolha de bolota, pastoreio tradicional. Arquitetura: Aldeias caiadas (montes), socalcos de pedra. Pesca costeira: Comunidades tradicionais e ciclos de trabalho sazonal. Identidade alentejana: Música regional, gastronomia, festas ligadas às colheitas e ao descortiçamento.`,
      },
      {
        title: 'Conhecimento Ecológico Tradicional (CET)',
        content: `Persiste entre agricultores e pastores mais velhos: Captação de água (cisternas, poços) e conservação pluvial. Regimes de pastoreio evitando o uso excessivo de solos frágeis. Práticas de uso/prevenção do fogo limitando incêndios catastróficos.`,
      },
    ],
    mapLayers: ['places', 'historic'],
    visuals: {
      stats: [
        { label: 'População (2021)', value: '29,538' },
        { label: 'População (2022)', value: '31,488', color: '#2E8B57' },
        { label: 'Nascidos na Ásia', value: '5,623', sublabel: 'Residentes' },
        { label: 'Idade Ativa', value: '22,699', sublabel: '15–64 anos' },
      ],
      infoGrid: {
        title: 'Demografia',
        rows: [
          { label: 'Crescimento Populacional', value: '26.066 → 29.538 → 31.488' },
          { label: 'Cidadania Asiática', value: '5.787 residentes' },
          { label: 'Idade 65+', value: '7.538' },
          { label: 'Trabalhadores de Frutos Vermelhos (nacional)', value: '>10.000' },
        ],
      },
    },
    references: [
      { id: 2, title: 'Odemira (Município) — CityPopulation', url: 'http://citypopulation.de/en/portugal/beja/admin/1810211__odemira/' },
      { id: 4, title: 'Aproveitamento Hidroagrícola do Mira', url: 'http://www.abm.pt/pt/mira' },
      { id: 6, title: 'PNSACV — Wikipédia', url: 'https://pt.wikipedia.org/wiki/Parque_Natural_do_Sudoeste_Alentejano_e_Costa_Vicentina' },
      { id: 16, title: 'Montado — CorkLands', url: 'https://www.corklands.pt/en/montado' },
      { id: 17, title: 'Montado: um santuário criado pelo homem — Biodiversity.com.pt', url: 'https://biodiversity.com.pt/biogallery/montado/' },
      { id: 23, title: 'Floresta de sobreiros — Casa do Montado', url: 'https://casadomontado.com/en/cork-oak-forest/' },
      { id: 33, title: 'Trabalhadores migrantes sul-asiáticos — BHRRC', url: 'https://www.business-humanrights.org/en/latest-news/portugal-south-asian-migrant-workers-working-on-berry-farms-face-exploitation-labour-bondage-while-waiting-for-passports/' },
      { id: 34, title: 'A Terra — Montado de Sobro e Cortiça', url: 'https://montadodesobroecortica.pt/the-montado/the-land/?lang=en' },
    ],
  },

  community: {
    id: 'community',
    title: 'Comunidade',
    subtitle: 'Iniciativas regenerativas, ciência cidadã e partes interessadas',
    color: '#8B4789',
    icon: 'heart',
    description: 'Iniciativas regenerativas, ciência cidadã e partes interessadas',
    accentColor: '#8B4789',
    intro: `Diversas iniciativas comunitárias e regenerativas ilustram trajetórias alternativas para Odemira.`,
    articles: [
      {
        title: 'Regenerativa — Cooperativa Integral (São Luís)',
        content: `Fundada em 2022, emergindo de movimentos locais desde 2020. 180 colaboradores, ~30 iniciativas empreendedoras. Projetos: Sistema Alimentar Local de Odemira, rede de Empreendedores, Espaço Nativa (espaço comunitário multiusos). Foco: Regeneração agroflorestal, educação não-formal, projetos culturais.`,
      },
      {
        title: 'A Quinta da Lage (Parque Natural Costeiro)',
        content: `Local de demonstração de eco-agricultura regenerativa. Práticas: Captação de água keyline, pastoreio holístico, agrossilvicultura, horticultura sem mobilização do solo. Polo educativo com cursos sobre restauração de terras e segurança alimentar local.`,
      },
      {
        title: 'Ciência Cidadã e Advocacia',
        content: `Juntos pelo Sudoeste (JPS): Movimento cidadão em defesa do sudoeste. Recolha de dados sobre expansão de estufas e tendências de precipitação. Petições ao parlamento e queixas à UE. SOS Rio Mira: Advocacia pela saúde do rio. Alertas públicos sobre degradação ecológica. Monitorização da governança da água.`,
      },
      {
        title: 'Panorama de Partes Interessadas',
        content: `Pequenos e médios agricultores locais (irrigados e de sequeiro). Grandes empresas agroindustriais (operações de estufa). Trabalhadores agrícolas migrantes (predominantemente sul-asiáticos). ONGs ambientais e movimentos cívicos. Governo municipal, ICNF, APA. Operadores turísticos. Cooperativas regenerativas e iniciativas agroecológicas.`,
      },
    ],
    mapLayers: ['places', 'infrastructure'],
    visuals: {
      stats: [
        { label: 'Iniciativas', value: '~30', sublabel: 'Empreendedoras' },
        { label: 'Grupos Cívicos', value: '2', sublabel: 'JPS + SOS Rio Mira' },
      ],
      infoGrid: {
        title: 'Panorama de Partes Interessadas',
        rows: [
          { label: 'Pequenos/Médios Agricultores', value: 'Irrigados e de sequeiro' },
          { label: 'Agroindustriais', value: 'Grandes operações de estufa' },
          { label: 'Trabalhadores Migrantes', value: 'Predominantemente sul-asiáticos' },
          { label: 'ONGs Ambientais', value: 'JPS, SOS Rio Mira' },
          { label: 'Governo', value: 'Município, ICNF, APA' },
        ],
      },
    },
    references: [
      { id: 5, title: 'Água "já não corre no rio Mira" — Diário do Alentejo', url: 'https://diariodoalentejo.pt/pt/noticias/15991/agua-%E2%80%9Cja-nao-corre-no-rio-mira%E2%80%9D.aspx' },
      { id: 10, title: 'Ambientalistas preocupados — Tribuna Alentejo', url: 'https://www.tribunaalentejo.pt/artigos/ambientalistas-preocupados-com-agricultura-intensiva-em-odemira' },
      { id: 25, title: 'População teme pelo seu futuro — DN', url: 'https://www.dn.pt/arquivo/diario-de-noticias/agricultura-intensiva-populacao-do-concelho-de-odemira-teme-pelo-seu-futuro-11882695.html' },
      { id: 28, title: 'Petição Pública — Parlamento', url: 'https://app.parlamento.pt/webutils/docs/doc.pdf?path=6148523063484d364c793968636d356c6443397a6158526c6379395953565a4d5a5763765247563464473946615735686246426c64476c6a6232567a4c7a4d32597a55774f574a6b4c5759354e446b744e445532597931684d6a67774c57466c4f444933597a4a6b4d32466a4f4335775a47593d&fich=32c509bd-f949-456c-a280-ae827c2d3ac8.pdf&Inline=true' },
      { id: 31, title: 'Juntos pelo Sudoeste — Agroportal', url: 'https://www.agroportal.pt/juntos-pelo-sudoeste-a-favor-do-parque-natural-contra-as-estufas/' },
      { id: 33, title: 'Trabalhadores migrantes sul-asiáticos — BHRRC', url: 'https://www.business-humanrights.org/en/latest-news/portugal-south-asian-migrant-workers-working-on-berry-farms-face-exploitation-labour-bondage-while-waiting-for-passports/' },
      { id: 42, title: 'Valorização do Rio Mira — CM Odemira', url: 'https://www.cm-odemira.pt/investir/plano-estrategico-e-operacional-de-valorizacao-do-rio-mira' },
      { id: 43, title: 'Cidadãos exigem menos agricultura — Agronegócios', url: 'https://www.agronegocios.eu/noticias/cidadaos-exigem-menos-agricultura-em-odemira-e-aljezur/' },
      { id: 44, title: 'A Quinta da Lage', url: 'https://www.aquinta.org/about' },
      { id: 45, title: 'Regenerativa Cooperativa Integral — Rota Vicentina', url: 'https://rotavicentina.com/en/comercio/regenerativa-cooperativa-integral/' },
      { id: 46, title: 'Cooperativa Regenerativa', url: 'https://www.regenerativa.pt' },
      { id: 47, title: 'Odemira — Phoenix Horizon', url: 'https://phoenix-horizon.eu/odemira/' },
      { id: 49, title: 'Regenerar Odemira — Co-RE', url: 'https://www.co-re.info/en/regenerationruralcamp' },
    ],
  },
};

// Calendário de eventos para a região de Odemira
export const EVENTS_CALENDAR_PT = [
  { month: 'Março', name: 'Festa das Flores', location: 'São Teotónio', type: 'festival' },
  { month: 'Maio', name: 'Feira Medieval', location: 'Odemira', type: 'cultural' },
  { month: 'Junho', name: 'Festas de São João', location: 'Vários', type: 'tradicional' },
  { month: 'Julho', name: 'Festival Terras sem Sombra', location: 'Vários', type: 'música' },
  { month: 'Agosto', name: 'Festival Sudoeste', location: 'Zambujeira do Mar', type: 'música' },
  { month: 'Agosto', name: 'Festa da Espiga', location: 'Relíquias', type: 'tradicional' },
  { month: 'Setembro', name: 'Feira de Castro', location: 'Odemira', type: 'feira' },
  { month: 'Outubro', name: 'Festival da Castanha', location: 'Sabóia', type: 'alimentar' },
  { month: 'Novembro', name: 'Festival de Sopas', location: 'Odemira', type: 'alimentar' },
  { month: 'Dezembro', name: 'Mercado de Natal', location: 'Vila Nova de Milfontes', type: 'mercado' },
];

// Marcos e locais de referência
export const LANDMARKS_PT = [
  { name: 'Vila Nova de Milfontes', type: 'vila', coords: [37.7268, -8.7828], pop: 4000, desc: 'Vila costeira na foz do rio Mira. Polo turístico.' },
  { name: 'Odemira', type: 'vila', coords: [37.5967, -8.6400], pop: 5500, desc: 'Sede de concelho. Centro administrativo junto ao rio Mira.' },
  { name: 'São Teotónio', type: 'vila', coords: [37.5178, -8.7389], pop: 3500, desc: 'Polo agrícola. Centro da agricultura em estufa.' },
  { name: 'Zambujeira do Mar', type: 'aldeia', coords: [37.5247, -8.7867], pop: 800, desc: 'Aldeia piscatória no topo da falésia. Casa do Festival Sudoeste.' },
  { name: 'Santa Clara-a-Velha', type: 'aldeia', coords: [37.5100, -8.4378], pop: 1200, desc: 'Aldeia da albufeira. Porta de entrada para o interior de Odemira.' },
  { name: 'Sabóia', type: 'aldeia', coords: [37.4903, -8.5461], pop: 900, desc: 'Aldeia do interior conhecida pelo festival da castanha.' },
  { name: 'São Luís', type: 'aldeia', coords: [37.5850, -8.6150], pop: 700, desc: 'Sede da Regenerativa Cooperativa Integral.' },
  { name: 'Barragem de Santa Clara', type: 'marco', coords: [37.4900, -8.4400], desc: 'Grande albufeira que abastece a irrigação e a água potável do perímetro do Mira.' },
  { name: 'Praia de Almograve', type: 'praia', coords: [37.6500, -8.8000], desc: 'Praia selvagem ladeada por falésias dramáticas de xisto.' },
  { name: 'A Quinta da Lage', type: 'quinta', coords: [37.55, -8.78], desc: 'Eco-quinta regenerativa no parque natural costeiro.' },
];
