// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, euint32, externalEuint32} from "@fhevm/solidity/lib/FHE.sol";
import {SepoliaConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/**
 * @title FHECaro
 * @notice Simple encrypted result logger for FHE-based Caro games.
 *         Each player records their match outcome privately using Fully Homomorphic Encryption (FHE).
 *         The contract never exposes plaintext win/loss data — all records stay encrypted.
 *
 * @dev Core idea:
 *      - Players encrypt a numeric code (e.g., 1 = win, 0 = lose, 2 = draw) off-chain.
 *      - The encrypted value is stored directly on-chain.
 *      - Only the original sender can later decrypt and verify their own results.
 */
contract FHECaro is SepoliaConfig {
    /// @dev Encrypted outcome history for each player.
    mapping(address => euint32[]) private _encryptedResults;

    /**
     * @notice Record an encrypted Caro game result.
     * @param encryptedResult The encrypted numeric result as `externalEuint32`.
     * @param proof Proof ensuring the encrypted data is valid.
     *
     * @dev The value is transformed into internal FHE format,
     *      stored under the sender’s address, and access-granted
     *      so only that player can decrypt it later.
     */
    function submitResult(externalEuint32 encryptedResult, bytes calldata proof) external {
        euint32 result = FHE.fromExternal(encryptedResult, proof);
        FHE.allowThis(result);

        _encryptedResults[msg.sender].push(result);

        FHE.allow(result, msg.sender);
    }

    /**
     * @notice Get the encrypted result history of a player.
     * @param player Address of the player.
     * @return A list of encrypted integers representing all their game outcomes.
     *
     * @dev Data is returned as ciphertext — decryption must be done off-chain
     *      using the player’s private FHE key.
     */
    function getResultHistory(address player) external view returns (euint32[] memory) {
        return _encryptedResults[player];
    }
}
