"use client";

import { useEffect } from "react";

// ==============================================================================
// Impide arrastrar imágenes con el mouse en toda la app.
// El CSS (-webkit-user-drag) cubre Chrome/Edge/Safari; este listener cubre
// Firefox y cualquier imagen insertada después de la carga.
// ==============================================================================

const BLOCKED_TAGS = new Set(["IMG", "PICTURE", "VIDEO", "CANVAS", "SVG"]);

export function ImageGuard() {
  useEffect(() => {
    const isMedia = (target: EventTarget | null) => {
      if (!(target instanceof Element)) return false;
      return BLOCKED_TAGS.has(target.tagName.toUpperCase()) || target.closest("svg") !== null;
    };

    const preventDrag = (e: DragEvent) => {
      if (isMedia(e.target)) e.preventDefault();
    };
    // Evita que un clic sostenido sobre una imagen inicie una selección
    const preventSelectStart = (e: Event) => {
      if (isMedia(e.target)) e.preventDefault();
    };

    document.addEventListener("dragstart", preventDrag, true);
    document.addEventListener("selectstart", preventSelectStart, true);
    return () => {
      document.removeEventListener("dragstart", preventDrag, true);
      document.removeEventListener("selectstart", preventSelectStart, true);
    };
  }, []);

  return null;
}
