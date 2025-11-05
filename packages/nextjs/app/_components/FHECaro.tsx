"use client";

import { useMemo, useState } from "react";
import { useFhevm } from "@fhevm-sdk";
import { motion } from "framer-motion";
import { useAccount } from "wagmi";
import { RainbowKitCustomConnectButton } from "~~/components/helper/RainbowKitCustomConnectButton";
import { useFHECaro } from "~~/hooks/useFHECaro";

export const FHECaro = () => {
  const { isConnected, chain } = useAccount();
  const activeChain = chain?.id;

  const ethProvider = useMemo(() => (typeof window !== "undefined" ? (window as any).ethereum : undefined), []);

  const demoChains = {
    11155111: `https://eth-sepolia.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_API_KEY}`,
  };

  const { instance: caroVM } = useFhevm({
    provider: ethProvider,
    chainId: activeChain,
    initialMockChains: demoChains,
    enabled: true,
  });

  const caro = useFHECaro({
    instance: caroVM,
    initialMockChains: demoChains,
  });

  const [feedbackMsg, setFeedbackMsg] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const BOARD_SIZE = 10;
  const [board, setBoard] = useState<string[][]>(Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill("")));
  const [playerTurn, setPlayerTurn] = useState(true);
  const [winner, setWinner] = useState<string | null>(null);

  const checkWinner = (b: string[][]) => {
    const dirs = [
      [1, 0],
      [0, 1],
      [1, 1],
      [1, -1],
    ];
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        if (!b[r][c]) continue;
        for (const [dr, dc] of dirs) {
          let count = 1;
          for (let k = 1; k < 5; k++) {
            const nr = r + dr * k,
              nc = c + dc * k;
            if (nr < 0 || nc < 0 || nr >= BOARD_SIZE || nc >= BOARD_SIZE) break;
            if (b[nr][nc] === b[r][c]) count++;
            else break;
          }
          if (count >= 5) return b[r][c];
        }
      }
    }
    return b.flat().every(cell => cell) ? "draw" : null;
  };

  const handlePlayerMove = (r: number, c: number) => {
    if (!playerTurn || board[r][c] || winner) return;
    const newBoard = board.map(row => [...row]);
    newBoard[r][c] = "X";
    setBoard(newBoard);
    const result = checkWinner(newBoard);
    if (result) return handleGameEnd(result);

    setPlayerTurn(false);
    setTimeout(() => handleBotMove(newBoard), 400);
  };

  const handleBotMove = (b: string[][]) => {
    const empty: [number, number][] = [];
    for (let r = 0; r < BOARD_SIZE; r++) for (let c = 0; c < BOARD_SIZE; c++) if (!b[r][c]) empty.push([r, c]);

    if (empty.length === 0) return handleGameEnd("draw");
    const [r, c] = empty[Math.floor(Math.random() * empty.length)];
    const newBoard = b.map(row => [...row]);
    newBoard[r][c] = "O";
    setBoard(newBoard);
    const result = checkWinner(newBoard);
    if (result) return handleGameEnd(result);
    setPlayerTurn(true);
  };

  const handleGameEnd = async (result: string) => {
    setWinner(result);
    let resultCode = 2;
    if (result === "X") resultCode = 1;
    else if (result === "O") resultCode = 0;

    setFeedbackMsg("Encrypting & submitting result...");
    setIsSubmitting(true);
    try {
      await caro.submitResult(resultCode);
      setFeedbackMsg("✅ Submitted match result!");
      await caro.refreshResults?.();
    } catch (err) {
      console.error(err);
      setFeedbackMsg("❌ Failed to submit result");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDecrypt = async () => {
    if (caro.isDecryptingResults || (caro.resultData?.length ?? 0) === 0) return;
    await caro.decryptResults?.();
  };

  const resetGame = () => {
    setBoard(Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill("")));
    setWinner(null);
    setPlayerTurn(true);
    setFeedbackMsg("");
  };

  if (!isConnected) {
    return (
      <div className="h-[calc(100vh-100px)] w-full flex items-center justify-center text-yellow-100">
        <motion.div
          className="h-[380px] w-[540px] bg-yellow-900/20 border border-yellow-400 rounded-2xl p-12 text-center shadow-xl backdrop-blur-md"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
        >
          <div className="text-5xl mb-6 animate-pulse">❌⭕</div>
          <h2 className="text-3xl font-extrabold mb-3 tracking-wide text-yellow-300">Connect Wallet</h2>
          <p className="text-yellow-200 mb-6">Access the FHE Caro dApp</p>
          <RainbowKitCustomConnectButton />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-100px)] w-full text-yellow-100">
      <div className="max-w-[900px] mx-auto px-6 py-10">
        <header className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-extrabold text-yellow-400 drop-shadow-lg">🎯 FHE Caro</h1>
          <button
            onClick={resetGame}
            className="px-4 py-2 rounded-lg border border-yellow-500 text-yellow-300 hover:bg-yellow-400 hover:text-black transition"
          >
            🔄 New Game
          </button>
        </header>

        {/* === Play vs Bot === */}
        <section className="bg-gradient-to-b from-yellow-900/50 to-yellow-950/60 border border-yellow-700 rounded-2xl p-6 shadow-lg mb-8 backdrop-blur-md">
          <h2 className="text-xl font-semibold mb-4 text-yellow-300">⚔️ Play vs Bot</h2>

          <div
            className="grid gap-[2px] bg-yellow-800/40 mx-auto rounded-lg overflow-hidden"
            style={{ gridTemplateColumns: `repeat(${BOARD_SIZE}, 1fr)`, width: "fit-content" }}
          >
            {board.map((row, r) =>
              row.map((cell, c) => (
                <button
                  key={`${r}-${c}`}
                  onClick={() => handlePlayerMove(r, c)}
                  disabled={!!winner || !playerTurn || !!cell}
                  className={`w-8 h-8 sm:w-10 sm:h-10 bg-black/50 text-2xl font-bold flex items-center justify-center transition-all
                    ${cell === "X" ? "text-yellow-400" : cell === "O" ? "text-orange-400" : "hover:bg-yellow-800/60"}`}
                >
                  {cell}
                </button>
              )),
            )}
          </div>

          {winner && (
            <div className="mt-5 text-center text-lg font-bold text-yellow-200">
              {winner === "draw" ? "🤝 Draw!" : winner === "X" ? "🏆 You Win!" : "💀 You Lose!"}
            </div>
          )}

          <div className="mt-3 text-sm text-yellow-300">{feedbackMsg || caro.message}</div>
        </section>

        {/* === Decrypt & History === */}
        <section className="bg-gradient-to-b from-amber-900/60 to-yellow-950/50 border border-yellow-500 rounded-2xl p-6 shadow-lg backdrop-blur-md">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-yellow-300">🗂️ Match History</h3>
            <button
              onClick={handleDecrypt}
              disabled={caro.isDecryptingResults || (caro.resultData?.length ?? 0) === 0}
              className={`px-3 py-1.5 rounded-md border border-yellow-400 text-yellow-200 hover:bg-yellow-400 hover:text-black text-sm transition ${
                caro.isDecryptingResults || (caro.resultData?.length ?? 0) === 0 ? "opacity-60 cursor-not-allowed" : ""
              }`}
            >
              🔓 {caro.isDecryptingResults ? "Decrypting..." : "Decrypt"}
            </button>
          </div>

          <div className="overflow-y-auto rounded-lg border border-yellow-800 divide-y divide-yellow-800">
            <div className="text-sm text-yellow-300 bg-yellow-900/40 font-semibold px-3 py-2">Match Results</div>

            {(caro.resultData ?? []).map((item: string, idx: number) => {
              const decrypted = caro.decryptedResults?.[item];
              let view;

              if (decrypted === undefined) {
                view = (
                  <div className="flex items-center gap-2 text-yellow-500/70">
                    <span className="text-lg">🔒</span>
                    <span className="italic">Encrypted</span>
                  </div>
                );
              } else {
                const val = Number(decrypted);
                let resultLabel = "";
                let colorClass = "";
                let icon = "";

                if (val === 1) {
                  resultLabel = "Win";
                  colorClass = "text-green-400";
                  icon = "🏆";
                } else if (val === 0) {
                  resultLabel = "Lose";
                  colorClass = "text-red-400";
                  icon = "💀";
                } else if (val === 2) {
                  resultLabel = "Draw";
                  colorClass = "text-yellow-400";
                  icon = "🤝";
                }

                view = (
                  <div className={`font-semibold flex items-center gap-2 ${colorClass}`}>
                    <span>{icon}</span>
                    <span>{resultLabel}</span>
                  </div>
                );
              }

              return (
                <div
                  key={idx}
                  className="flex items-center justify-between px-3 py-2 text-sm hover:bg-yellow-900/40 transition-colors"
                >
                  <div className="text-yellow-500 font-mono">#{idx + 1}</div>
                  {view}
                </div>
              );
            })}

            {(!caro.resultData || caro.resultData.length === 0) && (
              <div className="text-yellow-600 italic text-center py-6 text-sm">No match data yet.</div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};
