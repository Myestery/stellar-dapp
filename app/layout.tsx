import "./globals.css";

import { Inter } from "next/font/google";
import type { Metadata } from "next";
import React from "react";


export const metadata: Metadata = {
  title: "Stellar Payment DApp",
  description: "Payment DApp built on Stellar",
};

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <html lang='en'>
      <body>
        <div className='min-h-screen bg-gray-100'>
          <header className='bg-white shadow'>
            <div className='max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8'>
              <h1 className='text-3xl font-bold text-gray-900'>Stellar Dapp</h1>
            </div>
          </header>
          <main>
            <div className='max-w-7xl mx-auto py-6 sm:px-6 lg:px-8'>
              <div className='px-4 py-6 sm:px-0'>
                <div className='border-4 border-dashed border-gray-200 rounded-lg h-96'>
                  {children}
                </div>
              </div>
            </div>
          </main>
        </div>
      </body>
    </html>
  );
};

export default Layout;
