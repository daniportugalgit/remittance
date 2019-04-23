pragma solidity 0.5.0;

//import "./Pausable.sol";
//import "./SafeMath.sol";

//Version 0.01: basic structure. Let's do baby steps this time.
contract Remittance {
	uint public packageCount;
	mapping(uint => Package) public packages;

	struct Package {
		address payable from;
		uint amount;
		address payable dealer;
		bytes32 hashedPassword;
		uint validUntilBlock;
		bool isActive;
		uint id;
	}

	modifier onlyPackageOwner(uint packageId) { 
		require (msg.sender == packages[packageId].from, "Only package owner"); 
		_; 
	}

	modifier onlyPackageDealer(uint packageId) { 
		require (msg.sender == packages[packageId].dealer, "Only package dealer"); 
		_; 
	}

	modifier onlyBeforeDeadline(uint packageId) { 
		require (block.number <= packages[packageId].validUntilBlock, "Only before deadline"); 
		_; 
	}

	modifier onlyAfterDeadline(uint packageId) { 
		require (block.number > packages[packageId].validUntilBlock, "Only after deadline"); 
		_; 
	}

	event PackageClaimed(address dealer, uint amount, uint packageId);
	event PackageCancelled(address owner, uint packageId);
	
	function createPackage(address payable dealer, bytes32 hashedPassword, uint deadlineInBlocks) public payable returns(bool success) {
		require(msg.value > 0, "You must send some ETH");

		packages[packageCount] = Package(msg.sender, msg.value, dealer, hashedPassword, block.number + deadlineInBlocks, true, packageCount);
		packageCount++;

		return true;
	}

	function hashPassword(string memory p1, string memory p2) private pure returns(bytes32) {
		return keccak256(abi.encodePacked(p1, p2));
	}

	function claimPackage(uint packageId, string memory recipientPassword, string memory dealerPassword) public onlyPackageDealer(packageId) onlyBeforeDeadline(packageId) returns(bool success) {
		require(packages[packageId].isActive, "This package has already been claimed or cancelled");
		require(hashPassword(recipientPassword, dealerPassword) == packages[packageId].hashedPassword, "Password does not match");
		
		emit PackageClaimed(msg.sender, packages[packageId].amount, packageId);

		packages[packageId].isActive = false;
		msg.sender.transfer(packages[packageId].amount);

		return true;
	}

	function cancelPackage(uint packageId) public onlyPackageOwner(packageId) onlyAfterDeadline(packageId) returns(bool success) {	
		require(packages[packageId].isActive, "This package has already been claimed or cancelled");

		emit PackageCancelled(msg.sender, packageId);

		packages[packageId].isActive = false;
		msg.sender.transfer(packages[packageId].amount);
	
		return true;
	}

	function() external {
		revert();
	}
}