# CLAUDE.md — HC Venta

## 0. Propósito de este archivo

Este archivo contiene las instrucciones maestras para desarrollar **HC Venta**, un sistema de Punto de Venta (POS) personalizado para el negocio **Sandalias HC**.

Claude debe tratar este documento como la fuente principal de verdad del proyecto.

### Regla fundamental

Antes de implementar, modificar o eliminar una funcionalidad:

1. Revisar este archivo.
2. Revisar la arquitectura y el modelo de datos existentes.
3. Verificar que el cambio no contradiga las reglas de negocio.
4. Evitar implementar funcionalidades que el propietario del negocio no solicitó.
5. No reemplazar decisiones existentes por preferencias personales del agente.
6. Si una decisión importante no está definida en este documento y afecta arquitectura, base de datos, seguridad, dinero, inventario o reportes, **detenerse y pedir confirmación antes de tomarla**.
7. No romper funcionalidades existentes para implementar una nueva.
8. Preferir cambios pequeños, verificables y reversibles.

---

# 1. Identidad del proyecto

## Nombre del sistema

**Sandalias y Pantuflas HC - Punto de Venta**

## Nombre de la aplicación

**HC Venta**

## Negocio

**Sandalias HC**

## Giro

El negocio se especializa principalmente en:

- Sandalias
- Pantuflas

También comercializa:

- Ropa deportiva para dama
- Balones
- Gorras
- Ropa interior
- Calcetas
- Impermeables
- Termos
- Otros productos

El catálogo debe ser flexible y permitir agregar nuevas categorías sin modificar código.

---

# 2. Objetivo del sistema

Construir un POS personalizado, sencillo y rápido de utilizar para una sola persona/cuenta administrativa, que permita:

- Registrar y realizar ventas.
- Controlar inventario.
- Registrar entradas de mercancía.
- Mantener historial de costos de adquisición.
- Controlar caja.
- Registrar retiros.
- Registrar gastos del negocio.
- Generar reportes de ventas, costos, ganancias, pérdidas y flujo de dinero.
- Administrar productos y categorías.
- Mostrar alertas de bajo stock.
- Mostrar notificaciones del sistema.
- Consultar historial de ventas.
- Funcionar correctamente en PC y dispositivos móviles.
- Mantener una interfaz sencilla y rápida para operar durante una venta.

El sistema debe priorizar **claridad, velocidad, confiabilidad y facilidad de uso** sobre una cantidad excesiva de funcionalidades.

---

# 3. Stack tecnológico obligatorio

El proyecto utilizará:

- Next.js
- React
- TypeScript
- Neon PostgreSQL
- Prisma ORM
- Vercel
- Vitest
- bcrypt para hash de contraseñas

## Recomendaciones de soporte

Se puede utilizar:

- Tailwind CSS para estilos.
- shadcn/ui y/o Radix UI para componentes accesibles.
- Zod para validación de datos.
- Recharts u otra librería adecuada para gráficas.

No agregar dependencias innecesarias.

Antes de instalar una nueva dependencia, comprobar si realmente es necesaria.

---

# 4. Arquitectura general

La aplicación debe mantener separación clara entre:

- UI / componentes React
- lógica de negocio
- acceso a datos
- validación
- autenticación/autorización
- servicios
- reportes
- notificaciones

No colocar lógica compleja de negocio directamente dentro de componentes visuales.

La lógica relacionada con:

- ventas,
- inventario,
- pagos,
- caja,
- gastos,
- reportes,

debe estar centralizada en servicios o funciones de dominio reutilizables.

---

# 5. Alcance actual

## Incluido

### Ventas
- Carrito.
- Búsqueda de productos.
- Filtrado en tiempo real.
- Agregar producto mediante Enter.
- Cantidades.
- Descuentos.
- Precio personalizado por producto durante la venta.
- Cobro.
- Efectivo.
- Tarjeta.
- Transferencia.
- Pago combinado.
- Historial de ventas.

### Caja
- Fondo inicial.
- Apertura de caja.
- Movimientos.
- Retiros.
- Corte diario.
- Historial de cortes.

### Inventario
- Productos.
- Categorías.
- Colores de categorías.
- Stock.
- Stock mínimo.
- Entradas de mercancía.
- Ajustes.
- Historial de movimientos.
- Historial de costos.

### Reportes
- Diario.
- Semanal.
- Mensual.
- Rango personalizado.
- Ventas.
- Costos.
- Ganancia bruta.
- Gastos.
- Ganancia neta.
- Pérdidas.
- Retiros.
- Métodos de pago.

### Gastos
- Renta.
- Luz.
- Agua.
- Sueldos.
- Compras a proveedores.
- Otros gastos relacionados con el negocio.

### Notificaciones
- Bajo stock.
- Actualizaciones.
- Reporte semanal disponible.
- Reporte mensual disponible.
- Notificaciones dentro del sistema.
- Push cuando sea técnicamente viable.

### Configuración
- Contraseña.
- Tema.
- Notificaciones.
- Configuración general.

---

# 6. Funcionalidades deliberadamente NO incluidas

No implementar por defecto:

- Registro de clientes.
- CRM.
- Fidelización.
- Sistema de puntos.
- Fiado/crédito a clientes.
- Apartados.
- Pedidos de clientes.
- Devoluciones.
- Cambios de productos.
- Cancelación de ventas.
- Códigos de barras.
- Impresoras de tickets.
- Múltiples usuarios.
- Roles.
- Permisos por empleado.
- OAuth.
- Facturación electrónica.

Estas funcionalidades pueden agregarse posteriormente únicamente si el propietario las solicita.

No implementar una funcionalidad simplemente porque sea habitual en otros POS.

---

# 7. Cuenta y autenticación

El sistema tendrá una sola cuenta.

No existe un sistema de roles en la versión actual.

## Registro inicial

La cuenta será creada por el administrador/desarrollador una vez preparada la base de datos.

Debe contener:

- Nombre de usuario.
- Contraseña con hash seguro.

La contraseña inicial podrá ser modificada posteriormente desde Configuración.

## Login

Debe solicitar:

- Nombre de usuario.
- Contraseña.

El usuario debe iniciar sesión cada vez que abra el sistema.

No implementar inicio de sesión automático permanente.

## Contraseñas

Nunca almacenar contraseñas en texto plano.

Usar bcrypt para el hash.

Nunca mostrar ni registrar contraseñas en logs.

---

# 8. Navegación

Al iniciar sesión, mostrar una pantalla de bienvenida con el nombre de la cuenta.

El sistema debe dirigir posteriormente al usuario al módulo de **Ventas**.

## Módulos principales

- Ventas
- Consultas
- Inventario
- Configuración

Las notificaciones deben estar disponibles mediante el icono correspondiente del header.

---

# 9. Header

Color principal:

`#cfd500`

Debe contener:

### Izquierda
Menú hamburguesa.

Opciones:

- Ventas
- Consultas
- Inventario
- Configuración

En la parte inferior del menú:

- Tema de la aplicación.
  - Claro
  - Oscuro
  - Sistema
- Cerrar sesión

### Centro

Logo.

### Derecha

Icono de notificaciones.

El header debe funcionar correctamente en escritorio y móvil.

---

# 10. Diseño visual

Fondo predeterminado:

**Blanco**

El diseño debe ser:

- limpio,
- moderno,
- sencillo,
- rápido,
- legible,
- responsive.

La interfaz debe adaptarse a:

- PC,
- laptop,
- tablet,
- celular.

No sobrecargar la interfaz con animaciones.

Las animaciones deben utilizarse únicamente cuando aporten claridad.

---

# 11. Inventario

## Producto

Cada producto debe poder contener como mínimo:

- ID
- Nombre
- Categoría
- Precio de venta
- Costo de adquisición actual
- Stock
- Stock mínimo
- Foto opcional
- Fecha de creación
- Fecha de actualización
- Estado activo/inactivo

Opcionalmente:

- Descripción.

## Precio y costo

El precio de venta y el costo son independientes.

Ejemplo:

Producto:

`Sandalia X`

Costo:

`$180`

Precio:

`$300`

Ganancia bruta por unidad:

`$120`

---

# 12. Historial de costos

Esta regla es CRÍTICA.

El sistema debe conservar el historial de costos de adquisición.

Ejemplo:

Compra 1:

10 unidades × $150

Después:

Compra 2:

10 unidades × $170

El historial debe conservar ambos costos.

Los nuevos reportes deben utilizar el costo correspondiente a las unidades/ventas según la estrategia de costeo definida por el sistema.

No borrar el historial de costos al modificar el costo actual del producto.

## Importante

No utilizar simplemente el `currentCost` para recalcular retroactivamente todas las ventas históricas.

Una venta ya realizada debe conservar la información necesaria para conocer el costo que tenía en el momento de la venta.

La información histórica debe ser inmutable.

---

# 13. Categorías

Categorías iniciales sugeridas:

- Ropa
- Sandalia
- Pantufla
- Termo
- Ropa interior
- Calceta
- Gorra
- Otros

El usuario puede crear nuevas categorías.

En el campo de categoría:

- Mostrar sugerencias mientras escribe.
- Si no existe la categoría, mostrar:
  - `+ Añadir categoría`

Cada categoría debe tener:

- Nombre
- Color
- Estado
- Fecha de creación
- Fecha de actualización

El color debe poder modificarse desde Inventario.

Los colores de categoría se utilizarán visualmente en Ventas para distinguir productos.

---

# 14. Stock

El stock debe actualizarse de forma consistente mediante transacciones de base de datos.

Nunca modificar stock solamente en frontend.

Operaciones que pueden modificar stock:

- Entrada de mercancía.
- Venta.
- Ajuste manual.

Las ventas disminuyen stock.

Las entradas aumentan stock.

Los ajustes deben requerir un motivo.

---

# 15. Stock mínimo

El valor predeterminado será:

`5`

Pero debe ser configurable por producto.

Ejemplo:

```text
Producto: Sandalia X
Stock: 4
Stock mínimo: 5
```

Debe generar alerta de bajo stock.

No alertar si:

```text
stock >= stockMinimo
```

La alerta debe aparecer cuando:

```text
stock < stockMinimo
```

El sistema debe evitar generar notificaciones duplicadas continuamente por el mismo producto.

---

# 16. Entradas de mercancía

El usuario confirmó que SÍ desea registrar compras/entradas de mercancía.

Debe existir una forma de registrar:

- Producto.
- Cantidad.
- Costo unitario.
- Fecha.
- Total.
- Proveedor, si posteriormente se habilita.
- Observaciones opcionales.

Al confirmar una entrada:

1. Aumentar stock.
2. Registrar movimiento.
3. Registrar costo de adquisición.
4. Actualizar costo actual del producto.
5. Mantener historial de costos.
6. No modificar ventas históricas.

Ejemplo:

```text
Producto: Sandalia X
Cantidad: 20
Costo unitario: $170
Total: $3,400
```

---

# 17. Ventas

La pantalla de Ventas es la pantalla principal del sistema.

Al entrar:

- Mostrar todos los productos por defecto.
- Mostrar categorías para filtrar.
- Mostrar barra de búsqueda.

## Búsqueda

Debe:

- Filtrar mientras el usuario escribe.
- Buscar por nombre.
- Mostrar resultados parciales.
- Permitir agregar mediante Enter cuando exista coincidencia adecuada.

Evitar agregar accidentalmente un producto incorrecto.

Si existen múltiples coincidencias exactas/parciales, mostrar una selección clara.

---

# 18. Carrito

Cada elemento del carrito debe almacenar como mínimo:

- Producto.
- Cantidad.
- Precio original.
- Precio aplicado.
- Descuento aplicado.
- Costo relevante para la venta.
- Subtotal.

Una venta confirmada debe conservar una fotografía histórica de los datos importantes del producto.

No depender del producto actual para reconstruir una venta antigua.

---

# 19. Cantidades

El usuario puede modificar la cantidad de cada producto.

No permitir cantidades:

- negativas,
- cero en una venta confirmada,
- mayores al stock disponible.

La validación debe existir tanto en frontend como en servidor.

No confiar únicamente en la interfaz.

---

# 20. Descuentos

Debe existir una opción:

`Descuento`

El descuento puede aplicarse al conjunto de productos seleccionados según el comportamiento definido en UI.

El sistema debe guardar:

- Precio original.
- Descuento.
- Precio final.

No sobrescribir permanentemente el precio del producto por aplicar un descuento durante una venta.

---

# 21. Precio personalizado durante la venta

El usuario puede seleccionar un producto vendido y cambiar su precio.

No se necesita confirmación.

Ejemplo:

```text
Precio original: $300
Precio aplicado: $250
```

Debe guardarse la diferencia.

No modificar el precio base del producto.

El cambio únicamente aplica a esa venta.

El sistema debe conservar:

- Precio original.
- Precio final.
- Usuario/cuenta.
- Fecha.
- Venta.

---

# 22. Ventas sin devolución, cambio ni cancelación

Por requerimiento del propietario:

- No existen devoluciones.
- No existen cambios.
- No existen cancelaciones.

Una venta confirmada debe considerarse definitiva.

No implementar botones de cancelar/devolver/cambiar en la interfaz.

Si en el futuro se requiere corregir una venta, debe definirse un proceso administrativo específico antes de implementarlo.

---

# 23. Métodos de pago

Métodos disponibles:

- Efectivo.
- Tarjeta.
- Transferencia.

Debe permitir pagos combinados.

Ejemplo:

```text
Total: $500

Efectivo: $200
Tarjeta: $300
```

La suma de pagos debe coincidir con el total de la venta, salvo que exista una regla específica de cambio por efectivo.

---

# 24. Pago en efectivo

El efectivo puede superar el total.

Ejemplo:

```text
Total: $300
Efectivo recibido: $500

Cambio: $200
```

Si el efectivo es menor:

```text
Total: $300
Efectivo: $250

Faltante: $50
```

Si es exacto:

```text
Pago exacto: $0
```

La interfaz debe mostrar claramente:

- Faltante.
- Pago exacto.
- Cambio.

No utilizar signos ambiguos que hagan difícil distinguir faltante de cambio.

---

# 25. Tarjeta y transferencia

La cantidad asignada a tarjeta o transferencia no puede superar el saldo pendiente.

Ejemplo:

```text
Total: $500
Efectivo: $200

Saldo pendiente: $300
```

Tarjeta puede recibir:

`$300`

pero no:

`$400`.

El sistema debe calcular automáticamente el saldo restante.

---

# 26. Confirmación de venta

Antes de registrar una venta definitivamente, validar:

- Existencia suficiente.
- Total válido.
- Métodos de pago completos.
- Cantidades válidas.
- Precios válidos.

La operación debe ser atómica.

Una venta no debe quedar registrada sin sus productos/pagos correspondientes.

Una venta tampoco debe disminuir stock si la transacción completa falla.

---

# 27. Caja

Al abrir el módulo de Ventas, si corresponde iniciar una nueva jornada/caja, mostrar un diálogo obligatorio solicitando:

**Fondo inicial de caja.**

El usuario no puede realizar ninguna venta u otra acción de operación de caja hasta ingresar y aceptar un monto válido.

Ejemplo:

```text
Fondo de caja

$1,000.00

[Cancelar] [Aceptar]
```

Una vez aceptado:

- Crear/aperturar caja.
- Registrar fondo inicial.
- Permitir operaciones.

---

# 28. Retiros de caja

Los retiros son independientes de los gastos.

Debe existir un movimiento:

`RETIRO`

Ejemplo:

```text
Retiro:
$1,000

Motivo:
Retiro personal
```

El retiro:

- Reduce el efectivo físico disponible.
- Debe aparecer en reportes de caja.
- No debe considerarse automáticamente como gasto del negocio.
- No debe disminuir automáticamente la ganancia del negocio.

Esto es una regla fundamental.

---

# 29. Gastos del negocio

Los gastos representan costos reales del negocio.

Ejemplos:

- Renta.
- Luz.
- Agua.
- Sueldos.
- Compras a proveedores.
- Transporte.
- Mantenimiento.
- Servicios.
- Otros gastos relacionados con el negocio.

Un gasto debe guardar:

- ID.
- Concepto.
- Categoría.
- Monto.
- Fecha.
- Método de pago.
- Descripción opcional.
- Fecha de creación.

---

# 30. Diferencia entre gasto y retiro

Nunca mezclar estos conceptos.

## Retiro

Dinero que sale de caja, pero no necesariamente representa un gasto operativo.

Ejemplo:

```text
Retiro personal:
$2,000
```

Afecta:

- Efectivo disponible.

No afecta automáticamente:

- Ganancia neta.

## Gasto

Dinero utilizado por el negocio.

Ejemplo:

```text
Renta:
$5,000
```

Afecta:

- Flujo de dinero.
- Gastos.
- Ganancia neta.

---

# 31. Compras a proveedores y gastos

Una compra de mercancía puede tener dos efectos diferentes:

1. Entrada de inventario.
2. Salida de dinero.

El sistema debe ser capaz de representar ambos correctamente.

No duplicar el gasto accidentalmente.

Ejemplo:

```text
Compra de mercancía:
$3,000

Inventario:
+20 unidades

Costo de mercancía:
registrado

Dinero:
-$3,000
```

La forma exacta de clasificación contable debe mantenerse consistente con el modelo de reportes.

---

# 32. Corte de caja

Debe existir un corte diario.

Mostrar como mínimo:

- Fondo inicial.
- Ventas en efectivo.
- Ventas con tarjeta.
- Ventas por transferencia.
- Retiros.
- Efectivo esperado.
- Efectivo contado.
- Diferencia.

Ejemplo:

```text
Fondo inicial       $1,000
Ventas efectivo     $5,300
Retiros               -$500
----------------------------
Efectivo esperado   $5,800

Efectivo contado    $5,750

Diferencia            -$50
```

Tarjeta y transferencia deben aparecer por separado porque no representan efectivo físico en caja.

---

# 33. Historial de ventas

Debe permitir consultar:

- Fecha.
- Hora.
- Folio.
- Cantidad de productos.
- Total.
- Métodos de pago.

No incluir clientes porque el sistema no tendrá módulo de clientes.

Al seleccionar una venta, mostrar:

- Productos.
- Cantidades.
- Precio original.
- Precio aplicado.
- Descuento.
- Subtotales.
- Total.
- Pagos.
- Fecha.
- Hora.

---

# 34. Reportes

## Principios

Los reportes deben diferenciar claramente:

- Ventas.
- Costos.
- Ganancia bruta.
- Gastos.
- Ganancia neta.
- Retiros.
- Flujo de efectivo.

No llamar "ganancia" a las ventas.

No llamar "pérdida" a un retiro.

---

# 35. Fórmulas

## Venta bruta

Suma de los importes finales de las ventas.

```text
Ventas brutas = suma de totales de ventas
```

## Costo de mercancía vendida

Debe utilizar el costo histórico asociado a los artículos vendidos según el método de costeo implementado.

No recalcular ventas históricas usando el costo actual.

## Ganancia bruta

```text
Ganancia bruta = Ventas brutas - Costo de mercancía vendida
```

## Ganancia neta

```text
Ganancia neta = Ganancia bruta - Gastos del negocio
```

## Pérdida neta

Si el resultado es negativo:

```text
Pérdida neta = resultado negativo de Ganancia neta
```

No considerar retiros como gastos.

---

# 36. Reporte general

Debe permitir seleccionar:

- Fecha inicial.
- Fecha final.

Mostrar:

- Ventas.
- Costo de mercancía.
- Ganancia bruta.
- Gastos.
- Ganancia/pérdida neta.
- Retiros.
- Efectivo.
- Tarjeta.
- Transferencias.

## Gráficas

### Ventas por periodo

Utilizar barras o líneas.

Eje X:

- Día/fecha.

Eje Y:

- Venta bruta.

El máximo del eje Y debe adaptarse automáticamente a los datos.

No usar un máximo fijo.

Se puede añadir margen visual automático.

### Distribución por categoría

Se puede utilizar gráfico circular/pastel para mostrar proporción de ventas por categoría.

### Ganancias/gastos

Preferir barras o líneas sobre pastel.

---

# 37. Reporte diario

Mostrar:

- Ventas del día.
- Costo de mercancía.
- Ganancia bruta.
- Gastos.
- Ganancia neta.
- Retiros.
- Efectivo.
- Tarjeta.
- Transferencia.

---

# 38. Reporte semanal

Mostrar:

- Ventas de la semana.
- Costos.
- Ganancia bruta.
- Gastos.
- Ganancia neta.
- Pérdida si corresponde.
- Retiros.
- Distribución por día.
- Productos/categorías más vendidos.

No llamar "proyección" a datos históricos.

Una verdadera proyección solamente debe implementarse si se diseña explícitamente un modelo de estimación.

---

# 39. Reporte mensual

Mostrar:

- Ventas del mes.
- Costos.
- Ganancia bruta.
- Gastos.
- Ganancia neta.
- Pérdidas.
- Retiros.
- Distribución semanal.
- Productos más vendidos.
- Categorías más vendidas.

Gastos pueden desglosarse por categoría:

- Renta.
- Servicios.
- Sueldos.
- Proveedores.
- Otros.

---

# 40. Reportes semanales y mensuales disponibles

Cuando un reporte semanal/mensual esté listo para consultar:

- Crear notificación interna.
- Enviar push si está habilitado.

La generación del reporte no debe duplicar datos.

Preferir calcular reportes a partir de datos persistentes y confiables.

---

# 41. Notificaciones

Tipos mínimos:

- Bajo stock.
- Actualización del sistema.
- Reporte semanal.
- Reporte mensual.

Cada notificación debe tener:

- ID.
- Tipo.
- Título.
- Mensaje.
- Fecha.
- Leída/no leída.

Debe existir opción para marcar notificaciones como leídas.

---

# 42. Push notifications

El usuario desea notificaciones push en:

- PC/ordenador.
- Celular.

La implementación debe utilizar una solución compatible con navegador/PWA o la arquitectura final del proyecto.

No asumir que cualquier navegador soportará push sin permisos.

El usuario debe poder activar/desactivar notificaciones desde Configuración.

---

# 43. Bajo stock

Cuando:

```text
stock < stockMinimo
```

crear notificación.

Evitar crear una nueva notificación idéntica en cada consulta de pantalla.

Si el producto vuelve a tener stock suficiente y posteriormente vuelve a caer por debajo del mínimo, entonces sí puede generarse una nueva alerta.

---

# 44. Configuración

Debe incluir como mínimo:

### Cuenta

- Nombre de usuario.
- Cambiar contraseña.

### Apariencia

- Claro.
- Oscuro.
- Sistema.

### Notificaciones

- Activar/desactivar notificaciones.
- Configuración de push.

### Sistema

- Configuraciones generales.

---

# 45. Moneda

El sistema utilizará inicialmente:

**MXN — Peso mexicano**

No convertir automáticamente precios existentes al cambiar la moneda.

No modificar precios históricos por un cambio de configuración.

Si en el futuro se implementa conversión monetaria real, deberá utilizar una tasa de cambio explícita y no sobrescribir precios almacenados.

Para el MVP, se recomienda mantener MXN como moneda operativa.

---

# 46. Fotos de productos

La foto es opcional.

No almacenar imágenes grandes directamente en PostgreSQL.

Preferir almacenamiento de archivos/imágenes compatible con Vercel y/o un proveedor de almacenamiento.

La base de datos debe guardar una referencia/URL de la imagen.

Debe existir manejo correcto de:

- imagen ausente,
- imagen eliminada,
- URL inválida.

---

# 47. Base de datos

El modelo debe mantener separación lógica.

Entidades esperadas como punto de partida:

```text
User
Category
Product
ProductCostHistory
InventoryMovement
Sale
SaleItem
Payment
CashRegister
CashMovement
Expense
Notification
SystemSettings
```

Pueden agregarse entidades adicionales si son necesarias, pero deben justificarse.

---

# 48. Reglas de integridad de datos

Las operaciones críticas deben utilizar transacciones de base de datos.

Especialmente:

- Confirmar venta.
- Disminuir inventario.
- Registrar pagos.
- Registrar entrada de mercancía.
- Crear retiro.
- Crear corte.

No permitir que una operación quede parcialmente guardada.

Ejemplo de venta:

```text
Crear venta
+
Crear items
+
Crear pagos
+
Actualizar inventario
+
Registrar movimientos
```

Todo debe completarse o fallar como una unidad lógica.

---

# 49. Históricos

Los datos históricos importantes no deben modificarse retroactivamente.

Una venta confirmada debe conservar:

- Precio vendido.
- Costo utilizado.
- Cantidad.
- Descuento.
- Total.
- Pagos.
- Fecha.

Cambiar un producto posteriormente no debe cambiar el significado de ventas anteriores.

---

# 50. Dinero

No utilizar cálculos monetarios basados en floats sin control.

Preferir:

- Decimal de Prisma/PostgreSQL.
- O representación en unidades mínimas cuando sea apropiado.

No utilizar directamente `number` para operaciones financieras críticas sin considerar errores de precisión.

Ejemplo conceptual:

```text
300.10 + 100.20
```

debe producir exactamente el resultado esperado.

---

# 51. Fechas y horas

El sistema debe ser consistente con zona horaria.

El negocio opera en México.

No mezclar fechas locales y UTC de forma inconsistente.

Definir claramente:

- cómo se almacena la fecha,
- cómo se consulta,
- cómo se muestra.

Los reportes diarios deben respetar el día local del negocio.

---

# 52. Validación

Utilizar validación tanto en frontend como en backend.

Validar:

- nombres.
- precios.
- costos.
- stock.
- cantidades.
- descuentos.
- pagos.
- fechas.
- categorías.

Nunca confiar únicamente en validaciones del navegador.

---

# 53. Seguridad

## Obligatorio

- Hash de contraseñas con bcrypt.
- Sesiones seguras.
- Cookies seguras cuando corresponda.
- Protección de rutas privadas.
- Validación del servidor.
- No exponer secretos.
- No almacenar credenciales en código.
- Variables sensibles en `.env`.
- No mostrar información sensible en errores.

## Logs

No registrar:

- contraseñas.
- tokens.
- secretos.
- cookies.
- credenciales.

---

# 54. Variables de entorno

Nunca escribir directamente en código:

- DATABASE_URL.
- Secretos de sesión.
- Claves privadas.
- Credenciales de servicios.

Utilizar `.env`.

Crear/actualizar `.env.example` sin valores secretos.

---

# 55. Manejo de errores

Los errores deben ser claros para el usuario.

Ejemplo:

```text
No se pudo registrar la venta.
Verifica el stock e inténtalo nuevamente.
```

No mostrar errores internos como respuesta final al usuario.

Registrar detalles técnicos de forma segura cuando sea necesario.

---

# 56. UX durante ventas

La pantalla de ventas es crítica.

Prioridades:

1. Velocidad.
2. Pocos clics.
3. Legibilidad.
4. Uso cómodo con teclado.
5. Uso cómodo con pantalla táctil.
6. Evitar errores accidentales.

No introducir diálogos innecesarios.

El cambio de precio NO requiere confirmación.

---

# 57. Responsive

La interfaz debe funcionar en:

### PC

Vista de dos columnas:

```text
Productos | Carrito/Cobro
```

### Celular

Puede convertirse en:

```text
Productos
↓
Carrito
↓
Cobro
```

La experiencia debe seguir siendo rápida.

---

# 58. Accesibilidad

Utilizar:

- etiquetas claras,
- botones con texto/iconos comprensibles,
- buen contraste,
- navegación mediante teclado cuando sea posible,
- estados de focus visibles,
- diálogos accesibles.

No depender únicamente del color para comunicar estados.

Ejemplo:

No usar únicamente rojo para indicar faltante.

Mostrar:

`Faltante: $50`

---

# 59. Testing con Vitest

Las funcionalidades críticas deben tener pruebas.

Prioridad:

### Alta

- Cálculo de totales.
- Descuentos.
- Cambio.
- Faltante.
- Pagos mixtos.
- Validación de pagos.
- Cálculo de stock.
- Entradas de inventario.
- Cálculo de costo.
- Ganancia bruta.
- Ganancia neta.
- Gastos.
- Retiros.
- Reportes.

### Ejemplos

```text
Venta $300 + efectivo $500 = cambio $200
```

```text
Venta $300 + efectivo $250 = faltante $50
```

```text
Venta $300 + tarjeta $300 = pago exacto
```

```text
Venta $500:
efectivo $200
tarjeta $300
= pago válido
```

```text
Venta $500:
tarjeta $600
= pago inválido
```

---

# 60. Pruebas de inventario

Probar:

```text
Stock inicial: 10
Venta: 3
Resultado: 7
```

Entrada:

```text
Stock: 7
Entrada: 5
Resultado: 12
```

No permitir:

```text
Stock: 2
Venta: 3
```

---

# 61. Pruebas de reportes

Crear casos controlados.

Ejemplo:

```text
Venta: $1,000
Costo: $600
Gastos: $100
```

Resultado:

```text
Ganancia bruta: $400
Ganancia neta: $300
```

Si existe:

```text
Retiro: $200
```

La ganancia neta debe seguir siendo:

```text
$300
```

El retiro debe afectar el efectivo, no la ganancia.

---

# 62. Reglas de negocio que nunca deben romperse

### Regla 1
Una venta confirmada no puede tener stock negativo.

### Regla 2
Una venta histórica no debe cambiar cuando se modifique el producto.

### Regla 3
Un retiro no es automáticamente un gasto.

### Regla 4
Un gasto sí afecta la ganancia neta.

### Regla 5
Los pagos deben coincidir con el total de la venta.

### Regla 6
Tarjeta/transferencia no pueden exceder el saldo pendiente.

### Regla 7
El precio personalizado de una venta no cambia el precio base del producto.

### Regla 8
El descuento de una venta no modifica el precio base del producto.

### Regla 9
Las entradas de mercancía aumentan stock.

### Regla 10
Las ventas disminuyen stock.

### Regla 11
Los costos históricos no deben eliminarse al cambiar el costo actual.

### Regla 12
Las operaciones financieras/inventario deben ser atómicas.

### Regla 13
No implementar devoluciones/cambios/cancelaciones porque actualmente no forman parte del negocio.

### Regla 14
No implementar clientes/fiado/apartados porque actualmente no forman parte del negocio.

---

# 63. No hacer

Claude NO debe:

- Crear múltiples roles sin solicitud.
- Crear clientes sin solicitud.
- Crear módulo de facturación sin solicitud.
- Agregar OAuth sin solicitud.
- Agregar códigos de barras sin solicitud.
- Agregar devoluciones.
- Agregar cancelaciones.
- Agregar apartados.
- Agregar fiado.
- Agregar impresora de tickets.
- Cambiar el stack principal sin autorización.
- Cambiar Prisma por otro ORM.
- Cambiar Neon por otra base de datos.
- Cambiar Next.js por otro framework.
- Crear una segunda aplicación innecesaria.
- Duplicar lógica de negocio.
- Guardar contraseñas en texto plano.
- Confiar únicamente en validación frontend.
- Modificar históricos para reflejar valores actuales.
- Confundir retiros con gastos.
- Confundir ventas con ganancias.
- Usar el costo actual para alterar ventas históricas.

---

# 64. Antes de cambiar el modelo de datos

Si una nueva funcionalidad requiere modificar Prisma:

1. Revisar relaciones existentes.
2. Revisar migraciones.
3. Revisar datos existentes.
4. Evaluar compatibilidad hacia atrás.
5. Actualizar tipos.
6. Actualizar servicios.
7. Actualizar validaciones.
8. Actualizar pruebas.
9. Ejecutar migraciones de forma segura.

Nunca eliminar columnas/datos históricos sin confirmar explícitamente.

---

# 65. Antes de cambiar una funcionalidad financiera

Antes de modificar:

- ventas,
- pagos,
- caja,
- gastos,
- retiros,
- costos,
- reportes,

revisar las fórmulas y las pruebas existentes.

Un cambio aparentemente pequeño puede alterar reportes históricos.

---

# 66. Estrategia de desarrollo

Desarrollar por fases.

## Fase 1 — Fundación

- Crear proyecto.
- Configurar Next.js.
- TypeScript.
- Tailwind.
- Prisma.
- Neon.
- Variables de entorno.
- Autenticación.
- Estructura base.

## Fase 2 — Inventario

- Categorías.
- Productos.
- Fotos.
- Costos.
- Stock.
- Stock mínimo.
- Historial de costos.
- Movimientos.

## Fase 3 — Ventas

- Catálogo.
- Búsqueda.
- Carrito.
- Cantidad.
- Descuentos.
- Precio personalizado.
- Pagos.
- Pago mixto.
- Persistencia.

## Fase 4 — Caja

- Fondo inicial.
- Caja.
- Movimientos.
- Retiros.
- Corte.
- Historial.

## Fase 5 — Gastos

- Categorías.
- Registro.
- Historial.
- Integración con reportes.

## Fase 6 — Reportes

- Diario.
- Semanal.
- Mensual.
- Rango personalizado.
- Gráficas.
- Ganancia/pérdida.

## Fase 7 — Notificaciones

- Internas.
- Bajo stock.
- Reportes.
- Actualizaciones.
- Push.

## Fase 8 — Pulido

- Responsive.
- Dark mode.
- Accesibilidad.
- Errores.
- Loading states.
- Empty states.
- Performance.
- Seguridad.

---

# 67. Criterios de aceptación

Una funcionalidad no debe considerarse terminada solamente porque "funciona visualmente".

Debe cumplir:

- UI.
- Validación.
- Backend.
- Base de datos.
- Manejo de errores.
- Estados de carga.
- Estados vacíos.
- Responsive.
- Pruebas cuando aplique.

Para una funcionalidad crítica, debe existir al menos una prueba de caso exitoso y casos de error relevantes.

---

# 68. Calidad de código

Preferir:

- TypeScript estricto.
- Funciones pequeñas.
- Nombres descriptivos.
- Componentes reutilizables.
- Validación centralizada.
- Servicios de dominio.
- Tipos compartidos cuando sea apropiado.

Evitar:

- `any` innecesario.
- Código duplicado.
- Componentes gigantes.
- Consultas SQL/Prisma repetidas sin necesidad.
- Lógica financiera dispersa.
- Magic numbers.
- Strings duplicados para estados.

---

# 69. Estados y enums

Para estados importantes utilizar enums o constantes tipadas.

Ejemplos:

```text
PaymentMethod:
- CASH
- CARD
- TRANSFER

InventoryMovementType:
- SALE
- PURCHASE
- ADJUSTMENT

CashMovementType:
- OPENING
- SALE
- WITHDRAWAL
- ADJUSTMENT

ExpenseCategory:
- RENT
- UTILITIES
- SALARY
- SUPPLIER
- TRANSPORT
- MAINTENANCE
- OTHER
```

Los nombres internos pueden estar en inglés aunque la interfaz esté completamente en español.

---

# 70. Idioma

La interfaz para el usuario final debe estar en:

**Español de México.**

El código puede utilizar nombres en inglés si mejora consistencia técnica.

Ejemplo:

```text
Product
Sale
SaleItem
Payment
Expense
```

pero UI:

```text
Producto
Venta
Artículo
Pago
Gasto
```

---

# 71. Formato monetario

Por defecto:

```text
MXN
```

Formato esperado:

```text
$300.00
$1,250.00
$15,000.00
```

Evitar mostrar demasiados decimales.

---

# 72. Datos de prueba

Durante desarrollo se pueden utilizar datos seed.

No mezclar datos de prueba con producción.

Debe existir una estrategia clara para:

- desarrollo,
- testing,
- producción.

Nunca ejecutar seeds destructivos automáticamente en producción.

---

# 73. Performance

La pantalla de Ventas debe ser rápida.

Evitar:

- cargar toda la base de datos innecesariamente,
- consultas repetidas,
- imágenes gigantes,
- re-renderizados innecesarios.

La búsqueda de productos debe sentirse inmediata.

Para grandes cantidades de productos, implementar paginación/virtualización o búsqueda eficiente según sea necesario.

---

# 74. Offline

No asumir soporte offline completo para el MVP.

Si se desea posteriormente:

- ventas offline,
- sincronización,
- conflictos,

debe diseñarse explícitamente antes de implementarlo.

No crear una solución offline improvisada que pueda duplicar ventas.

---

# 75. Actualizaciones

Las actualizaciones de la aplicación deben ser notificables.

No permitir que una actualización rompa datos existentes.

Toda modificación de esquema debe tener migración.

---

# 76. Backups

La información del POS es crítica.

Se debe contemplar una estrategia de respaldo de base de datos.

Nunca asumir que Vercel por sí mismo sustituye una estrategia de respaldo.

---

# 77. Seguridad financiera

Las operaciones relacionadas con dinero deben ser auditables.

Cuando sea apropiado, conservar:

- fecha,
- monto,
- tipo,
- referencia,
- descripción.

Evitar borrar movimientos financieros históricos.

Preferir registros inmutables para operaciones ya confirmadas.

---

# 78. Regla de oro sobre históricos

Los siguientes datos deben considerarse históricos:

- Ventas.
- Items de venta.
- Pagos.
- Costos usados en ventas.
- Entradas de inventario.
- Movimientos de caja.
- Gastos.
- Retiros.
- Cortes.

No deben depender de valores actuales para reconstruir el pasado.

---

# 79. Regla de oro sobre inventario

El inventario debe poder explicar:

```text
¿Por qué actualmente tengo 12 unidades?
```

Idealmente mediante movimientos:

```text
Inicial       +10
Compra        +20
Venta          -8
Ajuste         -2
----------------
Actual         20
```

Los movimientos proporcionan trazabilidad.

---

# 80. Regla de oro sobre reportes

Los reportes no deben guardar resultados calculados permanentemente si pueden calcularse de forma confiable a partir de datos históricos.

Preferir:

```text
Datos históricos
      ↓
Servicios de cálculo
      ↓
Reporte
```

Los snapshots/reportes persistidos solamente deben utilizarse cuando exista una razón concreta.

---

# 81. Preguntas pendientes

Estas decisiones pueden requerir confirmación antes de implementarlas si afectan el comportamiento:

1. Método exacto de costeo cuando el mismo producto se compra a diferentes precios:
   - FIFO,
   - promedio ponderado,
   - costo específico,
   - otra estrategia.

2. Si una compra de mercancía debe aparecer simultáneamente como:
   - entrada de inventario,
   - gasto,
   - o movimiento de flujo de efectivo separado.

3. Categorías exactas de gastos.

4. Proveedor obligatorio u opcional en entradas de mercancía.

5. Política de notificaciones duplicadas.

Si alguna de estas decisiones es necesaria para continuar con una implementación crítica, preguntar antes de asumir.

---

# 82. Orden recomendado de implementación

No comenzar por gráficas ni por diseño avanzado.

Orden:

```text
1. Arquitectura
2. Base de datos
3. Auth
4. Categorías
5. Productos
6. Inventario
7. Entradas
8. Ventas
9. Pagos
10. Caja
11. Retiros
12. Gastos
13. Reportes
14. Notificaciones
15. UI avanzada
16. Testing adicional
17. Deploy
```

---

# 83. Definition of Done

Una tarea está terminada cuando:

- [ ] Funcionalidad implementada.
- [ ] UI terminada.
- [ ] Backend implementado.
- [ ] Base de datos actualizada si corresponde.
- [ ] Validación frontend.
- [ ] Validación backend.
- [ ] Manejo de errores.
- [ ] Loading state.
- [ ] Empty state.
- [ ] Responsive.
- [ ] Pruebas relevantes.
- [ ] No rompe funcionalidades existentes.
- [ ] No contradice este CLAUDE.md.
- [ ] Código limpio.
- [ ] Sin secretos en el repositorio.

---

# 84. Instrucción final para Claude

Este proyecto es un sistema real para un negocio.

Prioriza:

1. **Correctitud de datos.**
2. **Integridad financiera.**
3. **Integridad del inventario.**
4. **Seguridad.**
5. **Mantenibilidad.**
6. **Experiencia de uso.**
7. **Performance.**
8. **Estética.**

No sacrificar la integridad de datos por hacer una interfaz más rápida de implementar.

No inventar reglas de negocio.

No agregar funcionalidades porque "un POS normalmente las tiene".

Cuando exista una decisión ambigua que pueda afectar dinero, inventario, históricos, base de datos o arquitectura, **preguntar antes de asumir**.

Cuando una tarea sea clara y no afecte decisiones pendientes, implementarla directamente.

Mantener este proyecto simple, modular y escalable.

**HC Venta debe ser un POS personalizado para Sandalias HC, no un POS genérico lleno de funcionalidades innecesarias.**
