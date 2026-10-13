import "server-only";
import { prisma } from "@/lib/prisma";
import { formatCurrency, roundMoney } from "@/lib/money";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export interface ConsolidatedProductItem {
  productName: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
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
    items: ConsolidatedProductItem[];
  };
  generatedAt: Date;
}

/**
 * Obtiene los datos de ventas reales asociados a un corte de caja específico.
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
  // asociadas directamente al ID de la caja o generadas durante su periodo si no tenían caja asignada.
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
      items: true,
      payments: true,
    },
    orderBy: { createdAt: "asc" },
  });

  // Consolidar productos vendidos respetando cantidades y precios reales
  // Agrupamos por (Nombre del producto + Precio unitario efectivo) para no perder precisión
  const productMap = new Map<string, ConsolidatedProductItem>();
  let totalUnits = 0;

  for (const sale of sales) {
    const saleSubtotal = Number(sale.subtotal);
    const saleDiscount = Number(sale.discountAmount || 0);

    for (const item of sale.items) {
      const rawSubtotal = Number(item.subtotal);
      // Si la venta tuvo descuento a nivel carrito general, prorratear para reflejar el importe cobrado real
      const itemCartDiscount =
        saleDiscount > 0 && saleSubtotal > 0
          ? roundMoney(saleDiscount * (rawSubtotal / saleSubtotal))
          : 0;

      const totalAmount = roundMoney(Math.max(0, rawSubtotal - itemCartDiscount));
      const unitPrice = item.quantity > 0 ? roundMoney(totalAmount / item.quantity) : roundMoney(Number(item.unitPrice));
      const key = `${item.productName}_${unitPrice.toFixed(2)}`;

      const existing = productMap.get(key);
      if (existing) {
        existing.quantity += item.quantity;
        existing.totalAmount = roundMoney(existing.totalAmount + totalAmount);
      } else {
        productMap.set(key, {
          productName: item.productName,
          quantity: item.quantity,
          unitPrice,
          totalAmount,
        });
      }

      totalUnits += item.quantity;
    }
  }

  // Ordenar alfabéticamente por nombre de artículo
  const consolidatedItems = Array.from(productMap.values()).sort((a, b) =>
    a.productName.localeCompare(b.productName)
  );

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
      items: consolidatedItems,
    },
    generatedAt: new Date(),
  };
}

/**
 * Genera el documento PDF formal para el reporte diario de ventas de un corte de caja.
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

  // 1. Barra superior corporativa (Acento de color de Sandalias HC)
  doc.setFillColor(207, 213, 0); // #cfd500
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

  // 4. Detalle de productos vendidos
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text("Detalle de Productos Vendidos", marginLeft, currentY);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text(
    `Total de operaciones: ${salesSummary.salesCount} ventas (${salesSummary.totalUnits} piezas vendidas)`,
    marginLeft + 65,
    currentY
  );

  currentY += 4;

  // Tabla con jspdf-autotable
  const tableData =
    salesSummary.items.length === 0
      ? [["0", "Sin ventas registradas en esta jornada", "$0.00", "$0.00"]]
      : salesSummary.items.map((item) => [
          item.quantity.toString(),
          item.productName,
          formatCurrency(item.unitPrice),
          formatCurrency(item.totalAmount),
        ]);

  autoTable(doc, {
    startY: currentY,
    head: [["Cantidad", "Artículo", "Precio unitario", "Importe total"]],
    body: tableData,
    theme: "striped",
    margin: { left: marginLeft, right: marginRight },
    showHead: "everyPage",
    headStyles: {
      fillColor: [207, 213, 0], // #cfd500
      textColor: [15, 23, 42], // slate-900
      fontStyle: "bold",
      fontSize: 9,
      halign: "left",
      valign: "middle",
      cellPadding: 3,
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
      cellPadding: 2.8,
      lineColor: [226, 232, 240],
      lineWidth: 0.1,
    },
    alternateRowStyles: {
      fillColor: [250, 250, 250],
    },
  });

  // Obtener la posición vertical final de la tabla
  const finalTableY = (doc as any).lastAutoTable.finalY || currentY + 30;

  // 5. Resumen de Ventas por Método de Pago
  // Si no queda suficiente espacio en la página (menos de 60mm), crear una nueva página
  let summaryY = finalTableY + 8;
  if (pageHeight - summaryY < 65) {
    doc.addPage();
    summaryY = 20;
  }

  const summaryBoxWidth = 110;
  const summaryBoxX = pageWidth - marginRight - summaryBoxWidth;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text("Resumen de Ventas por Método de Pago", summaryBoxX, summaryY);

  summaryY += 4;

  const paymentSummaryData = [
    ["Total en efectivo:", formatCurrency(salesSummary.totalCash)],
    ["Total con tarjeta:", formatCurrency(salesSummary.totalCard)],
    ["Total por transferencia:", formatCurrency(salesSummary.totalTransfer)],
    ["TOTAL GENERAL DE VENTAS:", formatCurrency(salesSummary.totalSales)],
  ];

  autoTable(doc, {
    startY: summaryY,
    margin: { left: summaryBoxX, right: marginRight },
    body: paymentSummaryData,
    theme: "plain",
    columnStyles: {
      0: { fontStyle: "normal", halign: "left", cellWidth: 62 },
      1: { fontStyle: "bold", halign: "right", cellWidth: 48 },
    },
    styles: {
      fontSize: 9,
      textColor: [30, 41, 59],
      cellPadding: 2.2,
      lineColor: [226, 232, 240],
      lineWidth: 0.1,
    },
    didParseCell: (hookData) => {
      // Destacar la fila del TOTAL GENERAL
      if (hookData.row.index === 3) {
        hookData.cell.styles.fillColor = [207, 213, 0];
        hookData.cell.styles.textColor = [0, 0, 0];
        hookData.cell.styles.fontStyle = "bold";
        hookData.cell.styles.fontSize = 10;
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
