/**
 * Utilidad para serializar datos de Prisma y eliminar objetos Decimal y Date
 * que no pueden ser transmitidos a Componentes de Cliente en Next.js App Router.
 */
export function serializeData<T>(data: T): any {
  if (data === null || data === undefined) return data;

  // Handle BigInt
  if (typeof data === "bigint") {
    return Number(data);
  }

  // Handle Prisma Decimal / Decimal.js
  if (
    typeof data === "object" &&
    (
      (data as any).isDecimal ||
      typeof (data as any).toNumber === "function" ||
      (data as any).constructor?.name === "Decimal" ||
      ((data as any).d && (data as any).e && (data as any).s)
    )
  ) {
    if (typeof (data as any).toNumber === "function") {
      return (data as any).toNumber();
    }
    return Number(data.toString());
  }

  // Handle Date
  if (data instanceof Date) {
    return data.toISOString();
  }

  // Handle Array
  if (Array.isArray(data)) {
    return data.map((item) => serializeData(item));
  }

  // Handle Plain Objects
  if (typeof data === "object") {
    const serialized: Record<string, any> = {};
    for (const [key, value] of Object.entries(data)) {
      serialized[key] = serializeData(value);
    }
    return serialized;
  }

  return data;
}
