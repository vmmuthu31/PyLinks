import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const RecurringPaymentsModule = buildModule("RecurringPaymentsModule", (m) => {
  const pyusdAddress = m.getParameter(
    "pyusdAddress",
    "0xCaC524BcA292aaade2DF8A05cC58F0a65B1B3bB9"
  ); // PYUSD Sepolia

  const recurringPayments = m.contract("RecurringPayments", [pyusdAddress]);

  return { recurringPayments };
});

export default RecurringPaymentsModule;
