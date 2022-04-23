const { expect } = require("chai");
const { BigNumber } = require("ethers");
const { ethers } = require("hardhat");

describe("MyERC20vesting Contract", () => {
  let deployer;
  let addr1;
  let addr2;
  let addrs;
  let Token;
  let Vesting;
  let token;
  let vesting;

  const initialTokenSupply = 100000000; //100 million

  //cliff of vesting contract 2 days
  const cliff = 24 * 60 * 60 * 2; //2 days cliff in seconds
  //duration of Linear vesting 10 days
  const duration = 24 * 60 * 60 * 10;

  //roles = 0(advisors),1(partners),2(mentors)

  const addAllBeneficiariesRoles = async (addrs) => {
    //adding 5 addresses in each role
    for (let i = 0; i < 15; i++) {
      if (i < 5) {
        // role 0 = advisor
        await vesting.addBeneficiary(addrs[i].address, 0);
      } else if (i < 10) {
        // role 1 = partner
        vesting.addBeneficiary(addrs[i].address, 1);
      } else {
        //role 2 = mentor
        vesting.addBeneficiary(addrs[i].address, 2);
      }
    }
  };

  beforeEach(async () => {
    [deployer, addr1, addr2, ...addrs] = await ethers.getSigners();
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
  });

  it("Contract have all the Tokens it needed for vesting", async () => {
    //currently we have 3 roles (advisor, partners,mentors)
    const totalRoles = 3;
    let vestedTokensForAllRoles = BigNumber.from(0);

    for (let i = 0; i < totalRoles; i++) {
      const tokenVested = await vesting.totalTokensForRole(i);

      vestedTokensForAllRoles = BigNumber.from(vestedTokensForAllRoles).add(
        BigNumber.from(tokenVested)
      );
    }

    //contract token balance
    const balance = await token.balanceOf(vesting.address);
    //contract token balance should be equal to the total vested tokens for all roles
    expect(balance).to.equal(vestedTokensForAllRoles);
  });

  it("Only owner should be able to add beneficiaries", async () => {
    //try to add beneficiary of role(0) from other account
    await expect(
      vesting.connect(addr1).addBeneficiary(addrs[0].address, 0)
    ).to.be.revertedWith("Ownable: caller is not the owner");
  });

  it("Should be able to add beneficiary", async () => {
    //add a beneficiary of role 0

    await expect(vesting.addBeneficiary(addr1.address, 0)).to.emit(
      vesting,
      "AddedBeneficiary"
    );
  });

  it("Cannot add beneficiary of same role twice", async () => {
    // add a beneficiary of role 0
    await vesting.addBeneficiary(addr1.address, 0);

    //now try to add the same beneficiary to the same role
    await expect(vesting.addBeneficiary(addr1.address, 0)).to.be.revertedWith(
      "Beneficiary already exist"
    );
  });

  it("Only owner should be able to start the vesting", async () => {
    //try to start the the vesting from another account
    await expect(
      vesting.connect(addr1).startVesting(cliff, duration)
    ).to.be.revertedWith("Ownable: caller is not the owner");
  });

  it("Owner is not able to restart the vesting", async () => {
    //start the vesting for the first time
    await vesting.startVesting(cliff, duration);

    //now try to restart the vesting
    await expect(vesting.startVesting(cliff, duration)).to.be.revertedWith(
      "vesting is already started"
    );
  });

  it("Should able to add address in all roles", async () => {
    //add all the addresses
    await addAllBeneficiariesRoles(addrs);

    //first(0) advisor(0) in the array.  see the addAllBeneficiariesRoles function for address added in specific roles
    expect(await vesting.beneficiaries(0, 0)).to.equal(addrs[0].address);

    //first(0) partner(1) in the array
    expect(await vesting.beneficiaries(1, 0)).to.equal(addrs[5].address);

    //first(0) mentor(2) in the array
    expect(await vesting.beneficiaries(2, 0)).to.equal(addrs[10].address);
  });

  it("should not be able to withdraw vested tokens until vesting is started", async () => {
    //try to withdraw, without starting the vesting
    await expect(vesting.withdraw(0)).to.be.revertedWith(
      "vesting is not started Yet, Wait for some time"
    );
  });

  it("should not able withdraw any token in cliff period or generated token amount is 0", async () => {
    //add participants
    await addAllBeneficiariesRoles(addrs);

    //start the vesting with
    await vesting.startVesting(cliff, duration);

    //try to withdraw for advisor role (0)
    await expect(vesting.withdraw(0)).to.be.revertedWith(
      "Currently no tokens left for release ,Try after some time"
    );
  });

  it("should able to withdraw tokens after cliff period", async () => {
    //add participants
    await addAllBeneficiariesRoles(addrs);
    // //start the vesting with
    await vesting.startVesting(cliff, duration);

    //increase the block timestamp. cliff + 1 day
    await ethers.provider.send("evm_increaseTime", [cliff + 24 * 60 * 60]);
    await ethers.provider.send("evm_mine");

    //withdraw for advisor role(0)
    await expect(vesting.withdraw(0)).to.emit(vesting, "TokenWithdraw");
  });

  it("A beneficiary should get Tokens after cliff period", async () => {
    //add participants
    await addAllBeneficiariesRoles(addrs);

    //start the vesting with
    await vesting.startVesting(cliff, duration);

    //increase the block timestamp. cliff + half of the duration
    await ethers.provider.send("evm_increaseTime", [cliff + duration / 2]);
    await ethers.provider.send("evm_mine");

    const contractBalanceBefore = await token.balanceOf(vesting.address);

    const allAdvisors = await vesting.getAllBeneficiaries(0);

    //balance of any single advisor before withdraw event
    const oneAdvisorBalanceBefore = await token.balanceOf(allAdvisors[0]);

    //balance of all advisors before withdraw event
    const allAdvisorsBalanceBefore = BigNumber.from(
      oneAdvisorBalanceBefore
    ).mul(BigNumber.from(allAdvisors.length));

    //withdraw for advisor role(0)
    await vesting.withdraw(0);

    //contract balance after withdraw
    const contractBalanceAfter = await token.balanceOf(vesting.address);

    //balance of any single advisor after withdraw event
    const oneAdvisorBalanceAfter = await token.balanceOf(allAdvisors[0]);

    //balance of all advisors after withdraw event
    const allAdvisorsBalanceAfter = BigNumber.from(oneAdvisorBalanceAfter).mul(
      BigNumber.from(allAdvisors.length)
    );

    //advisors balance difference
    const advisorsBalanceDiff = BigNumber.from(allAdvisorsBalanceAfter).sub(
      BigNumber.from(allAdvisorsBalanceBefore)
    );

    //contract balance difference
    const contractBalanceDiff = BigNumber.from(contractBalanceBefore).sub(
      BigNumber.from(contractBalanceAfter)
    );

    //this two difference should be same
    expect(contractBalanceDiff).be.equal(advisorsBalanceDiff);
  });

  it("Each address of a role should get equal amount of tokens", async () => {
    //add participants
    await addAllBeneficiariesRoles(addrs);

    //start the vesting with
    await vesting.startVesting(cliff, duration);

    //increase the block timestamp. cliff + half of the duration
    await ethers.provider.send("evm_increaseTime", [cliff + duration / 2]);
    await ethers.provider.send("evm_mine");

    //withdraw for advisor role(0)
    await vesting.withdraw(0);

    //taking random advisors(0) from beneficiaries list
    const advisor1 = await vesting.beneficiaries(0, 0);
    const advisor4 = await vesting.beneficiaries(0, 3);
    //balance of two advisor should be same
    expect(await token.balanceOf(advisor1)).be.equal(
      await token.balanceOf(advisor4)
    );
  });
});
