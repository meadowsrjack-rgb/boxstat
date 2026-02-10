# BoxStat Admin Tutorial Script
*Video voiceover script for administrators*

---

## INTRO

Welcome to BoxStat. In this tutorial, we're going to walk you through everything you need to know as an admin — from creating your account, to setting up your organization, managing your programs, teams, events, and everything in between. By the end of this video, you'll be comfortable navigating every part of the admin dashboard. Let's get started.

---

## PART 1: REGISTERING YOUR ACCOUNT

First things first — you need to create your account. Head to the BoxStat website or open the app on your phone. You'll see a login screen with options to sign in or create a new account.

Tap "Create Account." You'll be asked for your email address and a password. Enter your info and submit. BoxStat will send you a verification email — go check your inbox, click the verification link, and you're confirmed. If you don't see it right away, check your spam folder.

Once verified, you'll be logged in. If your organization admin has already set you up, your account may be pre-configured. Otherwise, you'll go through a quick onboarding flow where you'll enter your name and basic details.

---

## PART 2: THE PROFILE SELECTION PAGE

After logging in, you'll land on the Profile Selection page. Think of this as your home base — it's where you choose which "hat" you want to wear.

BoxStat supports multiple account types, and one person can actually have several roles tied to the same email. Here's how it breaks down:

- **Parent accounts** are the primary account holders. Parents can manage their children's profiles, handle payments, sign waivers, and view their kids' schedules and progress. On the Profile Selection page, you'll see cards for each of your linked players — tap on one to view that player's dashboard as a parent.

- **Player accounts** are for the athletes themselves. Players can view their schedule, check in to events, see their awards, and access their own dashboard. If a player has their own device, they can use Player Mode, which is a PIN-secured view with limited access — for example, they won't be able to see payment information.

- **Coach accounts** are for staff members who manage teams. Coaches can view their team rosters, evaluate players, award badges, manage team chat, and handle event check-ins using a QR scanner.

- **Admin accounts** have full access to everything. As an admin, you can manage your entire organization — users, programs, events, finances, notifications, and more.

On the Profile Selection page, if your account has admin access, you'll see an "Admin View" card with a shield icon. Tap that to go straight into the admin dashboard. If you're also a coach or parent, you'll see those options too — you can switch between views anytime by going back to the Profile Selection page.

There's also a settings gear icon in the top corner for account settings and a sign-out option.

---

## PART 3: THE ADMIN DASHBOARD — OVERVIEW TAB

When you enter the admin dashboard, you'll land on the Overview tab. This is your at-a-glance summary of everything happening in your organization.

At the top, you'll see four stat cards:

- **Total Accounts** — this shows how many unique registered people you have, based on distinct email addresses. These are your primary account holders.

- **Total Users** — this is the total count of all profiles in your system, broken down by role. You'll see how many admins, coaches, parents, and players you have. Remember, one person can have multiple profiles, so Total Users may be higher than Total Accounts.

- **Events** — shows the total number of events you've created, plus how many are upcoming.

- **Revenue** — displays your total revenue from completed payments, along with how many payments are still pending.

Below the stat cards, you'll see a Recent Transactions section showing your latest payment activity.

---

## PART 4: THE USERS TAB

Tap on the Users tab. This is where you manage every person in your organization.

You'll see a searchable, sortable table with columns for Name, Email, Phone, Role, Players (for parent accounts, showing their linked children), Programs, Teams, Status, and Actions.

A few things to note about the data:
- For player profiles that don't have their own email, the system will show the parent's email in a lighter, italic style so you can still identify their contact info.
- The Status column uses color-coded badges to give you a quick read on each user. You might see "Active Subscriber" in green for someone with an active recurring enrollment, "Active (Program)" for one-time enrollments, "Expired" if their enrollment has lapsed, "Payment Failed" in red, or "No Enrollment" in gray. If you have teams set up and a player has an active enrollment but hasn't been assigned to a team yet, you'll see "Pending Assignment" in amber.

### Creating a User

Click the plus button in the top right corner to create a new user. You'll get a form with:

- **Email** — the user's email address.
- **Role** — choose from Admin, Coach, Player, or Parent. This determines what they can access.
- **First Name** and **Last Name**.
- **Phone Number** — optional.

Hit Create and they'll appear in your Users table.

### Editing a User

Click the pencil icon on any user row to edit them. The Edit User dialog gives you access to:

- **First Name**, **Last Name**, **Email**, **Phone** — basic contact info.
- **Role** — you can change their role if needed.
- **Club** — assign them to a club if applicable.
- **Program & Team Assignments** — this is where you assign users to specific programs and teams. You'll see checkboxes for each available program, and underneath, the teams within each program. This is a powerful way to manage who belongs where.
- **Division** — assign the user to a competitive division.
- **Teams Coached** — for coach profiles, you can assign which teams they coach.
- **Date of Birth** — with a date picker.
- **Position** — the player's basketball position (Point Guard, Shooting Guard, Small Forward, Power Forward, Center).
- **Height** — entered in inches.
- **Admin Notes** — a private notes field only visible to admins.
- **Active toggle** — you can deactivate a user without deleting them.

### Viewing User Details

Click the eye icon on any user row to open the detailed user view. This opens a panel with four tabs:

- **Profile** — shows their team, division, program, phone number, position, height, guardian info, and account details like User ID, last login, account creation date, and verification status.
- **Billing** — shows their Stripe Customer ID, subscription status, payment history, and enrollment details.
- **Performance** — displays evaluations, stats, and performance data.
- **Notes** — admin notes attached to this user.

### Adding a Role

From the user detail view, you can click "Add Role" to give someone an additional role. For example, a parent could also be given a coach role, and they'd have access to both views from the Profile Selection page.

### Bulk Upload

You can also bulk upload users via CSV. Click the upload icon and download the template first. The CSV format is: First name, Last name, Email, Phone, Role, Status, Team. Fill it out, upload it, and BoxStat will create all those users at once.

---

## PART 5: THE PROGRAMS TAB

Programs are the heart of your organization in BoxStat. A program represents a league, camp, training session, membership, or any other offering you provide. Everything else — teams, enrollments, payments — connects back to programs.

The Programs tab shows all your programs in a list with their name, category, pricing, and status.

### Creating a Program

Click the plus button to create a new program. Here's what each field does:

- **Program Name** — the display name families will see, like "High School Club" or "Summer Camp 2025."
- **Description** — a brief summary of what the program includes.
- **Category** — choose from General, Basketball, Training, Camps, Clinics, League, Tournament, or Membership. This helps organize your offerings.
- **Icon** — pick a visual icon for the program card (Basketball, Target, Tent, Users, Trophy, Calendar, Star, Medal, or Crown).
- **Cover Image** — upload an image for the program. Recommended size is 16:9 aspect ratio, like 1280 by 720 pixels.

Then there's the Pricing and Billing section:

- **Product Type** — this determines how families are charged:
  - **Subscription (Recurring)** — charges automatically on a schedule.
  - **One-Time Payment** — a single charge.
  - **Credit Pack** — a bundle of credits or sessions.

- **Price** — enter the dollar amount.

If you chose Subscription, you'll also see:
- **Billing Cycle** — how often to charge. Options are Weekly, 28 Days, Monthly, Quarterly, 6-Month, or Yearly.
- **Billing Model** — Per Player, Per Family, or Organization-Wide.
- **Subscription Disclosure** — this is the text shown to customers before they check out, explaining the billing terms. BoxStat auto-generates this based on your price and cycle, but you can customize it.

If you chose One-Time, you'll see a Duration field where you set how long the enrollment lasts (days, weeks, or months).

If you chose Credit Pack, you'll set how many sessions or credits are included.

You can also attach required waivers to a program — more on waivers later.

### How Programs Connect to Everything Else

When you create a team, you assign it to a program. When a family enrolls, they're enrolling in a program. When you create events, you can assign them to specific programs. Payments flow through programs. Think of programs as the central hub that connects teams, users, events, and finances together.

---

## PART 6: THE EVENTS TAB

The Events tab is where you manage your schedule — practices, games, camps, meetings, and more.

You'll see a calendar view along with a list of all your events. Events are color-coded by type so you can quickly scan what's coming up.

### Creating an Event

Click the plus button to create a new event. Here's the form:

- **Event Title** — like "Team Practice" or "Championship Game."
- **Event Type** — choose from Game, Tournament, Camp, Exhibition, Practice, Skills, Workshop, Talk, Combine, Training, Meeting, Course, Tryout, Skills Assessment, Team Building, Parent Meeting, Equipment Pickup, Photo Day, Award Ceremony, or FNH (Friday Night Hoops).
- **Start Time** and **End Time** — set the date and time for each.
- **Location** — where the event takes place. This is important because BoxStat uses location for GPS-based check-ins.

Then there's the Recurring Event section. Toggle this on if you want to create a repeating event:
- **Frequency** — Daily, Weekly, Every 2 Weeks, or Monthly.
- For Weekly or biweekly, you can select which days of the week.
- **Ends** — either after a certain number of occurrences, or on a specific date.

The system will show you a preview of how many events will be created based on your settings.

Next is the Event Assignment section:
- **Event For** — who should see this event? You can target Everyone, specific Teams, specific Programs, specific Divisions, or specific Users.

You can also configure check-in and RSVP settings, which control whether players can self-check-in using GPS geofencing and whether they need to RSVP ahead of time.

### Editing an Event

Click the edit button on any event to modify its details. You can change the title, times, location, type, and assignments. When you edit a recurring event, you have the option to edit just that single occurrence or all future events in the series.

### How Events Connect

Events tie into programs, teams, and users. When you assign an event to a team, only members of that team see it. When players check in to events, it counts toward their attendance stats, which can trigger automatic awards. RSVP data helps you plan capacity.

---

## PART 7: THE AWARDS TAB

The Awards tab lets you create and manage trophies and badges for your players. BoxStat supports up to 100 different awards, and they can be awarded manually or triggered automatically based on player activity.

### Creating an Award

Click the plus button to create a new award:

- **Award Name** — like "First Practice" or "Iron Man."
- **Tier** — this determines the badge color. Options include Grey, Bronze, Silver, Gold, Platinum, Diamond, and more. Tiers create a visual progression.
- **Description** — what the award is for.
- **Image URL** — an optional custom image for the award.
- **Active toggle** — turn awards on or off.
- **Allow Multiple** — if enabled, a player can earn this award more than once.

The key part is the Trigger Category — this is how the award gets earned:

- **Manual** — you award it by hand from the admin dashboard.
- **Check-in** — awarded automatically when a player checks in to events. You can filter by event type (games, practices, skills sessions, etc.), set a count mode (total check-ins or consecutive streak), and set a threshold (how many check-ins to trigger it).
- **RSVP** — awarded based on RSVP responses.
- **System** — for collection-style awards, like "Earn all Bronze tier badges."
- **Time** — awarded based on time milestones, like years active.
- **Store** — awarded when a player purchases a specific product from the store.

You can also scope awards to specific programs or teams, so an award only counts check-ins for a particular program.

### How Awards Connect

Awards tie into events (through check-ins), the store (through purchases), and user profiles (where earned awards are displayed). Players see their award collection on their dashboard, which adds a fun gamification element to your programs.

---

## PART 8: THE STORE TAB

The Store tab lets you sell physical products, gear, training packages, and digital content directly through BoxStat.

### Creating a Product

Click the plus button to create a store product:

- **Product Name** — like "Team Jersey" or "Training 10-Pack."
- **Description** — details about the product.
- **Store Category** — choose from:
  - **Gear & Apparel** — physical items like jerseys, shorts, or basketball gear.
  - **Training & Camps** — session-based packages.
  - **Digital Academy** — digital content or courses.

- **Price** — the dollar amount.
- **Cover Image** — upload a product photo.

For Gear & Apparel, you'll also see:
- **Inventory Sizes** — add available sizes (S, M, L, XL, etc.).
- **Stock per size** — how many of each size you have.
- **Shipping Required** — toggle if the item needs to be shipped.

For Training & Camps, you can set a session count — how many sessions the package includes.

You can also make any product a recurring subscription by toggling the subscription option, which gives you billing cycle and disclosure fields just like programs.

**Required Waivers** — you can attach waivers that customers must sign before purchasing.

**Suggested Programs** — you can link a product to specific programs, so it shows up as a suggested add-on during enrollment.

### How the Store Connects

Store purchases flow through Stripe payments (more on that in Settings). Products can trigger awards, and they can be linked to programs as suggested add-ons. Waivers can be required before purchase.

---

## PART 9: THE WAIVERS TAB

Waivers let you create legal agreements, liability releases, or consent forms that users must sign. These can be attached to programs or store products as requirements.

### Creating a Waiver

Click "Create Waiver" to get started:

- **Waiver Title** — like "Liability Release" or "Photo/Video Consent."
- **Waiver Content** — the full text of the agreement. This is what families will read and sign.
- **Active toggle** — enable or disable the waiver.
- **Required Checkbox Label** — customize the text on the acceptance checkbox, like "I have read and agree to the terms."

### How Waivers Connect

Once you create a waiver, it becomes available in the Programs and Store tabs. When you create or edit a program or product, you can select which waivers are required. Families will need to sign them before completing enrollment or purchase.

---

## PART 10: THE NOTIFICATIONS TAB

The Notifications tab is your communication hub. You can send messages to your entire organization, specific groups, or individual users through multiple channels.

### Creating a Notification

Click the plus button to create a new message:

- **Title** — the message subject line.
- **Message** — the body content of your notification.

- **Type** — choose one or both:
  - **Announcement** — shows up prominently in users' feeds.
  - **Notification** — a standard notification.

- **Send To** — choose your audience:
  - **Everyone** — all users in your organization.
  - **Specific Users** — hand-pick individual users from a list.
  - **Roles** — target by role (Admin, Coach, Player, Parent).
  - **Teams** — send to specific teams.
  - **Divisions** — send to specific divisions.

- **Delivery Channels** — how the message gets delivered:
  - **In-App** — appears in the user's notification center within BoxStat.
  - **Push** — sends a push notification to their phone (requires the user to have push notifications enabled). Note: push notifications are email-based, so only accounts with email addresses will receive them.

You can also schedule messages for later or set them up as recurring campaigns.

BoxStat also sends automatic notifications that you don't have to set up — event reminders go out 24 hours, 2 hours, and 30 minutes before events. Check-in availability alerts and RSVP deadline warnings are also automatic.

### Bulk Upload

You can bulk upload messages via CSV with columns for Title, Message, Delivery, Target Type, and Scheduled Time.

### How Notifications Connect

Notifications tie into users, teams, divisions, and events. The targeting system uses the same user and team structures you've already set up, so sending a message to "all players on Team Thunder" is as simple as selecting that team.

---

## PART 11: THE MIGRATIONS TAB

The Migrations tab is specifically for organizations transitioning from another system. If you were previously managing your subscriptions and payments through Stripe directly or through another platform, you can import that historical data into BoxStat.

There are two import types:

- **Stripe Subscriptions Export** — import subscription data with subscription IDs and period dates.
- **Stripe Payments Export** — import payment history with amounts, descriptions, and dates.

### Creating a Migration Record

You can add records manually or via CSV bulk upload. For manual entry:

- **Email** — the user's email to match against existing accounts.
- **Stripe Customer ID** — their ID in Stripe.
- **Stripe Subscription IDs** — if they had active subscriptions.
- **Payment Method** and **Reference Number**.
- **Source System** — where the data is coming from.
- **Notes** — any additional context.

You'll also add Subscription Items, specifying the item type (Program or Store Product), payment type, dates, and amounts.

BoxStat will automatically try to match imported data to existing users by email. If a match is found, the enrollment and payment history transfers to their account. Color-coded status indicators show Active (green), Expiring Soon (yellow), or Expired (red) with a 14-day warning threshold.

---

## PART 12: THE CRM TAB

CRM stands for Customer Relationship Management. This tab helps you manage prospective members, communication, and sales quotes.

It has three sub-sections:

### Leads

This is where you track people who've expressed interest but haven't signed up yet. Click "Add Lead" to create one:

- **First Name**, **Last Name**, **Email**, **Phone**.
- **Source** — how they found you (manual entry, website, referral, etc.).

Once a lead is created, you can view their details, add notes, track their status (New, Contacted, Qualified, Converted, Lost), and see their evaluation history.

### Messages

This section shows contact form submissions and allows you to reply directly. You can also access team chat messages — view and moderate conversations happening in player and parent channels for each team.

### Quotes

You can create custom checkout links to send to leads or existing members. Click "Create Quote" to build one:

- **Recipient** — choose a lead or an existing user.
- **Items** — add programs or store products to the quote, with custom pricing if needed.
- **Expiration** — set when the quote link expires.

Once created, you can copy the checkout link and send it directly to the prospect. They'll be able to complete payment through that personalized link.

---

## PART 13: THE SETTINGS TAB — STRIPE INTEGRATION

Now, one of the most important parts of setup — connecting your Stripe account so you can actually get paid.

Go to the Settings tab in the admin dashboard. You'll find the Stripe Integration section.

### Why You Need Stripe

Stripe is the payment processor that handles all financial transactions in BoxStat — program enrollments, store purchases, subscriptions, one-time payments, everything. When a family pays for a program or buys gear from your store, that money goes through Stripe and into your bank account.

### Setting Up Stripe

If you don't already have a Stripe account, go to stripe.com and create one. Once you have your account:

1. Log into your Stripe dashboard.
2. Go to Developers, then API Keys.
3. You'll need two keys:

- **Publishable Key** — starts with "pk_live" (or "pk_test" if you're testing). This is safe to share — it's used on the front end to load the payment form.
- **Secret Key** — starts with "sk_live" (or "sk_test"). This is private — never share it with anyone. It's used on the backend to process charges.

4. Copy each key and paste them into the corresponding fields in BoxStat Settings.
5. There's also an optional **Webhook Secret** field — this starts with "whsec_". Webhooks let Stripe notify BoxStat when payments succeed, subscriptions renew, or payments fail. Your BoxStat admin can help you set this up if needed.

6. Click "Save Stripe Settings."

Once connected, you'll see a green "Stripe is connected" confirmation. You're now ready to accept payments.

### Organization Settings

Also in the Settings tab, you can update your organization's basic info:

- **Organization Name** — the name that appears throughout the app.
- **Sport Type** — your organization's primary sport.
- **Logo** — upload your organization's logo.

There's also an account management section where you can sign out, or if needed, delete your account (this requires email confirmation as a safety measure).

---

## PART 14: HOW EVERYTHING CONNECTS

Let's quickly recap how all these pieces work together, because understanding the connections is key to getting the most out of BoxStat:

1. **Start with Programs** — create your programs first. These are your offerings — leagues, camps, training, memberships.

2. **Create Teams** (if applicable) — teams belong to programs. Assign coaches and players to teams.

3. **Set up Events** — create your schedule. Assign events to teams or programs so the right people see them.

4. **Add Users** — register your families, players, and coaches. Assign them to programs and teams.

5. **Create Awards** — set up badges and trophies. Configure automatic triggers based on check-ins, purchases, or milestones.

6. **Stock your Store** — add gear, training packages, or digital content. Link products to programs and attach required waivers.

7. **Create Waivers** — build your liability releases and consent forms. Attach them to programs and store products.

8. **Connect Stripe** — enter your API keys so payments flow into your bank account.

9. **Send Notifications** — keep everyone informed with targeted messages through in-app alerts and push notifications.

10. **Track with CRM** — manage leads, communicate with prospects, and send custom quote links to close sales.

When a parent signs up, they create an account, add their children as player profiles, enroll in a program, sign the required waivers, and pay through Stripe. Their kids show up on the team roster, see the schedule, check in to events with GPS, earn awards for participation, and the admin sees it all from this dashboard.

That's BoxStat. You now have everything you need to run your organization like a pro. If you have questions, reach out through the support page in the app. Good luck with your season!
