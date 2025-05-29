// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract RentalContract {
    enum Status { CREATED, ACTIVE, COMPLETED, CANCELLED, DISPUTED }
    
    struct RentalInfo {
        address tenant;
        address owner;
        uint256 itemId;
        uint256 amount;
        uint256 duration;
        uint256 deposit;
        uint256 startTime;
        Status status;
    }
    
    RentalInfo public rental;
    
    event RentalCompleted(address indexed tenant, uint256 amount);
    event RentalCancelled(address indexed initiator, string reason);
    event DepositPaid(address indexed tenant, uint256 amount);
    event DepositRefunded(address indexed recipient, uint256 amount);
    
    modifier onlyTenant() {
        require(msg.sender == rental.tenant, "Only tenant can call this");
        _;
    }
    
    modifier onlyOwner() {
        require(msg.sender == rental.owner, "Only owner can call this");
        _;
    }
    
    modifier onlyParties() {
        require(msg.sender == rental.tenant || msg.sender == rental.owner, "Only parties can call this");
        _;
    }
    
    constructor(
        address _tenant,
        address _owner,
        uint256 _itemId,
        uint256 _amount,
        uint256 _duration,
        uint256 _deposit
    ) payable {
        require(_tenant != address(0), "Invalid tenant address");
        require(_owner != address(0), "Invalid owner address");
        require(_amount > 0, "Amount must be greater than 0");
        require(_duration > 0, "Duration must be greater than 0");
        require(msg.value >= _amount, "Insufficient payment");
        
        rental = RentalInfo({
            tenant: _tenant,
            owner: _owner,
            itemId: _itemId,
            amount: _amount,
            duration: _duration,
            deposit: _deposit,
            startTime: block.timestamp,
            status: Status.CREATED
        });
    }
    
    function payDeposit() external payable onlyTenant {
        require(rental.status == Status.CREATED, "Invalid status");
        require(msg.value >= rental.deposit, "Insufficient deposit");
        
        rental.status = Status.ACTIVE;
        emit DepositPaid(msg.sender, msg.value);
    }
    
    function completeRental() external onlyParties {
        require(rental.status == Status.ACTIVE, "Rental not active");
        
        rental.status = Status.COMPLETED;
        
        // Переводим деньги владельцу
        payable(rental.owner).transfer(rental.amount);
        
        // Возвращаем залог арендатору
        if (rental.deposit > 0) {
            payable(rental.tenant).transfer(rental.deposit);
            emit DepositRefunded(rental.tenant, rental.deposit);
        }
        
        emit RentalCompleted(rental.tenant, rental.amount);
    }
    
    function cancelRental(string memory _reason) external onlyParties {
        require(rental.status == Status.CREATED || rental.status == Status.ACTIVE, "Cannot cancel");
        
        rental.status = Status.CANCELLED;
        
        // Возвращаем все деньги арендатору
        uint256 refundAmount = rental.amount;
        if (rental.status == Status.ACTIVE) {
            refundAmount += rental.deposit;
        }
        
        if (refundAmount > 0) {
            payable(rental.tenant).transfer(refundAmount);
        }
        
        emit RentalCancelled(msg.sender, _reason);
    }
    
    function extendRental(uint256 _newDuration) external payable onlyTenant {
        require(rental.status == Status.ACTIVE, "Rental not active");
        require(_newDuration > rental.duration, "New duration must be longer");
        
        uint256 additionalTime = _newDuration - rental.duration;
        uint256 additionalCost = (rental.amount * additionalTime) / rental.duration;
        
        require(msg.value >= additionalCost, "Insufficient payment for extension");
        
        rental.duration = _newDuration;
        rental.amount += additionalCost;
    }
    
    function withdrawPayment() external view onlyOwner {
        require(rental.status == Status.COMPLETED, "Rental not completed");
        // Уже выполнено в completeRental()
    }
    
    function refundDeposit() external view onlyOwner {
        require(rental.status == Status.COMPLETED, "Rental not completed");
        // Уже выполнено в completeRental()
    }
    
    function getRentalInfo() external view returns (
        address tenant,
        address owner,
        uint256 itemId,
        uint256 amount,
        uint256 duration,
        uint256 deposit,
        uint256 startTime,
        uint8 status
    ) {
        return (
            rental.tenant,
            rental.owner,
            rental.itemId,
            rental.amount,
            rental.duration,
            rental.deposit,
            rental.startTime,
            uint8(rental.status)
        );
    }
    
    function getContractBalance() external view returns (uint256) {
        return address(this).balance;
    }
}