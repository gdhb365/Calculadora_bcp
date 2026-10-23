# Calculadora de fecha de pago · BCP Visa

Herramienta web independiente para consultar la fecha límite de pago de una compra y organizar compras según el cronograma cargado de 2026.

## Pruébala en línea

[**Abrir la calculadora BCP Visa**](https://gdhb365.github.io/Calculadora_bcp/)

No necesitas descargar ni instalar nada para probarla.

## Funciones

- Consulta de fecha de pago a partir de la fecha de compra.
- Visualización del ciclo de facturación, su cierre y los días hasta el pago.
- Registro de compras con montos en soles.
- Agrupación de compras por fecha de vencimiento y cálculo de totales.
- Eliminación de compras con opción de deshacer.
- Botón para alternar entre los temas claro y oscuro, con preferencia guardada e inicio según el tema del sistema.
- Diseño adaptable a celulares y computadoras.

## Cómo usarla

1. Abre el enlace de la calculadora o descarga el proyecto completo y abre `index.html` en un navegador actualizado.
2. Selecciona la fecha de compra para consultar su fecha de pago.
3. Si deseas registrar la compra, ingresa un monto y pulsa **Guardar esta compra**.
4. Revisa las compras agrupadas en **Tus pagos**.

No requiere instalar dependencias ni configurar un servidor.

## Cronograma disponible

El cronograma incluye compras realizadas **del 25 de diciembre de 2025 al 24 de diciembre de 2026**. El último vencimiento registrado es el **20 de enero de 2027**.

Las fechas están definidas en `js/calculator.js`, en la constante `schedule`. El cronograma no se actualiza automáticamente.

## Almacenamiento de datos

Las compras y la preferencia de tema se guardan en el navegador mediante `localStorage`.

Los registros no se sincronizan entre dispositivos o navegadores. Al borrar los datos del sitio, pueden perderse las compras guardadas.

## Tecnologías

HTML, CSS y JavaScript, sin frameworks ni dependencias externas.

## Alcance

Esta herramienta es independiente y no está afiliada al BCP. El cronograma cargado puede no corresponder a todas las tarjetas o ciclos de facturación.

Los totales incluyen únicamente las compras registradas: no calculan cuotas, intereses, comisiones ni otros cargos.

Confirma siempre la fecha de vencimiento en tu estado de cuenta o en los canales oficiales del banco.

## Organización del proyecto

- `index.html`: estructura y contenido de la página.
- `css/styles.css`: estilos y diseño adaptable.
- `js/theme.js`: preferencia de tema, aplicada antes de mostrar la página.
- `js/calculator.js`: cronograma, cálculos, validaciones y operaciones de compras.
- `js/app.js`: interacción con los formularios y actualización de la pantalla.
- `tests/`: pruebas de cálculos, almacenamiento e interacción en navegador.

Las claves de almacenamiento se conservan para mantener compatibles las compras guardadas de la versión anterior.

## Desarrollo y verificación

La web funciona sin dependencias externas en ejecución. Para las herramientas de desarrollo necesitas Node.js 20 o posterior:

```sh
npm ci
npm test
npx playwright install chromium
npm run test:browser
npm run format:check
```

Para aplicar el formato al código:

```sh
npm run format
```

Las pruebas cubren todos los días del cronograma, límites de cada ciclo, fechas imposibles, importes y totales seguros, almacenamiento inválido o bloqueado, guardar/eliminar/deshacer, persistencia del tema y diseño móvil.
