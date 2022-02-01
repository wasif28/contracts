const { ethers } = require("hardhat");
const hre = require("hardhat");

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Deploying contracts with the account: " + deployer.address);

    const timelock = "0";
    const epochLength = "1";
    const firstEpochNumber = "1";
    const firstEpochTime = "1643713157";
    const index = "1";
    const chainID = "4";
    const warmupPeriod = "0";
    const limitAmount = "1000000000000000000000000000000000000";
    const nextEpochTime = "1643713158";
    let principleAddress = "";
    let daoAddress = "";
    const zeroAddress = "0x0000000000000000000000000000000000000000"

        // STABLE COINS 
    ////////////////////////////////////////////////////////////////

    const DAI = await ethers.getContractFactory("DAI");
    const dai = await DAI.deploy(chainID);
    await dai.deployed();
    console.log("DAI: ", dai.address);

    ////////////////////////////////////////////////////////////////

    const Time = await ethers.getContractFactory("TimeERC20Token");
    const time = await Time.deploy();
    await time.deployed();
    console.log("time: ", time.address);

    const Memories = await ethers.getContractFactory("MEMOries");
    const memo = await Memories.deploy();
    await memo.deployed();
    console.log("memo: ", memo.address);

    const Treasury = await ethers.getContractFactory("TimeTreasury");
    const treasury = await Treasury.deploy(time.address, dai.address, timelock, limitAmount);
    await treasury.deployed();
    console.log("treasury: ", treasury.address);

    const Staking = await ethers.getContractFactory("TimeStaking");
    const staking = await Staking.deploy(
        time.address,
        memo.address,
        epochLength,
        firstEpochNumber,
        firstEpochTime
    );
    await staking.deployed();
    console.log("staking: ", staking.address);

    const Distributor = await ethers.getContractFactory("Distributor");
    const distributor = await Distributor.deploy(
        treasury.address,
        time.address,
        epochLength,
        nextEpochTime
    );
    await distributor.deployed();
    console.log("distributor: ", distributor.address);

    const StakingHelper = await ethers.getContractFactory("StakingHelper");
    const stakingHelper = await StakingHelper.deploy(
        staking.address,
        time.address,
    );
    await stakingHelper.deployed();
    console.log("stakingHelper: ", stakingHelper.address);

    const StakingWarmup = await ethers.getContractFactory("StakingWarmup");
    const stakingWarmup = await StakingWarmup.deploy(
        staking.address,
        memo.address,
    );
    await stakingWarmup.deployed();
    console.log("stakingWarmup: ", stakingWarmup.address);

    const BondingCalculator = await ethers.getContractFactory("TimeBondingCalculator");
    const bondingCalculator = await BondingCalculator.deploy(time.address);
    await bondingCalculator.deployed();
    console.log("bondingCalculator: ", bondingCalculator.address);

    // BONDS
    ////////////////////////////////////////////////////////////////
    // For A Single Bond (bondingCalculator 0 address for non LP bonds)

    //TEMP
    daoAddress = deployer.address;
    principleAddress = dai.address;

    const BondDepository = await ethers.getContractFactory("TimeBondDepository"); 
    const bondDepository = await BondDepository.deploy(
        time.address,
        principleAddress,
        treasury.address,
        daoAddress,
        zeroAddress,
    );
    await bondDepository.deployed();
    console.log("bondDepository: ", bondDepository.address);

    ////////////////////////////////////////////////////////////////

    const WrappedMemo = await ethers.getContractFactory("wMEMO");
    const wMemo = await WrappedMemo.deploy(
      memo.address
    );
    await wMemo.deployed();
    console.log("wMemo: ", wMemo.address);

    ////////////////////////////////////////////////////////////////

    await time.setVault(treasury.address);
    console.log("set vault");

    await memo.setIndex(index);
    console.log("set Index");

    await memo.initialize(staking.address);
    console.log("initialize sblkd");

    await staking.setContract("1", StakingWarmup.address); // Set Warmup Contract ( Later set up LP Staking too )
    console.log("setDistributor for Staking:", distributor.address);

    await staking.setWarmup(warmupPeriod);
    console.log("setDistributor for Staking:", warmupPeriod);

    await dai.mint(deployer.address, "10000000000000000000000000000000000000000000000000")
    console.log("Minted DAI: ", "10000000000000000000000000000000");

    await distributor.addRecipient(staking.address, "4000");
    console.log("Distributor Add Recipient:", 4000);
    
    ////////////////////////////////////////////////////////////////////////////////

    await treasury.queue(8, distributor.address, zeroAddress); // Allows distributor to mint BLKD.
    await treasury.toggle(8, distributor.address, zeroAddress); // Allows distributor to mint BLKD.
    console.log("Treasury.enable(8):  distributor enabled to mint ohm on treasury");

    // Treasury Actions
    await treasury.enable(0, deployer.address, zeroAddress); // Enable the deployer to deposit reserve tokens
    await treasury.toggle(0, deployer.address, zeroAddress); // Enable the deployer to deposit reserve tokens
    console.log("Deployer Enabled on Treasury(0): ", deployer.address);
    await treasury.enable(2, dai.address, zeroAddress); // Enable DAI as a reserve Token
    await treasury.toggle(2, dai.address, zeroAddress); // Enable DAI as a reserve Token
    console.log("DAI Enabled on Treasury(2) as reserve: ", dai.address);

    // Deposit and Mint blkd
    const daiAmount = "100000000000000000000000000000000"
    await dai.approve(treasury.address, daiAmount); // Approve treasury to use the DAI
    console.log("DAI Approved to treasury :", daiAmount);
    await treasury.deposit(daiAmount, dai.address, 0); // Deposit DAI into treasury
    console.log("DAI Deposited in treasury :", daiAmount);
    const blkdMintedAgainstDai = await time.balanceOf(deployer.address);
    console.log("Time minted against DAI: ", blkdMintedAgainstDai.toString());
    // 

    /////////////////////////////////////////////////////////////////////////////////

    try {
        await hre.run("verify:verify", {
            address: time.address,
            constructorArguments: [],
        });
    } catch (error) {}

    try {
        await hre.run("verify:verify", {
            address: memo.address,
            constructorArguments: [],
        });
    } catch (error) {}

    try {
        await hre.run("verify:verify", {
            address: treasury.address,
            constructorArguments: [time.address, dai.address, timelock, limitAmount],
        });
    } catch (error) {}

    try {
        await hre.run("verify:verify", {
            address: staking.address,
            constructorArguments: [
              time.address,
              memo.address,
              epochLength,
              firstEpochNumber,
              firstEpochTime
            ],
        });
    } catch (error) {}

    try {
        await hre.run("verify:verify", {
            address: distributor.address,
            constructorArguments: [
              treasury.address,
              time.address,
              epochLength,
              nextEpochTime
            ],
        });
    } catch (error) {}

    try {
      await hre.run("verify:verify", {
        address: stakingHelper.address,
        constructorArguments: [  
          staking.address,
          time.address,
        ],
    });
    } catch (error) {
      
    }

    try {
      await hre.run("verify:verify", {
          address: stakingWarmup.address,
          constructorArguments: [    
            staking.address,
            memo.address,],
      });
    } catch (error) {}

    try {
        await hre.run("verify:verify", {
            address: bondingCalculator.address,
            constructorArguments: [time.address],
        });
    } catch (error) {}

    try {
        await hre.run("verify:verify", {
            address: bondDepository.address,
            constructorArguments: [
              time.address,
              principleAddress,
              treasury.address,
              daoAddress,
              zeroAddress
            ],
        });
    } catch (error) {}

    try {
        await hre.run("verify:verify", {
            address: dai.address,
            constructorArguments: [
                chainID
            ],
        });
    } catch (error) {}

    try {
        await hre.run("verify:verify", {
            address: wMemo.address,
            constructorArguments: [
              memo.address
            ],
        });
    } catch (error) {}

    console.log("All contracts deployed successfully");
}

main()
    .then(() => process.exit())
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
