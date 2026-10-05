# Architect Manager

> Frontend en Angular para diseñar y documentar arquitecturas de software: registro de componentes cloud, generación de diagramas (draw.io, UML de secuencia y ArchiMate), documentos de solución y tablas de tags para centros de costos.

![Angular](https://img.shields.io/badge/Angular-17.3-DD0031?logo=angular&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.4-3178C6?logo=typescript&logoColor=white)
![RxJS](https://img.shields.io/badge/RxJS-7.8-B7178C?logo=reactivex&logoColor=white)
![SCSS](https://img.shields.io/badge/SCSS-CC6699?logo=sass&logoColor=white)

---

## Tabla de contenido

- [Características](#características)
- [Módulos](#módulos)
- [Stack tecnológico](#stack-tecnológico)
- [Requisitos](#requisitos)
- [Instalación y ejecución](#instalación-y-ejecución)
- [Configuración](#configuración)
- [Seguridad de peticiones](#seguridad-de-peticiones)
- [API consumida](#api-consumida)
- [Estructura del proyecto](#estructura-del-proyecto)
- [Interfaz y diseño](#interfaz-y-diseño)
- [Scripts disponibles](#scripts-disponibles)
- [Autor](#autor)

---

## Características

- **Registro de componentes** de arquitectura (`eks`, `lambda`, `fargate`, `ec2`) de forma manual o por **importación masiva desde Excel/CSV**, con vista previa y validación por fila.
- **Generación de diagramas draw.io** a partir de la lista de componentes, con descarga directa del archivo.
- **Diagramas de secuencia UML** en PlantUML, con vista previa renderizada y descarga en PNG.
- **Modelos ArchiMate** (capa de motivación) exportados en XML.
- **Documento de solución** generado a partir de una problemática y mostrado en una vista previa aislada (`iframe` + `srcdoc`).
- **Consulta de CECO** (centros de costos) con búsqueda en tiempo real (*debounce* y descarte de respuestas obsoletas), y generación de una **tabla de tags en PNG** con Canvas.
- **Cifrado extremo a extremo de las peticiones** con AES-GCM mediante un interceptor HTTP.
- **Interfaz moderna**: barra lateral colapsable con grupos desplegables, menús contextuales, tema claro/oscuro, transiciones animadas entre vistas y diseño responsive.

## Módulos

| Ruta         | Módulo              | Descripción                                                                                   |
|--------------|---------------------|-----------------------------------------------------------------------------------------------|
| `/alta`      | Alta de arquitectura | Alta manual de componentes e importación de `.xlsx`, `.xls` o `.csv` (col. A: nombre, col. B: tipo). |
| `/lista`     | Lista               | Tabla de componentes, vista/copia del JSON, envío a la API y descarga del diagrama generado.  |
| `/secuencia` | Diagrama UML        | Título, contexto, actor principal y pasos dinámicos → PlantUML + imagen PNG.                  |
| `/archimate` | ArchiMate           | Business Actors, Drivers, Goals, Principles y Course of Actions → `archimate-model.xml`.      |
| `/documento` | Documento           | Problemática en texto libre → documento HTML renderizado.                                     |
| `/tags`      | Tags (CECO)         | Metadatos del proyecto + búsqueda de CECO → tabla clave/valor exportable en PNG.              |

> El estado de los componentes vive en memoria (`ArquitecturaService` con `BehaviorSubject`), compartido entre vistas durante la sesión.

## Stack tecnológico

- **Angular 17** (módulos NgModule, `FormsModule`, `HttpClientModule`, `@angular/animations`)
- **TypeScript 5.4** y **RxJS 7.8**
- **SCSS** con *design tokens* en variables CSS (tema claro/oscuro)
- **[SheetJS (xlsx)](https://sheetjs.com/)** para leer archivos Excel en el navegador
- **Web Crypto API** (`crypto.subtle`) para el cifrado AES-GCM y SHA-256
- **PlantUML server** público para renderizar los diagramas de secuencia
- **Karma + Jasmine** para pruebas unitarias

## Requisitos

- **Node.js** 18.13+ o 20.x LTS (Angular 17 no soporta oficialmente versiones impares)
- **npm** 9+ (o **bun**, existe `bun.lock`)
- Backend compatible expuesto en la URL configurada en `apiBaseUrl` (ver [API consumida](#api-consumida))

## Instalación y ejecución

```bash
# 1. Clonar el repositorio
git clone <url-del-repositorio>
cd front-dinamic-architect

# 2. Instalar dependencias
npm install

# 3. Levantar el servidor de desarrollo
npm start
```

La aplicación queda disponible en **http://localhost:4200/** y se recarga automáticamente al guardar cambios.

### Build de producción

```bash
npm run build
```

Los artefactos se generan en `dist/front-dinamic-architect/`, listos para servirse desde cualquier hosting estático (configura el *fallback* a `index.html` para las rutas del router).

## Configuración

La configuración vive en `src/environments/`:

```ts
export const environment = {
  production: false,
  apiBaseUrl: 'http://localhost:3000',
  requestSecurity: {
    enabled: true,                 // activa el interceptor de seguridad
    mode: 'aes-gcm' as const,      // 'aes-gcm' | 'sha256'
    sharedSecret: 'CHANGE_ME_DEV_SECRET',
    protectQueryParams: true,      // cifra también los query params
    encryptedQueryParamName: 'enc' // nombre del parámetro cifrado
  }
};
```

| Archivo                  | Uso                                        |
|--------------------------|--------------------------------------------|
| `environment.ts`         | Desarrollo (`ng serve`)                    |
| `environment.prod.ts`    | Producción (`ng build`)                    |

> ⚠️ Reemplaza `sharedSecret` por el valor acordado con el backend. Al ser una aplicación de navegador, el secreto queda incluido en el bundle: protege el canal frente a inspecciones casuales, pero no sustituye a HTTPS ni a la autenticación del lado servidor.

## Seguridad de peticiones

`SecureBodyInterceptor` intercepta **solo** las peticiones dirigidas a `apiBaseUrl`:

**Modo `aes-gcm`** (por defecto)
1. Deriva la clave AES-256 como `SHA-256(sharedSecret)`.
2. Cifra el body JSON con un IV aleatorio de 12 bytes y lo envía como `{ "data": base64(iv ‖ ciphertext) }`.
3. Si hay query params, los serializa a JSON, los cifra y los reemplaza por `?enc=<base64>`.
4. Si la respuesta llega con el sobre `{ "data": "..." }` (o como cadena base64), la descifra y la devuelve con el `responseType` esperado. Si no puede descifrarla, entrega la respuesta original.

**Modo `sha256`**
- No cifra: añade los encabezados `X-Body-SHA256` y `X-Query-SHA256` con el hash del contenido para verificar su integridad.

Los cuerpos `FormData`, `Blob`, `ArrayBuffer` y `URLSearchParams` se envían sin modificar.

## API consumida

| Método | Endpoint                     | Body (antes de cifrar)                                                                 | Respuesta esperada |
|--------|------------------------------|----------------------------------------------------------------------------------------|--------------------|
| POST   | `/diagram/from-json`         | `{ componentes: string[], tipo: ("eks"\|"lambda"\|"fargate"\|"ec2")[] }`                | XML draw.io en texto, o `{ filename, mimeType, fileBase64 }` |
| POST   | `/secuencia/uml/raw`         | `{ titulo, contexto, actorPrincipal, pasos: [{ descripcion }] }`                       | PlantUML en texto, `{ data: { uml } }` o `{ filename, mimeType, fileBase64 }` |
| POST   | `/archimate/from-json`       | `{ businessActors, drivers, goals, principles, courseOfActions }` (cada uno `[{ name }]`) | XML ArchiMate |
| POST   | `/document/generate-problem` | `{ problematica: string }`                                                             | `{ html: string }` |
| GET    | `/ceco/search?q=<texto>`     | —                                                                                      | `[{ ceco, nombreCorto, nombreLargo, responsable }]` |

Ejemplo del JSON que genera la vista **Lista**:

```json
{
  "componentes": ["pos-service-back", "orders-lambda"],
  "tipo": ["eks", "lambda"]
}
```

## Estructura del proyecto

```
src/
├── app/
│   ├── components/
│   │   ├── alta-arquitectura/     # Alta manual + importación Excel
│   │   ├── lista-arquitectura/    # Tabla, JSON y envío a API
│   │   ├── diagrama-secuencia/    # Generador UML (PlantUML)
│   │   ├── archimate/             # Generador ArchiMate (XML)
│   │   ├── documento/             # Documento de solución
│   │   └── tags/                  # Búsqueda CECO + tabla PNG
│   ├── interceptors/
│   │   └── secure-body.interceptor.ts   # Cifrado/descifrado de peticiones
│   ├── models/
│   │   └── arquitectura.model.ts        # Tipos de dominio
│   ├── services/
│   │   ├── arquitectura.service.ts      # Estado de componentes (BehaviorSubject)
│   │   └── request-security.service.ts  # AES-GCM, SHA-256, base64
│   ├── app.component.*            # Shell: sidebar, topbar, menús y animaciones
│   ├── app-routing.module.ts
│   └── app.module.ts
├── environments/                  # Configuración por entorno
├── styles.scss                    # Design system global (tokens, botones, tablas…)
└── index.html
```

## Interfaz y diseño

- **Barra lateral** con grupos desplegables (*Arquitectura*, *Diagramas*, *Herramientas*), indicador animado de la ruta activa y contador de componentes. Se puede **contraer** a modo solo-iconos con *tooltips*, y en móvil funciona como menú *off-canvas*.
- **Barra superior** con *breadcrumb*, acceso rápido a la lista, menú desplegable **Crear** y menú de **perfil/preferencias**.
- **Tema claro/oscuro** que respeta `prefers-color-scheme` y recuerda la elección del usuario (`localStorage`).
- **Animaciones**: transiciones entre rutas con `@angular/animations`, entrada escalonada de tarjetas y filas, acordeones en ArchiMate, *shimmer* en estados de carga y brillo al pasar el mouse sobre los botones. Se respeta `prefers-reduced-motion`.
- **Design tokens** centralizados en `src/styles.scss` (colores, radios, sombras, tipografía *Plus Jakarta Sans* + *JetBrains Mono*).

## Scripts disponibles

| Comando          | Descripción                                        |
|------------------|----------------------------------------------------|
| `npm start`      | Servidor de desarrollo en `http://localhost:4200`  |
| `npm run build`  | Build de producción en `dist/`                     |
| `npm run watch`  | Build en modo observación (configuración development) |
| `npm test`       | Pruebas unitarias con Karma + Jasmine              |

## Autor

Creado por **Antonio Alonso**.
