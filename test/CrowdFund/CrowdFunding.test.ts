import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { ethers } from "hardhat";

describe.only("CrowdFund contract", () => {
  async function deployFixture() {
    const Contract = await ethers.getContractFactory("CrowdFunding");
    const [owner, acc1, acc2] = await ethers.getSigners();

    const contract = await Contract.deploy();
    await contract.deployed();

    return { contract, owner, acc1, acc2 };
  }
  
  let campaignStart: number;
  let campaignEnd: number;
  
  beforeEach(() => {
    campaignStart = Math.floor(new Date().getTime() / 1000) + 3;
    campaignEnd = campaignStart + 60;
  });

  it("deploys contract", async () => {
    await loadFixture(deployFixture);
  });
  
  it("launch", async () => {
    const { owner, contract } = await loadFixture(deployFixture);
    
  });
});
