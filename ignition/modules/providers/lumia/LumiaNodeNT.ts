import { buildModule } from '@nomicfoundation/hardhat-ignition/modules';
import hre from 'hardhat';
import erc20TestTokenModule from '../../ERC20TestToken';

const lumiaNodeNTModule = buildModule('LumiaNodeNT', (m) => {
  const MASTER_ROLE = '0x8b8c0776df2c2176edf6f82391c35ea4891146d7a976ee36fd07f1a6fb4ead4c';
  const ADMIN_ROLE = '0xa49807205ce4d355092ef5a8a18f56e8913cf4a201fbe287825b095693c21775';

  let paymentToken;
  if (hre.network.name in ['hardhat', 'localhost']) {
    console.log(`localhost`);
    const { erc20TestToken } = m.useModule(erc20TestTokenModule);
    paymentToken = erc20TestToken;
  } else {
    paymentToken = m.getParameter('paymentToken');
  }

  const owner = m.getParameter('owner');
  const lumiaPaymentAddress = m.getParameter('lumiaPaymentAddress');
  const ntPaymentAddress = m.getParameter('ntPaymentAddress');
  const maxAllowedNodes = m.getParameter('maxAllowedNodes');
  const ntCommissionsInBp = m.getParameter('ntCommissionsInBp');
  const nodePrice = m.getParameter('nodePrice');

  const lumiaNodeNT = m.contract('LumiaNodeNT', [
    owner,
    paymentToken,
    lumiaPaymentAddress,
    ntPaymentAddress,
    maxAllowedNodes,
    ntCommissionsInBp,
    nodePrice
  ]);

  // const receipt = m.call(lumiaNodeNT, 'grantRole', [MASTER_ROLE, owner], {
  //   id: 'grantRoleMaster'
  // });
  // m.call(lumiaNodeNT, 'grantRole', [ADMIN_ROLE, owner], {
  //   id: 'grantRoleAdmin'
  // });
  // m.call(lumiaNodeNT, 'setIsSaleActive', [true], { after: [receipt] });

  return { lumiaNodeNT };
});

export default lumiaNodeNTModule;
