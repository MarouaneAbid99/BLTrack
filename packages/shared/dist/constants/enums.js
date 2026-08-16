"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentStatus = exports.PaymentMethod = exports.UserRole = void 0;
var UserRole;
(function (UserRole) {
    UserRole["ADMIN"] = "ADMIN";
    UserRole["COURIER"] = "COURIER";
})(UserRole || (exports.UserRole = UserRole = {}));
var PaymentMethod;
(function (PaymentMethod) {
    PaymentMethod["CASH"] = "CASH";
    PaymentMethod["CHEQUE"] = "CHEQUE";
    PaymentMethod["ACCOUNT"] = "ACCOUNT"; // En compte (Client account, settled periodically)
})(PaymentMethod || (exports.PaymentMethod = PaymentMethod = {}));
var PaymentStatus;
(function (PaymentStatus) {
    PaymentStatus["PENDING"] = "PENDING";
    PaymentStatus["PAID"] = "PAID"; // Payé
})(PaymentStatus || (exports.PaymentStatus = PaymentStatus = {}));
