const timeTravel = require("./timeTravel/timeTravel");
const balanceCheck = require("./balanceCheck/balanceCheck");
const truffleAssert = require('truffle-assertions');
const Remittance = artifacts.require("Remittance");

const addressZero = "0x0000000000000000000000000000000000000000";

/*Tests:
HAPPY PATHS:
1) It should create a package
2) It should cancel a package
3) It should claim a package

EXCEPTIONS:
4) It should fail to create package if user sends 0 ETH
5) It should fail to create package when the password has been used before
6) It should fail to create package if dealer address == 0
7) It should fail to create package if msg.sender == dealer

8) It should fail to cancel package if it has already been claimed
9) It should fail to cancel package if not owner (of the package)
10) It should fail to cancel package before the deadline

11) It should fail to claim package if not dealer
12) It should fail to claim package after the deadline
13) It should fail to claim package if it has already been claimed
14) It should fail to claim package passing wrong password
*/

contract("Remittance", accounts => {
	const [account0, account1, account2, account3] = accounts;
	let _instance;

	beforeEach('setup contract for each test', async function () {
        _instance = await Remittance.new({from:account0});
    })

	it("should create a package", async () => {
		let deadline = 10;
		let hashedPassword = await _instance.hashPassword.call(account2, "myPassword", {from: account1});
		await _instance.createPackage(account2, hashedPassword, deadline, {from: account1, value:100});
		let package = await _instance.packages.call(hashedPassword, {from: account1});
		let validUntilBlock = await web3.eth.getBlockNumber();
		validUntilBlock += deadline;

		assert.strictEqual(package.from, account1, "Package has not registered its creator.");
		assert.strictEqual(package.amount.toString(10), "100", "Package has not registered the correct value.");
		assert.strictEqual(package.dealer, account2, "Package has not registered the correct dealer.");
		assert.strictEqual(package.validUntilBlock.toString(10), validUntilBlock.toString(10), "Package has not registered the correct deadline.");
		assert.strictEqual(package.isActive.toString(10), "true", "Package has not registered the correct isActive value.");
	});

	it("should cancel a package", async () => {
		let deadline = 10;
		let hashedPassword = await _instance.hashPassword.call(account2, "myPassword", {from: account1});
		await _instance.createPackage(account2, hashedPassword, deadline, {from: account1, value:100});
		let package = await _instance.packages.call(hashedPassword, {from: account1});
		assert.strictEqual(package.from, account1, "Package has not been created.");

		await timeTravel.advanceManyBlocks(deadline + 1);
		await _instance.cancelPackage(hashedPassword, {from: account1});
		let packageAfterCancel = await _instance.packages.call(hashedPassword, {from: account1});
		assert.strictEqual(packageAfterCancel.isActive, false, "Package has not been cancelled.");
	});

	it("should claim a package", async () => {
		let deadline = 10;
		let hashedPassword = await _instance.hashPassword.call(account2, "myPassword", {from: account1});
		await _instance.createPackage(account2, hashedPassword, deadline, {from: account1, value:100});
		let package = await _instance.packages.call(hashedPassword, {from: account1});
		assert.strictEqual(package.from, account1, "Package has not been created.");

		//calculates balance diff removing gas costs from the equation:
		await balanceCheck.balanceDiff(_instance.claimPackage(hashedPassword, "myPassword", {from: account2}), account2, 100, "Dealer has not received ETH after claiming package.");

		let packageAfterClaim = await _instance.packages.call(hashedPassword, {from: account1});
		assert.strictEqual(packageAfterClaim.isActive, false, "Package has not been claimed.");
	});

	it("should fail to create package if user sends 0 ETH", async () => {
		let deadline = 10;
		let hashedPassword = await _instance.hashPassword.call(account2, "myPassword", {from: account1});
		await truffleAssert.reverts(_instance.createPackage(account2, hashedPassword, deadline, {from: account1, value:0}), truffleAssert.ErrorType.REVERT, "msg.value == 0");
	});

	it("should fail to create package when the password has been used before", async () => {
		let deadline = 10;
		let hashedPassword = await _instance.hashPassword.call(account2, "myPassword", {from: account1});
		await _instance.createPackage(account2, hashedPassword, deadline, {from: account1, value:100});
		await truffleAssert.reverts(_instance.createPackage(account2, hashedPassword, deadline, {from: account1, value:100}), truffleAssert.ErrorType.REVERT, "Package conflict");
	});

	it("should fail to create package if dealer == 0x0", async () => {
		let deadline = 10;
		let hashedPassword = await _instance.hashPassword.call(addressZero, "myPassword", {from: account1});
		await truffleAssert.reverts(_instance.createPackage(addressZero, hashedPassword, deadline, {from: account1, value:100}), truffleAssert.ErrorType.REVERT, "dealer == 0x0");
	});

	it("should fail to create package if msg.sender == dealer", async () => {
		let deadline = 10;
		let hashedPassword = await _instance.hashPassword.call(account1, "myPassword", {from: account1});
		await truffleAssert.reverts(_instance.createPackage(account1, hashedPassword, deadline, {from: account1, value:100}), truffleAssert.ErrorType.REVERT, "msg.sender == dealer");
	});

	it("should fail to cancel package if it has already been claimed", async () => {
		let deadline = 10;
		let hashedPassword = await _instance.hashPassword.call(account2, "myPassword", {from: account1});
		await _instance.createPackage(account2, hashedPassword, deadline, {from: account1, value:100});
		await _instance.claimPackage(hashedPassword, "myPassword", {from: account2});
		await timeTravel.advanceManyBlocks(deadline + 1);
		await truffleAssert.reverts(_instance.cancelPackage(hashedPassword, {from: account1}), truffleAssert.ErrorType.REVERT, "cancel after claim");
	});

	it("should fail to cancel package before the deadline", async () => {
		let deadline = 10;
		let hashedPassword = await _instance.hashPassword.call(account2, "myPassword", {from: account1});
		await _instance.createPackage(account2, hashedPassword, deadline, {from: account1, value:100});
		await timeTravel.advanceManyBlocks(deadline - 3);
		await truffleAssert.reverts(_instance.cancelPackage(hashedPassword, {from: account1}), truffleAssert.ErrorType.REVERT, "cancel before deadline");
	});

	it("should fail to cancel package if not the owner (of the package)", async () => {
		let deadline = 10;
		let hashedPassword = await _instance.hashPassword.call(account2, "myPassword", {from: account1});
		await _instance.createPackage(account2, hashedPassword, deadline, {from: account1, value:100});
		await timeTravel.advanceManyBlocks(deadline + 1);
		await truffleAssert.reverts(_instance.cancelPackage(hashedPassword, {from: account2}), truffleAssert.ErrorType.REVERT, "not-owner cancel");
	});

	it("should fail to claim package if it has already been claimed", async () => {
		let deadline = 10;
		let hashedPassword = await _instance.hashPassword.call(account2, "myPassword", {from: account1});
		await _instance.createPackage(account2, hashedPassword, deadline, {from: account1, value:100});
		await _instance.claimPackage(hashedPassword, "myPassword", {from: account2});
		await truffleAssert.reverts(_instance.claimPackage(hashedPassword, "myPassword", {from: account2}), truffleAssert.ErrorType.REVERT, "double claim");
	});

	it("should fail to claim package if not dealer", async () => {
		let deadline = 10;
		let hashedPassword = await _instance.hashPassword.call(account2, "myPassword", {from: account1});
		await _instance.createPackage(account2, hashedPassword, deadline, {from: account1, value:100});
		await truffleAssert.reverts(_instance.claimPackage(hashedPassword, "myPassword", {from: account3}), truffleAssert.ErrorType.REVERT, "not-dealer claim");
	});

	it("should fail to claim package after the deadline", async () => {
		let deadline = 10;
		let hashedPassword = await _instance.hashPassword.call(account2, "myPassword", {from: account1});
		await _instance.createPackage(account2, hashedPassword, deadline, {from: account1, value:100});
		await timeTravel.advanceManyBlocks(deadline + 1);
		await truffleAssert.reverts(_instance.claimPackage(hashedPassword, "myPassword", {from: account2}), truffleAssert.ErrorType.REVERT, "claim after deadline");
	});

	it("should fail to claim package passing wrong password", async () => {
		let deadline = 10;
		let hashedPassword = await _instance.hashPassword.call(account2, "myPassword", {from: account1});
		await _instance.createPackage(account2, hashedPassword, deadline, {from: account1, value:100});
		await truffleAssert.reverts(_instance.claimPackage(hashedPassword, "blablabla", {from: account2}), truffleAssert.ErrorType.REVERT, "claim with wrong password");
	});
});