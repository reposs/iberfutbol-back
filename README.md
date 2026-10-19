# IberFútbol — Backend

API oficial para partidos en directo, resultados, clasificaciones, equipos, jugadores y actualidad del fútbol español.

## Requisitos previos

- Node.js >= 20.x
- npm >= 10.x

## Instalación y ejecución

```bash
# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env

# Servidor de desarrollo (puerto 3000)
npm run start:dev

# Compilación para producción
npm run build
npm run start:prod
```

## Endpoints principales

- `GET /api/matches/calendar`: Calendario de partidos.
- `GET /api/matches/live`: Partidos en directo.
- `GET /api/standings/:competition`: Clasificaciones oficiales.
- `GET /api/teams`: Directorio de clubes.
- `GET /api/players`: Directorio y estadísticas de jugadores.
- `GET /api/news`: Actualidad y noticias del fútbol español.
- `GET /api/search?q=...`: Buscador multientidad.
- `GET /api/health`: Estado del servicio.
