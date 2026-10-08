"use client";

import { createPortal } from "react-dom";
import { formatCurrency } from "@/lib/money";

export interface TicketItem {
  name: string;
  quantity: number;
  /** Importe de la partida (precio final × cantidad, con descuentos aplicados) */
  amount: number;
}

export interface TicketData {
  folio: string;
  date: Date;
  items: TicketItem[];
  total: number;
}

export const STORE_INFO = {
  name: "Sandalias y Pantuflas HC",
  address: "C. Juan Díaz Covarrubias 56-B, San Juan de Dios, 44360 Guadalajara, Jal.",
};

/**
 * Ticket para impresora térmica (80 mm).
 * Se monta vía portal directamente en <body> y sólo es visible al imprimir;
 * las reglas @media print ocultan el resto de la app sin tocar su layout.
 */
export function ThermalTicket({ data }: { data: TicketData | null }) {
  if (!data || typeof document === "undefined") return null;

  const dateStr = data.date.toLocaleString("es-MX", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  return createPortal(
    <div id="thermal-ticket-root">
      <style>{`
        #thermal-ticket-root { display: none; }
        @media print {
          @page { size: 80mm auto; margin: 0; }
          html, body { background: #fff !important; margin: 0 !important; padding: 0 !important; }
          body > *:not(#thermal-ticket-root) { display: none !important; }
          #thermal-ticket-root { display: block !important; }
        }
        .tk { width: 72mm; margin: 0 auto; padding: 3mm 0 6mm; color: #000;
              font-family: "Courier New", ui-monospace, monospace; font-size: 12px; line-height: 1.3; }
        .tk * { color: #000 !important; }
        .tk-center { text-align: center; }
        .tk-store { font-size: 15px; font-weight: 800; }
        .tk-addr { font-size: 11px; margin-top: 2px; }
        .tk-sep { border: 0; border-top: 1px dashed #000; margin: 6px 0; }
        .tk-row { display: flex; justify-content: space-between; gap: 4px; }
        .tk-table { width: 100%; border-collapse: collapse; }
        .tk-table th { font-weight: 800; text-align: left; border-bottom: 1px dashed #000; padding-bottom: 2px; }
        .tk-table td { vertical-align: top; padding: 2px 0; }
        .tk-qty { width: 9mm; text-align: center !important; }
        .tk-price { width: 20mm; text-align: right !important; white-space: nowrap; }
        .tk-name { word-break: break-word; }
        .tk-total { font-size: 15px; font-weight: 800; }
        .tk-thanks { font-weight: 800; margin-top: 4px; }
        .tk-note { font-size: 11px; font-weight: 800; margin-top: 6px; text-transform: uppercase; }
      `}</style>

      <div className="tk">
        {/* Encabezado */}
        <div className="tk-center">
          <div className="tk-store">{STORE_INFO.name}</div>
          <div className="tk-addr">{STORE_INFO.address}</div>
        </div>
        <hr className="tk-sep" />
        <div className="tk-row">
          <span>Fecha:</span>
          <span>{dateStr}</span>
        </div>
        <div className="tk-row">
          <span>Folio:</span>
          <span>{data.folio}</span>
        </div>
        <hr className="tk-sep" />

        {/* Detalle */}
        <table className="tk-table">
          <thead>
            <tr>
              <th>Artículo</th>
              <th className="tk-qty">Cant</th>
              <th className="tk-price">Precio</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((item, i) => (
              <tr key={i}>
                <td className="tk-name">{item.name}</td>
                <td className="tk-qty">{item.quantity}</td>
                <td className="tk-price">{formatCurrency(item.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <hr className="tk-sep" />

        {/* Totales */}
        <div className="tk-row tk-total">
          <span>TOTAL:</span>
          <span>{formatCurrency(data.total)}</span>
        </div>
        <hr className="tk-sep" />

        {/* Pie */}
        <div className="tk-center">
          <div className="tk-thanks">¡Gracias por su compra!</div>
          <div className="tk-note">No se realizan cambios ni devoluciones</div>
        </div>
      </div>
    </div>,
    document.body
  );
}
