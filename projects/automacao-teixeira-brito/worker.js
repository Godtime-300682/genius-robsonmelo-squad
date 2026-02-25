const HTML = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Automação Inteligente - Teixeira Brito Advocacia</title>
    <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>⚖️</text></svg>">
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');
        *{margin:0;padding:0;box-sizing:border-box}
        :root{--primary:#0f172a;--secondary:#1e293b;--accent:#3b82f6;--accent2:#8b5cf6;--gold:#f59e0b;--emerald:#10b981;--rose:#f43f5e;--text:#f1f5f9;--muted:#94a3b8;--card:rgba(30,41,59,0.7)}
        body{font-family:'Inter',-apple-system,BlinkMacSystemFont,sans-serif;background:var(--primary);color:var(--text);overflow:hidden;height:100vh;width:100vw}
        .presentation{width:100vw;height:100vh;position:relative;overflow:hidden}
        .slide{position:absolute;top:0;left:0;width:100%;height:100%;display:flex;flex-direction:column;justify-content:center;align-items:center;padding:50px 70px 70px;opacity:0;transform:translateX(100px);transition:all .6s cubic-bezier(.16,1,.3,1);pointer-events:none}
        .slide.active{opacity:1;transform:translateX(0);pointer-events:all}
        .slide.exit{opacity:0;transform:translateX(-100px)}
        .bg-1{background:linear-gradient(135deg,#0f172a 0%,#1e1b4b 50%,#0f172a 100%)}
        .bg-2{background:linear-gradient(135deg,#0f172a 0%,#022c22 50%,#0f172a 100%)}
        .bg-3{background:linear-gradient(135deg,#0f172a 0%,#4a1d2e 50%,#0f172a 100%)}
        .bg-4{background:linear-gradient(135deg,#0f172a 0%,#1e3a5f 50%,#0f172a 100%)}
        .bg-5{background:linear-gradient(135deg,#0f172a 0%,#1a1a2e 50%,#0f172a 100%)}
        .particles{position:absolute;top:0;left:0;width:100%;height:100%;overflow:hidden;z-index:0}
        .particle{position:absolute;width:4px;height:4px;background:rgba(59,130,246,.3);border-radius:50%;animation:float linear infinite}
        @keyframes float{0%{transform:translateY(100vh) rotate(0);opacity:0}10%{opacity:1}90%{opacity:1}100%{transform:translateY(-10vh) rotate(720deg);opacity:0}}
        .sc{position:relative;z-index:1;width:100%;max-width:1200px}
        .sn{position:absolute;top:30px;right:40px;font-size:14px;color:var(--muted);font-weight:500;z-index:10}
        .badge{display:inline-flex;align-items:center;gap:8px;padding:8px 20px;background:rgba(59,130,246,.15);border:1px solid rgba(59,130,246,.3);border-radius:50px;font-size:13px;font-weight:500;color:var(--accent);margin-bottom:24px;letter-spacing:1px;text-transform:uppercase}
        h1{font-size:52px;font-weight:800;line-height:1.1;margin-bottom:20px;letter-spacing:-1px}
        h2{font-size:40px;font-weight:700;line-height:1.15;margin-bottom:16px;letter-spacing:-.5px}
        h3{font-size:22px;font-weight:600;margin-bottom:12px}
        .sub{font-size:20px;color:var(--muted);font-weight:300;line-height:1.5;max-width:700px}
        .hl{color:var(--accent)}.hlg{color:var(--gold)}.hle{color:var(--emerald)}.hlr{color:var(--rose)}
        .gt{background:linear-gradient(135deg,#3b82f6,#8b5cf6,#ec4899);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
        .g2{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-top:28px}
        .g3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:20px;margin-top:28px}
        .g4{display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:16px;margin-top:28px}
        .cd{background:var(--card);backdrop-filter:blur(20px);border:1px solid rgba(255,255,255,.08);border-radius:16px;padding:24px;transition:transform .3s,box-shadow .3s}
        .cd:hover{transform:translateY(-4px);box-shadow:0 20px 40px rgba(0,0,0,.3)}
        .ci{font-size:32px;margin-bottom:12px;display:block}
        .cd h3{font-size:17px;font-weight:600;margin-bottom:6px}
        .cd p{font-size:13px;color:var(--muted);line-height:1.5}
        .sr{display:flex;gap:40px;margin-top:36px;flex-wrap:wrap}
        .st{text-align:center}
        .sv{font-size:48px;font-weight:800;line-height:1;margin-bottom:6px}
        .sl{font-size:13px;color:var(--muted);font-weight:500;text-transform:uppercase;letter-spacing:1px}
        .ba{display:flex;gap:28px;margin-top:28px;width:100%}
        .bc{flex:1;border-radius:16px;padding:28px}
        .bb{background:rgba(244,63,94,.1);border:1px solid rgba(244,63,94,.2)}
        .ba2{background:rgba(16,185,129,.1);border:1px solid rgba(16,185,129,.2)}
        .bi{display:flex;align-items:flex-start;gap:10px;margin-bottom:14px;font-size:14px;line-height:1.5}
        .bi .ic{font-size:16px;flex-shrink:0;margin-top:2px}

        /* Pricing */
        .pc{display:grid;grid-template-columns:1fr 1.15fr 1fr;gap:18px;margin-top:24px;align-items:start}
        .pp{background:var(--card);border:1px solid rgba(255,255,255,.08);border-radius:20px;padding:28px 24px;text-align:center;position:relative;transition:transform .3s}
        .pp:hover{transform:translateY(-4px)}
        .pp.ft{border:2px solid var(--accent);background:linear-gradient(180deg,rgba(59,130,246,.12) 0%,var(--card) 100%);transform:scale(1.02)}
        .pp.ft:hover{transform:scale(1.02) translateY(-4px)}
        .pb{position:absolute;top:-14px;left:50%;transform:translateX(-50%);background:linear-gradient(135deg,var(--accent),var(--accent2));padding:6px 24px;border-radius:50px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px;white-space:nowrap}
        .pn{font-size:18px;font-weight:700;margin-bottom:3px;margin-top:6px}
        .pm{font-size:12px;color:var(--muted);margin-bottom:16px}
        .pv{font-size:36px;font-weight:800;margin-bottom:2px}
        .pd{font-size:13px;color:var(--muted);margin-bottom:6px}
        .py{font-size:16px;font-weight:600;color:var(--accent);margin-bottom:16px}
        .pf{text-align:left;list-style:none}
        .pf li{padding:6px 0;font-size:13px;color:var(--muted);display:flex;align-items:center;gap:8px;border-bottom:1px solid rgba(255,255,255,.04)}
        .pf .ck{color:var(--emerald);font-weight:bold}
        .pr{margin-top:16px;padding:10px;background:rgba(16,185,129,.1);border-radius:10px;font-size:13px;font-weight:600;color:var(--emerald)}

        /* Timeline */
        .tl{margin-top:28px;width:100%}
        .ti{display:flex;align-items:flex-start;gap:18px;margin-bottom:18px}
        .td{width:44px;height:44px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:15px;flex-shrink:0;border:2px solid}
        .tc h4{font-size:16px;font-weight:600;margin-bottom:3px}
        .tc p{font-size:13px;color:var(--muted);line-height:1.4}
        .tg{display:inline-block;padding:3px 10px;border-radius:4px;font-size:11px;font-weight:600;margin-top:5px}

        /* Flow */
        .fl{display:flex;align-items:center;justify-content:center;gap:14px;margin-top:32px;flex-wrap:wrap}
        .fs{background:var(--card);border:1px solid rgba(255,255,255,.1);border-radius:12px;padding:14px 20px;text-align:center;min-width:120px}
        .fs .fi{font-size:26px;margin-bottom:6px}
        .fs .ft2{font-size:12px;font-weight:500}
        .fa{font-size:22px;color:var(--accent);animation:pulse 2s infinite}
        @keyframes pulse{0%,100%{opacity:.5}50%{opacity:1}}

        /* KANBAN DASHBOARD */
        .kanban{width:100%;margin-top:20px;overflow-x:auto}
        .kanban-board{display:flex;gap:12px;min-width:900px;padding-bottom:10px}
        .kanban-col{flex:1;min-width:150px;background:rgba(15,23,42,.6);border-radius:12px;border:1px solid rgba(255,255,255,.06);overflow:hidden}
        .kanban-header{padding:12px 14px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid rgba(255,255,255,.06)}
        .kanban-header .cnt{background:rgba(255,255,255,.1);padding:2px 8px;border-radius:10px;font-size:11px;font-weight:600}
        .kanban-cards{padding:8px;display:flex;flex-direction:column;gap:8px;min-height:60px}
        .k-card{background:rgba(30,41,59,.8);border:1px solid rgba(255,255,255,.08);border-radius:10px;padding:10px 12px;cursor:default;transition:all .3s;position:relative}
        .k-card:hover{border-color:rgba(59,130,246,.4);transform:translateY(-2px);box-shadow:0 8px 20px rgba(0,0,0,.3)}
        .k-card .k-name{font-size:12px;font-weight:600;margin-bottom:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .k-card .k-type{font-size:10px;color:var(--muted);margin-bottom:6px}
        .k-card .k-meta{display:flex;justify-content:space-between;align-items:center}
        .k-card .k-avatar{width:22px;height:22px;border-radius:50%;font-size:10px;display:flex;align-items:center;justify-content:center;font-weight:600}
        .k-card .k-date{font-size:10px;color:var(--muted)}
        .k-card .k-priority{position:absolute;top:0;right:0;width:6px;height:100%;border-radius:0 10px 10px 0}
        .k-card .k-bar{height:3px;border-radius:2px;margin-top:6px;background:rgba(255,255,255,.06);overflow:hidden}
        .k-card .k-bar-fill{height:100%;border-radius:2px;transition:width .5s}

        /* Pipeline visual */
        .pipeline{display:flex;align-items:center;margin-top:24px;width:100%;position:relative}
        .pipe-stage{flex:1;text-align:center;position:relative;padding:16px 8px}
        .pipe-icon{width:48px;height:48px;border-radius:50%;margin:0 auto 8px;display:flex;align-items:center;justify-content:center;font-size:22px;border:2px solid;transition:all .3s}
        .pipe-label{font-size:12px;font-weight:600;margin-bottom:3px}
        .pipe-count{font-size:20px;font-weight:800}
        .pipe-sub{font-size:10px;color:var(--muted)}
        .pipe-line{position:absolute;top:40px;left:50%;width:100%;height:2px;z-index:0}
        .pipe-stage:last-child .pipe-line{display:none}

        /* Stats mini cards */
        .mini-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-top:20px}
        .mini-stat{background:var(--card);border-radius:12px;padding:16px;text-align:center;border:1px solid rgba(255,255,255,.06)}
        .mini-stat .ms-val{font-size:28px;font-weight:800;margin-bottom:2px}
        .mini-stat .ms-lab{font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.5px}
        .mini-stat .ms-trend{font-size:11px;margin-top:4px;font-weight:600}

        /* Alert ticker */
        .ticker{background:rgba(245,158,11,.08);border:1px solid rgba(245,158,11,.2);border-radius:10px;padding:10px 16px;margin-top:16px;display:flex;align-items:center;gap:10px;font-size:13px;overflow:hidden}
        .ticker-dot{width:8px;height:8px;border-radius:50%;background:var(--gold);animation:blink 1s infinite}
        @keyframes blink{0%,100%{opacity:1}50%{opacity:.3}}

        /* CTA */
        .cta{background:linear-gradient(135deg,rgba(59,130,246,.15),rgba(139,92,246,.15));border:1px solid rgba(59,130,246,.3);border-radius:20px;padding:36px;text-align:center;margin-top:28px;width:100%}

        /* Nav */
        .nav-bar{position:fixed;bottom:0;left:0;width:100%;height:56px;background:rgba(15,23,42,.95);backdrop-filter:blur(20px);border-top:1px solid rgba(255,255,255,.08);display:flex;align-items:center;justify-content:space-between;padding:0 40px;z-index:100}
        .nav-progress{display:flex;gap:5px}
        .nav-dot{width:8px;height:8px;border-radius:50%;background:rgba(255,255,255,.15);cursor:pointer;transition:all .3s}
        .nav-dot.active{background:var(--accent);width:24px;border-radius:4px}
        .nav-dot.visited{background:rgba(59,130,246,.5)}
        .nav-buttons{display:flex;gap:10px}
        .nb{padding:8px 20px;border:none;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;transition:all .2s;font-family:'Inter',sans-serif}
        .nb.prev{background:rgba(255,255,255,.1);color:var(--text)}
        .nb.next{background:var(--accent);color:#fff}
        .nb:hover{transform:translateY(-2px)}
        .nb:disabled{opacity:.3;cursor:not-allowed;transform:none}
        .ni{font-size:12px;color:var(--muted)}
        .kh{position:fixed;bottom:66px;right:40px;font-size:11px;color:rgba(255,255,255,.2);z-index:99}
        .kh kbd{display:inline-block;padding:2px 6px;background:rgba(255,255,255,.1);border-radius:4px;margin:0 2px;font-family:monospace}

        /* Animations */
        .slide.active .a1{animation:fi .5s .1s ease both}
        .slide.active .a2{animation:fi .5s .2s ease both}
        .slide.active .a3{animation:fi .5s .3s ease both}
        .slide.active .a4{animation:fi .5s .4s ease both}
        .slide.active .a5{animation:fi .5s .5s ease both}
        .slide.active .a6{animation:fi .5s .6s ease both}
        .slide.active .a7{animation:fi .5s .7s ease both}
        @keyframes fi{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}

        @media(max-width:1024px){
            .slide{padding:30px}h1{font-size:36px}h2{font-size:30px}
            .g3,.g4{grid-template-columns:1fr 1fr}.pc{grid-template-columns:1fr}
            .ba{flex-direction:column}.sv{font-size:32px}
            .kanban-board{min-width:700px}.mini-stats{grid-template-columns:1fr 1fr}
        }
    </style>
</head>
<body>
<div class="presentation" id="presentation">

<!-- SLIDE 0: CAPA -->
<div class="slide bg-1 active" data-slide="0">
    <div class="particles" id="p0"></div>
    <div class="sc" style="text-align:center">
        <div class="a1 badge">⚖️ Proposta Exclusiva</div>
        <h1 class="a2">Seu Escritório<br><span class="gt">Funcionando 24/7</span><br>com Inteligência Artificial</h1>
        <p class="a3 sub" style="margin:20px auto;max-width:620px">Automação inteligente com Pipeline Visual e Dashboard em Tempo Real. Cada cliente, cada prazo, cada etapa — tudo visível, tudo controlado.</p>
        <div class="a4 sr" style="justify-content:center;margin-top:44px">
            <div class="st"><div class="sv hl">10</div><div class="sl">Setores Mapeados</div></div>
            <div class="st"><div class="sv hle">8</div><div class="sl">Módulos de IA</div></div>
            <div class="st"><div class="sv hlg">24/7</div><div class="sl">Funcionamento</div></div>
            <div class="st"><div class="sv" style="color:var(--accent2)">Real-Time</div><div class="sl">Dashboard Kanban</div></div>
        </div>
        <p class="a5" style="margin-top:44px;font-size:17px;color:var(--muted)">Preparado para <strong style="color:#fff">Teixeira Brito Advocacia</strong></p>
    </div>
</div>

<!-- SLIDE 1: DIAGNÓSTICO -->
<div class="slide bg-4" data-slide="1">
    <div class="sc">
        <div class="a1 badge">📋 Diagnóstico Completo</div>
        <h2 class="a2">Eu estudei <span class="hl">cada detalhe</span> do seu escritório</h2>
        <p class="a3 sub">Analisei seus 3 POPs, planilha de cargos, fluxos de trabalho e toda a operação.</p>
        <div class="g4 a4">
            <div class="cd"><span class="ci">👥</span><h3>10 Setores</h3><p>Comercial, Triagem, Controladoria, Iniciais, Prazos, Relacionamento, Extrajudicial, Holding, Cobrança, Financeiro</p></div>
            <div class="cd"><span class="ci">📋</span><h3>3 POPs Formais</h3><p>Triagem (9 passos), Prazos Judiciais (3 sub-procedimentos), Cargos e Setores (60+ tarefas)</p></div>
            <div class="cd"><span class="ci">💻</span><h3>5 Sistemas</h3><p>Astrea, Autentique, OneDrive, WhatsApp, Email — todos integráveis com IA</p></div>
            <div class="cd"><span class="ci">⭐</span><h3>Diferencial Raro</h3><p>90% dos escritórios NÃO têm POPs documentados. Vocês têm. Isso torna tudo mais viável.</p></div>
        </div>
    </div>
</div>

<!-- SLIDE 2: O PROBLEMA -->
<div class="slide bg-3" data-slide="2">
    <div class="sc">
        <div class="a1 badge" style="border-color:rgba(244,63,94,.3);background:rgba(244,63,94,.1);color:var(--rose)">⚠️ O Desafio Atual</div>
        <h2 class="a2">Sua equipe gasta <span class="hlr">40-60h/semana</span><br>em tarefas que a IA faz em segundos</h2>
        <div class="g3 a3">
            <div class="cd" style="border-left:3px solid var(--rose)"><span class="ci">⏰</span><h3>Triagem Manual</h3><p>2-4 horas por cliente: criar grupo, contrato, cobrar assinatura, pasta, cadastrar Astrea...</p></div>
            <div class="cd" style="border-left:3px solid var(--rose)"><span class="ci">👁️</span><h3>Zero Visibilidade</h3><p>Dr. Dayan NÃO sabe em tempo real onde está cada cliente, cada prazo, cada etapa. Precisa perguntar.</p></div>
            <div class="cd" style="border-left:3px solid var(--rose)"><span class="ci">🕐</span><h3>Atendimento Limitado</h3><p>Cliente manda mensagem às 22h? Só vai ser respondido amanhã. Perda de satisfação.</p></div>
            <div class="cd" style="border-left:3px solid var(--rose)"><span class="ci">⚡</span><h3>Risco de Prazos</h3><p>Controller lê TODAS as intimações manualmente. Um erro = prazo perdido = responsabilidade civil.</p></div>
            <div class="cd" style="border-left:3px solid var(--rose)"><span class="ci">📊</span><h3>Sem Dashboard</h3><p>Não existe um painel central onde ver: quantos clientes em triagem, quantos prazos vencendo, quanto pendente.</p></div>
            <div class="cd" style="border-left:3px solid var(--rose)"><span class="ci">💸</span><h3>Inadimplência</h3><p>Sem sistema automatizado de cobrança, boletos atrasam e o escritório perde receita todo mês.</p></div>
        </div>
    </div>
</div>

<!-- SLIDE 3: ANTES x DEPOIS -->
<div class="slide bg-2" data-slide="3">
    <div class="sc">
        <div class="a1 badge" style="border-color:rgba(16,185,129,.3);background:rgba(16,185,129,.1);color:var(--emerald)">🔄 A Transformação</div>
        <h2 class="a2">De manual e invisível para <span class="hle">automático e visível</span></h2>
        <div class="ba a3">
            <div class="bc bb">
                <h3 style="color:var(--rose)">❌ Hoje</h3>
                <div class="bi"><span class="ic">⏰</span> Triagem: <strong>2-4 horas</strong> por cliente</div>
                <div class="bi"><span class="ic">📱</span> Cobrança de docs: <strong>manual a cada 2 dias</strong></div>
                <div class="bi"><span class="ic">🕐</span> Atendimento: <strong>só horário comercial</strong></div>
                <div class="bi"><span class="ic">👁️</span> Prazos: <strong>depende do Controller</strong></div>
                <div class="bi"><span class="ic">📊</span> Gestão: <strong>sem visibilidade em tempo real</strong></div>
                <div class="bi"><span class="ic">🤷</span> Status dos clientes: <strong>precisa perguntar um a um</strong></div>
            </div>
            <div class="bc ba2">
                <h3 style="color:var(--emerald)">✅ Com IA + Dashboard</h3>
                <div class="bi"><span class="ic">⚡</span> Triagem: <strong>5 minutos</strong> (automático)</div>
                <div class="bi"><span class="ic">🤖</span> Cobrança: <strong>automática, sem esquecer</strong></div>
                <div class="bi"><span class="ic">🌙</span> Atendimento: <strong>24/7, resposta em 2 min</strong></div>
                <div class="bi"><span class="ic">🛡️</span> Prazos: <strong>IA monitora automaticamente</strong></div>
                <div class="bi"><span class="ic">📊</span> Gestão: <strong>Dashboard Kanban em tempo real</strong></div>
                <div class="bi"><span class="ic">🎯</span> Status: <strong>Pipeline visual — vê tudo num painel</strong></div>
            </div>
        </div>
    </div>
</div>

<!-- SLIDE 4: 8 MÓDULOS -->
<div class="slide bg-1" data-slide="4">
    <div class="sc">
        <div class="a1 badge">🧠 A Solução Completa</div>
        <h2 class="a2"><span class="gt">8 Módulos</span> de IA + Pipeline & Dashboard</h2>
        <div class="g4 a3">
            <div class="cd" style="border-top:3px solid #3b82f6"><span class="ci">📋</span><h3>1. Triagem Auto</h3><p>WhatsApp, contrato, Autentique, OneDrive, Astrea — tudo automático</p></div>
            <div class="cd" style="border-top:3px solid #f59e0b"><span class="ci">⏱️</span><h3>2. Prazos IA</h3><p>Monitora intimações, calcula PI/PF/PR, alerta advogados</p></div>
            <div class="cd" style="border-top:3px solid #10b981"><span class="ci">💬</span><h3>3. Atendimento 24/7</h3><p>Chatbot WhatsApp: dúvidas, andamento, documentos</p></div>
            <div class="cd" style="border-top:3px solid #8b5cf6"><span class="ci">💰</span><h3>4. Cobrança Auto</h3><p>Sequência por WhatsApp: D-3 a D+15</p></div>
            <div class="cd" style="border-top:3px solid #ec4899"><span class="ci">🎯</span><h3>5. Comercial IA</h3><p>Qualifica leads, agenda reunião, briefing</p></div>
            <div class="cd" style="border-top:3px solid #06b6d4"><span class="ci">📅</span><h3>6. Audiências</h3><p>Lembretes D-7, D-3, D-1 automáticos</p></div>
            <div class="cd" style="border-top:3px solid #f97316"><span class="ci">📄</span><h3>7. Docs com IA</h3><p>Contratos, procurações, e-mails em segundos</p></div>
            <div class="cd" style="border-top:3px solid #14b8a6;border:2px solid rgba(20,184,166,.4);background:rgba(20,184,166,.08)"><span class="ci">📊</span><h3 style="color:#14b8a6">8. Pipeline & Dashboard</h3><p><strong style="color:#fff">NOVO!</strong> Kanban em tempo real com status de cada cliente</p></div>
        </div>
    </div>
</div>

<!-- SLIDE 5: PIPELINE VISUAL -->
<div class="slide bg-5" data-slide="5">
    <div class="sc">
        <div class="a1 badge" style="border-color:rgba(20,184,166,.3);background:rgba(20,184,166,.1);color:#14b8a6">📊 Pipeline do Cliente</div>
        <h2 class="a2">Veja <span style="color:#14b8a6">cada cliente</span> se movendo pelo escritório</h2>
        <p class="a3 sub">Cada etapa do processo aparece visualmente. Dr. Dayan vê TUDO em um único painel.</p>

        <div class="pipeline a4">
            <div class="pipe-stage">
                <div class="pipe-line" style="background:linear-gradient(90deg,#ec4899,#f59e0b)"></div>
                <div class="pipe-icon" style="border-color:#ec4899;background:rgba(236,72,153,.15);color:#ec4899">🎯</div>
                <div class="pipe-label" style="color:#ec4899">Comercial</div>
                <div class="pipe-count">12</div>
                <div class="pipe-sub">leads ativos</div>
            </div>
            <div class="pipe-stage">
                <div class="pipe-line" style="background:linear-gradient(90deg,#f59e0b,#3b82f6)"></div>
                <div class="pipe-icon" style="border-color:#f59e0b;background:rgba(245,158,11,.15);color:#f59e0b">📋</div>
                <div class="pipe-label" style="color:#f59e0b">Triagem</div>
                <div class="pipe-count">8</div>
                <div class="pipe-sub">em onboarding</div>
            </div>
            <div class="pipe-stage">
                <div class="pipe-line" style="background:linear-gradient(90deg,#3b82f6,#8b5cf6)"></div>
                <div class="pipe-icon" style="border-color:#3b82f6;background:rgba(59,130,246,.15);color:#3b82f6">📝</div>
                <div class="pipe-label" style="color:#3b82f6">Iniciais</div>
                <div class="pipe-count">15</div>
                <div class="pipe-sub">petições</div>
            </div>
            <div class="pipe-stage">
                <div class="pipe-line" style="background:linear-gradient(90deg,#8b5cf6,#10b981)"></div>
                <div class="pipe-icon" style="border-color:#8b5cf6;background:rgba(139,92,246,.15);color:#8b5cf6">⚖️</div>
                <div class="pipe-label" style="color:#8b5cf6">Em Andamento</div>
                <div class="pipe-count">67</div>
                <div class="pipe-sub">processos ativos</div>
            </div>
            <div class="pipe-stage">
                <div class="pipe-line" style="background:linear-gradient(90deg,#10b981,#06b6d4)"></div>
                <div class="pipe-icon" style="border-color:#10b981;background:rgba(16,185,129,.15);color:#10b981">📅</div>
                <div class="pipe-label" style="color:#10b981">Audiência</div>
                <div class="pipe-count">5</div>
                <div class="pipe-sub">agendadas</div>
            </div>
            <div class="pipe-stage">
                <div class="pipe-icon" style="border-color:#06b6d4;background:rgba(6,182,212,.15);color:#06b6d4">✅</div>
                <div class="pipe-label" style="color:#06b6d4">Concluído</div>
                <div class="pipe-count">23</div>
                <div class="pipe-sub">este mês</div>
            </div>
        </div>

        <div class="mini-stats a5">
            <div class="mini-stat"><div class="ms-val hle">130</div><div class="ms-lab">Clientes Ativos</div><div class="ms-trend" style="color:var(--emerald)">↑ 12% mês</div></div>
            <div class="mini-stat"><div class="ms-val hlg">3</div><div class="ms-lab">Prazos Vencendo Hoje</div><div class="ms-trend" style="color:var(--gold)">⚡ Atenção</div></div>
            <div class="mini-stat"><div class="ms-val hl">97%</div><div class="ms-lab">Prazos em Dia</div><div class="ms-trend" style="color:var(--emerald)">↑ vs 89% antes</div></div>
            <div class="mini-stat"><div class="ms-val" style="color:var(--accent2)">R$85K</div><div class="ms-lab">Receita do Mês</div><div class="ms-trend" style="color:var(--emerald)">↑ 18% mês</div></div>
        </div>
    </div>
</div>

<!-- SLIDE 6: DASHBOARD KANBAN INTERATIVO -->
<div class="slide bg-4" data-slide="6">
    <div class="sc">
        <div class="a1 badge" style="border-color:rgba(20,184,166,.3);background:rgba(20,184,166,.1);color:#14b8a6">📋 Dashboard Kanban</div>
        <h2 class="a2" style="font-size:32px">Cada caso, cada etapa — <span style="color:#14b8a6">visível em tempo real</span></h2>

        <div class="ticker a3">
            <div class="ticker-dot"></div>
            <span>🔴 <strong>ALERTA:</strong> Prazo fatal amanhã — João Silva x Empresa ABC — Recurso de Apelação — Proc. 5001234</span>
        </div>

        <div class="kanban a4">
            <div class="kanban-board">
                <!-- TRIAGEM -->
                <div class="kanban-col">
                    <div class="kanban-header" style="color:#f59e0b;border-bottom-color:rgba(245,158,11,.3)">📋 Triagem <span class="cnt">3</span></div>
                    <div class="kanban-cards">
                        <div class="k-card"><div class="k-priority" style="background:#f59e0b"></div><div class="k-name">Maria Oliveira</div><div class="k-type">Trabalhista · Novo</div><div class="k-bar"><div class="k-bar-fill" style="width:30%;background:#f59e0b"></div></div><div class="k-meta"><div class="k-avatar" style="background:rgba(245,158,11,.2);color:#f59e0b">TB</div><div class="k-date">Aguardando docs</div></div></div>
                        <div class="k-card"><div class="k-priority" style="background:#10b981"></div><div class="k-name">Carlos Souza</div><div class="k-type">Cível · Contrato assinado</div><div class="k-bar"><div class="k-bar-fill" style="width:70%;background:#10b981"></div></div><div class="k-meta"><div class="k-avatar" style="background:rgba(16,185,129,.2);color:#10b981">TB</div><div class="k-date">Criando pasta</div></div></div>
                        <div class="k-card"><div class="k-priority" style="background:#3b82f6"></div><div class="k-name">Ana Santos</div><div class="k-type">Família · Procuração enviada</div><div class="k-bar"><div class="k-bar-fill" style="width:50%;background:#3b82f6"></div></div><div class="k-meta"><div class="k-avatar" style="background:rgba(59,130,246,.2);color:#3b82f6">TB</div><div class="k-date">Autentique</div></div></div>
                    </div>
                </div>
                <!-- INICIAIS -->
                <div class="kanban-col">
                    <div class="kanban-header" style="color:#3b82f6;border-bottom-color:rgba(59,130,246,.3)">📝 Iniciais <span class="cnt">2</span></div>
                    <div class="kanban-cards">
                        <div class="k-card"><div class="k-priority" style="background:#f43f5e"></div><div class="k-name">Pedro Lima</div><div class="k-type">Consumidor · PI em elaboração</div><div class="k-bar"><div class="k-bar-fill" style="width:60%;background:#3b82f6"></div></div><div class="k-meta"><div class="k-avatar" style="background:rgba(59,130,246,.2);color:#3b82f6">JM</div><div class="k-date">Joelma · D-3</div></div></div>
                        <div class="k-card"><div class="k-priority" style="background:#f59e0b"></div><div class="k-name">Lucia Ferreira</div><div class="k-type">Trabalhista · Revisão</div><div class="k-bar"><div class="k-bar-fill" style="width:85%;background:#10b981"></div></div><div class="k-meta"><div class="k-avatar" style="background:rgba(139,92,246,.2);color:#8b5cf6">AT</div><div class="k-date">Arthur revisando</div></div></div>
                    </div>
                </div>
                <!-- PRAZOS -->
                <div class="kanban-col">
                    <div class="kanban-header" style="color:#f43f5e;border-bottom-color:rgba(244,63,94,.3)">⏱️ Prazos <span class="cnt">4</span></div>
                    <div class="kanban-cards">
                        <div class="k-card" style="border-color:rgba(244,63,94,.4)"><div class="k-priority" style="background:#f43f5e"></div><div class="k-name">🔴 João Silva</div><div class="k-type">Recurso Apelação · PF AMANHÃ</div><div class="k-bar"><div class="k-bar-fill" style="width:95%;background:#f43f5e"></div></div><div class="k-meta"><div class="k-avatar" style="background:rgba(244,63,94,.2);color:#f43f5e">BR</div><div class="k-date">Bruna · URGENTE</div></div></div>
                        <div class="k-card"><div class="k-priority" style="background:#f59e0b"></div><div class="k-name">Roberto Alves</div><div class="k-type">Contestação · PR em D-4</div><div class="k-bar"><div class="k-bar-fill" style="width:40%;background:#f59e0b"></div></div><div class="k-meta"><div class="k-avatar" style="background:rgba(245,158,11,.2);color:#f59e0b">LR</div><div class="k-date">Lorrane</div></div></div>
                        <div class="k-card"><div class="k-priority" style="background:#10b981"></div><div class="k-name">Márcia Costa</div><div class="k-type">ED · Prazo em 8 dias</div><div class="k-bar"><div class="k-bar-fill" style="width:20%;background:#10b981"></div></div><div class="k-meta"><div class="k-avatar" style="background:rgba(16,185,129,.2);color:#10b981">LC</div><div class="k-date">Luciano</div></div></div>
                        <div class="k-card"><div class="k-priority" style="background:#3b82f6"></div><div class="k-name">Felipe Dias</div><div class="k-type">Recurso Ordinário · Início</div><div class="k-bar"><div class="k-bar-fill" style="width:10%;background:#3b82f6"></div></div><div class="k-meta"><div class="k-avatar" style="background:rgba(59,130,246,.2);color:#3b82f6">WV</div><div class="k-date">Weverton</div></div></div>
                    </div>
                </div>
                <!-- AUDIÊNCIAS -->
                <div class="kanban-col">
                    <div class="kanban-header" style="color:#8b5cf6;border-bottom-color:rgba(139,92,246,.3)">📅 Audiências <span class="cnt">2</span></div>
                    <div class="kanban-cards">
                        <div class="k-card"><div class="k-priority" style="background:#f59e0b"></div><div class="k-name">Teresa Ramos</div><div class="k-type">Conciliação · 28/02</div><div class="k-bar"><div class="k-bar-fill" style="width:80%;background:#f59e0b"></div></div><div class="k-meta"><div class="k-avatar" style="background:rgba(139,92,246,.2);color:#8b5cf6">LC</div><div class="k-date">D-3 · Alinhando</div></div></div>
                        <div class="k-card"><div class="k-priority" style="background:#10b981"></div><div class="k-name">José Mendes</div><div class="k-type">Instrução · 05/03</div><div class="k-bar"><div class="k-bar-fill" style="width:30%;background:#10b981"></div></div><div class="k-meta"><div class="k-avatar" style="background:rgba(16,185,129,.2);color:#10b981">BR</div><div class="k-date">D-7 · Lembrete</div></div></div>
                    </div>
                </div>
                <!-- RELACIONAMENTO -->
                <div class="kanban-col">
                    <div class="kanban-header" style="color:#10b981;border-bottom-color:rgba(16,185,129,.3)">💬 Relacionamento <span class="cnt">3</span></div>
                    <div class="kanban-cards">
                        <div class="k-card"><div class="k-priority" style="background:#10b981"></div><div class="k-name">Paula Vieira</div><div class="k-type">Aguardando pagamento guia</div><div class="k-bar"><div class="k-bar-fill" style="width:50%;background:#10b981"></div></div><div class="k-meta"><div class="k-avatar" style="background:rgba(16,185,129,.2);color:#10b981">LU</div><div class="k-date">Lucas · Boleto</div></div></div>
                        <div class="k-card"><div class="k-priority" style="background:#3b82f6"></div><div class="k-name">Marcos Lima</div><div class="k-type">Atualização processual enviada</div><div class="k-bar"><div class="k-bar-fill" style="width:100%;background:#3b82f6"></div></div><div class="k-meta"><div class="k-avatar" style="background:rgba(59,130,246,.2);color:#3b82f6">🤖</div><div class="k-date">IA · Automático</div></div></div>
                        <div class="k-card"><div class="k-priority" style="background:#8b5cf6"></div><div class="k-name">Clara Nunes</div><div class="k-type">Dúvida respondida via chatbot</div><div class="k-bar"><div class="k-bar-fill" style="width:100%;background:#8b5cf6"></div></div><div class="k-meta"><div class="k-avatar" style="background:rgba(139,92,246,.2);color:#8b5cf6">🤖</div><div class="k-date">IA · 24/7</div></div></div>
                    </div>
                </div>
                <!-- CONCLUÍDO -->
                <div class="kanban-col">
                    <div class="kanban-header" style="color:#06b6d4;border-bottom-color:rgba(6,182,212,.3)">✅ Concluído <span class="cnt">2</span></div>
                    <div class="kanban-cards">
                        <div class="k-card" style="opacity:.7"><div class="k-priority" style="background:#06b6d4"></div><div class="k-name">Ricardo Santos</div><div class="k-type">Acordo cumprido ✓</div><div class="k-bar"><div class="k-bar-fill" style="width:100%;background:#06b6d4"></div></div><div class="k-meta"><div class="k-avatar" style="background:rgba(6,182,212,.2);color:#06b6d4">✓</div><div class="k-date">Encerrado</div></div></div>
                        <div class="k-card" style="opacity:.7"><div class="k-priority" style="background:#06b6d4"></div><div class="k-name">Fernanda Reis</div><div class="k-type">Sentença favorável ✓</div><div class="k-bar"><div class="k-bar-fill" style="width:100%;background:#06b6d4"></div></div><div class="k-meta"><div class="k-avatar" style="background:rgba(6,182,212,.2);color:#06b6d4">✓</div><div class="k-date">Encerrado</div></div></div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>

<!-- SLIDE 7: ROI -->
<div class="slide bg-2" data-slide="7">
    <div class="sc" style="text-align:center">
        <div class="a1 badge" style="border-color:rgba(16,185,129,.3);background:rgba(16,185,129,.1);color:var(--emerald)">📈 Retorno do Investimento</div>
        <h2 class="a2">Os números falam <span class="hle">por si mesmos</span></h2>
        <div class="sr a3" style="justify-content:center">
            <div class="st"><div class="sv hl">60h</div><div class="sl">Horas liberadas/semana</div></div>
            <div class="st"><div class="sv hle">R$25K</div><div class="sl">Valor gerado/mês</div></div>
            <div class="st"><div class="sv hlg">-30%</div><div class="sl">Inadimplência</div></div>
            <div class="st"><div class="sv" style="color:var(--accent2)">0</div><div class="sl">Prazos perdidos</div></div>
        </div>
        <div class="g3 a4" style="margin-top:36px">
            <div class="cd" style="text-align:center"><span class="ci">⏰</span><h3>60h/semana livres</h3><p>Equivalente a <strong>1.5 funcionário CLT</strong> trabalhando só em tarefas repetitivas</p></div>
            <div class="cd" style="text-align:center"><span class="ci">📊</span><h3>Visibilidade Total</h3><p>Dashboard Kanban mostra <strong>cada cliente, cada prazo, cada centavo</strong> em tempo real</p></div>
            <div class="cd" style="text-align:center"><span class="ci">🎯</span><h3>Payback 2-3 meses</h3><p>O investimento se paga rapidamente e continua gerando <strong>valor todo mês</strong></p></div>
        </div>
    </div>
</div>

<!-- SLIDE 8: PRICING -->
<div class="slide bg-1" data-slide="8">
    <div class="sc">
        <div class="a1 badge" style="text-align:center">💎 Investimento</div>
        <h2 class="a2" style="text-align:center">Escolha o plano ideal para o <span class="gt">seu escritório</span></h2>
        <div class="pc a3">
            <div class="pp">
                <div class="pn">Essencial</div><div class="pm">3 Módulos</div>
                <div class="pv">R$15K</div><div class="pd">implantação</div><div class="py">+ R$2.500/mês</div>
                <ul class="pf">
                    <li><span class="ck">✓</span> Triagem Automatizada</li>
                    <li><span class="ck">✓</span> Atendimento 24/7</li>
                    <li><span class="ck">✓</span> Cobrança Automática</li>
                    <li><span class="ck" style="color:var(--muted)">—</span><span style="opacity:.4">Gestão de Prazos IA</span></li>
                    <li><span class="ck" style="color:var(--muted)">—</span><span style="opacity:.4">Pipeline & Dashboard</span></li>
                    <li><span class="ck">✓</span> Treinamento (4h)</li>
                </ul>
                <div class="pr">ROI: R$8-12K/mês</div>
            </div>
            <div class="pp ft">
                <div class="pb">⭐ RECOMENDADO</div>
                <div class="pn">Profissional</div><div class="pm">6 Módulos + Pipeline</div>
                <div class="pv" style="color:var(--accent)">R$28K</div><div class="pd">implantação</div><div class="py">+ R$4.000/mês</div>
                <ul class="pf">
                    <li><span class="ck">✓</span> Triagem Automatizada</li>
                    <li><span class="ck">✓</span> Atendimento 24/7</li>
                    <li><span class="ck">✓</span> Cobrança Automática</li>
                    <li><span class="ck">✓</span> <strong>Gestão de Prazos IA</strong></li>
                    <li><span class="ck">✓</span> <strong>Comercial Inteligente</strong></li>
                    <li><span class="ck">✓</span> <strong>Audiências & Lembretes</strong></li>
                    <li><span class="ck">✓</span> <strong style="color:#14b8a6">Pipeline & Dashboard</strong></li>
                    <li><span class="ck">✓</span> Treinamento (8h)</li>
                </ul>
                <div class="pr">ROI: R$15-25K/mês</div>
            </div>
            <div class="pp">
                <div class="pn">Premium</div><div class="pm">8 Módulos — Completo</div>
                <div class="pv">R$42K</div><div class="pd">implantação</div><div class="py">+ R$5.500/mês</div>
                <ul class="pf">
                    <li><span class="ck">✓</span> Tudo do Profissional</li>
                    <li><span class="ck">✓</span> <strong>Geração de Docs IA</strong></li>
                    <li><span class="ck">✓</span> <strong>Dashboard Premium</strong></li>
                    <li><span class="ck">✓</span> IA treinada p/ escritório</li>
                    <li><span class="ck">✓</span> Relatórios automáticos</li>
                    <li><span class="ck">✓</span> Treinamento VIP (12h)</li>
                    <li><span class="ck">✓</span> Suporte 90 dias</li>
                </ul>
                <div class="pr">ROI: R$20-30K/mês</div>
            </div>
        </div>
    </div>
</div>

<!-- SLIDE 9: CRONOGRAMA -->
<div class="slide bg-4" data-slide="9">
    <div class="sc">
        <div class="a1 badge">📅 Cronograma</div>
        <h2 class="a2">Da assinatura ao <span class="hl">sistema funcionando</span></h2>
        <div class="tl a3">
            <div class="ti"><div class="td" style="border-color:var(--accent);color:var(--accent)">1</div><div class="tc"><h4>Semana 1-2: Fundação</h4><p>Infraestrutura, APIs conectadas, servidor operacional</p><span class="tg" style="background:rgba(59,130,246,.2);color:var(--accent)">SETUP</span></div></div>
            <div class="ti"><div class="td" style="border-color:var(--emerald);color:var(--emerald)">2</div><div class="tc"><h4>Semana 3-4: Triagem + Atendimento</h4><p>Primeiros módulos em produção — onboarding automatizado + chatbot 24/7</p><span class="tg" style="background:rgba(16,185,129,.2);color:var(--emerald)">✅ PRIMEIRO RESULTADO</span></div></div>
            <div class="ti"><div class="td" style="border-color:var(--accent2);color:var(--accent2)">3</div><div class="tc"><h4>Semana 5-6: Prazos + Cobrança</h4><p>Gestão de prazos com IA + cobrança automática operacionais</p><span class="tg" style="background:rgba(139,92,246,.2);color:var(--accent2)">SEGURANÇA JURÍDICA</span></div></div>
            <div class="ti"><div class="td" style="border-color:var(--gold);color:var(--gold)">4</div><div class="tc"><h4>Semana 7-8: Comercial + Audiências</h4><p>Qualificação de leads + lembretes automatizados</p><span class="tg" style="background:rgba(245,158,11,.2);color:var(--gold)">ESCALA</span></div></div>
            <div class="ti"><div class="td" style="border-color:#14b8a6;color:#14b8a6">5</div><div class="tc"><h4>Semana 9-10: Pipeline & Dashboard + Go-Live</h4><p>Dashboard Kanban em tempo real + treinamento da equipe + sistema 100% operacional</p><span class="tg" style="background:rgba(20,184,166,.2);color:#14b8a6">🚀 SISTEMA COMPLETO</span></div></div>
        </div>
    </div>
</div>

<!-- SLIDE 10: GARANTIAS -->
<div class="slide bg-2" data-slide="10">
    <div class="sc" style="text-align:center">
        <div class="a1 badge">🛡️ Garantias</div>
        <h2 class="a2">Sem risco. <span class="hle">Só resultado.</span></h2>
        <div class="g3 a3">
            <div class="cd" style="text-align:center;border-top:3px solid var(--emerald)"><span class="ci">🔒</span><h3>Segurança LGPD</h3><p>Servidor próprio no Brasil, dados criptografados, acesso controlado.</p></div>
            <div class="cd" style="text-align:center;border-top:3px solid var(--accent)"><span class="ci">🔄</span><h3>Seus Sistemas Continuam</h3><p>Astrea, Autentique, OneDrive — nada muda. A IA se integra com tudo.</p></div>
            <div class="cd" style="text-align:center;border-top:3px solid var(--accent2)"><span class="ci">👥</span><h3>Equipe Potencializada</h3><p>Ninguém é substituído. A IA libera sua equipe para trabalho de ALTO VALOR.</p></div>
            <div class="cd" style="text-align:center;border-top:3px solid var(--gold)"><span class="ci">✅</span><h3>Revisão Humana</h3><p>Todo doc jurídico passa por advogado. IA faz rascunho, humano valida.</p></div>
            <div class="cd" style="text-align:center;border-top:3px solid var(--rose)"><span class="ci">📊</span><h3>SLA 99% Uptime</h3><p>Sistema monitorado 24/7 com alertas. Suporte em até 4h úteis.</p></div>
            <div class="cd" style="text-align:center;border-top:3px solid #06b6d4"><span class="ci">🚪</span><h3>Sem Lock-in</h3><p>Cancelamento com 30 dias. Dados exportados. Transição assistida.</p></div>
        </div>
    </div>
</div>

<!-- SLIDE 11: CTA FINAL -->
<div class="slide bg-1" data-slide="11">
    <div class="particles" id="p11"></div>
    <div class="sc" style="text-align:center">
        <div class="a1" style="font-size:60px;margin-bottom:20px">🚀</div>
        <h1 class="a2" style="font-size:44px">Pronto para ter seu escritório<br>funcionando <span class="gt">24 horas por dia</span><br>com visibilidade total?</h1>
        <div class="cta a3">
            <h3 style="font-size:20px;margin-bottom:14px">Próximos Passos</h3>
            <div style="display:flex;gap:36px;justify-content:center;flex-wrap:wrap">
                <div style="text-align:center"><div style="font-size:32px;margin-bottom:6px">1️⃣</div><p style="font-size:14px">Escolha o plano<br><strong>Essencial, Profissional ou Premium</strong></p></div>
                <div style="text-align:center"><div style="font-size:32px;margin-bottom:6px">2️⃣</div><p style="font-size:14px">Assinamos contrato<br><strong>via Autentique (como vocês usam)</strong></p></div>
                <div style="text-align:center"><div style="font-size:32px;margin-bottom:6px">3️⃣</div><p style="font-size:14px">Em 4 semanas<br><strong>primeiro módulo rodando</strong></p></div>
                <div style="text-align:center"><div style="font-size:32px;margin-bottom:6px">4️⃣</div><p style="font-size:14px">Em 10 semanas<br><strong>Dashboard Kanban em tempo real</strong></p></div>
            </div>
        </div>
        <p class="a4" style="margin-top:28px;font-size:18px;color:var(--muted)">O escritório já tem: <strong style="color:#fff">POPs documentados, equipe organizada, sistemas em uso.</strong></p>
        <p class="a5" style="margin-top:10px;font-size:20px;font-weight:600">Falta apenas a <span class="gt">inteligência artificial</span> e a <span style="color:#14b8a6">visibilidade em tempo real</span>.</p>
        <div class="a6" style="margin-top:36px"><p style="font-size:15px;color:var(--muted)">Robson Melo — Especialista em Automação com IA</p></div>
    </div>
</div>

</div>

<!-- NAV -->
<div class="nav-bar">
    <div class="ni"><span id="si">1 / 12</span> — ⚖️ Teixeira Brito</div>
    <div class="nav-progress" id="np"></div>
    <div class="nav-buttons">
        <button class="nb prev" id="pb" onclick="prev()">← Anterior</button>
        <button class="nb next" id="nb2" onclick="next()">Próximo →</button>
    </div>
</div>
<div class="kh"><kbd>←</kbd><kbd>→</kbd> ou <kbd>Espaço</kbd></div>

<script>
const T=12;let C=0,A=false;
function mkP(id){const c=document.getElementById(id);if(!c)return;for(let i=0;i<25;i++){const p=document.createElement('div');p.className='particle';p.style.left=Math.random()*100+'%';p.style.animationDuration=(Math.random()*15+10)+'s';p.style.animationDelay=Math.random()*10+'s';p.style.width=(Math.random()*4+2)+'px';p.style.height=p.style.width;c.appendChild(p)}}
mkP('p0');mkP('p11');
function dots(){const n=document.getElementById('np');n.innerHTML='';for(let i=0;i<T;i++){const d=document.createElement('div');d.className='nav-dot'+(i===C?' active':'')+(i<C?' visited':'');d.onclick=()=>go(i);n.appendChild(d)}}
function go(n){if(A||n===C)return;A=true;const s=document.querySelectorAll('.slide'),d=n>C?1:-1;s[C].classList.remove('active');s[C].classList.add('exit');s[n].style.transform=\`translateX(${d*100}px)\`;s[n].classList.add('active');s[n].classList.remove('exit');setTimeout(()=>{s[C].classList.remove('exit');C=n;upd();A=false},600)}
function next(){if(C<T-1)go(C+1)}
function prev(){if(C>0)go(C-1)}
function upd(){document.getElementById('si').textContent=\`${C+1} / ${T}\`;document.getElementById('pb').disabled=C===0;const b=document.getElementById('nb2');b.disabled=C===T-1;b.textContent=C===T-1?'✓ Fim':'Próximo →';dots()}
document.addEventListener('keydown',e=>{if(e.key==='ArrowRight'||e.key===' '||e.key==='Enter'){e.preventDefault();next()}else if(e.key==='ArrowLeft')prev();else if(e.key==='Home')go(0);else if(e.key==='End')go(T-1)});
let tx=0;document.addEventListener('touchstart',e=>tx=e.touches[0].clientX);document.addEventListener('touchend',e=>{const d=tx-e.changedTouches[0].clientX;if(Math.abs(d)>50)d>0?next():prev()});
dots();upd();
</script>
</body>
</html>
`;

export default {
  async fetch(request) {
    return new Response(HTML, {
      headers: { 'Content-Type': 'text/html;charset=UTF-8' }
    });
  }
};
