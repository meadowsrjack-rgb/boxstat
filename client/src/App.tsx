import ErrorBoundary from "@/components/ErrorBoundary";

function SimpleApp() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="text-center space-y-6">
        <h1 className="text-4xl font-bold text-gray-900">
          🏀 UYP Basketball
        </h1>
        <p className="text-lg text-gray-600">
          Welcome to the UYP Basketball League App
        </p>
        <div className="bg-white rounded-lg shadow-lg p-6 max-w-md mx-auto">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            App Status: ✅ Working
          </h2>
          <p className="text-gray-600">
            The application is now running successfully!
          </p>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <SimpleApp />
    </ErrorBoundary>
  );
}