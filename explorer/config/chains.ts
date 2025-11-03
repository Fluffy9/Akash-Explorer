import { createAssetListFromEthereumChainInfo, createChainFromEthereumChainInfo } from '@/utils/eth-test-net';
import {
  chains as allChains,
  assetLists as allAssetLists,
} from '@chain-registry/v2'

const chainNames = ['akash'
];

let chains = chainNames.map(
  (chainName) => allChains.find((chain) => chain.chainName === chainName)!,
)

let assetLists = chainNames.map(
  (chainName) =>
    allAssetLists.find((assetList) => assetList.chainName === chainName)!,
)

chains = [...chains]
assetLists = [...assetLists]

console.log('chains', chains);
console.log('assetLists', assetLists)
export {
  chains,
  assetLists
}
