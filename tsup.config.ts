import { defineConfig } from 'tsup';

export default defineConfig({
	format: ['cjs', 'esm'],
	entry: ['./exports/index.ts'],
	outDir: './exports/dist',
	dts: true,
	shims: true,
	skipNodeModulesBundle: true,
	clean: true,
});
