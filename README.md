# Sinfonía Retail - Prototipo de arquitectura en la nube

Prototipo de la Actividad 2 "Orquestando códigos: la sinfonía de los sistemas" (Arquitectura de Software, Unidad 1).
Plataforma de comercio electrónico de instrumentos musicales dividida en cuatro servicios que aplican patrones de diseño para la nube.

## Arquitectura

| Servicio | Puerto | Responsabilidad | Patrones |
|---|---|---|---|
| `gateway` | 8080 | Punto de entrada, panel web, enrutamiento y salud agregada | API Gateway, Rate Limiting (token bucket), Health Endpoint Monitoring |
| `catalog` | 4001 | Productos e inventario | Cache-Aside, reservas idempotentes |
| `orders` | 4002 | Recepción y procesamiento de pedidos | Queue-Based Load Leveling, Saga orquestada, Circuit Breaker, Retry |
| `payments` | 4003 | Cobro simulado con inyección de fallos | Idempotency Key |

Código de los patrones reutilizables: `src/shared/`.

## Ejecución local (Node.js 20 o superior, sin dependencias)

```bash
npm start            # los cuatro servicios en un proceso; panel en http://localhost:8080
npm test             # 12 pruebas (unitarias y de integración)
```

## Ejecución con contenedores

```bash
docker compose up --build   # cuatro contenedores, panel en http://localhost:8080
```

## Despliegue en la nube

La imagen es única y se configura con variables de entorno (`SERVICE`, `PORT`, `CATALOG_URL`, `ORDERS_URL`, `PAYMENTS_URL`).
Con `SERVICE=all` (valor por defecto) todo corre en un contenedor que escucha en `$PORT`, apto para servicios gestionados como Google Cloud Run:

```bash
gcloud run deploy sinfonia-retail --source . --region us-central1 --allow-unauthenticated
```

## API

| Método y ruta | Descripción |
|---|---|
| `GET /api/products` | Catálogo con stock |
| `POST /api/orders` | Crea un pedido `{customer, items:[{productId, qty}]}`; responde `202` con el identificador |
| `GET /api/orders/{id}` | Estado: `PENDING`, `PROCESSING`, `CONFIRMED` o `CANCELLED` |
| `GET /api/health` | Salud agregada (503 si algún servicio cae) |
| `GET /api/metrics` | Caché, cola y estado del Circuit Breaker |
| `POST /api/admin/chaos` | `{failureRate: 0..1}` inyecta fallos en pagos para demostrar Retry y Circuit Breaker |

## Demostración de resiliencia

1. Abrir el panel y pulsar "Ráfaga de 10 pedidos": se aceptan de inmediato y la cola los procesa con dos trabajadores.
2. Pulsar "Inyectar 100% de fallos" y crear pedidos: el Circuit Breaker pasa a `OPEN` y los pedidos se cancelan con compensación de stock.
3. Pulsar "Restablecer": tras el tiempo de espera el circuito pasa a `HALF_OPEN` y vuelve a `CLOSED`.

## Limitaciones conocidas

Los datos viven en memoria (se pierden al reiniciar) y la cola es local al proceso; en producción se sustituirían por una base de datos gestionada y un broker de mensajes. El servicio de pagos es un simulador.
