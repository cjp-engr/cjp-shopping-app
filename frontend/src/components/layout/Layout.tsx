import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';

const Layout = () => {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-8 max-w-7xl">
        <Outlet />
      </main>
      <footer className="bg-gray-900 text-white mt-16">
        <div className="container mx-auto px-4 max-w-7xl py-10">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <p className="text-lg font-bold text-white mb-1">TokoMart</p>
              <p className="text-sm text-gray-400">Quality products at unbeatable prices.</p>
            </div>
            <div className="text-sm text-gray-500">
              &copy; {new Date().getFullYear()} TokoMart. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
