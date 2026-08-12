/**
 * Shared research resources, mapped onto the wiki sections they belong to.
 *
 * Compiled from the project's shared resource sheet. Descriptions are the
 * curators' own words, in Portuguese, and are shown as written rather than
 * paraphrased — they carry the judgement about why each source is useful.
 *
 * Rendered as "Further resources" beneath a section's references. References
 * are what the section cites; these are where to read further.
 */

export const SECTION_RESOURCES = {
  ecology: [
    { name: 'Red List of Ecosystems', url: 'https://iucnrle.org', desc: 'Referência global internacional para avaliar o risco de colapso de ecossistemas; útil para enquadrar “saúde” e vulnerabilidade de habitats' },
    { name: 'RLE Database', url: 'https://iucnrle.org/rle-database', desc: 'Base de dados internacional para explorar ecossistemas avaliados, estados de conservação e fatores de ameaça' },
    { name: 'Portal de Dados de Biodiversidade de Portugal', url: 'https://www.porbiota.pt/pt-pt/dados', desc: 'Portal nacional com dados de biodiversidade, monitorização, atlas e censos de espécies; inclui ligações para várias bases de dados acessíveis online' },
    { name: 'GBIF Portugal', url: 'https://www.gbif.pt', desc: 'Portal de dados Português do Sistema Global de Informação sobre a Biodiversidade, contém todos os registos publicados por instituições portuguesas, e registos publicados por instituições estrangeiras para Portugal' },
    { name: 'Relatório do Estado do Ambiente', url: 'https://rea.apambiente.pt/', desc: 'Página oficial da APA, inclui documentos acessíveis do Relatório do Estado do Ambiente, com indicadores e fichas temáticas sobre conservação da natureza, espécies e habitats protegidos.' },
    { name: 'geoCATALOGO', url: 'https://geocatalogo.icnf.pt/catalogo_tema2.html', desc: 'Catálogo geográfico do ICNF com dados sobre espécies, habitats, ecossistemas e serviços dos ecossistemas em Portugal' },
    { name: 'WWF Portugal - Mapas Interativos', url: 'https://mapas.wwf.pt/lizmap/www/index.php', desc: 'Sistema de informação geográfica online com acesso acesso a informação sobre sobre áreas protegidas, espécies ameaçadas, espécies nativas, habitats raros ou ameaçados e sobre áreas que prestam serviços do ecossistema, em Portugal Continental.' },
    { name: 'iNaturalist', url: 'https://www.inaturalist.org', desc: 'Plataforma gratuita para fotografar e registar espécies; ajuda a identificar biodiversidade local e a criar observações aproveitáveis por outros' },
    { name: 'Parâmetros da Biodiversidade em Comunidades', url: 'https://www.scribd.com/document/711129882/PARAMETROS-DESCRITORES-DE-UMA-COMUNIDADE', desc: 'Documento que discute parâmetros para descrever a biodiversidade de uma comunidade. Explica como medir a riqueza de espécies, diversidade alfa, beta e gama, e métodos para estimar a biodiversidade.' },
    { name: 'Ciência Cidadã Portugal', url: 'https://cienciacidada.pt', desc: 'Portal da Rede Portuguesa de Ciência Cidadã com listagem de projetos ativos em Portugal, incluindo projetos de biodiversidade em que qualquer pessoa pode participar' },
  ],
  water: [
    { name: 'Sistema Nacional de Informação de Recursos Hídricos (SNIRH)', url: 'https://snirh.apambiente.pt', desc: 'Base oficial para dados, séries históricas e monitorização dos recursos hídricos em Portugal. Reúne informação sobre águas superficiais, subterrâneas, costeiras e de transição, incluindo disponibilidades hídricas, secas, cheias e qualidade da água' },
    { name: 'InfoÁgua', url: 'https://infoagua.apambiente.pt', desc: 'Plataforma pública e gratuita para acompanhar qualidade das águas balneares, seca hidrológica e cheias.' },
    { name: 'Water information in Europe', url: 'https://www.eea.europa.eu/en/topics/in-depth/water', desc: 'A Agência Europeia do Ambiente tem vários mapas e bases de dados sobre água, que podem ser usados para comparar Portugal com o contexto europeu, recurso técnico' },
    { name: 'Portal da Água', url: 'https://portaldaagua.pt/utilitarios-e-informacao-util/', desc: 'Portal da campanha Água é Vida, inclui coleção de links para vários tipos de recursos relativos a qualidade e disponibilidade de água' },
    { name: 'Introdução à gestão de recursos hídricos', url: 'https://academy.cabi.org/enrol/index.php?id=425', desc: 'Curso gratuito em inglês sobre gestão eficiente da água, sobretudo na agricultura. É necessário fazer login.' },
    { name: 'Relatório do Estado do Ambiente – Água', url: 'https://rea.apambiente.pt/dominio_ambiental/agua?language=pt-pt', desc: 'Síntese oficial com indicadores de água em Portugal, resume disponibilidade e contexto hídrico,, incluis várias fichas técnicas sobre diferentes sub-temas' },
    { name: 'Base de Dados de Recursos Hidrogeológicos Portugueses', url: 'https://geoportal.lneg.pt/pt/bds/rec_hidrogeol/#!/?tipoAgua=0&carta=0&distrito=0&concelho=0&unidade=0&objetivo=0&uso=0', desc: 'Base portuguesa muito relevante para água subterrânea, com informação sobre furos, poços, nascentes e sondagens. É especialmente útil para disponibilidade hídrica local' },
    { name: 'Permaculture Practice Water Management', url: 'https://rwsw.pt/wp-content/uploads/2024/02/MED_ESTAB_EMERG_POS_INCENDIO_FLORESTAL_PT.pdf', desc: 'LIsta de artigos em inglês sobre gestão de água: técnicas de armazenamento e conservação de água, criação de jardis e hortas eficientes, etc.' },
    { name: 'Permaculture Earthworks Handbook', url: 'https://vdoc.pub/download/the-permaculture-earthworks-handbook-how-to-design-and-build-swales-dams-ponds-and-other-water-harvesting-systems-1uns70esldog', desc: 'Livro em inglês sobre construção de estruturas de armazenamento e água de média-grande dimensão: lagos, swales, pequenas barragens, etc. També tem muita informação sobre ciclos da água na Natureza e afatores a ter em conta no design.' },
    { name: 'Rainwater Harvesting Resources', url: 'https://www.harvestingrainwater.com/resource/rainwater-permaculture-handouts/', desc: 'Recursos gratuitos em inglês sobre captação de água das chuvas: como fazer cálculos importantes, guias de avaliação dos terrenos, etc. Também aborda outros tipos de recolha da água: condensação, águas cinzentas, nevoeiro' },
  ],
  fires: [
    { name: 'Sistema de Gestão Integrada de Fogos Rurais (SGIFR)', url: 'https://www.sgifr.gov.pt', desc: 'Portal Interinstitucional do Sistema de Gestão Integrada de Fogos Rurais, com informação para os cidadãos, inclui acesso a informação estatística sobre incêndios rurais' },
    { name: 'Regimes de fogo em Portugal Continental', url: 'https://www.sgifr.gov.pt/documents/196633/0/Apresentacao_Regimes-de-fogo-em-Portugal-Continental.pdf', desc: 'PDF técnico para entender os regimes de fogo em Portugal, com cartografia por freguesia, dados de área ardida, sazonalidade e ligação entre regime de fogo, uso do solo e demografia' },
    { name: 'Aliança pela Floresta Autóctone', url: 'https://florestautoctone.webnode.pt', desc: 'Apelo à mudança nos incentivos para a gestão do fogo, inclui um mapa de organizações e entidades que apoiam as florestas nativas' },
    { name: 'Combate a incêndios florestais', url: 'https://www.enb.pt/images/DOCS/PDF/manual_bombeiro/Combate_Incendios_Florestais.pdf', desc: 'Manual de bombeiros que explica vários temas relativos à gestão de fogo e combate aos incêndios florestais' },
    { name: 'Avaliação de espécies para faixas vivas', url: 'https://www.sciencedirect.com/science/article/pii/S0378112725007844', desc: 'Artigo científico em inglês que analisa o potencial de várias espécies para faaxas vivas, inclui algumas espécies presentes em território português ou muito semelhantes' },
    { name: 'Cortafuegos Verdes', url: 'https://fundacionglobalnature.org/cortafuegosverdes/', desc: 'Site espanhol com informação sobre projeto de faixas vivas realizado em colaboração com vários proprietários de terrenos, inclui mapas' },
    { name: 'Soluções naturais para fogs florestais', url: 'https://www.europarl.europa.eu/cmsdata/306535/4.%20STOA_Wilfires_PICOS.pdf', desc: 'Apresentação em inglês incluindo vários exemplos de projetos na península Ibérica que utilizaram métodos alternativos para gestão de fogo' },
    { name: 'Plataforma para o Desenho de Corta-fogos Produtivos', url: 'https://cortafuegosproductivos.unex.es/', desc: 'Site espanhol com exemplo de projetos e manual de desenho de corta-fogos produtivos' },
    { name: 'Artigo FIREPOCTEC', url: 'https://energylab.es/wp-content/uploads/2023/01/Art%C3%ADculo-FIREPOCTEP_FuturENVIRO_PAPEL_Enero-2023.pdf', desc: 'Artigo espanhol com resultados do projeto FIREPOCTEP, projeto colaborativo de gestão de fogo entre Portugal e Espanha' },
    { name: 'Espécies antiincendios', url: 'https://metodoambiental.com/barreras-antiincendios/', desc: 'Artigo espanhol sobre faixas vivas, inclui espécies apropriadas' },
    { name: 'Ecologia do fogo e gestão de áreas ardidas', url: 'https://www.academia.edu/56833778/Ecologia_do_fogo_e_gestão_de_áreas_ardidas', desc: 'Livro completo com vários capítulos sobre os efeitos do fogo e sobre várias facetas da gestão pós-fogo. Possível ler online mas é necessário fazer login' },
    { name: 'Gestão de fogos rurais', url: 'https://www.icnf.pt/florestas/gfr', desc: 'Página do ICNF com link para vários recursos relativos a risco de incêndio, planeamento e gestão de fogos' },
    { name: 'Medidas de estabilização de emergência pós-incêndio florestal', url: 'https://rwsw.pt/wp-content/uploads/2024/02/MED_ESTAB_EMERG_POS_INCENDIO_FLORESTAL_PT.pdf', desc: 'Guia da Rewilding Sudoeste com medidas imediatas e generalistas para responder aos principais problemas decorrentes da passagem de um grande incêndio.' },
    { name: 'Gestão do Solo Pós-Incêndio', url: 'https://rwsw.pt/wp-content/uploads/2024/02/MED_ESTAB_EMERG_POS_INCENDIO_FLORESTAL_PT.pdf', desc: 'Boletim com vários métodos e estratégios utilizados na recuperação de solos após incêndios' },
  ],
  landuse: [
    { name: 'Sistema Nacional de Informação Territorial', url: 'https://snit-sgt.dgterritorio.gov.pt', desc: 'Serviço oficial para consultar planos nacionais, regionais e municipais em vigor, com acesso online gratuito' },
    { name: 'COScid (COS para o cidadão)', url: 'https://smos.dgterritorio.gov.pt/coscid/', desc: 'Visualizador da Carta de Uso e Ocupação do Solo (COS), permite consultar o mapa, conhecer dinâmicas e obter estatística e informação variada, sobre o território continental ou unidades administrativas, sem necessitar de conhecimentos técnicos' },
    { name: 'Visualizadores DGT', url: 'https://www.dgterritorio.gov.pt/visualizadores', desc: 'Porta de entrada para vários visualizadores da Direção Geral do Território, incluindo vários mapas e registos fotográficos.' },
    { name: 'GeoPortalBUPi', url: 'https://bupi.gov.pt/GeoPortalBUPi.html', desc: 'Portal do Balcão Único do Prédio com acesso a mapas, aplicações e dados abetos relativos à georeferenciação de terrenos afetuada através do Balcão Único do Prédio' },
    { name: 'Mapa Público BUPi', url: 'https://bupi.gov.pt/GeoPortalBUPi.html', desc: 'Visualizador que permite explorar as Representações Gráficas Georreferenciadas (RGG) identificadas no BUPi, os dados da Carta Cadastral e os limites administrativos da Carta Administrativa Oficial de Portugal.' },
    { name: 'Rade Agrícola Nacional', url: 'https://www.dgadr.gov.pt/pt/cartografia/reserva-agricola-nacional', desc: 'Mapa interativo da Rede Agrícola Nacional em diferentes zonas do país' },
  ],
  soil: [
    { name: 'Viva ao ritmo da Natureza', url: 'https://pt.rhythmofnature.net/calendario-biodinamico', desc: 'Calendários interativos de plantação, jardinagem e agricultura, entre outros temas, inclui calendário biodinâmico e calendário lunar para jardineiros/agricultores' },
    { name: 'Calendário da horta por região', url: 'https://www.hortasbiologicas.pt/calendario-da-horta-por-regioes-em-portugal/', desc: 'Calendário de sementeira, transplante e colheita para várias espécies de acordo com uma divisão do país em 5 regiões climáticas' },
    { name: 'Calendário de sementeira interativo', url: 'https://www.hortasbiologicas.pt/calendario-de-sementeiras-interativo/', desc: 'Calendário com várias visualizaçãos, permite ver informação por mês e espécie, com links sobre cultivo em modo biológico' },
    { name: 'Viveiros ICNF', url: 'https://www.icnf.pt/florestas/plantasesementes/viveiros', desc: 'Lista de viveiros florestais sobre gestão do ICNF, é possível consultar os regulamentos para cedência de plantas para eventos ligaods è reflorestação' },
    { name: 'Árvores indígenas em Portugal Continental', url: 'https://www.icnf.pt/api/file/doc/adcdbb835d1a032a', desc: 'Documento do ICNF com guia de espécies indígenas, informação sobre condições ideais para plantação e colheita de sementes' },
    { name: 'CENASEF', url: 'https://www.icnf.pt/florestas/plantasesementes/cenasef', desc: 'Informação sobre o Centro Nacional de Sementes Florestais, com catálogo e instruções para encomenda de sementes de árvores nativas' },
    { name: 'Manual de Técnicas de Viveiro', url: 'https://biologia.ufrj.br/wp-content/uploads/2015/10/Livro_Manual-de-técnicas-de-viveiro-para-espécies-arbóreas-nativas.pdf', desc: 'Manual brasileiro sobre criação de viveiros de plantas nativas, cuidados a ter e conselhos para implementação e gestão de um viveiro' },
  ],
};
