"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LegacyPaymentStatus = exports.LegacyPaymentMethod = exports.PaymentStatus = exports.PaymentMethod = exports.UserRole = void 0;
var UserRole;
(function (UserRole) {
    UserRole["ADMIN"] = "ADMIN";
    UserRole["COURIER"] = "COURIER";
})(UserRole || (exports.UserRole = UserRole = {}));
var PaymentMethod;
(function (PaymentMethod) {
    PaymentMethod["CASH"] = "CASH";
    PaymentMethod["CHEQUE"] = "CHEQUE"; // Chèque
})(PaymentMethod || (exports.PaymentMethod = PaymentMethod = {}));
var PaymentStatus;
(function (PaymentStatus) {
    PaymentStatus["PAID"] = "PAID";
    PaymentStatus["UNPAID"] = "UNPAID";
    PaymentStatus["EN_COMPTE"] = "EN_COMPTE"; // Client en compte; this is not a payment method
})(PaymentStatus || (exports.PaymentStatus = PaymentStatus = {}));
var LegacyPaymentMethod;
(function (LegacyPaymentMethod) {
    LegacyPaymentMethod["CASH"] = "CASH";
    LegacyPaymentMethod["CHEQUE"] = "CHEQUE";
    LegacyPaymentMethod["ACCOUNT"] = "ACCOUNT";
})(LegacyPaymentMethod || (exports.LegacyPaymentMethod = LegacyPaymentMethod = {}));
var LegacyPaymentStatus;
(function (LegacyPaymentStatus) {
    LegacyPaymentStatus["PENDING"] = "PENDING";
    LegacyPaymentStatus["PAID"] = "PAID";
})(LegacyPaymentStatus || (exports.LegacyPaymentStatus = LegacyPaymentStatus = {}));
