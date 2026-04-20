'use client';

import { Activity, LayoutDashboard, FileSpreadsheet, Users, Package } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Sidebar() {
  const pathname = usePathname();

  const navItems = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Reportes', href: '/reportes', icon: FileSpreadsheet },
    { name: 'Cajeros', href: '/cajeros', icon: Users },
    { name: 'Productos', href: '/productos', icon: Package },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <Activity size={28} />
        <span>Dispropago</span>
      </div>

      <nav className="nav-links">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link 
              key={item.name} 
              href={item.href}
              className={`nav-item ${isActive ? 'active' : ''}`}
            >
              <Icon size={20} />
              {item.name}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
