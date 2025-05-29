const RentalFactory = artifacts.require("RentalFactory");
const RentalContract = artifacts.require("RentalContract");
const { expectRevert, expectEvent } = require('@openzeppelin/test-helpers');

contract("RentalFactory", (accounts) => {
  let rentalFactory;
  const [owner, tenant, other] = accounts;
  
  const itemId = 1;
  const amount = web3.utils.toWei('1', 'ether');
  const duration = 7 * 24 * 60 * 60; // 7 days
  const deposit = web3.utils.toWei('0.1', 'ether');

  beforeEach(async () => {
    rentalFactory = await RentalFactory.new();
  });

  describe("Contract Creation", () => {
    it("should deploy factory contract", async () => {
      assert.isTrue(web3.utils.isAddress(rentalFactory.address), "Factory should have valid address");
    });

    it("should have zero contracts initially", async () => {
      const count = await rentalFactory.getContractCount();
      assert.equal(count.toString(), "0", "Should have zero contracts initially");
    });
  });

  describe("Rental Contract Creation", () => {
    it("should create new rental contract", async () => {
      const tx = await rentalFactory.createRentalContract(
        tenant,
        itemId,
        duration,
        deposit,
        { from: owner, value: amount }
      );

      expectEvent(tx, 'RentalContractCreated', {
        tenant: tenant,
        owner: owner,
        itemId: itemId.toString()
      });

      const contractAddress = tx.logs[0].args.contractAddress;
      assert.isTrue(web3.utils.isAddress(contractAddress), "Should return valid contract address");

      // Verify the created contract
      const rentalContract = await RentalContract.at(contractAddress);
      const rentalInfo = await rentalContract.getRentalInfo();
      
      assert.equal(rentalInfo.tenant, tenant, "Tenant should match");
      assert.equal(rentalInfo.owner, owner, "Owner should match");
      assert.equal(rentalInfo.itemId.toString(), itemId.toString(), "Item ID should match");
    });

    it("should increment contract count", async () => {
      await rentalFactory.createRentalContract(
        tenant,
        itemId,
        duration,
        deposit,
        { from: owner, value: amount }
      );

      const count = await rentalFactory.getContractCount();
      assert.equal(count.toString(), "1", "Contract count should be 1");

      await rentalFactory.createRentalContract(
        other,
        itemId + 1,
        duration,
        deposit,
        { from: owner, value: amount }
      );

      const newCount = await rentalFactory.getContractCount();
      assert.equal(newCount.toString(), "2", "Contract count should be 2");
    });

    it("should revert with invalid tenant address", async () => {
      await expectRevert(
        rentalFactory.createRentalContract(
          "0x0000000000000000000000000000000000000000",
          itemId,
          duration,
          deposit,
          { from: owner, value: amount }
        ),
        "Invalid tenant address"
      );
    });

    it("should revert without payment", async () => {
      await expectRevert(
        rentalFactory.createRentalContract(
          tenant,
          itemId,
          duration,
          deposit,
          { from: owner, value: 0 }
        ),
        "Payment required"
      );
    });
  });

  describe("User Contracts Tracking", () => {
    it("should track user contracts correctly", async () => {
      // Create first contract
      const tx1 = await rentalFactory.createRentalContract(
        tenant,
        itemId,
        duration,
        deposit,
        { from: owner, value: amount }
      );
      const contract1Address = tx1.logs[0].args.contractAddress;

      // Create second contract with same owner
      const tx2 = await rentalFactory.createRentalContract(
        other,
        itemId + 1,
        duration,
        deposit,
        { from: owner, value: amount }
      );
      const contract2Address = tx2.logs[0].args.contractAddress;

      // Check owner's contracts
      const ownerContracts = await rentalFactory.getUserContracts(owner);
      assert.equal(ownerContracts.length, 2, "Owner should have 2 contracts");
      assert.equal(ownerContracts[0], contract1Address, "First contract should match");
      assert.equal(ownerContracts[1], contract2Address, "Second contract should match");

      // Check tenant's contracts
      const tenantContracts = await rentalFactory.getUserContracts(tenant);
      assert.equal(tenantContracts.length, 1, "Tenant should have 1 contract");
      assert.equal(tenantContracts[0], contract1Address, "Tenant contract should match");

      // Check other user's contracts
      const otherContracts = await rentalFactory.getUserContracts(other);
      assert.equal(otherContracts.length, 1, "Other user should have 1 contract");
      assert.equal(otherContracts[0], contract2Address, "Other user contract should match");
    });

    it("should return empty array for user with no contracts", async () => {
      const userContracts = await rentalFactory.getUserContracts(accounts[9]);
      assert.equal(userContracts.length, 0, "Should return empty array");
    });
  });

  describe("All Contracts Tracking", () => {
    it("should track all contracts", async () => {
      // Create multiple contracts
      const tx1 = await rentalFactory.createRentalContract(
        tenant,
        itemId,
        duration,
        deposit,
        { from: owner, value: amount }
      );
      
      const tx2 = await rentalFactory.createRentalContract(
        other,
        itemId + 1,
        duration,
        deposit,
        { from: tenant, value: amount }
      );

      const allContracts = await rentalFactory.getAllContracts();
      assert.equal(allContracts.length, 2, "Should have 2 contracts total");
      
      const contract1Address = tx1.logs[0].args.contractAddress;
      const contract2Address = tx2.logs[0].args.contractAddress;
      
      assert.equal(allContracts[0], contract1Address, "First contract should match");
      assert.equal(allContracts[1], contract2Address, "Second contract should match");
    });
  });

  describe("Multiple Users and Contracts", () => {
    it("should handle complex scenario with multiple users", async () => {
      // Owner creates contract with tenant
      await rentalFactory.createRentalContract(
        tenant,
        1,
        duration,
        deposit,
        { from: owner, value: amount }
      );

      // Tenant creates contract with other user
      await rentalFactory.createRentalContract(
        other,
        2,
        duration,
        deposit,
        { from: tenant, value: amount }
      );

      // Other user creates contract with owner
      await rentalFactory.createRentalContract(
        owner,
        3,
        duration,
        deposit,
        { from: other, value: amount }
      );

      // Check that each user has 2 contracts (as both owner and tenant)
      const ownerContracts = await rentalFactory.getUserContracts(owner);
      const tenantContracts = await rentalFactory.getUserContracts(tenant);
      const otherContracts = await rentalFactory.getUserContracts(other);

      assert.equal(ownerContracts.length, 2, "Owner should have 2 contracts");
      assert.equal(tenantContracts.length, 2, "Tenant should have 2 contracts");
      assert.equal(otherContracts.length, 2, "Other user should have 2 contracts");

      const totalContracts = await rentalFactory.getContractCount();
      assert.equal(totalContracts.toString(), "3", "Should have 3 total contracts");
    });
  });
});