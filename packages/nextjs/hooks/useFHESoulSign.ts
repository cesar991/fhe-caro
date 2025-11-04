"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useDeployedContractInfo } from "./helper";
import { useWagmiEthers } from "./wagmi/useWagmiEthers";
import {
  FhevmInstance,
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

export const useFHESoulSign = ({
  instance,
  initialMockChains,
}: {
  instance: FhevmInstance | undefined;
  initialMockChains?: Readonly<Record<number, string>>;
}) => {
  const { storage: fhevmDecryptionSignatureStorage } = useInMemoryStorage();
  const { chainId, accounts, isConnected, ethersReadonlyProvider, ethersSigner } = useWagmiEthers(initialMockChains);

  const allowedChainId = typeof chainId === "number" ? (chainId as AllowedChainIds) : undefined;
  const { data: fheSoulSign } = useDeployedContractInfo({
    contractName: "FHESoulSign",
    chainId: allowedChainId,
  });

  type FHESoulSignInfo = Contract<"FHESoulSign"> & { chainId?: number };

  const [message, setMessage] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const hasContract = Boolean(fheSoulSign?.address && fheSoulSign?.abi);
  const hasSigner = Boolean(ethersSigner);
  const hasProvider = Boolean(ethersReadonlyProvider);

  const getContract = (mode: "read" | "write") => {
    if (!hasContract) return undefined;
    const providerOrSigner = mode === "read" ? ethersReadonlyProvider : ethersSigner;
    if (!providerOrSigner) return undefined;
    return new ethers.Contract(fheSoulSign!.address, (fheSoulSign as FHESoulSignInfo).abi, providerOrSigner);
  };

  // === Read user's encrypted birth ===
  const { data: myEncryptedBirth, refetch: refreshBirthHandle } = useReadContract({
    address: hasContract ? (fheSoulSign!.address as `0x${string}`) : undefined,
    abi: hasContract ? ((fheSoulSign as FHESoulSignInfo).abi as any) : undefined,
    functionName: "getEncryptedBirth",
    args: [accounts?.[0] ?? ""],
    query: {
      enabled: !!(hasContract && hasProvider),
      refetchOnWindowFocus: false,
    },
  });

  const birthHandle = useMemo(() => myEncryptedBirth as string | undefined, [myEncryptedBirth]);

  const hasRegistered = useMemo(() => {
    return Boolean(birthHandle && birthHandle !== ethers.ZeroHash && birthHandle !== "0x" && birthHandle !== "0x0");
  }, [birthHandle]);

  const requests = useMemo(() => {
    if (!hasContract || !birthHandle) return undefined;
    return [
      {
        handle: birthHandle,
        contractAddress: fheSoulSign!.address,
      },
    ] as const;
  }, [hasContract, fheSoulSign?.address, birthHandle]);

  const {
    decrypt,
    canDecrypt,
    isDecrypting,
    results,
    message: decMsg,
  } = useFHEDecrypt({
    instance,
    ethersSigner: ethersSigner as any,
    fhevmDecryptionSignatureStorage,
    chainId,
    requests,
  });

  const [decryptedBirth, setDecryptedBirth] = useState<number>(0);

  useEffect(() => {
    if (!results || Object.keys(results).length === 0) return;
    const handle = Object.keys(results)[0];
    const decryptedBigInt = results[handle];
    if (typeof decryptedBigInt === "bigint") {
      setDecryptedBirth(Number(decryptedBigInt));
    }
  }, [results]);

  useEffect(() => {
    if (decMsg) setMessage(decMsg);
  }, [decMsg]);

  const { encryptWith } = useFHEEncryption({
    instance,
    ethersSigner: ethersSigner as any,
    contractAddress: fheSoulSign?.address,
  });

  const getEncryptionMethodFor = (functionName: "registerBirth") => {
    const functionAbi = fheSoulSign?.abi.find(item => item.type === "function" && item.name === functionName);
    if (!functionAbi) {
      return {
        method: undefined as string | undefined,
        error: `Function ABI not found for ${functionName}`,
      };
    }
    if (!functionAbi.inputs || functionAbi.inputs.length === 0) {
      return {
        method: undefined as string | undefined,
        error: `No inputs found for ${functionName}`,
      };
    }
    const firstInput = functionAbi.inputs[0]!;
    return { method: getEncryptionMethod(firstInput.internalType), error: undefined };
  };

  const registerBirth = useCallback(
    async (birthNumber: number) => {
      if (birthNumber <= 0 || isProcessing) return;
      setIsProcessing(true);
      setMessage(`Registering birth date: ${birthNumber}...`);
      try {
        const { method, error } = getEncryptionMethodFor("registerBirth");
        if (!method) return setMessage(error ?? "Encryption method not found");

        setMessage(`Encrypting with ${method}...`);
        const enc = await encryptWith(builder => (builder as any)[method](birthNumber));
        if (!enc) return setMessage("Encryption failed");

        const writeContract = getContract("write");
        if (!writeContract) return setMessage("Contract not available");

        const params = buildParamsFromAbi(enc, [...fheSoulSign!.abi] as any[], "registerBirth");

        setMessage("Waiting for transaction...");
        const tx = await writeContract.registerBirth(...params, { gasLimit: 400_000 });
        await tx.wait();
        await refreshBirthHandle();
        setMessage("✅ Birth date registered successfully!");
      } catch (err) {
        setMessage(`❌ ${err instanceof Error ? err.message : String(err)}`);
      } finally {
        setIsProcessing(false);
      }
    },
    [encryptWith, getContract, fheSoulSign?.abi, isProcessing],
  );

  return {
    registerBirth,
    decrypt,
    hasRegistered,
    canDecrypt,
    isDecrypting,
    message,
    isProcessing,
    decryptedBirth,
    birthHandle,
    hasContract,
    hasSigner,
    chainId,
    accounts,
    isConnected,
  };
};
