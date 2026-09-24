# TechSupport Pro — Frontend

SPA en React + TypeScript para el backend de TechSupport Pro. Incluye autenticación multiusuario con JWT (rotación de refresh tokens), control de acceso por rol y una interfaz completa para operar tickets, reportes, archivos, la cola de procesamiento y usuarios.

## Stack

- React 19 + TypeScript + Vite
- React Router 6 (rutas protegidas por rol)
- TanStack Query (fetching, cache e invalidación)
- Axios (cliente HTTP con interceptor de refresh automático)
- Tailwind CSS
- Recharts (reportes)

## Roles y accesos

| Módulo    | ADMIN | SUPERVISOR | AGENTE |
| --------- | :---: | :--------: | :----: |
| Tickets   |  ✅   |     ✅     |   ✅   |
| Reportes  |  ✅   |     ✅     |   ❌   |
| Archivos  |  ✅   |     ✅     |   ❌   |
| Cola      |  ✅   |     ❌     |   ❌   |
| Usuarios  |  ✅   |     ❌     |   ❌   |

La navegación lateral solo muestra las secciones permitidas para el rol del usuario autenticado, y las rutas están protegidas también a nivel de router (no solo de UI).

## Configuración

```bash
cp .env.example .env
```

`VITE_API_URL` debe apuntar a la API del backend (por defecto `http://localhost:3000/api`).

## Desarrollo

```bash
npm install
npm run dev
```

## Build de producción

```bash
npm run build
npm run preview
```

## Notas de autenticación

- El backend emite un access token de vida corta (15 min) y un refresh token de 7 días.
- El endpoint `/api/auth/refresh` requiere el access token vigente en el header `Authorization`, por lo que el frontend programa una renovación proactiva ~1 minuto antes de que expire, además de reintentar una vez ante una respuesta 401.
- Si la renovación falla, la sesión se limpia y el usuario vuelve a `/login`.

## Endpoints adicionales usados por este frontend

El backend original no exponía listados de clientes, agentes ni usuarios (necesarios para los selectores del formulario de tickets y la administración de cuentas). Se agregaron los siguientes endpoints de solo lectura, protegidos con `authMiddleware` (y `requireRole([ADMIN])` para `/auth/users`), siguiendo la misma arquitectura por capas del proyecto:

- `GET /api/clients?search=&page=&pageSize=`
- `GET /api/agents?search=&active=&page=&pageSize=`
- `GET /api/auth/users?page=&pageSize=` (solo ADMIN)
