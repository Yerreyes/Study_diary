# Study Tracker Fullstack

Proyecto real completo con Node/Express + SQL Server y front React con Vite.

## Estructura

- `client/` React (Vite)
- `server/` API REST (Express + mssql)

## Requisitos

- Node 18+
- SQL Server

## Configuración y Ejecución

1. Crear la base de datos y tablas usando `server/schema.sql`.
2. Copiar `server/.env.example` a `server/.env` y llenar las credenciales necesarias.
3. Instalar todas las dependencias ejecutando:

   ```bash
   npm install
   ```

4. Iniciar la aplicación completa con:

   ```bash
   npm start
   ```

Esto iniciará tanto el cliente como el servidor simultáneamente.

## Backend

1. Crear BD y tablas con `server/schema.sql`.
2. Copiar `server/.env.example` a `server/.env` y llenar credenciales.
3. Instalar deps y correr:

```
cd server
npm install
npm start
```

La API corre en `http://localhost:4000`.

## Frontend

1. Copiar `client/.env.example` a `client/.env` si quieres cambiar la URL del backend.
2. Instalar deps y correr:

```
cd client
npm install
npm run dev
```

Abre la URL que muestre Vite (usualmente `http://localhost:5173`).

## Scripts raiz (opcional)

Desde la carpeta raiz:

```
npm run server
npm run client
```

## Endpoints

- `GET /api/sessions`
- `POST /api/sessions`
- `DELETE /api/sessions/:id`
- `GET /api/goal`
- `PUT /api/goal`
