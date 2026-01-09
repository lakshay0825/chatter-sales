import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import { useLoadingStore } from '../store/loadingStore';
import ConfirmDialog from './ConfirmDialog';

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { isLoading, message } = useLoadingStore();

  return (
    <div className="min-h-screen bg-gray-50 relative">
      <Header onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
      <div className="flex relative">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        {/* Overlay for mobile */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
        <main className="flex-1 lg:ml-0 transition-all duration-300 w-full">
          <div className="p-4 sm:p-6 lg:p-8">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Global loading overlay */}
      {isLoading && (
        <div className="fixed inset-0 z-[9999] bg-black bg-opacity-40 flex items-center justify-center pointer-events-auto">
          <div className="bg-white rounded-xl shadow-xl px-6 py-5 flex items-center gap-4">
            <div className="relative">
              <div className="h-10 w-10 rounded-full border-2 border-primary-200" />
              <div className="absolute inset-0 h-10 w-10 rounded-full border-2 border-primary-500 border-t-transparent animate-spin" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">
                {message || 'Please wait, processing...'}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                This may take a few seconds. Do not close the page.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Global confirm dialog */}
      <ConfirmDialog />
    </div>
  );
}

