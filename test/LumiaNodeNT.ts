import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import { parseEther } from 'ethers';
import { ethers, ignition } from 'hardhat';
import erc20TestTokenModule from '../ignition/modules/ERC20TestToken';
import lumiaNodeNTModule from '../ignition/modules/providers/lumia/LumiaNodeNT';
import { ERC20TestToken, LumiaNodeNT } from '../typechain-types';

describe('Lumia Node NT tests', () => {
  const DEFAULT_ADMIN_ROLE = '0x0000000000000000000000000000000000000000000000000000000000000000';
  const ADMIN_ROLE = '0xa49807205ce4d355092ef5a8a18f56e8913cf4a201fbe287825b095693c21775';
  const MASTER_ROLE = '0x8b8c0776df2c2176edf6f82391c35ea4891146d7a976ee36fd07f1a6fb4ead4c';

  const lumiaPaymentAddress = '0x1111111111111111111111111111111111111111';
  const ntPaymentAddress = '0x2222222222222222222222222222222222222222';
  const maxAllowedNodes = 625n;
  const ntCommissionsInBp = 1250n;
  const nodePrice = 1000e6;

  const setup = async () => {
    const [deployer, defaultAdmin, admin, master, user, minter] = await ethers.getSigners();

    const { erc20TestToken } = (await ignition.deploy(erc20TestTokenModule)) as unknown as {
      erc20TestToken: ERC20TestToken;
    };
    const { lumiaNodeNT } = (await ignition.deploy(lumiaNodeNTModule, {
      parameters: {
        LumiaNodeNT: {
          owner: defaultAdmin.address,
          paymentToken: await erc20TestToken.getAddress(),
          lumiaPaymentAddress,
          ntPaymentAddress,
          maxAllowedNodes,
          ntCommissionsInBp,
          nodePrice
        }
      }
    })) as unknown as { lumiaNodeNT: LumiaNodeNT };

    await lumiaNodeNT.connect(defaultAdmin).grantRole(ADMIN_ROLE, admin.address);
    await lumiaNodeNT.connect(defaultAdmin).grantRole(MASTER_ROLE, master.address);
    await erc20TestToken.mint(user.address, parseEther('1000'));
    await erc20TestToken.mint(master.address, parseEther('1000'));

    return { lumiaNodeNT, ett: erc20TestToken, deployer, defaultAdmin, admin, master, user, minter };
  };

  describe('deployment', () => {
    it('should deploy and return initial parameters', async () => {
      const { lumiaNodeNT, ett, defaultAdmin, admin, master } = await loadFixture(setup);

      expect(await lumiaNodeNT.paymentToken()).to.equal(await ett.getAddress());
      expect(await lumiaNodeNT.lumiaAddress()).to.equal(lumiaPaymentAddress);
      expect(await lumiaNodeNT.ntAddress()).to.equal(ntPaymentAddress);
      expect(await lumiaNodeNT.ntCommissions()).to.equal(ntCommissionsInBp);
      expect(await lumiaNodeNT.getPricePerNode()).to.equal(1000e6);
      expect(await lumiaNodeNT.hasRole(DEFAULT_ADMIN_ROLE, defaultAdmin)).to.be.true;
      expect(await lumiaNodeNT.hasRole(ADMIN_ROLE, admin)).to.be.true;
      expect(await lumiaNodeNT.hasRole(MASTER_ROLE, master)).to.be.true;
    });

    it('should revert deploying if owner is zero address', async () => {
      const { erc20TestToken } = await ignition.deploy(erc20TestTokenModule);
      await expect(
        ethers.deployContract('LumiaNodeNT', [
          ethers.ZeroAddress,
          await erc20TestToken.getAddress(),
          lumiaPaymentAddress,
          ntPaymentAddress,
          maxAllowedNodes,
          ntCommissionsInBp,
          nodePrice
        ])
      ).to.be.reverted;
    });

    it('should revert deploying if token is zero address', async () => {
      const [defaultAdmin] = await ethers.getSigners();
      await expect(
        ethers.deployContract('LumiaNodeNT', [
          defaultAdmin.address,
          ethers.ZeroAddress,
          lumiaPaymentAddress,
          ntPaymentAddress,
          maxAllowedNodes,
          ntCommissionsInBp,
          nodePrice
        ])
      ).to.be.reverted;
    });

    it('should revert deploying if lumia payment address is zero address', async () => {
      const [defaultAdmin] = await ethers.getSigners();
      const { erc20TestToken } = await ignition.deploy(erc20TestTokenModule);
      await expect(
        ethers.deployContract('LumiaNodeNT', [
          defaultAdmin.address,
          await erc20TestToken.getAddress(),
          ethers.ZeroAddress,
          ntPaymentAddress,
          maxAllowedNodes,
          ntCommissionsInBp,
          nodePrice
        ])
      ).to.be.reverted;
    });

    it('should revert deploying if NT payment address is zero address', async () => {
      const [defaultAdmin] = await ethers.getSigners();
      const { erc20TestToken } = await ignition.deploy(erc20TestTokenModule);
      await expect(
        ethers.deployContract('LumiaNodeNT', [
          defaultAdmin.address,
          await erc20TestToken.getAddress(),
          lumiaPaymentAddress,
          ethers.ZeroAddress,
          maxAllowedNodes,
          ntCommissionsInBp,
          nodePrice
        ])
      ).to.be.reverted;
    });

    it('should revert deploying if max allowed nodes is zero', async () => {
      const [defaultAdmin] = await ethers.getSigners();
      const { erc20TestToken } = await ignition.deploy(erc20TestTokenModule);
      await expect(
        ethers.deployContract('LumiaNodeNT', [
          defaultAdmin.address,
          await erc20TestToken.getAddress(),
          lumiaPaymentAddress,
          ntPaymentAddress,
          0,
          ntCommissionsInBp,
          nodePrice
        ])
      ).to.be.reverted;
    });

    it('should revert deploying if node price is zero', async () => {
      const [defaultAdmin] = await ethers.getSigners();
      const { erc20TestToken } = await ignition.deploy(erc20TestTokenModule);
      await expect(
        ethers.deployContract('LumiaNodeNT', [
          defaultAdmin.address,
          await erc20TestToken.getAddress(),
          lumiaPaymentAddress,
          ntPaymentAddress,
          maxAllowedNodes,
          ntCommissionsInBp,
          0
        ])
      ).to.be.reverted;
    });
  });

  describe('setIsSaleActive', () => {
    it('should set the sale active state', async () => {
      const { lumiaNodeNT, master } = await loadFixture(setup);

      await lumiaNodeNT.connect(master).setIsSaleActive(true);
      expect(await lumiaNodeNT.isSaleActive()).to.be.true;

      await lumiaNodeNT.connect(master).setIsSaleActive(false);
      expect(await lumiaNodeNT.isSaleActive()).to.be.false;
    });

    it('should revert if called by a non-master role', async () => {
      const { lumiaNodeNT, user } = await loadFixture(setup);

      await expect(lumiaNodeNT.connect(user).setIsSaleActive(true))
        .to.be.revertedWithCustomError(lumiaNodeNT, 'AccessControlUnauthorizedAccount')
        .withArgs(user.address, MASTER_ROLE);
    });
  });

  describe('setNumberOfNodes', () => {
    it('should set the number of nodes for an account', async () => {
      const { lumiaNodeNT, defaultAdmin, user } = await loadFixture(setup);

      const value = 10;
      await lumiaNodeNT.connect(defaultAdmin).setNumberOfNodes(user.address, value);
      expect(await lumiaNodeNT.getNumberOfNodes(user.address)).to.equal(value);
      expect(await lumiaNodeNT.nodeCount()).to.equal(value);

      const value2 = 7;
      await lumiaNodeNT.connect(defaultAdmin).setNumberOfNodes(user.address, value2);
      expect(await lumiaNodeNT.getNumberOfNodes(user.address)).to.equal(value2);
      expect(await lumiaNodeNT.nodeCount()).to.equal(value2);
    });

    it('should return nodes for all accounts', async () => {
      const { lumiaNodeNT, defaultAdmin, admin, master, user } = await loadFixture(setup);

      const userValue = 10;
      const masterValue = 15;
      const adminValue = 17;
      await lumiaNodeNT.connect(defaultAdmin).setNumberOfNodes(user.address, userValue);
      await lumiaNodeNT.connect(defaultAdmin).setNumberOfNodes(master.address, masterValue);
      await lumiaNodeNT.connect(defaultAdmin).setNumberOfNodes(admin.address, adminValue);

      expect(await lumiaNodeNT.nodeCount()).to.equal(userValue + masterValue + adminValue);
      expect(await lumiaNodeNT.getAccountsAndNumberOfNodes()).to.deep.equal([
        [user.address, master.address, admin.address],
        [userValue, masterValue, adminValue]
      ]);
    });

    it('should revert if the number of nodes exceeds the maximum allowed', async () => {
      const { lumiaNodeNT, defaultAdmin, user } = await loadFixture(setup);

      const maxSupply = await lumiaNodeNT.maxSupply();
      await expect(
        lumiaNodeNT.connect(defaultAdmin).setNumberOfNodes(user.address, maxSupply + 1n)
      ).to.be.revertedWithCustomError(lumiaNodeNT, 'NodesAllAllocated');
    });

    it('should revert if called by a non-admin role', async () => {
      const { lumiaNodeNT, user } = await loadFixture(setup);

      await expect(lumiaNodeNT.connect(user).setNumberOfNodes(user.address, 5))
        .to.be.revertedWithCustomError(lumiaNodeNT, 'AccessControlUnauthorizedAccount')
        .withArgs(user.address, DEFAULT_ADMIN_ROLE);
    });
  });

  describe('addMultipleNodes', () => {
    it('should add multiple nodes to an account', async () => {
      const { lumiaNodeNT, admin, user } = await loadFixture(setup);
      const numberOfNodes = 5;

      await lumiaNodeNT.connect(admin).addMultipleNodes(user.address, numberOfNodes);

      expect(await lumiaNodeNT.getNumberOfNodes(user.address)).to.equal(numberOfNodes);
    });

    it('should revert if called by a non-admin role', async () => {
      const { lumiaNodeNT, admin, user } = await loadFixture(setup);
      const numberOfNodes = 5;

      await expect(lumiaNodeNT.connect(user).addMultipleNodes(user.address, numberOfNodes))
        .to.be.revertedWithCustomError(lumiaNodeNT, 'AccessControlUnauthorizedAccount')
        .withArgs(user.address, ADMIN_ROLE);
    });
  });

  describe('purchaseNodes', () => {
    [1n, maxAllowedNodes].forEach((quantity) =>
      it(`should purchase nodes [quantity=${quantity}]`, async () => {
        const { lumiaNodeNT, ett, master, user } = await loadFixture(setup);
        const nodePrice = await lumiaNodeNT.getPricePerNode();
        const maxSupply = await lumiaNodeNT.maxSupply();

        await lumiaNodeNT.connect(master).setIsSaleActive(true);

        expect(await lumiaNodeNT.getNumberOfNodes(user.address)).to.equal(0);
        expect(await lumiaNodeNT.getAvailableNodes()).to.equal(maxSupply);

        await ett.connect(user).approve(await lumiaNodeNT.getAddress(), BigInt(quantity) * nodePrice);
        await lumiaNodeNT.connect(user).purchaseNodes(quantity);

        expect(await lumiaNodeNT.getNumberOfNodes(user.address)).to.equal(quantity);
        expect(await lumiaNodeNT.nodeCount()).to.equal(quantity);
        expect(await lumiaNodeNT.getAvailableNodes()).to.equal(maxSupply - quantity);
        expect(await lumiaNodeNT.getAccounts()).to.deep.equal([user.address]);
      })
    );

    it(`should multiple users purchase nodes`, async () => {
      const { lumiaNodeNT, ett, master, user } = await loadFixture(setup);
      const nodePrice = await lumiaNodeNT.getPricePerNode();
      const maxSupply = await lumiaNodeNT.maxSupply();
      const userQuantity = 10n;
      const masterQuantity = 17n;

      await lumiaNodeNT.connect(master).setIsSaleActive(true);

      expect(await lumiaNodeNT.getAvailableNodes()).to.equal(maxSupply);

      await ett.connect(user).approve(await lumiaNodeNT.getAddress(), userQuantity * nodePrice);
      await ett.connect(master).approve(await lumiaNodeNT.getAddress(), masterQuantity * nodePrice);

      await lumiaNodeNT.connect(user).purchaseNodes(userQuantity);
      await lumiaNodeNT.connect(master).purchaseNodes(masterQuantity);

      const totalQuantity = userQuantity + masterQuantity;
      expect(await lumiaNodeNT.getNumberOfNodes(user.address)).to.equal(userQuantity);
      expect(await lumiaNodeNT.getNumberOfNodes(master.address)).to.equal(masterQuantity);
      expect(await lumiaNodeNT.nodeCount()).to.equal(totalQuantity);
      expect(await lumiaNodeNT.getAvailableNodes()).to.equal(maxSupply - totalQuantity);
      expect(await lumiaNodeNT.getAccounts()).to.deep.equal([user.address, master.address]);

      expect(await ett.balanceOf(lumiaPaymentAddress)).to.equal(23625e6);
      expect(await ett.balanceOf(ntPaymentAddress)).to.equal(3375e6);
    });

    it(`should transfer tokens to Lumia and NT wallets`, async () => {
      const { lumiaNodeNT, ett, master, user } = await loadFixture(setup);
      const nodePrice = await lumiaNodeNT.getPricePerNode();

      await lumiaNodeNT.connect(master).setIsSaleActive(true);

      await ett.connect(user).approve(await lumiaNodeNT.getAddress(), 1n * nodePrice);
      await lumiaNodeNT.connect(user).purchaseNodes(1);

      expect(await ett.balanceOf(lumiaPaymentAddress)).to.equal(875e6);
      expect(await ett.balanceOf(ntPaymentAddress)).to.equal(125e6);
    });

    it('should revert if sale inactive', async () => {
      const { lumiaNodeNT, ett, user } = await loadFixture(setup);
      const nodePrice = await lumiaNodeNT.getPricePerNode();

      await ett.connect(user).approve(await lumiaNodeNT.getAddress(), 1n * nodePrice);

      await expect(lumiaNodeNT.connect(user).purchaseNodes(1)).to.be.revertedWithCustomError(
        lumiaNodeNT,
        'SaleNotActive'
      );
    });

    it('should revert if purchasing zero nodes', async () => {
      const { lumiaNodeNT, master, user } = await loadFixture(setup);

      await lumiaNodeNT.connect(master).setIsSaleActive(true);

      await expect(lumiaNodeNT.connect(user).purchaseNodes(0)).to.be.revertedWithCustomError(
        lumiaNodeNT,
        'InvalidParameter'
      );
    });

    it('should revert if insufficient token balance', async () => {
      const { lumiaNodeNT, ett, defaultAdmin, master } = await loadFixture(setup);

      await lumiaNodeNT.connect(master).setIsSaleActive(true);

      expect(await ett.balanceOf(defaultAdmin.address)).to.equal(0);
      await expect(lumiaNodeNT.connect(defaultAdmin).purchaseNodes(1)).to.be.revertedWithCustomError(
        lumiaNodeNT,
        'InsufficientBalance'
      );
    });

    it('should revert if insufficient token allowance', async () => {
      const { lumiaNodeNT, ett, master, user } = await loadFixture(setup);
      const nodePrice = await lumiaNodeNT.getPricePerNode();
      const quantity = 10;

      await lumiaNodeNT.connect(master).setIsSaleActive(true);

      await ett.connect(user).approve(await lumiaNodeNT.getAddress(), BigInt(quantity) * nodePrice - 1n);
      await expect(lumiaNodeNT.connect(user).purchaseNodes(quantity)).to.be.revertedWithCustomError(
        lumiaNodeNT,
        'InsufficientAllowance'
      );
    });

    it('should revert if max allowed tokens exceeded', async () => {
      const { lumiaNodeNT, ett, master, user } = await loadFixture(setup);
      const nodePrice = await lumiaNodeNT.getPricePerNode();
      const maxSupply = await lumiaNodeNT.maxSupply();
      const quantity = maxSupply + 1n;

      await lumiaNodeNT.connect(master).setIsSaleActive(true);

      await ett.connect(user).approve(await lumiaNodeNT.getAddress(), BigInt(quantity) * nodePrice);
      await expect(lumiaNodeNT.connect(user).purchaseNodes(quantity)).to.be.revertedWithCustomError(
        lumiaNodeNT,
        'NodesAllAllocated'
      );
    });
  });
});
