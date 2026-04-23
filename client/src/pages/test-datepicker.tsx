import { useState } from "react";
import { Calendar } from "lucide-react";
import { DateOfBirthPicker } from "@/components/DateOfBirthPicker";

export default function TestDatePicker() {
  const [showPicker, setShowPicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | undefined>(undefined);

  return (
    <div className="min-h-screen bg-black p-8">
      <div className="max-w-md mx-auto space-y-8">
        <h1 className="text-2xl font-bold text-white text-center">Date Picker Test</h1>

        <div className="space-y-4">
          <p className="text-gray-400 text-center">Click the button below to open the date picker</p>

          <button
            type="button"
            onClick={() => setShowPicker(true)}
            className="w-full h-12 px-4 bg-gray-800 border border-gray-700 text-white rounded-md flex items-center justify-between hover:bg-gray-700 transition-colors"
          >
            <span className={selectedDate ? "text-white" : "text-gray-500"}>
              {selectedDate
                ? new Date(selectedDate).toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })
                : "Select date of birth"}
            </span>
            <Calendar className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <DateOfBirthPicker
          open={showPicker}
          onOpenChange={setShowPicker}
          value={selectedDate}
          onChange={setSelectedDate}
          startYear={1920}
          endYear={new Date().getFullYear()}
          defaultDate={new Date(2015, 5, 15)}
        />
      </div>
    </div>
  );
}
