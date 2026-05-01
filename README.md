# ⚖️ Balanceador 90/5/5 (PWA)

Dashboard profesional para el seguimiento y rebalanceo de una cartera de inversión basada en la estrategia 90/5/5.

## 🚀 Características
- **Seguimiento en Tiempo Real**: Precios actualizados vía Yahoo Finance.
- **Estrategia 90/5/5**: Optimizado para MSCI World (90%), Emergentes (5%) y Bitcoin ETP (5%).
- **Sincronización en la Nube**: Login con Google y persistencia en Firebase Firestore.
- **Privacidad Total**: Modo "Blur" para ocultar valores sensibles y bloqueo por lista blanca de email.
- **PWA**: Instalable en dispositivos móviles con soporte offline.
- **Diseño Premium**: Interfaz moderna con gráficos interactivos (Chart.js).

## 🛠️ Tecnologías
- [SvelteKit 5](https://svelte.dev/) (Runes)
- [Firebase](https://firebase.google.com/) (Auth & Firestore)
- [Vite](https://vitejs.dev/)
- [Chart.js](https://www.chartjs.org/)

## 📦 Configuración

1. **Clonar el repositorio**
2. **Instalar dependencias**:
   ```bash
   npm install
   ```
3. **Variables de Entorno**:
   Crea un archivo `.env` basado en `.env.example` con tus claves de Firebase y tu email autorizado.

4. **Desarrollo**:
   ```bash
   npm run dev
   ```

5. **Producción (Vercel)**:
   Simplemente conecta tu repositorio a Vercel. Asegúrate de configurar las mismas variables de entorno en el panel de Vercel.

## 🛡️ Seguridad
El acceso está restringido por email en el frontend y mediante reglas de seguridad en Firestore. Solo el usuario configurado en `VITE_AUTHORIZED_EMAIL` puede acceder a los datos.

---
*Desarrollado para uso personal. No es asesoramiento financiero.*
