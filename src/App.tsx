/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { VillagePlanRecord, ModuleKey, UserSession } from './types';
import { getInitialVillages } from './data/initialData';
import { DEFAULT_VIEWER_SESSION, syncPasswordsFromCloud } from './data/authConfig';
import { Header } from './components/Header';
import { GoogleSheetsBar } from './components/GoogleSheetsBar';
import { GoogleSheetsDatabaseModal } from './components/GoogleSheetsDatabaseModal';
import { ModuleNavigation } from './components/ModuleNavigation';
import { DashboardStats } from './components/DashboardStats';
import { ModuleInputForm } from './components/ModuleInputForm';
import { SpreadsheetTable } from './components/SpreadsheetTable';
import { DistrictSummary } from './components/DistrictSummary';
import { ExcelImportModal } from './components/ExcelImportModal';
import { LoginModal } from './components/LoginModal';
import { AddVillageModal } from './components/AddVillageModal';
import { MobileBottomNav } from './components/MobileBottomNav';
import { exportToExcel } from './utils/excelHandler';
import {
  GoogleSheetsConfig,
  SHEETS_CONFIG_KEY,
  updateSingleVillageInSheets,
  getDefaultDatabaseConfig,
  DESIGNATED_SPREADSHEET_ID,
  DESIGNATED_SPREADSHEET_URL
} from './services/googleSheetsDatabase';
import { getAppsScriptUrl, updateVillageViaAppsScript } from './services/appsScriptDatabase';
import { initGoogleAuth, getAccessToken } from './services/googleAuth';

const STORAGE_KEY = 'boalemo_perencanaan_desa_2027';
const SESSION_KEY = 'boalemo_user_session';

export default function App() {
  const [villages, setVillages] = useState<VillagePlanRecord[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Failed to load saved state from localStorage:', e);
    }
    return getInitialVillages();
  });

  // Default session: Viewer (Pengunjung publik dapat langsung melihat tanpa melalui login)
  const [session, setSession] = useState<UserSession>(() => {
    try {
      const saved = localStorage.getItem(SESSION_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.role) return parsed;
      }
    } catch (e) {
      console.error('Failed to load session from localStorage:', e);
    }
    return DEFAULT_VIEWER_SESSION;
  });

  // Google Sheets Database configuration (Permanently locked to designated official database: 1ETuI256p8T5x-4WFVHB-FKonUkY8di9DroLkpAndF1w)
  const [sheetsConfig, setSheetsConfig] = useState<GoogleSheetsConfig | null>(() => {
    const defaultConfig = getDefaultDatabaseConfig();
    try {
      const saved = localStorage.getItem(SHEETS_CONFIG_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ...defaultConfig,
          ...parsed,
          spreadsheetId: DESIGNATED_SPREADSHEET_ID,
          spreadsheetUrl: DESIGNATED_SPREADSHEET_URL,
          autoSync: true, // Always enforce autoSync for real-time spreadsheet updates
        };
      }
    } catch (e) {
      console.error('Failed to load Google Sheets config:', e);
    }
    return defaultConfig;
  });

  const [activeView, setActiveView] = useState<'dashboard' | 'input' | 'table' | 'district'>('dashboard');
  const [currentVillageId, setCurrentVillageId] = useState<string>('7502012004'); // Bongo Nol
  const [currentModule, setCurrentModule] = useState<ModuleKey>('modul2_musdes_persiapan');
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isAddVillageModalOpen, setIsAddVillageModalOpen] = useState(false);
  const [isGoogleSheetsModalOpen, setIsGoogleSheetsModalOpen] = useState(false);

  // Initialize Google Auth state listener and sync cloud passwords on app load
  useEffect(() => {
    syncPasswordsFromCloud().catch(() => {});

    const unsubscribe = initGoogleAuth(
      (user, token) => {
        console.log('Google Auth connected:', user.email);
      },
      () => {
        console.log('Google Auth not signed in');
      }
    );
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  // Persist villages state to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(villages));
    } catch (e) {
      console.error('Failed to persist to localStorage:', e);
    }
  }, [villages]);

  // Persist session state to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    } catch (e) {
      console.error('Failed to persist session:', e);
    }
  }, [session]);

  // CRUD: Update Village + Auto Sync to Google Sheets if enabled
  const handleSaveVillage = (updatedVillage: VillagePlanRecord) => {
    setVillages((prev) =>
      prev.map((v) => (v.idDesa === updatedVillage.idDesa ? updatedVillage : v))
    );

    // If auto sync is enabled with Google Sheets, push update in background
    if (sheetsConfig?.autoSync) {
      const scriptUrl = getAppsScriptUrl();
      if (scriptUrl) {
        updateVillageViaAppsScript(scriptUrl, updatedVillage).then((ok) => {
          if (ok) {
            setSheetsConfig((prev) =>
              prev
                ? {
                    ...prev,
                    lastSyncTime: new Date().toLocaleString('id-ID'),
                    lastSyncAction: 'auto',
                    lastSyncStatus: 'success',
                  }
                : null
            );
          }
        }).catch((err) => {
          console.warn('Background auto sync to Google Apps Script error:', err);
        });
      } else {
        // Fallback to direct token if configured
        getAccessToken().then((token) => {
          if (token && sheetsConfig) {
            updateSingleVillageInSheets(
              token,
              sheetsConfig.spreadsheetId,
              sheetsConfig.sheetName,
              updatedVillage
            ).then((ok) => {
              if (ok) {
                setSheetsConfig((prev) =>
                  prev
                    ? {
                        ...prev,
                        lastSyncTime: new Date().toLocaleString('id-ID'),
                        lastSyncAction: 'auto',
                        lastSyncStatus: 'success',
                      }
                    : null
                );
              }
            }).catch((err) => {
              console.warn('Background auto sync to Google Sheets error:', err);
            });
          }
        });
      }
    }
  };

  // CRUD: Create Village
  const handleAddVillage = (newVillage: VillagePlanRecord) => {
    setVillages((prev) => [...prev, newVillage]);
    setCurrentVillageId(newVillage.idDesa);
    setActiveView('input');
  };

  // CRUD: Delete Village
  const handleDeleteVillage = (villageId: string) => {
    setVillages((prev) => {
      const updated = prev.filter((v) => v.idDesa !== villageId);
      if (currentVillageId === villageId && updated.length > 0) {
        setCurrentVillageId(updated[0].idDesa);
      }
      return updated;
    });
  };

  const handleApplyImport = (updatedVillages: VillagePlanRecord[]) => {
    setVillages(updatedVillages);
  };

  const handleResetData = () => {
    if (window.confirm('Apakah Anda yakin ingin mengembalikan seluruh 82 data desa ke format template awal?')) {
      const initial = getInitialVillages();
      setVillages(initial);
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  const handleLoginSuccess = (newSession: UserSession) => {
    setSession(newSession);
    // If Admin Kecamatan, focus on a village from their kecamatan
    if (newSession.role === 'admin_kecamatan' && newSession.kecamatanCode) {
      const kecVillage = villages.find(
        (v) => v.idKec === newSession.kecamatanCode || v.kecamatan === newSession.kecamatanName
      );
      if (kecVillage) {
        setCurrentVillageId(kecVillage.idDesa);
      }
    }
  };

  const handleLogout = () => {
    setSession(DEFAULT_VIEWER_SESSION);
  };

  const handleSelectVillageForEdit = (villageId: string, moduleKey?: ModuleKey) => {
    setCurrentVillageId(villageId);
    if (moduleKey) {
      setCurrentModule(moduleKey);
    }
    setActiveView('input');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const currentVillage = villages.find((v) => v.idDesa === currentVillageId) || villages[0];

  // Calculate completion map for current village
  const villageCompletionStatus: Record<ModuleKey, boolean> = {
    overview: true,
    modul1_rpjm: Boolean(currentVillage?.rpjmDesTgl),
    modul2_musdes_persiapan: Boolean(currentVillage?.musdesPersiapan?.tanggal),
    modul3_pencermatan: Boolean(currentVillage?.pencermatanRpjmTgl),
    modul4_musrenbangdes: Boolean(currentVillage?.musrenbangdes?.tanggal),
    modul5_musdes_pengesahan: Boolean(currentVillage?.musdesPengesahan?.tanggal),
    modul6_perdes_apb: Boolean(currentVillage?.perdesApbNomor || currentVillage?.perdesRkpTgl),
    modul7_kdmp: Boolean(currentVillage?.musdesusKdmp?.melaksanakan !== null || currentVillage?.musdesusKdmp?.tanggal),
    modul8_perubahan: Boolean(currentVillage?.perdesRkpPerubahanTgl || currentVillage?.nilaiDdKdmp),
  };

  const evidenceCounts: Partial<Record<ModuleKey, number>> = {
    overview: 0,
    modul1_rpjm: currentVillage?.evidence?.['modul1_rpjm']?.length || 0,
    modul2_musdes_persiapan: currentVillage?.evidence?.['modul2_musdes_persiapan']?.length || 0,
    modul3_pencermatan: currentVillage?.evidence?.['modul3_pencermatan']?.length || 0,
    modul4_musrenbangdes: currentVillage?.evidence?.['modul4_musrenbangdes']?.length || 0,
    modul5_musdes_pengesahan: currentVillage?.evidence?.['modul5_musdes_pengesahan']?.length || 0,
    modul6_perdes_apb: currentVillage?.evidence?.['modul6_perdes_apb']?.length || 0,
    modul7_kdmp: currentVillage?.evidence?.['modul7_kdmp']?.length || 0,
    modul8_perubahan: currentVillage?.evidence?.['modul8_perubahan']?.length || 0,
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans selection:bg-emerald-100 selection:text-emerald-900 pb-20 lg:pb-10">
      {/* Top Header */}
      <Header
        session={session}
        onOpenLogin={() => setIsLoginModalOpen(true)}
        onLogout={handleLogout}
        villages={villages}
        onOpenImport={() => setIsImportOpen(true)}
        onOpenAddVillage={() => setIsAddVillageModalOpen(true)}
        onResetData={handleResetData}
        activeView={activeView}
        setActiveView={setActiveView}
        sheetsConfig={sheetsConfig}
        onOpenGoogleSheets={() => setIsGoogleSheetsModalOpen(true)}
      />

      {/* Google Sheets Live Database Connection Status Bar (STRICTLY Super Admin Only) */}
      {session.role === 'super_admin' && (
        <GoogleSheetsBar
          sheetsConfig={sheetsConfig}
          onOpenModal={() => setIsGoogleSheetsModalOpen(true)}
          villages={villages}
          onApplyVillages={(updated) => setVillages(updated)}
          onUpdateConfig={(cfg) => setSheetsConfig(cfg)}
        />
      )}

      {/* Module Navigation Bar (shown prominently in input mode or quick access) */}
      {activeView === 'input' && (
        <ModuleNavigation
          currentModule={currentModule}
          onSelectModule={(mod) => setCurrentModule(mod)}
          villageCompletionStatus={villageCompletionStatus}
          evidenceCounts={evidenceCounts}
        />
      )}

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto w-full px-3 sm:px-6 lg:px-8 py-5 sm:py-6 flex-1">
        {activeView === 'dashboard' && (
          <DashboardStats
            villages={villages}
            onSelectVillage={(id) => handleSelectVillageForEdit(id)}
            onNavigateToModule={(mod) => {
              setCurrentModule(mod);
              setActiveView('input');
            }}
          />
        )}

        {activeView === 'input' && (
          <ModuleInputForm
            villages={villages}
            currentVillageId={currentVillageId}
            onSelectVillage={setCurrentVillageId}
            currentModule={currentModule}
            onSelectModule={setCurrentModule}
            onSaveVillage={handleSaveVillage}
            session={session}
            onDeleteVillage={handleDeleteVillage}
          />
        )}

        {activeView === 'table' && (
          <SpreadsheetTable
            villages={villages}
            onSelectVillageForEdit={handleSelectVillageForEdit}
            session={session}
            onDeleteVillage={handleDeleteVillage}
          />
        )}

        {activeView === 'district' && (
          <DistrictSummary
            villages={villages}
            onSelectVillage={handleSelectVillageForEdit}
            session={session}
          />
        )}
      </main>

      {/* Excel Import Modal (Super Admin Only) */}
      <ExcelImportModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        currentVillages={villages}
        onApplyImport={handleApplyImport}
        role={session.role}
      />

      {/* Login & Role Authentication Modal */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        currentSession={session}
        onLoginSuccess={handleLoginSuccess}
        onLogout={handleLogout}
      />

      {/* Add Village Modal (STRICTLY Super Admin Only) */}
      {session.role === 'super_admin' && (
        <AddVillageModal
          isOpen={isAddVillageModalOpen}
          onClose={() => setIsAddVillageModalOpen(false)}
          userSession={session}
          existingVillages={villages}
          onAddVillage={handleAddVillage}
        />
      )}

      {/* Google Sheets Spreadsheet Database Modal (STRICTLY Super Admin Only) */}
      {session.role === 'super_admin' && (
        <GoogleSheetsDatabaseModal
          isOpen={isGoogleSheetsModalOpen}
          onClose={() => setIsGoogleSheetsModalOpen(false)}
          villages={villages}
          onApplyVillages={(updated) => setVillages(updated)}
          sheetsConfig={sheetsConfig}
          onUpdateConfig={(cfg) => setSheetsConfig(cfg)}
        />
      )}

      {/* Mobile Bottom Navigation Bar */}
      <MobileBottomNav
        activeView={activeView}
        setActiveView={setActiveView}
        session={session}
        onOpenLogin={() => setIsLoginModalOpen(true)}
        onExportExcel={() => exportToExcel(villages)}
      />
    </div>
  );
}
