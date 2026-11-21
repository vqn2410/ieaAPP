// Contenido estructurado en módulos (contenido, videos y quizzes 1 por pantalla)
// Basado en https://github.com/misatevez/e-learning-iea (CRECER 1)

export const PASSING_PERCENTAGE = 70;

export const DISCIPLESHIP_MODULES = [
  {
    id: 'mod-1',
    number: 1,
    title: 'Bienvenida y Propósito de I.E.A.',
    description: 'Introducción a la familia de Iglesia Extremo Amor y la Gran Comisión.',
    items: [
      {
        id: 'm1-video-intro',
        type: 'video',
        title: 'Bienvenida a CRECER 1',
        duration: '5 min',
        videoUrl: '',
        videoDuration: '05:20',
        summary:
          'Este módulo presenta la visión de CRECER 1: conocer la Palabra, integrarte a la familia de I.E.A. y caminar en propósito junto a otros.',
        contenido: [
          'En esta clase introductoria recorremos qué significa dar el paso del discipulado en Iglesia Extremo Amor y cómo aprovechar cada módulo.',
          'Podés pausar, tomar notas y avanzar a tu ritmo. Cada módulo combina lectura breve, videos de apoyo y una pregunta de repaso obligatoria.',
        ],
        listas: [
          {
            titulo: 'Qué vas a descubrir en este curso',
            items: [
              'El corazón y propósito de Iglesia Extremo Amor',
              'Cómo proclamamos a Cristo en nuestra ciudad y el mundo',
              'El valor de los Grupos de Crecimiento y los 4 módulos CRECER',
              'Qué significa pasar de ser consumidor a contribuyente',
            ],
          },
        ],
      },
      {
        id: 'bienvenida',
        type: 'content',
        title: 'Bienvenida a IEA',
        duration: '3 min',
        summary:
          'El discipulado no es solo conocimiento teórico: al llevar la Palabra a la práctica disfrutamos una vida plena guiada por el Espíritu Santo.',
        contenido: [
          'Bienvenido a IEA.',
          'Estamos muy felices de que hayas dado el paso de aprender más de la Palabra de Dios.',
          'A través del discipulado no solo recibirás conocimiento, sino que al llevar a la práctica lo aprendido podrás disfrutar una vida plena en todas las áreas de tu vida.',
          'Deseamos que Dios prospere tu vida espiritual en este tiempo, que disfrutes cada clase y que permitas que el Espíritu Santo obre en tu corazón.',
        ],
        versiculo: {
          texto: 'Lámpara es a mis pies tu palabra, y lumbrera a mi camino.',
          referencia: 'Salmos 119:105 (RV1960)',
        },
      },
      {
        id: 'proposito',
        type: 'content',
        title: 'Nuestro Propósito',
        duration: '4 min',
        summary:
          'La iglesia es una familia y nuestra meta principal es comprometernos con Cristo y con la familia de Iglesia Extremo Amor.',
        versiculo: {
          texto: 'Que todos vivan en armonía y que no haya divisiones entre ustedes.',
          referencia: '1 Corintios 1:10 (NVI)',
        },
        listas: [
          {
            titulo: 'Ideas Centrales',
            items: [
              'La iglesia es una familia',
              'Dios espera que seas de la familia de la iglesia',
              'Un cristiano sin una familia en la iglesia es un huérfano',
            ],
          },
        ],
        meta: 'Comprometernos con Cristo y con la familia de la iglesia Extremo Amor (I.E.A).',
      },
      {
        id: 'gran_comision',
        type: 'content',
        title: '¿Por qué existimos como iglesia?',
        duration: '4 min',
        descripcion: 'Nuestro propósito se basa en la Gran Comisión.',
        summary:
          'Existimos para cumplir la Gran Comisión a través de cuatro pilares: evangelización, cuidado pastoral, discipulado y ministerio.',
        versiculos: [
          {
            texto: 'Vayan por todo el mundo y anuncien las buenas nuevas a toda criatura.',
            referencia: 'Marcos 16:15-16,20 (NVI)',
          },
          {
            texto: 'A este Cristo proclamamos, aconsejando y enseñando.',
            referencia: 'Colosenses 1:28-29 (NVI)',
          },
        ],
        listas: [
          {
            titulo: 'Puntos Clave',
            items: ['Evangelización', 'Cuidado pastoral', 'Discipulado', 'Ministerio'],
          },
        ],
      },
      {
        id: 'quiz-q1',
        type: 'quiz',
        title: 'Quiz 1 · Nuestro Propósito',
        duration: 'Obligatoria',
        summary: 'Evaluación sobre la meta principal de Iglesia Extremo Amor.',
        quiz: {
          id: 'q1',
          sectionTitle: 'Nuestro Propósito',
          pregunta:
            '¿Cuál es la meta principal de la iglesia según la sección Nuestro Propósito?',
          opciones: [
            'Ser la iglesia más grande de la ciudad',
            'Comprometernos con Cristo y con la familia de la iglesia Extremo Amor',
            'Construir nuevos edificios',
            'Hacer eventos sociales cada fin de semana',
          ],
          respuestaCorrecta: 1,
          explicacion:
            'El propósito principal es el compromiso con Cristo y la familia de la fe en I.E.A.',
        },
      },
    ],
  },
  {
    id: 'mod-2',
    number: 2,
    title: 'Proclamando a Cristo y Hábitos',
    description: 'Cómo compartimos el mensaje, dónde lo hacemos y qué pasos prácticos podemos dar.',
    items: [
      {
        id: 'proclamamos',
        type: 'content',
        title: 'A este Cristo proclamamos',
        duration: '4 min',
        summary:
          'Proclamamos a Cristo en nuestros servicios y ganando personas mediante responsabilidad personal, relación, testimonio e invitación.',
        listas: [
          {
            titulo: 'Servicios',
            items: ['Celebración', 'Inspiración', 'Preparación', 'Salvación'],
          },
          {
            titulo: 'Ganar Personas',
            items: [
              'Aceptar la responsabilidad personal',
              'Establecer una relación personal',
              'Compartir la historia personal',
              'Hacer una invitación personal',
            ],
          },
        ],
      },
      {
        id: 'donde_proclamamos',
        type: 'content',
        title: '¿Dónde proclamamos a Cristo?',
        duration: '3 min',
        summary:
          'Hechos 1:8 nos llama a ser testigos comenzando por Jerusalén (mi ciudad), Judea y Samaria (mi nación) y hasta los confines de la tierra (mi mundo).',
        lugares: [
          { nombre: 'Jerusalén', descripcion: 'Mi ciudad' },
          { nombre: 'Judea y Samaria', descripcion: 'Mi nación' },
          { nombre: 'Confines de la tierra', descripcion: 'Mi mundo' },
        ],
        versiculo: {
          texto: 'Serán mis testigos hasta los confines de la tierra.',
          referencia: 'Hechos 1:8 (NVI)',
        },
      },
      {
        id: 'quiz-q2',
        type: 'quiz',
        title: 'Quiz 2 · ¿Dónde proclamamos a Cristo?',
        duration: 'Obligatoria',
        summary: 'Evaluación sobre el significado de Jerusalén en Hechos 1:8.',
        quiz: {
          id: 'q2',
          sectionTitle: '¿Dónde proclamamos a Cristo?',
          pregunta:
            "¿Qué significa 'Jerusalén' en el contexto de dónde proclamamos a Cristo?",
          opciones: [
            'Mi nación',
            'El mundo entero',
            'Mi ciudad',
            'Un lugar histórico lejano',
          ],
          respuestaCorrecta: 2,
          explicacion:
            'Jerusalén representa nuestra esfera de influencia más cercana: nuestra propia ciudad.',
        },
      },
      {
        id: 'habitos',
        type: 'content',
        title: '¿Qué puedo hacer?',
        duration: '3 min',
        summary:
          'Cada miembro puede involucrarse de forma concreta practicando tres hábitos: Orar, Ir y Dar.',
        contenido: [
          'Ser parte de la misión de Dios no está reservado a unos pocos: cada persona puede dar pasos sencillos y transformadores cada semana.',
        ],
        listas: [
          {
            titulo: 'Hábitos',
            items: ['Orar', 'Ir', 'Dar'],
          },
        ],
      },
      {
        id: 'quiz-q4',
        type: 'quiz',
        title: 'Quiz 3 · Hábitos clave',
        duration: 'Obligatoria',
        summary: 'Evaluación sobre los tres hábitos prácticos para involucrarse.',
        quiz: {
          id: 'q4',
          sectionTitle: '¿Qué puedo hacer?',
          pregunta:
            'Según el módulo "¿Qué puedo hacer?", ¿cuáles son los tres hábitos clave para involucrarse?',
          opciones: [
            'Leer, cantar y viajar',
            'Orar, Ir y Dar',
            'Estudiar, enseñar y administrar',
            'Asistir, escuchar y opinar',
          ],
          respuestaCorrecta: 1,
          explicacion:
            'Los tres hábitos prácticos propuestos en CRECER 1 son Orar, Ir y Dar.',
        },
      },
    ],
  },
  {
    id: 'mod-3',
    number: 3,
    title: 'Grupos de Crecimiento y Ruta CRECER',
    description: 'Cómo crecemos acompañados y cuáles son los 4 módulos de formación.',
    items: [
      {
        id: 'm3-video-grupos',
        type: 'video',
        title: 'Video · Vida en comunidad y Grupos',
        duration: '6 min',
        videoUrl: '',
        videoDuration: '06:15',
        summary:
          'La iglesia no pasa solo en una reunión: en los grupos encontramos amistad genuina, cuidado pastoral y herramientas para crecer.',
        contenido: [
          'En este video exploramos por qué nadie fue diseñado para caminar solo y cómo los Grupos de Crecimiento son el corazón relacional de nuestra iglesia.',
        ],
        listas: [
          {
            titulo: 'Claves de la vida en comunidad',
            items: [
              'Relaciones reales durante la semana',
              'Cuidado mutuo y acompañamiento en oración',
              'Espacio seguro para hacer preguntas y crecer en la fe',
            ],
          },
        ],
      },
      {
        id: 'aconsejando',
        type: 'content',
        title: 'Aconsejando y Enseñando a todos',
        duration: '4 min',
        descripcion:
          'La iglesia crece conectándose a través de ministerios y grupos de crecimiento, y Crecer provee herramientas para desarrollarse como seguidor de Cristo.',
        summary:
          'Conectarse en grupos ofrece conexión, protección y crecimiento, mientras que CRECER brinda herramientas prácticas para cada discípulo.',
        listas: [
          {
            titulo: 'Beneficios de los Grupos de Crecimiento',
            items: ['Conectarse', 'Protección', 'Crecimiento'],
          },
        ],
      },
      {
        id: 'quiz-q3',
        type: 'quiz',
        title: 'Quiz 4 · Grupos de crecimiento',
        duration: 'Obligatoria',
        summary: 'Evaluación sobre los beneficios de conectarse en grupos.',
        quiz: {
          id: 'q3',
          sectionTitle: 'Aconsejando a todos',
          pregunta:
            '¿Cuál de estos es un beneficio de conectarse a través de grupos de crecimiento?',
          opciones: [
            'Obtener descuentos en libros',
            'Protección y Crecimiento',
            'Tener más seguidores en redes sociales',
            'Evitar ir a las celebraciones dominicales',
          ],
          respuestaCorrecta: 1,
          explicacion:
            'Los grupos de crecimiento ofrecen un entorno de protección, conexión y crecimiento espiritual.',
        },
      },
      {
        id: 'que_es_crecer',
        type: 'content',
        title: '¿En qué consiste Crecer?',
        duration: '4 min',
        summary:
          'La ruta CRECER se compone de 4 módulos progresivos: Iglesia 1, Esenciales 2, Descubrimiento 3 y Voluntarios 4.',
        modulos: [
          {
            numero: 1,
            nombre: 'Iglesia 1',
            descripcion: 'Introducción a la Iglesia Extremo Amor',
          },
          {
            numero: 2,
            nombre: 'Esenciales 2',
            descripcion: 'Hábitos esenciales del creyente',
          },
          {
            numero: 3,
            nombre: 'Descubrimiento 3',
            descripcion: 'ADN de la iglesia',
          },
          {
            numero: 4,
            nombre: 'Voluntarios 4',
            descripcion: 'Servicio y equipos',
          },
        ],
      },
      {
        id: 'quiz-q5',
        type: 'quiz',
        title: 'Quiz 5 · Módulos de CRECER',
        duration: 'Obligatoria',
        summary: 'Evaluación sobre los 4 módulos de la ruta CRECER.',
        quiz: {
          id: 'q5',
          sectionTitle: '¿En qué consiste Crecer?',
          pregunta: '¿Qué módulos componen la ruta CRECER en Iglesia Extremo Amor?',
          opciones: [
            'Iglesia 1, Esenciales 2, Descubrimiento 3 y Voluntarios 4',
            'Historia 1, Música 2, Finanzas 3 y Liderazgo 4',
            'Bautismo 1 y Evangelismo 2 únicamente',
            'Solo un seminario anual de teología',
          ],
          respuestaCorrecta: 0,
          explicacion:
            'CRECER se organiza en 4 módulos: Iglesia 1, Esenciales 2, Descubrimiento 3 y Voluntarios 4.',
        },
      },
    ],
  },
  {
    id: 'mod-4',
    number: 4,
    title: 'Creencias, Organización y Compromiso',
    description: 'Nuestras verdades esenciales, cómo nos organizamos y el compromiso con la familia I.E.A.',
    items: [
      {
        id: 'creencias',
        type: 'content',
        title: 'Nuestras Creencias y Organización',
        duration: '5 min',
        summary:
          'Caminamos en unidad, libertad y amor sobre verdades bíblicas esenciales, sostenidos por un liderazgo pastoral íntegro y transparente.',
        listas: [
          {
            titulo: 'Creencias',
            items: ['Unidad', 'Libertad', 'Amor'],
          },
          {
            titulo: 'Verdades Esenciales',
            items: [
              'La Biblia es la Palabra de Dios',
              'Jesucristo es el Hijo de Dios',
              'Nuevo nacimiento',
              'Llenos y guiados por el Espíritu Santo',
            ],
          },
          {
            titulo: 'Estructura Organizacional',
            items: [
              'Liderazgo pastoral',
              'Equipo pastoral',
              'Equipo financiero',
              'Integridad y balance anual',
            ],
          },
        ],
      },
      {
        id: 'compromiso',
        type: 'content',
        title: 'Nuestro deseo y Compromiso con la familia I.E.A.',
        duration: '5 min',
        summary:
          'Deseamos que pases de ser un consumidor que solo asiste a un contribuyente que protege la unidad, sirve con sus dones y apoya el testimonio de la iglesia.',
        conceptos: [
          { titulo: 'Consumidor', descripcion: 'El que solo asiste' },
          { titulo: 'Contribuyente', descripcion: 'El que se compromete' },
        ],
        listas: [
          {
            titulo: 'Nuestro deseo para ti',
            items: [
              'Ser parte de la familia Extremo Amor',
              'Unirse a un Grupo de Crecimiento',
              'Completar los módulos CRECER',
              'Servir en el equipo de voluntarios',
            ],
          },
          {
            titulo: 'Compromisos',
            items: [
              'Proteger la unidad',
              'Compartir la responsabilidad',
              'Servir con dones y talentos',
              'Apoyar el testimonio de la iglesia',
            ],
          },
        ],
      },
      {
        id: 'quiz-q6',
        type: 'quiz',
        title: 'Quiz 6 · Compromiso con la familia I.E.A.',
        duration: 'Obligatoria',
        summary: 'Evaluación final sobre ser Contribuyente en la familia I.E.A.',
        quiz: {
          id: 'q6',
          sectionTitle: 'Compromiso con la familia I.E.A',
          pregunta:
            'En "Compromiso con la familia I.E.A", ¿qué diferencia a un Contribuyente de un Consumidor?',
          opciones: [
            'El Contribuyente solo asiste de vez en cuando y el Consumidor lidera',
            'El Contribuyente se compromete a proteger la unidad, servir y apoyar el testimonio de la iglesia',
            'No hay diferencia entre ambos conceptos',
            'El Consumidor sirve con sus dones y el Contribuyente solo observa',
          ],
          respuestaCorrecta: 1,
          explicacion:
            'Mientras el consumidor solo asiste, el contribuyente se compromete activamente con Cristo y la familia de la iglesia.',
        },
      },
    ],
  },
];

export const DISCIPLESHIP_ALL_ITEMS = DISCIPLESHIP_MODULES.flatMap((mod) =>
  mod.items.map((item) => ({
    ...item,
    moduleId: mod.id,
    moduleNumber: mod.number,
    moduleTitle: mod.title,
  }))
);

export const DISCIPLESHIP_QUIZ_QUESTIONS = DISCIPLESHIP_ALL_ITEMS
  .filter((item) => item.type === 'quiz' && item.quiz)
  .map((item) => item.quiz);

export const DISCIPLESHIP_COURSES = [
  {
    id: 'crecer-1',
    number: 1,
    nombre: 'CRECER 1',
    subtitulo: 'Iglesia',
    tituloCompleto: 'Discipulado · CRECER 1: Iglesia Extremo Amor',
    institucion: 'I.E.A - Iglesia Extremo Amor',
    descripcion:
      'Introducción a la Iglesia Extremo Amor: propósito, Gran Comisión, grupos de crecimiento, creencias y compromiso.',
    isLocked: false,
    modules: DISCIPLESHIP_MODULES,
  },
  {
    id: 'crecer-2',
    number: 2,
    nombre: 'CRECER 2',
    subtitulo: 'Esenciales',
    tituloCompleto: 'Discipulado · CRECER 2: Esenciales del Creyente',
    institucion: 'I.E.A - Iglesia Extremo Amor',
    descripcion:
      'Madurez espiritual y hábitos esenciales del creyente para construir una relación sólida y diaria con Dios.',
    isLocked: true,
    modules: [
      {
        id: 'c2-mod-1',
        number: 1,
        title: 'La Palabra de Dios en tu vida diaria',
        description: 'Cómo leer, meditar y aplicar las Escrituras en cada área de tu vida.',
        items: [],
      },
      {
        id: 'c2-mod-2',
        number: 2,
        title: 'Vida de Oración y Comunión',
        description: 'Desarrollando un diálogo cercano y constante con el Padre.',
        items: [],
      },
      {
        id: 'c2-mod-3',
        number: 3,
        title: 'Adoración y Vida en el Espíritu',
        description: 'Vivir guiados por el Espíritu Santo más allá de una reunión.',
        items: [],
      },
      {
        id: 'c2-mod-4',
        number: 4,
        title: 'Mayordomía y Generosidad',
        description: 'Administrar tiempo, talentos y recursos con un corazón generoso.',
        items: [],
      },
    ],
  },
  {
    id: 'crecer-3',
    number: 3,
    nombre: 'CRECER 3',
    subtitulo: 'Descubrimiento',
    tituloCompleto: 'Discipulado · CRECER 3: Descubrimiento y ADN',
    institucion: 'I.E.A - Iglesia Extremo Amor',
    descripcion:
      'Descubrí tu diseño en Cristo, tus dones espirituales, tu personalidad y el ADN de Iglesia Extremo Amor.',
    isLocked: true,
    modules: [
      {
        id: 'c3-mod-1',
        number: 1,
        title: 'Tu Diseño y Propósito en Cristo',
        description: 'Entendiendo quién sos en Dios y para qué fuiste creado.',
        items: [],
      },
      {
        id: 'c3-mod-2',
        number: 2,
        title: 'Dones Espirituales',
        description: 'Identificá los dones que el Espíritu Santo depositó en vos para edificar a otros.',
        items: [],
      },
      {
        id: 'c3-mod-3',
        number: 3,
        title: 'Pasión, Historia y Talentos',
        description: 'Cómo Dios usa tu historia personal y tus habilidades para bendecir a la ciudad.',
        items: [],
      },
      {
        id: 'c3-mod-4',
        number: 4,
        title: 'ADN y Cultura de I.E.A.',
        description: 'Nuestros valores en acción: Fe, Amistad, Jesús, Buen Ánimo, Amor y Generosidad.',
        items: [],
      },
    ],
  },
  {
    id: 'crecer-4',
    number: 4,
    nombre: 'CRECER 4',
    subtitulo: 'Voluntarios',
    tituloCompleto: 'Discipulado · CRECER 4: Voluntarios y Servicio',
    institucion: 'I.E.A - Iglesia Extremo Amor',
    descripcion:
      'Preparación práctica para sumarte a los equipos de servicio y marcar la diferencia en la iglesia y la ciudad.',
    isLocked: true,
    modules: [
      {
        id: 'c4-mod-1',
        number: 1,
        title: 'El Corazón del Servidor',
        description: 'Servir a la manera de Jesús con humildad, excelencia y alegría.',
        items: [],
      },
      {
        id: 'c4-mod-2',
        number: 2,
        title: 'Cultura de Equipo en I.E.A.',
        description: 'Unidad, cuidado mutuo y liderazgo saludable dentro de cada ministerio.',
        items: [],
      },
      {
        id: 'c4-mod-3',
        number: 3,
        title: 'Áreas de Servicio y Ministerios',
        description: 'Conocé los equipos de la iglesia y dónde podés sumar tus dones.',
        items: [],
      },
      {
        id: 'c4-mod-4',
        number: 4,
        title: 'Activación y Compromiso de Servicio',
        description: 'Tus primeros pasos prácticos dentro del equipo de voluntarios I.E.A.',
        items: [],
      },
    ],
  },
];
