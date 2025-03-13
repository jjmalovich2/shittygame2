import { type ButtonsDef } from "./app";
import type { KAPLAYCtx, KAPLAYInternal, KAPLAYOpt, MergePlugins, PluginList } from "./types";
export declare const _k: KAPLAYInternal;
/**
 * Initialize KAPLAY context. The starting point of all KAPLAY games.
 *
 * @example
 * ```js
 * // Start KAPLAY with default options (will create a fullscreen canvas under <body>)
 * kaplay()
 *
 * // Init with some options
 * kaplay({
 *     width: 320,
 *     height: 240,
 *     font: "sans-serif",
 *     canvas: document.querySelector("#mycanvas"),
 *     background: [ 0, 0, 255, ],
 * })
 *
 * // All KAPLAY functions are imported to global after calling kaplay()
 * add()
 * onUpdate()
 * onKeyPress()
 * vec2()
 *
 * // If you want to prevent KAPLAY from importing all functions to global and use a context handle for all KAPLAY functions
 * const k = kaplay({ global: false })
 *
 * k.add(...)
 * k.onUpdate(...)
 * k.onKeyPress(...)
 * k.vec2(...)
 * ```
 *
 * @group Start
 */
declare const kaplay: <TPlugins extends PluginList<unknown> = [undefined], TButtons extends ButtonsDef = {}, TButtonsName extends string = keyof TButtons & string>(gopt?: KAPLAYOpt<TPlugins, TButtons>) => TPlugins extends [undefined] ? KAPLAYCtx<TButtons, TButtonsName> : KAPLAYCtx<TButtons, TButtonsName> & MergePlugins<TPlugins>;
export { kaplay };
//# sourceMappingURL=kaplay.d.ts.map