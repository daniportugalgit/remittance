pragma solidity 0.5.0;

//import "./Pausable.sol";
//import "./SafeMath.sol";

//Version 0.03: HashPassword now includes addres(this), to allow for multiple instances of the contract
//The only stretch goal so far is the deadline.
contract Remittance {
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
	
	event PackageClaimed(address dealer, uint amount, bytes32 packageId);
	event PackageCancelled(address owner, bytes32 packageId);
	
	function createPackage(address payable dealer, bytes32 hashedPassword, uint deadlineInBlocks) public payable returns(bool success) {
		require(msg.value > 0, "You must send some ETH");
		require(packages[hashedPassword].from == address(0), "Package conflict: please choose different passwords"); // Only before initialization this value will equal address(0);
		require(dealer != address(0), "Please verify the dealer address");
		require(dealer != msg.sender, "You cannot be the dealer");

		packages[hashedPassword] = Package(msg.sender, msg.value, dealer, block.number + deadlineInBlocks, true);
		
		return true;
	}

	function claimPackage(bytes32 packageId, string memory recipientPassword) public onlyPackageDealer(packageId) onlyBeforeDeadline(packageId) returns(bool success) {
		require(packages[packageId].isActive, "This package has already been claimed or cancelled");
		require(hashPassword(msg.sender, recipientPassword) == packageId, "Password does not match");
		
		emit PackageClaimed(msg.sender, packages[packageId].amount, packageId);

		packages[packageId].isActive = false;
		msg.sender.transfer(packages[packageId].amount);

		return true;
	}

	function hashPassword(address destination, string memory recipientPassword) public view returns(bytes32) {
		return keccak256(abi.encodePacked(address(this), destination, recipientPassword));
	}

	function cancelPackage(bytes32 packageId) public onlyPackageOwner(packageId) onlyAfterDeadline(packageId) returns(bool success) {	
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