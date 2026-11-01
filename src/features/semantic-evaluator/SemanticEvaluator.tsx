import Whiteboard from "./components/Whiteboard";
import Lexer from "./components/Lexer";
import { useI18nContext } from "../../i18n/i18n-react";


export default function SemanticEvaluator() {
    const { LL } = useI18nContext();
    return (
        <div>
            <h1>{LL.semanticEvaluator.title()}</h1>
            <p>{LL.semanticEvaluator.description()}</p>
            <Whiteboard>
                <p>Contenido de la pizarra</p>
                <Lexer />
            </Whiteboard>
        </div>
    );
}
