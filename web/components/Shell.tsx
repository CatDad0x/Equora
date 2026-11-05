"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { useCurrency } from "@/lib/currency";
import { Sidebar } from "./Sidebar";

/** Pages that render full-bleed without the app sidebar. */
const BARE = ["/", "/start"];

export function Shell({ children }: { children: ReactNode }) {
  const path = usePathname();
  const { currency } = useCurrency();

  // The accent colour follows the user's currency everywhere (see [data-currency] in globals.css).
  useEffect(() => {
    document.documentElement.dataset.currency = currency;
  }, [currency]);

  if (BARE.includes(path)) return <>{children}</>;

  return (
    <div className="shell">
      <Sidebar />
      <div className="content">
        <div className="wrap">{children}</div>
      </div>
    </div>
  );
}
