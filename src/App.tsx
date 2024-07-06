import "./App.css";

import ReactFlow from "reactflow";

import "reactflow/dist/style.css";

import {Header} from "./components/Header";

const initialNodes = [
  { id: "1", position: { x: 0, y: 0 }, data: { label: "1" } },
  { id: "2", position: { x: 0, y: 100 }, data: { label: "2" } },
];
const initialEdges = [{ id: "e1-2", source: "1", target: "2" }];

const currentUser = {
  name: "John Doe",
}

function App() {
  return (
    <div className="app-container">
      <Header currentUser={currentUser} />
      <div className="main">
        <div className="reactflow-container">
          <ReactFlow nodes={initialNodes} edges={initialEdges} />
        </div>
      </div>
    </div>
  );
}

export default App;
