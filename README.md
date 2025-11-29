# 🏛️ Gestor de Licitaciones AI

Una aplicación inteligente diseñada para **automatizar, gestionar y analizar licitaciones públicas** utilizando Inteligencia Artificial (Google Gemini).

![Dashboard Preview](https://via.placeholder.com/800x400?text=Preview+de+la+Aplicacion)

## ✨ Características Principales

*   **Ingesta Inteligente:** Arrastra y suelta (Drag & Drop) tus pliegos (PDFs).
*   **Auto-Descarga:** Detecta enlaces a PCAP y PPT dentro de los documentos y los descarga automáticamente.
*   **Análisis AI:** Extrae presupuesto, criterios de puntuación, solvencia y detecta riesgos usando Gemini Flash 2.5.
*   **Persistencia:** Todos los datos se guardan en tu navegador (IndexedDB), nada se pierde al cerrar la pestaña.
*   **Kanban de Gestión:** Organiza expedientes en Pendientes, En Trámite, En Duda y Descartados.
*   **Sistema de Puntuación:** Visualización gráfica del peso del precio vs. juicio de valor.

## 🚀 Instalación y Uso

Este proyecto utiliza **React + Vite**.

1.  **Clonar el repositorio:**
    ```bash
    git clone https://github.com/tu-usuario/gestor-licitaciones-ai.git
    cd gestor-licitaciones-ai
    ```

2.  **Instalar dependencias:**
    ```bash
    npm install
    ```

3.  **Configurar la API Key (Gratuita):**
    *   Ve a [Google AI Studio](https://aistudio.google.com/) y genera una API Key gratuita.
    *   Crea un archivo llamado `.env` en la raíz del proyecto.
    *   Pega tu clave así:
        ```env
        VITE_API_KEY=tu_clave_de_gemini_aqui
        ```

4.  **Arrancar la aplicación:**
    ```bash
    npm run dev
    ```

## 🛠️ Tecnologías

*   [React](https://react.dev/) - Librería UI
*   [Tailwind CSS](https://tailwindcss.com/) - Estilos
*   [Google GenAI SDK](https://www.npmjs.com/package/@google/genai) - Inteligencia Artificial
*   [PDF.js](https://mozilla.github.io/pdf.js/) - Análisis profundo de PDFs
*   [IDB-Keyval](https://github.com/jakearchibald/idb-keyval) - Base de datos local
*   [Lucide React](https://lucide.dev/) - Iconos

## ⚠️ Nota sobre Privacidad

Esta aplicación funciona principalmente del lado del cliente (Client-Side). Los documentos PDF se envían a la API de Google Gemini para su análisis, pero no se almacenan en ningún servidor intermedio propio. Los datos persisten únicamente en tu navegador.

## 📄 Licencia

MIT
