'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useApp } from '@/components/AppProvider';
import { Icon, type IconName } from '@/components/Icon';
import { PageHeader } from '@/components/ui';

export default function More() {
  const { profile, repo, setProfile } = useApp();
  const router = useRouter();
  const items: [string, string, IconName, boolean][] = [
    ['/reportes', 'Reportes', 'file', true], ['/guia', 'Guía clínica y fotográfica', 'info', true],
    ['/admin', 'Administración', 'settings', profile?.role === 'admin'],
  ];
  return (
    <div>
      <PageHeader title="Más opciones" subtitle={`${profile?.full_name} · ${profile?.role}`} />
      <ul className="space-y-2">
        {items.filter((i) => i[3]).map(([href, label, icon]) => (
          <li key={href}><Link href={href} className="card flex min-h-[60px] items-center gap-3 p-4 font-semibold"><Icon name={icon} />{label}<span className="flex-1" /><Icon name="chevron" /></Link></li>
        ))}
        <li><button className="card flex min-h-[60px] w-full items-center gap-3 p-4 font-semibold text-red-800 dark:text-red-300" onClick={async () => { await repo.signOut(); try { sessionStorage.clear(); } catch { /* noop */ } setProfile(null); router.replace('/login'); }}><Icon name="logout" />Cerrar sesión</button></li>
      </ul>
    </div>
  );
}
