import { useCallback, useEffect, useState } from "react";
import { useWallets } from "@privy-io/react-auth";

import { ensureCircleWallet, tryGetCircleWallet, type CircleWalletInfo } from "./circleWallet";
import type { MemberSigner, PrivyEthereumWallet } from "./civicVaultContracts";

/**
 * Resolves how the current user signs member actions:
 *  - a linked external wallet (MetaMask, injected) → the viem path
 *  - otherwise → a Circle user-controlled wallet (gasless, passkey/PIN)
 *
 * `ensure()` is what a view calls right before a write — it provisions the
 * Circle wallet on first use (which pops the one-time passkey/PIN setup), so
 * nothing intrusive happens while the user is just browsing.
 */
export function useMemberSigner() {
  const { wallets } = useWallets();
  const external = wallets.find(
    (w) => w.type === "ethereum" && w.walletClientType !== "privy",
  );

  const [circle, setCircle] = useState<CircleWalletInfo | null>(null);

  useEffect(() => {
    if (external) {
      setCircle(null);
      return;
    }
    let live = true;
    tryGetCircleWallet().then((w) => {
      if (live) setCircle(w);
    });
    return () => {
      live = false;
    };
  }, [external?.address]);

  const ensure = useCallback(async (): Promise<MemberSigner> => {
    if (external) {
      return { kind: "external", wallet: external as unknown as PrivyEthereumWallet };
    }
    const w = circle ?? (await ensureCircleWallet());
    setCircle(w);
    return { kind: "circle", address: w.address };
  }, [external, circle]);

  return {
    ensure,
    isExternal: Boolean(external),
    circleWallet: circle,
    /** Best-effort address for reads/role-checks; may be undefined until provisioned. */
    address: external?.address ?? circle?.address,
  };
}
