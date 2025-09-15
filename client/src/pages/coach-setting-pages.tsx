'use client';

import SettingPage from "./setting-page";

export function CoachProfilePage() {
  return (
    <SettingPage 
      title="Profile"
      description="Personal information and contact details"
      backPath="/coach-settings"
      userType="coach"
      category="profile"
    />
  );
}

export function CoachCoachingPage() {
  return (
    <SettingPage 
      title="Coaching Info"
      description="Coaching experience and qualifications"
      backPath="/coach-settings"
      userType="coach"
      category="coaching"
    />
  );
}

export function CoachPrivacyPage() {
  return (
    <SettingPage 
      title="Privacy"
      description="Control your visibility and data sharing"
      backPath="/coach-settings"
      userType="coach"
      category="privacy"
    />
  );
}

export function CoachNotificationsPage() {
  return (
    <SettingPage 
      title="Notifications"
      description="Manage alerts and communications"
      backPath="/coach-settings"
      userType="coach"
      category="notifications"
    />
  );
}

export function CoachSecurityPage() {
  return (
    <SettingPage 
      title="Security"
      description="Password and account management"
      backPath="/coach-settings"
      userType="coach"
      category="security"
    />
  );
}

export function CoachConnectionsPage() {
  return (
    <SettingPage 
      title="Connections"
      description="External apps and integrations"
      backPath="/coach-settings"
      userType="coach"
      category="connections"
    />
  );
}

export function CoachBillingPage() {
  return (
    <SettingPage 
      title="Billing"
      description="Payment methods and subscription"
      backPath="/coach-settings"
      userType="coach"
      category="billing"
    />
  );
}

export function CoachDevicesPage() {
  return (
    <SettingPage 
      title="Devices"
      description="Trusted devices and app permissions"
      backPath="/coach-settings"
      userType="coach"
      category="devices"
    />
  );
}

export function CoachLegalPage() {
  return (
    <SettingPage 
      title="Legal"
      description="Terms, privacy policy, and agreements"
      backPath="/coach-settings"
      userType="coach"
      category="legal"
    />
  );
}

export function CoachDangerPage() {
  return (
    <SettingPage 
      title="Account Actions"
      description="Delete account and danger zone"
      backPath="/coach-settings"
      userType="coach"
      category="danger"
    />
  );
}