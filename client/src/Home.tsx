import React from 'react';
import { Link } from 'react-router-dom';
import { AdSlot } from './components/monetization/AdSlot.js';

import { Building2, Calculator, ShieldCheck, FolderOpen, FileText, Eye, ArrowRight, Play, CheckCircle2, Package } from 'lucide-react';
import { useAuth } from './contexts/AuthContext';
import { useLanguage } from './contexts/LanguageContext.js';

const CALCULATOR_PREVIEW = [
  { to: '/calculators/room.floor-area', titleKey: 'homeCalcFloorAreaTitle', descriptionKey: 'homeCalcFloorAreaDescription', hintKey: 'hintRoomFloorArea' },
  { to: '/calculators/wall.net-area', titleKey: 'homeCalcWallAreaTitle', descriptionKey: 'homeCalcWallAreaDescription', hintKey: 'hintWallNetArea' },
  { to: '/calculators/masonry.brick-quantity', titleKey: 'homeCalcBricksTitle', descriptionKey: 'homeCalcBricksDescription', hintKey: 'hintBrickQuantity' },
  { to: '/calculators/concrete.volume', titleKey: 'homeCalcConcreteTitle', descriptionKey: 'homeCalcConcreteDescription', hintKey: 'hintConcreteVolume' },
  { to: '/calculators/plaster.quantity', titleKey: 'homeCalcPlasterTitle', descriptionKey: 'homeCalcPlasterDescription', hintKey: 'hintPlasterQuantity' },
  { to: '/calculators/tile.quantity', titleKey: 'homeCalcTileTitle', descriptionKey: 'homeCalcTileDescription', hintKey: 'hintTileQuantity' },
] as const;

export const Home: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const { t } = useLanguage();

  return (
    <div className="min-h-screen">
      {/* Hero (global SiteHeader already provides navigation/controls) */}
      <section className="pt-16 pb-16 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-900/20 via-slate-950 to-slate-950" />
        <div className="max-w-6xl mx-auto relative text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-medium mb-6">
            <Calculator className="w-3.5 h-3.5" />
            {t('homeHeroBadge')}
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold mb-5 leading-tight">
            {t('homeHeroTitle')}
          </h1>
          <p className="text-lg text-slate-300 max-w-2xl mx-auto mb-8">
            {t('homeHeroSubtitle')}
          </p>
          <Link to="/calculators" className="group inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-950 px-7 py-3.5 rounded-xl font-bold text-base transition-all duration-200 shadow-lg shadow-amber-500/20">
            <Play className="w-5 h-5" />
            {isAuthenticated ? t('homeOpenCalculators') : t('homeStartCalculating')}
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
          <div className="mt-4">
            <Link to="/workspace" className="text-sm text-slate-400 hover:text-amber-400 transition">
              {t('homeOpenWorkspace')} →
            </Link>
          </div>
          <div className="mt-5 flex flex-wrap justify-center gap-4 text-sm text-slate-400">
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> {t('homeTrustServerFormulas')}</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> {t('homeTrustVisual')}</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> {t('homeTrustBoq')}</span>
          </div>
          {isAuthenticated && user && (
            <p className="mt-6 text-sm text-amber-400">{t('homeWelcomeBack')} {user.name}</p>
          )}
        </div>
      </section>

      {/* Ad: lower hero */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pb-10">
        <AdSlot format="banner" slotId="landing-hero-lower" />
      </div>

      {/* How It Works */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 border-t border-slate-900">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl font-bold text-slate-100 text-center mb-10">{t('homeHowItWorks')}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <StepCard number="1" title={t('homeStep1Title')} description={t('homeStep1Description')} />
            <StepCard number="2" title={t('homeStep2Title')} description={t('homeStep2Description')} />
            <StepCard number="3" title={t('homeStep3Title')} description={t('homeStep3Description')} />
          </div>
        </div>
      </section>

      {/* Available calculators preview */}
      <section className="py-14 px-4 sm:px-6 lg:px-8 border-t border-slate-900">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl font-bold text-slate-100 text-center">{t('homeCalcHeading')}</h2>
          <p className="text-sm text-slate-400 text-center mt-2 max-w-2xl mx-auto">
            {t('homeCalcSubheading')}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-8">
            {CALCULATOR_PREVIEW.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5 transition hover:border-amber-500/40 hover:bg-slate-900"
              >
                <h3 className="text-base font-semibold text-slate-100">{t(item.titleKey)}</h3>
                <p className="mt-1 text-sm text-slate-400">{t(item.descriptionKey)}</p>
                <p className="mt-2 text-xs font-medium text-amber-400/90">{t(item.hintKey)}</p>
              </Link>
            ))}
          </div>
          <p className="mt-6 text-center text-xs text-slate-500 max-w-2xl mx-auto">
            {t('homeCalcFootnote')}
          </p>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl font-bold text-slate-100 text-center mb-10">{t('homeIncluded')}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            <FeatureCard icon={<Calculator className="w-5 h-5 text-amber-400" />} title={t('homeFeature1Title')} description={t('homeFeature1Description')} />
            <FeatureCard icon={<ShieldCheck className="w-5 h-5 text-amber-400" />} title={t('homeFeature2Title')} description={t('homeFeature2Description')} />
            <FeatureCard icon={<Eye className="w-5 h-5 text-amber-400" />} title={t('homeFeature3Title')} description={t('homeFeature3Description')} />
            <FeatureCard icon={<FileText className="w-5 h-5 text-amber-400" />} title={t('homeFeature4Title')} description={t('homeFeature4Description')} />
            <FeatureCard icon={<FolderOpen className="w-5 h-5 text-amber-400" />} title={t('homeFeature5Title')} description={t('homeFeature5Description')} />
            <FeatureCard icon={<Package className="w-5 h-5 text-amber-400" />} title={t('homeFeature6Title')} description={t('homeFeature6Description')} />
          </div>
        </div>
      </section>

      {/* Secondary CTA */}
      <section className="py-16 px-4 sm:px-6 border-t border-slate-900">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl font-bold text-slate-100 mb-4">{t('homeCtaTitle')}</h2>
          <p className="text-slate-400 mb-8">
            {isAuthenticated ? t('homeCtaAuthed') : t('homeCtaGuest')}
          </p>
          <Link to="/calculators" className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-950 px-7 py-3.5 rounded-xl font-bold text-base transition-colors">
            <Play className="w-5 h-5" />
            {isAuthenticated ? t('homeOpenCalculators') : t('homeStartCalculating')}
          </Link>
        </div>
      </section>

      {/* Ad: footer */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pb-12">
        <AdSlot format="banner" slotId="landing-footer" />
      </div>
    </div>
  );
};

const StepCard: React.FC<{ number: string; title: string; description: string }> = ({ number, title, description }) => (
  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center">
    <div className="w-10 h-10 rounded-full bg-amber-500 text-slate-950 font-bold flex items-center justify-center mx-auto mb-4 text-sm">{number}</div>
    <h3 className="text-base font-semibold text-slate-100 mb-2">{title}</h3>
    <p className="text-sm text-slate-400 leading-relaxed">{description}</p>
  </div>
);

const FeatureCard: React.FC<{ icon: React.ReactNode; title: string; description: string }> = ({ icon, title, description }) => (
  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 hover:border-amber-500/30 transition-colors">
    <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center mb-3">{icon}</div>
    <h3 className="text-base font-semibold text-slate-100 mb-1.5">{title}</h3>
    <p className="text-sm text-slate-400 leading-relaxed">{description}</p>
  </div>
);

export default Home;
