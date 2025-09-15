'use client';

import SettingPage from "./setting-page";

export function PlayerProfilePage() {
  return (
    <SettingPage 
      title="Player Profile"
      description="Basketball info and personal details"
      backPath="/player-settings"
      userType="player"
      category="profile"
    />
  );
}

export function PlayerPrivacyPage() {
  return (
    <SettingPage 
      title="Privacy"
      description="Control your visibility and data sharing"
      backPath="/player-settings"
      userType="player"
      category="privacy"
    />
  );
}

export function PlayerNotificationsPage() {
  return (
    <SettingPage 
      title="Notifications"
      description="Manage alerts and communications"
      backPath="/player-settings"
      userType="player"
      category="notifications"
    />
  );
}

export function PlayerSecurityPage() {
  return (
    <SettingPage 
      title="Account & Security"
      description="Password and device management"
      backPath="/player-settings"
      userType="player"
      category="security"
    />
  );
}

export function PlayerDevicesPage() {
  return (
    <SettingPage 
      title="Devices"
      description="Trusted devices and app permissions"
      backPath="/player-settings"
      userType="player"
      category="devices"
    />
  );
}

export function PlayerLegalPage() {
  return (
    <SettingPage 
      title="Legal"
      description="Terms, privacy policy, and agreements"
      backPath="/player-settings"
      userType="player"
      category="legal"
    />
  );
}