import { Mail, HelpCircle, FileText, ExternalLink, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import BoxStatLogo from "@/components/boxstat-logo";

export default function SupportPage() {
  return (
    <div className="min-h-screen bg-black text-white overflow-x-hidden">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-red-600/20 rounded-full blur-[128px] animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-red-500/15 rounded-full blur-[100px] animate-pulse" />
      </div>

      <nav className="sticky z-50 w-full border-b border-white/10 backdrop-blur-xl bg-black/70 top-0 left-0">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <a href="https://boxstat.app" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <BoxStatLogo variant="dark" className="h-12 w-auto" />
          </a>
          <a
            href="https://boxstat.app"
            className="text-sm text-gray-400 hover:text-white transition-colors flex items-center gap-1"
          >
            Back to BoxStat
            <ChevronRight className="h-4 w-4" />
          </a>
        </div>
      </nav>

      <div className="relative z-10">
        <div className="py-16 text-center px-4">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent" data-testid="text-support-title">
            Support Center
          </h1>
          <p className="text-lg text-gray-400 max-w-xl mx-auto" data-testid="text-support-subtitle">
            We're here to help! Get in touch with our team for any questions or assistance.
          </p>
        </div>

        <div className="max-w-5xl mx-auto px-4 pb-16">
          <div className="grid gap-6 md:grid-cols-1 max-w-md mx-auto mb-16">
            <Card className="bg-white/5 border-white/10 hover:bg-white/[0.08] transition-colors" data-testid="card-email-support">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-red-500/20 rounded-lg">
                    <Mail className="h-6 w-6 text-red-400" />
                  </div>
                  <div>
                    <CardTitle className="text-white">Contact Us</CardTitle>
                    <CardDescription className="text-gray-400">We typically respond within 24 hours</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <a
                  href="mailto:info@boxstat.app"
                  className="text-red-400 hover:text-red-300 hover:underline font-medium transition-colors"
                  data-testid="link-email-support"
                >
                  info@boxstat.app
                </a>
              </CardContent>
            </Card>
          </div>

          <div className="mb-16">
            <h2 className="text-2xl font-bold mb-6 text-white" data-testid="text-help-resources-title">
              Help Resources
            </h2>
            <div className="grid gap-4">
              <Card className="bg-white/5 border-white/10 hover:bg-white/[0.08] transition-colors group cursor-pointer" data-testid="card-getting-started">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <HelpCircle className="h-5 w-5 text-red-400" />
                      <CardTitle className="text-lg text-white">Getting Started</CardTitle>
                    </div>
                    <ExternalLink className="h-4 w-4 text-gray-500 group-hover:text-red-400 transition-colors" />
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-400">
                    New to BoxStat? Learn how to set up your account, manage teams, and track player development.
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-white/5 border-white/10 hover:bg-white/[0.08] transition-colors group cursor-pointer" data-testid="card-event-checkins">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-red-400" />
                      <CardTitle className="text-lg text-white">Event Check-ins</CardTitle>
                    </div>
                    <ExternalLink className="h-4 w-4 text-gray-500 group-hover:text-red-400 transition-colors" />
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-400">
                    Learn how to check in to events, track attendance, and manage your team's schedule.
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-white/5 border-white/10 hover:bg-white/[0.08] transition-colors group cursor-pointer" data-testid="card-player-development">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-red-400" />
                      <CardTitle className="text-lg text-white">Player Development</CardTitle>
                    </div>
                    <ExternalLink className="h-4 w-4 text-gray-500 group-hover:text-red-400 transition-colors" />
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-400">
                    Track player progress, view skill assessments, and earn badges and trophies.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>

          <div className="h-px bg-gradient-to-r from-transparent via-white/20 to-transparent mb-16" />

          <div className="mb-16">
            <h2 className="text-2xl font-bold mb-6 text-white" data-testid="text-faq-title">
              Frequently Asked Questions
            </h2>
            <div className="space-y-6">
              <div className="bg-white/5 rounded-lg p-6 border border-white/10" data-testid="faq-account">
                <h3 className="font-semibold text-lg mb-2 text-white">How do I create an account?</h3>
                <p className="text-gray-400">
                  Download the BoxStat app and click "Register" to create a new account. You'll need to verify your email address before you can access all features.
                </p>
              </div>

              <div className="bg-white/5 rounded-lg p-6 border border-white/10" data-testid="faq-checkin">
                <h3 className="font-semibold text-lg mb-2 text-white">How does event check-in work?</h3>
                <p className="text-gray-400">
                  Event check-in uses geo-fencing technology. You must be within 200 meters of the event location and within the event's time window to check in. Simply tap the "Check In" button on the event card.
                </p>
              </div>

              <div className="bg-white/5 rounded-lg p-6 border border-white/10" data-testid="faq-teams">
                <h3 className="font-semibold text-lg mb-2 text-white">How do I join a team?</h3>
                <p className="text-gray-400">
                  Your coach will add you to a team roster. Once added, the team will appear in your dashboard and you'll receive notifications about team events and activities.
                </p>
              </div>

              <div className="bg-white/5 rounded-lg p-6 border border-white/10" data-testid="faq-privacy">
                <h3 className="font-semibold text-lg mb-2 text-white">Is my data secure?</h3>
                <p className="text-gray-400">
                  Yes! We take privacy seriously. Your personal information is encrypted and stored securely. You can control your privacy settings in the app's Settings menu.
                </p>
              </div>

              <div className="bg-white/5 rounded-lg p-6 border border-white/10" data-testid="faq-payments">
                <h3 className="font-semibold text-lg mb-2 text-white">How do I make payments?</h3>
                <p className="text-gray-400">
                  Payments for fees, uniforms, and tournaments can be made securely through the app using Stripe. Navigate to the Payments section in your dashboard to view and pay any outstanding balances.
                </p>
              </div>
            </div>
          </div>

          <div className="h-px bg-gradient-to-r from-transparent via-white/20 to-transparent mb-16" />

          <div className="bg-gradient-to-br from-red-600/20 to-red-500/10 rounded-2xl p-10 text-center border border-red-500/20">
            <h2 className="text-2xl font-bold mb-4 text-white" data-testid="text-contact-cta">
              Still need help?
            </h2>
            <p className="text-gray-300 mb-6">
              Our support team is ready to assist you with any questions or issues.
            </p>
            <Button
              asChild
              className="bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white border-0 shadow-lg shadow-red-500/25"
              data-testid="button-contact-support"
            >
              <a href="mailto:info@boxstat.app">
                <Mail className="mr-2 h-4 w-4" />
                Contact Support
              </a>
            </Button>
          </div>

          <div className="mt-16 text-center text-sm text-gray-500 pb-8">
            <p data-testid="text-support-hours">
              Support Hours: Monday - Friday, 9:00 AM - 6:00 PM EST
            </p>
            <p className="mt-2" data-testid="text-support-footer">
              BoxStat - Empowering Youth Basketball Programs
            </p>
            <div className="mt-4">
              <a href="https://boxstat.app" className="text-red-400/60 hover:text-red-400 transition-colors text-xs">
                boxstat.app
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
