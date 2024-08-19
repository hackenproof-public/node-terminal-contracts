import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import { parseEther } from 'ethers';
import { ethers, ignition } from 'hardhat';
import nodesSaleModule from '../ignition/modules/providers/lumia/NodesSale';
import erc20TestTokenModule from '../ignition/modules/test/ERC20TestToken';
import { ERC20TestToken, NodesSale } from '../typechain-types';

describe('Nodes Sale tests', () => {
  const DEFAULT_ADMIN_ROLE = '0x0000000000000000000000000000000000000000000000000000000000000000';
  const ADMIN_ROLE = '0xa49807205ce4d355092ef5a8a18f56e8913cf4a201fbe287825b095693c21775';
  const MASTER_ROLE = '0x8b8c0776df2c2176edf6f82391c35ea4891146d7a976ee36fd07f1a6fb4ead4c';

  const nodeProviderWallet = '0x1111111111111111111111111111111111111111';
  const commissionsWallet = '0x2222222222222222222222222222222222222222';
  const maxAllowedNodes = 625n;
  const ntCommissionsInBp = 1250n;
  const nodePrice = 1000e6;

  const setup = async () => {
    const [deployer, defaultAdmin, admin, master, user, minter] = await ethers.getSigners();

    const { erc20TestToken } = (await ignition.deploy(erc20TestTokenModule)) as unknown as {
      erc20TestToken: ERC20TestToken;
    };
    const { nodesSale } = (await ignition.deploy(nodesSaleModule, {
      parameters: {
        NodesSale: {
          owner: defaultAdmin.address,
          paymentToken: await erc20TestToken.getAddress(),
          nodeProviderWallet,
          commissionsWallet,
          maxAllowedNodes,
          ntCommissionsInBp,
          nodePrice
        }
      }
    })) as unknown as { nodesSale: NodesSale };

    await nodesSale.connect(defaultAdmin).grantRole(ADMIN_ROLE, admin.address);
    await nodesSale.connect(defaultAdmin).grantRole(MASTER_ROLE, master.address);
    await erc20TestToken.mint(user.address, parseEther('1000'));
    await erc20TestToken.mint(master.address, parseEther('1000'));

    return { nodesSale, ett: erc20TestToken, deployer, defaultAdmin, admin, master, user, minter };
  };

  describe('deployment', () => {
    it('should deploy and return initial parameters', async () => {
      const { nodesSale, ett, defaultAdmin, admin, master } = await loadFixture(setup);

      expect(await nodesSale.paymentToken()).to.equal(await ett.getAddress());
      expect(await nodesSale.nodeProviderWallet()).to.equal(nodeProviderWallet);
      expect(await nodesSale.commissionsWallet()).to.equal(commissionsWallet);
      expect(await nodesSale.ntCommissions()).to.equal(ntCommissionsInBp);
      expect(await nodesSale.getPricePerNode()).to.equal(1000e6);
      expect(await nodesSale.hasRole(DEFAULT_ADMIN_ROLE, defaultAdmin)).to.be.true;
      expect(await nodesSale.hasRole(ADMIN_ROLE, admin)).to.be.true;
      expect(await nodesSale.hasRole(MASTER_ROLE, master)).to.be.true;
    });

    it('should revert deploying if owner is zero address', async () => {
      const { erc20TestToken } = await ignition.deploy(erc20TestTokenModule);
      await expect(
        ethers.deployContract('NodesSale', [
          ethers.ZeroAddress,
          await erc20TestToken.getAddress(),
          nodeProviderWallet,
          commissionsWallet,
          maxAllowedNodes,
          ntCommissionsInBp,
          nodePrice
        ])
      ).to.be.reverted;
    });

    it('should revert deploying if token is zero address', async () => {
      const [defaultAdmin] = await ethers.getSigners();
      await expect(
        ethers.deployContract('NodesSale', [
          defaultAdmin.address,
          ethers.ZeroAddress,
          nodeProviderWallet,
          commissionsWallet,
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
        ethers.deployContract('NodesSale', [
          defaultAdmin.address,
          await erc20TestToken.getAddress(),
          ethers.ZeroAddress,
          commissionsWallet,
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
        ethers.deployContract('NodesSale', [
          defaultAdmin.address,
          await erc20TestToken.getAddress(),
          nodeProviderWallet,
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
        ethers.deployContract('NodesSale', [
          defaultAdmin.address,
          await erc20TestToken.getAddress(),
          nodeProviderWallet,
          commissionsWallet,
          0,
          ntCommissionsInBp,
          nodePrice
        ])
      ).to.be.reverted;
    });

    it('should revert deploying if commissions is zero', async () => {
      const [defaultAdmin] = await ethers.getSigners();
      const { erc20TestToken } = await ignition.deploy(erc20TestTokenModule);
      await expect(
        ethers.deployContract('NodesSale', [
          defaultAdmin.address,
          await erc20TestToken.getAddress(),
          nodeProviderWallet,
          commissionsWallet,
          maxAllowedNodes,
          0,
          nodePrice
        ])
      ).to.be.reverted;
    });

    it('should revert deploying if node price is zero', async () => {
      const [defaultAdmin] = await ethers.getSigners();
      const { erc20TestToken } = await ignition.deploy(erc20TestTokenModule);
      await expect(
        ethers.deployContract('NodesSale', [
          defaultAdmin.address,
          await erc20TestToken.getAddress(),
          nodeProviderWallet,
          commissionsWallet,
          maxAllowedNodes,
          ntCommissionsInBp,
          0
        ])
      ).to.be.reverted;
    });
  });

  describe('setIsSaleActive', () => {
    it('should set the sale active state', async () => {
      const { nodesSale, master } = await loadFixture(setup);

      await expect(nodesSale.connect(master).setIsSaleActive(true))
        .to.emit(nodesSale, 'SaleActivationSet')
        .withArgs(true);

      expect(await nodesSale.isSaleActive()).to.be.true;

      await expect(nodesSale.connect(master).setIsSaleActive(false))
        .to.emit(nodesSale, 'SaleActivationSet')
        .withArgs(false);

      expect(await nodesSale.isSaleActive()).to.be.false;
    });

    it('should revert if called by a non-master role', async () => {
      const { nodesSale, user } = await loadFixture(setup);

      await expect(nodesSale.connect(user).setIsSaleActive(true))
        .to.be.revertedWithCustomError(nodesSale, 'AccessControlUnauthorizedAccount')
        .withArgs(user.address, MASTER_ROLE);
    });
  });

  describe('setNumberOfNodes', () => {
    it('should set the number of nodes for an account', async () => {
      const { nodesSale, defaultAdmin, user } = await loadFixture(setup);

      const value = 10;
      await nodesSale.connect(defaultAdmin).setNumberOfNodes(user.address, value);
      expect(await nodesSale.getNumberOfNodes(user.address)).to.equal(value);
      expect(await nodesSale.nodeCount()).to.equal(value);

      const value2 = 7;
      await nodesSale.connect(defaultAdmin).setNumberOfNodes(user.address, value2);
      expect(await nodesSale.getNumberOfNodes(user.address)).to.equal(value2);
      expect(await nodesSale.nodeCount()).to.equal(value2);
    });

    it('should return nodes for all accounts', async () => {
      const { nodesSale, defaultAdmin, admin, master, user } = await loadFixture(setup);

      const userValue = 10;
      const masterValue = 15;
      const adminValue = 17;
      await nodesSale.connect(defaultAdmin).setNumberOfNodes(user.address, userValue);
      await nodesSale.connect(defaultAdmin).setNumberOfNodes(master.address, masterValue);
      await nodesSale.connect(defaultAdmin).setNumberOfNodes(admin.address, adminValue);

      expect(await nodesSale.nodeCount()).to.equal(userValue + masterValue + adminValue);
      expect(await nodesSale.getAccountsAndNumberOfNodes()).to.deep.equal([
        [user.address, master.address, admin.address],
        [userValue, masterValue, adminValue]
      ]);
    });

    it('should revert if the number of nodes exceeds the maximum allowed', async () => {
      const { nodesSale, defaultAdmin, user } = await loadFixture(setup);

      const maxSupply = await nodesSale.maxSupply();
      await expect(
        nodesSale.connect(defaultAdmin).setNumberOfNodes(user.address, maxSupply + 1n)
      ).to.be.revertedWithCustomError(nodesSale, 'NodesAllAllocated');
    });

    it('should revert if called by a non-admin role', async () => {
      const { nodesSale, user } = await loadFixture(setup);

      await expect(nodesSale.connect(user).setNumberOfNodes(user.address, 5))
        .to.be.revertedWithCustomError(nodesSale, 'AccessControlUnauthorizedAccount')
        .withArgs(user.address, DEFAULT_ADMIN_ROLE);
    });
  });

  describe('addMultipleNodes', () => {
    it('should add multiple nodes to an account', async () => {
      const { nodesSale, admin, user } = await loadFixture(setup);
      const numberOfNodes = 5;

      await expect(nodesSale.connect(admin).addMultipleNodes(user.address, numberOfNodes))
        .to.emit(nodesSale, 'NodesAirdropped')
        .withArgs(user.address, numberOfNodes);

      expect(await nodesSale.getNumberOfNodes(user.address)).to.equal(numberOfNodes);
    });

    it('should revert if called by a non-admin role', async () => {
      const { nodesSale, admin, user } = await loadFixture(setup);
      const numberOfNodes = 5;

      await expect(nodesSale.connect(user).addMultipleNodes(user.address, numberOfNodes))
        .to.be.revertedWithCustomError(nodesSale, 'AccessControlUnauthorizedAccount')
        .withArgs(user.address, ADMIN_ROLE);
    });
  });

  describe('purchaseNodes', () => {
    [1n, maxAllowedNodes].forEach((quantity) =>
      it(`should purchase nodes [quantity=${quantity}]`, async () => {
        const { nodesSale, ett, master, user } = await loadFixture(setup);
        const nodePrice = await nodesSale.getPricePerNode();
        const maxSupply = await nodesSale.maxSupply();

        await nodesSale.connect(master).setIsSaleActive(true);

        expect(await nodesSale.getNumberOfNodes(user.address)).to.equal(0);
        expect(await nodesSale.getAvailableNodes()).to.equal(maxSupply);

        await ett.connect(user).approve(await nodesSale.getAddress(), BigInt(quantity) * nodePrice);
        await expect(nodesSale.connect(user).purchaseNodes(quantity))
          .to.emit(nodesSale, 'NodesPurchased')
          .withArgs(user.address, quantity);

        expect(await nodesSale.getNumberOfNodes(user.address)).to.equal(quantity);
        expect(await nodesSale.nodeCount()).to.equal(quantity);
        expect(await nodesSale.getAvailableNodes()).to.equal(maxSupply - quantity);
        expect(await nodesSale.getAccounts()).to.deep.equal([user.address]);
      })
    );

    it(`should multiple users purchase nodes`, async () => {
      const { nodesSale, ett, master, user } = await loadFixture(setup);
      const nodePrice = await nodesSale.getPricePerNode();
      const maxSupply = await nodesSale.maxSupply();
      const userQuantity = 10n;
      const masterQuantity = 17n;

      await nodesSale.connect(master).setIsSaleActive(true);

      expect(await nodesSale.getAvailableNodes()).to.equal(maxSupply);

      await ett.connect(user).approve(await nodesSale.getAddress(), userQuantity * nodePrice);
      await ett.connect(master).approve(await nodesSale.getAddress(), masterQuantity * nodePrice);

      await nodesSale.connect(user).purchaseNodes(userQuantity);
      await nodesSale.connect(master).purchaseNodes(masterQuantity);

      const totalQuantity = userQuantity + masterQuantity;
      expect(await nodesSale.getNumberOfNodes(user.address)).to.equal(userQuantity);
      expect(await nodesSale.getNumberOfNodes(master.address)).to.equal(masterQuantity);
      expect(await nodesSale.nodeCount()).to.equal(totalQuantity);
      expect(await nodesSale.getAvailableNodes()).to.equal(maxSupply - totalQuantity);
      expect(await nodesSale.getAccounts()).to.deep.equal([user.address, master.address]);

      expect(await ett.balanceOf(nodeProviderWallet)).to.equal(23625e6);
      expect(await ett.balanceOf(commissionsWallet)).to.equal(3375e6);
    });

    it(`should transfer tokens to Lumia and NT wallets`, async () => {
      const { nodesSale, ett, master, user } = await loadFixture(setup);
      const nodePrice = await nodesSale.getPricePerNode();

      await nodesSale.connect(master).setIsSaleActive(true);

      await ett.connect(user).approve(await nodesSale.getAddress(), 1n * nodePrice);
      await nodesSale.connect(user).purchaseNodes(1);

      expect(await ett.balanceOf(nodeProviderWallet)).to.equal(875e6);
      expect(await ett.balanceOf(commissionsWallet)).to.equal(125e6);
    });

    it('should revert if sale inactive', async () => {
      const { nodesSale, ett, user } = await loadFixture(setup);
      const nodePrice = await nodesSale.getPricePerNode();

      await ett.connect(user).approve(await nodesSale.getAddress(), 1n * nodePrice);

      await expect(nodesSale.connect(user).purchaseNodes(1)).to.be.revertedWithCustomError(nodesSale, 'SaleNotActive');
    });

    it('should revert if purchasing zero nodes', async () => {
      const { nodesSale, master, user } = await loadFixture(setup);

      await nodesSale.connect(master).setIsSaleActive(true);

      await expect(nodesSale.connect(user).purchaseNodes(0)).to.be.revertedWithCustomError(
        nodesSale,
        'InvalidParameter'
      );
    });

    it('should revert if insufficient token balance', async () => {
      const { nodesSale, ett, defaultAdmin, master } = await loadFixture(setup);

      await nodesSale.connect(master).setIsSaleActive(true);

      expect(await ett.balanceOf(defaultAdmin.address)).to.equal(0);
      await expect(nodesSale.connect(defaultAdmin).purchaseNodes(1)).to.be.revertedWithCustomError(
        nodesSale,
        'InsufficientBalance'
      );
    });

    it('should revert if insufficient token allowance', async () => {
      const { nodesSale, ett, master, user } = await loadFixture(setup);
      const nodePrice = await nodesSale.getPricePerNode();
      const quantity = 10;

      await nodesSale.connect(master).setIsSaleActive(true);

      await ett.connect(user).approve(await nodesSale.getAddress(), BigInt(quantity) * nodePrice - 1n);
      await expect(nodesSale.connect(user).purchaseNodes(quantity)).to.be.revertedWithCustomError(
        nodesSale,
        'InsufficientAllowance'
      );
    });

    it('should revert if max allowed tokens exceeded', async () => {
      const { nodesSale, ett, master, user } = await loadFixture(setup);
      const nodePrice = await nodesSale.getPricePerNode();
      const maxSupply = await nodesSale.maxSupply();
      const quantity = maxSupply + 1n;

      await nodesSale.connect(master).setIsSaleActive(true);

      await ett.connect(user).approve(await nodesSale.getAddress(), BigInt(quantity) * nodePrice);
      await expect(nodesSale.connect(user).purchaseNodes(quantity)).to.be.revertedWithCustomError(
        nodesSale,
        'NodesAllAllocated'
      );
    });
  });
});
