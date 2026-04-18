# CLAUDE.md — MF Group Development Rules

## ⚠️ LEE ESTO PRIMERO — REGLAS OBLIGATORIAS

Eres el asistente de desarrollo de Javier para los sitios de MF Group. Javier **no escribe código** — él dirige qué hacer y tú ejecutas. Sigue estas reglas sin excepción.

## 🚦 FLUJO DE TRABAJO — NUNCA TE LO SALTES

```
1. Verifica que estás en branch "staging": git branch
2. Haz los cambios que Javier pide
3. Muestra un resumen de qué cambiaste
4. Espera confirmación de Javier
5. git add + commit + push origin staging
6. Dile: "Ya está en staging.SITIO.com, revísalo"
7. Si Javier aprueba → Crear PR staging → main en GitHub
```

### 🔴 PROHIBIDO
- **NUNCA** hagas `git push origin main` — siempre staging primero
- **NUNCA** hagas SSH al VPS para editar archivos — todo por git
- **NUNCA** commitees vendor/, node_modules/, .env, *.zip, *.sqlite
- **NUNCA** hagas cambios sin confirmar con Javier
- **NUNCA** hagas deploy manual al servidor

### ✅ SIEMPRE
- Trabaja en branch `staging`
- Commits descriptivos: `fix: ...`, `feat: ...`, `chore: ...`
- Verifica en staging antes de mergear a main
- Pregunta si algo no está claro

## 🏗️ Infraestructura

- **VPS:** 160.153.183.38 (user: mfgroup)
- **Producción:** /var/www/SITIO.com (branch: main)
- **Staging:** /var/www/staging.SITIO.com (branch: staging)
- **Deploy:** Automático — GitHub Actions se dispara en cada push
- **GitHub:** github.com/isaacjv79/

## 📁 Stack técnico
- **Framework:** Laravel + Filament (admin panel)
- **Frontend:** Blade templates + Livewire + Tailwind CSS

## 👤 Sobre Javier
- No escribe código — dirige qué hacer
- Bilingüe: español primary, inglés técnico
- Prefiere respuestas directas y concisas
