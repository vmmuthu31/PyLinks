import hre from "hardhat";
import fs from "fs";
import path from "path";

async function main() {
  console.log("🚀 Starting PyLinks contract deployment...");
  
  // Get deployer account
  const [deployer] = await hre.ethers.getSigners();
  console.log("📝 Deploying with account:", deployer.address);
  console.log("💰 Account balance:", hre.ethers.formatEther(await deployer.provider.getBalance(deployer.address)), "ETH");

  // Network addresses
  const PYTH_ADDRESS = "0xDd24F84d36BF92C65F92307595335bdFab5Bbd21"; // Pyth Sepolia
  const PYUSD_ADDRESS = "0xCaC524BcA292aaade2DF8A05cC58F0a65B1B3bB9"; // PYUSD Sepolia
  const TREASURY_ADDRESS = deployer.address; // Use deployer as treasury

  const deployedContracts: { [key: string]: string } = {};

  try {
    // 1. Deploy AffiliateRegistry
    console.log("\n1️⃣ Deploying AffiliateRegistry...");
    const AffiliateRegistry = await ethers.getContractFactory("AffiliateRegistry");
    const affiliateRegistry = await AffiliateRegistry.deploy();
    await affiliateRegistry.deployed();
    deployedContracts.AffiliateRegistry = affiliateRegistry.address;
    console.log("✅ AffiliateRegistry deployed to:", affiliateRegistry.address);

    // 2. Deploy SpinAndWin
    console.log("\n2️⃣ Deploying SpinAndWin...");
    const SpinAndWin = await ethers.getContractFactory("SpinAndWin");
    const spinAndWin = await SpinAndWin.deploy(PYUSD_ADDRESS);
    await spinAndWin.deployed();
    deployedContracts.SpinAndWin = spinAndWin.address;
    console.log("✅ SpinAndWin deployed to:", spinAndWin.address);

    // 3. Deploy NFTReceipt
    console.log("\n3️⃣ Deploying NFTReceipt...");
    const NFTReceipt = await ethers.getContractFactory("NFTReceipt");
    const nftReceipt = await NFTReceipt.deploy();
    await nftReceipt.deployed();
    deployedContracts.NFTReceipt = nftReceipt.address;
    console.log("✅ NFTReceipt deployed to:", nftReceipt.address);

    // 4. Deploy PaymentProcessor
    console.log("\n4️⃣ Deploying PaymentProcessor...");
    const PaymentProcessor = await ethers.getContractFactory("PaymentProcessor");
    const paymentProcessor = await PaymentProcessor.deploy(
      PYUSD_ADDRESS,
      TREASURY_ADDRESS,
      affiliateRegistry.address,
      spinAndWin.address
    );
    await paymentProcessor.deployed();
    deployedContracts.PaymentProcessor = paymentProcessor.address;
    console.log("✅ PaymentProcessor deployed to:", paymentProcessor.address);

    // 5. Deploy SubscriptionManager
    console.log("\n5️⃣ Deploying SubscriptionManager...");
    const SubscriptionManager = await ethers.getContractFactory("SubscriptionManager");
    const subscriptionManager = await SubscriptionManager.deploy(
      PYUSD_ADDRESS,
      PYTH_ADDRESS,
      TREASURY_ADDRESS
    );
    await subscriptionManager.deployed();
    deployedContracts.SubscriptionManager = subscriptionManager.address;
    console.log("✅ SubscriptionManager deployed to:", subscriptionManager.address);

    // 6. Deploy PaymentEscrow
    console.log("\n6️⃣ Deploying PaymentEscrow...");
    const PaymentEscrow = await ethers.getContractFactory("PaymentEscrow");
    const paymentEscrow = await PaymentEscrow.deploy(PYTH_ADDRESS, PYUSD_ADDRESS);
    await paymentEscrow.deployed();
    deployedContracts.PaymentEscrow = paymentEscrow.address;
    console.log("✅ PaymentEscrow deployed to:", paymentEscrow.address);

    // Post-deployment setup
    console.log("\n🔧 Setting up contract integrations...");

    // Set PaymentProcessor in AffiliateRegistry
    console.log("Setting PaymentProcessor in AffiliateRegistry...");
    await affiliateRegistry.setPaymentProcessor(paymentProcessor.address);

    // Set PaymentProcessor in SpinAndWin
    console.log("Setting PaymentProcessor in SpinAndWin...");
    await spinAndWin.setPaymentProcessor(paymentProcessor.address);

    // Add authorized minters to NFTReceipt
    console.log("Adding authorized minters to NFTReceipt...");
    await nftReceipt.addAuthorizedMinter(paymentProcessor.address);
    await nftReceipt.addAuthorizedMinter(paymentEscrow.address);

    // Generate deployment info
    const deploymentInfo = {
      network: "sepolia",
      timestamp: new Date().toISOString(),
      deployer: deployer.address,
      contracts: deployedContracts,
      networkAddresses: {
        PYTH_ADDRESS,
        PYUSD_ADDRESS,
        TREASURY_ADDRESS
      }
    };

    // Save deployment info
    const deploymentPath = path.join(__dirname, "../deployments");
    if (!fs.existsSync(deploymentPath)) {
      fs.mkdirSync(deploymentPath, { recursive: true });
    }

    fs.writeFileSync(
      path.join(deploymentPath, "sepolia-deployment.json"),
      JSON.stringify(deploymentInfo, null, 2)
    );

    // Generate .env updates
    const envUpdates = `
# Updated Contract Addresses (deployed ${new Date().toISOString()})
PAYMENT_PROCESSOR_ADDRESS=${paymentProcessor.address}
AFFILIATE_REGISTRY_ADDRESS=${affiliateRegistry.address}
SPIN_AND_WIN_ADDRESS=${spinAndWin.address}
SUBSCRIPTION_MANAGER_ADDRESS=${subscriptionManager.address}
NFT_RECEIPT_ADDRESS=${nftReceipt.address}
PAYMENT_ESCROW_ADDRESS=${paymentEscrow.address}
TREASURY_ADDRESS=${TREASURY_ADDRESS}
`;

    fs.writeFileSync(path.join(__dirname, "../.env.deployed"), envUpdates);

    // Generate ABIs for frontend
    const abisPath = path.join(__dirname, "../abis");
    if (!fs.existsSync(abisPath)) {
      fs.mkdirSync(abisPath, { recursive: true });
    }

    // Save contract ABIs
    const contracts = [
      "PaymentProcessor",
      "AffiliateRegistry", 
      "SpinAndWin",
      "SubscriptionManager",
      "NFTReceipt",
      "PaymentEscrow"
    ];

    for (const contractName of contracts) {
      const artifact = await ethers.getContractFactory(contractName);
      const abi = artifact.interface.format(ethers.utils.FormatTypes.json);
      fs.writeFileSync(
        path.join(abisPath, `${contractName}.json`),
        JSON.stringify({ abi: JSON.parse(abi as string) }, null, 2)
      );
    }

    console.log("\n🎉 Deployment completed successfully!");
    console.log("\n📋 Contract Addresses:");
    Object.entries(deployedContracts).forEach(([name, address]) => {
      console.log(`${name}: ${address}`);
    });

    console.log("\n📁 Files generated:");
    console.log("- deployments/sepolia-deployment.json");
    console.log("- .env.deployed");
    console.log("- abis/*.json");

    console.log("\n🔗 Next steps:");
    console.log("1. Update your .env file with the new contract addresses");
    console.log("2. Update your backend and frontend with the new ABIs");
    console.log("3. Test the contracts on Sepolia testnet");

  } catch (error) {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
