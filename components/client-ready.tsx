"use client";

import { useEffect } from "react";

export function ClientReady() {
  useEffect(() => {
    document.documentElement.dataset.interactive = "true";
  }, []);

  return null;
}
