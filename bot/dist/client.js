"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setClient = setClient;
exports.getClient = getClient;
let _client = null;
function setClient(c) {
    _client = c;
}
function getClient() {
    if (!_client)
        throw new Error('Client not initialized yet');
    return _client;
}
