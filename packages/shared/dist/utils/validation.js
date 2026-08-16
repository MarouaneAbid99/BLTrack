"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateLoginRequest = validateLoginRequest;
exports.validateCreateBLRequest = validateCreateBLRequest;
const enums_1 = require("../constants/enums");
function validateLoginRequest(data) {
    const errors = {};
    if (!data || typeof data !== 'object') {
        return { isValid: false, errors: { _global: 'Invalid request payload' } };
    }
    const username = data.username?.trim();
    const password = data.password;
    if (!username) {
        errors.username = 'Username is required';
    }
    if (!password) {
        errors.password = 'Password is required';
    }
    return {
        isValid: Object.keys(errors).length === 0,
        errors
    };
}
function validateCreateBLRequest(data) {
    const errors = {};
    if (!data || typeof data !== 'object') {
        return { isValid: false, errors: { _global: 'Invalid request payload' } };
    }
    const blNumber = data.blNumber?.trim();
    const clientId = data.clientId?.trim();
    const amount = Number(data.amount);
    const paymentMethod = data.paymentMethod;
    const paymentStatus = data.paymentStatus;
    if (!blNumber) {
        errors.blNumber = 'BL number is required';
    }
    if (!clientId) {
        errors.clientId = 'Client ID is required';
    }
    if (isNaN(amount) || amount <= 0) {
        errors.amount = 'Amount must be a positive number';
    }
    if (!paymentMethod || !Object.values(enums_1.PaymentMethod).includes(paymentMethod)) {
        errors.paymentMethod = `Payment method must be one of: ${Object.values(enums_1.PaymentMethod).join(', ')}`;
    }
    if (!paymentStatus || !Object.values(enums_1.PaymentStatus).includes(paymentStatus)) {
        errors.paymentStatus = `Payment status must be one of: ${Object.values(enums_1.PaymentStatus).join(', ')}`;
    }
    return {
        isValid: Object.keys(errors).length === 0,
        errors
    };
}
