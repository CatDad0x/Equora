"use client";

import { useState } from "react";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { usePrivy } from "@privy-io/react-auth";
import { PRIVY_APP_ID } from "@/lib/config";
import { short } from "@/lib/format";

export function ConnectButton() {
  return PRIVY_APP_ID ? <PrivyConnect /> : <WagmiConnect />;
}

function PrivyConnect() {
  const { ready, authenticated, login, logout } = usePrivy();
  const { address } = useAccount();
  if (!ready) return <button className="btn small" disabled>Loading</button>;
  if (!authenticated) return <button className="btn small" onClick={login}>Sign in</button>;
  return (
    <button className="btn small secondary" onClick={logout} title="Sign out">
      {address ? short(address) : "Signed in"}
    </button>
  );
}

const LABELS: Record<string, string> = {
  injected: "Browser wallet",
  coinbaseWalletSDK: "Coinbase Smart Wallet (passkey)",
  mock: "Local test account",
};

function WagmiConnect() {
  const { address, isConnected } = useAccount();
  const { connectors, connect, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const [open, setOpen] = useState(false);

  if (isConnected)
    return (
      <button className="btn small secondary" onClick={() => disconnect()} title="Disconnect">
        {short(address)}
      </button>
    );

  return (
    <div style={{ position: "relative" }}>
      <button className="btn small" onClick={() => setOpen((o) => !o)} aria-expanded={open} disabled={isPending}>
        {isPending ? "Connecting" : "Connect"}
      </button>
      {open && (
        <div
          className="panel"
          role="menu"
          style={{ position: "absolute", right: 0, top: "calc(100% + 8px)", minWidth: 260, zIndex: 20, display: "grid", gap: 8 }}
        >
          {connectors.map((c) => (
            <button
              key={c.uid}
              className="btn secondary"
              role="menuitem"
              onClick={() => {
                connect({ connector: c });
                setOpen(false);
              }}
            >
              {LABELS[c.id] ?? c.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
