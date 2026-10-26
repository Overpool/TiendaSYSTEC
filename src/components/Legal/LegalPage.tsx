import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { POLICIES } from '../../../shared/business';

export const LegalPage = ({ title, children }: { title: string; children: ReactNode }) => (
    <article className="max-w-3xl mx-auto">
        <Link to="/" className="inline-flex items-center gap-2 text-gray-500 hover:text-red-600 transition-colors mb-4">
            <ArrowLeft size={20} />
            <span className="font-medium">Volver a la tienda</span>
        </Link>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-10">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">{title}</h1>
            <p className="text-sm text-gray-400 mt-1 mb-8">Última actualización: {POLICIES.lastUpdated}</p>
            <div className="space-y-8 text-gray-700 leading-relaxed text-sm md:text-base">{children}</div>
        </div>
    </article>
);

export const Section = ({ title, children }: { title: string; children: ReactNode }) => (
    <section className="space-y-3">
        <h2 className="text-lg font-bold text-gray-900">{title}</h2>
        {children}
    </section>
);

export const List = ({ items }: { items: ReactNode[] }) => (
    <ul className="list-disc pl-6 space-y-1">
        {items.map((item, i) => <li key={i}>{item}</li>)}
    </ul>
);
