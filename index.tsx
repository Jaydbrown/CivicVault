
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { PrivyProvider } from "@privy-io/react-auth";
import { APP_CHAIN } from "./utils/contract";
import 'react-toastify/dist/ReactToastify.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const privyAppId = (import.meta.env.VITE_PRIVY_APP_ID ?? "").trim();

const root = ReactDOM.createRoot(rootElement);
if (!privyAppId) {
  root.render(
    <React.StrictMode>
      <div style={{ padding: 24, fontFamily: "system-ui, sans-serif", maxWidth: 600 }}>
        <h2>Setup required</h2>
        <p>Add your <strong>Privy App ID</strong> to <code>.env</code>, then restart the dev server:</p>
        <ol>
          <li>Go to <a href="https://dashboard.privy.io" target="_blank" rel="noreferrer">dashboard.privy.io</a> → create an app</li>
          <li>Copy the <strong>App ID</strong></li>
          <li>Paste it into <code>.env</code>: <code>VITE_PRIVY_APP_ID=your-app-id</code></li>
          <li>In Privy dashboard → Settings → Embedded Wallets → enable "Create on login"</li>
          <li>In Privy dashboard → Settings → Login Methods → enable Email + Wallet</li>
        </ol>
      </div>
    </React.StrictMode>
  );
} else {
  root.render(
    <React.StrictMode>
      <PrivyProvider
        appId={privyAppId}
        config={{
          embeddedWallets: {
            ethereum: { createOnLogin: "users-without-wallets" },
          },
          appearance: {
            walletChainType: "ethereum-only",
            theme: "light",
          },
          supportedChains: [APP_CHAIN],
          loginMethods: ["email", "wallet", "google"],
        }}
      >
        <App />
      </PrivyProvider>
    </React.StrictMode>
  );
}
