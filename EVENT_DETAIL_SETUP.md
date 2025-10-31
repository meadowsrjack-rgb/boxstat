# Event Detail Modal Setup Guide

## 📦 Components Created

### 1. **EventDetailModal.tsx**
Main modal component for displaying event details with RSVP and Check-in functionality.

**Location:** `client/src/components/EventDetailModal.tsx`

### 2. **EventDetailDemo.tsx**
Demo page showcasing the EventDetailModal with sample events.

**Location:** `client/src/pages/EventDetailDemo.tsx`

## 🎯 Features Implemented

### RSVP Management
- ✅ **Status Indicators:**
  - 🟢 Green circle - "Attending"
  - 🔴 Red circle - "Not Attending"  
  - ⚪ White circle - "No Response Yet"

- ✅ **Dynamic Buttons:**
  - "Attending" / "Not Attending" buttons when RSVP is open
  - "Change to Attending" / "Change to Not Attending" when already responded
  - Disabled when RSVP window is closed

- ✅ **Window Management:**
  - Shows "RSVP opens in..." before window opens
  - Shows "RSVP closes in..." countdown during window
  - Shows "RSVP is now closed" after deadline

### Check-In Management
- ✅ **Status Display:**
  - Shows "You're Checked In!" when checked in (green)
  - Shows "Not Checked In" when pending
  - Shows "Check-in opens in..." before window
  - Shows "Check-in closed at..." after window

- ✅ **Check-In Button:**
  - Large green "Check-In Now" button appears when window is open
  - Includes QR code icon
  - Disabled after successful check-in
  - Shows timestamp after check-in

### Location & Maps
- ✅ **Google Maps Integration:**
  - Static map preview of event location
  - Marker at exact coordinates
  - Responsive map display

- ✅ **Location Display:**
  - Address text with map pin icon
  - Clickable map preview

### Real-time Features
- ✅ **Live Countdown:**
  - Updates every second
  - Shows most relevant countdown (RSVP close → Check-in open → Check-in close)
  - Displayed in alert banner

### Role-Based Features
- ✅ **Admin/Coach View:**
  - Special info banner for admins/coaches
  - Notes about manual override capabilities
  - Access to attendance dashboard

### Event Information
- ✅ **Event Details:**
  - Title and description
  - Date (formatted as "Friday, November 1, 2025")
  - Time (formatted as "6:00 PM - 8:00 PM")
  - Location with map
  - Color-coded event indicator

## 🔧 Setup Instructions

### 1. Google Maps API Key (Optional but Recommended)

To enable map previews, you need a Google Maps API key:

1. **Get API Key:**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select existing
   - Enable "Maps Static API"
   - Create API key under "Credentials"

2. **Set Environment Variable:**
   ```bash
   # In Replit Secrets or .env file
   VITE_GOOGLE_MAPS_API_KEY=your_api_key_here
   ```

3. **Restart Application:**
   ```bash
   npm run dev
   ```

**Note:** Maps will work without the API key, but previews won't display. A warning message will appear in the demo.

### 2. Backend API Endpoints

The component expects these endpoints to exist:

```typescript
// RSVP endpoint
POST /api/events/:eventId/rsvp
Body: { status: "attending" | "not_attending" }

// Check-in endpoint  
POST /api/events/:eventId/checkin
Body: { lat?: number, lng?: number }
```

## 🚀 Usage

### Access Demo Page
Navigate to: **`http://localhost:5000/event-detail-demo`**

### Integration Example

```tsx
import EventDetailModal from "@/components/EventDetailModal";

function MyEventsPage() {
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      {/* Event list/calendar */}
      <div onClick={() => {
        setSelectedEvent(event);
        setModalOpen(true);
      }}>
        Click to view event
      </div>

      {/* Event Detail Modal */}
      <EventDetailModal
        event={selectedEvent}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        userRSVP={userRSVPStatus} // Optional: current user's RSVP
        userCheckIn={userCheckInStatus} // Optional: current user's check-in
      />
    </>
  );
}
```

### Event Data Structure

```typescript
interface Event {
  id: string;
  title: string;
  description?: string;
  startTime: string; // ISO 8601
  endTime?: string; // ISO 8601
  location?: string;
  locationLat?: number;
  locationLng?: number;
  color?: string; // Hex color
  
  // Window times (ISO 8601)
  rsvpOpenTime?: string;
  rsvpCloseTime?: string;
  checkinOpenTime?: string;
  checkinCloseTime?: string;
}
```

## 🎨 UI States

### RSVP States
1. **Before Window:** Gray alert showing "RSVP opens in..."
2. **Window Open:** 
   - Attending/Not Attending buttons visible
   - Countdown showing "RSVP closes in..."
   - Can change response
3. **After Window:** Red alert showing "RSVP is now closed"

### Check-in States
1. **Before Window:** Gray text showing "Check-in opens in..."
2. **Window Open:**
   - Large green "Check-In Now" button
   - Countdown showing "Check-in closes in..."
3. **Checked In:** Green text showing "You're Checked In!" with timestamp
4. **After Window:** Gray text showing "Check-in closed at..."

## 🔄 Real-time Updates

The modal automatically:
- Updates countdown every second
- Recalculates window status
- Shows/hides appropriate buttons
- Updates indicator colors

## 📱 Responsive Design

- Mobile-friendly dialog
- Scrollable content on small screens
- Touch-friendly buttons
- Responsive map display

## 🧪 Testing

All key elements have `data-testid` attributes:
- `event-detail-modal`
- `event-title`
- `event-start-time`
- `event-time`
- `event-description`
- `event-location`
- `map-preview`
- `rsvp-attending` / `rsvp-not-attending` / `rsvp-no-response`
- `button-rsvp-attending` / `button-rsvp-not-attending`
- `button-check-in`
- `checkin-checked-in` / `checkin-not-checked-in`
- `countdown-alert`
- `admin-info`

## 🎯 Next Steps

### Backend Implementation
1. Create RSVP and check-in API endpoints
2. Store RSVP and check-in data in database
3. Implement geo-fencing for check-ins (optional)
4. Add push notifications for window open/close

### Admin Dashboard
1. View RSVP counts per event
2. See who checked in vs who RSVP'd
3. Manual override for missed check-ins
4. Export attendance reports

### Enhancements
1. QR code scanner for check-ins
2. Push notifications
3. Grace period logic
4. Reliability metrics

## 📝 Notes

- The component uses `date-fns` for date formatting (already installed)
- RSVP and check-in states are managed independently
- Admin/coach roles get additional context
- Map requires `VITE_GOOGLE_MAPS_API_KEY` environment variable
- All mutations use React Query for cache invalidation

## 🐛 Troubleshooting

**Map not showing:**
- Check if `VITE_GOOGLE_MAPS_API_KEY` is set
- Verify API key has "Maps Static API" enabled
- Check browser console for errors

**RSVP not updating:**
- Verify backend endpoint exists
- Check network tab for API errors
- Ensure React Query cache is configured

**Check-in button not appearing:**
- Verify window times are set correctly
- Check if current time is within window
- Ensure timezone handling is correct
