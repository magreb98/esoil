import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { SelectionProvider } from './hooks/useSelection';
import { ProjectsScreen } from './routes/ProjectsScreen';
import { SiteScreen } from './routes/SiteScreen';
import { ProfilesScreen } from './routes/ProfilesScreen';
import { SoilDiagnosisScreen } from './routes/SoilDiagnosisScreen';
import { ClimateDiagnosisScreen } from './routes/ClimateDiagnosisScreen';
import { CropEvaluationScreen } from './routes/CropEvaluationScreen';
import { PotentialScreen } from './routes/PotentialScreen';
import { YieldsScreen } from './routes/YieldsScreen';
import { MatrixScreen } from './routes/MatrixScreen';
import { ExportsScreen } from './routes/ExportsScreen';
import { GlossaryScreen } from './routes/GlossaryScreen';

function App() {
  return (
    <SelectionProvider>
      <HashRouter>
        <AppShell>
          <Routes>
            <Route path="/" element={<Navigate to="/projets" replace />} />
            <Route path="/projets" element={<ProjectsScreen />} />
            <Route path="/site" element={<SiteScreen />} />
            <Route path="/profils" element={<ProfilesScreen />} />
            <Route path="/diagnostic-sol" element={<SoilDiagnosisScreen />} />
            <Route path="/diagnostic-climat" element={<ClimateDiagnosisScreen />} />
            <Route path="/evaluation" element={<CropEvaluationScreen />} />
            <Route path="/potentiel" element={<PotentialScreen />} />
            <Route path="/rendements" element={<YieldsScreen />} />
            <Route path="/matrice" element={<MatrixScreen />} />
            <Route path="/exports" element={<ExportsScreen />} />
            <Route path="/glossaire" element={<GlossaryScreen />} />
            <Route path="*" element={<Navigate to="/projets" replace />} />
          </Routes>
        </AppShell>
      </HashRouter>
    </SelectionProvider>
  );
}

export default App;
