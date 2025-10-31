import { useState } from "react";
import EventWindowsConfigurator, { WindowRule } from "@/components/EventWindowsConfigurator";

export default function ConfiguratorDemo() {
  const [savedRules, setSavedRules] = useState<WindowRule[] | null>(null);

  const handleChange = (rules: WindowRule[]) => {
    console.log("Rules changed:", rules);
  };

  const handleSave = (rules: WindowRule[]) => {
    console.log("Rules saved:", rules);
    setSavedRules(rules);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Event Windows Configurator Demo
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Configure RSVP and Check-in windows for events
          </p>
        </div>

        <EventWindowsConfigurator
          onChange={handleChange}
          onSave={handleSave}
        />

        {savedRules && (
          <div className="mt-8">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
              Saved Configuration (JSON)
            </h2>
            <pre className="bg-gray-800 text-gray-100 p-4 rounded-lg overflow-auto text-sm">
              {JSON.stringify(savedRules, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
