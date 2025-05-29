// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./RentalContract.sol";

contract RentalFactory {
    address[] public allContracts;
    mapping(address => address[]) public userContracts;
    
    event RentalContractCreated(
        address indexed contractAddress,
        address indexed tenant,
        address indexed owner,
        uint256 itemId
    );
    
    function createRentalContract(
        address _tenant,
        uint256 _itemId,
        uint256 _duration,
        uint256 _deposit
    ) external payable returns (address) {
        require(_tenant != address(0), "Invalid tenant address");
        require(msg.value > 0, "Payment required");
        
        RentalContract newContract = new RentalContract{value: msg.value}(
            _tenant,
            msg.sender, // owner
            _itemId,
            msg.value,
            _duration,
            _deposit
        );
        
        address contractAddress = address(newContract);
        
        allContracts.push(contractAddress);
        userContracts[msg.sender].push(contractAddress);
        userContracts[_tenant].push(contractAddress);
        
        emit RentalContractCreated(contractAddress, _tenant, msg.sender, _itemId);
        
        return contractAddress;
    }
    
    function getUserContracts(address _user) external view returns (address[] memory) {
        return userContracts[_user];
    }
    
    function getAllContracts() external view returns (address[] memory) {
        return allContracts;
    }
    
    function getContractCount() external view returns (uint256) {
        return allContracts.length;
    }
}