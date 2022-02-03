const { ethers } = require("hardhat");
const hre = require("hardhat");

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Deploying contracts with the account: " + deployer.address);

    const date = new Date().getTime();
    const timelock = "0";
    const epochLength = 600;
    const firstEpochNumber = "0";
    const firstEpochTime = parseInt(JSON.stringify((date / 1000) + epochLength ));
    const index = "1";
    const chainID = "4";
    const warmupPeriod = "0";
    const nextEpochTime = parseInt( JSON.stringify((date / 1000) + epochLength ));
    let principleAddressBond1 = "";
    let principleAddressBond2 = "";
    let principleAddressBond3 = "";
    let principleAddressBond4 = "";
    let principleAddressBond5 = "";
    let daoAddress = deployer.address;
    const zeroAddress = "0x0000000000000000000000000000000000000000";
    const WETH = "0xc778417E063141139Fce010982780140Aa0cD5Ab";
    const ETH_USD_Feed = "0x8A753747A1Fa494EC906cE90E9f37563A8AF630e";
    // const MIM = "";

    // STABLE COINS 
    ////////////////////////////////////////////////////////////////

    const MIM = await ethers.getContractFactory("DAI");
    const mim = await MIM.deploy(chainID);
    await mim.deployed();
    console.log("MIM: ", mim.address);

    ////////////////////////////////////////////////////////////////

    const Time = await ethers.getContractFactory("TimeERC20Token");
    const time = await Time.deploy();
    await time.deployed();
    console.log("time: ", time.address);

    const Memories = await ethers.getContractFactory("MEMOries");
    const memo = await Memories.deploy();
    await memo.deployed();
    console.log("memo: ", memo.address);

    const BondingCalculator = await ethers.getContractFactory("TimeBondingCalculator");
    const bondingCalculator = await BondingCalculator.deploy(time.address);
    await bondingCalculator.deployed();
    console.log("bondingCalculator: ", bondingCalculator.address);

    const Treasury = await ethers.getContractFactory("TimeTreasury");
    const treasury = await Treasury.deploy(time.address, mim.address, timelock);
    await treasury.deployed();
    console.log("treasury: ", treasury.address);

    await time.setVault(treasury.address);
    console.log("set vault");

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

    await memo.initialize(staking.address);
    console.log("initialize sblkd");

    // await memo.setIndex(index);
    // console.log("set Index");

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

    await distributor.addRecipient(staking.address, "5000");
    console.log("Distributor Add Recipient:", 5000);

    await staking.setContract("1", stakingWarmup.address); // Set Warmup Contract ( Later set up LP Staking too )
    console.log("setDistributor for Staking:", stakingWarmup.address);

    await staking.setContract("0", distributor.address); // Set distributor Contract ( Later set up LP Staking too )
    console.log("setDistributor for Staking:", distributor.address);

    // await staking.setWarmup(warmupPeriod);
    // console.log("setWarmup for Staking:", warmupPeriod);

    const WrappedMemo = await ethers.getContractFactory("wMEMO");
    const wMemo = await WrappedMemo.deploy(
      memo.address
    );
    await wMemo.deployed();
    console.log("wMemo: ", wMemo.address);

    // BONDS
    ////////////////////////////////////////////////////////////////
    // For A Single Bond (bondingCalculator 0 address for non LP bonds)

    principleAddressBond1 = mim.address;

    const BondDepository = await ethers.getContractFactory("TimeBondDepository"); 
    const mimBond = await BondDepository.deploy(
        time.address,
        principleAddressBond1,
        treasury.address,
        daoAddress,
        zeroAddress,
    );
    await mimBond.deployed();
    console.log("mimBond: ", mimBond.address);

    principleAddressBond2 = WETH;

    const EthBondDepository = await ethers.getContractFactory("TimeEthBondDepository")
    const ethBond = await EthBondDepository.deploy(
        time.address,
        principleAddressBond2,
        treasury.address,
        daoAddress,
        ETH_USD_Feed,
    );
    await ethBond.deployed();
    console.log("ethBond: ", ethBond.address);


    await mimBond.initializeBondTerms(
        50,
        100,
        1000,
        100,
        "10000000000000000000",
        0,
        129600,
    );
    console.log("Initialize for MIM BOND");

    await mimBond.setStaking(
        stakingHelper.address,
        1
    )
    console.log("Staking Helper for MIM BOND");

    await ethBond.initializeBondTerms(
        257,
        10,
        750,
        "2000000000000000",
        0,
        129600,
    );
    console.log("Initialize for ETH BOND");

    await ethBond.setStaking(
        stakingHelper.address,
        1
    )
    console.log("Staking Helper for ETH BOND");

    ////////////////////////////////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////////////

    await mim.mint(deployer.address, "150000000000000000000000000000000000000000000")
    console.log("Minted mim: ", "10000000000000000000000000000000");

    await treasury.queue(0, deployer.address); 
    await treasury.queue(3, deployer.address); 
    await treasury.queue(4, deployer.address); 
    await treasury.queue(6, deployer.address); 
    await treasury.queue(7, deployer.address);
    await treasury.queue(8, deployer.address); 

    await treasury.queue(0, mimBond.address);
    await treasury.queue(4, mimBond.address);
    await treasury.queue(0, ethBond.address);
    await treasury.queue(4, ethBond.address);

    await treasury.queue(4, bondingCalculator.address);
    await treasury.queue(8, bondingCalculator.address);

    await treasury.queue(8, distributor.address);

    await treasury.queue(9, memo.address);

    console.log("ALL QUEUES DONE");

    await treasury.toggle(0, deployer.address, zeroAddress);
    await treasury.toggle(3, deployer.address, zeroAddress);
    await treasury.toggle(4, deployer.address, zeroAddress);
    await treasury.toggle(6, deployer.address, zeroAddress); 
    await treasury.toggle(7, deployer.address, zeroAddress);
    await treasury.toggle(8, deployer.address, zeroAddress);

    await treasury.toggle(0, mimBond.address, zeroAddress);
    await treasury.toggle(4, mimBond.address, zeroAddress);
    await treasury.toggle(0, ethBond.address, zeroAddress);
    await treasury.toggle(4, ethBond.address, zeroAddress);

    await treasury.toggle(4, bondingCalculator.address, zeroAddress)
    await treasury.toggle(8, bondingCalculator.address, zeroAddress)

    await treasury.toggle(8, distributor.address, zeroAddress);

    await treasury.toggle(9, memo.address, zeroAddress);

    console.log("ALL TOGGLES DONE");


    // Deposit and Mint blkd
    const mimAmount = "100000000000000000000000000000000"
    const mimProfit = "100000000000000000000000"
    await mim.approve(treasury.address, mimAmount); // Approve treasury to use the mim
    console.log("mim Approved to treasury :", mimAmount);
    await treasury.deposit(mimAmount, mim.address, mimProfit); // Deposit mim into treasury
    console.log("mim Deposited in treasury :", mimAmount);
    const blkdMintedAgainstmim = await time.balanceOf(deployer.address);
    console.log("Time minted against mim: ", blkdMintedAgainstmim.toString());

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
            constructorArguments: [time.address, mim.address, timelock],
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
            address: mimBond.address,
            constructorArguments: [
              time.address,
              principleAddressBond1,
              treasury.address,
              daoAddress,
              zeroAddress
            ],
        });
    } catch (error) {}

    try {
        await hre.run("verify:verify", {
            address: ethBond.address,
            constructorArguments: [
                time.address,
                principleAddressBond2,
                treasury.address,
                daoAddress,
                ETH_USD_Feed
            ],
        });
    } catch (error) {}

    try {
        await hre.run("verify:verify", {
            address: mim.address,
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
