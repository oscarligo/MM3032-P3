
/*
    Tipos y estructuras de datos para representar términos, fórmulas, interpretaciones 
    y entornos de evaluación en lógica de primer orden.
*/

// Representación de términos.
export type Term =
    | { kind: "var"; name: string }
    | { kind: "const"; name: string }
    | { kind: "func"; name: string; args: Term[] };

// Representación de una fórmula.
export type Formula =
    | { kind: "atom"; predicate: string; args: Term[] }
    | { kind: "eq"; left: Term; right: Term }
    | { kind: "not"; inner: Formula }
    | { kind: "and"; left: Formula; right: Formula }
    | { kind: "or"; left: Formula; right: Formula }
    | { kind: "implies"; left: Formula; right: Formula }
    | { kind: "iff"; left: Formula; right: Formula }
    | { kind: "forall"; variable: string; inner: Formula }
    | { kind: "exists"; variable: string; inner: Formula };

// Representación de una interpretación.
export interface Interpretation {
    domain: Set<string>;
    constants: Map<string, string>;
    functions: Map<string, { arity: number; table: Map<string, string> }>;
    predicates: Map<string, { arity: number; tuples: Set<string> }>;
}

// Representación de un entorno de evaluación.
export type Environment = ReadonlyMap<string, string>;
