"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useDeployedContractInfo } from "./helper";
import { useWagmiEthers } from "./wagmi/useWagmiEthers";
import { FhevmInstance } from "@fhevm-sdk";
import {
  buildParamsFromAbi,
  getEncryptionMethod,
  useFHEDecrypt,
  useFHEEncryption,
  useInMemoryStorage,
} from "@fhevm-sdk";
import { ethers } from "ethers";
import { useReadContract } from "wagmi";
import type { Contract } from "~~/utils/helper/contract";
import type { AllowedChainIds } from "~~/utils/helper/networks";

/**
 * @hook useFHECaro
 * @notice React hook to interact with the FHECaro smart contract.
 *         Supports encryption, on-chain submission, and off-chain decryption
 *         of private Caro match results (win / lose / draw).
 *
 * @dev Works with Zama FHEVM via fhevm-sdk.
 *      - Data is stored encrypted (euint32).
 *      - Only the submitting player can decrypt their own results.
 */
export const useFHECaro = (args: {
  instance: FhevmInstance | undefined;
  initialMockChains?: Readonly<Record<number, string>>;
}) => {
  const { instance, initialMockChains } = args;
  const { storage: decSigStore } = useInMemoryStorage();
  const { chainId, accounts, isConnected, ethersReadonlyProvider, ethersSigner } = useWagmiEthers(initialMockChains);

  const activeChain = typeof chainId === "number" ? (chainId as AllowedChainIds) : undefined;
  const { data: caroContract } = useDeployedContractInfo({
    contractName: "FHECaro",
    chainId: activeChain,
  });

  type CaroContractInfo = Contract<"FHECaro"> & { chainId?: number };

  const [statusMsg, setStatusMsg] = useState("");
  const [isBusy, setIsBusy] = useState(false);

  const hasContract = Boolean(caroContract?.address && caroContract?.abi);
  const hasSigner = Boolean(ethersSigner);
  const hasProvider = Boolean(ethersReadonlyProvider);

  const getCaroContract = (mode: "read" | "write") => {
    if (!hasContract) return undefined;
    const provOrSigner = mode === "read" ? ethersReadonlyProvider : ethersSigner;
    if (!provOrSigner) return undefined;
    return new ethers.Contract(caroContract!.address, (caroContract as CaroContractInfo).abi, provOrSigner);
  };

  // Fetch encrypted result history
  const { data: resultData, refetch: refreshResults } = useReadContract({
    address: hasContract ? (caroContract!.address as `0x${string}`) : undefined,
    abi: hasContract ? ((caroContract as CaroContractInfo).abi as any) : undefined,
    functionName: "getResultHistory",
    args: [accounts ? accounts[0] : ""],
    query: { enabled: Boolean(hasContract && hasProvider), refetchOnWindowFocus: false },
  });

  // Prepare decrypt requests
  const decryptRequests = useMemo(() => {
    if (!resultData || !Array.isArray(resultData)) return undefined;
    return resultData.map(item => ({
      handle: item,
      contractAddress: caroContract!.address,
    }));
  }, [resultData, caroContract?.address]);

  // FHE decrypt hook
  const {
    canDecrypt: canDecryptResults,
    decrypt: decryptResults,
    isDecrypting: isDecryptingResults,
    message: decryptMsg,
    results: decryptedResults,
  } = useFHEDecrypt({
    instance,
    ethersSigner: ethersSigner as any,
    fhevmDecryptionSignatureStorage: decSigStore,
    chainId,
    requests: decryptRequests,
  });

  useEffect(() => {
    if (decryptMsg) setStatusMsg(decryptMsg);
  }, [decryptMsg]);

  // FHE encryption hook
  const { encryptWith } = useFHEEncryption({
    instance,
    ethersSigner: ethersSigner as any,
    contractAddress: caroContract?.address,
  });

  const canSubmit = useMemo(
    () => Boolean(hasContract && instance && hasSigner && !isBusy),
    [hasContract, instance, hasSigner, isBusy],
  );

  const getEncryptionMethodFor = (fnName: "submitResult") => {
    const fnAbi = caroContract?.abi.find(item => item.type === "function" && item.name === fnName);
    if (!fnAbi) return { method: undefined as string | undefined, error: `No ABI for ${fnName}` };
    if (!fnAbi.inputs || fnAbi.inputs.length === 0)
      return { method: undefined as string | undefined, error: `No inputs for ${fnName}` };
    return { method: getEncryptionMethod(fnAbi.inputs[0].internalType), error: undefined };
  };

  // Submit encrypted result (1=win, 0=lose, 2=draw)
  const submitResult = useCallback(
    async (resultCode: number) => {
      if (isBusy || !canSubmit) return;
      setIsBusy(true);
      setStatusMsg(`Submitting encrypted result (${resultCode})...`);
      try {
        const { method, error } = getEncryptionMethodFor("submitResult");
        if (!method) return setStatusMsg(error ?? "Encryption method missing");
        setStatusMsg(`Encrypting result with ${method}...`);
        const encData = await encryptWith(builder => {
          (builder as any)[method](resultCode);
        });
        if (!encData) return setStatusMsg("Encryption failed");
        const contractWrite = getCaroContract("write");
        if (!contractWrite) return setStatusMsg("Contract unavailable or signer missing");
        const params = buildParamsFromAbi(encData, [...caroContract!.abi] as any[], "submitResult");
        const tx = await contractWrite.submitResult(...params, { gasLimit: 300_000 });
        setStatusMsg("Waiting for transaction confirmation...");
        await tx.wait();
        setStatusMsg(`Result (${resultCode}) submitted!`);
        await refreshResults();
      } catch (e) {
        setStatusMsg(`submitResult() failed: ${e instanceof Error ? e.message : String(e)}`);
      } finally {
        setIsBusy(false);
      }
    },
    [isBusy, canSubmit, encryptWith, getCaroContract, refreshResults, caroContract?.abi],
  );

  useEffect(() => {
    setStatusMsg("");
  }, [accounts, chainId]);

  return {
    contractAddress: caroContract?.address,
    canDecryptResults,
    decryptResults,
    isDecryptingResults,
    decryptedResults,
    resultData,
    refreshResults,
    submitResult,
    isProcessing: isBusy,
    canSubmit,
    chainId,
    accounts,
    isConnected,
    ethersSigner,
    message: statusMsg,
  };
};
