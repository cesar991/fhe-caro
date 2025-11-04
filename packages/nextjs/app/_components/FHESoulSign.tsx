"use client";

import { useEffect, useMemo, useState } from "react";
import { useFhevm } from "@fhevm-sdk";
import { motion } from "framer-motion";
import { useAccount } from "wagmi";
import { RainbowKitCustomConnectButton } from "~~/components/helper/RainbowKitCustomConnectButton";
import { useFHESoulSign } from "~~/hooks/useFHESoulSign";
import { getLifePathMeaning, getZodiacSign, localFortunes } from "~~/utils/helper/index";


export const FHESoulSign = () => {
  const { isConnected, chain } = useAccount();
  const chainId = chain?.id;

  const provider = useMemo(() => (typeof window !== "undefined" ? (window as any).ethereum : undefined), []);

  const initialMockChains = {
    11155111: `https://eth-sepolia.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_API_KEY}`,
  };

  const { instance: fhevmInstance } = useFhevm({
    provider,
    chainId,
    initialMockChains,
    enabled: true,
  });

  const fheSoul = useFHESoulSign({ instance: fhevmInstance, initialMockChains });

  const [birthDate, setBirthDate] = useState("");
  const [astroData, setAstroData] = useState<any>(null);
  const [lifePath, setLifePath] = useState<number | null>(null);
  const [lifePathText, setLifePathText] = useState<string>("");
  const [isFetching, setIsFetching] = useState(false);

  // === Numerology Calculation ===
  const calculateLifePath = (dateString: string): number => {
    const digits = dateString.replace(/\D/g, "").split("").map(Number);
    let sum = digits.reduce((a, b) => a + b, 0);
    while (sum > 9 && sum !== 11 && sum !== 22 && sum !== 33) {
      sum = sum
        .toString()
        .split("")
        .reduce((a, b) => a + Number(b), 0);
    }
    return sum;
  };

  // === Local fortune ===
  const handleViewFortune = async (value='') => {
    const _birthDate = birthDate || value
    if (!_birthDate) return;
    setIsFetching(true);

    const zodiac = getZodiacSign(_birthDate);
    const lifePathNum = calculateLifePath(_birthDate);
    const lifeText = getLifePathMeaning(lifePathNum);
    const fortune = localFortunes[zodiac] || {
      mood: "Neutral",
      compatibility: "Unknown",
      description: "Stay open-minded.",
    };
    const luckyNumber = ((lifePathNum * 7) % 10) + 1;
    const luckyTime = ["Morning", "Afternoon", "Evening"][lifePathNum % 3];

    setLifePath(lifePathNum);
    setLifePathText(lifeText);
    setAstroData({ ...fortune, zodiac, lucky_number: luckyNumber, lucky_time: luckyTime });
    setIsFetching(false);
  };

  const handleRegister = async () => {
    if (!birthDate) return;
    const ymd = birthDate.replaceAll("-", "");
    const num = parseInt(ymd, 10);
    await fheSoul.registerBirth(num);
  };

  const handleDecrypt = async () => {
    await fheSoul.decrypt();
  };

  useEffect(() => {
    if (fheSoul.decryptedBirth) {
      const str = fheSoul.decryptedBirth.toString();
      const formatted = str.length === 8 ? `${str.slice(0, 4)}-${str.slice(4, 6)}-${str.slice(6, 8)}` : "";

      if (formatted) {
        setBirthDate(formatted);
        handleViewFortune(formatted);
      }
    }
  }, [fheSoul.decryptedBirth]);

  if (!isConnected) {
    return (
      <div
        className="w-full flex flex-col items-center justify-center text-center"
        style={{ height: "calc(100vh - 60px)" }}
      >
        <h2 className="text-2xl font-bold mb-4">🔮 Connect your wallet to view your destiny</h2>
        <RainbowKitCustomConnectButton />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6 text-gray-900">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">💫 FHE Soul Sign</h1>
        <p className="text-gray-600">
          Discover your zodiac, life path, and cosmic fate — then preserve it privately on-chain.
        </p>
      </div>

      {/* Input or Registered Info */}
      <div className="bg-[#f4f4f4] p-6 rounded-[10px] shadow-lg">
        <h3 className="text-xl font-bold text-gray-900 mb-4 border-b pb-2">🌙 Your Birth Record</h3>

        {fheSoul.hasRegistered ? (
          <p className="text-green-700 font-medium mb-4">✅ You’ve already registered your birth date on-chain.</p>
        ) : (
          <input
            type="date"
            value={birthDate}
            onChange={e => setBirthDate(e.target.value)}
            className="w-full border border-gray-300 rounded-md p-3 mb-4 focus:border-[#00C9A7] focus:ring focus:ring-cyan-400/30 focus:outline-none transition-colors"
          />
        )}

        <button
          onClick={fheSoul.hasRegistered ? handleDecrypt : handleViewFortune}
          disabled={isFetching || (!birthDate && !fheSoul.hasRegistered)}
          className="w-full px-6 py-3 rounded-md font-semibold shadow-md bg-[#00C9A7] text-white hover:brightness-110 disabled:opacity-50"
        >
          {fheSoul.hasRegistered
            ? fheSoul.isProcessing
              ? "🔓 Decrypting..."
              : "🔓 View My Fortune"
            : isFetching
              ? "🔮 Analyzing..."
              : "✨ View My Fortune"}
        </button>
      </div>

      {/* Result */}
      <div className="bg-[#f4f4f4] p-6 rounded-[10px] shadow-lg">
        <h3 className="text-xl font-bold text-gray-900 mb-4 border-b pb-2">🔐 My Cosmic Profile</h3>

        {astroData ? (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="space-y-4"
          >
            <div className="text-center">
              <h2 className="text-2xl font-bold text-[#00C9A7]">{astroData.zodiac}</h2>
              <p className="italic text-gray-500">
                Mood: {astroData.mood} • Compatibility: {astroData.compatibility}
              </p>
            </div>

            <p className="text-gray-700 leading-relaxed">{astroData.description}</p>

            <div className="flex justify-between text-sm mt-3">
              <span>Lucky Number: {astroData.lucky_number}</span>
              <span>Lucky Time: {astroData.lucky_time}</span>
            </div>

            <div className="bg-white border border-cyan-200 p-4 rounded-md mt-4">
              <p className="font-semibold text-cyan-700 mb-2">🌟 Life Path Meaning</p>
              <p className="text-gray-700 leading-relaxed">{lifePathText}</p>
            </div>

            {!fheSoul.hasRegistered && (
              <button
                onClick={handleRegister}
                disabled={fheSoul.isProcessing}
                className="w-full px-6 py-3 mt-6 rounded-md font-semibold shadow-md bg-gradient-to-r from-cyan-600 to-indigo-600 text-white hover:brightness-110 disabled:opacity-50"
              >
                {fheSoul.isProcessing ? "⏳ Registering on-chain..." : "🪶 Register My Soul Sign"}
              </button>
            )}
          </motion.div>
        ) : (
          <p className="text-gray-500 italic text-center">Enter your birth date above to reveal your fortune.</p>
        )}

        {fheSoul.message && (
          <motion.p className="text-sm text-gray-500 mt-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {fheSoul.message}
          </motion.p>
        )}
      </div>
    </div>
  );
};
