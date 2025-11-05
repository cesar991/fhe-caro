import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers, fhevm } from "hardhat";
import { expect } from "chai";
import { FHECaro, FHECaro__factory } from "../types";
import { FhevmType } from "@fhevm/hardhat-plugin";

type Users = {
  admin: HardhatEthersSigner;
  gamer1: HardhatEthersSigner;
  gamer2: HardhatEthersSigner;
};

async function deployCaroContract() {
  const factory = (await ethers.getContractFactory("FHECaro")) as FHECaro__factory;
  const contract = (await factory.deploy()) as FHECaro;
  const address = await contract.getAddress();
  return { contract, address };
}

describe("🔒 FHECaro - Confidential Game Outcome Recording", function () {
  let users: Users;
  let caro: FHECaro;
  let caroAddr: string;

  before(async () => {
    const [admin, g1, g2] = await ethers.getSigners();
    users = { admin, gamer1: g1, gamer2: g2 };
  });

  beforeEach(async function () {
    if (!fhevm.isMock) {
      console.warn("⚠️ Local FHEVM mock required for these tests");
      this.skip();
    }
    ({ contract: caro, address: caroAddr } = await deployCaroContract());
  });

  it("should start with no game results for a new player", async () => {
    const history = await caro.getResultHistory(users.gamer1.address);
    expect(history.length).to.eq(0);
  });

  it("can log a single encrypted match outcome and decrypt it by owner", async () => {
    const enc = await fhevm
      .createEncryptedInput(caroAddr, users.gamer1.address)
      .add32(1) // 1 = win
      .encrypt();
    const tx = await caro.connect(users.gamer1).submitResult(enc.handles[0], enc.inputProof);
    await tx.wait();

    const stored = await caro.getResultHistory(users.gamer1.address);
    expect(stored.length).to.eq(1);

    const decrypted = await fhevm.userDecryptEuint(FhevmType.euint32, stored[0], caroAddr, users.gamer1);
    expect(decrypted).to.eq(1);
  });

  it("can log multiple match results in sequence", async () => {
    const results = [1, 0, 2]; // win, lose, draw
    for (const r of results) {
      const enc = await fhevm.createEncryptedInput(caroAddr, users.gamer1.address).add32(r).encrypt();
      await (await caro.connect(users.gamer1).submitResult(enc.handles[0], enc.inputProof)).wait();
      await ethers.provider.send("evm_mine", []);
    }

    const history = await caro.getResultHistory(users.gamer1.address);
    expect(history.length).to.eq(results.length);

    for (let i = 0; i < history.length; i++) {
      const val = await fhevm.userDecryptEuint(FhevmType.euint32, history[i], caroAddr, users.gamer1);
      expect(val).to.eq(results[i]);
    }
  });

  it("ensures privacy between different players", async () => {
    const enc1 = await fhevm.createEncryptedInput(caroAddr, users.gamer1.address).add32(1).encrypt();
    await caro.connect(users.gamer1).submitResult(enc1.handles[0], enc1.inputProof);

    const enc2 = await fhevm.createEncryptedInput(caroAddr, users.gamer2.address).add32(0).encrypt();
    await caro.connect(users.gamer2).submitResult(enc2.handles[0], enc2.inputProof);

    const hist1 = await caro.getResultHistory(users.gamer1.address);
    const hist2 = await caro.getResultHistory(users.gamer2.address);

    expect(hist1.length).to.eq(1);
    expect(hist2.length).to.eq(1);

    const val1 = await fhevm.userDecryptEuint(FhevmType.euint32, hist1[0], caroAddr, users.gamer1);
    const val2 = await fhevm.userDecryptEuint(FhevmType.euint32, hist2[0], caroAddr, users.gamer2);

    expect(val1).to.eq(1);
    expect(val2).to.eq(0);
  });

  it("handles repeated identical encrypted outcomes", async () => {
    const repeated = [2, 2]; // draw, draw
    for (const r of repeated) {
      const enc = await fhevm.createEncryptedInput(caroAddr, users.gamer1.address).add32(r).encrypt();
      await (await caro.connect(users.gamer1).submitResult(enc.handles[0], enc.inputProof)).wait();
    }

    const history = await caro.getResultHistory(users.gamer1.address);
    expect(history.length).to.eq(2);

    for (const h of history) {
      const val = await fhevm.userDecryptEuint(FhevmType.euint32, h, caroAddr, users.gamer1);
      expect(val).to.eq(2);
    }
  });

  it("supports maximum uint32 value as encrypted outcome", async () => {
    const maxVal = 2 ** 32 - 1;
    const enc = await fhevm.createEncryptedInput(caroAddr, users.gamer1.address).add32(maxVal).encrypt();
    await (await caro.connect(users.gamer1).submitResult(enc.handles[0], enc.inputProof)).wait();

    const history = await caro.getResultHistory(users.gamer1.address);
    const decrypted = await fhevm.userDecryptEuint(FhevmType.euint32, history[0], caroAddr, users.gamer1);
    expect(decrypted).to.eq(maxVal);
  });

  it("maintains correct order when logging many matches", async () => {
    const dataset = [0, 1, 2, 1, 0];
    for (const r of dataset) {
      const enc = await fhevm.createEncryptedInput(caroAddr, users.gamer1.address).add32(r).encrypt();
      await (await caro.connect(users.gamer1).submitResult(enc.handles[0], enc.inputProof)).wait();
    }

    const all = await caro.getResultHistory(users.gamer1.address);
    expect(all.length).to.eq(dataset.length);

    const first = await fhevm.userDecryptEuint(FhevmType.euint32, all[0], caroAddr, users.gamer1);
    const last = await fhevm.userDecryptEuint(FhevmType.euint32, all[all.length - 1], caroAddr, users.gamer1);

    expect(first).to.eq(dataset[0]);
    expect(last).to.eq(dataset[dataset.length - 1]);
  });

  it("allows rapid consecutive submissions without errors", async () => {
    const rapid = [1, 2, 0];
    for (const r of rapid) {
      const enc = await fhevm.createEncryptedInput(caroAddr, users.gamer1.address).add32(r).encrypt();
      await caro.connect(users.gamer1).submitResult(enc.handles[0], enc.inputProof);
    }

    const stored = await caro.getResultHistory(users.gamer1.address);
    expect(stored.length).to.eq(rapid.length);

    const last = await fhevm.userDecryptEuint(FhevmType.euint32, stored[stored.length - 1], caroAddr, users.gamer1);
    expect(last).to.eq(rapid[rapid.length - 1]);
  });
});
