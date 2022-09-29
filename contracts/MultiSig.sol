// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.9;

contract MultiSig {
    event Received(address indexed sender, uint256 amount, uint256 balance);
    event TxSubmitted(
        address indexed owner,
        uint256 indexed txIndex,
        address indexed to,
        uint256 value,
        bytes data
    );
    event TxApproved(address indexed owner, uint256 indexed txIndex);
    event ApprovalRevoked(address indexed owner, uint256 indexed txIndex);
    event TxExecuted(address indexed executor, uint256 indexed txIndex, bytes returnData);
    event Deployed(string name, bytes32 indexed indexedName, address indexed addr, bytes bytecode);

    address[] public owners;
    mapping(address => bool) public isOwner;
    uint256 public numConfirmationsRequired;

    struct Transaction {
        address to;
        uint256 value;
        bytes data;
        bool executed;
        uint256 numConfirmations;
    }

    // mapping from tx index => owner => bool
    mapping(uint256 => mapping(address => bool)) public isConfirmed;

    Transaction[] public transactions;

    modifier onlyOwner() {
        require(isOwner[msg.sender], 'not owner');
        _;
    }

    modifier onlySelf() {
        require(msg.sender == address(this), 'not self');
        _;
    }

    modifier txExists(uint256 _txIndex) {
        require(_txIndex < transactions.length, 'tx does not exist');
        _;
    }

    modifier notExecuted(uint256 _txIndex) {
        require(!transactions[_txIndex].executed, 'tx already executed');
        _;
    }

    modifier notConfirmed(uint256 _txIndex) {
        require(!isConfirmed[_txIndex][msg.sender], 'tx already confirmed');
        _;
    }

    constructor(address[] memory _owners, uint256 _numConfirmationsRequired) {
        require(_owners.length > 0, 'owners required');
        require(
            _numConfirmationsRequired > 0 && _numConfirmationsRequired <= _owners.length,
            'invalid number of required confirmations'
        );

        for (uint256 i = 0; i < _owners.length; i++) {
            address owner = _owners[i];

            require(owner != address(0), 'invalid owner');
            require(!isOwner[owner], 'owner not unique');

            isOwner[owner] = true;
            owners.push(owner);
        }

        numConfirmationsRequired = _numConfirmationsRequired;
    }

    receive() external payable {
        emit Received(msg.sender, msg.value, address(this).balance);
    }

    function addOwner(address newOwner, uint8 _numConfirmationsRequired) public onlySelf {
        require(
            _numConfirmationsRequired > 0 && _numConfirmationsRequired <= owners.length + 1,
            'invalid number of required confirmations'
        );
        require(newOwner != address(0), 'invalid owner');
        require(!isOwner[newOwner], 'owner not unique');
        isOwner[newOwner] = true;
        owners.push(newOwner);

        numConfirmationsRequired = _numConfirmationsRequired;
    }

    function removeOwner(address ownerToRemove, uint8 _numConfirmationsRequired) public onlySelf {
        require(
            _numConfirmationsRequired > 0 && _numConfirmationsRequired <= owners.length - 1,
            'invalid number of required confirmations'
        );
        require(owners.length > 1, 'cannot remove last owner');
        require(isOwner[ownerToRemove], 'address is not an owner');
        uint256 index = findOwner(ownerToRemove);
        if (index != (owners.length - 1)) {
            owners[index] = owners[owners.length - 1];
        }
        isOwner[ownerToRemove] = false;
        owners.pop();

        numConfirmationsRequired = _numConfirmationsRequired;
    }

    function findOwner(address ownerAddy) private view returns (uint256) {
        for (uint256 i; i < owners.length; i++) {
            if (ownerAddy == owners[i]) {
                return i;
            }
        }
    }

    function changeRequiredConfirmations(uint8 _numConfirmationsRequired) public onlySelf {
        require(
            _numConfirmationsRequired > 0 && _numConfirmationsRequired <= owners.length,
            'invalid number of required confirmations'
        );
        numConfirmationsRequired = _numConfirmationsRequired;
    }

    function submitTransaction(
        address _to,
        uint256 _value,
        bytes memory _data
    ) public onlyOwner {
        transactions.push(
            Transaction({to: _to, value: _value, data: _data, executed: false, numConfirmations: 0})
        );

        emit TxSubmitted(msg.sender, transactions.length - 1, _to, _value, _data);
    }

    function approveTransaction(uint256 _txIndex)
        public
        onlyOwner
        txExists(_txIndex)
        notExecuted(_txIndex)
        notConfirmed(_txIndex)
    {
        Transaction storage transaction = transactions[_txIndex];
        transaction.numConfirmations += 1;
        isConfirmed[_txIndex][msg.sender] = true;

        emit TxApproved(msg.sender, _txIndex);
    }

    function revokeApproval(uint256 _txIndex)
        public
        onlyOwner
        txExists(_txIndex)
        notExecuted(_txIndex)
    {
        require(isConfirmed[_txIndex][msg.sender], 'tx not confirmed');

        Transaction storage transaction = transactions[_txIndex];

        transaction.numConfirmations -= 1;
        isConfirmed[_txIndex][msg.sender] = false;

        emit ApprovalRevoked(msg.sender, _txIndex);
    }

    function executeTransaction(uint256 _txIndex)
        public
        onlyOwner
        txExists(_txIndex)
        notExecuted(_txIndex)
    {
        Transaction storage transaction = transactions[_txIndex];

        require(transaction.numConfirmations >= numConfirmationsRequired, 'cannot execute tx');

        transaction.executed = true;

        (bool success, bytes memory returnData) = transaction.to.call{value: transaction.value}(
            transaction.data
        );
        require(success, string(abi.encodePacked('Transaction failed; ', returnData)));

        emit TxExecuted(msg.sender, _txIndex, returnData);
    }

    function deployContract(
        string memory name,
        bytes memory bytecode,
        bytes32 salt
    ) public payable onlySelf {
        require(bytes(name).length < 32, 'name string must be less than 32 bytes');
        address addr;

        assembly {
            addr := create2(callvalue(), add(bytecode, 0x20), mload(bytecode), salt)

            if iszero(extcodesize(addr)) {
                revert(0, 0)
            }
        }

        emit Deployed(name, bytes32(bytes(name)), addr, bytecode);
    }

    function getOwners() public view returns (address[] memory) {
        return owners;
    }

    function getTransactionCount() public view returns (uint256) {
        return transactions.length;
    }

    function getTransaction(uint256 _txIndex)
        public
        view
        returns (
            address to,
            uint256 value,
            bytes memory data,
            bool executed,
            uint256 numConfirmations
        )
    {
        Transaction storage transaction = transactions[_txIndex];

        return (
            transaction.to,
            transaction.value,
            transaction.data,
            transaction.executed,
            transaction.numConfirmations
        );
    }
}
