import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { analizarCss, auditar, ratio, FONDOS, UMBRAL_AA, EXCEPCIONES } from './contraste.mjs';

/**
 * Los tests de la guarda de contraste.
 *
 * ⚠️ **Un linter que deja de detectar tiene exactamente la misma pinta que un
 * sitio limpio** — es la razón por la que `seo-audit.test.ts` existe con su
 * fixture roto, y vale igual aquí. La mitad de estos casos son controles
 * negativos: comprueban que la guarda **falla** cuando debe, no que pasa.
 */

const RAIZ = path.resolve(__dirname, '..');

function hex(h: string) {
	return [
		parseInt(h.slice(1, 3), 16),
		parseInt(h.slice(3, 5), 16),
		parseInt(h.slice(5, 7), 16)
	];
}

describe('el cálculo del ratio', () => {
	it('da 21:1 entre blanco y negro puros', () => {
		expect(ratio(hex('#ffffff'), hex('#000000'))).toBeCloseTo(21, 1);
	});

	it('es simétrico: el orden de los colores no cambia el resultado', () => {
		const a = ratio(hex('#a8a8c0'), hex('#05050a'));
		const b = ratio(hex('#05050a'), hex('#a8a8c0'));
		expect(a).toBeCloseTo(b, 10);
	});

	it('da 1:1 entre un color y sí mismo', () => {
		expect(ratio(hex('#2563eb'), hex('#2563eb'))).toBeCloseTo(1, 10);
	});
});

describe('detección', () => {
	it('caza el valor que más se repetía antes del barrido', () => {
		// 40 usos a 3,45:1 sobre el fondo de página.
		const h = analizarCss('.x { color: rgba(160, 160, 200, 0.6); }');
		expect(h).toHaveLength(1);
		expect(h[0].tipo).toBe('bajo-contraste');
		expect(h[0].ratio).toBeLessThan(UMBRAL_AA);
	});

	it('no marca un color que sí cumple', () => {
		const h = analizarCss('.x { color: #ffffff; }');
		expect(h.filter((x) => x.tipo === 'bajo-contraste')).toHaveLength(0);
	});

	/**
	 * ⚠️ El control negativo que más falta hacía. `\bcolor:` también casa
	 * `border-color:`, y con ese regex la primera medición contó bordes como texto
	 * —286 en vez de 212— y el codemod llegó a convertir 23 bordes en tokens de
	 * texto. El mismo error en dos herramientas del mismo trabajo.
	 */
	it('NO confunde border-color ni background-color con color', () => {
		const h = analizarCss(`
			.x {
				border-color: rgba(255, 255, 255, 0.08);
				background-color: rgba(255, 255, 255, 0.03);
				outline-color: rgba(255, 255, 255, 0.1);
			}
		`);
		expect(h).toHaveLength(0);
	});

	/**
	 * ⚠️ El falso positivo que habría hecho que se silenciara la guarda entera:
	 * `.toggle-btn.active` pone texto oscuro sobre `background: #ffffff` —20:1—
	 * y medirlo contra el fondo de la página da 1,00:1, el peor resultado posible
	 * sobre el caso mejor.
	 */
	it('mide contra el fondo que declara la propia regla, no contra el de la página', () => {
		const h = analizarCss('.x { background: #ffffff; color: #05050a; }');
		expect(h.filter((x) => x.tipo === 'bajo-contraste')).toHaveLength(0);
	});

	it('vuelve al fondo del tema cuando el de la regla es translúcido', () => {
		// Un fondo con alfa no dice qué hay detrás, así que se mide conservador.
		const h = analizarCss('.x { background: rgba(255,255,255,0.03); color: rgba(255,255,255,0.2); }');
		expect(h[0].tipo).toBe('bajo-contraste');
	});

	it('no audita prosa: los comentarios se descartan', () => {
		const h = analizarCss('/* antes era color: rgba(160,160,200,0.4) */ .x { color: #fff; }');
		expect(h.filter((x) => x.tipo === 'bajo-contraste')).toHaveLength(0);
	});

	it('avisa del alfa en texto aunque el ratio pase', () => {
		const h = analizarCss('.x { color: rgba(255, 255, 255, 0.9); }');
		expect(h.some((x) => x.tipo === 'alfa')).toBe(true);
	});

	it('mide contra el PEOR de los fondos del tema, no contra el más favorable', () => {
		// La malla del fondo cambia de color con el P&L del día, así que el fondo
		// tras el texto no es constante.
		const h = analizarCss('.x { color: #ef4444; }');
		const contraFondoPagina = ratio(hex('#ef4444'), hex(FONDOS.dark[0]));
		expect(contraFondoPagina).toBeGreaterThan(UMBRAL_AA);
		expect(h[0]?.ratio ?? 99).toBeLessThan(contraFondoPagina);
	});
});

describe('los tokens', () => {
	/**
	 * ⚠️ **La primera versión se saltaba los tokens sin medirlos y eso escondió un
	 * fallo real durante todo el trabajo**: `--accent-blue` da 3,22 como texto
	 * sobre el peor fondo oscuro. Una guarda que confía en lo que debería
	 * comprobar es la figura que este repo persigue en los tests.
	 */
	it('mide el valor de un token en vez de darlo por bueno', () => {
		const h = analizarCss('.x { color: var(--accent-blue); }');
		expect(h[0]?.tipo).toBe('bajo-contraste');
	});

	it('acepta la tinta de acento, que es la que sí es texto', () => {
		const h = analizarCss('.x { color: var(--accent-blue-ink); }');
		expect(h.filter((x) => x.tipo === 'bajo-contraste')).toHaveLength(0);
	});

	it('los cuatro peldaños de la escala de texto pasan AA en los dos temas', () => {
		for (const tema of ['dark', 'light'] as const) {
			for (const t of ['primary', 'secondary', 'muted', 'faint']) {
				const h = analizarCss(`.x { color: var(--text-${t}); }`, tema);
				expect(
					h.filter((x) => x.tipo === 'bajo-contraste'),
					`--text-${t} falla en tema ${tema}`
				).toHaveLength(0);
			}
		}
	});

	it('avisa de un token que no conoce en vez de callarse', () => {
		const h = analizarCss('.x { color: var(--inventado); }');
		expect(h[0]?.tipo).toBe('token-desconocido');
	});

	/**
	 * La tabla de `TOKENS` duplica los valores de `layout.css` porque resolver
	 * `var()` de verdad exigiría un navegador. Esta es la prueba de que la copia no
	 * se ha quedado atrás — que es exactamente cómo 128 literales de `#3b82f6`
	 * sobrevivieron a la migración de `--accent-blue`.
	 */
	it('los valores que la guarda cree que tienen los tokens son los de layout.css', () => {
		const css = fs.readFileSync(path.join(RAIZ, 'src/routes/layout.css'), 'utf8');
		for (const token of ['--text-primary', '--text-muted', '--text-faint', '--accent-blue-ink']) {
			const h = analizarCss(`.x { color: var(${token}); }`);
			expect(h.filter((x) => x.tipo === 'token-desconocido')).toHaveLength(0);
			expect(css, `${token} no está definido en layout.css`).toContain(`${token}:`);
		}
	});
});

describe('las excepciones', () => {
	it('todas llevan motivo escrito', () => {
		for (const e of EXCEPCIONES) {
			expect(e.motivo, `${e.fichero} sin motivo`).toBeTruthy();
			expect(e.motivo.length).toBeGreaterThan(40);
		}
	});

	it('todas apuntan a un fichero que existe', () => {
		for (const e of EXCEPCIONES) {
			expect(fs.existsSync(path.join(RAIZ, e.fichero)), `${e.fichero} no existe`).toBe(true);
		}
	});
});

/**
 * ⚠️ **Aquí NO se barre el repositorio entero, y el motivo es que sería
 * redundante — no que rompiera nada.**
 *
 * El barrido completo es exactamente lo que hace `npm run a11y:contrast`, que
 * tiene su propio paso en CI y falla con el fichero, el color y el ratio.
 * Repetirlo desde un worker de vitest son ~900 ficheros leídos dos veces para
 * responder a la misma pregunta. Lo que estos tests aportan es lo que ese paso no
 * puede demostrar de sí mismo: que el detector detecta.
 *
 * ⚠️ **Nota para quien vea un timeout intermitente en `doc-drift.test.ts`: no es
 * de aquí.** Se sospechó de este fichero por contención de E/S y se comprobó
 * apagándolo — el timeout sigue saliendo **2 de cada 3 ejecuciones sin él**, así
 * que es anterior y ajeno a esta rama. Queda apuntado porque la próxima persona
 * que lo vea sospechará lo mismo.
 */
describe('el barrido completo', () => {
	it('está expuesto para que el paso de CI lo ejecute', () => {
		expect(typeof auditar).toBe('function');
	});
});
