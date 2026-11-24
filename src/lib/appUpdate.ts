/** Android self-update via the native AppUpdate plugin (GitHub "latest-apk" release). */

export interface UpdateInfo {
  available: boolean;
  currentCode: number;
  currentName: string;
  latestCode: number;
  latestName: string;
}

interface AppUpdatePlugin {
  check(): Promise<UpdateInfo>;
  install(): Promise<{ status: 'installer' | 'needsPermission' }>;
}

async function plugin(): Promise<AppUpdatePlugin | null> {
  try {
    const { Capacitor, registerPlugin } = await import('@capacitor/core');
    if (!Capacitor.isNativePlatform()) return null;
    return registerPlugin<AppUpdatePlugin>('AppUpdate');
  } catch {
    return null;
  }
}

/** null on web or when the check fails (offline etc.). */
export async function checkForAppUpdate(): Promise<UpdateInfo | null> {
  const p = await plugin();
  if (!p) return null;
  try {
    return await p.check();
  } catch {
    return null;
  }
}

export async function installAppUpdate(): Promise<'installer' | 'needsPermission' | 'failed'> {
  const p = await plugin();
  if (!p) return 'failed';
  try {
    return (await p.install()).status;
  } catch {
    return 'failed';
  }
}
