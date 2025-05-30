require("dotenv").config(); 
const Web3 = require('web3');
const fs = require('fs');
const path = require('path');

// Load contract artifacts
const RentalFactory = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../build/contracts/RentalFactory.json'))
);
const RentalContract = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../build/contracts/RentalContract.json'))
);

class ContractInteraction {
  constructor() {
    this.web3 = new Web3(`https://eth-sepolia.g.alchemy.com/v2/sw-BMbGHGOkXWmcIQRs-jGvzi4IVNMN1`);
    this.account = this.web3.eth.accounts.privateKeyToAccount(process.env.PRIVATE_KEY);
    this.web3.eth.accounts.wallet.add(this.account);
    
    // Load deployed addresses
    try {
      const addressesPath = path.join(__dirname, '../deployed/sepolia-addresses.json');
      this.addresses = JSON.parse(fs.readFileSync(addressesPath));
      this.factory = new this.web3.eth.Contract(RentalFactory.abi, this.addresses.RentalFactory);
    } catch (error) {
      console.error('Could not load contract addresses. Make sure contracts are deployed.');
      this.addresses = null;
      this.factory = null;
    }
  }

  async getAccountInfo() {
    console.log('=== Account Information ===');
    console.log('Address:', this.account.address);
    
    const balance = await this.web3.eth.getBalance(this.account.address);
    console.log('Balance:', this.web3.utils.fromWei(balance, 'ether'), 'ETH');
    
    const nonce = await this.web3.eth.getTransactionCount(this.account.address);
    console.log('Nonce:', nonce);
    console.log('');
  }

  async getFactoryInfo() {
    if (!this.factory) {
      console.log('Factory contract not available');
      return;
    }

    console.log('=== Factory Contract Information ===');
    console.log('Factory Address:', this.factory.options.address);
    
    const contractCount = await this.factory.methods.getContractCount().call();
    console.log('Total Contracts Created:', contractCount);
    
    if (contractCount > 0) {
      const allContracts = await this.factory.methods.getAllContracts().call();
      console.log('All Contract Addresses:');
      allContracts.forEach((addr, index) => {
        console.log(`  ${index + 1}. ${addr}`);
      });
    }
    console.log('');
  }

  async getUserContracts(userAddress = null) {
    if (!this.factory) {
      console.log('Factory contract not available');
      return [];
    }

    const address = userAddress || this.account.address;
    console.log(`=== Contracts for ${address} ===`);
    
    const userContracts = await this.factory.methods.getUserContracts(address).call();
    console.log(`Found ${userContracts.length} contracts`);
    
    for (let i = 0; i < userContracts.length; i++) {
      const contractAddress = userContracts[i];
      console.log(`\nContract ${i + 1}: ${contractAddress}`);
      
      try {
        const contract = new this.web3.eth.Contract(RentalContract.abi, contractAddress);
        const info = await contract.methods.getRentalInfo().call();
        
        console.log('  Tenant:', info.tenant);
        console.log('  Owner:', info.owner);
        console.log('  Item ID:', info.itemId);
        console.log('  Amount:', this.web3.utils.fromWei(info.amount, 'ether'), 'ETH');
        console.log('  Deposit:', this.web3.utils.fromWei(info.deposit, 'ether'), 'ETH');
        console.log('  Duration:', Math.floor(info.duration / (24 * 60 * 60)), 'days');
        console.log('  Status:', this.getStatusText(info.status));
        console.log('  Start Time:', new Date(info.startTime * 1000).toLocaleString());
        
        const balance = await this.web3.eth.getBalance(contractAddress);
        console.log('  Contract Balance:', this.web3.utils.fromWei(balance, 'ether'), 'ETH');
      } catch (error) {
        console.log('  Error reading contract info:', error.message);
      }
    }
    
    return userContracts;
  }

  async createTestRental(tenantAddress, itemId = 1, durationDays = 7, depositETH = '0.01', rentalPriceETH = '0.05') {
    if (!this.factory) {
      console.log('Factory contract not available');
      return;
    }

    console.log('=== Creating Test Rental Contract ===');
    console.log('Tenant:', tenantAddress);
    console.log('Item ID:', itemId);
    console.log('Duration:', durationDays, 'days');
    console.log('Deposit:', depositETH, 'ETH');
    console.log('Rental Price:', rentalPriceETH, 'ETH');

    try {
      const duration = durationDays * 24 * 60 * 60; // Convert to seconds
      const deposit = this.web3.utils.toWei(depositETH, 'ether');
      const rentalPrice = this.web3.utils.toWei(rentalPriceETH, 'ether');

      const tx = await this.factory.methods.createRentalContract(
        tenantAddress,
        itemId,
        duration,
        deposit
      ).send({
        from: this.account.address,
        value: rentalPrice,
        gas: 300000
      });

      console.log('Transaction Hash:', tx.transactionHash);
      console.log('Gas Used:', tx.gasUsed);

      // Get contract address from events
      const event = tx.events.RentalContractCreated;
      if (event) {
        console.log('New Contract Address:', event.returnValues.contractAddress);
        return event.returnValues.contractAddress;
      }
    } catch (error) {
      console.error('Error creating rental contract:', error.message);
    }
  }

  async interactWithContract(contractAddress) {
    console.log(`=== Interacting with Contract ${contractAddress} ===`);
    
    try {
      const contract = new this.web3.eth.Contract(RentalContract.abi, contractAddress);
      const info = await contract.methods.getRentalInfo().call();
      
      console.log('Current Status:', this.getStatusText(info.status));
      
      // Example interactions based on status
      if (info.status === '0') { // CREATED
        console.log('Contract is in CREATED state. Tenant can pay deposit.');
        console.log(`Required deposit: ${this.web3.utils.fromWei(info.deposit, 'ether')} ETH`);
      } else if (info.status === '1') { // ACTIVE
        console.log('Contract is ACTIVE. Can be completed or extended.');
      } else if (info.status === '2') { // COMPLETED
        console.log('Contract is COMPLETED.');
      } else if (info.status === '3') { // CANCELLED
        console.log('Contract is CANCELLED.');
      } else if (info.status === '4') { // DISPUTED
        console.log('Contract is in DISPUTE.');
      }
      
    } catch (error) {
      console.error('Error interacting with contract:', error.message);
    }
  }

  async payDeposit(contractAddress) {
    console.log(`=== Paying Deposit for Contract ${contractAddress} ===`);
    
    try {
      const contract = new this.web3.eth.Contract(RentalContract.abi, contractAddress);
      const info = await contract.methods.getRentalInfo().call();
      
      if (info.status !== '0') {
        console.log('Contract is not in CREATED state');
        return;
      }

      const tx = await contract.methods.payDeposit().send({
        from: this.account.address,
        value: info.deposit,
        gas: 200000
      });

      console.log('Deposit paid successfully!');
      console.log('Transaction Hash:', tx.transactionHash);
    } catch (error) {
      console.error('Error paying deposit:', error.message);
    }
  }

  async completeRental(contractAddress) {
    console.log(`=== Completing Rental ${contractAddress} ===`);
    
    try {
      const contract = new this.web3.eth.Contract(RentalContract.abi, contractAddress);
      
      const tx = await contract.methods.completeRental().send({
        from: this.account.address,
        gas: 200000
      });

      console.log('Rental completed successfully!');
      console.log('Transaction Hash:', tx.transactionHash);
    } catch (error) {
      console.error('Error completing rental:', error.message);
    }
  }

  async cancelRental(contractAddress, reason = 'Test cancellation') {
    console.log(`=== Cancelling Rental ${contractAddress} ===`);
    
    try {
      const contract = new this.web3.eth.Contract(RentalContract.abi, contractAddress);
      
      const tx = await contract.methods.cancelRental(reason).send({
        from: this.account.address,
        gas: 200000
      });

      console.log('Rental cancelled successfully!');
      console.log('Transaction Hash:', tx.transactionHash);
    } catch (error) {
      console.error('Error cancelling rental:', error.message);
    }
  }

  getStatusText(status) {
    const statuses = ['CREATED', 'ACTIVE', 'COMPLETED', 'CANCELLED', 'DISPUTED'];
    return statuses[parseInt(status)] || 'UNKNOWN';
  }

  async runDemo() {
    console.log('🚀 RentChain Smart Contract Interaction Demo\n');
    
    await this.getAccountInfo();
    await this.getFactoryInfo();
    await this.getUserContracts();
    
    // Uncomment to create a test rental
    // const testTenant = '0x742d35cc6635c0532925a3b8d57c0d1b09001c5e';
    // const contractAddress = await this.createTestRental(testTenant);
    // if (contractAddress) {
    //   await this.interactWithContract(contractAddress);
    // }
  }
}

// CLI Interface
const interaction = new ContractInteraction();

const command = process.argv[2];
const args = process.argv.slice(3);

switch (command) {
  case 'info':
    interaction.getAccountInfo().then(() => interaction.getFactoryInfo());
    break;
    
  case 'contracts':
    const userAddress = args[0];
    interaction.getUserContracts(userAddress);
    break;
    
  case 'create':
    const [tenant, itemId, days, deposit, price] = args;
    if (!tenant) {
      console.log('Usage: node interact.js create <tenant_address> [item_id] [days] [deposit_eth] [price_eth]');
    } else {
      interaction.createTestRental(tenant, itemId || 1, days || 7, deposit || '0.01', price || '0.05');
    }
    break;
    
  case 'deposit':
    const contractAddr = args[0];
    if (!contractAddr) {
      console.log('Usage: node interact.js deposit <contract_address>');
    } else {
      interaction.payDeposit(contractAddr);
    }
    break;
    
  case 'complete':
    const completeAddr = args[0];
    if (!completeAddr) {
      console.log('Usage: node interact.js complete <contract_address>');
    } else {
      interaction.completeRental(completeAddr);
    }
    break;
    
  case 'cancel':
    const cancelAddr = args[0];
    const reason = args[1] || 'Manual cancellation';
    if (!cancelAddr) {
      console.log('Usage: node interact.js cancel <contract_address> [reason]');
    } else {
      interaction.cancelRental(cancelAddr, reason);
    }
    break;
    
  case 'interact':
    const interactAddr = args[0];
    if (!interactAddr) {
      console.log('Usage: node interact.js interact <contract_address>');
    } else {
      interaction.interactWithContract(interactAddr);
    }
    break;
    
  case 'demo':
    interaction.runDemo();
    break;
    
  default:
    console.log('Available commands:');
    console.log('  info                                    - Show account and factory info');
    console.log('  contracts [user_address]               - Show contracts for user');
    console.log('  create <tenant> [item] [days] [dep] [price] - Create test rental');
    console.log('  deposit <contract_address>             - Pay deposit');
    console.log('  complete <contract_address>            - Complete rental');
    console.log('  cancel <contract_address> [reason]     - Cancel rental');
    console.log('  interact <contract_address>            - Interact with contract');
    console.log('  demo                                   - Run full demo');
    break;
}

module.exports = ContractInteraction;