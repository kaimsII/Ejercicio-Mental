# Foco — Entrenamiento cognitivo

Aplicación personal, en español, para practicar memoria y cálculo mental a lo largo de un programa de 90 días. Está hecha con HTML, CSS y JavaScript vanilla: no necesita compilación, servidor propio, cuenta ni dependencias de terceros.

## Ejecutar

1. Descarga o clona el repositorio.
2. Abre `index.html` directamente en un navegador moderno. También funciona al publicar la carpeta raíz en GitHub Pages.
3. Los datos se guardan automáticamente en LocalStorage del navegador.

El programa empieza el día en que se utiliza por primera vez. El contador diario es informativo: no se pierde el progreso si se deja pasar una fecha y se pueden recuperar días anteriores desde **Calendario**. Una sesión se asigna al día del programa seleccionado y cada intento se guarda como un registro independiente.

## Qué incluye

- Entrenamientos independientes de memoria y cálculo con temporizadores de 10 minutos, pausa, reanudación, recuperación tras recargar y abandono. El bloque abandonado conserva los ejercicios terminados, pero no cuenta como sesión completada. El entrenamiento completo ejecuta memoria y luego cálculo, con 10 minutos por bloque (20 minutos en total).
- Cuatro ejercicios de memoria: secuencias numéricas directas/inversas, palabras, recuerdo tras interferencia y manipulación de memoria de trabajo. Los estímulos se ocultan automáticamente y las métricas incluyen aciertos, omisiones, errores, precisión y tiempo de recuperación.
- Práctica aritmética guiada con descomposición distributiva, compensación, multiplicación por 11 estilo Trachtenberg, duplicación y división entre dos, descomposición del dividendo, factorización del divisor, división por 5 y múltiplos conocidos. También se puede elegir práctica mezclada.
- Cada método tiene una pantalla previa con explicación paso a paso y ejemplo resuelto. El botón para iniciar la prueba se habilita tras confirmar que se leyó y entendió la explicación.
- Desafío de 20 operaciones (disponible desde el nivel 3): se responden sin mostrar la solución; después de una distracción se recuperan operación y resultado en orden. El informe separa cálculo correcto, operaciones recordadas, resultados recordados, asociaciones correctas y asociaciones recuperadas en su posición.
- Cinco niveles, selección manual y sugerencias de progresión basadas en resultados. La aplicación no cambia el nivel sin intervención del usuario.
- Tiempo de exposición de memoria configurable (más tiempo, estándar o menos tiempo).
- Calendario de 90 días, historial, racha, estadísticas, gráficos SVG, preferencias, exportación e importación JSON y reinicio confirmado.
- El calendario permite eliminar, previa confirmación, todo el historial y progreso guardado de un día.
- Tema oscuro predeterminado y diseño adaptable a pantallas pequeñas.

## Datos y privacidad

LocalStorage conserva los datos únicamente en el navegador y dispositivo donde se utiliza la aplicación. Limpiar los datos del sitio o cambiar de navegador/dispositivo puede eliminarlos o hacerlos inaccesibles. Usa **Ajustes → Exportar JSON** para guardar una copia y **Importar JSON** para restaurarla en otro entorno. La importación reemplaza los datos actuales después de pedir confirmación. No se envían datos a ningún servidor.

## Publicar en GitHub Pages

1. Crea un repositorio nuevo en GitHub y agrega `index.html`, `README.md`, `.nojekyll` y la carpeta `assets/`.
2. En el repositorio, abre **Settings → Pages**.
3. En **Build and deployment**, elige **Deploy from a branch**, selecciona `main` y la carpeta raíz (`/`), y guarda.
4. Espera a que termine el despliegue y abre la URL que muestra GitHub Pages.

Todos los recursos se referencian con rutas relativas, por lo que la aplicación sirve tanto desde la raíz como desde un repositorio de proyecto.

## Actualizar posteriormente

Edita los archivos de `assets/css/` o `assets/js/` y `index.html`, prueba abriendo `index.html` localmente y sube los cambios al branch configurado en Pages. GitHub Pages publicará la actualización automáticamente. Antes de modificar el formato de datos, conserva compatibilidad con `schemaVersion` o implementa una migración.

## Estructura

```text
.
├── index.html
├── README.md
├── .nojekyll
└── assets/
    ├── css/
    │   └── styles.css
    └── js/
        ├── app.js
        ├── arithmetic.js
        ├── memory.js
        ├── progression.js
        ├── statistics.js
        └── storage.js
```
