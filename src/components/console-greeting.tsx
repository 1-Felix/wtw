"use client";

import { useEffect } from "react";

export function ConsoleGreeting() {
  useEffect(() => {
    console.log(
      "%c wtw %c What to Watch",
      "background: #f59e0b; color: #0a0a0a; font-weight: bold; padding: 4px 8px; border-radius: 4px 0 0 4px;",
      "background: #1a1a1a; color: #f59e0b; padding: 4px 8px; border-radius: 0 4px 4px 0;",
    );
    console.log(
      "%chttps://github.com/1-Felix/wtw",
      "color: #a3a3a3; font-size: 11px;",
    );
  }, []);

  return null;
}
