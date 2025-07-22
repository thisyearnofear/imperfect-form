// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract SimpleTest {
    string public message;
    
    constructor() {
        message = "Hello Celo Alfajores!";
    }
    
    function setMessage(string memory _message) public {
        message = _message;
    }
}