import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { ethers, network } from "hardhat";
import { CrowdFunding } from "typechain-types";

describe.only("CrowdFunding contract", () => {
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

  it("launches campaign successfully", async () => {
    const { owner, contract } = await loadFixture(deployFixture);

    await expect(contract.launchCampaign(1, 10 ** 15, campaignStart, campaignEnd, true))
      .to.emit(contract, "Launch")
      .withArgs(1, owner.address, 10 ** 15, campaignStart, campaignEnd);
  });

  describe("Cancel campaign", () => {
    it("fails cancel campaign. The campaign has started", async () => {
      const { owner, contract } = await loadFixture(deployFixture);

      await contract.launchCampaign(1, 10 ** 15, campaignStart, campaignEnd, true);
      await network.provider.send("evm_increaseTime", [campaignEnd - campaignStart]);

      await expect(contract.cancelCampaign(1)).to.be.revertedWith("campaign already started");
    });

    it("cancels campaign successfully", async () => {
      const { owner, contract } = await loadFixture(deployFixture);

      await contract.launchCampaign(1, 10 ** 15, campaignStart, campaignEnd, true);

      await expect(contract.cancelCampaign(1)).to.emit(contract, "Cancel").withArgs(1);
    });
  });

  describe("Fund", () => {
    let contract: CrowdFunding;
    let owner: any;

    beforeEach(async () => {
      contract = (await loadFixture(deployFixture)).contract;
      owner = (await loadFixture(deployFixture)).owner;

      await contract.launchCampaign(1, 10 ** 15, campaignStart, campaignEnd, true);
    });

    it("fail to fund. The campaign not started yet", async () => {
      await expect(contract.fund(1, { value: 10 ** 6 })).to.be.revertedWith(
        "campaign not started yet"
      );
    });

    it("funds successfully", async () => {
      await network.provider.send("evm_increaseTime", [10]);

      await expect(contract.fund(1, { value: 10 ** 6 }))
        .to.emit(contract, "Fund")
        .withArgs(1, owner.address, 10 ** 6);

      expect((await contract.campaigns(1)).fundingAmount).to.equal(10 ** 6);
      expect(await contract.funders(1, owner.address)).to.equal(10 ** 6);
    });

    it("funds successfully. The goal reached", async () => {
      await network.provider.send("evm_increaseTime", [10]);

      await expect(contract.fund(1, { value: 10 ** 15 }))
        .to.emit(contract, "GoalReached")
        .withArgs(1);
    });
  });

  describe("Withdraw", () => {
    let contract: CrowdFunding;
    let owner: any;

    beforeEach(async () => {
      contract = (await loadFixture(deployFixture)).contract;
      owner = (await loadFixture(deployFixture)).owner;

      await contract.launchCampaign(1, 10 ** 15, campaignStart, campaignEnd, true);
      await network.provider.send("evm_increaseTime", [10]);
      await contract.fund(1, { value: 10 ** 6 });
    });

    it("fails to withdraw. specified amount exceeds contribution", async () => {
      await expect(contract.withdraw(1, 10 ** 7)).to.revertedWith("amount exceeds contribution");
    });

    it("withdraw successfully", async () => {
      await expect(contract.withdraw(1, 10 ** 5))
        .to.emit(contract, "Withdrawal")
        .withArgs(1, owner.address, 10 ** 5);

      expect((await contract.campaigns(1)).fundingAmount).to.equal(900_000);
      expect(await contract.funders(1, owner.address)).to.equal(900_000);
    });
  });

  describe("Claim", () => {
    let contract: CrowdFunding;
    let owner: any;
    let acc1: any;
    let acc2: any;

    beforeEach(async () => {
      const fixture = await loadFixture(deployFixture);

      contract = fixture.contract;
      owner = fixture.owner;
      acc1 = fixture.acc1;
      acc2 = fixture.acc2;

      await contract.launchCampaign(1, 10 ** 15, campaignStart, campaignEnd, true);
      await network.provider.send("evm_increaseTime", [10]);

      await Promise.all([
        contract.connect(acc1).fund(1, { value: 10 ** 6 }),
        contract.connect(acc2).fund(1, { value: 10 ** 6 }),
      ]);
    });

    it("fails to claim. campaign not finished", async () => {
      await expect(contract.claim(1)).to.be.revertedWith("campaign not finished");
    });

    it("fails to claim. not the owner", async () => {
      await network.provider.send("evm_increaseTime", [campaignEnd - campaignStart]);
      await expect(contract.connect(acc1).claim(1)).to.be.revertedWith("not campaign owner");
    });

    it("fails to claim. claimed earlier", async () => {
      await contract.connect(acc1).fund(1, { value: 10 ** 15 - 10 ** 6 * 2 });
      await network.provider.send("evm_increaseTime", [campaignEnd - campaignStart]);

      await contract.claim(1);
      await expect(contract.claim(1)).to.be.revertedWith("already claimed");
    });

    it("fails to claim. the goal not reached", async () => {
      await network.provider.send("evm_increaseTime", [campaignEnd - campaignStart]);
      await expect(contract.claim(1)).to.be.revertedWith("goal not reached");
    });

    it("claims successfully. Claim event should be sent", async () => {
      await contract.connect(acc1).fund(1, { value: 10 ** 15 - 10 ** 6 * 2 });
      await network.provider.send("evm_increaseTime", [campaignEnd - campaignStart]);

      await expect(contract.claim(1)).to.emit(contract, "Claim").withArgs(1, owner.address);
    });

    it("claims successfully. campaign owner should receive ether", async () => {
      await contract.connect(acc1).fund(1, { value: 10 ** 15 - 10 ** 6 * 2 });
      await network.provider.send("evm_increaseTime", [campaignEnd - campaignStart]);

      await expect(contract.claim(1)).to.changeEtherBalance(owner, 10 ** 15);
    });
  });

  describe("Refund", () => {
    let contract: CrowdFunding;
    let owner: any;
    let acc1: any;
    let acc2: any;

    beforeEach(async () => {
      const fixture = await loadFixture(deployFixture);

      contract = fixture.contract;
      owner = fixture.owner;
      acc1 = fixture.acc1;
      acc2 = fixture.acc2;

      await contract.launchCampaign(1, 10 ** 15, campaignStart, campaignEnd, true);
      await network.provider.send("evm_increaseTime", [10]);

      await Promise.all([
        contract.connect(acc1).fund(1, { value: 10 ** 6 }),
        contract.connect(acc2).fund(1, { value: 10 ** 6 }),
      ]);
    });

    it("fails to refund. campaign not finished", async () => {
      await expect(contract.connect(acc1).refund(1)).to.be.revertedWith("campaign not finished");
    });

    it("fails to refund. campaign succeeded", async () => {
      await contract.connect(acc1).fund(1, { value: 10 ** 15 - 10 ** 6 * 2 });
      await network.provider.send("evm_increaseTime", [campaignEnd - campaignStart]);

      await expect(contract.connect(acc1).refund(1)).to.be.revertedWith("campaign succeeded");
    });

    it("fails to refund. not a funder", async () => {
      await network.provider.send("evm_increaseTime", [campaignEnd - campaignStart]);
      await expect(contract.refund(1)).to.be.revertedWith("nothing to refund");
    });

    it("refund successfully", async () => {
      await network.provider.send("evm_increaseTime", [campaignEnd - campaignStart]);

      await expect(contract.connect(acc1).refund(1))
        .to.emit(contract, "Refund")
        .withArgs(1, acc1.address);

      await expect(contract.connect(acc2).refund(1)).to.changeEtherBalance(acc2, 10 ** 6);
    });
  });
});
