import Image from 'next/image';
import providers from '@/assets/providers/manifest.json';
import { publicAssetUrl } from '@/lib/public-assets';

export default function ProviderGrid() {
  return (
    <section className="site-shell provider-section" aria-labelledby="provider-heading">
      <div>
        <h2 id="provider-heading" className="eyebrow">Planned service integrations</h2>
        <p className="mt-3 text-sm leading-[1.6] text-muted-foreground">Payment, delivery and insurance services are being configured. These provider references do not represent active partnerships.</p>
      </div>
      <ul className="provider-grid">
        {providers.map(provider => (
          <li key={provider.key}>
            <Image
              src={publicAssetUrl(process.env.NEXT_PUBLIC_SUPABASE_URL || '', provider.path)}
              alt={provider.name}
              width={140}
              height={32}
              className={`provider-logo provider-logo-${provider.key}`}
              unoptimized={provider.path.endsWith('.svg')}
            />
            <span className="font-mono text-[11.5px] leading-tight text-muted-foreground">{provider.role}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
