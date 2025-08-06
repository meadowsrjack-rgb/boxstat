export default function SimpleTrophies() {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <h1 className="text-2xl font-bold text-gray-900">Trophies & Badges</h1>
      <p className="mt-4 text-gray-600">This is a simple test of the trophies page routing.</p>
      <button 
        onClick={() => window.history.back()}
        className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
      >
        Go Back
      </button>
    </div>
  );
}