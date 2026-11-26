import { useState, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'motion/react';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { ScrollToTop } from './components/ScrollToTop';
import { LoadingScreen } from './components/LoadingScreen';
import { PageTransition } from './components/MotionPrimitives';
import { HomePage } from './pages/HomePage';
import { CataloguePage } from './pages/CataloguePage';
import { ProductDetailPage } from './pages/ProductDetailPage';
import { QuoteRequestPage } from './pages/QuoteRequestPage';
import { getRouterBasename } from './utils/assetPath';

function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route
          path="/"
          element={
            <PageTransition>
              <HomePage />
            </PageTransition>
          }
        />
        <Route
          path="/catalogue"
          element={
            <PageTransition>
              <CataloguePage />
            </PageTransition>
          }
        />
        <Route
          path="/product/:slug"
          element={
            <PageTransition>
              <ProductDetailPage />
            </PageTransition>
          }
        />
        <Route
          path="/quote"
          element={
            <PageTransition>
              <QuoteRequestPage />
            </PageTransition>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AnimatePresence>
  );
}

export default function App() {
  const [showPreloader, setShowPreloader] = useState(true);
  const basename = getRouterBasename();

  const handleLoadingComplete = useCallback(() => {
    setShowPreloader(false);
  }, []);

  return (
    <BrowserRouter basename={basename}>
      <LoadingScreen visible={showPreloader} onComplete={handleLoadingComplete} />
      <ScrollToTop />
      <div className="min-h-screen flex flex-col bg-white text-[#202735]">
        <Navbar />
        <div className="flex-1">
          <AnimatedRoutes />
        </div>
        <Footer />
      </div>
    </BrowserRouter>
  );
}
