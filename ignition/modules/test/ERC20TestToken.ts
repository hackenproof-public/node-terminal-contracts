import { buildModule } from '@nomicfoundation/hardhat-ignition/modules';
import { ethers } from 'hardhat';

const proxyModule = buildModule('ProxyModule', (m) => {
  const proxyAdminOwner = m.getAccount(0);

  const erc20TestToken = m.contract('ERC20TestToken');

  const initializeInterface = new ethers.Interface(['function initialize()']);
  const initializeEncoded = initializeInterface.encodeFunctionData('initialize', []);
  const proxy = m.contract('TransparentUpgradeableProxy', [erc20TestToken, proxyAdminOwner, initializeEncoded]);

  const proxyAdminAddress = m.readEventArgument(proxy, 'AdminChanged', 'newAdmin');

  const proxyAdmin = m.contractAt('ProxyAdmin', proxyAdminAddress);

  return { proxyAdmin, proxy };
});

const erc20TestTokenModule = buildModule('ERC20TestToken', (m) => {
  const admin = m.getAccount(0);
  const { proxy, proxyAdmin } = m.useModule(proxyModule);

  const erc20TestToken = m.contractAt('ERC20TestToken', proxy);

  return { erc20TestToken, proxy, proxyAdmin };
});

export default erc20TestTokenModule;
