import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { ethers } from "hardhat";

const TOTAL_SUPPLY = 10_000_000;

describe("SilverCoin contract", () => {
  async function deployFixture() {
    const Contract = await ethers.getContractFactory("SilverCoin");
    const [owner, addr1, addr2] = await ethers.getSigners();

    const contract = await Contract.deploy(TOTAL_SUPPLY);
    await contract.deployed();

    return { contract, owner, addr1, addr2 };
  }

  it("Should deploy contract", async () => {
    await loadFixture(deployFixture);
  });

  it("Should return account balance", async () => {
    const { owner, contract } = await loadFixture(deployFixture);

    const balance = await contract.balanceOf(owner.address);
    expect(balance).to.equal(TOTAL_SUPPLY);
  });

  it("Should transfer tokens between accounts", async () => {
    const { owner, addr1, contract } = await loadFixture(deployFixture);

    await expect(contract.transfer(addr1.address, 1_000)).to.changeTokenBalances(
      contract,
      [owner, addr1],
      [-1_000, 1_000]
    );
  });

  it("Should approve withdrawal", async () => {
    const { owner, addr1, contract } = await loadFixture(deployFixture);

    await contract.approve(addr1.address, 1_000);

    expect(await contract.allowance(owner.address, addr1.address)).to.equal(1_000);
  });

  it("Should transfer tokens on behalf of another account", async () => {
    const { owner, addr1, addr2, contract } = await loadFixture(deployFixture);

    await contract.approve(addr1.address, 1_000);

    await expect(
      contract.connect(addr1).transferFrom(owner.address, addr2.address, 1_000)
    ).to.changeTokenBalances(contract, [owner, addr2], [-1_000, 1_000]);

    expect(await contract.allowance(owner.address, addr1.address)).to.equal(0);
  });
});
