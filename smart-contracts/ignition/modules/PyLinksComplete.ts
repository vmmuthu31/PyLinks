import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

/**
 * Complete PyLinks deployment module
 * UNIFIED ARCHITECTURE:
 * 1. PyLinksCore - Main unified contract with ALL features integrated:
 *    - Regular payments (10min expiry, one-time use, 0.1% fees)
 *    - Escrow payments with Pyth dynamic pricing and dispute resolution
 *    - Subscription/recurring payments with Pyth USD pricing
 *    - Affiliate/referral system with tier-based rewards
 *    - Gamification (spin credits and loyalty points)
 *    - Payment splits and revenue sharing
 * 2. NFTReceipt - Separate contract for minting payment receipt NFTs
 */
const PyLinksCompleteModule = buildModule("PyLinksCompleteModule", (m) => {
  // Network addresses from .env
  const pythAddress = m.getParameter(
    "pythAddress",
    "0xDd24F84d36BF92C65F92307595335bdFab5Bbd21"
  ); // Pyth Sepolia

  const pyusdAddress = m.getParameter(
    "pyusdAddress",
    "0xCaC524BcA292aaade2DF8A05cC58F0a65B1B3bB9"
  ); // PYUSD Sepolia

  const treasuryAddress = m.getParameter(
    "treasuryAddress",
    "0x5b17c05bf59D82266e29C0Ca86aa1359F9cE801A" // Treasury wallet address
  );

  // 1. Deploy NFTReceipt first (no dependencies)
  const nftReceipt = m.contract("NFTReceipt", [], {
    id: "NFTReceipt",
  });

  // 2. Deploy PyLinksCore - The main unified contract
  const pyLinksCore = m.contract(
    "PyLinksCore",
    [pyusdAddress, pythAddress, treasuryAddress, nftReceipt],
    {
      id: "PyLinksCore",
    }
  );

  // 3. Post-deployment setup: Add PyLinksCore as authorized minter in NFTReceipt
  m.call(nftReceipt, "addAuthorizedMinter", [pyLinksCore], {
    id: "AuthorizePyLinksCoreNFT",
  });

  return {
    pyLinksCore,
    nftReceipt,
  };
});

export default PyLinksCompleteModule;
