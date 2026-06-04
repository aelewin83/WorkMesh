export type BrowserWalletResult = {
  connected: boolean;
  walletAddress?: string;
  chainId?: number;
  status: "connected" | "unavailable" | "wrong_network" | "rejected" | "failed";
  error?: string;
};

type EthereumProvider = {
  request(args: { method: string; params?: unknown[] | Record<string, unknown> }): Promise<unknown>;
};

declare global {
  interface Window {
    ethereum?: EthereumProvider;
  }
}

export async function connectBrowserWallet(): Promise<BrowserWalletResult> {
  if (typeof window === "undefined" || !window.ethereum) {
    return { connected: false, status: "unavailable" };
  }
  try {
    const accounts = await window.ethereum.request({ method: "eth_requestAccounts" }) as string[];
    const chainHex = await window.ethereum.request({ method: "eth_chainId" }) as string;
    const chainId = Number.parseInt(chainHex, 16);
    const targetChainId = Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? 84532);
    if (targetChainId && chainId !== targetChainId) {
      const switched = await switchOrAddNetwork(targetChainId);
      if (!switched) return { connected: true, walletAddress: accounts[0], chainId, status: "wrong_network" };
    }
    return { connected: true, walletAddress: accounts[0], chainId: targetChainId || chainId, status: "connected" };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Wallet request failed";
    return { connected: false, status: message.toLowerCase().includes("reject") ? "rejected" : "failed", error: message };
  }
}

async function switchOrAddNetwork(targetChainId: number) {
  if (!window.ethereum) return false;
  const chainHex = "0x" + targetChainId.toString(16);
  try {
    await window.ethereum.request({ method: "wallet_switchEthereumChain", params: [{ chainId: chainHex }] });
    return true;
  } catch {
    if (targetChainId !== 84532) return false;
    try {
      await window.ethereum.request({
        method: "wallet_addEthereumChain",
        params: [{
          chainId: chainHex,
          chainName: "Base Sepolia",
          nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
          rpcUrls: [process.env.NEXT_PUBLIC_RPC_URL || "https://sepolia.base.org"],
          blockExplorerUrls: ["https://sepolia.basescan.org"]
        }]
      });
      return true;
    } catch {
      return false;
    }
  }
}
