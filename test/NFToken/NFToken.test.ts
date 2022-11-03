import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { ethers } from "hardhat";

const TOKEN_NAME = "DEED";
const TOKEN_SYMBOL = "D";
const TOKEN_BASE_URI = "https://example.com";

describe("NFToken contract", () => {
  async function deployFixture() {
    const Contract = await ethers.getContractFactory("NFToken");
    const [owner, acc1, acc2] = await ethers.getSigners();

    const contract = await Contract.deploy(TOKEN_NAME, TOKEN_SYMBOL, TOKEN_BASE_URI);
    await contract.deployed();

    return { contract, owner, acc1, acc2 };
  }

  it("Should deploy contract", async () => {
    await loadFixture(deployFixture);
  });

  it("Should return token metadata", async () => {
    const { contract } = await loadFixture(deployFixture);

    expect(await contract.name()).to.equal(TOKEN_NAME);
    expect(await contract.symbol()).to.equal(TOKEN_SYMBOL);
  });

  it("Should mint new tokens", async () => {
    const { acc1, contract } = await loadFixture(deployFixture);

    await contract.mint(1, acc1.address);
    expect(await contract.ownerOf(1)).to.equal(acc1.address);
  });

  it("Should return account balance", async () => {
    const { acc1, contract } = await loadFixture(deployFixture);

    await contract.mint(1, acc1.address);
    expect(await contract.balanceOf(acc1.address)).to.equal(1);
  });

  it("Should return owner of a token", async () => {
    const { acc1, contract } = await loadFixture(deployFixture);

    await contract.mint(1, acc1.address);
    expect(await contract.ownerOf(1)).to.equal(acc1.address);
  });

  it("Should safely transfer token", async () => {
    const { acc1, acc2, contract } = await loadFixture(deployFixture);

    await contract.mint(1, acc1.address);
    expect(
      await contract
        .connect(acc1)
        ["safeTransferFrom(address,address,uint256)"](acc1.address, acc2.address, 1)
    ).to.emit("NFToken", "Transfer");

    expect(await contract.ownerOf(1)).to.equal(acc2.address);
  });

  it("Should set approval for token", async () => {
    const { acc1, acc2, contract } = await loadFixture(deployFixture);

    await contract.mint(1, acc1.address);

    expect(await contract.connect(acc1).approve(acc2.address, 1)).to.emit(contract, "Approval");
    expect(await contract.getApproved(1)).to.equal(acc2.address);
  });

  it("Should set approval for all", async () => {
    const { acc1, acc2, contract } = await loadFixture(deployFixture);

    await contract.mint(1, acc1.address);

    expect(await contract.connect(acc1).setApprovalForAll(acc2.address, true)).to.emit(
      contract,
      "ApprovalForAll"
    );
    expect(await contract.isApprovedForAll(acc1.address, acc2.address)).to.be.true;
  });
});
