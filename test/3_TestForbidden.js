const timeTravel = require("./timeTravel/timeTravel");
const truffleAssert = require('truffle-assertions');
const Remittance = artifacts.require("Remittance");

/*
1) It should fail to create a package when paused
2) It should fail to cancel a package when paused
3) It should fail to claim a package when paused

4) It should fail to create a package when frozen
5) It should fail to cancel a package when frozen
6) It should fail to claim a package when frozen
*/

contract("Forbidden actions: Paused and Frozen", accounts => {
	const [account0, account1, account2, account3] = accounts;
	let _instance;

	beforeEach('setup contract for each test', async function () {
        _instance = await Remittance.new({from:account0});
    })

	it("should fail to create a package when paused", async () => {
		await _instance.pause({from: account0});

		let deadline = 10;
		let hashedPassword = await _instance.hashPassword.call(account2, "myPassword", {from: account1});
		await truffleAssert.reverts(_instance.createPackage(account2, hashedPassword, deadline, {from: account1, value:100}), truffleAssert.ErrorType.REVERT);
	});

	it("should fail to cancel a package when paused", async () => {
		let deadline = 10;
		let hashedPassword = await _instance.hashPassword.call(account2, "myPassword", {from: account1});
		await _instance.createPackage(account2, hashedPassword, deadline, {from: account1, value:100});
		await timeTravel.advanceManyBlocks(deadline + 1);
		await _instance.pause({from: account0});
		await truffleAssert.reverts(_instance.cancelPackage(hashedPassword, {from: account1}), truffleAssert.ErrorType.REVERT);
	});

	it("should fail to claim a package when paused", async () => {
		let deadline = 10;
		let hashedPassword = await _instance.hashPassword.call(account2, "myPassword", {from: account1});
		await _instance.createPackage(account2, hashedPassword, deadline, {from: account1, value:100});
		await _instance.pause({from: account0});
		await truffleAssert.reverts(_instance.claimPackage(hashedPassword, "myPassword", {from: account2}), truffleAssert.ErrorType.REVERT);
	});

	it("should fail to create a package when frozen", async () => {
		await _instance.pause({from: account0});
		await _instance.freeze({from: account0});

		let deadline = 10;
		let hashedPassword = await _instance.hashPassword.call(account2, "myPassword", {from: account1});
		await truffleAssert.reverts(_instance.createPackage(account2, hashedPassword, deadline, {from: account1, value:100}), truffleAssert.ErrorType.REVERT);
	});

	it("should fail to cancel a package when frozen", async () => {
		let deadline = 10;
		let hashedPassword = await _instance.hashPassword.call(account2, "myPassword", {from: account1});
		await _instance.createPackage(account2, hashedPassword, deadline, {from: account1, value:100});
		await timeTravel.advanceManyBlocks(deadline + 1);
		await _instance.pause({from: account0});
		await _instance.freeze({from: account0});
		await truffleAssert.reverts(_instance.cancelPackage(hashedPassword, {from: account1}), truffleAssert.ErrorType.REVERT);
	});

	it("should fail to claim a package when frozen", async () => {
		let deadline = 10;
		let hashedPassword = await _instance.hashPassword.call(account2, "myPassword", {from: account1});
		await _instance.createPackage(account2, hashedPassword, deadline, {from: account1, value:100});
		await _instance.pause({from: account0});
		await _instance.freeze({from: account0});
		await truffleAssert.reverts(_instance.claimPackage(hashedPassword, "myPassword", {from: account2}), truffleAssert.ErrorType.REVERT);
	});
});