import type { Comp, KAPLAYCtx } from "../../types";
/**
 * The {@link textInput `textInput()`} component.
 *
 * @group Component Types
 */
export interface TextInputComp extends Comp {
    /**
     * Enable the text input array from being modified by user input.
     */
    hasFocus: boolean;
    /**
     * The "real" text that the user typed, without any escaping.
     */
    typedText: string;
}
export declare function textInput(this: KAPLAYCtx, hasFocus?: boolean, maxInputLength?: number): TextInputComp;
//# sourceMappingURL=textInput.d.ts.map