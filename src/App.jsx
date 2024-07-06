import "./App.css";

import "reactflow/dist/style.css";

import { Header } from "./components/Header";
import { useAppStore } from "./store";
import { ReactFlow } from "reactflow";

function App() {
  const people = useAppStore((store) => store.people);
  const initialNodes = people.map((person, i) => {
    return {
      id: i.toString(),
      position: { x: i * 100, y: i * 100 },
      data: { label: person.name },
    };
  });

  return (
    <div className="app-container">
      <Header />
      <div className="main">
        <div className="reactflow-container">
          <ReactFlow nodes={initialNodes} edges={[]} />
        </div>
      </div>
    </div>
  );
}

export default App;
