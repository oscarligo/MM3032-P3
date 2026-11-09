import type { Translation } from '../i18n-types'

const en = {
	HI: 'Hello',
	navbar: {
		navigation: 'Main navigation', title: 'Semantic evaluator', language: 'Language',
		spanish: 'Spanish', english: 'English', lightTheme: 'Light theme', darkTheme: 'Dark theme',
	},
	semanticEvaluator: {
		title: 'Semantic evaluator', example: 'Example',
		description: 'This section evaluates logical formulas and visualizes their structure.',
		leftBoard: 'Left whiteboard', centerBoard: 'Center whiteboard', rightBoard: 'Right whiteboard',
	},
	procedure: {
		controls: 'Procedure controls', progress: 'Step {current} of {total}',
		previous: 'Previous', restart: 'Restart', play: 'Play', pause: 'Pause', next: 'Next',
	},
	parser: {
		structure: 'Generated structure', tree: 'Syntax tree', waiting: 'The parser will start after the lexer.',
		building: 'Building the tree…', bound: 'Bound variable', free: 'Free variable',
		invalid: 'The syntax tree could not be built.',
		call: 'Call', match: 'Match', shift: 'Shift', reduce: 'Reduce',
		bind: 'Bind variable', unbind: 'Close scope',
		currentFunction: 'Current function',
		functionHistory: 'Token calls',
		tokenStream: 'Lexer tokens', currentToken: 'Next token to read', decision: 'Next action',
		openUniversal: 'Opens a universal quantifier and expects the variable it will bind.',
		openExistential: 'Opens an existential quantifier and expects the variable it will bind.',
		buildNegation: 'Creates a negation node and parses its operand.',
		buildImplication: 'Creates an implication; the left tree is the antecedent and the right is the consequent.',
		buildDisjunction: 'Creates a disjunction with its left and right subformulas.',
		buildConjunction: 'Creates a conjunction with its left and right subformulas.',
		openGroup: 'Opens a grouped subformula and starts parsing it.',
		closeGroup: 'Closes the current grouped subformula.', nextArgument: 'Finishes the current argument and starts the next one.',
		finishFormula: 'Confirms EOF: the formula and syntax tree are complete.',
		bindVariable: 'Registers the identifier as a variable bound by the active quantifier.',
		readTerm: 'Interprets the identifier as a predicate or function term.',
		buildPredicate: 'Creates a predicate node and prepares to read its arguments.',
	},
	lexer: {
		title: 'Lexical analyzer', subtitle: 'See how the formula becomes tokens, one step at a time.',
		language: 'Language', spanish: 'Spanish', english: 'English', inputLabel: 'Input formula',
		inputHint: 'You can also use \\forall, \\exists, &, |, ->, ~ or !.', stepsTitle: 'Procedure',
		stepCounter: 'Step {current} of {total}', previous: 'Previous', next: 'Next',
		restart: 'Restart', play: 'Play', pause: 'Pause', cursor: 'Cursor', matched: 'Match',
		remaining: 'Remaining', nothing: 'Nothing', whitespace: 'Whitespace was ignored.',
		recognized: '{type} was recognized: “{value}”.', tokensTitle: 'Tokens found',
		tokenType: 'Type', tokenValue: 'Value', empty: 'Enter a formula to begin.',
		invalid: 'The formula contains an unrecognized character.',
	},
} satisfies Translation

export default en
