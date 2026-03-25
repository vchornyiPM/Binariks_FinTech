import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Linking,
} from 'react-native';
import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { BarCodeScanner, type BarCodeScannerResult } from 'expo-barcode-scanner';
import QRCode from 'react-native-qrcode-svg';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useWalletStore } from '@/stores/wallet.store';

type Tab = 'show' | 'scan';
type PermissionStatus = 'undetermined' | 'granted' | 'denied';

export default function QRScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const { selectedCoin } = useWalletStore();
  const [activeTab, setActiveTab] = useState<Tab>('show');
  const [permission, setPermission] = useState<PermissionStatus>('undetermined');
  const [scanned, setScanned] = useState(false);

  const tabBarOffset = Platform.OS === 'ios' ? 84 : 64;

  const qrPayload = selectedCoin
    ? JSON.stringify({ coinSerial: selectedCoin.coinSerial, name: selectedCoin.name })
    : null;

  // Request camera permission when switching to scan tab
  useEffect(() => {
    if (activeTab !== 'scan') return;
    (async () => {
      const { status } = await BarCodeScanner.requestPermissionsAsync();
      setPermission(status as PermissionStatus);
    })();
  }, [activeTab]);

  const handleTabChange = useCallback((tab: Tab) => {
    setActiveTab(tab);
    setScanned(false);
    if (Platform.OS === 'ios') Haptics.selectionAsync();
  }, []);

  const handleBarCodeScanned = useCallback(({ data }: BarCodeScannerResult) => {
    if (scanned) return;
    setScanned(true);
    if (Platform.OS === 'ios') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    try {
      const payload = JSON.parse(data) as { coinSerial?: string; name?: string };
      if (payload.coinSerial) {
        // Navigate to send-money pre-filled with the scanned recipient
        router.push({ pathname: '/send-money', params: { recipientSerial: payload.coinSerial } } as any);
        return;
      }
    } catch {
      // Not a JSON payload — treat as plain serial or show the raw value
    }

    // Fallback: if it looks like a plain coin serial (digits), use it directly
    if (/^\d+$/.test(data.trim())) {
      router.push({ pathname: '/send-money', params: { recipientSerial: data.trim() } } as any);
    } else {
      // Unknown format — show it and let user re-scan
      setScanned(false);
    }
  }, [scanned, router]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>QR Payment</Text>
      </View>

      {/* Tab Switcher */}
      <View style={[styles.tabBar, { backgroundColor: colors.border }]}>
        {(['show', 'scan'] as Tab[]).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tabItem, activeTab === tab && { backgroundColor: colors.cardBg }]}
            onPress={() => handleTabChange(tab)}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabLabel, { color: activeTab === tab ? colors.textPrimary : colors.textSecondary }]}>
              {tab === 'show' ? 'My QR' : 'Scan'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {activeTab === 'show' ? (
        <ShowQRTab
          qrPayload={qrPayload}
          coinName={selectedCoin?.name ?? null}
          coinSerial={selectedCoin?.coinSerial ?? null}
          colors={colors}
          tabBarOffset={tabBarOffset}
        />
      ) : (
        <ScanTab
          colors={colors}
          tabBarOffset={tabBarOffset}
          permission={permission}
          scanned={scanned}
          onBarcodeScanned={handleBarCodeScanned}
          onRescan={() => setScanned(false)}
          onOpenSettings={() => Linking.openSettings()}
        />
      )}
    </View>
  );
}

// ─── Show My QR Tab ──────────────────────────────────────────────────────────

interface ShowQRTabProps {
  qrPayload: string | null;
  coinName: string | null;
  coinSerial: string | null;
  colors: typeof Colors.light;
  tabBarOffset: number;
}

function ShowQRTab({ qrPayload, coinName, coinSerial, colors, tabBarOffset }: ShowQRTabProps) {
  const serialLast4 = coinSerial?.slice(-4) ?? '????';

  return (
    <View style={[styles.tabContent, { paddingBottom: tabBarOffset }]}>
      <Text style={[styles.instruction, { color: colors.textSecondary }]}>
        Show this code to receive a payment
      </Text>

      <View style={[styles.qrWrapper, { backgroundColor: '#fff', borderColor: colors.border }]}>
        {qrPayload ? (
          <QRCode value={qrPayload} size={188} backgroundColor="#fff" color="#000" />
        ) : (
          <Text style={[styles.qrPlaceholder, { color: colors.textSecondary }]}>No wallet selected</Text>
        )}
      </View>

      {coinName && (
        <View style={styles.walletInfo}>
          <Text style={[styles.walletName, { color: colors.textPrimary }]}>{coinName}</Text>
          <Text style={[styles.walletSerial, { color: colors.textSecondary }]}>•••• {serialLast4}</Text>
        </View>
      )}

      <View style={[styles.payloadBox, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
        <Text style={[styles.payloadLabel, { color: colors.textSecondary }]}>QR Payload</Text>
        <Text style={[styles.payloadText, { color: colors.textPrimary }]} numberOfLines={2}>
          {qrPayload ?? '—'}
        </Text>
      </View>
    </View>
  );
}

// ─── Scan Tab ─────────────────────────────────────────────────────────────────

interface ScanTabProps {
  colors: typeof Colors.light;
  tabBarOffset: number;
  permission: PermissionStatus;
  scanned: boolean;
  onBarcodeScanned: (result: BarCodeScannerResult) => void;
  onRescan: () => void;
  onOpenSettings: () => void;
}

function ScanTab({ colors, tabBarOffset, permission, scanned, onBarcodeScanned, onRescan, onOpenSettings }: ScanTabProps) {
  if (permission === 'undetermined') {
    return (
      <View style={[styles.tabContent, styles.centered, { paddingBottom: tabBarOffset }]}>
        <Text style={[styles.permText, { color: colors.textSecondary }]}>Requesting camera permission…</Text>
      </View>
    );
  }

  if (permission === 'denied') {
    return (
      <View style={[styles.tabContent, styles.centered, { paddingBottom: tabBarOffset }]}>
        <Text style={[styles.permTitle, { color: colors.textPrimary }]}>Camera access required</Text>
        <Text style={[styles.permText, { color: colors.textSecondary }]}>
          Allow camera access in Settings to scan QR codes.
        </Text>
        <TouchableOpacity
          style={[styles.settingsBtn, { backgroundColor: colors.primaryBlue }]}
          onPress={onOpenSettings}
          activeOpacity={0.85}
        >
          <Text style={styles.settingsBtnText}>Open Settings</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.scanContainer, { paddingBottom: tabBarOffset }]}>
      {/* Live camera */}
      <View style={styles.cameraWrap}>
        <BarCodeScanner
          onBarCodeScanned={scanned ? undefined : onBarcodeScanned}
          barCodeTypes={[BarCodeScanner.Constants.BarCodeType.qr]}
          style={StyleSheet.absoluteFillObject}
        />

        {/* Corner overlay */}
        <View style={styles.overlay} pointerEvents="none">
          {(['tl', 'tr', 'bl', 'br'] as const).map((c) => (
            <View key={c} style={[styles.corner, styles[`corner_${c}`], { borderColor: '#fff' }]} />
          ))}
          <Text style={styles.scanHint}>
            {scanned ? 'QR detected!' : 'Align QR code within the frame'}
          </Text>
        </View>
      </View>

      {scanned && (
        <TouchableOpacity
          style={[styles.rescanBtn, { backgroundColor: colors.primaryBlue }]}
          onPress={onRescan}
          activeOpacity={0.85}
        >
          <Text style={styles.rescanBtnText}>Scan Again</Text>
        </TouchableOpacity>
      )}

      <View style={[styles.infoBox, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
        <Text style={[styles.infoText, { color: colors.textSecondary }]}>
          Scan a QR code from another SDK.Finance user to open the Send Money screen with the recipient pre-filled.
        </Text>
      </View>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const VIEWFINDER = 260;

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 24, marginBottom: 16 },
  title: { fontSize: 34, fontWeight: '700' },
  tabBar: {
    flexDirection: 'row', marginHorizontal: 24, borderRadius: 12,
    padding: 3, marginBottom: 24,
  },
  tabItem: { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center' },
  tabLabel: { fontSize: 15, fontWeight: '500' },

  // Show QR
  tabContent: { flex: 1, alignItems: 'center', paddingHorizontal: 24 },
  centered: { justifyContent: 'center' },
  instruction: { fontSize: 15, textAlign: 'center', marginBottom: 24, lineHeight: 22 },
  qrWrapper: {
    width: 220, height: 220, borderRadius: 16, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center', padding: 16, marginBottom: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08, shadowRadius: 12, elevation: 4,
  },
  qrPlaceholder: { fontSize: 15, textAlign: 'center' },
  walletInfo: { alignItems: 'center', marginBottom: 20 },
  walletName: { fontSize: 17, fontWeight: '600' },
  walletSerial: { fontSize: 14, marginTop: 2 },
  payloadBox: { width: '100%', borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, padding: 12 },
  payloadLabel: { fontSize: 11, fontWeight: '500', marginBottom: 4 },
  payloadText: { fontSize: 12, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },

  // Scan
  scanContainer: { flex: 1, alignItems: 'center', paddingHorizontal: 24 },
  cameraWrap: {
    width: VIEWFINDER, height: VIEWFINDER,
    borderRadius: 20, overflow: 'hidden',
    marginBottom: 20, position: 'relative',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center', justifyContent: 'flex-end',
    paddingBottom: 16,
  },
  corner: { position: 'absolute', width: 28, height: 28, borderWidth: 3 },
  corner_tl: { top: 14, left: 14, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 6 },
  corner_tr: { top: 14, right: 14, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 6 },
  corner_bl: { bottom: 14, left: 14, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 6 },
  corner_br: { bottom: 14, right: 14, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 6 },
  scanHint: { color: '#fff', fontSize: 13, fontWeight: '500', textAlign: 'center', textShadowColor: 'rgba(0,0,0,0.6)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },
  rescanBtn: { height: 48, borderRadius: 14, paddingHorizontal: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  rescanBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  infoBox: { width: '100%', borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, padding: 16 },
  infoText: { fontSize: 14, lineHeight: 20, textAlign: 'center' },

  // Permission
  permTitle: { fontSize: 18, fontWeight: '700', marginBottom: 8, textAlign: 'center' },
  permText: { fontSize: 15, textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  settingsBtn: { height: 48, borderRadius: 14, paddingHorizontal: 32, alignItems: 'center', justifyContent: 'center' },
  settingsBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
