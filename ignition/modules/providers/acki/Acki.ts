import { buildModule } from '@nomicfoundation/hardhat-ignition/modules';
import hre from 'hardhat';
import erc20TestTokenModule from '../../test/ERC20TestToken';

const ackiModule = buildModule('Acki', (m) => {
  const ADMIN_ROLE = '0xa49807205ce4d355092ef5a8a18f56e8913cf4a201fbe287825b095693c21775';
  const MASTER_ROLE = '0x8b8c0776df2c2176edf6f82391c35ea4891146d7a976ee36fd07f1a6fb4ead4c';

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
  const ntCommissionsInBp = m.getParameter('ntCommissionsInBp');
  const tier1MaxSupply = m.getParameter('tier1MaxAllowedNodes');
  const tier1NodePrice = m.getParameter('tier1NodePrice');

  const ackiTier1 = m.contract(
    'NodesSale',
    [owner, paymentToken, nodeProviderWallet, commissionsWallet, tier1MaxSupply, ntCommissionsInBp, tier1NodePrice],
    { id: 'Tier1' }
  );

  m.call(ackiTier1, 'grantRole', [ADMIN_ROLE, owner], { id: 'grantRoleAdmin' });
  m.call(ackiTier1, 'grantRole', [MASTER_ROLE, owner], { id: 'grantRoleMaster' });

  return { ackiTier1 };
});

export default ackiModule;
