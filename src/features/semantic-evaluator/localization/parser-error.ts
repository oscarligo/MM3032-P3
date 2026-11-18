import { FormulaSyntaxError } from "../algorithms/parse-errors";

type ParserErrorTranslations = {
    errorEmptyInput: () => string;
    errorUnexpectedCharacter: (args: { character: string; position: number }) => string;
    errorUnclosedParenthesis: () => string;
    errorEmptyParentheses: () => string;
    errorMissingArgumentComma: (args: { container: string }) => string;
    errorTrailingComma: () => string;
    errorZeroArityFunction: () => string;
    errorMissingOperand: (args: { operator: string }) => string;
    errorMissingBinaryConnective: (args: { found: string }) => string;
    errorExpectedQuantifierVariable: (args: { quantifier: string }) => string;
    errorMissingQuantifierBody: (args: { quantifier: string; variable: string }) => string;
    errorFormulaInTermPosition: (args: { token: string }) => string;
    errorSymbolRoleConflict: (args: { symbol: string }) => string;
    errorExpectedTermIdentifier: (args: { found: string }) => string;
    errorUnexpectedToken: (args: { value: string; type: string }) => string;
    errorUnknown: () => string;
};

export function localizeParserError(error: unknown, LL: ParserErrorTranslations): string {
    if (!(error instanceof FormulaSyntaxError)) return LL.errorUnknown();

    const payload = error.payload;
    switch (payload.code) {
        case "EMPTY_INPUT": return LL.errorEmptyInput();
        case "UNEXPECTED_CHARACTER": return LL.errorUnexpectedCharacter(payload);
        case "UNCLOSED_PARENTHESIS": return LL.errorUnclosedParenthesis();
        case "EMPTY_PARENTHESES": return LL.errorEmptyParentheses();
        case "MISSING_ARGUMENT_COMMA": return LL.errorMissingArgumentComma(payload);
        case "TRAILING_COMMA": return LL.errorTrailingComma();
        case "ZERO_ARITY_FUNCTION": return LL.errorZeroArityFunction();
        case "MISSING_OPERAND": return LL.errorMissingOperand(payload);
        case "MISSING_BINARY_CONNECTIVE": return LL.errorMissingBinaryConnective(payload);
        case "EXPECTED_QUANTIFIER_VARIABLE": return LL.errorExpectedQuantifierVariable(payload);
        case "MISSING_QUANTIFIER_BODY": return LL.errorMissingQuantifierBody(payload);
        case "FORMULA_IN_TERM_POSITION": return LL.errorFormulaInTermPosition(payload);
        case "SYMBOL_ROLE_CONFLICT": return LL.errorSymbolRoleConflict(payload);
        case "EXPECTED_TERM_IDENTIFIER": return LL.errorExpectedTermIdentifier(payload);
        case "UNEXPECTED_TOKEN": return LL.errorUnexpectedToken(payload);
    }
}
