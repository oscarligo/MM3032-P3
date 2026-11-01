import Whiteboard from "./components/Whiteboard";
import Lexer from "./components/Lexer";


export default function SemanticEvaluator() {
    return (
        <div>
            <Whiteboard>
                <Lexer />
            </Whiteboard>
        </div>
    );
}
