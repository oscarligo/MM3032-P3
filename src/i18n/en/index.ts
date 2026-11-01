import type { Translation } from '../i18n-types'

const en = {
	HI: 'Hello',
	navbar: {
		navigation: 'Main navigation', title: 'Semantic evaluator', language: 'Language',
		spanish: 'Spanish', english: 'English', lightTheme: 'Light theme', darkTheme: 'Dark theme',
	},
	semanticEvaluator: {
		title: 'Semantic evaluator',
		description: 'This section evaluates logical formulas and visualizes their structure.',
		leftBoard: 'Left whiteboard', centerBoard: 'Center whiteboard', rightBoard: 'Right whiteboard',
	},
	procedure: {
		controls: 'Procedure controls', progress: 'Step {current} of {total}',
		previous: 'Previous', restart: 'Restart', play: 'Play', pause: 'Pause', next: 'Next',
	},
	lexer: {
		title: 'Lexical analyzer', subtitle: 'See how the formula becomes tokens, one step at a time.',
		language: 'Language', spanish: 'Spanish', english: 'English', inputLabel: 'Logical formula',
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
