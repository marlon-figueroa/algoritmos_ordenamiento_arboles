# Algoritmos de ordenamiento de árboles

Sitio en **Angular 22** y **Bootstrap 5.3** con un menú en grid en la página de inicio. Cada tarjeta abre la ficha de un algoritmo de ordenamiento basado en árboles. El maquetado es encabezado, cuerpo y pie de página, con tema claro y oscuro (`data-bs-theme`).

## Requisitos

- Node.js 22.22.3, 24.15 o 26+
- npm 10+

## Desarrollo

```bash
npm install
npm start
```

Abre `http://localhost:4200/`.

## Scripts

| Comando | Descripción |
| --- | --- |
| `npm start` | Servidor de desarrollo |
| `npm run build` | Build de producción |
| `npm run build:ghpages` | Build con `base-href` para GitHub Pages |
| `npm run deploy` | Publica `dist/.../browser` con `angular-cli-ghpages` |
| `npm test` | Pruebas unitarias con Vitest |

## Despliegue en GitHub Pages

El workflow [`.github/workflows/deploy-github-pages.yml`](.github/workflows/deploy-github-pages.yml) construye y publica el sitio en cada push a `main` o `master`.

1. Crea el repositorio remoto con el nombre `algoritmos_ordenamiento_arboles` (o actualiza el `base-href` si usas otro nombre).
2. Sube el código:
   ```bash
   git remote add origin https://github.com/<usuario>/algoritmos_ordenamiento_arboles.git
   git add .
   git commit -m "Sitio de algoritmos de ordenamiento de árboles"
   git push -u origin main
   ```
3. En el repositorio: **Settings → Pages → Source → GitHub Actions**.
4. El sitio quedará en `https://<usuario>.github.io/algoritmos_ordenamiento_arboles/`.

Si el repositorio se llama distinto, cambia `/algoritmos_ordenamiento_arboles/` en:

- `angular.json` (`projects...architect.build.configurations.production.baseHref`)
- el script `build:ghpages` de `package.json`
- `pathSegmentsToKeep` en `public/404.html` (déjalo en `1` para un project site)

También puedes publicar a mano:

```bash
npm run deploy
```

## Algoritmos incluidos

Tree Sort, Heap Sort, Tournament Sort, Smoothsort, Cartesian Tree Sort, AVL Tree Sort, Red-Black Tree Sort, B-Tree Sort y Splay Tree Sort.
