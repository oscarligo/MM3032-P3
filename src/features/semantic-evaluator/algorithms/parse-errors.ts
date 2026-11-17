export type ParseErrorPayload =
    | { code: "EMPTY_INPUT" }
    | { code: "UNEXPECTED_CHARACTER"; character: string; position: number }
    | { code: "UNCLOSED_PARENTHESIS"; position: number }
    | { code: "EMPTY_PARENTHESES"; position: number }
    | { code: "MISSING_ARGUMENT_COMMA"; container: string; position: number }
    | { code: "TRAILING_COMMA"; container: string; position: number }
    | { code: "ZERO_ARITY_FUNCTION"; identifier: string; position: number }
    | { code: "MISSING_OPERAND"; operator: string; position: number }
    | { code: "MISSING_BINARY_CONNECTIVE"; found: string; position: number }
    | { code: "EXPECTED_QUANTIFIER_VARIABLE"; quantifier: string; position: number }
    | { code: "MISSING_QUANTIFIER_BODY"; quantifier: string; variable: string; position: number }
    | { code: "FORMULA_IN_TERM_POSITION"; token: string; position: number }
    | { code: "SYMBOL_ROLE_CONFLICT"; symbol: string; position: number }
    | { code: "EXPECTED_TERM_IDENTIFIER"; found: string; position: number }
    | { code: "UNEXPECTED_TOKEN"; value: string; type: string; position: number };

export class FormulaSyntaxError extends Error {
    constructor(public readonly payload: ParseErrorPayload) {
        super(payload.code);
        this.name = "FormulaSyntaxError";
    }
}
