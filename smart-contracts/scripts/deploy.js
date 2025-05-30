const Web3 = require('web3');
require('dotenv').config();

async function deployContracts() {
  // Используем правильный URL из truffle-config
  const web3 = new Web3(`https://eth-sepolia.g.alchemy.com/v2/sw-BMbGHGOkXWmcIQRs-jGvzi4IVNMN1`);
  
  // Создаем аккаунт из приватного ключа
  const account = web3.eth.accounts.privateKeyToAccount(process.env.PRIVATE_KEY);
  web3.eth.accounts.wallet.add(account);
  
  console.log('Deploying from account:', account.address);
  
  // Проверяем баланс
  const balance = await web3.eth.getBalance(account.address);
  console.log('Account balance:', web3.utils.fromWei(balance, 'ether'), 'ETH');
  
  if (parseFloat(web3.utils.fromWei(balance, 'ether')) < 0.01) {
    console.error('Insufficient balance for deployment. Need at least 0.01 ETH');
    return;
  }
  
  // Загружаем скомпилированные контракты
  const fs = require('fs');
  const path = require('path');
  
  const factoryPath = path.join(__dirname, '../build/contracts/RentalFactory.json');
  
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
  console.log(`Gas price: ${web3.utils.fromWei(gasPrice, 'gwei')} gwei`);
  
  const deployedFactory = await factoryTx.send({
    from: account.address,
    gas: Math.floor(gas * 1.2), // Добавляем 20% к газу
    gasPrice: gasPrice
  });
  
  console.log('✅ RentalFactory deployed at:', deployedFactory.options.address);
  
  // Проверяем деплой
  const contractCode = await web3.eth.getCode(deployedFactory.options.address);
  if (contractCode === '0x') {
    console.error('❌ Contract deployment failed - no code at address');
    return;
  }
  
  // Сохраняем адреса для использования в приложении
  const addresses = {
    network: 'sepolia',
    chainId: 11155111,
    RentalFactory: deployedFactory.options.address,
    deployedAt: new Date().toISOString(),
    deployer: account.address,
    gasUsed: gas,
    gasPrice: gasPrice.toString()
  };
  
  // Создаем директорию если она не существует
  const deployedDir = path.join(__dirname, '../deployed');
  if (!fs.existsSync(deployedDir)) {
    fs.mkdirSync(deployedDir, { recursive: true });
  }
  
  fs.writeFileSync(
    path.join(deployedDir, 'sepolia-addresses.json'),
    JSON.stringify(addresses, null, 2)
  );
  
  console.log('✅ Deployment completed successfully!');
  console.log('📄 Contract addresses saved to deployed/sepolia-addresses.json');
  console.log('');
  console.log('📋 Contract Information:');
  console.log(`   Factory Address: ${deployedFactory.options.address}`);
  console.log(`   Network: Sepolia Testnet (${addresses.chainId})`);
  console.log(`   Deployer: ${account.address}`);
  console.log(`   Gas Used: ${gas}`);
  console.log('');
  console.log('🔗 Etherscan Link:');
  console.log(`   https://sepolia.etherscan.io/address/${deployedFactory.options.address}`);
  
  return addresses;
}