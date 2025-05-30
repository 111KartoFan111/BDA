const Web3 = require('web3');
require('dotenv').config();

async function deployContracts() {
  // Подключаемся к Sepolia через Infura
  const web3 = new Web3(`https://eth-sepolia.g.alchemy.com/v2/${process.env.INFURA_PROJECT_ID}`);
  
  // Создаем аккаунт из приватного ключа
  const account = web3.eth.accounts.privateKeyToAccount(process.env.PRIVATE_KEY);
  web3.eth.accounts.wallet.add(account);
  
  console.log('Deploying from account:', account.address);
  
  // Загружаем скомпилированные контракты
  const fs = require('fs');
  const path = require('path');
  
  const factoryPath = path.join(__dirname, '../build/contracts/RentalFactory.json');
  const rentalPath = path.join(__dirname, '../build/contracts/RentalContract.json');
  
  if (!fs.existsSync(factoryPath)) {
    console.error('Contract artifacts not found. Run "truffle compile" first.');
    return;
  }
  
  const RentalFactory = JSON.parse(fs.readFileSync(factoryPath));
  
  // Деплоим RentalFactory
  console.log('Deploying RentalFactory...');
  
  const factory = new web3.eth.Contract(RentalFactory.abi);
  
  const factoryTx = factory.deploy({
    data: RentalFactory.bytecode
  });
  
  const gas = await factoryTx.estimateGas({ from: account.address });
  const gasPrice = await web3.eth.getGasPrice();
  
  console.log(`Estimated gas: ${gas}`);
  console.log(`Gas price: ${gasPrice}`);
  
  const deployedFactory = await factoryTx.send({
    from: account.address,
    gas: Math.floor(gas * 1.2), // Добавляем 20% к газу
    gasPrice: gasPrice
  });
  
  console.log('RentalFactory deployed at:', deployedFactory.options.address);
  
  // Сохраняем адреса для использования в приложении
  const addresses = {
    network: 'sepolia',
    chainId: 11155111,
    RentalFactory: deployedFactory.options.address,
    deployedAt: new Date().toISOString(),
    deployer: account.address
  };
  
  fs.writeFileSync(
    path.join(__dirname, '../deployed/sepolia-addresses.json'),
    JSON.stringify(addresses, null, 2)
  );
  
  console.log('Deployment completed successfully!');
  console.log('Contract addresses saved to deployed/sepolia-addresses.json');
  
  return addresses;
}

// Функция для создания тестового контракта аренды
async function createTestRental() {
  const addresses = require('../deployed/sepolia-addresses.json');
  
  const web3 = new Web3(`https://eth-sepolia.g.alchemy.com/v2/${process.env.INFURA_PROJECT_ID}`);
  const account = web3.eth.accounts.privateKeyToAccount(process.env.PRIVATE_KEY);
  web3.eth.accounts.wallet.add(account);
  
  const RentalFactory = require('../build/contracts/RentalFactory.json');
  const factory = new web3.eth.Contract(RentalFactory.abi, addresses.RentalFactory);
  
  // Создаем тестовый контракт аренды
  const tenantAddress = '0x742d35cc6635c0532925a3b8d57c0d1b09001c5e'; // Замените на реальный адрес
  const itemId = 1;
  const duration = 7 * 24 * 60 * 60; // 7 дней в секундах
  const deposit = web3.utils.toWei('0.01', 'ether');
  const rentalPrice = web3.utils.toWei('0.05', 'ether');
  
  console.log('Creating test rental contract...');
  
  const tx = await factory.methods.createRentalContract(
    tenantAddress,
    itemId,
    duration,
    deposit
  ).send({
    from: account.address,
    value: rentalPrice,
    gas: 3000000
  });
  
  console.log('Test rental contract created!');
  console.log('Transaction hash:', tx.transactionHash);
  
  // Получаем адрес созданного контракта из событий
  const events = tx.events.RentalContractCreated;
  if (events) {
    console.log('Rental contract address:', events.returnValues.contractAddress);
  }
}

// Запускаем деплой, если скрипт вызван напрямую
if (require.main === module) {
  deployContracts()
    .then(() => {
      console.log('Would you like to create a test rental? (Uncomment the line below)');
      // return createTestRental();
    })
    .catch(console.error)
    .finally(() => process.exit(0));
}

module.exports = { deployContracts, createTestRental };