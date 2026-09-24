import { ImageResponse } from 'next/og';

export const alt = 'ARC Watch — Ecosystem Intelligence';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          position: 'relative',
          overflow: 'hidden',
          color: '#eef0eb',
          background: 'linear-gradient(120deg, #0d0f12 0%, #111712 58%, #172016 100%)',
          fontFamily: 'Arial, sans-serif',
        }}
      >
        <div style={{ position: 'absolute', width: 570, height: 570, borderRadius: 285, right: -120, top: -220, background: 'rgba(194,249,112,0.08)' }} />
        <div style={{ position: 'absolute', width: 440, height: 440, borderRadius: 220, right: 40, bottom: -310, border: '1px solid rgba(194,249,112,0.13)' }} />
        <div style={{ position: 'absolute', left: 58, right: 58, top: 54, bottom: 54, border: '1px solid rgba(255,255,255,0.08)', borderRadius: 24 }} />

        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', width: '100%', padding: '86px 90px', position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 42, height: 42, borderRadius: 12, background: '#c2f970', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: 19, height: 19, borderRadius: 12, border: '3px solid #11140c', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: 5, height: 5, borderRadius: 5, background: '#11140c' }} />
              </div>
            </div>
            <div style={{ display: 'flex', fontSize: 24, fontWeight: 700, letterSpacing: -0.8 }}>ARC <span style={{ color: '#9da39d', fontWeight: 400, marginLeft: 6 }}>WATCH</span></div>
            <div style={{ marginLeft: 12, color: '#c2f970', border: '1px solid rgba(194,249,112,0.35)', borderRadius: 20, padding: '6px 11px', fontSize: 11, letterSpacing: 1.4 }}>ECOSYSTEM INTELLIGENCE</div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 36 }}>
            <div style={{ display: 'flex', flexDirection: 'column', width: 505 }}>
              <div style={{ color: '#c2f970', fontSize: 15, letterSpacing: 3, marginBottom: 18 }}>THE ARC ECOSYSTEM, IN FOCUS</div>
              <div style={{ fontSize: 66, lineHeight: 1.02, fontWeight: 700, letterSpacing: -3 }}>Track the</div>
              <div style={{ fontSize: 66, lineHeight: 1.02, fontWeight: 700, letterSpacing: -3, color: '#c2f970' }}>ARC ecosystem.</div>
              <div style={{ color: '#a0a89f', fontSize: 19, lineHeight: 1.5, marginTop: 22 }}>Projects · Launchpad fees · On-chain activity</div>
            </div>

            <div style={{ width: 360, height: 250, display: 'flex', flexDirection: 'column', border: '1px solid #303a31', borderRadius: 16, background: 'rgba(16,20,17,0.92)', padding: 19, boxShadow: '0 20px 70px rgba(0,0,0,0.32)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ color: '#9da79a', fontSize: 11, letterSpacing: 1.5 }}>NETWORK SNAPSHOT</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, color: '#c2f970', fontSize: 10 }}><div style={{ width: 7, height: 7, borderRadius: 7, background: '#c2f970' }} /> LIVE</div>
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 17 }}>
                {[
                  { label: 'TVL', value: 'ARC' },
                  { label: 'DAILY FEES', value: 'LIVE' },
                  { label: 'PROJECTS', value: 'ECOSYSTEM' },
                ].map((metric) => (
                  <div key={metric.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10, padding: '12px 10px', borderRadius: 9, background: '#171d18', border: '1px solid #252e25' }}>
                    <div style={{ color: '#899386', fontSize: 9, letterSpacing: 0.7 }}>{metric.label}</div>
                    <div style={{ color: '#edf1e9', fontSize: metric.value === 'ECOSYSTEM' ? 11 : 17, fontWeight: 600 }}>{metric.value}</div>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', flex: 1, alignItems: 'flex-end', padding: '18px 2px 4px' }}>
                <svg width="315" height="76" viewBox="0 0 315 76" fill="none">
                  <path d="M2 62 C27 56 31 63 54 48 S82 54 104 38 S133 50 154 31 S181 42 203 27 S230 35 250 15 S280 23 313 4" stroke="#c2f970" strokeWidth="3" strokeLinecap="round" />
                  <path d="M2 62 C27 56 31 63 54 48 S82 54 104 38 S133 50 154 31 S181 42 203 27 S230 35 250 15 S280 23 313 4 V76 H2 Z" fill="url(#fill)" />
                  <defs><linearGradient id="fill" x1="157" y1="4" x2="157" y2="76" gradientUnits="userSpaceOnUse"><stop stopColor="#c2f970" stopOpacity="0.22" /><stop offset="1" stopColor="#c2f970" stopOpacity="0" /></linearGradient></defs>
                </svg>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#657064', fontSize: 9, letterSpacing: 0.6 }}><span>ECOSYSTEM MOMENTUM</span><span>ON-CHAIN DATA</span></div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#687268', fontSize: 11, letterSpacing: 1.2 }}>
            <span>BUILT FOR THE ARC COMMUNITY</span>
            <span style={{ color: '#a5b197' }}>arc-hunter-lake.vercel.app</span>
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
