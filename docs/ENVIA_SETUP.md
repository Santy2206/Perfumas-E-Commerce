# Envia.com — pasos para ti (envíos nacionales)

## Seguridad primero

Pegaste el API token en el chat. **Rótalo** en el panel de Envia (genera uno nuevo y borra el viejo). No lo subas a Git ni lo pegues otra vez en chats.

## 1. Variables en Vercel (tienda Next.js)

Project → Settings → Environment Variables → Production (y Preview si quieres):

| Variable | Valor |
|---|---|
| `ENVIA_TOKEN` | tu API key nueva |
| `ENVIA_API_URL` | `https://api.envia.com` |
| `ENVIA_QUERIES_URL` | `https://queries.envia.com` |
| `ENVIA_DEFAULT_CARRIERS` | `coordinadora,servientrega,interrapidisimo,envia,tcc` |
| `ENVIA_ORIGIN_NAME` | `Perfumas` |
| `ENVIA_ORIGIN_STREET` | `Calle 18 #103a-26` |
| `ENVIA_ORIGIN_CITY` | `Bogota` |
| `ENVIA_ORIGIN_STATE` | `DC` |
| `ENVIA_ORIGIN_POSTAL_CODE` | `110911` (ajusta al CP real de Fontibón) |
| `ENVIA_ORIGIN_PHONE` | celular de la tienda |
| `ENVIA_ORIGIN_EMAIL` | `pedidos@perfumas.com.co` |
| `NEXT_PUBLIC_SITE_URL` | `https://tienda.perfumas.com.co` |

Redeploy la tienda después de guardar.

## 2. Fondear cuenta Envia

En producción las guías se cobran del saldo Envia. Recarga en el dashboard antes de generar la primera guía real.

## 3. Registrar webhook

URL (HTTPS, puerto 443):

```text
https://tienda.perfumas.com.co/api/shipping/envia/webhook
```

**Opción A — panel Envia**

1. Entra a Envia → sección **Webhooks**.
2. Clic **+ Agregar**.
3. Pega la URL de arriba.
4. Guarda (tipo tracking / status updates).

**Opción B — Ops Perfumas**

1. Ve a `https://tienda.perfumas.com.co/ops/envios`
2. Pon `OPS_PANEL_SECRET`
3. Clic **Registrar webhook Envia**

## 4. Usar en el día a día

1. Cliente paga un pedido **Envío nacional**.
2. En `/ops/envios` filtra Pendiente / hub Fontibón.
3. En el pedido nacional: **Crear envío Envia**.
4. El sistema **cotiza todos los carriers**, elige la **tarifa más barata**, genera guía PDF + tracking y puede email al cliente.
5. Si esa guía falla al generar, prueba la siguiente más barata.
6. Los cambios de estado llegan por webhook → `shipping_status` (`in_transit`, `delivered`, …).

Bogotá sigue con **Crear envío Picap**.

## 5. Requisitos del pedido

Para que Envia funcione, el pedido debe tener:

- Dirección completa
- Ciudad
- **Código postal** (muy importante)
- Departamento (recomendado; si falta se intenta inferir)

Si falla por CP, edita el pedido o pide el postal en checkout.

## 6. Probar

1. Pedido de prueba nacional (o usa sandbox si tienes token de test: `api-test.envia.com` / `queries-test.envia.com`).
2. Ops → Crear envío Envia.
3. Abre el PDF de la guía.
4. En Envia, usa “test webhook” si existe, o espera un evento real.

## 7. Carriers a cotizar

`ENVIA_DEFAULT_CARRIERS` define **qué** carriers se cotizan (no el orden de preferencia).
Siempre gana el **precio más bajo** entre todas las tarifas válidas.

```bash
curl -H "Authorization: Bearer $ENVIA_TOKEN" \
  "https://queries.envia.com/carrier?country_code=CO"
```

Usa los slugs exactos que te devuelva esa lista.