const { BigNumber } = require("ethers");

async function main() {
  const initialTokenSupply = 100000000; //100 million

  const [deployer] = await ethers.getSigners();
  Token = await ethers.getContractFactory("MyERC20Token");
  Vesting = await ethers.getContractFactory("ERC20Vesting");
  token = await Token.deploy("MyToken", "MT", initialTokenSupply);
  vesting = await Vesting.deploy(token.address);

  //send the (5% for advisor, 10% for partners,15% for mentors)30% of initial supply to the vesting contract
  //it's already defined in the contract,how much a group of people have tokens as vested
  const totalSupply = await token.totalSupply();

  //30% of token amount is for vesting
  const vestedTokenAmount = BigNumber.from(totalSupply)
    .mul(BigNumber.from(30))
    .div(BigNumber.from(100));
  //send the token to the vesting contract

  await token.transfer(vesting.address, vestedTokenAmount);

  console.log("Deploying contracts with the account:", deployer.address);

  console.log("Account balance:", (await deployer.getBalance()).toString());

  console.log("Vesting address:", vesting.address);
  console.log("token address:", token.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
