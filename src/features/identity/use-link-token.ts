"use client";
import { useEffect, useRef, useState } from "react";

export function useLinkToken() {
  const saved = useRef<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  useEffect(() => {
    // Retain through Strict Mode effect replay, but remove the token from browser history.
    saved.current ??=
      new URLSearchParams(window.location.hash.slice(1)).get("token") ?? "";
    window.history.replaceState(
      window.history.state,
      "",
      window.location.pathname,
    );
    const value = saved.current;
    let active = true;
    queueMicrotask(() => {
      if (active) setToken(value);
    });
    return () => {
      active = false;
    };
  }, []);
  return token;
}
