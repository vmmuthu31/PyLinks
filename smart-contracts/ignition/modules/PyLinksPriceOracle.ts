import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const PyLinksPriceOracleModule = buildModule(
  "PyLinksPriceOracleModule",
  (m) => {
    // Pyth contract addresses by chain
    // Sepolia: 0xDd24F84d36BF92C65F92307595335bdFab5Bbd21
    // Base Sepolia: 0xA2aa501b19aff244D90cc15a4Cf739D2725B5729
    // OP Sepolia: 0x0708325268dF9F66270F1401206434524814508b

    const pythAddress = m.getParameter(
      "pythAddress",
      "0xDd24F84d36BF92C65F92307595335bdFab5Bbd21"
    ); // Sepolia default
    const pyusdAddress = m.getParameter(
      "pyusdAddress",
      "0xCaC524BcA292aaade2DF8A05cC58F0a65B1B3bB9"
    ); // PYUSD Sepolia

    const priceOracle = m.contract("PyLinksPriceOracle", [
      pythAddress,
      pyusdAddress,
    ]);

    return { priceOracle };
  }
);

export default PyLinksPriceOracleModule;
