import { defineChain, type Address } from "viem";

const DEFAULT_CHAIN_ID = 5042002;
const DEFAULT_CHAIN_NAME = "Arc Testnet";
const DEFAULT_RPC_URL = "https://rpc.testnet.arc.network";
const DEFAULT_EXPLORER_URL = "https://testnet.arcscan.app";
const DEFAULT_FACTORY_ADDRESS = "0x5a9D34264Da36cd05B66Fab80e6e5D6feDC9fDBC";
const DEFAULT_VIEW_ADDRESS   = "0x5000F14A757d4488297772b694f18EaF0eC45C81";
// Arc Testnet: ERC-20 interface for the native USDC gas token (6 decimals)
const DEFAULT_USDC_ADDRESS = "0x3600000000000000000000000000000000000000";

function parseChainId(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export const APP_CHAIN_ID = parseChainId(import.meta.env.VITE_CHAIN_ID as string | undefined, DEFAULT_CHAIN_ID);
export const APP_CHAIN_NAME = (import.meta.env.VITE_CHAIN_NAME as string | undefined)?.trim() || DEFAULT_CHAIN_NAME;
export const APP_RPC_URL = (import.meta.env.VITE_RPC_URL as string | undefined)?.trim() || DEFAULT_RPC_URL;
export const APP_EXPLORER_URL =
  (import.meta.env.VITE_EXPLORER_URL as string | undefined)?.trim() || DEFAULT_EXPLORER_URL;

export const FACTORY_ADDRESS = ((import.meta.env.VITE_FACTORY_ADDRESS as string | undefined)?.trim() ||
  DEFAULT_FACTORY_ADDRESS) as Address;
export const VIEW_ADDRESS = ((import.meta.env.VITE_VIEW_ADDRESS as string | undefined)?.trim() ||
  DEFAULT_VIEW_ADDRESS) as Address;
export const USDC_ADDRESS = ((import.meta.env.VITE_USDC_ADDRESS as string | undefined)?.trim() ||
  DEFAULT_USDC_ADDRESS) as Address;

export const APP_CHAIN = defineChain({
  id: APP_CHAIN_ID,
  name: APP_CHAIN_NAME,
  nativeCurrency: {
    // Arc uses USDC as native gas; EVM precision is 18 decimals
    name: "USD Coin",
    symbol: "USDC",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: [APP_RPC_URL],
    },
    public: {
      http: [APP_RPC_URL],
    },
  },
  blockExplorers: {
    default: {
      name: "Arc Scan",
      url: APP_EXPLORER_URL,
    },
  },
  contracts: {
    multicall3: {
      address: "0xcA11bde05977b3631167028862bE2a173976CA11",
    },
  },
  testnet: true,
});

// CivicVaultFactory ABI from current deployed contract interface (used app-wide).
export const FACTORY_ABI = [
  {
    type: "function",
    name: "createDAO",
    stateMutability: "nonpayable",
    inputs: [
      { name: "name", type: "string" },
      { name: "description", type: "string" },
      { name: "location", type: "string" },
      { name: "coordinates", type: "string" },
      { name: "postalCode", type: "string" },
      { name: "maxMembership", type: "uint256" },
      { name: "usdcAddress", type: "address" },
    ],
    outputs: [{ name: "daoAddress", type: "address" }],
  },
  {
    type: "function",
    name: "getActiveDAOs",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address[]" }],
  },
  {
    type: "function",
    name: "getAllDAOs",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address[]" }],
  },
  {
    type: "function",
    name: "daoInfo",
    stateMutability: "view",
    inputs: [{ name: "daoAddress", type: "address" }],
    outputs: [
      { name: "name", type: "string" },
      { name: "location", type: "string" },
      { name: "creator", type: "address" },
      { name: "createdAt", type: "uint256" },
      { name: "isActive", type: "bool" },
    ],
  },
  {
    type: "function",
    name: "getDAOMetadata",
    stateMutability: "view",
    inputs: [{ name: "daoAddress", type: "address" }],
    outputs: [
      { name: "name", type: "string" },
      { name: "location", type: "string" },
      { name: "creator", type: "address" },
      { name: "createdAt", type: "uint256" },
      { name: "isActive", type: "bool" },
    ],
  },
  {
    type: "function",
    name: "isValidDAO",
    stateMutability: "view",
    inputs: [{ name: "daoAddress", type: "address" }],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "isDAO",
    stateMutability: "view",
    inputs: [{ name: "", type: "address" }],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "totalDAOCount",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "deactivateDAO",
    stateMutability: "nonpayable",
    inputs: [{ name: "daoAddress", type: "address" }],
    outputs: [],
  },
  {
    type: "function",
    name: "reactivateDAO",
    stateMutability: "nonpayable",
    inputs: [{ name: "daoAddress", type: "address" }],
    outputs: [],
  },
  {
    type: "event",
    name: "DAOCreated",
    inputs: [
      { indexed: true, name: "daoAddress", type: "address" },
      { indexed: false, name: "name", type: "string" },
      { indexed: false, name: "location", type: "string" },
      { indexed: true, name: "creator", type: "address" },
      { indexed: false, name: "timestamp", type: "uint256" },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "DAODeactivated",
    inputs: [
      { indexed: true, name: "daoAddress", type: "address" },
      { indexed: false, name: "timestamp", type: "uint256" },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "DAOReactivated",
    inputs: [
      { indexed: true, name: "daoAddress", type: "address" },
      { indexed: false, name: "timestamp", type: "uint256" },
    ],
    anonymous: false,
  },
] as const;
