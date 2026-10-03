import { useState, useEffect, useCallback } from 'react';
import { getApiBaseUrl } from '../utils/platform';
import {
  APP_VERSION,
  isUpdateNewer,
  isVersionAcknowledged,
  markCurrentVersionInstalled,
} from '../utils/versionManager';

export default function useUpdateChecker(currentUser) {
  const [updateAvailable, setUpdateAvailable] = useState(null);
  const [updateDismissed, setUpdateDismissed] = useState(false);
  const [updateDownloadedToast, setUpdateDownloadedToast] = useState(false);
  const [serverLatestVersion, setServerLatestVersion] = useState('');
  const [updateActiveFlag, setUpdateActiveFlag] = useState(false);

  // In-App Update Checker — pings backend /health/update-check on load + every 4 hrs
  const checkForUpdate = useCallback(async (isManual = false) => {
    try {
      const apiBaseUrl = getApiBaseUrl();
      const ownerEmail = currentUser?.email ? encodeURIComponent(currentUser.email) : '';
      let latestVersion = '';
      let downloadUrl = '';
      let hasNewUpdate = false;
      let isOwnerBeta = false;

      // 1. Check backend /health/update-check
      try {
        const resp = await fetch(
          `${apiBaseUrl}/health/update-check?client_version=${encodeURIComponent(APP_VERSION)}${ownerEmail ? `&user_email=${ownerEmail}` : ''}`,
          { cache: 'no-store' }
        );
        if (resp.ok) {
          const data = await resp.json();
          latestVersion = (data.latest_version || '').replace(/^v/i, '');
          downloadUrl = data.update_download_url || '';
          isOwnerBeta = !!data.is_owner_beta;
          setUpdateActiveFlag(!!data.update_active || !!data.update_beta_active);
          if (data.update_available || isUpdateNewer(latestVersion, APP_VERSION)) {
            hasNewUpdate = true;
          }
        }
      } catch (backendErr) {
        console.warn('Backend update check skipped:', backendErr);
      }

      // 2. Direct GitHub Releases Check (Guarantees instant update whenever GitHub Actions builds on git push)
      try {
        const ghResp = await fetch(
          'https://api.github.com/repos/rajkishorock-arch/SMART-ATTENDANCE-SYSTEM/releases/latest',
          { cache: 'no-store' }
        );
        if (ghResp.ok) {
          const ghData = await ghResp.json();
          const ghTag = (ghData.tag_name || '').replace(/^v/i, '');
          if (isUpdateNewer(ghTag, APP_VERSION)) {
            latestVersion = ghTag;
            const apkAsset = ghData.assets?.find(a => a.name && a.name.endsWith('.apk'));
            downloadUrl = apkAsset?.browser_download_url || `https://github.com/rajkishorock-arch/SMART-ATTENDANCE-SYSTEM/releases/download/v${ghTag}/app-release.apk`;
            hasNewUpdate = true;
            setUpdateActiveFlag(true);
          }
        }
      } catch (ghErr) {
        console.warn('GitHub releases fetch skipped:', ghErr);
      }

      if (latestVersion) {
        setServerLatestVersion(latestVersion);
      }

      // Explicitly check if update is available and has not been acknowledged/dismissed
      let isDismissed = false;
      try {
        isDismissed = sessionStorage.getItem('update_banner_dismissed') === 'true' ||
          (latestVersion && localStorage.getItem('smart_attendance_dismissed_update_' + latestVersion) === 'true');
      } catch { /* storage fallback */ }

      hasNewUpdate = hasNewUpdate && (isManual || (!isVersionAcknowledged(latestVersion) && !isDismissed));

      if (hasNewUpdate) {
        const finalDownloadUrl = downloadUrl || `https://github.com/rajkishorock-arch/SMART-ATTENDANCE-SYSTEM/releases/download/v${latestVersion}/app-release.apk`;
        setUpdateAvailable({
          version: latestVersion,
          downloadUrl: finalDownloadUrl,
          isOwnerBeta: isOwnerBeta,
        });
        setUpdateDismissed(false);

        if (isManual) {
          const confirmDownload = window.confirm(
            `🚀 New Update Available!\n\nVersion: v${latestVersion}\nDescription: A new system release is ready for installation.\n\nWould you like to download the latest update package (APK) now?`
          );
          if (confirmDownload) {
            window.open(downloadUrl, '_blank');
          }
        }
      } else {
        setUpdateAvailable(null);
        setUpdateDismissed(true);
        markCurrentVersionInstalled();
        if (isManual) {
          alert(`✨ Up to Date!\n\nYou are already using the latest version of the app (v${APP_VERSION}). No updates required at this time.`);
        }
      }
    } catch {
      if (isManual) {
        alert("Failed to connect to the update check endpoint. Please check your internet connection.");
      }
    }
  }, [currentUser]);

  const handleManualCheck = useCallback(() => {
    checkForUpdate(true);
  }, [checkForUpdate]);

  useEffect(() => {
    let isMounted = true;
    const runCheck = async () => {
      if (isMounted) {
        await checkForUpdate();
      }
    };
    runCheck();
    const interval = setInterval(() => {
      if (isMounted) {
        checkForUpdate();
      }
    }, 4 * 60 * 60 * 1000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [checkForUpdate]);

  return {
    updateAvailable,
    setUpdateAvailable,
    updateDismissed,
    setUpdateDismissed,
    updateDownloadedToast,
    setUpdateDownloadedToast,
    serverLatestVersion,
    updateActiveFlag,
    checkForUpdate,
    handleManualCheck,
  };
}
