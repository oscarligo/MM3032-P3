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
	parser: {
		structure: 'Estructura generada', tree: 'Árbol sintáctico', waiting: 'El parser comenzará después del lexer.',
		building: 'Construyendo el árbol…', bound: 'Variable ligada', free: 'Variable libre',
		invalid: 'No se pudo construir el árbol sintáctico.',
		call: 'Llamada', match: 'Coincidencia', shift: 'Avance', reduce: 'Reducción',
		bind: 'Ligar variable', unbind: 'Cerrar alcance',
		currentFunction: 'Función actual',
		functionHistory: 'Llamadas del token',
		tokenStream: 'Tokens del lexer', currentToken: 'Token por leer', decision: 'Siguiente acción',
		openUniversal: 'Abre un cuantificador universal y espera la variable que quedará ligada.',
		openExistential: 'Abre un cuantificador existencial y espera la variable que quedará ligada.',
		buildNegation: 'Crea un nodo de negación y analiza su operando.',
		buildImplication: 'Crea una implicación; el árbol izquierdo será el antecedente y el derecho el consecuente.',
		buildDisjunction: 'Crea una disyunción con las subfórmulas izquierda y derecha.',
		buildConjunction: 'Crea una conjunción con las subfórmulas izquierda y derecha.',
		openGroup: 'Abre una subfórmula agrupada y comienza a analizarla.',
		closeGroup: 'Cierra la subfórmula agrupada actual.', nextArgument: 'Termina el argumento actual y comienza el siguiente.',
		finishFormula: 'Confirma EOF: la fórmula y el árbol sintáctico están completos.',
		bindVariable: 'Registra el identificador como variable ligada del cuantificador activo.',
		readTerm: 'Interpreta el identificador como término del predicado o función.',
		buildPredicate: 'Crea un nodo de predicado y prepara la lectura de sus argumentos.',
	},
	lexer: {
		title: 'Analizador léxico', subtitle: 'Observa cómo la fórmula se convierte en tokens, paso a paso.',
		language: 'Idioma', spanish: 'Español', english: 'Inglés', inputLabel: 'Fórmula de entrada',
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
