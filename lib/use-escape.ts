"use client";

import { useEffect, useRef } from "react";

// Единый стек открытых модалок: Escape закрывает только верхнюю,
// а не все сразу (важно для модалок поверх модалок).
const stack: Array<() => void> = [];
let listening = false;

function ensureListening() {
  if (listening || typeof document === "undefined") return;
  listening = true;
  document.addEventListener("keydown", (e: KeyboardEvent) => {
    if (e.key === "Escape") stack[stack.length - 1]?.();
  });
}

export function useEscapeKey(onClose: () => void, active = true) {
  const ref = useRef(onClose);

  useEffect(() => {
    ref.current = onClose;
    if (!active) return;
    ensureListening();
    const close = () => ref.current();
    stack.push(close);
    return () => {
      const i = stack.indexOf(close);
      if (i >= 0) stack.splice(i, 1);
    };
  });
}
