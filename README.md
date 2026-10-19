# 🏡 Home Dashboard · Segundo Cerebro Familiar

Dashboard doméstico y segundo cerebro local-first para la gestión integral del hogar y la familia (Kike, Lara, Fabio y Bruno) en Salamanca.

Diseñado con una estética moderna, ligera y responsiva para funcionar como Progressive Web App (PWA) en pantallas de cocina, tablets, móviles y PC, respaldado por un servidor doméstico seguro y privado.

---

## ✨ Características Principales

### 1. ☀️ Briefings Diarios Inteligentes
* **Matinal (07:00 h)** y **Nocturno (21:30 h)** automáticos vía Web y Telegram.
* **Previsión meteorológica en Salamanca**: temperaturas mínimas/máximas, probabilidad de lluvia y recomendación automática de ropa y capas para Fabio y Bruno (ej. abrigo, gorro o ropa transpirable).
* Resumen de citas médicas, tareas del día y turno escolar.

### 2. 🍽️ Comedor Escolar Montessori & Recomendación de Cenas `(*)`
* **Sincronización mensual automática**: Descarga y analiza el PDF del Menú Basal de `montessorisalamanca.es` cada **primer lunes de mes a las 13:00 h**.
* **Detección del asterisco `(*)`**: Extrae la recomendación oficial del colegio para la cena complementaria de los niños (ej. *Verdura + Pescado*) y la muestra destacada.
* **Cenas bajas en carbohidratos simples**: Planificación nutricional estricta sin pasta blanca, arroz blanco ni harinas refinadas por la noche. Prioriza proteínas de calidad, verduras y únicamente hidratos complejos (boniato, calabaza, legumbres suaves, quinoa).
* **Doble propuesta diaria**:
  * 🤖 **Cecotec Mambo**: Pasos con tiempo, temperatura, velocidad y giro inverso.
  * 🍳 **Estándar**: Preparación rápida en sartén o plancha (< 30 min).

### 3. 🎙️ Agente Interactivo de Acción (Voz + Texto)
* Integrado en la cabecera mediante el botón **"Segundo Cerebro"**.
* **Reconocimiento de voz directo (Web Speech API)** con micrófono 🎤 y lectura en voz alta (🔊).
* **Mutaciones en vivo del dashboard**:
  * *«Añade pañales de Bruno y leche a Mercadona»* → Los agrega a la lista de compra en su supermercado.
  * *«Se ha terminado el aceite de oliva»* → Marca el producto como *Agotado* en la despensa y lo añade a la reposición del sábado.
  * *«Mañana Kike lleva a Fabio al cole y Lara lo recoge»* → Actualiza el turno escolar.
  * *«Añade tarea para Kike: Pedir cita pediatra para Bruno»* → Crea la tarea asignada.
  * *«Cenamos la opción Cecotec Mambo»* → Registra la cena elegida para hoy.

### 4. 🧾 Tickets, Gastos, Comparador y Semáforo de Perecederos
* **Escanear Ticket de Compra**: Foto con cámara móvil, subida de PDF o texto OCR de tickets de **Mercadona, Carrefour o Lidl**.
* **Inventario automático**: Añade los productos directamente a la **Despensa & Stock** y tacha los artículos que estuvieran en la lista de la compra.
* **⏰ Semáforo de Caducidad de Perecederos**: Cuenta atrás de días restantes para productos frescos (pescado fresco, carne, lácteos, fruta) con botón `✓ Marcar como consumido` para evitar desperdicio.
* **📊 Control de Gastos Mensuales**: Gasto total mensual, comparativa con el mes anterior y desgloses por supermercado y categoría.
* **⚖️ Comparador de Precios (Mercadona vs Carrefour vs Lidl)**: Comparativa real entre supermercados y cálculo de porcentaje de ahorro en básicos.
* **🧠 Aprendizaje de Hábitos de Compra**: Estimación de cadencia de consumo y predicción de reposición antes de que se agoten los básicos.

### 5. 🛒 Compra del Sábado & Batch Cooking
* Generador de compra semanal que agrupa:
  1. Ingredientes para las cenas de la semana siguiente.
  2. Reposición de todo lo agotado o bajo en la despensa.
  3. Básicos recurrentes de los niños (pañales, toallitas, leche, fruta).
* Filtrado por supermercado: **Mercadona**, **Carrefour**, **Lidl** y **Farmacia**.

### 6. 📅 Agenda & Cartilla de Salud
* Sincronización bidireccional con Google Calendar de Kike y Lara vía iCal.
* Cartilla pediátrica de vacunas, revisiones y medicación con alertas tempranas.

---

## 🛠️ Arquitectura Técnica

* **Frontend & Backend**: [Next.js 16.4.2](https://nextjs.org/) (App Router, Turbopack, React 19, TypeScript).
* **Estilos**: Vanilla CSS con variables de diseño, glassmorphism y microanimaciones suaves.
* **Base de Datos**:
  * *Desarrollo local*: [PGlite](https://github.com/electric-sql/pglite) (PostgreSQL embebido en WebAssembly / `.data/pglite`).
  * *Servidor doméstico (Producción)*: PostgreSQL 16 con extensión `pgvector` para búsqueda semántica.
* **Procesos en segundo plano**: `worker.ts` con cron jobs para briefings, Telegram Bot y sincronización Montessori.
* **Infraestructura**: Docker Compose listo para desplegar en Hyper-V / WSL2 en Windows 11 Pro.

---

## 🚀 Puesta en Marcha

### Requisitos
* Node.js >= 20.x
* npm >= 10.x

### Instalación local
```bash
# 1. Clonar el repositorio
git clone https://github.com/kigaldev/HomeDashboard.git
cd HomeDashboard

# 2. Configurar variables de entorno
cp .env.example .env

# 3. Instalar dependencias
cd web
npm install

# 4. Iniciar en modo desarrollo
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en el navegador.

---

## 📦 Despliegue con Docker Compose en el Servidor Doméstico

```bash
cd infra
docker compose up -d
```

Servicios incluidos:
* `web`: Servidor Next.js (puerto 3000)
* `worker`: Servicio cron de briefings, Telegram bot y sincronizaciones
* `db`: PostgreSQL 16 + pgvector (puerto 5432)
* `n8n`: Automatizaciones domésticas opcionales (puerto 5678)

---

## 👨‍👩‍👦‍👦 Configuración Familiar
* **Familia**: Kike, Lara, Fabio y Bruno.
* **Ubicación**: Salamanca, Castilla y León.
* **Colegio**: Colegio Montessori Salamanca (`https://montessorisalamanca.es/comedor-2/`).
