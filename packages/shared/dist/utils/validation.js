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
    const blDate = data.blDate ?? data.deliveryDate;
    if (!blNumber) {
        errors.blNumber = 'BL number is required';
    }
    if (!clientId) {
        errors.clientId = 'Client ID is required';
    }
    if (isNaN(amount) || amount <= 0) {
        errors.amount = 'Amount must be a positive number';
    }
    if (typeof blDate !== 'string' || Number.isNaN(Date.parse(blDate))) {
        errors.blDate = 'BL date must be a valid date';
    }
    if (data.payment !== undefined) {
        const payment = data.payment;
        if (!payment || typeof payment !== 'object' || Array.isArray(payment)) {
            errors.payment = 'Payment must be an object';
        }
        else {
            const status = payment.status;
            const method = payment.method ?? null;
            if (!Object.values(enums_1.PaymentStatus).includes(status))
                errors.paymentStatus = 'Payment status is invalid';
            if (Object.prototype.hasOwnProperty.call(payment, 'paidAt'))
                errors.paidAt = 'paidAt is server-owned';
            if (status === enums_1.PaymentStatus.PAID) {
                if (!Object.values(enums_1.PaymentMethod).includes(method))
                    errors.paymentMethod = 'Paid payments require CASH or CHEQUE';
            }
            else if (method !== null) {
                errors.payment = 'UNPAID and EN_COMPTE cannot have a method or paidAt';
            }
        }
    }
    else if (data.paymentMethod !== undefined || data.paymentStatus !== undefined) {
        if (!Object.values(enums_1.LegacyPaymentMethod).includes(data.paymentMethod))
            errors.paymentMethod = 'Legacy payment method is invalid';
        if (!Object.values(enums_1.LegacyPaymentStatus).includes(data.paymentStatus))
            errors.paymentStatus = 'Legacy payment status is invalid';
    }
    return {
        isValid: Object.keys(errors).length === 0,
        errors
    };
}
