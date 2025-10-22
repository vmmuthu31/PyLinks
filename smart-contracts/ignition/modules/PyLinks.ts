import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

/**
 * Master deployment module for all PyLinks contracts
 * Deploys: PaymentEscrow, RecurringPayments, PaymentSplitter
 */
const PyLinksModule = buildModule("PyLinksModule", (m) => {
  // Network addresses
  const pythAddress = m.getParameter(
    "pythAddress",
    "0xDd24F84d36BF92C65F92307595335bdFab5Bbd21"
  ); // Pyth Sepolia
  const pyusdAddress = m.getParameter(
    "pyusdAddress",
    "0xCaC524BcA292aaade2DF8A05cC58F0a65B1B3bB9"
  ); // PYUSD Sepolia

  // Deploy PaymentEscrow (with Pyth oracle for dynamic pricing + escrow protection)
  const paymentEscrow = m.contract(
    "PaymentEscrow",
    [pythAddress, pyusdAddress],
    {
      id: "PaymentEscrow",
    }
  );

  // Deploy RecurringPayments (with Pyth oracle for USD-based subscriptions)
  const recurringPayments = m.contract(
    "RecurringPayments",
    [pyusdAddress, pythAddress],
    {
      id: "RecurringPayments",
    }
  );

  // Deploy PaymentSplitter (no Pyth needed - just splits PYUSD amounts)
  const paymentSplitter = m.contract("PaymentSplitter", [pyusdAddress], {
    id: "PaymentSplitter",
  });

  return { paymentEscrow, recurringPayments, paymentSplitter };
});

export default PyLinksModule;
