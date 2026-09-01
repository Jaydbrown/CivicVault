import { useCallback, useRef, useState } from "react";

import { formatTxError, notifyError, notifySuccess } from "./toast";

/**
 * One consistent lifecycle for every on-chain action in the app, so buttons,
 * status text and error handling feel the same everywhere.
 *
 *   idle → running → success | error
 *
 * `run()` executes the async action, surfaces a toast on both outcomes, exposes
 * a `phase` string for inline UI, and auto-resets `success`/`error` after a beat.
 */
export type TxPhase = "idle" | "running" | "success" | "error";

export type UseTxFlow = {
  phase: TxPhase;
  isRunning: boolean;
  error: string | null;
  txHash: string | null;
  /** Free-text step label the action can set via the 2nd arg to `run`. */
  step: string;
  run: (
    action: (setStep: (s: string) => void) => Promise<string | void>,
    opts?: { successMessage?: string; errorFallback?: string; onSuccess?: () => void },
  ) => Promise<boolean>;
  reset: () => void;
};

export function useTxFlow(): UseTxFlow {
  const [phase, setPhase] = useState<TxPhase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [step, setStep] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const reset = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    setPhase("idle");
    setError(null);
    setTxHash(null);
    setStep("");
  }, []);

  const run: UseTxFlow["run"] = useCallback(async (action, opts) => {
    if (timer.current) clearTimeout(timer.current);
    setPhase("running");
    setError(null);
    setTxHash(null);
    setStep("");
    try {
      const result = await action(setStep);
      if (typeof result === "string") setTxHash(result);
      setPhase("success");
      if (opts?.successMessage) notifySuccess(opts.successMessage);
      opts?.onSuccess?.();
      timer.current = setTimeout(() => setPhase("idle"), 2500);
      return true;
    } catch (err) {
      const message = formatTxError(err, opts?.errorFallback ?? "Something went wrong.");
      setError(message);
      setPhase("error");
      notifyError(message);
      timer.current = setTimeout(() => {
        setPhase("idle");
        setError(null);
      }, 6000);
      return false;
    } finally {
      setStep("");
    }
  }, []);

  return {
    phase,
    isRunning: phase === "running",
    error,
    txHash,
    step,
    run,
    reset,
  };
}
