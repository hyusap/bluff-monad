// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

/**
 * ERC-8004: Agent Identity Registry
 *
 * Minimal on-chain agent identity based on ERC-721.
 * Each agent gets a unique agentId NFT that resolves to a metadata URI
 * (JSON file describing the agent: name, description, services, etc.).
 *
 * Agents registered here can be linked to PokerVault tournament entries,
 * enabling persistent reputation across tournaments.
 */
contract AgentIdentityRegistry is ERC721 {
    uint256 public nextAgentId = 1;

    // agentId => metadata URI (resolves to ERC-8004 registration file JSON)
    mapping(uint256 => string) private _agentURIs;

    // agentId => optional separate payment wallet (falls back to NFT owner)
    mapping(uint256 => address) private _agentWallets;

    event Registered(uint256 indexed agentId, string agentURI, address indexed owner);
    event URIUpdated(uint256 indexed agentId, string newURI, address indexed updatedBy);
    event WalletSet(uint256 indexed agentId, address indexed newWallet);

    constructor() ERC721("ERC-8004 Agent Identity", "AGENT") {}

    /**
     * Register a new agent identity. Mints an NFT to the caller.
     * @param agentURI URI resolving to a JSON metadata file describing the agent.
     * @return agentId The minted agent token ID.
     */
    function register(string calldata agentURI) external returns (uint256 agentId) {
        agentId = nextAgentId++;
        _mint(msg.sender, agentId);
        _agentURIs[agentId] = agentURI;
        emit Registered(agentId, agentURI, msg.sender);
    }

    /**
     * Update an agent's metadata URI. Only the NFT owner or approved operator.
     */
    function setAgentURI(uint256 agentId, string calldata newURI) external {
        require(_isAuthorized(ownerOf(agentId), msg.sender, agentId), "Not authorized");
        _agentURIs[agentId] = newURI;
        emit URIUpdated(agentId, newURI, msg.sender);
    }

    /**
     * Set an optional separate payment wallet for an agent.
     * Useful if the NFT owner wants payouts sent to a hot wallet.
     */
    function setAgentWallet(uint256 agentId, address newWallet) external {
        require(_isAuthorized(ownerOf(agentId), msg.sender, agentId), "Not authorized");
        _agentWallets[agentId] = newWallet;
        emit WalletSet(agentId, newWallet);
    }

    /**
     * Get the payment wallet for an agent (falls back to NFT owner if not set).
     */
    function getAgentWallet(uint256 agentId) external view returns (address) {
        address wallet = _agentWallets[agentId];
        return wallet != address(0) ? wallet : ownerOf(agentId);
    }

    /**
     * Returns the metadata URI for an agent.
     */
    function tokenURI(uint256 agentId) public view override returns (string memory) {
        return _agentURIs[agentId];
    }

    /**
     * Check whether an agentId has been registered.
     */
    function exists(uint256 agentId) external view returns (bool) {
        return agentId > 0 && agentId < nextAgentId;
    }
}
