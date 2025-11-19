import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen-safe bg-background safe-bottom">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Link href="/">
          <Button variant="ghost" className="mb-6" data-testid="button-back-home">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Button>
        </Link>

        <Card>
          <CardHeader>
            <CardTitle className="text-3xl">Privacy Policy</CardTitle>
            <CardDescription>
              Last Updated: January 4, 2025
            </CardDescription>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none dark:prose-invert">
            {/* COPPA Notice */}
            <div className="bg-primary/10 border-l-4 border-primary p-4 mb-6 rounded-r">
              <h3 className="text-lg font-semibold mt-0 mb-2">COPPA Notice</h3>
              <p className="mb-0">
                BoxStat is designed for youth sports leagues and collects information from children under 13. 
                We comply with the Children's Online Privacy Protection Act (COPPA) and require verifiable 
                parental consent before collecting any personal information from children.
              </p>
            </div>

            {/* Operator Information */}
            <section>
              <h2>1. Who We Are</h2>
              <p>
                BoxStat is operated by BoxStat ("we," "us," or "our"). This privacy policy 
                explains how we collect, use, and protect your information when you use our mobile application.
              </p>
              <p>
                <strong>Contact Information:</strong><br />
                Email: <a href="mailto:privacy@boxstat.app">privacy@boxstat.app</a><br />
                For privacy-related inquiries, please use the email above.
              </p>
            </section>

            {/* Information We Collect */}
            <section>
              <h2>2. Information We Collect</h2>
              
              <h3>2.1 From Children Under 13 (With Parental Consent)</h3>
              <p>We collect the following information from children only after obtaining verifiable parental consent:</p>
              <ul>
                <li><strong>Basic Information:</strong> Player name, date of birth, grade level</li>
                <li><strong>Profile Data:</strong> Profile photo, jersey number, position, height, bio</li>
                <li><strong>Team Information:</strong> Team assignment, division, program enrollment</li>
                <li><strong>Performance Data:</strong> Skills assessments, badges earned, trophies, player evaluations</li>
                <li><strong>Location Data:</strong> GPS coordinates for event check-ins (only when using check-in feature)</li>
                <li><strong>Communication:</strong> Messages sent in team chat (visible to coaches and team members)</li>
                <li><strong>Emergency Contact:</strong> Guardian information and emergency contacts</li>
                <li><strong>Event Data:</strong> RSVPs, attendance records, event participation</li>
              </ul>

              <h3>2.2 From Parents/Guardians</h3>
              <ul>
                <li><strong>Account Information:</strong> Name, email address, password (encrypted)</li>
                <li><strong>Payment Information:</strong> Billing details processed through Stripe (we do not store complete credit card numbers)</li>
                <li><strong>Contact Information:</strong> Phone number, emergency contact details</li>
                <li><strong>Consent Records:</strong> Documentation of parental consent and preferences</li>
              </ul>

              <h3>2.3 Automatically Collected Information</h3>
              <ul>
                <li><strong>Device Information:</strong> Device type, operating system, browser type</li>
                <li><strong>Usage Data:</strong> App features accessed, login times, interaction patterns (used solely for app functionality)</li>
                <li><strong>Location Data:</strong> Precise GPS coordinates only when actively using check-in features</li>
              </ul>
            </section>

            {/* How We Use Information */}
            <section>
              <h2>3. How We Use Your Information</h2>
              
              <h3>We use collected information exclusively for app functionality:</h3>
              <ul>
                <li><strong>Authentication:</strong> Secure login and account management</li>
                <li><strong>Team Management:</strong> Organizing players into teams, divisions, and programs</li>
                <li><strong>Event Scheduling:</strong> Creating and managing practice/game schedules</li>
                <li><strong>Attendance Tracking:</strong> GPS-based check-ins at events (within 200-meter geo-fence)</li>
                <li><strong>Player Development:</strong> Skills assessments, evaluations, awards tracking</li>
                <li><strong>Communication:</strong> Team chat, event notifications, important league updates</li>
                <li><strong>Payment Processing:</strong> League fees, uniform purchases, tournament registrations</li>
                <li><strong>Emergency Situations:</strong> Accessing emergency contact information when needed</li>
                <li><strong>Customer Support:</strong> Responding to inquiries and resolving issues</li>
              </ul>

              <div className="bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400 p-4 my-4">
                <p className="font-semibold mb-1">We DO NOT Use Information For:</p>
                <ul className="mb-0">
                  <li>Targeted advertising or behavioral tracking</li>
                  <li>Selling data to third parties or data brokers</li>
                  <li>Marketing campaigns or promotional targeting</li>
                  <li>Analytics to measure user behavior for business purposes</li>
                  <li>Profiling or automated decision-making</li>
                </ul>
              </div>
            </section>

            {/* Location Data */}
            <section>
              <h2>4. Location Data Collection</h2>
              <p>
                We collect precise GPS location data only when you actively use check-in features for events. 
                Location tracking is used to:
              </p>
              <ul>
                <li>Verify attendance at league facilities (within 200-meter radius)</li>
                <li>Provide directions to event locations</li>
                <li>Send location-specific notifications (e.g., weather alerts)</li>
              </ul>
              <p>
                <strong>Your Control:</strong> You can disable location services in your device settings. However, 
                attendance check-in features will not function without location access.
              </p>
              <p>
                <strong>Retention:</strong> Location data for check-ins is retained for the duration of the season 
                and then deleted. We do not share location data with advertisers or data brokers.
              </p>
            </section>

            {/* Payment Information */}
            <section>
              <h2>5. Payment Information</h2>
              <p>
                We use Stripe, a PCI-DSS compliant payment processor, to handle all payment transactions. 
                We do not store complete credit card numbers on our servers.
              </p>
              <p>
                <strong>What We Collect:</strong> Transaction IDs, payment amounts, billing names, payment status
              </p>
              <p>
                <strong>What Stripe Stores:</strong> Complete payment details (credit card numbers, CVV, expiration dates)
              </p>
              <p>
                <strong>Stripe Privacy Policy:</strong> <a href="https://stripe.com/privacy" target="_blank" rel="noopener noreferrer">https://stripe.com/privacy</a>
              </p>
              <p>
                Payment information is used solely for processing league-related fees and purchases. We do not 
                use payment data for advertising, marketing, or analytics purposes.
              </p>
            </section>

            {/* Third-Party Services */}
            <section>
              <h2>6. Third-Party Services</h2>
              <p>
                We share limited information with the following service providers who are integral to app functionality:
              </p>
              
              <h3>Essential Service Providers:</h3>
              <ul>
                <li>
                  <strong>Stripe</strong> (Payment Processing) - Processes payments for league fees and purchases. 
                  <a href="https://stripe.com/privacy" target="_blank" rel="noopener noreferrer">Privacy Policy</a>
                </li>
                <li>
                  <strong>Neon Database</strong> (Data Storage) - Secure cloud database hosting for app data. 
                  <a href="https://neon.tech/privacy-policy" target="_blank" rel="noopener noreferrer">Privacy Policy</a>
                </li>
                <li>
                  <strong>Resend</strong> (Email Delivery) - Sends transactional emails (verification, password resets, event notifications). 
                  <a href="https://resend.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer">Privacy Policy</a>
                </li>
                <li>
                  <strong>OpenStreetMap / Nominatim</strong> (Mapping & Geocoding) - Provides maps and location search for event facilities. 
                  No personal data shared. <a href="https://osmfoundation.org/wiki/Privacy_Policy" target="_blank" rel="noopener noreferrer">Privacy Policy</a>
                </li>
              </ul>

              <h3>What We DO NOT Do:</h3>
              <ul>
                <li>Sell children's information to third parties</li>
                <li>Share data with advertisers or ad networks</li>
                <li>Use third-party analytics for tracking user behavior</li>
                <li>Share location data outside essential service providers</li>
                <li>Include behavioral advertising SDKs</li>
              </ul>

              <p>
                <strong>Parental Control:</strong> Parents can consent to data collection without consenting to 
                non-essential third-party sharing. All third parties listed above are integral to app functionality.
              </p>
            </section>

            {/* Parental Rights and Consent */}
            <section>
              <h2>7. Parental Rights and Consent (COPPA Compliance)</h2>
              
              <h3>7.1 How We Obtain Consent</h3>
              <p>
                Before collecting any information from children under 13, we obtain verifiable parental consent through:
              </p>
              <ul>
                <li>Email verification to parent's email address</li>
                <li>Explicit acknowledgment during child profile creation</li>
                <li>Review of our privacy policy and consent to terms</li>
              </ul>

              <h3>7.2 Parents' Rights</h3>
              <p>As a parent or legal guardian, you have the right to:</p>
              <ul>
                <li><strong>Review:</strong> Request access to all personal information collected from your child</li>
                <li><strong>Delete:</strong> Request deletion of your child's personal information</li>
                <li><strong>Refuse:</strong> Refuse further collection or use of your child's information</li>
                <li><strong>Revoke Consent:</strong> Withdraw consent at any time</li>
              </ul>

              <h3>7.3 How to Exercise Your Rights</h3>
              <p>To review, modify, or delete your child's information:</p>
              <ul>
                <li><strong>Email:</strong> <a href="mailto:privacy@boxstat.app">privacy@boxstat.app</a></li>
                <li><strong>In-App:</strong> Navigate to Account Settings → Profile Management → Delete Profile</li>
              </ul>
              <p>
                We will respond to your request within 10 business days and verify your identity before 
                providing access to children's information.
              </p>

              <h3>7.4 Effect of Revoking Consent</h3>
              <p>
                If you revoke consent or request deletion, your child will no longer be able to use the app's 
                features. We will delete all personal information except what we are required to retain by law 
                (e.g., payment records for tax purposes).
              </p>
            </section>

            {/* Data Retention */}
            <section>
              <h2>8. Data Retention and Deletion</h2>
              <p>We retain personal information only as long as necessary for the purposes described in this policy:</p>
              
              <h3>Retention Periods:</h3>
              <ul>
                <li><strong>Active Player Data:</strong> Duration of league participation</li>
                <li><strong>Payment Records:</strong> 7 years (required for tax and legal compliance)</li>
                <li><strong>Location Data:</strong> 90 days from check-in date, then automatically deleted</li>
                <li><strong>Team Chat Messages:</strong> Duration of season or until team is dissolved</li>
                <li><strong>Skills Assessments & Awards:</strong> While profile is active</li>
                <li><strong>Account Information:</strong> Until account deletion is requested</li>
              </ul>

              <h3>Automatic Deletion:</h3>
              <ul>
                <li>Accounts inactive for 3 years are automatically flagged for deletion (with email notice)</li>
                <li>Location check-in data older than 90 days is automatically purged</li>
                <li>Temporary verification tokens expire after 24 hours</li>
              </ul>

              <h3>User-Requested Deletion:</h3>
              <p>
                Users can request complete account deletion through Account Settings or by emailing 
                <a href="mailto:privacy@boxstat.app">privacy@boxstat.app</a>. We will delete all personal 
                information within 30 days, except data we must retain for legal compliance.
              </p>
            </section>

            {/* Security */}
            <section>
              <h2>9. How We Protect Your Information</h2>
              <p>We implement industry-standard security measures to protect your data:</p>
              <ul>
                <li><strong>Encryption in Transit:</strong> All data transmitted uses TLS/SSL encryption</li>
                <li><strong>Encryption at Rest:</strong> Database is encrypted using AES-256 encryption</li>
                <li><strong>Password Security:</strong> Passwords are hashed using bcrypt (never stored in plain text)</li>
                <li><strong>Access Controls:</strong> Role-based permissions limit who can access data</li>
                <li><strong>Payment Security:</strong> Stripe handles all payment data (PCI-DSS compliant)</li>
                <li><strong>Regular Audits:</strong> Periodic security reviews and updates</li>
                <li><strong>Secure Infrastructure:</strong> Hosted on secure cloud platforms with redundancy</li>
              </ul>
              <p>
                While we use reasonable security measures, no system is 100% secure. We cannot guarantee 
                absolute security of transmitted or stored information.
              </p>

              <h3>Data Breach Notification:</h3>
              <p>
                In the event of a data breach that affects your personal information or your child's information, 
                we will:
              </p>
              <ul>
                <li>Notify affected users via email within 72 hours of discovering the breach</li>
                <li>Provide details about what information was compromised</li>
                <li>Explain steps we are taking to address the breach</li>
                <li>Offer guidance on protecting your information</li>
                <li>Comply with all applicable data breach notification laws</li>
              </ul>
            </section>

            {/* Children's Privacy */}
            <section>
              <h2>10. Children's Privacy Statement</h2>
              <p>
                BoxStat is a youth sports application intended for use by children under 13 with parental supervision. 
                We are committed to protecting children's privacy and comply with COPPA requirements.
              </p>
              
              <h3>Parent-Child Account Structure:</h3>
              <ul>
                <li>Parents create and control the main account</li>
                <li>Children's profiles are linked to parent accounts</li>
                <li>Parents can switch to "Player Mode" to let children access age-appropriate features</li>
                <li>Player Mode is protected by a PIN code set by parents</li>
                <li>Parents retain full visibility and control over children's data</li>
              </ul>

              <h3>No Advertising to Children:</h3>
              <p>
                Our app does not display any advertisements. We do not use behavioral tracking, 
                retargeting, or any advertising technologies that target children.
              </p>

              <h3>2026+ Age Verification Laws:</h3>
              <p>
                <strong>Upcoming Compliance Requirements:</strong> Beginning in 2026, several states (Texas, Utah, Louisiana, 
                and California) will require app stores to implement age verification for all apps. These laws will 
                significantly impact how we handle children's and teens' data.
              </p>
              
              <p><strong>How This Affects BoxStat:</strong></p>
              <ul>
                <li><strong>Age Range Information:</strong> App stores (Apple, Google) will provide us with age categories: 
                under 13 (child), 13-15 (younger teen), 16-17 (older teen), and 18+ (adult)</li>
                <li><strong>Enhanced Verification:</strong> We will receive "actual knowledge" of users' ages, triggering 
                stricter COPPA obligations for users under 13</li>
                <li><strong>Parental Consent:</strong> We will continue to require verifiable parental consent for all 
                users under 13 before collecting any personal information</li>
                <li><strong>Teen Privacy:</strong> For users 13-17, we will implement additional privacy protections as 
                required by state laws</li>
                <li><strong>Re-Consent:</strong> When significant changes occur (new features, data collection changes, 
                age rating updates), we will obtain fresh parental consent</li>
              </ul>

              <p>
                <strong>Implementation Timeline:</strong> We are actively preparing for these requirements. By January 2026, 
                BoxStat will have systems in place to receive age data from app stores and adjust data handling practices 
                accordingly. Parents will be notified of these changes and given the opportunity to review and update 
                consent preferences.
              </p>
            </section>

            {/* Your Rights */}
            <section>
              <h2>11. Your Privacy Rights</h2>
              
              <h3>All Users Have the Right To:</h3>
              <ul>
                <li><strong>Access:</strong> Request a copy of your personal information</li>
                <li><strong>Correction:</strong> Update inaccurate or incomplete information</li>
                <li><strong>Deletion:</strong> Request deletion of your personal information</li>
                <li><strong>Portability:</strong> Receive your data in a machine-readable format</li>
                <li><strong>Opt-Out:</strong> Unsubscribe from non-essential email communications</li>
              </ul>

              <h3>State-Specific Rights:</h3>
              <p><strong>California Residents (CCPA/CPRA):</strong></p>
              <ul>
                <li>Right to know what personal information is collected</li>
                <li>Right to delete personal information</li>
                <li>Right to opt-out of data "sales" (we do not sell data)</li>
                <li>Right to non-discrimination for exercising privacy rights</li>
              </ul>

              <p><strong>European Residents (GDPR):</strong></p>
              <ul>
                <li>Right to access, rectification, erasure, and portability</li>
                <li>Right to restrict processing and object to processing</li>
                <li>Right to withdraw consent at any time</li>
                <li>Right to lodge a complaint with supervisory authority</li>
              </ul>

              <p>
                To exercise any of these rights, email <a href="mailto:privacy@boxstat.app">privacy@boxstat.app</a>
              </p>
            </section>

            {/* Changes to Policy */}
            <section>
              <h2>12. Changes to This Privacy Policy</h2>
              <p>
                We may update this privacy policy from time to time to reflect changes in our practices, 
                technology, legal requirements, or other factors.
              </p>
              <p>
                <strong>We will notify you of material changes by:</strong>
              </p>
              <ul>
                <li>Sending an email to the address on file</li>
                <li>Posting a prominent notice in the app</li>
                <li>Updating the "Last Updated" date at the top of this policy</li>
              </ul>
              <p>
                For changes that affect children's privacy, we will obtain fresh parental consent if 
                required by COPPA or other applicable laws.
              </p>
              <p>
                Continued use of the app after notification constitutes acceptance of the updated policy.
              </p>
            </section>

            {/* Contact Us */}
            <section>
              <h2>13. Contact Us</h2>
              <p>If you have questions, concerns, or requests regarding this privacy policy or our data practices:</p>
              
              <p>
                <strong>Privacy Inquiries:</strong><br />
                Email: <a href="mailto:privacy@boxstat.app">privacy@boxstat.app</a>
              </p>

              <p>
                <strong>General Support:</strong><br />
                Use the in-app support feature or contact your league administrator
              </p>

              <p>
                <strong>COPPA Resources:</strong><br />
                Learn more about children's online privacy: <a href="https://www.ftc.gov/childrens-privacy" target="_blank" rel="noopener noreferrer">FTC COPPA Information</a>
              </p>
            </section>

            {/* Effective Date */}
            <section className="border-t pt-6 mt-8">
              <p className="text-sm text-muted-foreground">
                This Privacy Policy is effective as of January 4, 2025 
                and applies to all information collected by BoxStat.
              </p>
              <p className="text-sm text-muted-foreground">
                <strong>Version:</strong> 1.0
              </p>
            </section>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
