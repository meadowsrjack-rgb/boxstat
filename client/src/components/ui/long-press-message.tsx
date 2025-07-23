import { useState, useRef, ReactNode } from "react";
import { EmojiReactionPicker } from "./emoji-reactions";

interface LongPressMessageProps {
  children: ReactNode;
  messageId: number;
  className?: string;
}

export function LongPressMessage({ children, messageId, className = "" }: LongPressMessageProps) {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [pickerPosition, setPickerPosition] = useState({ x: 0, y: 0 });
  const timeoutRef = useRef<NodeJS.Timeout>();
  const pressStartTime = useRef<number>(0);

  const handlePointerDown = (e: React.PointerEvent) => {
    pressStartTime.current = Date.now();
    const rect = e.currentTarget.getBoundingClientRect();
    
    timeoutRef.current = setTimeout(() => {
      setPickerPosition({
        x: e.clientX,
        y: e.clientY,
      });
      setShowEmojiPicker(true);
      
      // Add haptic feedback on mobile
      if ('vibrate' in navigator) {
        navigator.vibrate(50);
      }
    }, 500); // 500ms long press
  };

  const handlePointerUp = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    // If it was a quick tap (less than 500ms), don't show emoji picker
    const pressDuration = Date.now() - pressStartTime.current;
    if (pressDuration < 500) {
      setShowEmojiPicker(false);
    }
  };

  const handlePointerLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  };

  const closeEmojiPicker = () => {
    setShowEmojiPicker(false);
  };

  return (
    <>
      <div
        className={`select-none ${className}`}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerLeave}
        style={{ touchAction: 'manipulation' }}
      >
        {children}
      </div>
      
      {showEmojiPicker && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={closeEmojiPicker}
          />
          <EmojiReactionPicker
            messageId={messageId}
            onClose={closeEmojiPicker}
            position={pickerPosition}
          />
        </>
      )}
    </>
  );
}