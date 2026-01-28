

# Plano de Rebranding Gamako - Tema Oceânico

## Visão Geral

Transformar a identidade visual do sistema Gamako para refletir o tema do tubarão Mako/oceano, utilizando uma paleta de cores azul-ciano-turquesa e as novas logos fornecidas.

---

## Fase 1: Geração de Assets com IA

Utilizarei a API de geração de imagens (Gemini) para criar as variações necessárias das logos:

### 1.1 Ícone Isolado do Tubarão
- Extrair apenas o elemento do tubarão (cauda + formato)
- Dimensões: 512x512px (para PWA e favicon)
- Versões: colorida (ciano) e branca

### 1.2 Logo Completa Branca
- "GAMAKO" + tubarão em branco puro
- Para uso em backgrounds escuros/sidebar
- Dimensões: 400x150px

### 1.3 Logo Minimalista
- Versão simplificada para espaços pequenos
- Dimensões: 200x80px

---

## Fase 2: Atualização da Paleta de Cores

### Nova Paleta Oceânica (HSL)

| Token | Cor Atual | Nova Cor | Descrição |
|-------|-----------|----------|-----------|
| `--primary` | 210 100% 35% (azul escuro) | **195 100% 45%** | Ciano oceânico |
| `--primary-foreground` | branco | branco | Mantém |
| `--accent` | 210 100% 45% | **187 80% 50%** | Turquesa vibrante |
| `--sidebar-background` | 210 80% 15% | **200 75% 12%** | Azul profundo oceânico |
| `--sidebar-primary` | 210 100% 50% | **195 100% 55%** | Ciano brilhante |

### Cores Adicionais
```text
┌─────────────────────────────────────────────────────┐
│  Paleta Oceânica Gamako                             │
├─────────────────────────────────────────────────────┤
│  Ocean Deep    → #0a2540  (sidebar, headers)        │
│  Mako Cyan     → #00b4d8  (primary actions)         │
│  Turquoise     → #48cae4  (accent, highlights)      │
│  Sea Foam      → #90e0ef  (backgrounds leves)       │
│  Wave White    → #caf0f8  (surfaces claras)         │
└─────────────────────────────────────────────────────┘
```

---

## Fase 3: Arquivos a Serem Atualizados

### 3.1 Assets de Logo
```text
src/assets/
├── logo-gamako.png          → Logo colorida principal
├── logo-gamako-white.png    → Logo branca completa
├── logo-gamako-icon.png     → Ícone tubarão colorido
├── logo-gamako-white-icon.png → Ícone tubarão branco
└── logo-gamako-full.png     → Logo horizontal completa
```

### 3.2 PWA e Favicons
```text
public/
├── favicon.ico              → Ícone tubarão
├── favicon.png              → Ícone tubarão 32x32
├── pwa-192x192.png          → Ícone PWA pequeno
├── pwa-512x512.png          → Ícone PWA grande
├── apple-touch-icon.png     → iOS icon
└── pwa-garcom-192/512.png   → App do Garçom específico
```

### 3.3 Arquivos de Código

| Arquivo | Mudanças |
|---------|----------|
| `src/index.css` | Nova paleta de cores HSL oceânica |
| `src/components/layout/AppSidebar.tsx` | Referência às novas logos |
| `src/pages/Login.tsx` | Logo e cores atualizadas |
| `src/pages/waiter/components/SplashScreen.tsx` | Gradiente oceânico |
| `src/pages/waiter/components/WaiterHeader.tsx` | Cores do header |
| `src/pages/waiter/components/InstallPWA.tsx` | Nova logo |
| `index.html` | Favicon e meta tags |
| `vite.config.ts` | Configuração PWA |

---

## Fase 4: Detalhes Técnicos de Implementação

### 4.1 CSS Variables (index.css)

Atualização das variáveis root para tema claro:
```css
:root {
  /* Primary - Mako Cyan */
  --primary: 195 100% 45%;
  --primary-foreground: 0 0% 100%;
  
  /* Accent - Turquoise */
  --accent: 187 80% 50%;
  --accent-foreground: 0 0% 100%;
  
  /* Sidebar - Ocean Deep */
  --sidebar-background: 200 75% 12%;
  --sidebar-foreground: 195 30% 95%;
  --sidebar-primary: 195 100% 55%;
  --sidebar-accent: 200 60% 18%;
}
```

### 4.2 AppSidebar.tsx

```typescript
// Header com nova logo
<img 
  src={logoGamakoWhite} 
  alt="Gamako" 
  className="h-12 w-auto"
/>

// Collapsed state - ícone
<img 
  src={logoGamakoWhiteIcon} 
  alt="G" 
  className="h-10 w-10"
/>
```

### 4.3 Gradientes Oceânicos

Para headers e elementos especiais:
```css
.ocean-gradient {
  background: linear-gradient(135deg, #0a2540 0%, #00b4d8 100%);
}

.wave-gradient {
  background: linear-gradient(180deg, #48cae4 0%, #00b4d8 50%, #0077b6 100%);
}
```

### 4.4 SplashScreen.tsx (App do Garçom)

```typescript
// Gradiente oceânico no fundo
<div className="bg-gradient-to-b from-[#0a2540] via-[#0077b6] to-[#00b4d8]">
  {/* Circles decorativos com cores oceânicas */}
  <div className="bg-cyan-400/10 rounded-full animate-pulse" />
</div>
```

---

## Fase 5: Ordem de Execução

1. **Gerar assets de logo** via IA (ícone isolado + versão branca)
2. **Copiar logos originais** para src/assets/
3. **Atualizar index.css** com nova paleta
4. **Atualizar componentes** (AppSidebar, Login, SplashScreen)
5. **Atualizar PWA** (favicon, manifests, icons)
6. **Testar em diferentes temas** (claro/escuro)

---

## Resultado Esperado

Após o rebranding:
- **Sidebar**: Fundo azul oceânico profundo com logo branca
- **Botões primários**: Ciano vibrante do Mako
- **Destaques/Accent**: Turquesa do mar
- **Login/Splash**: Gradientes oceânicos suaves
- **PWA/Favicon**: Ícone do tubarão Mako reconhecível

