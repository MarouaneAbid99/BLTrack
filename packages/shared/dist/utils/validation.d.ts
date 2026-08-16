export interface ValidationResult {
    isValid: boolean;
    errors: Record<string, string>;
}
export declare function validateLoginRequest(data: any): ValidationResult;
export declare function validateCreateBLRequest(data: any): ValidationResult;
