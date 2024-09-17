import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers';
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import { parseEther, ZeroAddress } from 'ethers';
import { ethers, ignition } from 'hardhat';
import nodesSaleModule from '../ignition/modules/NodesSale';
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
  const commonWalletCap = 20n;

  const setupWithErc20 = async () => {
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
          nodePrice,
          commonCap: commonWalletCap
        }
      }
    })) as unknown as { nodesSale: NodesSale };

    await nodesSale.connect(defaultAdmin).grantRole(ADMIN_ROLE, admin.address);
    await nodesSale.connect(defaultAdmin).grantRole(MASTER_ROLE, master.address);
    await erc20TestToken.mint(user.address, parseEther('1000'));
    await erc20TestToken.mint(master.address, parseEther('1000'));

    return { nodesSale, ett: erc20TestToken, deployer, defaultAdmin, admin, master, user, minter };
  };

  const setupWithEth = async () => {
    const [deployer, defaultAdmin, admin, master, user, minter] = await ethers.getSigners();

    const { nodesSale } = (await ignition.deploy(nodesSaleModule, {
      parameters: {
        NodesSale: {
          owner: defaultAdmin.address,
          paymentToken: ZeroAddress,
          nodeProviderWallet,
          commissionsWallet,
          maxAllowedNodes,
          ntCommissionsInBp,
          nodePrice,
          commonCap: commonWalletCap
        }
      }
    })) as unknown as { nodesSale: NodesSale };

    await nodesSale.connect(defaultAdmin).grantRole(ADMIN_ROLE, admin.address);
    await nodesSale.connect(defaultAdmin).grantRole(MASTER_ROLE, master.address);

    return { nodesSale, deployer, defaultAdmin, admin, master, user, minter };
  };

  describe('deployment', () => {
    it('should deploy and return initial parameters', async () => {
      const { nodesSale, ett, defaultAdmin, admin, master } = await loadFixture(setupWithErc20);

      expect(await nodesSale.paymentToken()).to.equal(await ett.getAddress());
      expect(await nodesSale.nodeProviderWallet()).to.equal(nodeProviderWallet);
      expect(await nodesSale.commissionsWallet()).to.equal(commissionsWallet);
      expect(await nodesSale.ntCommissions()).to.equal(ntCommissionsInBp);
      expect(await nodesSale.getPricePerNode()).to.equal(1000e6);
      expect(await nodesSale.hasRole(DEFAULT_ADMIN_ROLE, defaultAdmin)).to.be.true;
      expect(await nodesSale.hasRole(ADMIN_ROLE, admin)).to.be.true;
      expect(await nodesSale.hasRole(MASTER_ROLE, master)).to.be.true;
      expect(await nodesSale.commonWalletCap()).to.equal(commonWalletCap);
    });

    it('should revert deploying if owner is zero address', async () => {
      const { erc20TestToken } = await ignition.deploy(erc20TestTokenModule);
      await expect(
        ethers.deployContract('NodesSale', [
          ZeroAddress,
          await erc20TestToken.getAddress(),
          nodeProviderWallet,
          commissionsWallet,
          maxAllowedNodes,
          ntCommissionsInBp,
          nodePrice,
          commonWalletCap
        ])
      ).to.be.reverted;
    });

    it('should revert deploying if node provider wallet address is zero address', async () => {
      const [defaultAdmin] = await ethers.getSigners();
      const { erc20TestToken } = await ignition.deploy(erc20TestTokenModule);
      await expect(
        ethers.deployContract('NodesSale', [
          defaultAdmin.address,
          await erc20TestToken.getAddress(),
          ZeroAddress,
          commissionsWallet,
          maxAllowedNodes,
          ntCommissionsInBp,
          nodePrice,
          commonWalletCap
        ])
      ).to.be.reverted;
    });

    it('should revert deploying if NT wallet address is zero address', async () => {
      const [defaultAdmin] = await ethers.getSigners();
      const { erc20TestToken } = await ignition.deploy(erc20TestTokenModule);
      await expect(
        ethers.deployContract('NodesSale', [
          defaultAdmin.address,
          await erc20TestToken.getAddress(),
          nodeProviderWallet,
          ZeroAddress,
          maxAllowedNodes,
          ntCommissionsInBp,
          nodePrice,
          commonWalletCap
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
          nodePrice,
          commonWalletCap
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
          nodePrice,
          commonWalletCap
        ])
      ).to.be.reverted;
    });

    it('should revert deploying if commissions is equal to 100%', async () => {
      const [defaultAdmin] = await ethers.getSigners();
      const { erc20TestToken } = await ignition.deploy(erc20TestTokenModule);
      await expect(
        ethers.deployContract('NodesSale', [
          defaultAdmin.address,
          await erc20TestToken.getAddress(),
          nodeProviderWallet,
          commissionsWallet,
          maxAllowedNodes,
          10000,
          nodePrice,
          commonWalletCap
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
          0,
          commonWalletCap
        ])
      ).to.be.reverted;
    });
  });

  describe('setIsSaleActive', () => {
    it('should set the sale active state', async () => {
      const { nodesSale, master } = await loadFixture(setupWithErc20);

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
      const { nodesSale, user } = await loadFixture(setupWithErc20);

      await expect(nodesSale.connect(user).setIsSaleActive(true))
        .to.be.revertedWithCustomError(nodesSale, 'AccessControlUnauthorizedAccount')
        .withArgs(user.address, MASTER_ROLE);
    });
  });

  describe('setNumberOfNodes', () => {
    it('should set the number of nodes for an account', async () => {
      const { nodesSale, defaultAdmin, user } = await loadFixture(setupWithErc20);

      const value = 10;
      await nodesSale.connect(defaultAdmin).setNumberOfNodes(user.address, value);
      expect(await nodesSale.getNumberOfNodes(user.address)).to.equal(value);
      expect(await nodesSale.nodeCount()).to.equal(value);

      const value2 = 7;
      await nodesSale.connect(defaultAdmin).setNumberOfNodes(user.address, value2);
      expect(await nodesSale.getNumberOfNodes(user.address)).to.equal(value2);
      expect(await nodesSale.nodeCount()).to.equal(value2);
    });

    describe('when nodes are set to accounts', async () => {
      const userValue = 10;
      const masterValue = 15;
      const adminValue = 17;
      let nodesSale: NodesSale;
      let defaultAdmin: SignerWithAddress;
      let admin: SignerWithAddress;
      let master: SignerWithAddress;
      let user: SignerWithAddress;

      before(async () => {
        ({ nodesSale, defaultAdmin, admin, master, user } = await loadFixture(setupWithErc20));
        await nodesSale.connect(defaultAdmin).setNumberOfNodes(user.address, userValue);
        await nodesSale.connect(defaultAdmin).setNumberOfNodes(master.address, masterValue);
        await nodesSale.connect(defaultAdmin).setNumberOfNodes(admin.address, adminValue);
      });

      it('should total accounts number be equal to accounts holding nodes', async () => {
        expect(await nodesSale.getAccountsCount()).to.equal(3n);
      });

      it('should total node count be a sum of all accounts', async () => {
        expect(await nodesSale.nodeCount()).to.equal(userValue + masterValue + adminValue);
      });

      it('should return empty arrays if count is equal to 0', async () => {
        expect(await nodesSale.getAccountsAndNumberOfNodes(0n, 0n)).to.deep.equal([[], []]);
      });

      it('should return all accounts if `count` is equal to total count', async () => {
        expect(await nodesSale.getAccountsAndNumberOfNodes(0n, 3n)).to.deep.equal([
          [user.address, master.address, admin.address],
          [userValue, masterValue, adminValue]
        ]);
      });

      it('should return all accounts if `count` is greater than total count', async () => {
        expect(await nodesSale.getAccountsAndNumberOfNodes(0n, 4n)).to.deep.equal([
          [user.address, master.address, admin.address],
          [userValue, masterValue, adminValue]
        ]);
      });

      it('should return `count` accounts if it is lower than total count', async () => {
        expect(await nodesSale.getAccountsAndNumberOfNodes(0n, 2n)).to.deep.equal([
          [user.address, master.address],
          [userValue, masterValue]
        ]);
      });

      it('should return accounts if start index is greater than 0', async () => {
        expect(await nodesSale.getAccountsAndNumberOfNodes(1n, 1n)).to.deep.equal([[master.address], [masterValue]]);
      });

      it('should revert if start index is equal to total count', async () => {
        await expect(nodesSale.getAccountsAndNumberOfNodes(3n, 1n)).to.be.revertedWithCustomError(
          nodesSale,
          'InvalidParameter'
        );
      });
    });

    it('should revert if the number of nodes exceeds the maximum allowed', async () => {
      const { nodesSale, defaultAdmin, user } = await loadFixture(setupWithErc20);

      const maxSupply = await nodesSale.maxSupply();
      await expect(
        nodesSale.connect(defaultAdmin).setNumberOfNodes(user.address, maxSupply + 1n)
      ).to.be.revertedWithCustomError(nodesSale, 'NodesAllAllocated');
    });

    it('should revert if called by a non-admin role', async () => {
      const { nodesSale, user } = await loadFixture(setupWithErc20);

      await expect(nodesSale.connect(user).setNumberOfNodes(user.address, 5))
        .to.be.revertedWithCustomError(nodesSale, 'AccessControlUnauthorizedAccount')
        .withArgs(user.address, DEFAULT_ADMIN_ROLE);
    });
  });

  describe('setNodeProviderWallet', () => {
    it('should change node provider wallet address', async () => {
      const { nodesSale, defaultAdmin } = await loadFixture(setupWithErc20);

      const newWallet = ethers.HDNodeWallet.createRandom().address;
      await expect(nodesSale.connect(defaultAdmin).setNodeProviderWallet(newWallet))
        .to.emit(nodesSale, 'NodeProviderWalletChanged')
        .withArgs(await defaultAdmin.getAddress(), newWallet);
    });

    it('should revert if called by a non-defaultadmin role', async () => {
      const { nodesSale, user } = await loadFixture(setupWithErc20);

      const newWallet = ethers.HDNodeWallet.createRandom().address;
      await expect(nodesSale.connect(user).setNodeProviderWallet(newWallet))
        .to.be.revertedWithCustomError(nodesSale, 'AccessControlUnauthorizedAccount')
        .withArgs(user.address, DEFAULT_ADMIN_ROLE);
    });

    it('should revert if new wallet address is zero address', async () => {
      const { nodesSale, defaultAdmin } = await loadFixture(setupWithErc20);

      await expect(nodesSale.connect(defaultAdmin).setNodeProviderWallet(ZeroAddress)).to.be.revertedWithCustomError(
        nodesSale,
        'ZeroAddress'
      );
    });
  });

  describe('setCommissionsWallet', () => {
    it('should change node provider wallet address', async () => {
      const { nodesSale, defaultAdmin } = await loadFixture(setupWithErc20);

      const newWallet = ethers.HDNodeWallet.createRandom().address;
      await expect(nodesSale.connect(defaultAdmin).setCommissionsWallet(newWallet))
        .to.emit(nodesSale, 'CommissionsWalletChanged')
        .withArgs(await defaultAdmin.getAddress(), newWallet);
    });

    it('should revert if called by a non-defaultadmin role', async () => {
      const { nodesSale, user } = await loadFixture(setupWithErc20);

      const newWallet = ethers.HDNodeWallet.createRandom().address;
      await expect(nodesSale.connect(user).setCommissionsWallet(newWallet))
        .to.be.revertedWithCustomError(nodesSale, 'AccessControlUnauthorizedAccount')
        .withArgs(user.address, DEFAULT_ADMIN_ROLE);
    });

    it('should revert if new wallet address is zero address', async () => {
      const { nodesSale, defaultAdmin } = await loadFixture(setupWithErc20);

      await expect(nodesSale.connect(defaultAdmin).setCommissionsWallet(ZeroAddress)).to.be.revertedWithCustomError(
        nodesSale,
        'ZeroAddress'
      );
    });
  });

  describe('addMultipleNodes', () => {
    it('should add multiple nodes to an account', async () => {
      const { nodesSale, admin, user } = await loadFixture(setupWithErc20);
      const numberOfNodes = 5;

      await expect(nodesSale.connect(admin).addMultipleNodes(user.address, numberOfNodes))
        .to.emit(nodesSale, 'NodesAirdropped')
        .withArgs(user.address, numberOfNodes);

      expect(await nodesSale.getNumberOfNodes(user.address)).to.equal(numberOfNodes);
    });

    it('should revert if called by a non-admin role', async () => {
      const { nodesSale, user } = await loadFixture(setupWithErc20);
      const numberOfNodes = 5;

      await expect(nodesSale.connect(user).addMultipleNodes(user.address, numberOfNodes))
        .to.be.revertedWithCustomError(nodesSale, 'AccessControlUnauthorizedAccount')
        .withArgs(user.address, ADMIN_ROLE);
    });
  });

  describe('setMaxSupply', () => {
    [
      { nodes: 10, maxSupply: 10 },
      { nodes: 10, maxSupply: 11 }
    ].forEach((data) => {
      it('should change max supply if value equal or higher than total nodes number', async () => {
        const { nodesSale, admin } = await loadFixture(setupWithErc20);

        await nodesSale.connect(admin).addMultipleNodes(await admin.getAddress(), data.nodes);
        await expect(nodesSale.connect(admin).setMaxSupply(data.maxSupply))
          .to.emit(nodesSale, 'MaxSupplyChanged')
          .withArgs(await admin.getAddress(), data.maxSupply);

        expect(await nodesSale.maxSupply()).to.equal(data.maxSupply);
      });
    });

    it('should revert changing max supply if value lower than already sold', async () => {
      const { nodesSale, admin } = await loadFixture(setupWithErc20);

      const nodesPurchased = 10;
      const newMaxSupply = nodesPurchased - 1;

      await nodesSale.connect(admin).addMultipleNodes(await admin.getAddress(), nodesPurchased);
      await expect(nodesSale.connect(admin).setMaxSupply(newMaxSupply)).to.be.revertedWithCustomError(
        nodesSale,
        'InvalidParameter'
      );
    });

    it('should revert changing max supply if called by a non-admin role', async () => {
      const { nodesSale, admin, user } = await loadFixture(setupWithErc20);

      const nodesPurchased = 10;
      const newMaxSupply = nodesPurchased - 1;

      await nodesSale.connect(admin).addMultipleNodes(await admin.getAddress(), nodesPurchased);
      await expect(nodesSale.connect(user).setMaxSupply(newMaxSupply))
        .to.be.revertedWithCustomError(nodesSale, 'AccessControlUnauthorizedAccount')
        .withArgs(user.address, ADMIN_ROLE);
    });
  });

  describe('setPricePerNode', () => {
    it('should change node price', async () => {
      const { nodesSale, admin } = await loadFixture(setupWithErc20);

      const newPrice = 3000e6;
      await expect(nodesSale.connect(admin).setPricePerNode(newPrice))
        .to.emit(nodesSale, 'NodePriceChanged')
        .withArgs(await admin.getAddress(), newPrice);

      expect(await nodesSale.getPricePerNode()).to.equal(newPrice);
    });

    it('should revert changing node price if value is equal to zero', async () => {
      const { nodesSale, admin } = await loadFixture(setupWithErc20);

      await expect(nodesSale.connect(admin).setPricePerNode(0)).to.be.revertedWithCustomError(
        nodesSale,
        'InvalidParameter'
      );
    });

    it('should revert changing node price if called by a non-admin role', async () => {
      const { nodesSale, user } = await loadFixture(setupWithErc20);

      const newPrice = 3000e6;
      await expect(nodesSale.connect(user).setPricePerNode(newPrice))
        .to.be.revertedWithCustomError(nodesSale, 'AccessControlUnauthorizedAccount')
        .withArgs(user.address, ADMIN_ROLE);
    });
  });

  describe('setCommonWalletCap', () => {
    it('should change common wallet cap', async () => {
      const { nodesSale, admin } = await loadFixture(setupWithErc20);

      const newCap = 30n;
      await expect(nodesSale.connect(admin).setCommonWalletCap(newCap))
        .to.emit(nodesSale, 'CommonWalletCapChanged')
        .withArgs(await admin.getAddress(), newCap);

      expect(await nodesSale.commonWalletCap()).to.equal(newCap);
      expect(await nodesSale.getWalletCap(admin.address)).to.equal(newCap);
    });

    it('should revert changing common wallet cap if called by a non-admin role', async () => {
      const { nodesSale, user } = await loadFixture(setupWithErc20);

      const newCap = 30n;
      await expect(nodesSale.connect(user).setCommonWalletCap(newCap))
        .to.be.revertedWithCustomError(nodesSale, 'AccessControlUnauthorizedAccount')
        .withArgs(user.address, ADMIN_ROLE);
    });
  });

  describe('setSingleWalletCap', () => {
    it('should change single wallet cap', async () => {
      const { nodesSale, admin, user } = await loadFixture(setupWithErc20);

      expect(await nodesSale.getWalletCap(user.address)).to.equal(commonWalletCap);

      const newCap = 30n;
      await expect(nodesSale.connect(admin).setSingleWalletCap([user.address, admin.address], newCap))
        .to.emit(nodesSale, 'SingleWalletCapChanged')
        .withArgs(await admin.getAddress(), user.address, newCap);

      expect(await nodesSale.getWalletCap(user.address)).to.equal(newCap);
      expect(await nodesSale.getWalletCap(admin.address)).to.equal(newCap);
    });

    it('should revert changing single wallet cap if called by a non-admin role', async () => {
      const { nodesSale, user } = await loadFixture(setupWithErc20);

      await expect(nodesSale.connect(user).setSingleWalletCap([user.address], 30n))
        .to.be.revertedWithCustomError(nodesSale, 'AccessControlUnauthorizedAccount')
        .withArgs(user.address, ADMIN_ROLE);
    });

    it('should revert changing single wallet cap if no wallet passed', async () => {
      const { nodesSale, admin } = await loadFixture(setupWithErc20);

      await expect(nodesSale.connect(admin).setSingleWalletCap([], 30n)).to.be.revertedWithCustomError(
        nodesSale,
        'InvalidParameter'
      );
    });
  });

  describe('purchaseNodes', () => {
    [1n, commonWalletCap].forEach((quantity) =>
      it(`should purchase nodes [quantity=${quantity}]`, async () => {
        const { nodesSale, ett, master, user } = await loadFixture(setupWithErc20);
        const nodePrice = await nodesSale.getPricePerNode();
        const maxSupply = await nodesSale.maxSupply();

        await nodesSale.connect(master).setIsSaleActive(true);

        expect(await nodesSale.getNumberOfNodes(user.address)).to.equal(0);
        expect(await nodesSale.getAvailableNodes()).to.equal(maxSupply);

        await ett.connect(user).approve(await nodesSale.getAddress(), quantity * nodePrice);
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
      const { nodesSale, ett, master, user } = await loadFixture(setupWithErc20);
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

    it(`should transfer tokens to node provider and NT wallets`, async () => {
      const { nodesSale, ett, master, user } = await loadFixture(setupWithErc20);
      const nodePrice = await nodesSale.getPricePerNode();

      await nodesSale.connect(master).setIsSaleActive(true);

      await ett.connect(user).approve(await nodesSale.getAddress(), 1n * nodePrice);
      await nodesSale.connect(user).purchaseNodes(1);

      expect(await ett.balanceOf(nodeProviderWallet)).to.equal(875e6);
      expect(await ett.balanceOf(commissionsWallet)).to.equal(125e6);
    });

    it('should revert if sale inactive', async () => {
      const { nodesSale, ett, user } = await loadFixture(setupWithErc20);
      const nodePrice = await nodesSale.getPricePerNode();

      await ett.connect(user).approve(await nodesSale.getAddress(), 1n * nodePrice);

      await expect(nodesSale.connect(user).purchaseNodes(1)).to.be.revertedWithCustomError(nodesSale, 'SaleNotActive');
    });

    it('should revert if common cap is exceeded', async () => {
      const { nodesSale, ett, master, user } = await loadFixture(setupWithErc20);
      const nodePrice = await nodesSale.getPricePerNode();

      await nodesSale.connect(master).setIsSaleActive(true);

      const quantity = commonWalletCap + 1n;
      await ett.connect(user).approve(await nodesSale.getAddress(), quantity * nodePrice);
      await expect(nodesSale.connect(user).purchaseNodes(quantity)).to.be.revertedWithCustomError(
        nodesSale,
        'WalletCapExceeded'
      );
    });

    it('should revert if purchasing zero nodes', async () => {
      const { nodesSale, master, user } = await loadFixture(setupWithErc20);

      await nodesSale.connect(master).setIsSaleActive(true);

      await expect(nodesSale.connect(user).purchaseNodes(0)).to.be.revertedWithCustomError(
        nodesSale,
        'InvalidParameter'
      );
    });

    it('should revert if insufficient token balance', async () => {
      const { nodesSale, ett, defaultAdmin, master } = await loadFixture(setupWithErc20);

      await nodesSale.connect(master).setIsSaleActive(true);

      expect(await ett.balanceOf(defaultAdmin.address)).to.equal(0);
      await expect(nodesSale.connect(defaultAdmin).purchaseNodes(1)).to.be.revertedWithCustomError(
        nodesSale,
        'InsufficientBalance'
      );
    });

    it('should revert if insufficient token allowance', async () => {
      const { nodesSale, ett, master, user } = await loadFixture(setupWithErc20);
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
      const { nodesSale, ett, admin, master, user } = await loadFixture(setupWithErc20);
      const nodePrice = await nodesSale.getPricePerNode();
      const maxSupply = 10n;
      const quantity = maxSupply + 1n;

      await nodesSale.connect(admin).setMaxSupply(maxSupply);
      await nodesSale.connect(master).setIsSaleActive(true);

      await ett.connect(user).approve(await nodesSale.getAddress(), BigInt(quantity) * nodePrice);
      await expect(nodesSale.connect(user).purchaseNodes(quantity)).to.be.revertedWithCustomError(
        nodesSale,
        'NodesAllAllocated'
      );
    });

    [1n, commonWalletCap].forEach((quantity) => {
      it(`should purchase nodes with ETH [quantity=${quantity}]`, async () => {
        const { nodesSale, master, user } = await loadFixture(setupWithEth);
        const nodePrice = await nodesSale.getPricePerNode();
        const maxSupply = await nodesSale.maxSupply();

        await nodesSale.connect(master).setIsSaleActive(true);

        expect(await nodesSale.getNumberOfNodes(user.address)).to.equal(0);
        expect(await nodesSale.getAvailableNodes()).to.equal(maxSupply);

        await expect(nodesSale.connect(user).purchaseNodes(quantity, { value: quantity * nodePrice }))
          .to.emit(nodesSale, 'NodesPurchased')
          .withArgs(user.address, quantity);

        expect(await nodesSale.getNumberOfNodes(user.address)).to.equal(quantity);
        expect(await nodesSale.nodeCount()).to.equal(quantity);
        expect(await nodesSale.getAvailableNodes()).to.equal(maxSupply - quantity);
        expect(await nodesSale.getAccounts()).to.deep.equal([user.address]);
      });
    });

    it('should transfer ETH to node provider and NT wallets', async () => {
      const { nodesSale, master, user } = await loadFixture(setupWithEth);
      const nodePrice = await nodesSale.getPricePerNode();

      await nodesSale.connect(master).setIsSaleActive(true);
      await nodesSale.connect(user).purchaseNodes(1n, { value: nodePrice });

      expect(await ethers.provider.getBalance(nodeProviderWallet)).to.equal(875e6);
      expect(await ethers.provider.getBalance(commissionsWallet)).to.equal(125e6);
    });

    it('should transfer redundant ETH back to sender', async () => {
      const { nodesSale, master, user } = await loadFixture(setupWithEth);
      const nodePrice = await nodesSale.getPricePerNode();
      const userBalance = await ethers.provider.getBalance(user.address);

      const totalCost = nodePrice;
      const overpayment = 100n;
      const valueSent = totalCost + overpayment;

      await nodesSale.connect(master).setIsSaleActive(true);
      const tx = await nodesSale.connect(user).purchaseNodes(1n, { value: valueSent });
      const receipt = await tx.wait();

      expect(await ethers.provider.getBalance(user.address)).to.equal(userBalance - receipt!.fee - totalCost);
    });

    it('should revert transfering redundant ETH back to sender if ETH transfer fails', async () => {
      const { nodesSale, master, user } = await loadFixture(setupWithEth);
      const walletMock = await ethers.deployContract('WalletMock', []);
      const nodePrice = await nodesSale.getPricePerNode();

      const totalCost = nodePrice;
      const overpayment = 100n;
      const valueSent = totalCost + overpayment;

      await nodesSale.connect(master).setIsSaleActive(true);
      const calldata = nodesSale.interface.encodeFunctionData('purchaseNodes', [1n]);

      await expect(
        walletMock.connect(user).callFunction(await nodesSale.getAddress(), calldata, { value: valueSent })
      ).to.be.revertedWithCustomError(walletMock, 'TransferFailed');
    });

    it('should revert if node provider wallet reverts ETH transfer', async () => {
      const [defaultAdmin, admin, master, user] = await ethers.getSigners();
      const walletMock = await ethers.deployContract('WalletMock', []);

      const nodesSale = await ethers.deployContract('NodesSale', [
        await defaultAdmin.getAddress(),
        ZeroAddress,
        await walletMock.getAddress(),
        commissionsWallet,
        maxAllowedNodes,
        ntCommissionsInBp,
        nodePrice,
        commonWalletCap
      ]);
      await nodesSale.connect(defaultAdmin).grantRole(ADMIN_ROLE, admin.address);
      await nodesSale.connect(defaultAdmin).grantRole(MASTER_ROLE, master.address);

      await nodesSale.connect(master).setIsSaleActive(true);
      await expect(nodesSale.connect(user).purchaseNodes(1n, { value: nodePrice })).to.be.revertedWithCustomError(
        nodesSale,
        'TransferFailed'
      );
    });

    it('should revert if commissions wallet reverts ETH transfer', async () => {
      const [defaultAdmin, admin, master, user] = await ethers.getSigners();
      const walletMock = await ethers.deployContract('WalletMock', []);

      const nodesSale = await ethers.deployContract('NodesSale', [
        await defaultAdmin.getAddress(),
        ZeroAddress,
        nodeProviderWallet,
        await walletMock.getAddress(),
        maxAllowedNodes,
        ntCommissionsInBp,
        nodePrice,
        commonWalletCap
      ]);
      await nodesSale.connect(defaultAdmin).grantRole(ADMIN_ROLE, admin.address);
      await nodesSale.connect(defaultAdmin).grantRole(MASTER_ROLE, master.address);

      await nodesSale.connect(master).setIsSaleActive(true);
      await expect(nodesSale.connect(user).purchaseNodes(1n, { value: nodePrice })).to.be.revertedWithCustomError(
        nodesSale,
        'TransferFailed'
      );
    });

    it('should revert if insufficient ETH sent', async () => {
      const { nodesSale, master, user } = await loadFixture(setupWithEth);
      const nodePrice = await nodesSale.getPricePerNode();

      await nodesSale.connect(master).setIsSaleActive(true);

      await expect(nodesSale.connect(user).purchaseNodes(1n, { value: nodePrice - 1n })).to.be.revertedWithCustomError(
        nodesSale,
        'InsufficientBalance'
      );
    });
  });
});
