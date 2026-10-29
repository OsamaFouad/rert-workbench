import { HashRouter, NavLink, Navigate, Route, Routes } from 'react-router-dom';
import { EVIDENCE_VERSION } from '../evidence';
import { StoreProvider } from '../state/store';
import { APP_VERSION } from '../version';
import { AboutPage } from './pages/AboutPage';
import { CasesPage } from './pages/CasesPage';
import { CaseWorkflow } from './pages/CaseWorkflow';
import { EvidencePage } from './pages/EvidencePage';
import { GlossaryPage } from './pages/GlossaryPage';

export function App() {
  return (
    <StoreProvider>
      <HashRouter>
        <header className="app-header">
          <NavLink to="/" className="brand">
            ReRT <span>Workbench</span>
          </NavLink>
          <nav aria-label="Main">
            <NavLink to="/" end>Cases</NavLink>
            <NavLink to="/evidence">Evidence Library</NavLink>
            <NavLink to="/glossary">Arabic Glossary</NavLink>
            <NavLink to="/about">About &amp; Validation</NavLink>
          </nav>
        </header>
        <div className="banner" role="note">
          Research and educational prototype. Fictional cases only. Not a medical device, not validated for clinical use, and it never
          decides whether to offer radiotherapy.
        </div>
        <main>
          <Routes>
            <Route path="/" element={<CasesPage />} />
            <Route path="/case/:id" element={<Navigate to="setup" replace />} />
            <Route path="/case/:id/:step" element={<CaseWorkflow />} />
            <Route path="/evidence" element={<EvidencePage />} />
            <Route path="/glossary" element={<GlossaryPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
        <footer className="app-footer">
          ReRT Workbench v{APP_VERSION} · Evidence dataset v{EVIDENCE_VERSION} · Data stays in this browser (localStorage).
        </footer>
      </HashRouter>
    </StoreProvider>
  );
}
