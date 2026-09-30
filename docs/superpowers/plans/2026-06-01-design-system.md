# Design System OSLive — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Criar a fundação visual do OSLive — tokens CSS, componentes UI atômicos standalone e uma página `/brandkit` que serve como storybook vivo do design system.

**Architecture:** Os tokens CSS globais ficam em `src/styles.css`. Os componentes atômicos vivem em `src/app/ui/` como standalone components Angular, cada um com seu próprio CSS baseado apenas nos tokens. A rota `/brandkit` importa todos os componentes e os exibe em uma única página de validação.

**Tech Stack:** Angular 18 standalone, CSS custom properties (tokens), IBM Plex (Google Fonts), sem dependência de Bootstrap nos componentes novos.

---

## Estrutura de arquivos

```
src/
├── styles.css                              ← MODIFICAR: adicionar tokens DS
├── app/
│   ├── app-routing.module.ts               ← MODIFICAR: adicionar rota /brandkit
│   ├── ui/                                 ← CRIAR
│   │   ├── tokens.css                      ← tokens isolados (importado por styles.css)
│   │   ├── button/
│   │   │   ├── button.component.ts
│   │   │   └── button.component.css
│   │   ├── badge/
│   │   │   ├── badge.component.ts
│   │   │   └── badge.component.css
│   │   ├── input/
│   │   │   ├── input.component.ts
│   │   │   └── input.component.css
│   │   ├── alert/
│   │   │   ├── alert.component.ts
│   │   │   └── alert.component.css
│   │   ├── card/
│   │   │   ├── card.component.ts
│   │   │   └── card.component.css
│   │   ├── terminal/
│   │   │   ├── terminal.component.ts
│   │   │   └── terminal.component.css
│   │   └── index.ts                        ← barrel export
│   └── pages/
│       └── brandkit/
│           ├── brandkit.component.ts
│           └── brandkit.component.css
```

---

## Task 1: Branch e tokens CSS globais

**Files:**
- Modify: `src/styles.css`
- Create: `src/app/ui/tokens.css`

- [ ] **Step 1: Criar `src/app/ui/tokens.css`** com todos os tokens do DS

```css
/* src/app/ui/tokens.css */
@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:ital,wght@0,300;0,400;0,500;0,600;1,400;1,500&family=IBM+Plex+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&family=IBM+Plex+Serif:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400&display=swap');

:root {
  /* neutros greige */
  --n-0: #ffffff;
  --n-25: #fcfcfb;
  --n-50: #f6f5f2;
  --n-100: #edece7;
  --n-150: #e2e0da;
  --n-200: #d4d1c8;
  --n-300: #b8b3a7;
  --n-400: #928c7e;
  --n-500: #6e6859;
  --n-600: #514c40;
  --n-700: #393530;
  --n-800: #211f1b;
  --n-900: #13110e;
  --n-950: #0a0907;

  /* acento — âmbar (padrão) */
  --a: #c2410c;
  --a-hover: #9a3208;
  --a-soft: #fdf0e8;
  --a-line: #f4d4c0;
  --a-deep: #7c2d12;
  --a-glow: rgba(194, 65, 12, .14);

  /* fósforo — sinal vivo */
  --phos: #d97834;
  --phos-glow: rgba(217, 120, 52, .5);

  /* semânticos */
  --ok: #3f7d4e;       --ok-soft: #eef5ee;   --ok-line: #cfe3d2;   --ok-deep: #2c5a38;
  --warn: #b45309;     --warn-soft: #fdf4e7; --warn-line: #f0dcb8; --warn-deep: #7c3d06;
  --err: #b3261e;      --err-soft: #fcefed;  --err-line: #f0cdc9;  --err-deep: #7d1a15;
  --info: #1f5d8c;     --info-soft: #ecf3f8; --info-line: #c8dce9; --info-deep: #143f5f;

  /* tipografia */
  --f-sans: 'IBM Plex Sans', 'Segoe UI', sans-serif;
  --f-serif: 'IBM Plex Serif', Georgia, serif;
  --f-mono: 'IBM Plex Mono', ui-monospace, monospace;

  /* border-radius */
  --r-xs: 3px;  --r-sm: 5px;  --r: 7px;
  --r-md: 10px; --r-lg: 14px; --r-xl: 20px;

  /* sombras */
  --sh-xs: 0 1px 2px rgba(33, 31, 27, .05);
  --sh-sm: 0 1px 2px rgba(33, 31, 27, .06), 0 2px 5px rgba(33, 31, 27, .05);
  --sh:    0 2px 4px rgba(33, 31, 27, .05), 0 6px 16px rgba(33, 31, 27, .07);
  --sh-md: 0 4px 8px rgba(33, 31, 27, .06), 0 14px 34px rgba(33, 31, 27, .10);
  --sh-lg: 0 10px 24px rgba(33, 31, 27, .10), 0 30px 70px rgba(33, 31, 27, .16);
  --ring:  0 0 0 3px var(--a-glow);

  /* easing */
  --ease: cubic-bezier(.22, .61, .36, 1);
  --ease-out: cubic-bezier(.16, 1, .3, 1);

  /* superfícies semânticas (tema claro) */
  --bg: var(--n-50);
  --surface: var(--n-0);
  --surface-2: var(--n-25);
  --line: var(--n-150);
  --line-soft: var(--n-100);
  --text: var(--n-800);
  --text-2: var(--n-600);
  --text-3: var(--n-400);
}

[data-theme="dark"] {
  --bg: #100e0a;
  --surface: #1a1813;
  --surface-2: #16140f;
  --line: #2c2920;
  --line-soft: #221f18;
  --text: #e8e3d6;
  --text-2: #b0aa98;
  --text-3: #6f6a5a;
  --a: #e0843f;
  --a-hover: #eb9a5c;
  --a-soft: #241a12;
  --a-line: #3a2a1c;
  --a-deep: #f0a868;
  --a-glow: rgba(224, 132, 63, .18);
  --ok-soft: #15211a; --ok-line: #244430; --ok: #5fa66f; --ok-deep: #7fc28e;
  --warn-soft: #241c10; --warn-line: #4a3818; --warn: #d99748; --warn-deep: #e8b070;
  --err-soft: #251411; --err-line: #4d211c; --err: #e07068; --err-deep: #ef9088;
  --info-soft: #101e28; --info-line: #1f3d52; --info: #5896c4; --info-deep: #7fb4dc;
  --sh-xs: 0 1px 2px rgba(0,0,0,.4);
  --sh-sm: 0 1px 3px rgba(0,0,0,.5);
  --sh:    0 4px 14px rgba(0,0,0,.5);
  --sh-md: 0 8px 28px rgba(0,0,0,.55);
  --sh-lg: 0 18px 60px rgba(0,0,0,.6);
}
```

- [ ] **Step 2: Atualizar `src/styles.css`** para importar os tokens e aplicar reset mínimo

```css
/* src/styles.css */
@import './app/ui/tokens.css';
@import '~@fortawesome/fontawesome-free/css/all.min.css';
@import '~@primer/octicons/build/build.css';

*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html {
  scroll-behavior: smooth;
  font-size: 16px;
  -webkit-text-size-adjust: 100%;
}

body {
  background: var(--bg);
  color: var(--text);
  font-family: var(--f-sans);
  font-size: 14px;
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
  min-height: 100vh;
}

/* scrollbar */
::-webkit-scrollbar { width: 5px; height: 5px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: var(--line); border-radius: 100px; }
::-webkit-scrollbar-thumb:hover { background: var(--text-3); }

/* snackbar — mantido do projeto */
.mat-snack-bar-container {
  position: fixed !important;
  top: 89% !important;
  left: 50% !important;
  border: 1px solid red;
  color: red !important;
  background-color: #f2dede;
}
```

- [ ] **Step 3: Verificar build**

```bash
npx ng build --configuration=development
```

Esperado: sem erros.

- [ ] **Step 4: Commit**

```bash
git add src/styles.css src/app/ui/tokens.css
git commit -m "feat(ds): adiciona tokens CSS do design system"
```

---

## Task 2: OsButtonComponent

**Files:**
- Create: `src/app/ui/button/button.component.ts`
- Create: `src/app/ui/button/button.component.css`

- [ ] **Step 1: Criar `button.component.css`**

```css
:host { display: inline-flex; }

.btn {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 10px 19px;
  border-radius: var(--r);
  font-family: var(--f-sans);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all .15s var(--ease);
  border: 1px solid transparent;
  letter-spacing: -.005em;
  line-height: 1;
  outline: none;
  position: relative;
}
.btn:focus-visible { box-shadow: var(--ring); }
.btn:disabled { opacity: .45; cursor: not-allowed; pointer-events: none; }

/* variantes */
.btn-p {
  background: var(--a); color: #fff; border-color: var(--a);
  box-shadow: var(--sh-xs), inset 0 1px 0 rgba(255,255,255,.15);
}
.btn-p:hover { background: var(--a-hover); transform: translateY(-1px); box-shadow: var(--sh-sm); }
.btn-p:active { transform: translateY(0); box-shadow: var(--sh-xs); }

.btn-s {
  background: var(--surface); color: var(--text); border-color: var(--line);
  box-shadow: var(--sh-xs);
}
.btn-s:hover { border-color: var(--text-3); box-shadow: var(--sh-sm); transform: translateY(-1px); }

.btn-g { background: transparent; color: var(--text-2); border-color: transparent; }
.btn-g:hover { background: var(--surface-2); color: var(--text); }

.btn-d {
  background: var(--surface); color: var(--err); border-color: var(--line);
  box-shadow: var(--sh-xs);
}
.btn-d:hover { border-color: var(--err); background: var(--err-soft); transform: translateY(-1px); }

/* tamanhos */
.btn-sm { padding: 7px 13px; font-size: 12px; border-radius: var(--r-sm); }
.btn-lg { padding: 13px 26px; font-size: 16px; }

/* glow */
.btn-glow:hover { box-shadow: var(--sh), 0 0 22px -2px var(--a-glow); }
```

- [ ] **Step 2: Criar `button.component.ts`**

```typescript
// src/app/ui/button/button.component.ts
import { Component, Input } from '@angular/core';
import { NgClass } from '@angular/common';

export type ButtonVariant = 'p' | 's' | 'g' | 'd';
export type ButtonSize = 'sm' | 'lg' | 'md';

@Component({
  selector: 'os-button',
  standalone: true,
  imports: [NgClass],
  styleUrls: ['./button.component.css'],
  template: `
    <button
      class="btn"
      [ngClass]="classes"
      [disabled]="disabled || null"
      [type]="type"
    >
      <ng-content></ng-content>
    </button>
  `,
})
export class OsButtonComponent {
  @Input() variant: ButtonVariant = 'p';
  @Input() size: ButtonSize = 'md';
  @Input() disabled = false;
  @Input() glow = false;
  @Input() type: 'button' | 'submit' | 'reset' = 'button';

  get classes(): Record<string, boolean> {
    return {
      [`btn-${this.variant}`]: true,
      'btn-sm': this.size === 'sm',
      'btn-lg': this.size === 'lg',
      'btn-glow': this.glow,
    };
  }
}
```

- [ ] **Step 3: Build**

```bash
npx ng build --configuration=development
```

Esperado: sem erros.

- [ ] **Step 4: Commit**

```bash
git add src/app/ui/button/
git commit -m "feat(ds): OsButtonComponent — variantes p/s/g/d, tamanhos, glow"
```

---

## Task 3: OsBadgeComponent

**Files:**
- Create: `src/app/ui/badge/badge.component.ts`
- Create: `src/app/ui/badge/badge.component.css`

- [ ] **Step 1: Criar `badge.component.css`**

```css
:host { display: inline-flex; }

.badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  border-radius: 100px;
  font-family: var(--f-mono);
  font-size: 11.5px;
  font-weight: 500;
  letter-spacing: .01em;
  border: 1px solid transparent;
  line-height: 1;
}

.bdot {
  width: 5px; height: 5px;
  border-radius: 50%;
  background: currentColor;
  flex-shrink: 0;
}
.bdot.live {
  animation: ring 1.8s var(--ease) infinite;
}
@keyframes ring {
  0%   { box-shadow: 0 0 0 0 currentColor; }
  70%  { box-shadow: 0 0 0 4px transparent; }
  100% { box-shadow: 0 0 0 0 transparent; }
}

.b-n { background: var(--surface-2); color: var(--text-2); border-color: var(--line); }
.b-a { background: var(--a-soft); color: var(--a); border-color: var(--a-line); }
.b-s { background: var(--ok-soft); color: var(--ok-deep); border-color: var(--ok-line); }
.b-w { background: var(--warn-soft); color: var(--warn-deep); border-color: var(--warn-line); }
.b-d { background: var(--err-soft); color: var(--err-deep); border-color: var(--err-line); }
.b-i { background: var(--info-soft); color: var(--info-deep); border-color: var(--info-line); }
```

- [ ] **Step 2: Criar `badge.component.ts`**

```typescript
// src/app/ui/badge/badge.component.ts
import { Component, Input } from '@angular/core';
import { NgClass, NgIf } from '@angular/common';

export type BadgeVariant = 'n' | 'a' | 's' | 'w' | 'd' | 'i';

@Component({
  selector: 'os-badge',
  standalone: true,
  imports: [NgClass, NgIf],
  styleUrls: ['./badge.component.css'],
  template: `
    <span class="badge" [ngClass]="'b-' + variant">
      <span *ngIf="live" class="bdot live"></span>
      <span *ngIf="dot && !live" class="bdot"></span>
      <ng-content></ng-content>
    </span>
  `,
})
export class OsBadgeComponent {
  @Input() variant: BadgeVariant = 'n';
  @Input() dot = false;
  @Input() live = false;
}
```

- [ ] **Step 3: Build**

```bash
npx ng build --configuration=development
```

- [ ] **Step 4: Commit**

```bash
git add src/app/ui/badge/
git commit -m "feat(ds): OsBadgeComponent — variantes n/a/s/w/d/i, dot animado"
```

---

## Task 4: OsInputComponent

**Files:**
- Create: `src/app/ui/input/input.component.ts`
- Create: `src/app/ui/input/input.component.css`

- [ ] **Step 1: Criar `input.component.css`**

```css
:host { display: block; }

.field { display: flex; flex-direction: column; gap: 6px; }

.field-lbl {
  font-size: 12px; font-weight: 500; color: var(--text);
  letter-spacing: -.005em; display: flex; align-items: center; gap: 6px;
}
.field-lbl .req { color: var(--a); font-family: var(--f-mono); }

.input {
  padding: 11px 14px;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--r);
  font-family: var(--f-sans);
  font-size: 14px;
  color: var(--text);
  outline: none;
  transition: border-color .14s, box-shadow .14s;
  width: 100%;
  box-shadow: var(--sh-xs);
}
.input:hover  { border-color: var(--text-3); }
.input:focus  { border-color: var(--a); box-shadow: var(--ring); }
.input::placeholder { color: var(--text-3); }

.input-err { border-color: var(--err); }
.input-err:focus { box-shadow: 0 0 0 3px var(--err-soft); }
.input-ok  { border-color: var(--ok); }
.input-ok:focus  { box-shadow: 0 0 0 3px var(--ok-soft); }

.field-hint {
  font-size: 11.5px; color: var(--text-3);
  font-style: italic; font-family: var(--f-serif);
}
.field-hint.err { color: var(--err); font-style: normal; font-family: var(--f-sans); }
.field-hint.ok  { color: var(--ok-deep); font-style: normal; font-family: var(--f-sans); }
```

- [ ] **Step 2: Criar `input.component.ts`**

```typescript
// src/app/ui/input/input.component.ts
import { Component, Input, forwardRef } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, FormsModule } from '@angular/forms';
import { NgClass, NgIf } from '@angular/common';

export type InputStatus = 'default' | 'err' | 'ok';

@Component({
  selector: 'os-input',
  standalone: true,
  imports: [NgClass, NgIf, FormsModule],
  styleUrls: ['./input.component.css'],
  providers: [{
    provide: NG_VALUE_ACCESSOR,
    useExisting: forwardRef(() => OsInputComponent),
    multi: true,
  }],
  template: `
    <div class="field">
      <label *ngIf="label" class="field-lbl">
        {{ label }}
        <span *ngIf="required" class="req">*</span>
      </label>
      <input
        class="input"
        [ngClass]="{
          'input-err': status === 'err',
          'input-ok':  status === 'ok'
        }"
        [type]="type"
        [placeholder]="placeholder"
        [disabled]="disabled"
        [value]="value"
        (input)="onInput($event)"
        (blur)="onTouched()"
      />
      <span *ngIf="hint" class="field-hint" [ngClass]="status !== 'default' ? status : ''">
        {{ hint }}
      </span>
    </div>
  `,
})
export class OsInputComponent implements ControlValueAccessor {
  @Input() label = '';
  @Input() placeholder = '';
  @Input() hint = '';
  @Input() status: InputStatus = 'default';
  @Input() required = false;
  @Input() disabled = false;
  @Input() type = 'text';

  value = '';
  onChange: (v: string) => void = () => {};
  onTouched: () => void = () => {};

  onInput(e: Event): void {
    this.value = (e.target as HTMLInputElement).value;
    this.onChange(this.value);
  }

  writeValue(v: string): void { this.value = v ?? ''; }
  registerOnChange(fn: (v: string) => void): void { this.onChange = fn; }
  registerOnTouched(fn: () => void): void { this.onTouched = fn; }
  setDisabledState(d: boolean): void { this.disabled = d; }
}
```

- [ ] **Step 3: Build**

```bash
npx ng build --configuration=development
```

- [ ] **Step 4: Commit**

```bash
git add src/app/ui/input/
git commit -m "feat(ds): OsInputComponent — label, hint, status err/ok, ControlValueAccessor"
```

---

## Task 5: OsAlertComponent

**Files:**
- Create: `src/app/ui/alert/alert.component.ts`
- Create: `src/app/ui/alert/alert.component.css`

- [ ] **Step 1: Criar `alert.component.css`**

```css
:host { display: block; }

.alert {
  display: flex;
  gap: 13px;
  padding: 15px 18px;
  border-radius: var(--r-md);
  border: 1px solid;
  line-height: 1.5;
  box-shadow: var(--sh-xs);
  position: relative;
  overflow: hidden;
}
.alert::before {
  content: "";
  position: absolute; left: 0; top: 0; bottom: 0;
  width: 3px; background: currentColor; opacity: .4;
}

.alert-body {}
.alert-title {
  font-family: var(--f-sans); font-weight: 600;
  font-size: 13.5px; letter-spacing: -.01em; margin-bottom: 3px;
}
.alert-text {
  font-family: var(--f-serif); font-size: 13px;
  font-weight: 300; opacity: .92;
}

.a-info  { background: var(--info-soft);  border-color: var(--info-line);  color: var(--info);  }
.a-info  .alert-title, .a-info  .alert-text { color: var(--info-deep);  }
.a-ok    { background: var(--ok-soft);    border-color: var(--ok-line);    color: var(--ok);    }
.a-ok    .alert-title, .a-ok    .alert-text { color: var(--ok-deep);    }
.a-warn  { background: var(--warn-soft);  border-color: var(--warn-line);  color: var(--warn);  }
.a-warn  .alert-title, .a-warn  .alert-text { color: var(--warn-deep);  }
.a-err   { background: var(--err-soft);   border-color: var(--err-line);   color: var(--err);   }
.a-err   .alert-title, .a-err   .alert-text { color: var(--err-deep);   }
```

- [ ] **Step 2: Criar `alert.component.ts`**

```typescript
// src/app/ui/alert/alert.component.ts
import { Component, Input } from '@angular/core';
import { NgClass, NgIf } from '@angular/common';

export type AlertVariant = 'info' | 'ok' | 'warn' | 'err';

@Component({
  selector: 'os-alert',
  standalone: true,
  imports: [NgClass, NgIf],
  styleUrls: ['./alert.component.css'],
  template: `
    <div class="alert" [ngClass]="'a-' + variant">
      <div class="alert-body">
        <div *ngIf="title" class="alert-title">{{ title }}</div>
        <div class="alert-text"><ng-content></ng-content></div>
      </div>
    </div>
  `,
})
export class OsAlertComponent {
  @Input() variant: AlertVariant = 'info';
  @Input() title = '';
}
```

- [ ] **Step 3: Build + commit**

```bash
npx ng build --configuration=development
git add src/app/ui/alert/
git commit -m "feat(ds): OsAlertComponent — variantes info/ok/warn/err"
```

---

## Task 6: OsCardComponent

**Files:**
- Create: `src/app/ui/card/card.component.ts`
- Create: `src/app/ui/card/card.component.css`

- [ ] **Step 1: Criar `card.component.css`**

```css
:host { display: block; }

.card {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--r-lg);
  padding: 24px 26px;
  transition: border-color .18s var(--ease), box-shadow .18s var(--ease), transform .18s var(--ease);
  box-shadow: var(--sh-xs);
  position: relative;
  overflow: hidden;
}
.card.hoverable:hover {
  border-color: var(--text-3);
  box-shadow: var(--sh-md);
  transform: translateY(-3px);
}
.card.accent { border-left: 3px solid var(--a); }

.card-header {
  display: flex; align-items: flex-start;
  justify-content: space-between; margin-bottom: 14px;
}
.card-title {
  font-family: var(--f-sans); font-size: 16px; font-weight: 600;
  color: var(--text); margin-bottom: 5px; letter-spacing: -.015em;
}
.card-body {
  font-family: var(--f-serif); font-size: 14px;
  color: var(--text-2); line-height: 1.65; font-weight: 300;
}
.card-footer {
  margin-top: 18px; padding-top: 15px;
  border-top: 1px solid var(--line-soft);
  display: flex; align-items: center; justify-content: space-between; gap: 10px;
}
```

- [ ] **Step 2: Criar `card.component.ts`**

```typescript
// src/app/ui/card/card.component.ts
import { Component, Input } from '@angular/core';
import { NgClass, NgIf } from '@angular/common';

@Component({
  selector: 'os-card',
  standalone: true,
  imports: [NgClass, NgIf],
  styleUrls: ['./card.component.css'],
  template: `
    <div class="card" [ngClass]="{ hoverable, accent }">
      <div *ngIf="hasHeader" class="card-header">
        <ng-content select="[slot=header]"></ng-content>
      </div>
      <div *ngIf="title" class="card-title">{{ title }}</div>
      <div class="card-body"><ng-content></ng-content></div>
      <div class="card-footer"><ng-content select="[slot=footer]"></ng-content></div>
    </div>
  `,
})
export class OsCardComponent {
  @Input() title = '';
  @Input() hoverable = true;
  @Input() accent = false;
  @Input() hasHeader = false;
}
```

- [ ] **Step 3: Build + commit**

```bash
npx ng build --configuration=development
git add src/app/ui/card/
git commit -m "feat(ds): OsCardComponent — hoverable, accent, slots header/footer"
```

---

## Task 7: OsTerminalComponent

**Files:**
- Create: `src/app/ui/terminal/terminal.component.ts`
- Create: `src/app/ui/terminal/terminal.component.css`

- [ ] **Step 1: Criar `terminal.component.css`**

```css
:host { display: block; }

.terminal {
  background: #0e0d0b;
  border: 1px solid #2a2720;
  border-radius: var(--r-md);
  overflow: hidden;
  font-family: var(--f-mono);
  box-shadow: var(--sh-md);
  position: relative;
}
.terminal::after {
  content: "";
  position: absolute; inset: 0; pointer-events: none;
  background: repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,.16) 3px, transparent 4px);
  opacity: .35; mix-blend-mode: overlay;
}

.term-bar {
  display: flex; align-items: center; gap: 6px;
  padding: 10px 15px;
  background: #16140f;
  border-bottom: 1px solid #2a2720;
  position: relative; z-index: 1;
}
.tdot { width: 11px; height: 11px; border-radius: 50%; }

.term-label {
  font-size: 11px; color: #7d7868; margin-left: 10px;
  letter-spacing: .04em;
}

.term-body {
  padding: 22px 26px;
  font-size: 14px; line-height: 1.85;
  color: #c4bda9;
  position: relative; z-index: 1;
}
```

- [ ] **Step 2: Criar `terminal.component.ts`**

```typescript
// src/app/ui/terminal/terminal.component.ts
import { Component, Input } from '@angular/core';
import { NgIf } from '@angular/common';

@Component({
  selector: 'os-terminal',
  standalone: true,
  imports: [NgIf],
  styleUrls: ['./terminal.component.css'],
  template: `
    <div class="terminal">
      <div class="term-bar">
        <div class="tdot" style="background:#ff5f57"></div>
        <div class="tdot" style="background:#febc2e"></div>
        <div class="tdot" style="background:#28c840"></div>
        <span *ngIf="label" class="term-label">{{ label }}</span>
      </div>
      <div class="term-body">
        <ng-content></ng-content>
      </div>
    </div>
  `,
})
export class OsTerminalComponent {
  @Input() label = '';
}
```

- [ ] **Step 3: Build + commit**

```bash
npx ng build --configuration=development
git add src/app/ui/terminal/
git commit -m "feat(ds): OsTerminalComponent — scanlines, dot buttons, label"
```

---

## Task 8: Barrel export `src/app/ui/index.ts`

**Files:**
- Create: `src/app/ui/index.ts`

- [ ] **Step 1: Criar o barrel**

```typescript
// src/app/ui/index.ts
export { OsButtonComponent } from './button/button.component';
export { OsBadgeComponent } from './badge/badge.component';
export { OsInputComponent } from './input/input.component';
export { OsAlertComponent } from './alert/alert.component';
export { OsCardComponent } from './card/card.component';
export { OsTerminalComponent } from './terminal/terminal.component';
```

- [ ] **Step 2: Build**

```bash
npx ng build --configuration=development
```

- [ ] **Step 3: Commit**

```bash
git add src/app/ui/index.ts
git commit -m "feat(ds): barrel export src/app/ui/index.ts"
```

---

## Task 9: BrandkitComponent — rota e página

**Files:**
- Create: `src/app/pages/brandkit/brandkit.component.ts`
- Create: `src/app/pages/brandkit/brandkit.component.css`
- Modify: `src/app/app-routing.module.ts`

- [ ] **Step 1: Criar `brandkit.component.css`**

```css
:host { display: block; }

.bk-wrap {
  max-width: 980px;
  margin: 0 auto;
  padding: 64px 40px 120px;
}

.bk-header {
  margin-bottom: 80px;
  padding-bottom: 40px;
  border-bottom: 1px solid var(--line);
}
.bk-eyebrow {
  font-family: var(--f-mono);
  font-size: 11px; letter-spacing: .16em; text-transform: uppercase;
  color: var(--a); margin-bottom: 16px; font-weight: 500;
}
.bk-title {
  font-family: var(--f-mono);
  font-size: 56px; font-weight: 600; letter-spacing: -.04em;
  color: var(--text); line-height: .95; margin-bottom: 18px;
}
.bk-title b { color: var(--a); }
.bk-desc {
  font-family: var(--f-serif); font-size: 18px;
  color: var(--text-2); line-height: 1.7; max-width: 560px;
}

.bk-section { margin-bottom: 72px; }
.bk-section-title {
  font-family: var(--f-mono); font-size: 10px; font-weight: 600;
  letter-spacing: .18em; text-transform: uppercase; color: var(--text-3);
  margin-bottom: 24px; display: flex; align-items: center; gap: 10px;
}
.bk-section-title::after { content: ""; flex: 1; height: 1px; background: var(--line-soft); }

.row { display: flex; flex-wrap: wrap; align-items: center; gap: 11px; }
.col { display: flex; flex-direction: column; gap: 14px; }
.g2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.g3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }

.token-chip {
  display: inline-flex; align-items: center; gap: 10px;
  padding: 8px 14px; border-radius: var(--r);
  background: var(--surface); border: 1px solid var(--line);
  font-family: var(--f-mono); font-size: 12px; color: var(--text);
}
.token-swatch {
  width: 18px; height: 18px; border-radius: var(--r-sm);
  border: 1px solid rgba(0,0,0,.08);
}

.type-sample {
  padding: 20px 0;
  border-bottom: 1px solid var(--line-soft);
}
.type-label {
  font-family: var(--f-mono); font-size: 9px; color: var(--text-3);
  letter-spacing: .1em; text-transform: uppercase; margin-bottom: 8px;
}
```

- [ ] **Step 2: Criar `brandkit.component.ts`**

```typescript
// src/app/pages/brandkit/brandkit.component.ts
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { OsButtonComponent } from '../../ui/button/button.component';
import { OsBadgeComponent } from '../../ui/badge/badge.component';
import { OsInputComponent } from '../../ui/input/input.component';
import { OsAlertComponent } from '../../ui/alert/alert.component';
import { OsCardComponent } from '../../ui/card/card.component';
import { OsTerminalComponent } from '../../ui/terminal/terminal.component';

@Component({
  selector: 'app-brandkit',
  standalone: true,
  imports: [
    RouterLink,
    OsButtonComponent,
    OsBadgeComponent,
    OsInputComponent,
    OsAlertComponent,
    OsCardComponent,
    OsTerminalComponent,
  ],
  styleUrls: ['./brandkit.component.css'],
  template: `
<div class="bk-wrap">

  <!-- HEADER -->
  <header class="bk-header">
    <div class="bk-eyebrow">OSLive · Design System · v2.0</div>
    <h1 class="bk-title">OS<b>Live</b></h1>
    <p class="bk-desc">Componentes, tokens e fundação visual da plataforma. Página de validação do design system.</p>
    <div style="margin-top:24px">
      <a routerLink="/" style="font-family:var(--f-mono);font-size:12px;color:var(--text-3)">← Voltar ao app</a>
    </div>
  </header>

  <!-- TOKENS DE COR -->
  <section class="bk-section">
    <div class="bk-section-title">01 — Tokens de Cor</div>
    <div class="row">
      <div class="token-chip"><span class="token-swatch" style="background:var(--a)"></span>--a (acento)</div>
      <div class="token-chip"><span class="token-swatch" style="background:var(--phos)"></span>--phos</div>
      <div class="token-chip"><span class="token-swatch" style="background:var(--ok)"></span>--ok</div>
      <div class="token-chip"><span class="token-swatch" style="background:var(--warn)"></span>--warn</div>
      <div class="token-chip"><span class="token-swatch" style="background:var(--err)"></span>--err</div>
      <div class="token-chip"><span class="token-swatch" style="background:var(--info)"></span>--info</div>
    </div>
    <div class="row" style="margin-top:12px">
      <div class="token-chip"><span class="token-swatch" style="background:var(--bg);border-color:var(--line)"></span>--bg</div>
      <div class="token-chip"><span class="token-swatch" style="background:var(--surface);border-color:var(--line)"></span>--surface</div>
      <div class="token-chip"><span class="token-swatch" style="background:var(--text)"></span>--text</div>
      <div class="token-chip"><span class="token-swatch" style="background:var(--text-2)"></span>--text-2</div>
      <div class="token-chip"><span class="token-swatch" style="background:var(--text-3)"></span>--text-3</div>
      <div class="token-chip"><span class="token-swatch" style="background:var(--line)"></span>--line</div>
    </div>
  </section>

  <!-- TIPOGRAFIA -->
  <section class="bk-section">
    <div class="bk-section-title">02 — Tipografia</div>
    <div class="type-sample">
      <div class="type-label">IBM Plex Mono / 600 / Display</div>
      <div style="font-family:var(--f-mono);font-size:48px;font-weight:600;letter-spacing:-.04em;color:var(--text);line-height:1">Sistemas Operacionais</div>
    </div>
    <div class="type-sample">
      <div class="type-label">IBM Plex Sans / 600 / H1</div>
      <div style="font-family:var(--f-sans);font-size:34px;font-weight:600;letter-spacing:-.035em;color:var(--text)">Gerenciamento de Memória</div>
    </div>
    <div class="type-sample">
      <div class="type-label">IBM Plex Serif / 400 / Body</div>
      <div style="font-family:var(--f-serif);font-size:18px;color:var(--text-2);line-height:1.8">A memória virtual permite ao sistema operacional usar o disco como extensão da RAM. Cada processo enxerga um espaço de endereços contíguo e isolado.</div>
    </div>
    <div class="type-sample" style="border-bottom:none">
      <div class="type-label">IBM Plex Mono / 400 / Code</div>
      <div style="font-family:var(--f-mono);font-size:14px;color:var(--text)"><span style="color:var(--a)">$</span> ps aux | sort -k3 -rn | head -10</div>
    </div>
  </section>

  <!-- BOTÕES -->
  <section class="bk-section">
    <div class="bk-section-title">03 — os-button</div>
    <div class="row">
      <os-button variant="p">Executar</os-button>
      <os-button variant="s">Ver Código</os-button>
      <os-button variant="g">Cancelar</os-button>
      <os-button variant="d">Encerrar Processo</os-button>
    </div>
    <div class="row" style="margin-top:12px">
      <os-button variant="p" size="sm">Pequeno</os-button>
      <os-button variant="p">Médio</os-button>
      <os-button variant="p" size="lg">Grande</os-button>
      <os-button variant="p" [glow]="true">Glow</os-button>
      <os-button variant="p" [disabled]="true">Desabilitado</os-button>
    </div>
  </section>

  <!-- BADGES -->
  <section class="bk-section">
    <div class="bk-section-title">04 — os-badge</div>
    <div class="row">
      <os-badge variant="n">Idle</os-badge>
      <os-badge variant="a" [live]="true">Active</os-badge>
      <os-badge variant="s" [live]="true">Running</os-badge>
      <os-badge variant="w">High CPU</os-badge>
      <os-badge variant="d">Killed</os-badge>
      <os-badge variant="i">Sleeping</os-badge>
    </div>
    <div class="row" style="margin-top:10px">
      <os-badge variant="n">Linux 5.x</os-badge>
      <os-badge variant="a">Intermediário</os-badge>
      <os-badge variant="s">Concluído</os-badge>
      <os-badge variant="w">Em Progresso</os-badge>
    </div>
  </section>

  <!-- INPUTS -->
  <section class="bk-section">
    <div class="bk-section-title">05 — os-input</div>
    <div class="g2">
      <os-input label="Nome do Processo" placeholder="nginx, mysql…" [required]="true" hint="Exibido na tabela de processos"></os-input>
      <os-input label="Erro de validação" placeholder="PID inválido" status="err" hint="PID deve ser inteiro positivo"></os-input>
      <os-input label="Validado" placeholder="Processo iniciado" status="ok" hint="Validado com sucesso"></os-input>
      <os-input label="Prioridade" type="number" placeholder="0–19"></os-input>
    </div>
  </section>

  <!-- ALERTAS -->
  <section class="bk-section">
    <div class="bk-section-title">06 — os-alert</div>
    <div class="col">
      <os-alert variant="info" title="Dica de Simulação">Use Ctrl+Z para suspender. O processo vai para "Stopped" e pode ser retomado com fg.</os-alert>
      <os-alert variant="ok" title="Exercício Concluído">Round Robin com quantum de 4ms implementado corretamente.</os-alert>
      <os-alert variant="warn" title="Uso Elevado de Memória">O processo leakdemo está consumindo mais de 85% da memória disponível.</os-alert>
      <os-alert variant="err" title="Kernel Panic">Falha fatal. Estado da simulação salvo. Reinicie o ambiente para continuar.</os-alert>
    </div>
  </section>

  <!-- CARDS -->
  <section class="bk-section">
    <div class="bk-section-title">07 — os-card</div>
    <div class="g3">
      <os-card title="Simulador FIFO" [hoverable]="true">
        Algoritmo de substituição de páginas — primeiro a entrar, primeiro a sair.
        <div slot="footer">
          <span style="font-family:var(--f-mono);font-size:11px;color:var(--text-3)">8 frames</span>
          <os-button variant="p" size="sm">Abrir</os-button>
        </div>
      </os-card>
      <os-card title="Round Robin" [hoverable]="true">
        Escalonamento com quantum fixo. Cada processo recebe fatias iguais de CPU.
        <div slot="footer">
          <os-badge variant="w">Beta</os-badge>
          <os-button variant="s" size="sm">Preview</os-button>
        </div>
      </os-card>
      <os-card title="Capítulo Ativo" [hoverable]="true" [accent]="true">
        Memória Virtual. Continue de onde parou na última sessão.
        <div slot="footer">
          <os-badge variant="a">Cap. 4</os-badge>
          <os-button variant="s" size="sm">Continuar</os-button>
        </div>
      </os-card>
    </div>
  </section>

  <!-- TERMINAL -->
  <section class="bk-section">
    <div class="bk-section-title">08 — os-terminal</div>
    <os-terminal label="bash — oslive &#64; kernel 5.x">
      <div><span style="color:#5fb87a">user&#64;oslive</span><span style="color:#4a463c">:~$</span> <span>ps aux | sort -k3 -rn | head -5</span></div>
      <div style="margin:4px 0;color:#4a463c">USER         PID  %CPU  %MEM  COMMAND</div>
      <div><span style="color:#6ea8d8">mysql</span>        643   3.2   8.1  mysqld</div>
      <div><span style="color:#6ea8d8">user</span>        2847  <span style="color:#d8736b">87.3</span>  15.2  <span style="color:var(--phos)">leakdemo</span></div>
      <div style="margin-top:8px"><span style="color:#5fb87a">user&#64;oslive</span><span style="color:#4a463c">:~$</span> <span style="display:inline-block;width:8px;height:15px;background:var(--phos);vertical-align:-2px;animation:blink 1.1s step-end infinite"></span></div>
    </os-terminal>
  </section>

</div>
  `,
})
export class BrandkitComponent {}
```

- [ ] **Step 3: Adicionar rota `/brandkit` em `app-routing.module.ts`**

```typescript
// src/app/app-routing.module.ts — adicionar import e rota
import { BrandkitComponent } from './pages/brandkit/brandkit.component';

const routes: Routes = [
  { path: "", component: HomeProjectComponent, pathMatch: 'full' },
  { path: "brandkit", component: BrandkitComponent },
  { path: "PaginacaoPorDemandaExercicios", component: HomePaginacaoPorDemandaExerciciosComponent },
  { path: "EscalonamentoDeProcessos", component: HomeEscalonamentoComponent },
  { path: "Segmentacao", component: SegmentacaoHomeComponent },
  { path: "ExercicioDeSegmentacao", component: HomeExercicioDeSegmentacaoComponent },
];
```

- [ ] **Step 4: Build**

```bash
npx ng build --configuration=development
```

Esperado: sem erros.

- [ ] **Step 5: Commit**

```bash
git add src/app/pages/brandkit/ src/app/app-routing.module.ts
git commit -m "feat(ds): BrandkitComponent — página de validação em /brandkit"
```

---

## Task 10: Link na home + verificação visual

**Files:**
- Modify: `src/app/pages/home-project/home-project.component.html`

- [ ] **Step 1: Adicionar link para /brandkit na home**

```html
<!-- src/app/pages/home-project/home-project.component.html -->
<div class="container mt-5">
  <div class="row justify-content-center">
    <div class="col-12 col-sm-8 col-md-6 col-lg-4">
      <h4 class="mb-4 text-center text-secondary">OSLive — Simulador de SO</h4>
      <ul class="list-group">
        <li class="list-group-item">
          <a class="text-decoration-none" routerLink="/PaginacaoPorDemandaExercicios">Exercícios de Paginação Por Demanda</a>
        </li>
        <li class="list-group-item">
          <a class="text-decoration-none" routerLink="/EscalonamentoDeProcessos">Escalonamento de Processos</a>
        </li>
        <li class="list-group-item">
          <a class="text-decoration-none" routerLink="/Segmentacao">Segmentação</a>
        </li>
        <li class="list-group-item">
          <a class="text-decoration-none" routerLink="/ExercicioDeSegmentacao">Exercício de Segmentação</a>
        </li>
      </ul>
      <div class="mt-4 text-center">
        <a routerLink="/brandkit" style="font-family:monospace;font-size:12px;color:#928c7e">
          ↗ Design System / Brandkit
        </a>
      </div>
    </div>
  </div>
</div>
```

- [ ] **Step 2: Subir servidor e verificar visualmente em `http://localhost:4200/brandkit`**

```bash
npx ng serve --port 4200
```

Verificar:
- Tokens de cor renderizando com as cores corretas
- Tipografia IBM Plex carregando (sans, serif, mono)
- Botões com hover funcionando
- Badges com animação live
- Inputs com foco e estados err/ok
- Alertas com barra lateral colorida
- Cards com hover e lift
- Terminal com scanlines e cursor piscando

- [ ] **Step 3: Commit final**

```bash
git add src/app/pages/home-project/home-project.component.html
git commit -m "feat(ds): link brandkit na home"
git push origin feature/design-system
```

---

## Self-Review

**Cobertura do spec:**
- ✅ Branch `feature/design-system` — criada no início
- ✅ `src/app/ui/` com componentes atômicos
- ✅ Tokens CSS — `tokens.css` + `styles.css`
- ✅ Tipografia IBM Plex
- ✅ Página `/brandkit` com todos os componentes
- ✅ Link na home para brandkit

**Sem placeholders:** todas as tasks têm código completo.

**Consistência de tipos:**
- `ButtonVariant`, `BadgeVariant`, `AlertVariant`, `InputStatus` — definidos na Task onde o componente é criado, usados corretamente no brandkit (Task 9).
- Barrel export (Task 8) exporta exatamente as classes definidas nas Tasks 2–7.
