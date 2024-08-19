import '@nomicfoundation/hardhat-ethers';
import '@nomicfoundation/hardhat-toolbox';
import '@nomicfoundation/hardhat-verify';
import '@openzeppelin/hardhat-upgrades';
import * as dotenv from 'dotenv';
import 'hardhat-abi-exporter';
import 'hardhat-contract-sizer';
import 'hardhat-docgen';
import 'hardhat-gas-reporter';
import 'hardhat-tracer';
import { HardhatUserConfig } from 'hardhat/config';
import { env } from 'process';

dotenv.config();

const config: HardhatUserConfig = {
  abiExporter: {
    path: './abi',
    clear: true,
    except: ['@openzeppelin'],
    spacing: 2,
    format: 'json'
  },
  docgen: {
    path: './docs',
    clear: true,
    runOnCompile: false,
    except: ['^contracts/test']
  },
  etherscan: {
    apiKey: {
      mainnet: env.ETHERSCAN_API_KEY!,
      sepolia: env.ETHERSCAN_API_KEY!,
      arbitrumOne: env.ARBISCAN_API_KEY!,
      arbitrumSepolia: env.ARBISCAN_API_KEY!,
      polygon: env.POLYGONSCAN_API_KEY!,
      amoy: env.POLYGONSCAN_API_KEY!,
      base: env.BASESCAN_API_KEY!
    },
    customChains: [
      {
        network: 'amoy',
        chainId: 80002,
        urls: {
          apiURL: 'https://api-amoy.polygonscan.com/api',
          browserURL: 'https://amoy.polygonscan.com/'
        }
      }
    ]
  },
  gasReporter: {
    coinmarketcap: env.COINMARKETCAP_API_KEY,
    enabled: env.REPORT_GAS?.toLowerCase() === 'true',
    showTimeSpent: true
  },
  networks: {
    mainnet: {
      url: env.MAINNET_RPC_URL || '',
      chainId: 1,
      accounts: !!env.MAINNET_WALLET_PRIVATE_KEY ? [env.MAINNET_WALLET_PRIVATE_KEY] : []
    },
    sepolia: {
      url: env.SEPOLIA_RPC_URL || '',
      chainId: 11155111,
      accounts: !!env.TESTNET_WALLET_PRIVATE_KEY ? [env.TESTNET_WALLET_PRIVATE_KEY] : []
    },
    arbitrumOne: {
      url: env.ARBITRUMONE_RPC_URL,
      chainId: 42161,
      accounts: !!env.MAINNET_WALLET_PRIVATE_KEY ? [env.MAINNET_WALLET_PRIVATE_KEY] : []
    },
    arbitrumSepolia: {
      url: env.ARBITRUMSEPOLIA_RPC_URL,
      chainId: 421614,
      accounts: !!env.TESTNET_WALLET_PRIVATE_KEY ? [env.TESTNET_WALLET_PRIVATE_KEY] : []
    },
    polygon: {
      url: env.POLYGON_RPC_URL,
      chainId: 137,
      accounts: !!env.MAINNET_WALLET_PRIVATE_KEY ? [env.MAINNET_WALLET_PRIVATE_KEY] : []
    },
    amoy: {
      url: env.AMOY_RPC_URL,
      chainId: 80002,
      accounts: !!env.TESTNET_WALLET_PRIVATE_KEY ? [env.TESTNET_WALLET_PRIVATE_KEY] : []
      // ignition: {
      //   maxFeePerGasLimit: 500_000_000_000n, // 50 gwei
      //   maxPriorityFeePerGas: 20_000_000_000n // 2 gwei
      // }
    },
    base: {
      url: env.BASE_RPC_URL,
      chainId: 8453,
      accounts: !!env.MAINNET_WALLET_PRIVATE_KEY ? [env.MAINNET_WALLET_PRIVATE_KEY] : []
    },
    baseSepolia: {
      url: env.BASESEPOLIA_RPC_URL,
      chainId: 84532,
      accounts: !!env.TESTNET_WALLET_PRIVATE_KEY ? [env.TESTNET_WALLET_PRIVATE_KEY] : []
    },
    bsc: {
      url: env.BSC_RPC_URL,
      chainId: 56,
      accounts: !!env.MAINNET_WALLET_PRIVATE_KEY ? [env.MAINNET_WALLET_PRIVATE_KEY] : []
    },
    bscTestnet: {
      url: env.BSCTESTNET_RPC_URL,
      chainId: 97,
      accounts: !!env.TESTNET_WALLET_PRIVATE_KEY ? [env.TESTNET_WALLET_PRIVATE_KEY] : []
    }
  },
  paths: {
    sources: './contracts',
    tests: './test',
    cache: './cache',
    artifacts: './artifacts'
  },
  solidity: {
    compilers: [
      {
        version: '0.8.24',
        settings: {
          optimizer: {
            enabled: true,
            runs: 200
          }
        }
      }
    ],
    settings: {
      optimizer: {
        enabled: true
      },
      outputSelection: {
        '*': {
          '*': ['storageLayout']
        }
      }
    }
  },
  mocha: {
    timeout: 100000000
  }
};

export default config;
