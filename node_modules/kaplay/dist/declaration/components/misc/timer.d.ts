import type { Comp, LerpValue, TimerController, TweenController } from "../../types";
/**
 * The {@link timer `timer()`} component.
 *
 * @group Component Types
 */
export interface TimerComp extends Comp {
    /**
     * The maximum number of loops per frame allowed,
     * to keep loops with sub-frame intervals from freezing the game.
     */
    maxLoopsPerFrame: number;
    /**
     * Run the callback after n seconds.
     */
    wait(time: number, action?: () => void): TimerController;
    /**
     * Run the callback every n seconds.
     *
     * If waitFirst is false (the default), the function will
     * be called once on the very next frame, and then loop like normal.
     *
     * @since v3000.0
     */
    loop(time: number, action: () => void, maxLoops?: number, waitFirst?: boolean): TimerController;
    /**
     * Tweeeeen! Note that this doesn't specifically mean tweening on this object's property, this just registers the timer on this object, so the tween will cancel with the object gets destroyed, or paused when obj.paused is true.
     *
     * @since v3000.0
     */
    tween<V extends LerpValue>(from: V, to: V, duration: number, setValue: (value: V) => void, easeFunc?: (t: number) => number): TweenController;
}
export declare function timer(maxLoopsPerFrame?: number): TimerComp;
//# sourceMappingURL=timer.d.ts.map