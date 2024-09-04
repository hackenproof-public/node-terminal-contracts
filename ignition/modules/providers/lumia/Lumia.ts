import { buildModule } from '@nomicfoundation/hardhat-ignition/modules';
import hre from 'hardhat';
import erc20TestTokenModule from '../../test/ERC20TestToken';

const lumiaModule = buildModule('Lumia', (m) => {
  let paymentToken;
  if (hre.network.name in ['hardhat', 'localhost']) {
    const { erc20TestToken } = m.useModule(erc20TestTokenModule);
    paymentToken = erc20TestToken;
  } else {
    paymentToken = m.getParameter('paymentToken');
  }

  const owner = m.getParameter('owner');
  const nodeProviderWallet = m.getParameter('nodeProviderWallet');
  const commissionsWallet = m.getParameter('commissionsWallet');
  const maxAllowedNodes = m.getParameter('maxAllowedNodes');
  const ntCommissionsInBp = m.getParameter('ntCommissionsInBp');
  const nodePrice = m.getParameter('nodePrice');

  const lumia = m.contract(
    'NodesSale',
    [owner, paymentToken, nodeProviderWallet, commissionsWallet, maxAllowedNodes, ntCommissionsInBp, nodePrice],
    { id: 'Lumia' }
  );

  return { lumia };
});

export default lumiaModule;
