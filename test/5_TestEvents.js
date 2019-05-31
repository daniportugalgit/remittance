const timeTravel = require("./timeTravel/timeTravel");
const truffleAssert = require('truffle-assertions');
const Remittance = artifacts.require("Remittance");
/*
event PackageCreated(address indexed owner, address indexed dealer, uint amount, bytes32 packageId);
event PackageClaimed(address indexed dealer, uint amount, bytes32 packageId);
event PackageCancelled(address indexed owner, bytes32 packageId);
*/

contract("should emit events", accounts => {
	const [account0, account1, account2, account3] = accounts;
	let _instance;

	beforeEach('setup contract for each test', async function () {
        _instance = await Remittance.new({from:account0});
    })

    it("should emit event with correct parameters when a package is created", async () => {
    	let deadline = 10;
		let hashedPassword = await _instance.hashPassword.call(account2, "myPassword", {from: account1});
		let result = await _instance.createPackage(account2, hashedPassword, deadline, {from: account1, value:100});

		await truffleAssert.eventEmitted(result, 'PackageCreated', (ev) => {
			return ev.owner == account1 && ev.dealer == account2 && ev.amount == 100 && ev.packageId == hashedPassword;
		});
	});

	it("should emit event with correct parameters when a package is claimed", async () => {
    	let deadline = 10;
		let hashedPassword = await _instance.hashPassword.call(account2, "myPassword", {from: account1});
		await _instance.createPackage(account2, hashedPassword, deadline, {from: account1, value:100});
	
		let result = await _instance.claimPackage(hashedPassword, "myPassword", {from: account2});
		await truffleAssert.eventEmitted(result, 'PackageClaimed', (ev) => {
			return ev.dealer == account2 && ev.amount == 100 && ev.packageId == hashedPassword;
		});
	});

	it("should emit event with correct parameters when a package is cancelled", async () => {
    	let deadline = 10;
		let hashedPassword = await _instance.hashPassword.call(account2, "myPassword", {from: account1});
		await _instance.createPackage(account2, hashedPassword, deadline, {from: account1, value:100});
		await timeTravel.advanceManyBlocks(deadline + 1);
	
		let result = await _instance.cancelPackage(hashedPassword, {from: account1});
		await truffleAssert.eventEmitted(result, 'PackageCancelled', (ev) => {
			return ev.owner == account1 && ev.packageId == hashedPassword;
		});
	});
});