# ERC20VestingContract

This is a ERC20 token linear vesting contract. Initially we deployed 100 million tokens (with decimal 18) and 30% of initial deployed tokens is transferred to the vesting contract . This vesting contract has 3 roles (Advisors,Partners,mentors) and 5% TGE for advisors, 10% TGE is for partners, 15% TGE is for Mentors.

After adding all the beneficiary roles to the contract, owner can start the vesting with provided cliff and duration . And after the cliff owner can withdraw vested tokens for a specific role. 


# Deployed Contract 

Contract is deployed at Rinkeby Network

1) Vesting contract is deployed at (0xfE7D6B6d35072598a10A062689d8248F2726eE9b) . verified contract [etherscan link](https://rinkeby.etherscan.io/address/0xfE7D6B6d35072598a10A062689d8248F2726eE9b#code)

2) ERC20 token contract is deployed at (0x5a32ECA9ABeD9Ae0107E62e21B7D2F8768910411) . verified contract [etherscan link](https://rinkeby.etherscan.io/address/0x5a32ECA9ABeD9Ae0107E62e21B7D2F8768910411#code)

# Run tests

To run all the tests for the vesting contract 

run :- npx hardhat test (from root directory)
