import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Building2, Plus, Trash2, FolderOpen, Loader2, ArrowLeft } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext.js';
import { apiUrl } from '../services/apiBase.js';

interface ProjectSummary {
  projectId: string;
  name: string;
  updatedAt?: string;
  buildings?: Array<{ floors?: Array<{ rooms?: unknown[] }> }>;
  createdAt?: string;
  rateCard?: {
    currency?: string;
    entries?: Array<{ category?: string; rate?: number | null }>;
  };
}

export function ProjectsPage() {
  const navigate = useNavigate();
  const { user, logout, isLoading: authLoading } = useAuth();
  const { t } = useLanguage();
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renamingValue, setRenamingValue] = useState('');

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate('/login'); return; }
    loadProjects();
  }, [user, authLoading, navigate]);

  const loadProjects = async () => {
    try {
      setLoading(true);
      const res = await fetch(apiUrl('/projects'), { credentials: 'include' });
      if (!res.ok) throw new Error(t('projectsLoadFailed'));
      const data = await res.json();
      setProjects(data.projects || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('projectsLoadFailed'));
    } finally { setLoading(false); }
  };

  const handleDelete = async (projectId: string) => {
    if (!confirm(t('projectsDeleteConfirm'))) return;
    setDeletingId(projectId);
    try {
      const res = await fetch(apiUrl(`/projects/${projectId}`), { method: 'DELETE', credentials: 'include' });
      if (!res.ok) throw new Error(t('projectsDeleteFailed'));
      setProjects((p) => p.filter((x) => x.projectId !== projectId));
    } catch (err) {
      setError(err instanceof Error ? err.message : t('projectsDeleteFailed'));
    } finally { setDeletingId(null); }
  };

  const startRenaming = (project: ProjectSummary) => {
    setRenamingId(project.projectId);
    setRenamingValue(project.name);
  };

  const cancelRenaming = () => {
    setRenamingId(null);
    setRenamingValue('');
  };

  const handleRename = async (projectId: string) => {
    if (!renamingValue.trim()) return;
    setRenamingId(null);
    try {
      const res = await fetch(apiUrl(`/projects/${projectId}`), {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: renamingValue.trim() })
      });
      if (!res.ok) throw new Error(t('projectsRenameFailed'));
      setProjects((p) => p.map(proj =>
        proj.projectId === projectId ? { ...proj, name: renamingValue.trim() } : proj
      ));
    } catch (err) {
      setError(err instanceof Error ? err.message : t('projectsRenameFailed'));
      cancelRenaming();
    }
  };

  const countRooms = (p: ProjectSummary): number =>
    p.buildings?.reduce((s, b) => s + (b.floors?.reduce((sf, f) => sf + (f.rooms?.length || 0), 0) || 0), 0) || 0;


  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return '';
    }
  };

  if (authLoading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center"><Loader2 className="w-8 h-8 text-amber-400 animate-spin" /></div>;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3"><Building2 className="w-7 h-7 text-amber-400" /><div><h1 className="text-lg font-bold">{t('projectsTitle')}</h1><p className="text-xs text-slate-400">{user?.email}</p></div></div>
          <div className="flex items-center gap-2">
            <Link to="/workspace" className="flex items-center gap-2 px-3 py-2 text-sm text-slate-300 hover:text-amber-400"><Plus className="w-4 h-4" /><span className="hidden sm:inline">{t('projectsNewButton')}</span></Link>
            <button onClick={logout} className="px-3 py-2 text-sm text-slate-300 hover:text-red-400">{t('navLogout')}</button>
          </div>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <Link to="/workspace" className="inline-flex items-center gap-2 text-slate-400 hover:text-slate-200 mb-6 text-sm"><ArrowLeft className="w-4 h-4" />{t('projectsBackToWorkspace')}</Link>
        {error && <div className="mb-6 p-4 bg-red-950/50 border border-red-800/50 rounded-xl text-red-400 text-sm">{error}</div>}
        {loading ? <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 text-amber-400 animate-spin" /></div>
        : projects.length === 0 ? (
          <div className="text-center py-20 bg-slate-900/50 border border-slate-800 rounded-2xl">
            <FolderOpen className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-slate-300 mb-2">{t('projectsEmpty')}</h2>
            <p className="text-slate-500 mb-6">{t('projectsEmptyHint')}</p>
            <Link to="/workspace" className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-950 px-5 py-2.5 rounded-xl font-semibold"><Plus className="w-4 h-4" />{t('projectsNewProject')}</Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((p) => (
              <div key={p.projectId} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 hover:border-amber-500/30">
                <h3 className="font-semibold text-slate-100 mb-2 truncate">{p.name || t('projectsUntitled')}</h3>
                <p className="text-xs text-slate-500 mb-4">{countRooms(p)} {t('projectsRoomsCount')}</p>
                <div className="flex items-center gap-2">
                  <Link to={`/workspace?project=${p.projectId}`} className="flex-1 flex items-center justify-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium py-2 rounded-lg"><FolderOpen className="w-3.5 h-3.5" />{t('projectsOpen')}</Link>
                  <button onClick={() => handleDelete(p.projectId)} disabled={deletingId === p.projectId} className="p-2 text-slate-500 hover:text-red-400 disabled:opacity-50">
                    {deletingId === p.projectId ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}