# IceCare Dashboard · Match Agency

Dashboard en tiempo real conectado a ClickUp. Se auto-actualiza cada 2 minutos.

---

## Deploy en Vercel — 5 pasos

### 1. Descarga y descomprime este ZIP

### 2. Sube a GitHub
```bash
cd icecare-dashboard
git init
git add .
git commit -m "feat: icecare dashboard v1"
```
Crea un repositorio en [github.com](https://github.com/new) (puede ser privado), luego:
```bash
git remote add origin https://github.com/TU_USUARIO/icecare-dashboard.git
git push -u origin main
```

### 3. Importa en Vercel
1. Ve a [vercel.com](https://vercel.com) → **Add New Project**
2. Conecta tu cuenta de GitHub si no lo has hecho
3. Selecciona el repo `icecare-dashboard`
4. Deja todo por defecto → clic en **Deploy**

### 4. Agrega las variables de entorno
Una vez deployado, ve a **Settings → Environment Variables**:

| Variable | Valor |
|---|---|
| `CLICKUP_TOKEN` | `pk_120259034_FFJJVFBBGBHKCSODBL8RVQB6F75CV8VC` |
| `FOLDER_ID` | `901317832639` |

Luego ve a **Deployments** → selecciona el último → **Redeploy**

### 5. ¡Listo!
Tu dashboard estará disponible en la URL que Vercel asigne (ej: `https://icecare-dashboard.vercel.app`)

---

## Cómo funciona

```
Browser → /api/clickup (Vercel Serverless) → api.clickup.com
```

El proxy serverless (`api/clickup.js`) resuelve el problema de CORS: el browser no puede llamar directamente a la API de ClickUp desde una página web, pero el servidor sí puede. El frontend llama a `/api/clickup`, que a su vez consulta ClickUp con el token seguro desde el servidor.

- **Auto-refresh**: cada 2 minutos en background, sin recargar la página
- **Token seguro**: nunca se expone en el frontend, solo en variables de entorno de Vercel
- **Cache**: Vercel cachea la respuesta 60 segundos para no agotar el rate limit de ClickUp

## Actualizar para otro cliente o carpeta

En Vercel → Settings → Environment Variables → cambia `FOLDER_ID` → Redeploy.

## Regenerar el token de ClickUp

Si necesitas rotar el token:
1. Ve a ClickUp → Settings → Apps → API Token → Regenerate
2. Actualiza `CLICKUP_TOKEN` en Vercel → Redeploy

