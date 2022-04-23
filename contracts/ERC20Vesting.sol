// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract ERC20Vesting is Ownable{
    // all available roles;
    enum allRoles{advisor,partner,mentor} allRoles public role;

    //mapping ids will all beneficiaries. 0 -> all Advisors, 1 -> all pertners, 2 -> all mentors
    mapping(uint => address[]) public beneficiaries; 

    //mapp all the released token for a specific role. for ex: advisor (0 => released Token Amount unitil current time)
    mapping(uint => uint) public releasedTokenForRole;

    //mapp each role to the Total token bits
    mapping(uint => uint) public totalTokensForRole;

    //token address
    IERC20 public token;

    //bool for vesting is started or not
    bool public vestingStarted;

    //locking period (from vesting is started)
    uint public cliff;

    //duration of vesting
    uint public duration;


    constructor(IERC20 _token){
        token = _token ;
        //initial supplied token is 100 million . decimal of token is 18
        //5% token amount vested to all advisor. 10% for pertners and 15 % token amount are vested for mentors 
        totalTokensForRole[uint(allRoles.advisor)]=5000000000000000000000000;
        totalTokensForRole[uint(allRoles.partner)]=10000000000000000000000000;
        totalTokensForRole[uint(allRoles.mentor)]=15000000000000000000000000;

    }

    //to start the vesting , cliff = locking period , duration = how long the vesting procedure should be
    function startVesting(uint _cliff,uint _duration) external onlyOwner{
        require(!vestingStarted,"vesting is already started");
        require(_cliff > 0 && _duration > 0,"Cliff and duration should be greater than 0");

        //adding the current block time to the cliff
        cliff = _cliff + block.timestamp;
        duration = _duration;
        // vesting is started
        vestingStarted = true;

        emit startedVesting(cliff,duration);
    }

    //add beneficiaries
    function addBeneficiary(address _Beneficiary, allRoles _role) external onlyOwner{
        require(_Beneficiary!=address(0),"Cannot add a Beneficiary of 0 address");
        require(!vestingStarted,"vesting is already started");
        require(validateBenificary(_Beneficiary,_role),"Beneficiary already exist");

        
        //add the account into the collection
        beneficiaries[uint(_role)].push(_Beneficiary);

       emit AddedBeneficiary(_Beneficiary,_role);
    }

    //get all beneficiaries of a role
    function getAllBeneficiaries(allRoles _role) external view returns(address[] memory){
        return beneficiaries[uint(_role)];
    }

    function validateBenificary(address _Beneficiary,allRoles _role) internal view returns(bool exists){
        
        //length of Beneficiary array of a role
        uint length = beneficiaries[uint(_role)].length;
        for(uint i=0;i<length;i++){
            //check if the beneficiaries is already present in the array
            if (beneficiaries[uint(_role)][i] == _Beneficiary){
                return false;
            }
        }
        //if no duplicate is found return true
        return true;
    }

    function withdraw(allRoles _role) external onlyOwner{
        require(vestingStarted,"vesting is not started Yet, Wait for some time");
        //all vested tokens for this round
        uint vestedTokens = vestedTokenForRole(_role);
        //revert if the Token Generation Event for this round is finished (all tokens relese)
        require(totalTokensForRole[uint(_role)] != releasedTokenForRole[uint(_role)],"TGE for this role is finished");

        //the amount of tokens we can release to the specific role at the current time
        uint unReleasedTokensForThisRole = vestedTokens - releasedTokenForRole[uint(_role)];

        //length of all beneficiaries of this role
        uint length = beneficiaries[uint(_role)].length;

        //This is the token amount each individual in a roles gets.
        uint TokenAmountForEach = unReleasedTokensForThisRole / length;

        require(TokenAmountForEach >0,"Currently no tokens left for release ,Try after some time");

        //remaining tokens after equally diving the Token amount
        uint TokenLeftAfterDistributing = unReleasedTokensForThisRole % length;

        //update the release token amount for this role
        releasedTokenForRole[uint(_role)] += (unReleasedTokensForThisRole-TokenLeftAfterDistributing);

        //Transfer the Tokens to the all benificiries
        for(uint i=0;i<length;i++){
            token.transfer(beneficiaries[uint(_role)][i],TokenAmountForEach);
        }

        emit TokenWithdraw(unReleasedTokensForThisRole,TokenAmountForEach);
    }


    function vestedTokenForRole(allRoles _role) internal view returns(uint TokenVested){
        uint totalTokenAmount = totalTokensForRole[uint(_role)];
        if(block.timestamp < cliff){
            return 0;
        }
        else if(block.timestamp >= cliff + duration){
            return totalTokenAmount;
        }

        else{
            return (totalTokenAmount*(block.timestamp - cliff)) / duration ;
        }

    }

    /* All Events */
    event startedVesting(uint cliff , uint duration);
    event AddedBeneficiary(address Beneficiary, allRoles role);
    event TokenWithdraw(uint releasedTokenAmount , uint TokenAmountForEach);
} 