import "server-only";
import { prisma } from "@/lib/prisma";
import { formatCurrency, roundMoney } from "@/lib/money";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export interface ConsolidatedProductItem {
  productId?: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
}

export interface CategorySalesGroup {
  categoryId: string;
  categoryName: string;
  items: ConsolidatedProductItem[];
  totalUnits: number;
  subtotalAmount: number;
}

export interface CashCutPdfData {
  register: {
    id: string;
    openedAt: Date;
    closedAt: Date | null;
    openingBalance: number;
    cashSales: number;
    cardSales: number;
    transferSales: number;
    withdrawalsTotal: number;
    expectedCash: number;
    countedCash: number | null;
    difference: number | null;
    notes: string | null;
    openedByName: string;
    closedByName: string;
  };
  salesSummary: {
    totalSales: number;
    totalCash: number;
    totalCard: number;
    totalTransfer: number;
    salesCount: number;
    totalUnits: number;
    itemsSubtotal: number;
    globalDiscounts: number;
    categories: CategorySalesGroup[];
    items: ConsolidatedProductItem[];
  };
  generatedAt: Date;
}

/**
 * Obtiene los datos de ventas reales asociados a un corte de caja específico,
 * agrupados por categorías existentes del catálogo y desglosados por variantes.
 */
export async function getCashCutPdfData(cashRegisterId: string): Promise<CashCutPdfData> {
  const register = await prisma.cashRegister.findUnique({
    where: { id: cashRegisterId },
    include: {
      openedBy: { select: { name: true, username: true } },
      closedBy: { select: { name: true, username: true } },
    },
  });

  if (!register) {
    throw new Error(`Corte de caja con ID ${cashRegisterId} no encontrado.`);
  }

  // Consultar ventas completadas (excluyendo canceladas) en el rango de tiempo de este corte
  // asociadas directamente al ID de la caja o generadas durante su periodo.
  const sales = await prisma.sale.findMany({
    where: {
      status: "COMPLETED",
      OR: [
        { cashRegisterId: register.id },
        {
          cashRegisterId: null,
          createdAt: {
            gte: register.openedAt,
            lte: register.closedAt ?? new Date(),
          },
        },
      ],
    },
    include: {
      items: {
        include: {
          product: {
            include: {
              category: true,
            },
          },
        },
      },
      payments: true,
    },
    orderBy: { createdAt: "asc" },
  });

  // Agrupación por categoría y desglose por variantes respetando precios históricos y descuentos
  interface InternalCategoryGroup {
    categoryId: string;
    categoryName: string;
    itemMap: Map<string, ConsolidatedProductItem>;
  }

  const categoryMap = new Map<string, InternalCategoryGroup>();
  let totalUnits = 0;
  let itemsSubtotal = 0;
  let globalDiscounts = 0;

  for (const sale of sales) {
    const saleDiscount = roundMoney(Number(sale.discountAmount || 0));
    globalDiscounts = roundMoney(globalDiscounts + saleDiscount);

    for (const item of sale.items) {
      const quantity = Math.floor(item.quantity);
      if (quantity <= 0) continue;

      const unitPrice = roundMoney(Number(item.unitPrice));
      const totalAmount = roundMoney(Number(item.subtotal));

      totalUnits += quantity;
      itemsSubtotal = roundMoney(itemsSubtotal + totalAmount);

      // Nombre específico del producto / variante respetando catálogo
      const displayName = item.product?.name || item.productName || "Artículo sin nombre";

      // Obtener categoría real existente en el catálogo
      let catName = item.product?.category?.name?.trim();
      let catId = item.product?.category?.id || item.product?.categoryId;

      if (!catName) {
        const itemWithFallback = item as unknown as { categoryName?: string; categoryId?: string };
        if (itemWithFallback.categoryName) {
          catName = itemWithFallback.categoryName;
          catId = itemWithFallback.categoryId || catName;
        } else {
          // Clasificación inteligente para nombres históricos o mocks de pruebas unitarias
          const lower = displayName.toLowerCase();
          if (lower.includes("sandalia")) catName = "Sandalias";
          else if (lower.includes("pantufla")) catName = "Pantuflas";
          else if (lower.includes("gorra")) catName = "Gorras";
          else if (lower.includes("pijama")) catName = "Pijamas";
          else if (lower.includes("calceta")) catName = "Calcetas";
          else if (lower.includes("ropa interior")) catName = "Ropa interior";
          else if (lower.includes("ropa")) catName = "Ropa";
          else if (lower.includes("termo")) catName = "Termos";
          else catName = "Otros";

          catId = catName.toLowerCase();
        }
      }

      if (!catId) catId = catName;

      let group = categoryMap.get(catId);
      if (!group) {
        group = {
          categoryId: catId,
          categoryName: catName,
          itemMap: new Map<string, ConsolidatedProductItem>(),
        };
        categoryMap.set(catId, group);
      }

      // Clave de agrupación de variante: producto + precio unitario exacto
      // Si la misma variante se vendió a precios diferentes o descuentos distintos, se separan las filas.
      const productIdOrName = item.productId || displayName;
      const variantKey = `${productIdOrName}_${unitPrice.toFixed(2)}`;

      const existingVariant = group.itemMap.get(variantKey);
      if (existingVariant) {
        existingVariant.quantity += quantity;
        existingVariant.totalAmount = roundMoney(existingVariant.totalAmount + totalAmount);
      } else {
        group.itemMap.set(variantKey, {
          productId: item.productId,
          productName: displayName,
          quantity,
          unitPrice,
          totalAmount,
        });
      }
    }
  }

  // Convertir a lista de categorías con ventas válidas del día, ordenadas alfabéticamente
  const categories: CategorySalesGroup[] = Array.from(categoryMap.values())
    .map((group) => {
      const items = Array.from(group.itemMap.values()).sort((a, b) =>
        a.productName.localeCompare(b.productName)
      );
      const catUnits = items.reduce((sum, it) => sum + it.quantity, 0);
      const catSubtotal = roundMoney(items.reduce((sum, it) => sum + it.totalAmount, 0));

      return {
        categoryId: group.categoryId,
        categoryName: group.categoryName,
        items,
        totalUnits: catUnits,
        subtotalAmount: catSubtotal,
      };
    })
    .filter((cat) => cat.totalUnits > 0)
    .sort((a, b) => a.categoryName.localeCompare(b.categoryName));

  // Lista consolidada plana general para mantener retrocompatibilidad
  const consolidatedFlatItems: ConsolidatedProductItem[] = [];
  for (const cat of categories) {
    consolidatedFlatItems.push(...cat.items);
  }
  consolidatedFlatItems.sort((a, b) => a.productName.localeCompare(b.productName));

  // Calcular totales por método de pago a partir de los pagos de las ventas
  let totalCash = 0;
  let totalCard = 0;
  let totalTransfer = 0;

  for (const sale of sales) {
    for (const payment of sale.payments) {
      const amount = roundMoney(Number(payment.amount));
      if (payment.method === "CASH") totalCash = roundMoney(totalCash + amount);
      else if (payment.method === "CARD") totalCard = roundMoney(totalCard + amount);
      else if (payment.method === "TRANSFER") totalTransfer = roundMoney(totalTransfer + amount);
    }
  }

  const totalSales = roundMoney(totalCash + totalCard + totalTransfer);

  return {
    register: {
      id: register.id,
      openedAt: register.openedAt,
      closedAt: register.closedAt,
      openingBalance: Number(register.openingBalance),
      cashSales: Number(register.cashSales),
      cardSales: Number(register.cardSales),
      transferSales: Number(register.transferSales),
      withdrawalsTotal: Number(register.withdrawalsTotal),
      expectedCash: Number(register.expectedCash),
      countedCash: register.countedCash !== null ? Number(register.countedCash) : null,
      difference: register.difference !== null ? Number(register.difference) : null,
      notes: register.notes,
      openedByName: register.openedBy?.name || register.openedBy?.username || "Administrador",
      closedByName: register.closedBy?.name || register.closedBy?.username || "Administrador",
    },
    salesSummary: {
      totalSales,
      totalCash,
      totalCard,
      totalTransfer,
      salesCount: sales.length,
      totalUnits,
      itemsSubtotal,
      globalDiscounts,
      categories,
      items: consolidatedFlatItems,
    },
    generatedAt: new Date(),
  };
}

/**
 * Genera el documento PDF formal para el reporte diario de ventas de un corte de caja,
 * con productos agrupados por categorías existentes, desglose de variantes, subtotales
 * por categoría, resumen general y resumen por métodos de pago.
 */
export async function generateDailySalesPdf(cashRegisterId: string): Promise<{
  buffer: Buffer;
  filename: string;
  data: CashCutPdfData;
}> {
  const data = await getCashCutPdfData(cashRegisterId);
  const { register, salesSummary, generatedAt } = data;

  // Formateadores de fecha para México
  const cutDateFormatted = new Intl.DateTimeFormat("es-MX", {
    timeZone: "America/Mexico_City",
    dateStyle: "full",
  }).format(register.closedAt || register.openedAt);

  const genDateFormatted = new Intl.DateTimeFormat("es-MX", {
    timeZone: "America/Mexico_City",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  }).format(generatedAt);

  const dateFileStr = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Mexico_City",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(register.closedAt || register.openedAt);

  const filename = `Reporte_Ventas_${dateFileStr}.pdf`;

  // Crear documento PDF tamaño Carta (Letter)
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "letter", // 215.9 x 279.4 mm
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginLeft = 14;
  const marginRight = 14;
  const contentWidth = pageWidth - marginLeft - marginRight;

  // 1. Barra superior corporativa (Acento de color de Sandalias HC: #cfd500)
  doc.setFillColor(207, 213, 0);
  doc.rect(0, 0, pageWidth, 5, "F");

  // 2. Encabezado principal
  let currentY = 16;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text("Sandalias y Pantuflas HC", marginLeft, currentY);

  currentY += 7;
  doc.setFontSize(13);
  doc.setTextColor(51, 65, 85); // slate-700
  doc.text("Reporte diario de ventas", marginLeft, currentY);

  // Tarjeta de metadatos en la esquina superior derecha
  const rightBoxWidth = 80;
  const rightBoxX = pageWidth - marginRight - rightBoxWidth;
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139); // slate-500

  const shortCutId = `#CORTE-${register.id.slice(-6).toUpperCase()}`;
  doc.text(`ID Corte: ${shortCutId}`, rightBoxX, 16);
  doc.text(`Fecha de ventas: ${cutDateFormatted}`, rightBoxX, 21);
  doc.text(`Generado: ${genDateFormatted}`, rightBoxX, 26);
  if (register.closedAt) {
    const closedTime = new Intl.DateTimeFormat("es-MX", {
      timeZone: "America/Mexico_City",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }).format(register.closedAt);
    doc.text(`Cierre de jornada: ${closedTime} (${register.closedByName})`, rightBoxX, 31);
  }

  currentY += 12;

  // 3. Resumen Operativo de la Caja (Fondo Inicial, Efectivo Contado, Cuadre)
  doc.setFillColor(248, 250, 252); // slate-50
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.roundedRect(marginLeft, currentY, contentWidth, 16, 2, 2, "FD");

  const colW = contentWidth / 4;
  const cardY = currentY + 5;

  // Col 1: Fondo Inicial
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text("FONDO INICIAL", marginLeft + 4, cardY);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(formatCurrency(register.openingBalance), marginLeft + 4, cardY + 6);

  // Col 2: Ventas en Efectivo
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text("VENTAS EFECTIVO", marginLeft + colW + 4, cardY);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(5, 150, 105); // emerald-600
  doc.text(formatCurrency(register.cashSales), marginLeft + colW + 4, cardY + 6);

  // Col 3: Efectivo Contado
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text("EFECTIVO CONTADO", marginLeft + colW * 2 + 4, cardY);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(
    register.countedCash !== null ? formatCurrency(register.countedCash) : "—",
    marginLeft + colW * 2 + 4,
    cardY + 6
  );

  // Col 4: Diferencia / Cuadre
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text("DIFERENCIA", marginLeft + colW * 3 + 4, cardY);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  if (register.difference === 0) {
    doc.setTextColor(5, 150, 105);
    doc.text("Cuadre Exacto", marginLeft + colW * 3 + 4, cardY + 6);
  } else if (register.difference !== null && register.difference > 0) {
    doc.setTextColor(37, 99, 235); // blue-600
    doc.text(`+${formatCurrency(register.difference)}`, marginLeft + colW * 3 + 4, cardY + 6);
  } else if (register.difference !== null && register.difference < 0) {
    doc.setTextColor(225, 29, 72); // rose-600
    doc.text(formatCurrency(register.difference), marginLeft + colW * 3 + 4, cardY + 6);
  } else {
    doc.setTextColor(100, 116, 139);
    doc.text("—", marginLeft + colW * 3 + 4, cardY + 6);
  }

  currentY += 22;

  // 4. Detalle de productos vendidos organizados por categorías
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text("Detalle de Ventas por Categoría y Variante", marginLeft, currentY);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  const subtitleInfo = `${salesSummary.categories.length} ${
    salesSummary.categories.length === 1 ? "categoría con ventas" : "categorías con ventas"
  } • ${salesSummary.totalUnits} piezas vendidas`;
  doc.text(subtitleInfo, marginLeft + 85, currentY);

  currentY += 5;

  if (salesSummary.categories.length === 0) {
    // Si no hubo ventas en la jornada
    autoTable(doc, {
      startY: currentY,
      head: [["Cantidad", "Artículo / variante", "Precio unitario", "Importe total"]],
      body: [["0", "Sin ventas registradas en esta jornada", "$0.00", "$0.00"]],
      theme: "striped",
      margin: { left: marginLeft, right: marginRight, top: 16, bottom: 16 },
      showHead: "everyPage",
      headStyles: {
        fillColor: [207, 213, 0],
        textColor: [15, 23, 42],
        fontStyle: "bold",
        fontSize: 8.5,
      },
      columnStyles: {
        0: { halign: "center", cellWidth: 26 },
        1: { halign: "left", cellWidth: "auto" },
        2: { halign: "right", cellWidth: 38 },
        3: { halign: "right", cellWidth: 42, fontStyle: "bold" },
      },
      styles: {
        fontSize: 8.5,
        textColor: [100, 116, 139],
        cellPadding: 3,
        lineColor: [226, 232, 240],
        lineWidth: 0.1,
      },
    });

    const extendedDoc = doc as jsPDF & { lastAutoTable?: { finalY: number } };
    currentY = (extendedDoc.lastAutoTable?.finalY ?? currentY) + 8;
  } else {
    // Recorrer cada categoría con ventas
    for (const cat of salesSummary.categories) {
      // Verificar si hay espacio suficiente para el encabezado y el inicio de la tabla (al menos 38mm)
      if (pageHeight - currentY < 40) {
        doc.addPage();
        currentY = 18;
      }

      const catTitle = cat.categoryName.toUpperCase();

      // Banner superior de categoría con estilo formal y barra corporativa
      doc.setFillColor(241, 245, 249); // slate-100
      doc.setDrawColor(226, 232, 240); // slate-200
      doc.roundedRect(marginLeft, currentY, contentWidth, 6.5, 1, 1, "FD");

      doc.setFillColor(207, 213, 0); // #cfd500
      doc.rect(marginLeft, currentY, 3, 6.5, "F");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      doc.setTextColor(15, 23, 42);
      doc.text(catTitle, marginLeft + 6, currentY + 4.5);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      const catMeta = `${cat.totalUnits} ${cat.totalUnits === 1 ? "pieza" : "piezas"} (${
        cat.items.length
      } ${cat.items.length === 1 ? "variante" : "variantes"})`;
      const metaWidth = doc.getTextWidth(catMeta);
      doc.text(catMeta, pageWidth - marginRight - metaWidth - 4, currentY + 4.5);

      currentY += 8;

      // Filas de las variantes vendidas
      const rows = cat.items.map((item) => [
        item.quantity.toString(),
        item.productName,
        formatCurrency(item.unitPrice),
        formatCurrency(item.totalAmount),
      ]);

      // Fila de subtotal de la categoría
      const subtotalLabel = `Subtotal de ${cat.categoryName.toLowerCase()}`;
      rows.push([
        cat.totalUnits.toString(),
        subtotalLabel,
        "",
        formatCurrency(cat.subtotalAmount),
      ]);

      const subtotalRowIndex = rows.length - 1;

      autoTable(doc, {
        startY: currentY,
        head: [["Cantidad", "Artículo / variante", "Precio unitario", "Importe total"]],
        body: rows,
        theme: "striped",
        margin: { left: marginLeft, right: marginRight, top: 16, bottom: 16 },
        showHead: "everyPage",
        headStyles: {
          fillColor: [207, 213, 0], // #cfd500
          textColor: [15, 23, 42], // slate-900
          fontStyle: "bold",
          fontSize: 8.5,
          halign: "left",
          valign: "middle",
          cellPadding: 2.6,
        },
        columnStyles: {
          0: { halign: "center", cellWidth: 26 },
          1: { halign: "left", cellWidth: "auto" },
          2: { halign: "right", cellWidth: 38 },
          3: { halign: "right", cellWidth: 42, fontStyle: "bold" },
        },
        styles: {
          fontSize: 8.5,
          textColor: [30, 41, 59],
          cellPadding: 2.3,
          lineColor: [226, 232, 240],
          lineWidth: 0.1,
        },
        alternateRowStyles: {
          fillColor: [250, 250, 250],
        },
        didParseCell: (hookData) => {
          if (hookData.row.index === subtotalRowIndex) {
            hookData.cell.styles.fillColor = [241, 245, 249]; // slate-100
            hookData.cell.styles.textColor = [15, 23, 42];
            hookData.cell.styles.fontStyle = "bold";
            if (hookData.column.index === 0) {
              hookData.cell.styles.halign = "center";
            } else if (hookData.column.index === 1) {
              hookData.cell.styles.halign = "left";
            } else if (hookData.column.index === 3) {
              hookData.cell.styles.halign = "right";
            }
          }
        },
      });

      const extendedDoc = doc as jsPDF & { lastAutoTable?: { finalY: number } };
      currentY = (extendedDoc.lastAutoTable?.finalY ?? currentY) + 7;
    }
  }

  // 5. Resumen General del Día y Resumen de Ventas por Método de Pago
  // Si no queda suficiente espacio en la página (menos de 55mm), iniciar nueva página
  let summaryY = currentY + 2;
  if (pageHeight - summaryY < 55) {
    doc.addPage();
    summaryY = 18;
  }

  // Dimensiones y posiciones para cajas de resumen lado a lado
  const summaryBoxWidth = 88;
  const paymentBoxWidth = 92;
  const paymentBoxX = pageWidth - marginRight - paymentBoxWidth;

  // 5.1 Resumen General del Día (Izquierda)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text("Resumen General del Día", marginLeft, summaryY);

  const generalSummaryBody = [
    ["Total de unidades vendidas:", `${salesSummary.totalUnits} piezas`],
    ["Operaciones registradas:", `${salesSummary.salesCount} ventas`],
    ["Subtotal de artículos:", formatCurrency(salesSummary.itemsSubtotal)],
  ];

  if (salesSummary.globalDiscounts > 0) {
    generalSummaryBody.push([
      "Descuentos globales en caja:",
      `-${formatCurrency(salesSummary.globalDiscounts)}`,
    ]);
  }

  generalSummaryBody.push([
    "TOTAL GENERAL DE VENTAS:",
    formatCurrency(salesSummary.totalSales),
  ]);

  autoTable(doc, {
    startY: summaryY + 4,
    margin: { left: marginLeft, right: pageWidth - marginLeft - summaryBoxWidth, top: 16, bottom: 16 },
    tableWidth: summaryBoxWidth,
    body: generalSummaryBody,
    theme: "plain",
    columnStyles: {
      0: { fontStyle: "normal", halign: "left", cellWidth: 52 },
      1: { fontStyle: "bold", halign: "right", cellWidth: 36 },
    },
    styles: {
      fontSize: 8.5,
      textColor: [30, 41, 59],
      cellPadding: 2.2,
      lineColor: [226, 232, 240],
      lineWidth: 0.1,
    },
    didParseCell: (hookData) => {
      if (hookData.row.index === generalSummaryBody.length - 1) {
        hookData.cell.styles.fillColor = [207, 213, 0];
        hookData.cell.styles.textColor = [15, 23, 42];
        hookData.cell.styles.fontStyle = "bold";
        hookData.cell.styles.fontSize = 9;
      }
    },
  });

  // 5.2 Resumen de Ventas por Método de Pago (Derecha)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text("Resumen por Método de Pago", paymentBoxX, summaryY);

  const paymentSummaryData = [
    ["Total en efectivo:", formatCurrency(salesSummary.totalCash)],
    ["Total con tarjeta:", formatCurrency(salesSummary.totalCard)],
    ["Total por transferencia:", formatCurrency(salesSummary.totalTransfer)],
    ["TOTAL COBRADO:", formatCurrency(salesSummary.totalSales)],
  ];

  autoTable(doc, {
    startY: summaryY + 4,
    margin: { left: paymentBoxX, right: marginRight, top: 16, bottom: 16 },
    tableWidth: paymentBoxWidth,
    body: paymentSummaryData,
    theme: "plain",
    columnStyles: {
      0: { fontStyle: "normal", halign: "left", cellWidth: 50 },
      1: { fontStyle: "bold", halign: "right", cellWidth: 42 },
    },
    styles: {
      fontSize: 8.5,
      textColor: [30, 41, 59],
      cellPadding: 2.2,
      lineColor: [226, 232, 240],
      lineWidth: 0.1,
    },
    didParseCell: (hookData) => {
      if (hookData.row.index === paymentSummaryData.length - 1) {
        hookData.cell.styles.fillColor = [207, 213, 0];
        hookData.cell.styles.textColor = [15, 23, 42];
        hookData.cell.styles.fontStyle = "bold";
        hookData.cell.styles.fontSize = 9;
      }
    },
  });

  // 6. Pie de página en todas las páginas generadas
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(148, 163, 184); // slate-400

    // Línea separadora
    doc.setDrawColor(226, 232, 240);
    doc.line(marginLeft, pageHeight - 12, pageWidth - marginRight, pageHeight - 12);

    doc.text(
      "Documento oficial emitido por el sistema Sandalias y Pantuflas HC • Todos los derechos reservados",
      marginLeft,
      pageHeight - 7
    );
    doc.text(`Página ${i} de ${totalPages}`, pageWidth - marginRight - 20, pageHeight - 7);
  }

  // Convertir a Buffer de Node.js
  const arrayBuffer = doc.output("arraybuffer");
  const buffer = Buffer.from(arrayBuffer);

  return {
    buffer,
    filename,
    data,
  };
}

