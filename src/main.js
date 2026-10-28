import { fileURLToPath } from 'node:url';
import { startCatalog } from './services/catalog.js';
import { startPayments } from './services/payments.js';
import { startOrders } from './services/orders.js';
import { startGateway } from './services/gateway.js';

/** Levanta los cuatro servicios en un solo proceso (modo "all"). Útil para pruebas y despliegue de un solo contenedor. */
export async function startAll({ gatewayPort = 8080, catalogOptions, paymentsOptions, ordersOptions, gatewayOptions } = {}) {
  const catalog = await startCatalog(catalogOptions);
  const payments = await startPayments(paymentsOptions);
  const orders = await startOrders({ catalogUrl: catalog.url, paymentsUrl: payments.url, ...ordersOptions });
  const gateway = await startGateway({ port: gatewayPort, catalogUrl: catalog.url, ordersUrl: orders.url, paymentsUrl: payments.url, ...gatewayOptions });
  return {
    catalog, payments, orders, gateway,
    close: () => Promise.all([gateway, orders, payments, catalog].map((s) => s.close())),
  };
}

const env = process.env;
const num = (v, d) => (v === undefined ? d : Number(v));

async function main() {
  const mode = env.SERVICE ?? 'all';
  const urls = {
    catalogUrl: env.CATALOG_URL ?? 'http://127.0.0.1:4001',
    ordersUrl: env.ORDERS_URL ?? 'http://127.0.0.1:4002',
    paymentsUrl: env.PAYMENTS_URL ?? 'http://127.0.0.1:4003',
  };
  const port = num(env.PORT, undefined);

  if (mode === 'catalog') await startCatalog({ port: port ?? 4001 });
  else if (mode === 'payments') await startPayments({ port: port ?? 4003, failureRate: num(env.PAYMENT_FAILURE_RATE, 0) });
  else if (mode === 'orders') await startOrders({ port: port ?? 4002, catalogUrl: urls.catalogUrl, paymentsUrl: urls.paymentsUrl });
  else if (mode === 'gateway') await startGateway({ port: port ?? 8080, ...urls });
  else {
    await startAll({
      gatewayPort: port ?? 8080,
      paymentsOptions: { failureRate: num(env.PAYMENT_FAILURE_RATE, 0) },
    });
  }
  console.log(`[sinfonia-retail] servicio "${mode}" listo`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
