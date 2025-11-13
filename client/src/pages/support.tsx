import { Mail, Phone, MessageCircle, HelpCircle, FileText, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

export default function SupportPage() {
  return (
    <div className="min-h-screen-safe bg-gradient-to-b from-orange-50 to-white">
      {/* Header */}
      <div className="bg-[#FF6B35] text-white py-12">
        <div className="max-w-4xl mx-auto px-4">
          <h1 className="text-4xl font-bold mb-4" data-testid="text-support-title">
            Support Center
          </h1>
          <p className="text-lg opacity-90" data-testid="text-support-subtitle">
            We're here to help! Get in touch with our team for any questions or assistance.
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Contact Methods */}
        <div className="grid gap-6 md:grid-cols-2 mb-12">
          {/* Email Support */}
          <Card data-testid="card-email-support">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-3 bg-orange-100 rounded-lg">
                  <Mail className="h-6 w-6 text-[#FF6B35]" />
                </div>
                <div>
                  <CardTitle>Email Support</CardTitle>
                  <CardDescription>We typically respond within 24 hours</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <a
                href="mailto:support@boxstat.app"
                className="text-[#FF6B35] hover:underline font-medium"
                data-testid="link-email-support"
              >
                support@boxstat.app
              </a>
            </CardContent>
          </Card>

          {/* General Inquiries */}
          <Card data-testid="card-general-contact">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-3 bg-orange-100 rounded-lg">
                  <MessageCircle className="h-6 w-6 text-[#FF6B35]" />
                </div>
                <div>
                  <CardTitle>General Inquiries</CardTitle>
                  <CardDescription>For general questions and feedback</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <a
                href="mailto:info@boxstat.app"
                className="text-[#FF6B35] hover:underline font-medium"
                data-testid="link-general-contact"
              >
                info@boxstat.app
              </a>
            </CardContent>
          </Card>
        </div>

        <Separator className="my-12" />

        {/* Help Resources */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold mb-6" data-testid="text-help-resources-title">
            Help Resources
          </h2>
          <div className="grid gap-4">
            <Card data-testid="card-getting-started">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <HelpCircle className="h-5 w-5 text-[#FF6B35]" />
                    <CardTitle className="text-lg">Getting Started</CardTitle>
                  </div>
                  <ExternalLink className="h-4 w-4 text-gray-400" />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  New to BoxStat? Learn how to set up your account, manage teams, and track player development.
                </p>
              </CardContent>
            </Card>

            <Card data-testid="card-event-checkins">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-[#FF6B35]" />
                    <CardTitle className="text-lg">Event Check-ins</CardTitle>
                  </div>
                  <ExternalLink className="h-4 w-4 text-gray-400" />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Learn how to check in to events, track attendance, and manage your team's schedule.
                </p>
              </CardContent>
            </Card>

            <Card data-testid="card-player-development">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-[#FF6B35]" />
                    <CardTitle className="text-lg">Player Development</CardTitle>
                  </div>
                  <ExternalLink className="h-4 w-4 text-gray-400" />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Track player progress, view skill assessments, and earn badges and trophies.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        <Separator className="my-12" />

        {/* FAQ Section */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold mb-6" data-testid="text-faq-title">
            Frequently Asked Questions
          </h2>
          <div className="space-y-6">
            <div data-testid="faq-account">
              <h3 className="font-semibold text-lg mb-2">How do I create an account?</h3>
              <p className="text-gray-600">
                Download the BoxStat app and click "Register" to create a new account. You'll need to verify your email address before you can access all features.
              </p>
            </div>

            <div data-testid="faq-checkin">
              <h3 className="font-semibold text-lg mb-2">How does event check-in work?</h3>
              <p className="text-gray-600">
                Event check-in uses geo-fencing technology. You must be within 200 meters of the event location and within the event's time window to check in. Simply tap the "Check In" button on the event card.
              </p>
            </div>

            <div data-testid="faq-teams">
              <h3 className="font-semibold text-lg mb-2">How do I join a team?</h3>
              <p className="text-gray-600">
                Your coach will add you to a team roster. Once added, the team will appear in your dashboard and you'll receive notifications about team events and activities.
              </p>
            </div>

            <div data-testid="faq-privacy">
              <h3 className="font-semibold text-lg mb-2">Is my data secure?</h3>
              <p className="text-gray-600">
                Yes! We take privacy seriously. Your personal information is encrypted and stored securely. You can control your privacy settings in the app's Settings menu.
              </p>
            </div>

            <div data-testid="faq-payments">
              <h3 className="font-semibold text-lg mb-2">How do I make payments?</h3>
              <p className="text-gray-600">
                Payments for fees, uniforms, and tournaments can be made securely through the app using Stripe. Navigate to the Payments section in your dashboard to view and pay any outstanding balances.
              </p>
            </div>
          </div>
        </div>

        <Separator className="my-12" />

        {/* Additional Contact Info */}
        <div className="bg-orange-50 rounded-lg p-8 text-center">
          <h2 className="text-2xl font-bold mb-4" data-testid="text-contact-cta">
            Still need help?
          </h2>
          <p className="text-gray-600 mb-6">
            Our support team is ready to assist you with any questions or issues.
          </p>
          <Button
            asChild
            className="bg-[#FF6B35] hover:bg-[#E55A2B]"
            data-testid="button-contact-support"
          >
            <a href="mailto:support@boxstat.app">
              <Mail className="mr-2 h-4 w-4" />
              Contact Support
            </a>
          </Button>
        </div>

        {/* Footer Info */}
        <div className="mt-12 text-center text-sm text-gray-500">
          <p data-testid="text-support-hours">
            Support Hours: Monday - Friday, 9:00 AM - 6:00 PM EST
          </p>
          <p className="mt-2" data-testid="text-support-footer">
            BoxStat - Empowering Youth Basketball Programs
          </p>
        </div>
      </div>
    </div>
  );
}
