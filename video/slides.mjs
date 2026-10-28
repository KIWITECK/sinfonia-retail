// Contenido de la presentación: cada diapositiva tiene su visual y el guion que se locuta.
// El texto del guion usa números en palabras y sin símbolos para que la voz sintética lo lea bien.

export const slides = [
  {
    id: 's01', kind: 'title',
    title: 'Orquestando códigos: la sinfonía de los sistemas',
    lines: ['Arquitectura de microservicios en la nube para Sinfonía Retail', 'David Amaya', 'Tecnológica del Oriente · Arquitectura de Software · Unidad 1, Actividad 2'],
    narration: 'Buenas tardes. Mi nombre es David Amaya y a continuación presento la solución arquitectónica de la Actividad 2 del curso Arquitectura de Software, titulada Orquestando códigos: la sinfonía de los sistemas. El proyecto propone una arquitectura de microservicios en la nube para Sinfonía Retail, una tienda en línea de instrumentos musicales. Durante los próximos quince minutos recorreré el análisis de requisitos, los diagramas UML, los patrones de diseño seleccionados, la demostración del prototipo y las conclusiones.',
  },
  {
    id: 's02', kind: 'bullets', title: 'Contenido',
    items: ['1. El problema y los requisitos', '2. Diseño de la arquitectura con UML', '3. Patrones de diseño para la nube', '4. Prototipo: demostración, pruebas y mediciones', '5. Ejecución en la nube, conclusiones y limitaciones'],
    narration: 'La presentación sigue el orden del informe. Primero, el problema y los requisitos. Segundo, el diseño de la arquitectura con cuatro diagramas UML: casos de uso, clases, secuencia y despliegue. Tercero, los patrones de diseño para la nube y por qué se eligieron. Cuarto, el prototipo: su estructura, una demostración con evidencia real, las pruebas y las mediciones. Y por último, la forma de ejecutarlo en la nube, las conclusiones y las limitaciones. El código y el informe están disponibles en el repositorio que se enlaza en la descripción de este video.',
  },
  {
    id: 's03', kind: 'bullets', title: 'El problema: un monolito que no resiste las campañas',
    items: ['Las visitas se multiplican en campañas y el sitio se degrada', 'Si la pasarela de pagos se demora, todo el sitio deja de responder', 'Pedidos simultáneos reservan la misma existencia: sobreventa', 'Cada corrección obliga a desplegar la aplicación completa'],
    footer: 'Meta: una arquitectura modular, escalable por partes, tolerante a fallas de terceros y desplegable en la nube.',
    narration: 'Sinfonía Retail vende instrumentos musicales por internet, y su plataforma actual es un monolito: catálogo, pedidos y pagos viven en un mismo proceso y una misma base de datos. Los responsables del negocio reportaron cuatro problemas. Uno: en campañas como el Día de la Música las visitas se multiplican y el sitio se degrada. Dos: cuando la pasarela de pagos responde con lentitud, los recursos quedan ocupados y todo el sitio deja de responder. Tres: pedidos simultáneos reservan la misma existencia y se produce sobreventa. Y cuatro: cualquier corrección obliga a desplegar la aplicación completa. La empresa necesita una arquitectura modular, que escale por partes, que tolere las fallas de terceros y que se pueda desplegar en la nube.',
  },
  {
    id: 's04', kind: 'columns', title: 'Requisitos funcionales',
    columns: [
      { head: 'Cliente', items: ['RF-01 Consultar el catálogo', 'RF-02 Crear un pedido', 'RF-05 Consultar el estado del pedido'] },
      { head: 'Sistema', items: ['RF-03 Reservar inventario sin sobreventa', 'RF-04 Procesar el pago', 'RF-06 Cancelar y liberar inventario si el pago falla'] },
      { head: 'Administrador', items: ['RF-07 Ver salud y métricas', 'RF-08 Simular fallos de la pasarela de pagos'] },
    ],
    narration: 'Del análisis salieron ocho requisitos funcionales, redactados como historias de usuario. El cliente consulta el catálogo, crea pedidos con uno o más ítems y revisa el estado de cada pedido. El sistema, por su cuenta, reserva el inventario sin permitir sobreventa, procesa el pago y, si el pago falla o es rechazado, cancela el pedido y libera el inventario; esta última regla es la que protege la consistencia. El administrador, por su parte, puede ver la salud y las métricas del sistema, y simular fallos de la pasarela de pagos para probar la resiliencia. Todos estos requisitos se trazan después hacia casos de uso y servicios.',
  },
  {
    id: 's05', kind: 'table', title: 'Requisitos no funcionales como escenarios medibles',
    head: ['Atributo', 'Escenario', 'Mecanismo'],
    rows: [
      ['Desempeño', 'Lectura repetida del catálogo en menos de 10 ms', 'Cache-Aside'],
      ['Escalabilidad', 'Ráfaga de 40 pedidos: mediana de aceptación menor a 100 ms', 'Cola de trabajo'],
      ['Tolerancia a fallos', 'Rechazo en menos de 50 ms con el circuito abierto; recuperación 5 s después', 'Circuit Breaker y Retry'],
      ['Consistencia', 'Ningún pedido cancelado deja inventario reservado', 'Saga e idempotencia'],
      ['Mantenibilidad', 'Cada servicio se modifica y despliega por separado', 'Servicios y API Gateway'],
      ['Portabilidad', 'Se ejecuta en cualquier plataforma de contenedores', 'Imagen única'],
      ['Operabilidad', 'Salud y métricas en menos de 1 s', 'Health Endpoint Monitoring'],
      ['Seguridad', 'Un cliente no puede saturar el sistema', 'Límite de tasa'],
    ],
    narration: 'Los requisitos no funcionales se expresaron como escenarios de calidad con una métrica verificable, siguiendo a Bass, Clements y Kazman, y se clasificaron con el modelo ISO veinticinco mil diez. Por ejemplo: la lectura repetida del catálogo debe tardar menos de diez milisegundos; en una ráfaga de cuarenta pedidos, la mediana de aceptación debe ser inferior a cien milisegundos sin esperar el cobro; si el servicio de pagos cae, el rechazo debe ocurrir en menos de cincuenta milisegundos una vez abierto el circuito, y el sistema debe recuperarse cinco segundos después de que el servicio vuelva; y ningún pedido cancelado puede dejar inventario reservado. Además hay requisitos de mantenibilidad, portabilidad, operabilidad y seguridad. Cada escenario tiene asociado un mecanismo arquitectónico, y eso guía la selección de patrones.',
  },
  {
    id: 's06', kind: 'boxes', title: 'Estilo arquitectónico: microservicios',
    boxes: [
      { head: 'API Gateway', text: 'Punto único de entrada, límite de tasa y salud agregada' },
      { head: 'Catálogo', text: 'Productos, inventario y reservas idempotentes; Cache-Aside' },
      { head: 'Pedidos', text: 'Cola de trabajo, saga orquestada, Retry y Circuit Breaker' },
      { head: 'Pagos', text: 'Cobro idempotente e inyección de fallos' },
    ],
    footer: 'Cada servicio tiene su responsabilidad y su estado; ninguno comparte base de datos.',
    narration: 'Con ese análisis se adoptó un estilo de microservicios con cuatro componentes. El API Gateway es el único punto de entrada: enruta, limita la tasa de solicitudes y agrega la salud de los demás. El servicio de catálogo administra productos e inventario. El servicio de pedidos recibe los pedidos, los encola y ejecuta el flujo de procesamiento. Y el servicio de pagos cobra, es idempotente y permite inyectar fallos. Cada servicio tiene una responsabilidad y un estado propios, y ninguno comparte base de datos con otro, para no reintroducir el acoplamiento del monolito. Los cuatro diagramas que siguen están hechos en UML dos punto cinco.',
  },
  {
    id: 's07', kind: 'image', title: 'Diagrama de casos de uso', image: 'assets/01-casos-de-uso.svg',
    narration: 'Este es el diagrama de casos de uso. Define el alcance desde la perspectiva de los actores. El cliente consulta el catálogo, crea pedidos y consulta su estado. El administrador monitorea la salud y las métricas, e inyecta fallos en pagos. La pasarela de pagos es un actor externo. Fíjense en las relaciones: crear pedido incluye reservar inventario y procesar pago, porque no existe un pedido sin esas dos acciones; y se extiende con compensar y cancelar el pedido, que solo ocurre cuando algo falla. Este diagrama es relevante porque traza cada requisito funcional hacia una capacidad del sistema y fija los límites de los servicios.',
  },
  {
    id: 's08', kind: 'image', title: 'Diagrama de clases', image: 'assets/02-clases.svg',
    narration: 'El diagrama de clases muestra el modelo estático. ApiGateway depende de los tres servicios y no contiene lógica de negocio. OrderService compone una cola de trabajo y un interruptor de circuito, y administra pedidos formados por uno o más ítems. CatalogService compone un Cache Aside y administra productos. Lo importante es que las clases que implementan patrones, la cola, el interruptor y la caché, son independientes de los servicios. Eso permite reutilizarlas y probarlas de forma aislada, y favorece la mantenibilidad.',
  },
  {
    id: 's09', kind: 'image', title: 'Diagrama de secuencia: creación de un pedido', image: 'assets/03-secuencia.svg',
    narration: 'El diagrama de secuencia describe el flujo principal. El cliente envía un pedido al Gateway, que lo reenvía a Orders. Orders lo pone en la cola y responde de inmediato con 202 Accepted: el cliente no espera el cobro. Un trabajador toma el pedido, reserva el inventario en el catálogo y solicita el pago, protegido por reintentos y por el interruptor de circuito. Aquí aparece el fragmento alternativo. Si el pago se aprueba, el pedido pasa a confirmado. Si hay rechazo, fallo o el circuito está abierto, se ejecuta la compensación: se libera el inventario y el pedido queda cancelado. Después, el cliente consulta el resultado con la ruta de estado. Este diagrama justifica la naturaleza asíncrona del diseño.',
  },
  {
    id: 's10', kind: 'image', title: 'Diagrama de despliegue', image: 'assets/04-despliegue.svg',
    narration: 'El diagrama de despliegue muestra cómo se distribuyen los artefactos. El navegador accede por HTTPS al contenedor del gateway, que se comunica por HTTP con los contenedores de catálogo, pedidos y pagos. Los cuatro se construyen con una misma imagen de Node veintidós y se diferencian por una variable de entorno llamada SERVICE. Por eso pueden desplegarse en una plataforma de contenedores gestionada, como Google Cloud Run, o ejecutarse juntos en un solo contenedor. Los nodos con línea discontinua son la evolución prevista: una caché gestionada, un broker de mensajes y una pasarela real. No forman parte del prototipo.',
  },
  {
    id: 's11', kind: 'table', title: 'Patrones de diseño seleccionados',
    head: ['Patrón', 'Problema que resuelve', 'Requisito'],
    rows: [
      ['API Gateway', 'Los clientes no deben conocer los servicios', 'Mantenibilidad, operabilidad'],
      ['Cache-Aside', 'Lecturas repetidas sobrecargan la fuente de datos', 'Desempeño'],
      ['Queue-Based Load Leveling', 'Las ráfagas saturan el procesamiento síncrono', 'Escalabilidad'],
      ['Saga orquestada', 'No hay transacción distribuida entre catálogo y pagos', 'Consistencia'],
      ['Circuit Breaker', 'Una dependencia caída propaga el fallo', 'Tolerancia a fallos'],
      ['Retry', 'Los fallos transitorios no deben cancelar pedidos', 'Tolerancia a fallos'],
      ['Idempotent Receiver', 'Un reintento no debe cobrar ni reservar dos veces', 'Consistencia'],
      ['Health Endpoint Monitoring', 'El operador debe saber qué componente falló', 'Operabilidad'],
      ['Rate Limiting', 'Un cliente puede saturar el sistema', 'Seguridad'],
    ],
    narration: 'Para la selección de patrones se partió del catálogo de patrones de computación en la nube de Microsoft y de la bibliografía de microservicios, y se adoptaron únicamente los que responden de forma directa a un requisito no funcional. API Gateway, para ocultar la ubicación y el número de servicios. Cache Aside, para las lecturas repetidas del catálogo. Queue-Based Load Leveling, para absorber ráfagas. Saga orquestada, porque no hay una transacción distribuida entre catálogo y pagos. Circuit Breaker y Retry, para tolerar los fallos de la pasarela. Idempotent Receiver, para que un reintento no cobre ni reserve dos veces. Health Endpoint Monitoring, para saber qué componente falló. Y límite de tasa, para que un cliente no sature el sistema.',
  },
  {
    id: 's12', kind: 'columns', title: 'Justificación de las decisiones',
    columns: [
      { head: 'Saga orquestada', items: ['El pedido cruza solo dos servicios', 'Un orquestador concentra la lógica', 'Evita dependencias cíclicas'] },
      { head: 'Retry + Circuit Breaker', items: ['Retry absorbe fallos transitorios', 'El interruptor corta los persistentes', 'El reintento envuelve al interruptor'] },
      { head: 'Alternativas descartadas', items: ['Monolito modular: no aísla fallos', 'Commit en dos fases: las pasarelas no lo ofrecen', 'Base de datos compartida: acoplamiento'] },
    ],
    narration: 'Algunas decisiones merecen justificación. Se eligió una saga orquestada y no coreografiada porque el pedido atraviesa solo dos servicios y el flujo tiene un orden claro; un orquestador concentra la lógica y evita dependencias cíclicas. Retry y Circuit Breaker se combinan porque cubren fallos distintos: el reintento absorbe los transitorios y el interruptor evita que, cuando el fallo es persistente, cada pedido consuma todos sus reintentos. En el prototipo el reintento envuelve al interruptor, de modo que cada intento cuenta como fallo y, una vez abierto el circuito, los reintentos se detienen. Y se descartaron tres alternativas: el monolito modular, porque no escala ni aísla fallos por partes; el commit en dos fases, porque las pasarelas externas no lo ofrecen; y la base de datos compartida, porque reintroduce el acoplamiento.',
  },
  {
    id: 's13', kind: 'tree', title: 'Prototipo: estructura del repositorio',
    tree: [
      'sinfonia-retail/',
      '    src/services/   catalog · payments · orders · gateway',
      '    src/shared/     circuit-breaker · retry · cache · queue · http',
      '    public/         panel web de demostración',
      '    test/           12 pruebas (unitarias e integración)',
      '    scripts/        bench.mjs (mediciones)',
      '    docs/           informe APA 7 y diagramas UML',
      '    Dockerfile · docker-compose.yml · README.md',
    ],
    footer: 'Node.js 22, módulos ES, sin dependencias externas.',
    narration: 'Pasemos al prototipo. Está escrito en Node veintidós con módulos ES y sin dependencias externas, para que cualquier revisor pueda ejecutarlo. En la carpeta src services están los cuatro servicios; en src shared, las implementaciones de los patrones: el interruptor de circuito, el reintento con retroceso exponencial, la caché Cache Aside y la cola de trabajo. Hay un panel web, un Dockerfile y un docker compose. Cada patrón es una clase o función pequeña con pruebas propias, así que su comportamiento se verifica sin levantar la red. El repositorio tiene un README y un historial de commits organizado por funcionalidad.',
  },
  {
    id: 's14', kind: 'stats', title: 'Demostración 1: caché y cola de trabajo',
    stats: [
      { value: '118,6 ms → 0,7 ms', label: 'Lectura del catálogo sin caché y con caché (mediana, n = 30)' },
      { value: '42 ms', label: 'Tiempo en aceptar una ráfaga de 40 pedidos (mediana por solicitud: 26,8 ms)' },
      { value: '1,74 s', label: 'Procesamiento completo de los 40 pedidos con dos trabajadores' },
    ],
    footer: 'Medido con node scripts/bench.mjs',
    narration: 'Veamos el comportamiento con evidencia real. Primero, la caché. Una lectura del catálogo sin caché tarda ciento dieciocho milisegundos, porque la base de datos simula cien milisegundos de latencia; con la caché, la mediana baja a siete décimas de milisegundo. Segundo, la cola. Una ráfaga de cuarenta pedidos fue aceptada en cuarenta y dos milisegundos, con una mediana de aceptación de veintiséis milisegundos por solicitud. El procesamiento completo tomó un segundo y setecientos cuarenta milisegundos con dos trabajadores. Es decir, el cliente no espera el cobro y la cola absorbe el pico al ritmo que soporta el servicio de pagos.',
  },
  {
    id: 's15', kind: 'imageText', title: 'Demostración 2: caída del servicio de pagos', image: 'assets/panel-circuito-abierto.png',
    items: ['Se inyecta 100 % de fallos en pagos', 'Primer pedido: cancelado en 481 ms (agota reintentos)', 'Pedidos siguientes: cancelados en cerca de 20 ms, con el circuito abierto', 'Inventario del violín: 25 unidades, la compensación liberó cada reserva', 'Tras 5 s: circuito semiabierto, prueba exitosa, circuito cerrado'],
    narration: 'Ahora inyectamos un cien por ciento de fallos en el servicio de pagos desde el panel. El primer pedido tarda cuatrocientos ochenta y un milisegundos en cancelarse, porque agota sus reintentos con retroceso exponencial. Pero esos fallos abren el circuito. Los pedidos siguientes se cancelan en unos veinte milisegundos, con la razón circuito abierto. Es el comportamiento esperado: falla rápido en lugar de ocupar a los trabajadores. En la captura se ve el interruptor en OPEN, los pedidos cancelados y, lo más importante, el inventario del violín sigue en veinticinco unidades: la compensación liberó cada reserva. Al restablecer el servicio y esperar cinco segundos, el circuito pasa a medio abierto, la prueba tiene éxito y vuelve a cerrado; el siguiente pedido se confirma.',
  },
  {
    id: 's16', kind: 'table', title: 'Pruebas y mediciones frente a los umbrales',
    head: ['Escenario', 'Umbral', 'Resultado', 'Cumple'],
    rows: [
      ['Lectura del catálogo', 'Menos de 10 ms con caché', '118,6 ms sin caché; 0,7 ms con caché', 'Sí'],
      ['Ráfaga de 40 pedidos', 'Mediana menor a 100 ms', '26,8 ms; 40 aceptados en 42 ms', 'Sí'],
      ['Caída de pagos', 'Menos de 50 ms con circuito abierto', '481 ms el primero; luego cerca de 20 ms', 'Sí'],
      ['Recuperación', 'A los 5 s de restablecer el servicio', 'Pedido CONFIRMED a los 5,2 s', 'Sí'],
      ['Consistencia', 'Sin reservas huérfanas', 'Violín: 24 de 25 (un pedido confirmado)', 'Sí'],
    ],
    footer: '12 pruebas automatizadas (5 unitarias y 7 de integración): todas pasan con npm test. Una ejecución local representativa.',
    narration: 'El prototipo cuenta con doce pruebas automatizadas con el ejecutor nativo de Node: cinco unitarias de los patrones y siete de integración del sistema completo. Cubren la saga exitosa, la compensación por falta de inventario, el rechazo de un pago, la apertura y la recuperación del interruptor, el acierto de caché y la validación de entradas. Todas pasan. La tabla resume las mediciones frente a los umbrales definidos: los cinco escenarios cumplen. Aclaro que son mediciones en un equipo local, de una ejecución representativa, y que los valores varían entre ejecuciones.',
  },
  {
    id: 's17', kind: 'bullets', title: 'Ejecución en la nube y repositorio',
    items: ['Imagen de contenedor única, configurada con variables de entorno', 'SERVICE=all: un contenedor que escucha en el puerto de la plataforma (p. ej., Cloud Run)', 'docker compose up: los cuatro servicios por separado', 'Verificado en ejecución local; despliegue documentado en el README', 'Repositorio: código, pruebas, diagramas, informe y guion de mediciones'],
    narration: 'En cuanto a la nube: la imagen de contenedor es única y se configura con variables de entorno. Con SERVICE igual a all, todo corre en un contenedor que escucha en el puerto que indica la plataforma, lo que la hace compatible con servicios gestionados como Google Cloud Run; el comando está en el README. Con docker compose up se levantan los cuatro contenedores por separado. Debo ser transparente: el prototipo se verificó en ejecución local y está empaquetado y documentado para la nube; el despliegue en un proveedor concreto sigue los pasos del README. El repositorio incluye el código, las pruebas, los diagramas, el informe técnico y el guion de mediciones.',
  },
  {
    id: 's18', kind: 'bullets', title: 'Conclusiones',
    items: ['Servicios y API Gateway: modularidad', 'Cola y Cache-Aside: escalabilidad y rendimiento', 'Retry, Circuit Breaker y saga con compensación: tolerancia a fallas sin perder consistencia', 'Los cinco escenarios medidos cumplieron sus umbrales', 'UML permitió trazar cada requisito hasta un componente'],
    narration: 'Como conclusiones: la arquitectura responde a los cuatro problemas de Sinfonía Retail con patrones concretos y verificables. La separación por servicios y el API Gateway aportan modularidad. La cola y el Cache Aside, escalabilidad y rendimiento. Y la combinación de Retry, Circuit Breaker y saga con compensación, tolerancia a fallas sin pérdida de consistencia. Las mediciones cumplieron los umbrales y el modelado UML permitió trazar cada requisito hasta un componente.',
  },
  {
    id: 's19', kind: 'columns', title: 'Limitaciones y trabajo futuro',
    columns: [
      { head: 'Limitaciones', items: ['Datos en memoria', 'Cola local al proceso: un reinicio pierde pedidos pendientes', 'Pasarela de pagos simulada', 'Sin autenticación'] },
      { head: 'En producción', items: ['Broker de mensajes en lugar de la cola local', 'Base de datos gestionada por servicio', 'Caché compartida', 'Autenticación en el Gateway y trazabilidad distribuida'] },
      { head: 'Trabajo futuro', items: ['Medir bajo carga sostenida en la nube', 'Validar las mismas métricas fuera del entorno local'] },
    ],
    narration: 'El prototipo tiene límites que conviene declarar. Guarda los datos en memoria. Su cola es local al proceso, así que un reinicio pierde los pedidos pendientes. La pasarela de pagos es simulada y no hay autenticación. En producción corresponde sustituir la cola por un broker de mensajes, usar una base de datos gestionada por servicio, mover la caché a un servicio compartido y añadir autenticación en el Gateway y trazabilidad distribuida. Como trabajo futuro, medir el sistema bajo carga sostenida en la nube para validar las mismas métricas fuera del entorno local.',
  },
  {
    id: 's20', kind: 'title', title: 'Gracias',
    lines: ['David Amaya', 'Informe técnico, código fuente e instrucciones de ejecución en el repositorio'],
    narration: 'Con esto concluye la presentación. Gracias por su atención. El informe técnico, el código fuente y las instrucciones de ejecución están en el repositorio. Quedo atento a preguntas.',
  },
];
