const RentalFactory = artifacts.require("RentalFactory");

module.exports = function(deployer) {
  deployer.deploy(RentalFactory);
};