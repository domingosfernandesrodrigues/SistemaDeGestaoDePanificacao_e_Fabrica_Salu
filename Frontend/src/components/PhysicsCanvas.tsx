import { useEffect, useRef, useState } from 'react';

interface DataNode {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  pulseAngle: number;
  pulseSpeed: number;
}

export function PhysicsCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  // Estado interativo do mouse
  const mouseRef = useRef({
    x: 0,
    y: 0,
    active: false,
    radius: 200, // Raio de conexão e magnetismo do mouse
  });

  const nodesRef = useRef<DataNode[]>([]);

  useEffect(() => {
    // Detectar prefers-reduced-motion do usuário
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);
    const listener = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', listener);
    return () => mediaQuery.removeEventListener('change', listener);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = 0;
    let height = 0;

    // Paleta futurista Salú (Sem roxo, tons quentes digitais)
    const colors = [
      '#F49255', // Ember Light (Brilho suave)
      '#D4860B', // Gold (Dados de valor)
      '#E0621A', // Ember (Rotas ativas)
    ];

    // Inicialização dos nós da rede digital
    const initNodes = (w: number, h: number) => {
      // Quantidade ideal de nós baseada no tamanho da tela (entre 35 e 65)
      const count = Math.min(60, Math.floor((w * h) / 16000));
      const nodes: DataNode[] = [];

      for (let i = 0; i < count; i++) {
        nodes.push({
          x: Math.random() * w,
          y: Math.random() * h,
          // Velocidade linear lenta, suave e sem gravidade (confortável para a visão)
          vx: (Math.random() - 0.5) * 0.5, 
          vy: (Math.random() - 0.5) * 0.5,
          radius: 1.5 + Math.random() * 2.5, // 1.5px a 4px (super minimalista)
          color: colors[i % colors.length],
          pulseAngle: Math.random() * Math.PI * 2,
          pulseSpeed: 0.02 + Math.random() * 0.03, // Frequência da pulsação orgânica
        });
      }
      nodesRef.current = nodes;
    };

    const handleResize = () => {
      const rect = containerRef.current?.getBoundingClientRect();
      width = rect?.width || window.innerWidth;
      height = rect?.height || 560;

      // Resolução Retina / High-DPI nítida
      const dpr = window.devicePixelRatio || 1;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.scale(dpr, dpr);

      // Reinicializa malha se vazia
      if (nodesRef.current.length === 0) {
        initNodes(width, height);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    const updateAndDraw = () => {
      ctx.clearRect(0, 0, width, height);

      const nodes = nodesRef.current;
      const mouse = mouseRef.current;
      const maxConnectDistance = 115; // Distância máxima para linhas se conectarem

      // 1. Atualizar Física (Deriva linear ultra-suave)
      if (!prefersReducedMotion) {
        nodes.forEach((node) => {
          node.x += node.vx;
          node.y += node.vy;

          // Magnetismo sutil do cursor (atração de mola fluida e sem solavancos)
          if (mouse.active) {
            const dx = mouse.x - node.x;
            const dy = mouse.y - node.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < mouse.radius) {
              const force = (mouse.radius - dist) / mouse.radius;
              // Deslocamento sutil proporcional
              node.x += (dx / dist) * force * 0.38;
              node.y += (dy / dist) * force * 0.38;
            }
          }

          // Rebote suave e lento nas bordas do Hero
          if (node.x < 0) {
            node.x = 0;
            node.vx *= -1;
          } else if (node.x > width) {
            node.x = width;
            node.vx *= -1;
          }

          if (node.y < 0) {
            node.y = 0;
            node.vy *= -1;
          } else if (node.y > height) {
            node.y = height;
            node.vy *= -1;
          }
        });
      }

      // 2. Efeito de Brilho de Fundo do Mouse (Halo de Luz)
      if (mouse.active) {
        ctx.save();
        const gradientGlow = ctx.createRadialGradient(
          mouse.x, mouse.y, 0,
          mouse.x, mouse.y, mouse.radius
        );
        gradientGlow.addColorStop(0, 'rgba(212, 134, 11, 0.055)'); // Halo dourado super sutil
        gradientGlow.addColorStop(1, 'rgba(212, 134, 11, 0)');
        ctx.fillStyle = gradientGlow;
        ctx.beginPath();
        ctx.arc(mouse.x, mouse.y, mouse.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // 3. Desenhar Conexões da Constelação Digital (Malha Geométrica)
      ctx.save();
      ctx.lineWidth = 0.85;

      for (let i = 0; i < nodes.length; i++) {
        const n1 = nodes[i];

        // Conectar nós entre si
        for (let j = i + 1; j < nodes.length; j++) {
          const n2 = nodes[j];
          const dx = n2.x - n1.x;
          const dy = n2.y - n1.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < maxConnectDistance) {
            // Opacidade baseada na distância para fade in/out perfeito
            const alpha = (maxConnectDistance - dist) / maxConnectDistance * 0.14;
            ctx.strokeStyle = `rgba(244, 146, 85, ${alpha})`; // Conector Ember light
            ctx.beginPath();
            ctx.moveTo(n1.x, n1.y);
            ctx.lineTo(n2.x, n2.y);
            ctx.stroke();
          }
        }

        // Conectar cursor do mouse aos nós próximos de forma ativa
        if (mouse.active) {
          const dx = mouse.x - n1.x;
          const dy = mouse.y - n1.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < mouse.radius * 0.85) {
            const alpha = (mouse.radius * 0.85 - dist) / (mouse.radius * 0.85) * 0.26;
            
            // Degradê elegante do conector ativo: ouro (mouse) para laranja (nó)
            const gradientLine = ctx.createLinearGradient(mouse.x, mouse.y, n1.x, n1.y);
            gradientLine.addColorStop(0, `rgba(212, 134, 11, ${alpha})`); // Gold
            gradientLine.addColorStop(1, `rgba(244, 146, 85, ${alpha * 0.3})`); // Ember light
            
            ctx.strokeStyle = gradientLine;
            ctx.lineWidth = 1.1;
            ctx.beginPath();
            ctx.moveTo(mouse.x, mouse.y);
            ctx.lineTo(n1.x, n1.y);
            ctx.stroke();
          }
        }
      }
      ctx.restore();

      // 4. Desenhar Nós Digitais (Data Nodes)
      nodes.forEach((node) => {
        ctx.save();

        // Respiração orbital orgânica de pulsação nos nós
        node.pulseAngle += node.pulseSpeed;
        const currentRadius = node.radius + Math.sin(node.pulseAngle) * 0.7;

        // Efeito de brilho de ponto (Glow)
        ctx.shadowColor = node.color;
        ctx.shadowBlur = 8;
        
        ctx.fillStyle = node.color;
        ctx.beginPath();
        ctx.arc(node.x, node.y, currentRadius, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      });
    };

    const renderLoop = () => {
      updateAndDraw();
      animationFrameId = requestAnimationFrame(renderLoop);
    };

    renderLoop();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
    };
  }, [prefersReducedMotion]);

  // Manipulação dos Eventos de Movimentação do Cursor
  const handleMouseMove = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouse = mouseRef.current;
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
    mouse.active = true;
  };

  const handleMouseLeave = () => {
    mouseRef.current.active = false;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas || e.touches.length === 0) return;
    const rect = canvas.getBoundingClientRect();
    const mouse = mouseRef.current;
    mouse.x = e.touches[0].clientX - rect.left;
    mouse.y = e.touches[0].clientY - rect.top;
    mouse.active = true;
  };

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 w-full h-full select-none overflow-hidden touch-none"
    >
      <canvas
        ref={canvasRef}
        className="block opacity-75 mix-blend-screen transition-opacity duration-700 hover:opacity-90"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleMouseLeave}
      />
    </div>
  );
}
