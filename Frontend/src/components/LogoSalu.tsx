interface LogoSaluProps {
  size?: number;
  className?: string;
}

export function LogoSalu({ size = 56, className = '' }: LogoSaluProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Logo Salú"
    >
      {/* ── Moldura oval externa – bronze/dourado ── */}
      <ellipse cx="100" cy="98" rx="80" ry="68" fill="none" stroke="url(#bronzeStroke)" strokeWidth="7" />
      <ellipse cx="100" cy="98" rx="73" ry="61" fill="none" stroke="url(#bronzeInner)" strokeWidth="2.5" />

      {/* ── Céu azul claro ── */}
      <clipPath id="ovalClip">
        <ellipse cx="100" cy="98" rx="72" ry="60" />
      </clipPath>
      <ellipse cx="100" cy="98" rx="72" ry="60" fill="#E8F4FA" />

      {/* ── Arco azul claro (céu curvo) ── */}
      <g clipPath="url(#ovalClip)">
        <path d="M 40 95 Q 100 40 160 95" stroke="#7EC8E3" strokeWidth="6" fill="none" strokeLinecap="round" />

        {/* ── Campo verde (plantação) ── */}
        <rect x="28" y="108" width="144" height="50" fill="#4C9140" />
        {/* Sulcos da plantação */}
        <path d="M28 115 Q 100 110 172 115" stroke="#3A7A32" strokeWidth="1.5" fill="none" />
        <path d="M28 122 Q 100 117 172 122" stroke="#3A7A32" strokeWidth="1.5" fill="none" />
        <path d="M28 129 Q 100 124 172 129" stroke="#3A7A32" strokeWidth="1.5" fill="none" />
        <path d="M28 136 Q 100 131 172 136" stroke="#3A7A32" strokeWidth="1.5" fill="none" />
        <path d="M28 143 Q 100 138 172 143" stroke="#3A7A32" strokeWidth="1.5" fill="none" />
        {/* Terra/solo */}
        <rect x="28" y="145" width="144" height="13" fill="#A0784A" />

        {/* ── Montanhas ── */}
        <polygon points="90,68 115,108 65,108" fill="#8B7355" />
        <polygon points="110,60 140,108 80,108" fill="#9E8865" />
        {/* Neve nas pontas */}
        <polygon points="90,68 97,80 83,80" fill="#D4C5A9" />
        <polygon points="110,60 118,74 102,74" fill="#D4C5A9" />

        {/* ── Celeiro vermelho ── */}
        <rect x="38" y="84" width="28" height="26" fill="#C0392B" />
        <polygon points="38,84 66,84 52,72" fill="#A93226" />
        {/* Porta do celeiro */}
        <rect x="47" y="96" width="10" height="14" fill="#7B241C" rx="1" />
        {/* Janela */}
        <rect x="40" y="88" width="8" height="6" fill="#A93226" rx="1" />
        <rect x="56" y="88" width="8" height="6" fill="#A93226" rx="1" />
      </g>

      {/* ── Espigas de trigo (direita, fora do oval) ── */}
      {/* Haste principal */}
      <line x1="162" y1="155" x2="162" y2="55" stroke="#C8A256" strokeWidth="2.5" />
      <line x1="168" y1="155" x2="168" y2="58" stroke="#C8A256" strokeWidth="2.5" />
      <line x1="155" y1="155" x2="155" y2="60" stroke="#C8A256" strokeWidth="2.5" />
      {/* Grãos */}
      {[55,65,75,85,95,105,115].map((y, i) => (
        <g key={i}>
          <ellipse cx="162" cy={y} rx="5" ry="3.5" fill="#D4A843" transform={`rotate(-20, 162, ${y})`} />
          <ellipse cx="156" cy={y+4} rx="5" ry="3.5" fill="#C49A38" transform={`rotate(20, 156, ${y+4})`} />
          <ellipse cx="168" cy={y+4} rx="5" ry="3.5" fill="#C49A38" transform={`rotate(-20, 168, ${y+4})`} />
        </g>
      ))}
      {[58,70,82,94,106].map((y, i) => (
        <g key={i}>
          <ellipse cx="168" cy={y} rx="5" ry="3.5" fill="#D4A843" transform={`rotate(-15, 168, ${y})`} />
          <ellipse cx="155" cy={y+5} rx="5" ry="3.5" fill="#C49A38" transform={`rotate(15, 155, ${y+5})`} />
        </g>
      ))}

      {/* ── Fita dourada / banner ── */}
      <path
        d="M 22 138 L 30 148 L 170 148 L 178 138 L 170 128 L 30 128 Z"
        fill="url(#ribbonGrad)"
      />
      {/* Dobras laterais da fita */}
      <path d="M 22 138 L 30 128 L 30 148 Z" fill="#8B6520" />
      <path d="M 178 138 L 170 128 L 170 148 Z" fill="#8B6520" />

      {/* ── Texto SALÚ na fita ── */}
      <text
        x="100"
        y="144"
        textAnchor="middle"
        fontFamily="Georgia, 'Times New Roman', serif"
        fontWeight="900"
        fontSize="18"
        fill="#1A2B3C"
        letterSpacing="3"
      >
        SALÚ
      </text>

      {/* ── Gradientes ── */}
      <defs>
        <linearGradient id="bronzeStroke" x1="20" y1="30" x2="180" y2="170" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#E8C56A" />
          <stop offset="40%" stopColor="#C8952A" />
          <stop offset="70%" stopColor="#A8751A" />
          <stop offset="100%" stopColor="#D4A843" />
        </linearGradient>
        <linearGradient id="bronzeInner" x1="20" y1="30" x2="180" y2="170" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#F0D080" />
          <stop offset="50%" stopColor="#B8821E" />
          <stop offset="100%" stopColor="#E8C56A" />
        </linearGradient>
        <linearGradient id="ribbonGrad" x1="22" y1="138" x2="178" y2="138" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#A07828" />
          <stop offset="25%" stopColor="#D4A843" />
          <stop offset="50%" stopColor="#E8C56A" />
          <stop offset="75%" stopColor="#C8952A" />
          <stop offset="100%" stopColor="#A07828" />
        </linearGradient>
      </defs>
    </svg>
  );
}
