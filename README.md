# Immersive Scroll Experience — Elastic Design

Este proyecto es una **experiencia web inmersiva basada en scroll**, diseñada para comunicar un mensaje de forma pausada, cuidada y emocional, alejándose de los patrones tradicionales de landing pages comerciales.

Aunque su primera iteración se ha utilizado como una carta de año nuevo, la estructura y el enfoque están pensados como **base reutilizable** para otros contextos: manifiestos, presentaciones editoriales, narrativas de marca, lanzamientos conceptuales o experiencias de storytelling digital.

---

## Concepto UX

La experiencia se construye sobre tres ideas clave:

### 1. Ritmo y atención
El contenido se presenta en **slides verticales**, uno por uno, favoreciendo la lectura consciente y evitando la sobrecarga de información.  
El scroll no es libre: existe una **asistencia suave (snap)** que ayuda a centrar cada bloque de contenido en el viewport.

### 2. Navegación implícita
La navegación no depende de botones tradicionales:

- Scroll natural
- Teclado (flechas)
- Indicador de progreso (stepper)
- Cursor contextual (flechas arriba / abajo)

El usuario **intuye cómo avanzar**, sin necesidad de instrucciones explícitas.

### 3. Separación entre gesto y acción
Los gestos globales (scroll, cursor-nav) **no interfieren con elementos interactivos explícitos** (links, stepper, logo).  
Cuando existe conflicto, siempre tiene prioridad la acción directa del usuario.

---

## Estructura general
public/

├─ index.html          # Estructura semántica y contenido

├─ styles.css          # Tipografía, layout, responsive y animaciones

├─ main.js             # Lógica de UX (scroll, cursor, teclado, stepper)

├─ webgl-bg.js         # Fondo visual WebGL independiente

├─ data/
│  └─ recipients.json  # Contenido dinámico / personalizable

└─ assets/

├─ logo.svg

├─ favicon.svg

├─ up.svg

├─ down.svg

└─ og-image.jpg

---

## Slides como unidades de contenido

Cada sección ocupa visualmente el centro del viewport y actúa como una **unidad narrativa independiente**.

Características:
- Un mensaje principal por slide
- Jerarquía tipográfica clara
- Animaciones de entrada discretas y progresivas
- Compatible con contenido dinámico

Esto permite reutilizar la estructura para:
- Manifiestos
- Presentaciones de producto
- Storytelling de marca
- Cartas editoriales
- Casos de estudio narrativos

---

## Cursor como instrumento de navegación

En desktop, el cursor se convierte en una **herramienta contextual**:

- Flecha hacia abajo en la parte inferior del viewport
- Flecha hacia arriba en la parte superior
- Limitado por el estado de la navegación (primer / último slide)
- Desactivado automáticamente sobre elementos interactivos

El cursor no sustituye al scroll, lo **acompaña**.

---

## Fondo visual (WebGL)

El fondo es una capa **completamente desacoplada** del contenido:

- Renderizado con WebGL
- Animación sutil en loop
- Interacción independiente (no ligada al scroll)
- Pensado como atmósfera, no como protagonista

Esto permite:
- Cambiar el fondo sin tocar la UX
- Reutilizar la experiencia con otros lenguajes visuales
- Ajustar performance según contexto

---

## Personalización y contenido dinámico

La experiencia admite contenido personalizado vía parámetros de URL:
/?id=XXXX

Los datos se cargan desde un JSON local, permitiendo:
- Mensajes individualizados
- Variantes de contenido
- Reutilización de la misma experiencia para múltiples destinatarios

El sistema está diseñado para **fallar de forma elegante** si no existe personalización.

---

## Accesibilidad y buenas prácticas

- Navegación por teclado
- Respeto a `prefers-reduced-motion`
- Semántica HTML clara
- Sin dependencias externas pesadas
- Compatible con renderizado estático (Firebase Hosting)

---

## Despliegue

Proyecto pensado para **hosting estático**.

- Firebase Hosting
- Sin backend
- Sin build step obligatorio
- Fácil de clonar y adaptar

---

## Posibles evoluciones

- Sustituir slides verticales por navegación horizontal
- Integrar audio o narración
- Añadir modos de lectura (rápido / pausado)
- Reutilizar como framework editorial interno
- Convertirlo en plantilla base para experiencias narrativas

---

## Autoría

Diseño, concepto y desarrollo  
**Elastic Design**  
https://3lastic.com
