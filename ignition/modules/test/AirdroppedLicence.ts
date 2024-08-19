import { buildModule } from '@nomicfoundation/hardhat-ignition/modules';
import { ethers } from 'hardhat';

const proxyModule = buildModule('ProxyModule', (m) => {
  const proxyAdminOwner = m.getAccount(0);

  const licence = m.contract('AirdroppedLicence');

  const initializeInterface = new ethers.Interface(['function initialize()']);
  const initializeEncoded = initializeInterface.encodeFunctionData('initialize', []);
  const proxy = m.contract('TransparentUpgradeableProxy', [licence, proxyAdminOwner, initializeEncoded]);

  const proxyAdminAddress = m.readEventArgument(proxy, 'AdminChanged', 'newAdmin');

  const proxyAdmin = m.contractAt('ProxyAdmin', proxyAdminAddress);

  return { proxyAdmin, proxy };
});

const airdroppedLicenceModule = buildModule('AirdroppedLicence', (m) => {
  const { proxy, proxyAdmin } = m.useModule(proxyModule);

  const airdroppedLicence = m.contractAt('AirdroppedLicence', proxy);

  return { airdroppedLicence, proxy, proxyAdmin };
});

export default airdroppedLicenceModule;
