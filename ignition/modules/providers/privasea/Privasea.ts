import { buildModule } from '@nomicfoundation/hardhat-ignition/modules';

const privaseaModule = buildModule('Privasea', (m) => {
  const ADMIN_ROLE = '0xa49807205ce4d355092ef5a8a18f56e8913cf4a201fbe287825b095693c21775';
  const MASTER_ROLE = '0x8b8c0776df2c2176edf6f82391c35ea4891146d7a976ee36fd07f1a6fb4ead4c';

  const owner = m.getParameter('owner');
  const paymentToken = m.getParameter('paymentToken');
  const nodeProviderWallet = m.getParameter('nodeProviderWallet');
  const commissionsWallet = m.getParameter('commissionsWallet');
  const maxAllowedNodes = m.getParameter('maxAllowedNodes');
  const ntCommissionsInBp = m.getParameter('ntCommissionsInBp');
  const nodePrice = m.getParameter('nodePrice');
  const commonCap = m.getParameter('commonCap');

  const privasea = m.contract(
    'NodesSale',
    [
      owner,
      paymentToken,
      nodeProviderWallet,
      commissionsWallet,
      maxAllowedNodes,
      ntCommissionsInBp,
      nodePrice,
      commonCap
    ],
    { id: 'Privasea' }
  );

  m.call(privasea, 'grantRole', [ADMIN_ROLE, owner], { id: 'grantRoleAdmin' });
  m.call(privasea, 'grantRole', [MASTER_ROLE, owner], { id: 'grantRoleMaster' });

  return { privasea };
});

export default privaseaModule;
