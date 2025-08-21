import React from "react";

function SimpleTest() {
  return (
    <div className="min-h-screen bg-blue-50 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-blue-900 mb-4">UYP Basketball App</h1>
        <p className="text-blue-700">Testing React Setup - No Hooks</p>
        <div className="mt-4">
          <button 
            onClick={() => console.log('Button clicked!')}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Test Button
          </button>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return <SimpleTest />;
}