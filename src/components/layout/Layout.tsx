import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';

const Layout = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <Outlet />
      </main>
      <footer className="bg-gray-800 text-white py-8 mt-16">
        <div className="container mx-auto px-4 text-center">
          <p>&copy; 2024 ShopHub. All rights reserved.</p>
          <p className="text-sm text-gray-400 mt-2">
            Test Credentials: test@example.com / password123
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
