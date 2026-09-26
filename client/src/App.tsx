import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ProjectWorkspace } from './components/workspace/ProjectWorkspace.js';
import Home from './Home.js';
import { CalculatorHub } from './pages/CalculatorHub.js';
import { CalculatorPage } from './pages/CalculatorPage.js';
import { LoginPage } from './pages/LoginPage.js';
import { SignupPage } from './pages/SignupPage.js';
import { ProjectsPage } from './pages/ProjectsPage.js';
import { AuthProvider } from './contexts/AuthContext.js';
import { UnitProvider } from './contexts/UnitContext.js';
import { LanguageProvider } from './contexts/LanguageContext.js';
import { ThemeProvider } from './contexts/ThemeContext.js';
import { SiteHeader } from './components/SiteHeader.js';
import { ErrorBoundary } from './components/ErrorBoundary.js';

export function App() {
  return (
    <AuthProvider>
      <UnitProvider>
        <LanguageProvider>
          <ThemeProvider>
            <Router>
              <SiteHeader />
              <ErrorBoundary>
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/calculators" element={<CalculatorHub />} />
                  <Route path="/calculators/:calculatorId" element={<CalculatorPage />} />
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/signup" element={<SignupPage />} />
                  <Route path="/projects" element={<ProjectsPage />} />
                  <Route path="/workspace" element={<ProjectWorkspace />} />
                </Routes>
              </ErrorBoundary>
            </Router>
          </ThemeProvider>
        </LanguageProvider>
      </UnitProvider>
    </AuthProvider>
  );
}

export default App;