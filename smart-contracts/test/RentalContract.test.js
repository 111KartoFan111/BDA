const RentalContract = artifacts.require("RentalContract");
const { expectRevert, expectEvent, BN } = require('@openzeppelin/test-helpers');

contract("RentalContract", (accounts) => {
  let rentalContract;
  const [owner, tenant, other] = accounts;
  
  const itemId = 1;
  const amount = web3.utils.toWei('1', 'ether');
  const duration = 7 * 24 * 60 * 60; // 7 days
  const deposit = web3.utils.toWei('0.1', 'ether');

  beforeEach(async () => {
    rentalContract = await RentalContract.new(
      tenant,
      owner,
      itemId,
      amount,
      duration,
      deposit,
      { from: owner, value: amount }
    );
  });

  describe("Contract Creation", () => {
    it("should create rental contract with correct parameters", async () => {
      const rentalInfo = await rentalContract.getRentalInfo();
      
      assert.equal(rentalInfo.tenant, tenant, "Tenant address should match");
      assert.equal(rentalInfo.owner, owner, "Owner address should match");
      assert.equal(rentalInfo.itemId.toString(), itemId.toString(), "Item ID should match");
      assert.equal(rentalInfo.amount.toString(), amount, "Amount should match");
      assert.equal(rentalInfo.duration.toString(), duration.toString(), "Duration should match");
      assert.equal(rentalInfo.deposit.toString(), deposit, "Deposit should match");
      assert.equal(rentalInfo.status.toString(), "0", "Status should be CREATED");
    });

    it("should revert with invalid tenant address", async () => {
      await expectRevert(
        RentalContract.new(
          "0x0000000000000000000000000000000000000000",
          owner,
          itemId,
          amount,
          duration,
          deposit,
          { from: owner, value: amount }
        ),
        "Invalid tenant address"
      );
    });

    it("should revert with insufficient payment", async () => {
      await expectRevert(
        RentalContract.new(
          tenant,
          owner,
          itemId,
          amount,
          duration,
          deposit,
          { from: owner, value: web3.utils.toWei('0.5', 'ether') }
        ),
        "Insufficient payment"
      );
    });
  });

  describe("Deposit Payment", () => {
    it("should allow tenant to pay deposit", async () => {
      const tx = await rentalContract.payDeposit({
        from: tenant,
        value: deposit
      });

      expectEvent(tx, 'DepositPaid', {
        tenant: tenant,
        amount: deposit
      });

      const rentalInfo = await rentalContract.getRentalInfo();
      assert.equal(rentalInfo.status.toString(), "1", "Status should be ACTIVE");
    });

    it("should revert if non-tenant tries to pay deposit", async () => {
      await expectRevert(
        rentalContract.payDeposit({
          from: other,
          value: deposit
        }),
        "Only tenant can call this"
      );
    });

    it("should revert with insufficient deposit", async () => {
      await expectRevert(
        rentalContract.payDeposit({
          from: tenant,
          value: web3.utils.toWei('0.05', 'ether')
        }),
        "Insufficient deposit"
      );
    });
  });

  describe("Rental Completion", () => {
    beforeEach(async () => {
      await rentalContract.payDeposit({
        from: tenant,
        value: deposit
      });
    });

    it("should allow completing rental", async () => {
      const ownerBalanceBefore = new BN(await web3.eth.getBalance(owner));
      const tenantBalanceBefore = new BN(await web3.eth.getBalance(tenant));

      const tx = await rentalContract.completeRental({ from: owner });

      expectEvent(tx, 'RentalCompleted', {
        tenant: tenant,
        amount: amount
      });

      if (deposit > 0) {
        expectEvent(tx, 'DepositRefunded', {
          recipient: tenant,
          amount: deposit
        });
      }

      const rentalInfo = await rentalContract.getRentalInfo();
      assert.equal(rentalInfo.status.toString(), "2", "Status should be COMPLETED");
    });

    it("should revert if rental is not active", async () => {
      await rentalContract.completeRental({ from: owner });
      
      await expectRevert(
        rentalContract.completeRental({ from: owner }),
        "Rental not active"
      );
    });
  });

  describe("Rental Cancellation", () => {
    it("should allow cancelling rental", async () => {
      const reason = "Changed mind";
      const tx = await rentalContract.cancelRental(reason, { from: owner });

      expectEvent(tx, 'RentalCancelled', {
        initiator: owner,
        reason: reason
      });

      const rentalInfo = await rentalContract.getRentalInfo();
      assert.equal(rentalInfo.status.toString(), "3", "Status should be CANCELLED");
    });

    it("should allow tenant to cancel rental", async () => {
      const reason = "Emergency";
      await rentalContract.cancelRental(reason, { from: tenant });

      const rentalInfo = await rentalContract.getRentalInfo();
      assert.equal(rentalInfo.status.toString(), "3", "Status should be CANCELLED");
    });

    it("should revert if unauthorized user tries to cancel", async () => {
      await expectRevert(
        rentalContract.cancelRental("No reason", { from: other }),
        "Only parties can call this"
      );
    });
  });

  describe("Rental Extension", () => {
    beforeEach(async () => {
      await rentalContract.payDeposit({
        from: tenant,
        value: deposit
      });
    });

    it("should allow extending rental", async () => {
      const newDuration = duration * 2;
      const additionalCost = amount; // Same amount for double duration
      
      await rentalContract.extendRental(newDuration, {
        from: tenant,
        value: additionalCost
      });

      const rentalInfo = await rentalContract.getRentalInfo();
      assert.equal(rentalInfo.duration.toString(), newDuration.toString(), "Duration should be extended");
    });

    it("should revert with insufficient payment for extension", async () => {
      const newDuration = duration * 2;
      const insufficientPayment = web3.utils.toWei('0.5', 'ether');
      
      await expectRevert(
        rentalContract.extendRental(newDuration, {
          from: tenant,
          value: insufficientPayment
        }),
        "Insufficient payment for extension"
      );
    });

    it("should revert if new duration is not longer", async () => {
      const shorterDuration = duration / 2;
      
      await expectRevert(
        rentalContract.extendRental(shorterDuration, {
          from: tenant,
          value: amount
        }),
        "New duration must be longer"
      );
    });
  });

  describe("Contract Balance", () => {
    it("should return correct contract balance", async () => {
      const balance = await rentalContract.getContractBalance();
      assert.equal(balance.toString(), amount, "Contract balance should match payment");
      
      await rentalContract.payDeposit({
        from: tenant,
        value: deposit
      });

      const newBalance = await rentalContract.getContractBalance();
      const expectedBalance = new BN(amount).add(new BN(deposit));
      assert.equal(newBalance.toString(), expectedBalance.toString(), "Balance should include deposit");
    });
  });
});