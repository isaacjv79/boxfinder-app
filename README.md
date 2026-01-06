# BoxFinder

App de inventario inteligente para organizar contenedores con QR y reconocimiento de objetos por IA (Claude Vision).

## Estructura del Proyecto

```
boxfinder/
├── backend/          # API NestJS
│   ├── src/
│   │   ├── auth/     # Autenticacion JWT
│   │   ├── containers/ # CRUD contenedores
│   │   ├── items/    # CRUD articulos
│   │   ├── vision/   # Integracion Claude Vision
│   │   └── prisma/   # Cliente de base de datos
│   └── prisma/       # Schema de BD
│
└── mobile/           # App React Native
    └── src/
        ├── screens/  # Pantallas de la app
        ├── store/    # Estado global (Zustand)
        ├── services/ # Cliente API
        └── types/    # Tipos TypeScript
```

## Requisitos

- Node.js 18+
- PostgreSQL
- Cuenta de Cloudinary (para imagenes)
- API Key de Anthropic (Claude Vision)
- Xcode (para iOS)
- Android Studio (para Android)

## Configuracion del Backend

1. Ir al directorio del backend:
```bash
cd backend
```

2. Instalar dependencias:
```bash
npm install
```

3. Configurar variables de entorno en `.env`:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/boxfinder"
JWT_SECRET="tu-secret-seguro"
ANTHROPIC_API_KEY="tu-api-key-de-anthropic"
CLOUDINARY_CLOUD_NAME="tu-cloud-name"
CLOUDINARY_API_KEY="tu-api-key"
CLOUDINARY_API_SECRET="tu-api-secret"
```

4. Crear la base de datos:
```bash
# Crear base de datos en PostgreSQL
createdb boxfinder

# Aplicar migraciones
npx prisma migrate dev
```

5. Iniciar el servidor:
```bash
npm run start:dev
```

El backend estara disponible en `http://localhost:3000`

## Configuracion de la App Movil

1. Ir al directorio mobile:
```bash
cd mobile
```

2. Instalar dependencias:
```bash
npm install
```

3. Actualizar la URL del API en `src/services/api.ts`:
```typescript
const API_URL = __DEV__
  ? 'http://localhost:3000/api'  // Desarrollo
  : 'https://tu-api.com/api';     // Produccion
```

4. Para iOS, instalar pods:
```bash
cd ios && pod install && cd ..
```

5. Ejecutar la app:
```bash
# iOS
npm run ios

# Android
npm run android
```

## Uso de la App

### 1. Crear Cuenta
- Abre la app y registrate con email y contrasena

### 2. Crear Contenedores
- En la pantalla principal, toca el boton "+"
- Ingresa nombre, ubicacion (fila/columna) y color
- Se genera automaticamente un codigo QR

### 3. Agregar Articulos
- Abre un contenedor y toca "Agregar Articulos"
- Toma fotos de los objetos
- Claude Vision identificara automaticamente cada articulo

### 4. Buscar Articulos
- Ve a la pestana "Buscar"
- Escribe el nombre del articulo
- La app te mostrara en que contenedor esta

## API Endpoints

### Auth
- `POST /api/auth/register` - Registrar usuario
- `POST /api/auth/login` - Iniciar sesion
- `GET /api/auth/me` - Obtener perfil

### Containers
- `GET /api/containers` - Listar contenedores
- `POST /api/containers` - Crear contenedor
- `GET /api/containers/:id` - Obtener contenedor con items
- `GET /api/containers/qr/:qrCode` - Obtener por codigo QR
- `PUT /api/containers/:id` - Actualizar
- `DELETE /api/containers/:id` - Eliminar

### Items
- `POST /api/items` - Crear item (con analisis IA)
- `GET /api/items/search?query=...` - Buscar items
- `GET /api/items/container/:id` - Items por contenedor
- `PUT /api/items/:id` - Actualizar item
- `DELETE /api/items/:id` - Eliminar item

## Costos Estimados

| Servicio | Plan | Costo |
|----------|------|-------|
| Railway (Backend) | Hobby | ~$5/mes |
| Cloudinary | Free tier | $0 |
| Claude API | Por uso | ~$0.003/imagen |

## Deploy a Produccion

### Backend en Railway

1. Crear cuenta en [Railway](https://railway.app)
2. Nuevo proyecto > Deploy from GitHub
3. Agregar PostgreSQL como servicio
4. Configurar variables de entorno
5. Deploy automatico

### App Movil

- **iOS**: Publicar en App Store via Xcode
- **Android**: Generar APK/AAB y publicar en Play Store

## Tecnologias

- **Backend**: NestJS, Prisma, PostgreSQL, JWT
- **Frontend**: React Native, Zustand, React Navigation
- **IA**: Claude Vision (Anthropic)
- **Storage**: Cloudinary
