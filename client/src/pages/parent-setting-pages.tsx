'use client';

import SettingPage from "./setting-page";

export function ParentProfilePage() {
  return (
    <SettingPage 
      title="Profile"
      description="Personal information and preferences"
      backPath="/parent-settings"
      userType="parent"
      category="profile"
    />
  );
}

export function ParentFamilyPage() {
  return (
    <SettingPage 
      title="Family Management"
      description="Manage children and family members"
      backPath="/parent-settings"
      userType="parent"
      category="family"
    />
  );
}

export function ParentPrivacyPage() {
  return (
    <SettingPage 
      title="Privacy"
      description="Control your visibility and data sharing"
      backPath="/parent-settings"
      userType="parent"
      category="privacy"
    />
  );
}

export function ParentNotificationsPage() {
  return (
    <SettingPage 
      title="Notifications"
      description="Manage alerts and communications"
      backPath="/parent-settings"
      userType="parent"
      category="notifications"
    />
  );
}

export function ParentSecurityPage() {
  return (
    <SettingPage 
      title="Account & Security"
      description="Password, 2FA, and device management"
      backPath="/parent-settings"
      userType="parent"
      category="security"
    />
  );
}

export function ParentConnectionsPage() {
  return (
    <SettingPage 
      title="Connections"
      description="Connected apps and services"
      backPath="/parent-settings"
      userType="parent"
      category="connections"
    />
  );
}

export function ParentBillingPage() {
  return (
    <SettingPage 
      title="Billing & Payments"
      description="Manage subscriptions and payment methods"
      backPath="/parent-settings"
      userType="parent"
      category="billing"
    />
  );
}

export function ParentDevicesPage() {
  return (
    <SettingPage 
      title="Devices"
      description="Trusted devices and app permissions"
      backPath="/parent-settings"
      userType="parent"
      category="devices"
    />
  );
}

export function ParentLegalPage() {
  return (
    <SettingPage 
      title="Legal"
      description="Terms, privacy policy, and agreements"
      backPath="/parent-settings"
      userType="parent"
      category="legal"
    />
  );
}

export function ParentDangerPage() {
  return (
    <SettingPage 
      title="Danger Zone"
      description="Account deletion and irreversible actions"
      backPath="/parent-settings"
      userType="parent"
      category="danger"
    />
  );
}