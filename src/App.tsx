import "./App.css";

import ReactFlow from "reactflow";

import "reactflow/dist/style.css";

const initialNodes = [
  { id: "1", position: { x: 0, y: 0 }, data: { label: "1" } },
  { id: "2", position: { x: 0, y: 100 }, data: { label: "2" } },
];
const initialEdges = [{ id: "e1-2", source: "1", target: "2" }];

function App() {
  return (
    <div className="app-container">
      <Header />
      <div className="main">
        <div className="reactflow-container">
          <ReactFlow nodes={initialNodes} edges={initialEdges} />
        </div>
      </div>
    </div>
  );
}

export default App;
