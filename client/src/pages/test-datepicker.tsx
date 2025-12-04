import { useState } from "react";
import { DateScrollPicker } from "react-date-wheel-picker";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Calendar } from "lucide-react";

export default function TestDatePicker() {
  const [showPicker, setShowPicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const defaultYear = 2015;
  const defaultMonth = 6;
  const defaultDay = 15;

  const handleDateChange = (date: Date) => {
    setSelectedDate(date);
  };

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
              {selectedDate ? selectedDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : "Select date of birth"}
            </span>
            <Calendar className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <Dialog open={showPicker} onOpenChange={setShowPicker}>
          <DialogContent className="bg-gray-900 border-gray-700 max-w-sm">
            <DialogHeader>
              <DialogTitle className="text-white text-center">Select Date of Birth</DialogTitle>
            </DialogHeader>
            <div className="py-4 flex justify-center date-wheel-picker-dark">
              <DateScrollPicker
                key={showPicker ? 'open' : 'closed'}
                defaultYear={defaultYear}
                defaultMonth={defaultMonth}
                defaultDay={defaultDay}
                startYear={2000}
                endYear={new Date().getFullYear()}
                dateTimeFormatOptions={{ month: 'short' }}
                highlightOverlayStyle={{ backgroundColor: 'transparent', border: 'none' }}
                onDateChange={handleDateChange}
              />
            </div>
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                className="flex-1 border-gray-600 text-gray-500 hover:bg-gray-800"
                onClick={() => setShowPicker(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                onClick={() => setShowPicker(false)}
              >
                Confirm
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
