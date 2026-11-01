import type { BaseTranslation } from '../i18n-types'

const es = {
	HI: 'HOLA',
	navbar: {
		navigation: 'Navegación principal', title: 'Evaluador semántico', language: 'Idioma',
		spanish: 'Español', english: 'Inglés', lightTheme: 'Tema claro', darkTheme: 'Tema oscuro',
	},
	semanticEvaluator: {
		title: 'Evaluador semántico',
		description: 'Esta sección permite evaluar fórmulas lógicas y visualizar su estructura.',
		leftBoard: 'Pizarrón izquierdo', centerBoard: 'Pizarrón central', rightBoard: 'Pizarrón derecho',
	},
	procedure: {
		controls: 'Controles del procedimiento', progress: 'Paso {current:number} de {total:number}',
		previous: 'Anterior', restart: 'Reiniciar', play: 'Reproducir', pause: 'Pausar', next: 'Siguiente',
	},
	lexer: {
		title: 'Analizador léxico', subtitle: 'Observa cómo la fórmula se convierte en tokens, paso a paso.',
		language: 'Idioma', spanish: 'Español', english: 'Inglés', inputLabel: 'Fórmula lógica',
		inputHint: 'También puedes usar \\forall, \\exists, &, |, ->, ~ o !.', stepsTitle: 'Procedimiento',
		stepCounter: 'Paso {current:number} de {total:number}', previous: 'Anterior', next: 'Siguiente',
		restart: 'Reiniciar', play: 'Reproducir', pause: 'Pausar', cursor: 'Cursor', matched: 'Coincidencia',
		remaining: 'Por analizar', nothing: 'Nada', whitespace: 'Se ignoró un espacio en blanco.',
		recognized: 'Se reconoció {type:string}: «{value:string}».', tokensTitle: 'Tokens encontrados',
		tokenType: 'Tipo', tokenValue: 'Valor', empty: 'Escribe una fórmula para comenzar.',
		invalid: 'La fórmula contiene un carácter no reconocido.',
	},
} satisfies BaseTranslation

export default es
