import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());

  const Contract = await ethers.getContractFactory("SilverCoin");
  const contract = await Contract.deploy(1_000_000);
  console.log(contract.deployTransaction)

  await contract.deployed();
  
  console.log("Contract address: ", contract.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});