import { useEffect } from "react";
import SemanticEvaluator from "./features/semantic-evaluator/SemanticEvaluator";
import Layout from "./components/layout/Layout";
import { initAudio } from "./lib/audio";

function App() {
  useEffect(() => initAudio(), []);

  return <Layout><SemanticEvaluator /></Layout>;
}

export default App;
