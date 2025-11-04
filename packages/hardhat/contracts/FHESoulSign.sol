// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, euint32, externalEuint32} from "@fhevm/solidity/lib/FHE.sol";
import {SepoliaConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/**
 * @title FHESoulSign
 * @notice A decentralized encrypted registry where each user can record their encrypted birth date.
 *         All data is stored privately using Fully Homomorphic Encryption (FHE).
 */
contract FHESoulSign is SepoliaConfig {
    /// @notice Stores each user's encrypted birth date.
    mapping(address => euint32) private _encryptedBirth;

    /// @notice Tracks whether a user has already registered their birth date.
    mapping(address => bool) private _isRegistered;

    /**
     * @notice Submits the user's encrypted birth date.
     * @param birthEncrypted The encrypted birth date (FHE-encrypted uint32).
     * @param proof Zero-knowledge proof corresponding to the encrypted value.
     * @dev
     * - Each user can register only once.
     * - Grants decryption rights to both the user and the contract.
     */
    function registerBirth(externalEuint32 birthEncrypted, bytes calldata proof) external {
        require(!_isRegistered[msg.sender], "FHESoulSign: already registered");

        euint32 birthValue = FHE.fromExternal(birthEncrypted, proof);
        _encryptedBirth[msg.sender] = birthValue;

        // Allow both the user and this contract to decrypt if needed
        FHE.allow(birthValue, msg.sender);
        FHE.allowThis(birthValue);

        _isRegistered[msg.sender] = true;
    }

    /**
     * @notice Checks if a user has already registered their birth date.
     * @param user The address to check.
     * @return True if the user has already registered.
     */
    function isRegistered(address user) external view returns (bool) {
        return _isRegistered[user];
    }

    /**
     * @notice Retrieves the encrypted birth date for a given user.
     * @param user Address of the user whose encrypted birth date is requested.
     * @return The encrypted birth date (`euint32`).
     * @dev Only the user or this contract can decrypt the value.
     */
    function getEncryptedBirth(address user) external view returns (euint32) {
        return _encryptedBirth[user];
    }
}
