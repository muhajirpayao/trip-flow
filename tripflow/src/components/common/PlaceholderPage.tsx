import { useNavigate } from 'react-router-dom';


interface Props {
  icon: string;
  title: string;
  description: string;
  accent: string;
}

export default function PlaceholderPage({ icon, title, description, accent }: Props) {
  const navigate = useNavigate();
  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center px-8 text-center">
      <div className="text-7xl mb-6">{icon}</div>
      <div className={`inline-flex items-center gap-2 text-xs font-bold px-4 py-2 rounded-full mb-4 ${accent}`}>
        🔨 Coming in next release
      </div>
      <h2 className="text-2xl font-black text-slate-900 mb-3">{title}</h2>
      <p className="text-slate-500 text-sm leading-relaxed mb-8 max-w-[260px]">{description}</p>
      <button onClick={() => navigate('/dashboard')}
        className="px-6 py-3 rounded-full gradient-primary text-white font-bold text-sm shadow-hero hover:opacity-90">
        Back to dashboard
      </button>
    </div>
  );
}
