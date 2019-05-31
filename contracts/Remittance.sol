pragma solidity 0.5.0;

import "./Pausable.sol";

//Version 0.9: pausable+ownable, password bugfix and unit tests
contract Remittance is Pausable{
	mapping(bytes32 => Package) public packages;

	struct Package {
		address payable from;
		uint amount;
		address payable dealer;
		uint validUntilBlock;
		bool isActive;
	}

	modifier onlyPackageOwner(bytes32 packageId) { 
		require (msg.sender == packages[packageId].from, "Only package owner"); 
		_; 
	}

	modifier onlyPackageDealer(bytes32 packageId) { 
		require (msg.sender == packages[packageId].dealer, "Only package dealer"); 
		_; 
	}

	modifier onlyBeforeDeadline(bytes32 packageId) { 
		require (block.number <= packages[packageId].validUntilBlock, "Only before deadline"); 
		_; 
	}

	modifier onlyAfterDeadline(bytes32 packageId) { 
		require (block.number > packages[packageId].validUntilBlock, "Only after deadline"); 
		_; 
	}
	
	event PackageCreated(address indexed owner, address indexed dealer, uint amount, bytes32 packageId);
	event PackageClaimed(address indexed dealer, uint amount, bytes32 packageId);
	event PackageCancelled(address indexed owner, bytes32 packageId);
	
	function createPackage(address payable dealer, bytes32 hashedPassword, uint deadlineInBlocks) onlyReady public payable returns(bool success) {
		require(msg.value > 0, "You must send some ETH");
		require(packages[hashedPassword].from == address(0), "Package conflict: please choose different passwords"); // Only before initialization this value will equal address(0);
		require(dealer != address(0), "Please verify the dealer address");
		require(dealer != msg.sender, "You cannot be the dealer");

		packages[hashedPassword] = Package(msg.sender, msg.value, dealer, block.number + deadlineInBlocks, true);
		emit PackageCreated(msg.sender, dealer, msg.value, hashedPassword);
		
		return true;
	}

	function claimPackage(bytes32 packageId, string memory recipientPassword) onlyReady public onlyPackageDealer(packageId) onlyBeforeDeadline(packageId) returns(bool success) {
		require(packages[packageId].isActive, "This package has already been claimed or cancelled");
		require(hashPassword(msg.sender, recipientPassword) == packageId, "Password does not match");
		
		emit PackageClaimed(msg.sender, packages[packageId].amount, packageId);

		packages[packageId].isActive = false;
		msg.sender.transfer(packages[packageId].amount);

		return true;
	}

	function hashPassword(address dealer, string memory recipientPassword) public view returns(bytes32) {
		return keccak256(abi.encodePacked(address(this), dealer, recipientPassword));
	}

	function cancelPackage(bytes32 packageId) public onlyReady onlyPackageOwner(packageId) onlyAfterDeadline(packageId) returns(bool success) {	
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