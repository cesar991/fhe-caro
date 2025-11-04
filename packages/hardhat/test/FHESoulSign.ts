import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers, fhevm } from "hardhat";
import { expect } from "chai";
import { FHESoulSign, FHESoulSign__factory } from "../types";
import { FhevmType } from "@fhevm/hardhat-plugin";
import chaiAsPromised from "chai-as-promised";
import chai from "chai";

// enable chai-as-promised to get `.revertedWith` recognized by TS
chai.use(chaiAsPromised);
const { expect: chaiExpect } = chai;

type Users = {
  deployer: HardhatEthersSigner;
  john: HardhatEthersSigner;
  jane: HardhatEthersSigner;
};

async function setupContract(deployer: HardhatEthersSigner) {
  const factory = new FHESoulSign__factory(deployer);
  const instance = await factory.deploy();
  const address = await instance.getAddress();
  return { soulSign: instance, soulSignAddress: address };
}

describe("FHESoulSign Contract", function () {
  let users: Users;
  let soulSign: FHESoulSign;
  let soulSignAddress: string;

  before(async function () {
    const [deployer, john, jane] = await ethers.getSigners();
    users = { deployer, john, jane };
  });

  beforeEach(async function () {
    if (!fhevm.isMock) {
      console.warn("⚠️ Tests are intended to run only on FHE mock mode.");
      this.skip();
    }
    ({ soulSign, soulSignAddress } = await setupContract(users.deployer));
  });

  it("initially, no users should be registered", async function () {
    expect(await soulSign.isRegistered(users.john.address)).to.be.false;
    expect(await soulSign.isRegistered(users.jane.address)).to.be.false;
  });

  it("allows a user to register their encrypted birth and blocks duplicate registrations", async function () {
    const birthValue = 19990521;
    const enc = await fhevm.createEncryptedInput(soulSignAddress, users.john.address).add32(birthValue).encrypt();

    await (await soulSign.connect(users.john).registerBirth(enc.handles[0], enc.inputProof)).wait();

    expect(await soulSign.isRegistered(users.john.address)).to.be.true;

    const decrypted = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      await soulSign.getEncryptedBirth(users.john.address),
      soulSignAddress,
      users.john,
    );

    // decrypted is bigint -> cast to Number for expect
    expect(Number(decrypted)).to.equal(birthValue);

    const encAgain = await fhevm
      .createEncryptedInput(soulSignAddress, users.john.address)
      .add32(birthValue + 1)
      .encrypt();

    await chaiExpect(
      soulSign.connect(users.john).registerBirth(encAgain.handles[0], encAgain.inputProof),
    ).to.be.revertedWith("FHESoulSign: already registered");
  });

  it("permits users to register different encrypted birth values independently", async function () {
    const johnBirth = 19880215;
    const janeBirth = 20001010;

    const johnEnc = await fhevm.createEncryptedInput(soulSignAddress, users.john.address).add32(johnBirth).encrypt();
    const janeEnc = await fhevm.createEncryptedInput(soulSignAddress, users.jane.address).add32(janeBirth).encrypt();

    await (await soulSign.connect(users.john).registerBirth(johnEnc.handles[0], johnEnc.inputProof)).wait();
    await (await soulSign.connect(users.jane).registerBirth(janeEnc.handles[0], janeEnc.inputProof)).wait();

    const johnDec = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      await soulSign.getEncryptedBirth(users.john.address),
      soulSignAddress,
      users.john,
    );
    const janeDec = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      await soulSign.getEncryptedBirth(users.jane.address),
      soulSignAddress,
      users.jane,
    );

    expect(Number(johnDec)).to.equal(johnBirth);
    expect(Number(janeDec)).to.equal(janeBirth);
  });

  it("returns an empty encrypted value for users who haven't registered", async function () {
    const value = await soulSign.getEncryptedBirth(users.jane.address);
    expect(value).to.eq(ethers.ZeroHash);
  });

  it("prevents other users from decrypting someone else's encrypted birth", async function () {
    const birthValue = 19981224;
    const enc = await fhevm.createEncryptedInput(soulSignAddress, users.john.address).add32(birthValue).encrypt();

    await (await soulSign.connect(users.john).registerBirth(enc.handles[0], enc.inputProof)).wait();

    const encryptedStored = await soulSign.getEncryptedBirth(users.john.address);

    let wrongDecryption: bigint | null = null;
    try {
      wrongDecryption = await fhevm.userDecryptEuint(
        FhevmType.euint32,
        encryptedStored,
        soulSignAddress,
        users.jane,
      );
    } catch {
      wrongDecryption = null;
    }

    if (wrongDecryption !== null) {
      expect(Number(wrongDecryption)).to.not.equal(birthValue);
    } else {
      expect(wrongDecryption).to.be.null;
    }
  });

  it("handles multiple registrations independently without interference", async function () {
    const johnBirth = 19700101,
      janeBirth = 20121212;

    const johnEnc = await fhevm.createEncryptedInput(soulSignAddress, users.john.address).add32(johnBirth).encrypt();
    const janeEnc = await fhevm.createEncryptedInput(soulSignAddress, users.jane.address).add32(janeBirth).encrypt();

    await (await soulSign.connect(users.john).registerBirth(johnEnc.handles[0], johnEnc.inputProof)).wait();
    await (await soulSign.connect(users.jane).registerBirth(janeEnc.handles[0], janeEnc.inputProof)).wait();

    const johnDec = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      await soulSign.getEncryptedBirth(users.john.address),
      soulSignAddress,
      users.john,
    );
    const janeDec = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      await soulSign.getEncryptedBirth(users.jane.address),
      soulSignAddress,
      users.jane,
    );

    expect(Number(johnDec)).to.equal(johnBirth);
    expect(Number(janeDec)).to.equal(janeBirth);
  });

  it("accepts edge-case birth values (e.g. 0 or 99999999)", async function () {
    const johnBirth = 0;
    const janeBirth = 99999999;

    const johnEnc = await fhevm.createEncryptedInput(soulSignAddress, users.john.address).add32(johnBirth).encrypt();
    const janeEnc = await fhevm.createEncryptedInput(soulSignAddress, users.jane.address).add32(janeBirth).encrypt();

    await (await soulSign.connect(users.john).registerBirth(johnEnc.handles[0], johnEnc.inputProof)).wait();
    await (await soulSign.connect(users.jane).registerBirth(janeEnc.handles[0], janeEnc.inputProof)).wait();

    const johnDec = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      await soulSign.getEncryptedBirth(users.john.address),
      soulSignAddress,
      users.john,
    );
    const janeDec = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      await soulSign.getEncryptedBirth(users.jane.address),
      soulSignAddress,
      users.jane,
    );

    expect(Number(johnDec)).to.equal(johnBirth);
    expect(Number(janeDec)).to.equal(janeBirth);
  });
});
